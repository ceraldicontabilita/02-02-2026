"""
Suppliers IBAN - Ricerca IBAN fornitori da fatture XML e API.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timezone
import logging
import re

from app.database import Database, Collections
from app.middleware.performance import cache

logger = logging.getLogger(__name__)
router = APIRouter()

SUPPLIERS_CACHE_KEY = "suppliers_list"


@router.post("/ricerca-iban-web")
async def ricerca_iban_fornitori_web() -> Dict[str, Any]:
    """Cerca IBAN di tutti i fornitori da fatture XML e API."""
    import asyncio
    import httpx
    
    db = Database.get_db()
    
    metodi_bancari = ["bonifico", "banca", "sepa", "rid", "sdd", "assegno", "riba", "mav", "rav", "f24", "carta", "misto"]
    
    # Fornitori senza IBAN
    fornitori_senza_iban = await db[Collections.SUPPLIERS].find({
        "metodo_pagamento": {"$in": metodi_bancari},
        "$or": [{"iban": None}, {"iban": ""}, {"iban": {"$exists": False}}],
        "partita_iva": {"$exists": True, "$ne": "", "$ne": None}
    }, {"_id": 0, "id": 1, "partita_iva": 1, "ragione_sociale": 1, "denominazione": 1}).to_list(500)
    
    risultato = {
        "totale_fornitori": len(fornitori_senza_iban),
        "iban_trovati": 0,
        "iban_da_fatture": 0,
        "non_trovati": 0,
        "errori": 0,
        "dettaglio_trovati": [],
        "dettaglio_non_trovati": []
    }
    
    if not fornitori_senza_iban:
        return {"success": True, "message": "Tutti i fornitori hanno già IBAN", **risultato}
    
    iban_pattern = re.compile(r'IT\d{2}[A-Z]?\d{5}\d{5}[A-Z0-9]{12}', re.IGNORECASE)
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        for fornitore in fornitori_senza_iban:
            piva = fornitore.get("partita_iva", "")
            nome = fornitore.get("ragione_sociale") or fornitore.get("denominazione") or ""
            fornitore_id = fornitore.get("id")
            
            piva_clean = re.sub(r'[^0-9]', '', str(piva))
            if len(piva_clean) != 11:
                risultato["non_trovati"] += 1
                continue
            
            iban_trovato = None
            fonte = None
            
            try:
                # Fonte 1: Fatture XML
                fattura_con_iban = await db["invoices"].find_one(
                    {"$or": [{"cedente_piva": piva}, {"supplier_vat": piva}], "pagamento.iban": {"$exists": True, "$ne": ""}},
                    {"pagamento.iban": 1}
                )
                
                if fattura_con_iban and fattura_con_iban.get("pagamento", {}).get("iban"):
                    iban_candidato = fattura_con_iban["pagamento"]["iban"].upper().strip()
                    if iban_pattern.match(iban_candidato) and len(iban_candidato) == 27:
                        iban_trovato = iban_candidato
                        fonte = "fatture_xml"
                        risultato["iban_da_fatture"] += 1
                
                # Fonte 2: Altri campi fatture
                if not iban_trovato:
                    fatture_alt = await db["invoices"].find(
                        {"$or": [{"cedente_piva": piva}, {"supplier_vat": piva}]},
                        {"raw_xml": 0}
                    ).limit(10).to_list(10)
                    
                    for fat in fatture_alt:
                        for campo in ["pagamento", "dati_pagamento", "payment_data"]:
                            dati = fat.get(campo, {})
                            if isinstance(dati, dict):
                                for k, v in dati.items():
                                    if v and isinstance(v, str) and "IT" in v.upper():
                                        match = iban_pattern.search(v.upper())
                                        if match and len(match.group(0)) == 27:
                                            iban_trovato = match.group(0)
                                            fonte = "fatture_xml_alt"
                                            risultato["iban_da_fatture"] += 1
                                            break
                            if iban_trovato:
                                break
                        if iban_trovato:
                            break
                
                # Aggiorna se trovato
                if iban_trovato:
                    await db[Collections.SUPPLIERS].update_one(
                        {"id": fornitore_id},
                        {"$set": {
                            "iban": iban_trovato,
                            "iban_fonte": fonte,
                            "iban_data_ricerca": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    risultato["iban_trovati"] += 1
                    risultato["dettaglio_trovati"].append({"partita_iva": piva, "nome": nome, "iban": iban_trovato, "fonte": fonte})
                    logger.info(f"IBAN trovato per {nome}: {iban_trovato[:10]}...")
                else:
                    risultato["non_trovati"] += 1
                    if len(risultato["dettaglio_non_trovati"]) < 50:
                        risultato["dettaglio_non_trovati"].append({"partita_iva": piva, "nome": nome})
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                risultato["errori"] += 1
                logger.warning(f"Errore ricerca IBAN {piva}: {e}")
    
    await cache.clear_pattern(SUPPLIERS_CACHE_KEY)
    
    return {
        "success": True,
        "message": f"Ricerca completata: {risultato['iban_trovati']} IBAN trovati su {risultato['totale_fornitori']} fornitori",
        **risultato
    }


@router.post("/ricerca-iban-singolo/{supplier_id}")
async def ricerca_iban_singolo_web(supplier_id: str) -> Dict[str, Any]:
    """Cerca IBAN di un singolo fornitore."""
    db = Database.get_db()
    
    fornitore = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"_id": 0}
    )
    
    if not fornitore:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    piva = fornitore.get("partita_iva", "")
    nome = fornitore.get("ragione_sociale") or fornitore.get("denominazione") or ""
    
    if not piva:
        raise HTTPException(status_code=400, detail="Fornitore senza Partita IVA")
    
    iban_pattern = re.compile(r'IT\d{2}[A-Z]?\d{5}\d{5}[A-Z0-9]{12}', re.IGNORECASE)
    
    fattura_con_iban = await db["invoices"].find_one(
        {"$or": [{"cedente_piva": piva}, {"supplier_vat": piva}], "pagamento.iban": {"$exists": True, "$ne": ""}},
        {"pagamento.iban": 1}
    )
    
    if fattura_con_iban and fattura_con_iban.get("pagamento", {}).get("iban"):
        iban = fattura_con_iban["pagamento"]["iban"].upper().strip()
        
        if iban_pattern.match(iban) and len(iban) == 27:
            await db[Collections.SUPPLIERS].update_one(
                {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
                {"$set": {
                    "iban": iban,
                    "iban_fonte": "fatture_xml",
                    "iban_data_ricerca": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {"success": True, "trovato": True, "iban": iban, "fornitore": nome, "partita_iva": piva}
    
    fatture_count = await db["invoices"].count_documents({"$or": [{"cedente_piva": piva}, {"supplier_vat": piva}]})
    
    return {"success": True, "trovato": False, "iban": None, "fornitore": nome, "partita_iva": piva, "fatture_presenti": fatture_count}


@router.post("/sync-iban")
async def sync_iban_fornitori() -> Dict[str, Any]:
    """Sincronizza IBAN da fatture XML per tutti i fornitori."""
    db = Database.get_db()
    
    iban_pattern = re.compile(r'IT\d{2}[A-Z]?\d{5}\d{5}[A-Z0-9]{12}', re.IGNORECASE)
    
    # Trova fatture con IBAN
    fatture_con_iban = await db["invoices"].find(
        {"pagamento.iban": {"$exists": True, "$ne": "", "$ne": None}},
        {"cedente_piva": 1, "supplier_vat": 1, "pagamento.iban": 1}
    ).to_list(None)
    
    # Mappa P.IVA -> IBAN
    iban_map = {}
    for fat in fatture_con_iban:
        piva = fat.get("cedente_piva") or fat.get("supplier_vat")
        iban = fat.get("pagamento", {}).get("iban", "").upper().strip()
        if piva and iban and iban_pattern.match(iban) and len(iban) == 27:
            iban_map[piva] = iban
    
    # Aggiorna fornitori
    aggiornati = 0
    for piva, iban in iban_map.items():
        result = await db[Collections.SUPPLIERS].update_one(
            {"partita_iva": piva, "$or": [{"iban": None}, {"iban": ""}, {"iban": {"$exists": False}}]},
            {"$set": {"iban": iban, "iban_fonte": "sync_fatture", "updated_at": datetime.utcnow().isoformat()}}
        )
        if result.modified_count > 0:
            aggiornati += 1
    
    return {"success": True, "fatture_con_iban": len(fatture_con_iban), "pive_uniche": len(iban_map), "fornitori_aggiornati": aggiornati}


@router.get("/{supplier_id}/iban-from-invoices")
async def get_iban_from_invoices(supplier_id: str) -> Dict[str, Any]:
    """Recupera IBAN dalle fatture di un fornitore."""
    db = Database.get_db()
    
    fornitore = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"_id": 0, "partita_iva": 1, "ragione_sociale": 1}
    )
    
    if not fornitore:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    piva = fornitore.get("partita_iva")
    
    fatture = await db["invoices"].find(
        {"$or": [{"cedente_piva": piva}, {"supplier_vat": piva}], "pagamento.iban": {"$exists": True}},
        {"pagamento.iban": 1, "numero_documento": 1, "data_documento": 1}
    ).limit(10).to_list(10)
    
    iban_trovati = []
    for fat in fatture:
        iban = fat.get("pagamento", {}).get("iban")
        if iban:
            iban_trovati.append({
                "iban": iban,
                "fattura": fat.get("numero_documento"),
                "data": fat.get("data_documento")
            })
    
    return {
        "fornitore": fornitore.get("ragione_sociale"),
        "partita_iva": piva,
        "iban_trovati": iban_trovati,
        "count": len(iban_trovati)
    }
