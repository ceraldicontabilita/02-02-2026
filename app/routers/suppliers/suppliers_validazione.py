"""
Suppliers Validazione - Validazioni P0 e statistiche fornitori.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List
from datetime import datetime
import logging

from app.database import Database, Collections

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/validazione-p0")
async def validazione_fornitori_p0() -> Dict[str, Any]:
    """Validazione P0: fornitori senza metodo di pagamento configurato."""
    db = Database.get_db()
    
    # Fornitori senza metodo pagamento
    senza_metodo = await db[Collections.SUPPLIERS].find(
        {"$or": [
            {"metodo_pagamento": {"$exists": False}},
            {"metodo_pagamento": None},
            {"metodo_pagamento": ""},
            {"metodo_pagamento": "da_configurare"}
        ]},
        {"_id": 0, "id": 1, "partita_iva": 1, "denominazione": 1, "ragione_sociale": 1}
    ).to_list(100)
    
    # Fornitori con metodo bancario ma senza IBAN
    metodi_bancari = ["bonifico", "banca", "sepa", "rid", "sdd", "assegno", "riba", "mav", "rav", "f24", "carta", "misto"]
    
    senza_iban = await db[Collections.SUPPLIERS].find(
        {
            "metodo_pagamento": {"$in": metodi_bancari},
            "$or": [{"iban": None}, {"iban": ""}, {"iban": {"$exists": False}}]
        },
        {"_id": 0, "id": 1, "partita_iva": 1, "denominazione": 1, "metodo_pagamento": 1}
    ).to_list(100)
    
    return {
        "senza_metodo_pagamento": {
            "count": len(senza_metodo),
            "fornitori": senza_metodo[:50]
        },
        "senza_iban": {
            "count": len(senza_iban),
            "fornitori": senza_iban[:50]
        },
        "totale_problemi": len(senza_metodo) + len(senza_iban),
        "checked_at": datetime.utcnow().isoformat()
    }


@router.get("/scadenze")
async def get_scadenze_fornitori(
    giorni: int = Query(30, description="Giorni futuri da considerare")
) -> Dict[str, Any]:
    """Scadenze pagamenti fornitori nei prossimi N giorni."""
    from datetime import timedelta
    
    db = Database.get_db()
    
    oggi = datetime.utcnow().date()
    limite = (oggi + timedelta(days=giorni)).isoformat()
    
    fatture_scadenza = await db["invoices"].find(
        {
            "pagato": {"$ne": True},
            "data_scadenza": {"$lte": limite}
        },
        {"_id": 0, "id": 1, "numero_documento": 1, "data_scadenza": 1, "importo_totale": 1, 
         "cedente_denominazione": 1, "cedente_piva": 1}
    ).sort("data_scadenza", 1).to_list(100)
    
    totale = sum(f.get("importo_totale", 0) or 0 for f in fatture_scadenza)
    
    return {
        "giorni": giorni,
        "fatture": fatture_scadenza,
        "totale_da_pagare": round(totale, 2),
        "count": len(fatture_scadenza)
    }


@router.get("/per-metodo-pagamento")
async def get_suppliers_per_metodo() -> Dict[str, Any]:
    """Statistiche fornitori raggruppati per metodo di pagamento."""
    db = Database.get_db()
    
    pipeline = [
        {"$group": {
            "_id": "$metodo_pagamento",
            "count": {"$sum": 1},
            "attivi": {"$sum": {"$cond": ["$attivo", 1, 0]}}
        }},
        {"$sort": {"count": -1}}
    ]
    
    risultati = await db[Collections.SUPPLIERS].aggregate(pipeline).to_list(100)
    
    return {
        "per_metodo": {
            r["_id"] or "non_definito": {"count": r["count"], "attivi": r["attivi"]}
            for r in risultati
        },
        "totale": sum(r["count"] for r in risultati)
    }


@router.get("/duplicati")
async def get_fornitori_duplicati() -> Dict[str, Any]:
    """Trova fornitori duplicati per P.IVA."""
    db = Database.get_db()
    
    pipeline = [
        {"$match": {"partita_iva": {"$exists": True, "$ne": "", "$ne": None}}},
        {"$group": {
            "_id": "$partita_iva",
            "count": {"$sum": 1},
            "nomi": {"$push": "$denominazione"}
        }},
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    duplicati = await db[Collections.SUPPLIERS].aggregate(pipeline).to_list(100)
    
    return {
        "duplicati": [{"partita_iva": d["_id"], "count": d["count"], "nomi": d["nomi"][:5]} for d in duplicati],
        "totale_duplicati": len(duplicati)
    }


@router.post("/merge-duplicati")
async def merge_fornitori_duplicati() -> Dict[str, Any]:
    """Unisce fornitori duplicati mantenendo quello con più dati."""
    db = Database.get_db()
    
    pipeline = [
        {"$match": {"partita_iva": {"$exists": True, "$ne": "", "$ne": None}}},
        {"$group": {
            "_id": "$partita_iva",
            "count": {"$sum": 1},
            "ids": {"$push": "$id"}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    
    duplicati = await db[Collections.SUPPLIERS].aggregate(pipeline).to_list(100)
    
    merged = 0
    deleted = 0
    
    for dup in duplicati:
        piva = dup["_id"]
        
        # Trova tutti i record duplicati
        records = await db[Collections.SUPPLIERS].find({"partita_iva": piva}).to_list(None)
        
        if len(records) < 2:
            continue
        
        # Scegli il master (quello con più campi popolati)
        def count_fields(r):
            return sum(1 for k, v in r.items() if v and k not in ["_id", "id", "created_at", "updated_at"])
        
        records.sort(key=count_fields, reverse=True)
        master = records[0]
        
        # Merge dati dagli altri
        for slave in records[1:]:
            for key, val in slave.items():
                if key not in ["_id", "id"] and val and not master.get(key):
                    master[key] = val
        
        master["updated_at"] = datetime.utcnow().isoformat()
        
        # Aggiorna master
        await db[Collections.SUPPLIERS].update_one({"_id": master["_id"]}, {"$set": master})
        
        # Elimina duplicati
        for slave in records[1:]:
            await db[Collections.SUPPLIERS].delete_one({"_id": slave["_id"]})
            deleted += 1
        
        merged += 1
    
    return {"success": True, "gruppi_merged": merged, "record_eliminati": deleted}


@router.put("/{supplier_id}/nome")
async def update_supplier_nome(supplier_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Aggiorna nome/denominazione fornitore."""
    db = Database.get_db()
    
    denominazione = data.get("denominazione") or data.get("nome")
    if not denominazione:
        raise HTTPException(status_code=400, detail="Denominazione richiesta")
    
    result = await db[Collections.SUPPLIERS].update_one(
        {"$or": [{"id": supplier_id}, {"partita_iva": supplier_id}]},
        {"$set": {"denominazione": denominazione, "ragione_sociale": denominazione, "updated_at": datetime.utcnow().isoformat()}}
    )
    
    if result.matched_count == 0:
        import uuid
        nuovo = {
            "id": str(uuid.uuid4()),
            "partita_iva": supplier_id,
            "denominazione": denominazione,
            "ragione_sociale": denominazione,
            "metodo_pagamento": "bonifico",
            "attivo": True,
            "created_at": datetime.utcnow().isoformat()
        }
        await db[Collections.SUPPLIERS].insert_one(nuovo.copy())
        return {"success": True, "created": True, "denominazione": denominazione}
    
    return {"success": True, "updated": True, "denominazione": denominazione}
