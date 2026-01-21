"""
Gestione Verbali Noleggio - Sistema di Riconciliazione Completo

Flusso:
1. VERBALE (multa) → arriva via email o trovato su parabrezza
2. FATTURA NOLEGGIATORE → contiene numero verbale + spese notifica
3. PAGAMENTO → in banca/estratto conto
4. RICONCILIAZIONE → collega tutto: Verbale + Fattura + Pagamento + Veicolo + Driver

Stati del Verbale:
- da_scaricare: Trovato in posta, PDF da scaricare
- salvato: PDF scaricato, in attesa
- fattura_ricevuta: Fattura noleggiatore associata
- pagato: Pagamento trovato in estratto conto
- riconciliato: Tutto collegato
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import re
import logging

from app.database import Database

logger = logging.getLogger(__name__)
router = APIRouter()


# ===== UTILITY FUNCTIONS =====

def extract_verbale_from_description(description: str) -> Optional[str]:
    """Estrae il numero verbale dalla descrizione fattura."""
    if not description:
        return None
    
    # Pattern comuni per numeri verbale
    patterns = [
        r'Verbale\s*(?:Nr|N\.?|Numero)?[:\s]*([A-Z0-9]+)',
        r'N\.\s*Verbale[:\s]*([A-Z0-9]+)',
        r'verbale[:\s]+([A-Z]\d{8,})',
        r'([A-Z]\d{10,})',  # Pattern generico tipo A25111540620
        r'([B]\d{10,})',    # Pattern B + 10 cifre
        r'Nr[:\s]*([A-Z]\d{8,})',  # Nr: A25111540620
        r'Numero[:\s]*([A-Z]\d{8,})',  # Numero: A25111540620
    ]
    
    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    
    return None


def extract_targa_from_description(description: str) -> Optional[str]:
    """Estrae la targa dalla descrizione fattura."""
    if not description:
        return None
    
    # Pattern per targhe italiane
    patterns = [
        r'TARGA[:\s]*([A-Z]{2}\d{3}[A-Z]{2})',  # TARGA: GE911SC
        r'targa[:\s]*([A-Z]{2}\d{3}[A-Z]{2})',
        r'([A-Z]{2}\d{3}[A-Z]{2})',  # Pattern generico targa
    ]
    
    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    
    return None


def serialize_doc(doc: dict) -> dict:
    """Serializza documento MongoDB per JSON."""
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == '_id':
            result['id'] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


# ===== ENDPOINTS =====

@router.get("/dashboard")
async def get_verbali_dashboard() -> Dict[str, Any]:
    """Dashboard riassuntiva dello stato verbali."""
    db = Database.get_db()
    
    try:
        # Conta verbali per stato
        pipeline = [
            {"$group": {
                "_id": "$stato",
                "count": {"$sum": 1},
                "totale_importo": {"$sum": {"$toDouble": {"$ifNull": ["$importo", 0]}}}
            }}
        ]
        stati = await db["verbali_noleggio"].aggregate(pipeline).to_list(100)
        
        per_stato = {}
        totale_verbali = 0
        totale_importo = 0
        for s in stati:
            stato = s["_id"] or "sconosciuto"
            per_stato[stato] = {"count": s["count"], "importo": round(s["totale_importo"], 2)}
            totale_verbali += s["count"]
            totale_importo += s["totale_importo"]
        
        # Verbali da riconciliare (hanno fattura ma non pagamento o viceversa)
        da_riconciliare = await db["verbali_noleggio"].count_documents({
            "$or": [
                {"stato": "fattura_ricevuta", "pagamento_id": {"$exists": False}},
                {"stato": "pagato", "fattura_id": {"$exists": False}},
                {"stato": "salvato"}
            ]
        })
        
        # Ultimi 5 verbali inseriti
        ultimi = await db["verbali_noleggio"].find().sort("created_at", -1).limit(5).to_list(5)
        
        return {
            "success": True,
            "riepilogo": {
                "totale_verbali": totale_verbali,
                "totale_importo": round(totale_importo, 2),
                "da_riconciliare": da_riconciliare,
                "per_stato": per_stato
            },
            "ultimi_verbali": [serialize_doc(v) for v in ultimi]
        }
    except Exception as e:
        logger.error(f"Errore dashboard verbali: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lista")
async def get_lista_verbali(
    stato: Optional[str] = Query(None, description="Filtra per stato"),
    targa: Optional[str] = Query(None, description="Filtra per targa veicolo"),
    da_riconciliare: bool = Query(False, description="Solo verbali da riconciliare")
) -> Dict[str, Any]:
    """Lista verbali con filtri."""
    db = Database.get_db()
    
    try:
        query = {}
        
        if stato:
            query["stato"] = stato
        
        if targa:
            query["targa"] = {"$regex": targa, "$options": "i"}
        
        if da_riconciliare:
            query["$or"] = [
                {"stato": "fattura_ricevuta", "pagamento_id": {"$exists": False}},
                {"stato": "pagato", "fattura_id": {"$exists": False}},
                {"stato": "salvato"}
            ]
        
        verbali = await db["verbali_noleggio"].find(query).sort("created_at", -1).to_list(500)
        
        return {
            "success": True,
            "verbali": [serialize_doc(v) for v in verbali],
            "totale": len(verbali)
        }
    except Exception as e:
        logger.error(f"Errore lista verbali: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/associa-fattura")
async def associa_verbale_fattura(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Associa un verbale a una fattura del noleggiatore.
    
    Il numero verbale nella descrizione fattura viene usato per collegare:
    Verbale → Fattura → Veicolo → Driver
    """
    db = Database.get_db()
    
    try:
        numero_verbale = data.get("numero_verbale")
        fattura_id = data.get("fattura_id")
        fattura_numero = data.get("fattura_numero")
        
        if not numero_verbale:
            raise HTTPException(status_code=400, detail="Numero verbale richiesto")
        
        # Trova il verbale
        verbale = await db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
        
        if not verbale:
            # Crea nuovo record verbale dalla fattura
            verbale = {
                "numero_verbale": numero_verbale,
                "stato": "fattura_ricevuta",
                "created_at": datetime.now(timezone.utc)
            }
        
        # Aggiorna con info fattura
        update_data = {
            "fattura_id": fattura_id,
            "fattura_numero": fattura_numero,
            "stato": "fattura_ricevuta" if verbale.get("stato") != "pagato" else "riconciliato",
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Se la fattura ha info veicolo/driver, aggiornale
        if data.get("targa"):
            update_data["targa"] = data["targa"]
        if data.get("driver_id"):
            update_data["driver_id"] = data["driver_id"]
        if data.get("importo_notifica"):
            update_data["importo_notifica"] = data["importo_notifica"]
        
        if verbale.get("_id"):
            await db["verbali_noleggio"].update_one(
                {"_id": verbale["_id"]},
                {"$set": update_data}
            )
        else:
            verbale.update(update_data)
            result = await db["verbali_noleggio"].insert_one(verbale)
            verbale["_id"] = result.inserted_id
        
        # Se il verbale era già pagato, ora è riconciliato
        if verbale.get("pagamento_id"):
            await db["verbali_noleggio"].update_one(
                {"numero_verbale": numero_verbale},
                {"$set": {"stato": "riconciliato"}}
            )
        
        return {
            "success": True,
            "message": f"Verbale {numero_verbale} associato a fattura {fattura_numero}",
            "verbale": serialize_doc(verbale)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore associazione verbale-fattura: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/registra-pagamento")
async def registra_pagamento_verbale(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Registra il pagamento di un verbale (da estratto conto).
    
    Scenario A: Pago prima, fattura dopo → stato = pagato
    Scenario B: Fattura già presente → stato = riconciliato
    """
    db = Database.get_db()
    
    try:
        numero_verbale = data.get("numero_verbale")
        importo_pagato = data.get("importo")
        data_pagamento = data.get("data_pagamento")
        movimento_id = data.get("movimento_id")  # ID del movimento in prima nota
        
        if not numero_verbale:
            raise HTTPException(status_code=400, detail="Numero verbale richiesto")
        
        # Trova il verbale
        verbale = await db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
        
        if not verbale:
            # Scenario A: Pago prima che arrivi la fattura
            verbale = {
                "numero_verbale": numero_verbale,
                "stato": "pagato",
                "importo": importo_pagato,
                "data_pagamento": data_pagamento,
                "pagamento_id": movimento_id,
                "created_at": datetime.now(timezone.utc)
            }
            result = await db["verbali_noleggio"].insert_one(verbale)
            verbale["_id"] = result.inserted_id
            message = f"Verbale {numero_verbale} registrato come pagato (in attesa fattura)"
        else:
            # Verbale esistente - aggiorna pagamento
            nuovo_stato = "riconciliato" if verbale.get("fattura_id") else "pagato"
            
            await db["verbali_noleggio"].update_one(
                {"numero_verbale": numero_verbale},
                {"$set": {
                    "importo": importo_pagato,
                    "data_pagamento": data_pagamento,
                    "pagamento_id": movimento_id,
                    "stato": nuovo_stato,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            message = f"Verbale {numero_verbale} {'riconciliato' if nuovo_stato == 'riconciliato' else 'pagato'}"
        
        return {
            "success": True,
            "message": message,
            "verbale": serialize_doc(verbale)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore registrazione pagamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-fatture-verbali")
async def scan_fatture_per_verbali() -> Dict[str, Any]:
    """
    Scansiona tutte le fatture dei noleggiatori per estrarre numeri verbale
    e creare associazioni automatiche.
    """
    db = Database.get_db()
    
    try:
        # Fornitori noleggio tipici
        fornitori_noleggio = ["ALD", "LEASYS", "ARVAL", "LEASEPLAN", "ALPHABET"]
        
        # Trova fatture dei noleggiatori
        fatture = await db["invoices"].find({
            "$or": [
                {"supplier_name": {"$regex": "|".join(fornitori_noleggio), "$options": "i"}},
                {"fornitore": {"$regex": "|".join(fornitori_noleggio), "$options": "i"}}
            ]
        }).to_list(2000)
        
        verbali_trovati = 0
        associazioni_create = 0
        
        for fattura in fatture:
            # Cerca numero verbale nella descrizione o items
            descrizione = fattura.get("descrizione", "") or ""
            items = fattura.get("items", [])
            
            # Cerca in descrizione principale
            numero_verbale = extract_verbale_from_description(descrizione)
            
            # Cerca negli items
            if not numero_verbale:
                for item in items:
                    item_desc = item.get("descrizione", "") or item.get("description", "") or ""
                    numero_verbale = extract_verbale_from_description(item_desc)
                    if numero_verbale:
                        break
            
            if numero_verbale:
                verbali_trovati += 1
                
                # Verifica se esiste già l'associazione
                existing = await db["verbali_noleggio"].find_one({
                    "numero_verbale": numero_verbale,
                    "fattura_id": str(fattura.get("_id"))
                })
                
                if not existing:
                    # Crea o aggiorna verbale
                    verbale_doc = await db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
                    
                    update_data = {
                        "fattura_id": str(fattura.get("_id")),
                        "fattura_numero": fattura.get("invoice_number"),
                        "fornitore": fattura.get("supplier_name") or fattura.get("fornitore"),
                        "targa": fattura.get("targa"),
                        "updated_at": datetime.now(timezone.utc)
                    }
                    
                    if verbale_doc:
                        # Aggiorna esistente
                        nuovo_stato = "riconciliato" if verbale_doc.get("pagamento_id") else "fattura_ricevuta"
                        update_data["stato"] = nuovo_stato
                        await db["verbali_noleggio"].update_one(
                            {"numero_verbale": numero_verbale},
                            {"$set": update_data}
                        )
                    else:
                        # Crea nuovo
                        update_data["numero_verbale"] = numero_verbale
                        update_data["stato"] = "fattura_ricevuta"
                        update_data["created_at"] = datetime.now(timezone.utc)
                        await db["verbali_noleggio"].insert_one(update_data)
                    
                    associazioni_create += 1
        
        return {
            "success": True,
            "fatture_analizzate": len(fatture),
            "verbali_trovati": verbali_trovati,
            "associazioni_create": associazioni_create
        }
    except Exception as e:
        logger.error(f"Errore scan fatture verbali: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/riconcilia/{numero_verbale}")
async def riconcilia_verbale(numero_verbale: str) -> Dict[str, Any]:
    """
    Tenta riconciliazione automatica di un verbale.
    
    Cerca:
    1. Fattura con numero verbale nella descrizione
    2. Pagamento in estratto conto
    3. Veicolo associato
    4. Driver assegnato al veicolo
    """
    db = Database.get_db()
    
    try:
        verbale = await db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
        
        if not verbale:
            raise HTTPException(status_code=404, detail="Verbale non trovato")
        
        updates = {}
        messages = []
        
        # 1. Cerca fattura se non presente
        if not verbale.get("fattura_id"):
            fattura = await db["invoices"].find_one({
                "$or": [
                    {"descrizione": {"$regex": numero_verbale, "$options": "i"}},
                    {"items.descrizione": {"$regex": numero_verbale, "$options": "i"}},
                    {"items.description": {"$regex": numero_verbale, "$options": "i"}}
                ]
            })
            
            if fattura:
                updates["fattura_id"] = str(fattura["_id"])
                updates["fattura_numero"] = fattura.get("invoice_number")
                updates["fornitore"] = fattura.get("supplier_name") or fattura.get("fornitore")
                messages.append(f"Fattura trovata: {fattura.get('invoice_number')}")
        
        # 2. Cerca targa se non presente
        targa = verbale.get("targa") or updates.get("targa")
        if not targa:
            # Cerca in verbali_noleggio_completi
            completo = await db["verbali_noleggio_completi"].find_one({"numero_verbale": numero_verbale})
            if completo and completo.get("targa"):
                targa = completo["targa"]
                updates["targa"] = targa
                messages.append(f"Targa trovata: {targa}")
        
        # 3. Cerca veicolo e driver
        if targa:
            veicolo = await db["veicoli_noleggio"].find_one({"targa": targa})
            if veicolo:
                updates["veicolo_id"] = str(veicolo["_id"])
                if veicolo.get("driver_id"):
                    updates["driver_id"] = veicolo["driver_id"]
                    
                    # Trova nome driver
                    driver = await db["dipendenti"].find_one({"_id": ObjectId(veicolo["driver_id"])})
                    if driver:
                        updates["driver_nome"] = f"{driver.get('nome', '')} {driver.get('cognome', '')}"
                        messages.append(f"Driver: {updates['driver_nome']}")
        
        # 4. Determina nuovo stato
        has_fattura = verbale.get("fattura_id") or updates.get("fattura_id")
        has_pagamento = verbale.get("pagamento_id")
        
        if has_fattura and has_pagamento:
            updates["stato"] = "riconciliato"
        elif has_fattura:
            updates["stato"] = "fattura_ricevuta"
        elif has_pagamento:
            updates["stato"] = "pagato"
        
        # Applica updates
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc)
            await db["verbali_noleggio"].update_one(
                {"numero_verbale": numero_verbale},
                {"$set": updates}
            )
        
        # Ricarica verbale aggiornato
        verbale = await db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
        
        return {
            "success": True,
            "numero_verbale": numero_verbale,
            "stato": verbale.get("stato"),
            "azioni": messages,
            "verbale": serialize_doc(verbale)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore riconciliazione verbale: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/per-driver/{driver_id}")
async def get_verbali_per_driver(driver_id: str) -> Dict[str, Any]:
    """Lista verbali associati a un driver specifico."""
    db = Database.get_db()
    
    try:
        verbali = await db["verbali_noleggio"].find({"driver_id": driver_id}).sort("created_at", -1).to_list(100)
        
        # Calcola totali
        totale_verbali = sum(v.get("importo", 0) or 0 for v in verbali)
        totale_notifiche = sum(v.get("importo_notifica", 0) or 0 for v in verbali)
        
        return {
            "success": True,
            "driver_id": driver_id,
            "verbali": [serialize_doc(v) for v in verbali],
            "totale": len(verbali),
            "totale_verbali": round(totale_verbali, 2),
            "totale_notifiche": round(totale_notifiche, 2)
        }
    except Exception as e:
        logger.error(f"Errore verbali per driver: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/per-veicolo/{targa}")
async def get_verbali_per_veicolo(targa: str) -> Dict[str, Any]:
    """Lista verbali associati a un veicolo specifico."""
    db = Database.get_db()
    
    try:
        verbali = await db["verbali_noleggio"].find({"targa": targa.upper()}).sort("created_at", -1).to_list(100)
        
        return {
            "success": True,
            "targa": targa.upper(),
            "verbali": [serialize_doc(v) for v in verbali],
            "totale": len(verbali)
        }
    except Exception as e:
        logger.error(f"Errore verbali per veicolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
