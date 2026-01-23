"""
Suppliers Metodi Pagamento - Gestione metodi di pagamento fornitori.
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging

from app.database import Database, Collections

logger = logging.getLogger(__name__)
router = APIRouter()

# Metodi di pagamento
PAYMENT_METHODS = {
    "contanti": {"label": "Contanti", "prima_nota": "cassa"},
    "bonifico": {"label": "Bonifico Bancario", "prima_nota": "banca"},
    "assegno": {"label": "Assegno", "prima_nota": "banca"},
    "riba": {"label": "Ri.Ba.", "prima_nota": "banca"},
    "carta": {"label": "Carta di Credito", "prima_nota": "banca"},
    "sepa": {"label": "Addebito SEPA", "prima_nota": "banca"},
    "mav": {"label": "MAV", "prima_nota": "banca"},
    "rav": {"label": "RAV", "prima_nota": "banca"},
    "rid": {"label": "RID", "prima_nota": "banca"},
    "f24": {"label": "F24", "prima_nota": "banca"},
    "compensazione": {"label": "Compensazione", "prima_nota": "altro"},
    "misto": {"label": "Misto (Cassa + Banca)", "prima_nota": "misto"}
}

PAYMENT_TERMS = [
    {"code": "VISTA", "days": 0, "label": "A vista"},
    {"code": "30GG", "days": 30, "label": "30 giorni"},
    {"code": "30GGDFM", "days": 30, "label": "30 giorni data fattura fine mese"},
    {"code": "60GG", "days": 60, "label": "60 giorni"},
    {"code": "60GGDFM", "days": 60, "label": "60 giorni data fattura fine mese"},
    {"code": "90GG", "days": 90, "label": "90 giorni"},
    {"code": "120GG", "days": 120, "label": "120 giorni"},
]


@router.get("/payment-methods")
async def get_payment_methods() -> List[Dict[str, Any]]:
    """Lista metodi di pagamento disponibili."""
    return [{"code": code, **data} for code, data in PAYMENT_METHODS.items()]


@router.get("/payment-terms")
async def get_payment_terms() -> List[Dict[str, Any]]:
    """Lista termini di pagamento disponibili."""
    return PAYMENT_TERMS


@router.get("/dizionario-metodi-pagamento")
async def get_dizionario_metodi_pagamento() -> Dict[str, Any]:
    """Dizionario completo metodi pagamento per P.IVA."""
    db = Database.get_db()
    
    fornitori = await db[Collections.SUPPLIERS].find(
        {},
        {"_id": 0, "id": 1, "partita_iva": 1, "ragione_sociale": 1, "denominazione": 1, 
         "metodo_pagamento": 1, "metodo_pagamento_predefinito": 1, "iban": 1, "attivo": 1}
    ).to_list(None)
    
    dizionario = {}
    stats = {"totale_fornitori": len(fornitori), "per_metodo": {}, "senza_metodo": 0, "con_iban": 0, "senza_iban_ma_banca": 0}
    
    metodi_bancari = ["bonifico", "banca", "sepa", "rid", "sdd", "assegno", "riba", "mav", "rav", "f24", "carta", "misto"]
    
    for f in fornitori:
        piva = f.get("partita_iva", "")
        metodo = f.get("metodo_pagamento_predefinito") or f.get("metodo_pagamento") or "da_configurare"
        iban = f.get("iban")
        
        dizionario[piva] = {
            "id": f.get("id"),
            "ragione_sociale": f.get("ragione_sociale") or f.get("denominazione"),
            "metodo_pagamento": metodo,
            "iban": iban,
            "attivo": f.get("attivo", True)
        }
        
        stats["per_metodo"][metodo] = stats["per_metodo"].get(metodo, 0) + 1
        
        if not metodo or metodo == "da_configurare":
            stats["senza_metodo"] += 1
        
        if iban:
            stats["con_iban"] += 1
        elif metodo.lower() in metodi_bancari:
            stats["senza_iban_ma_banca"] += 1
    
    return {"dizionario": dizionario, "stats": stats, "updated_at": datetime.now(timezone.utc).isoformat()}


@router.post("/aggiorna-dizionario-metodo")
async def aggiorna_dizionario_metodo(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Aggiorna metodo pagamento (solo da fonti valide)."""
    db = Database.get_db()
    
    partita_iva = payload.get("partita_iva")
    nuovo_metodo = payload.get("metodo_pagamento")
    iban = payload.get("iban")
    source = payload.get("source", "unknown")
    
    if not partita_iva:
        raise HTTPException(status_code=400, detail="partita_iva è obbligatoria")
    
    fonti_valide = ["riconciliazione", "estratto_conto", "nuovo_fornitore", "aggiornamento_fornitore", "eliminazione_fornitore"]
    if source not in fonti_valide:
        raise HTTPException(status_code=403, detail=f"Fonte non valida: {source}")
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "metodo_pagamento_updated_source": source,
        "metodo_pagamento_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if nuovo_metodo:
        update_data["metodo_pagamento"] = nuovo_metodo
        update_data["metodo_pagamento_predefinito"] = nuovo_metodo
    
    if iban:
        update_data["iban"] = iban
    
    result = await db[Collections.SUPPLIERS].update_one(
        {"partita_iva": partita_iva},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        return {"success": False, "message": "Fornitore non trovato"}
    
    logger.info(f"Dizionario metodi aggiornato: {partita_iva} -> {nuovo_metodo} (fonte: {source})")
    
    return {"success": True, "partita_iva": partita_iva, "metodo_pagamento": nuovo_metodo, "source": source}


@router.put("/{supplier_id}/metodo-pagamento")
async def update_supplier_metodo(
    supplier_id: str,
    data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """Aggiorna metodo pagamento di un fornitore."""
    db = Database.get_db()
    
    metodo = data.get("metodo_pagamento")
    if metodo and metodo not in PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail=f"Metodo non valido: {list(PAYMENT_METHODS.keys())}")
    
    result = await db[Collections.SUPPLIERS].update_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"$set": {
            "metodo_pagamento": metodo,
            "metodo_pagamento_predefinito": metodo,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    return {"success": True, "metodo_pagamento": metodo}


@router.post("/aggiorna-metodi-bulk")
async def aggiorna_metodi_bulk(data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Aggiorna metodi pagamento per più fornitori."""
    db = Database.get_db()
    
    aggiornamenti = data.get("aggiornamenti", [])
    if not aggiornamenti:
        raise HTTPException(status_code=400, detail="Nessun aggiornamento fornito")
    
    successi = 0
    errori = []
    
    for upd in aggiornamenti:
        piva = upd.get("partita_iva")
        metodo = upd.get("metodo_pagamento")
        
        if not piva or not metodo:
            errori.append({"partita_iva": piva, "errore": "Dati mancanti"})
            continue
        
        if metodo not in PAYMENT_METHODS:
            errori.append({"partita_iva": piva, "errore": f"Metodo non valido: {metodo}"})
            continue
        
        result = await db[Collections.SUPPLIERS].update_one(
            {"partita_iva": piva},
            {"$set": {
                "metodo_pagamento": metodo,
                "metodo_pagamento_predefinito": metodo,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
        
        if result.matched_count > 0:
            successi += 1
        else:
            errori.append({"partita_iva": piva, "errore": "Fornitore non trovato"})
    
    return {"successi": successi, "errori": len(errori), "dettagli_errori": errori}
