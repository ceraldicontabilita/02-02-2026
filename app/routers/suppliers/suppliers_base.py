"""
Suppliers Base - CRUD operations per fornitori.
Operazioni: list, get, update, delete, toggle-active
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from app.database import Database, Collections
from app.middleware.performance import cache

logger = logging.getLogger(__name__)
router = APIRouter()

# Cache settings
SUPPLIERS_CACHE_KEY = "suppliers_list"
SUPPLIERS_CACHE_TTL = 300

# Metodi di pagamento (condiviso con altri moduli)
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


@router.get("")
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Search term"),
    metodo_pagamento: Optional[str] = Query(None),
    attivo: Optional[bool] = Query(None),
    use_cache: bool = Query(True)
) -> List[Dict[str, Any]]:
    """Lista fornitori con statistiche fatture."""
    import time
    
    db = Database.get_db()
    t_start = time.time()
    
    # Cache check
    cache_key = f"{SUPPLIERS_CACHE_KEY}:all"
    if use_cache and not search and not metodo_pagamento and attivo is None:
        cached_data = await cache.get(cache_key)
        if cached_data is not None:
            return cached_data[skip:skip+limit]
    
    suppliers_map = {}
    
    # Query fornitori
    suppliers_query = {}
    if search and search.strip():
        search_lower = search.strip()
        suppliers_query["$or"] = [
            {"denominazione": {"$regex": search_lower, "$options": "i"}},
            {"ragione_sociale": {"$regex": search_lower, "$options": "i"}},
            {"partita_iva": {"$regex": search_lower, "$options": "i"}}
        ]
    if metodo_pagamento:
        suppliers_query["metodo_pagamento"] = metodo_pagamento
    
    saved_suppliers = await db[Collections.SUPPLIERS].find(suppliers_query, {"_id": 0}).to_list(1000)
    
    for supplier in saved_suppliers:
        piva = supplier.get("partita_iva")
        if piva:
            suppliers_map[piva] = {
                **supplier,
                "fatture_count": supplier.get("fatture_count", 0),
                "fatture_totale": 0,
                "fatture_non_pagate": 0,
                "source": "database"
            }
    
    # Statistiche fatture (solo senza ricerca)
    if not search:
        stats_pipeline = [
            {"$match": {"$or": [
                {"supplier_vat": {"$exists": True, "$ne": None, "$ne": ""}},
                {"fornitore_partita_iva": {"$exists": True, "$ne": None, "$ne": ""}}
            ]}},
            {"$group": {
                "_id": {"$ifNull": ["$supplier_vat", "$fornitore_partita_iva"]},
                "fatture_count": {"$sum": 1},
                "fatture_totale": {"$sum": {"$toDouble": {"$ifNull": ["$importo_totale", {"$ifNull": ["$total_amount", 0]}]}}},
                "fatture_non_pagate": {"$sum": {"$cond": [{"$ne": ["$pagato", True]}, {"$toDouble": {"$ifNull": ["$importo_totale", {"$ifNull": ["$total_amount", 0]}]}}, 0]}}
            }}
        ]
        
        try:
            invoice_stats = await db["invoices"].aggregate(stats_pipeline, allowDiskUse=True).to_list(1000)
            for stat in invoice_stats:
                piva = stat.get("_id")
                if piva and piva in suppliers_map:
                    suppliers_map[piva]["fatture_count"] = stat.get("fatture_count", 0)
                    suppliers_map[piva]["fatture_totale"] = stat.get("fatture_totale", 0)
                    suppliers_map[piva]["fatture_non_pagate"] = stat.get("fatture_non_pagate", 0)
                    suppliers_map[piva]["source"] = "merged"
        except Exception as e:
            logger.warning(f"Error loading invoice stats: {e}")
    
    suppliers = list(suppliers_map.values())
    suppliers.sort(key=lambda x: x.get("fatture_count", 0), reverse=True)
    
    # Cache save
    if use_cache and not search and not metodo_pagamento and attivo is None:
        await cache.set(cache_key, suppliers, SUPPLIERS_CACHE_TTL)
    
    logger.info(f"Suppliers endpoint: {time.time() - t_start:.2f}s ({len(suppliers)} items)")
    return suppliers[skip:skip+limit]


@router.get("/stats")
async def get_suppliers_stats() -> Dict[str, Any]:
    """Statistiche aggregate fornitori."""
    db = Database.get_db()
    
    total = await db[Collections.SUPPLIERS].count_documents({})
    active = await db[Collections.SUPPLIERS].count_documents({"attivo": True})
    
    pipeline = [{"$group": {"_id": "$metodo_pagamento", "count": {"$sum": 1}}}]
    by_method = await db[Collections.SUPPLIERS].aggregate(pipeline).to_list(100)
    
    return {
        "totale": total,
        "attivi": active,
        "inattivi": total - active,
        "per_metodo_pagamento": {item["_id"] or "non_definito": item["count"] for item in by_method}
    }


@router.get("/{supplier_id}")
async def get_supplier(supplier_id: str) -> Dict[str, Any]:
    """Dettaglio singolo fornitore con fatture recenti."""
    db = Database.get_db()
    
    supplier = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"_id": 0}
    )
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    piva = supplier.get("partita_iva")
    if piva:
        invoices = await db[Collections.INVOICES].find(
            {"cedente_piva": piva}, {"_id": 0}
        ).sort("data_fattura", -1).limit(20).to_list(20)
        supplier["fatture_recenti"] = invoices
    
    return supplier


@router.put("/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """Aggiorna dati fornitore."""
    db = Database.get_db()
    
    data.pop("id", None)
    data.pop("partita_iva", None)
    data.pop("created_at", None)
    
    metodo_configurato = False
    if "metodo_pagamento" in data:
        if data["metodo_pagamento"] not in PAYMENT_METHODS:
            raise HTTPException(status_code=400, detail=f"Metodo non valido: {list(PAYMENT_METHODS.keys())}")
        metodo_configurato = data["metodo_pagamento"] is not None and data["metodo_pagamento"] != ""
    
    if "termini_pagamento" in data:
        term = next((t for t in PAYMENT_TERMS if t["code"] == data["termini_pagamento"]), None)
        if term:
            data["giorni_pagamento"] = term["days"]
    
    data["updated_at"] = datetime.utcnow().isoformat()
    
    supplier = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"partita_iva": 1}
    )
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    result = await db[Collections.SUPPLIERS].update_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    # Risolvi alert se metodo configurato
    alerts_risolti = 0
    if metodo_configurato and supplier.get("partita_iva"):
        alert_result = await db["alerts"].update_many(
            {"tipo": "fornitore_senza_metodo_pagamento", "fornitore_piva": supplier["partita_iva"], "risolto": False},
            {"$set": {"risolto": True, "risolto_il": datetime.utcnow().isoformat()}}
        )
        alerts_risolti = alert_result.modified_count
    
    # Pulizia magazzino se esclude_magazzino=True
    prodotti_rimossi = 0
    if data.get("esclude_magazzino") == True:
        piva = supplier.get("partita_iva")
        for coll in ["warehouse_stocks", "magazzino_doppia_verita", "warehouse_inventory"]:
            res = await db[coll].delete_many({"$or": [{"supplier_piva": piva}, {"fornitore_piva": piva}]})
            prodotti_rimossi += res.deleted_count
    
    return {"message": "Fornitore aggiornato", "alerts_risolti": alerts_risolti, "prodotti_rimossi_magazzino": prodotti_rimossi}


@router.post("/{supplier_id}/toggle-active")
async def toggle_supplier_active(supplier_id: str) -> Dict[str, Any]:
    """Attiva/disattiva fornitore."""
    db = Database.get_db()
    
    supplier = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]}
    )
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    new_status = not supplier.get("attivo", True)
    
    await db[Collections.SUPPLIERS].update_one(
        {"_id": supplier["_id"]},
        {"$set": {"attivo": new_status, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    await cache.clear_pattern(SUPPLIERS_CACHE_KEY)
    
    return {"message": f"Fornitore {'attivato' if new_status else 'disattivato'}", "attivo": new_status}


@router.delete("/{supplier_id}")
async def delete_supplier(supplier_id: str, force: bool = Query(False)) -> Dict[str, str]:
    """Elimina fornitore (con check fatture collegate)."""
    db = Database.get_db()
    
    supplier = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]}
    )
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    piva = supplier.get("partita_iva")
    invoice_count = await db[Collections.INVOICES].count_documents({
        "$or": [{"cedente_piva": piva}, {"supplier_vat": piva}]
    })
    
    if invoice_count > 0 and not force:
        raise HTTPException(status_code=400, detail=f"Impossibile eliminare: {invoice_count} fatture collegate. Usa force=true")
    
    await db[Collections.SUPPLIERS].delete_one({"_id": supplier["_id"]})
    
    return {"message": "Fornitore eliminato"}


@router.get("/{supplier_id}/fatture")
async def get_fatture_fornitore(
    supplier_id: str,
    anno: Optional[int] = Query(None),
    data_da: Optional[str] = Query(None),
    data_a: Optional[str] = Query(None),
    limit: int = Query(100),
    skip: int = Query(0)
) -> Dict[str, Any]:
    """Estratto fatture di un fornitore."""
    db = Database.get_db()
    
    fornitore = await db[Collections.SUPPLIERS].find_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"_id": 0}
    )
    
    if not fornitore:
        raise HTTPException(status_code=404, detail="Fornitore non trovato")
    
    partita_iva = fornitore.get("partita_iva")
    
    query = {"$or": [
        {"fornitore_partita_iva": partita_iva},
        {"supplier_vat": partita_iva},
        {"cedente_piva": partita_iva}
    ]}
    
    if anno:
        query["$or"] = [{"data_documento": {"$regex": f"^{anno}"}}, {"invoice_date": {"$regex": f"^{anno}"}}]
    
    fatture = await db[Collections.INVOICES].find(query, {"_id": 0}).sort("data_documento", -1).skip(skip).limit(limit).to_list(limit)
    totale = await db[Collections.INVOICES].count_documents(query)
    
    totale_imponibile = sum(f.get("imponibile", f.get("subtotal", 0)) or 0 for f in fatture)
    totale_iva = sum(f.get("iva", f.get("tax", 0)) or 0 for f in fatture)
    totale_importo = sum(f.get("importo_totale", f.get("total_amount", 0)) or 0 for f in fatture)
    
    return {
        "fornitore": fornitore,
        "fatture": fatture,
        "totale_risultati": totale,
        "pagina_corrente": skip // limit + 1,
        "totali": {"imponibile": totale_imponibile, "iva": totale_iva, "totale": totale_importo}
    }
