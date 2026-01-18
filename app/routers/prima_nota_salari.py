"""
Router Prima Nota Salari
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from app.database import Database
from datetime import datetime

router = APIRouter(prefix="/api/prima-nota-salari", tags=["Prima Nota Salari"])


@router.get("")
async def get_prima_nota_salari(
    anno: Optional[int] = Query(None),
    mese: Optional[int] = Query(None),
    dipendente: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
) -> Dict[str, Any]:
    """Restituisce i movimenti della prima nota salari."""
    db = Database.get_db()
    
    query = {}
    
    if anno:
        query["data"] = {"$regex": f"^{anno}"}
    if mese and anno:
        query["data"] = {"$regex": f"^{anno}-{str(mese).zfill(2)}"}
    if dipendente:
        query["$or"] = [
            {"dipendente": {"$regex": dipendente, "$options": "i"}},
            {"beneficiario": {"$regex": dipendente, "$options": "i"}}
        ]
    
    movimenti = await db.prima_nota_salari.find(query, {"_id": 0}).sort("data", -1).limit(limit).to_list(limit)
    
    # Calcola totali
    totale = sum(m.get("importo", 0) or 0 for m in movimenti)
    
    return {
        "movimenti": movimenti,
        "totale": totale,
        "count": len(movimenti)
    }


@router.get("/riepilogo")
async def get_riepilogo_salari(
    anno: int = Query(...)
) -> Dict[str, Any]:
    """Restituisce il riepilogo annuale dei salari."""
    db = Database.get_db()
    
    # Aggregazione per mese
    pipeline = [
        {"$match": {"data": {"$regex": f"^{anno}"}}},
        {"$group": {
            "_id": {"$substr": ["$data", 0, 7]},
            "totale": {"$sum": "$importo"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    mesi = await db.prima_nota_salari.aggregate(pipeline).to_list(12)
    
    # Totale annuale
    totale_anno = sum(m["totale"] for m in mesi)
    
    return {
        "anno": anno,
        "mesi": mesi,
        "totale_anno": totale_anno
    }



@router.delete("/pulisci-righe-vuote")
async def pulisci_righe_vuote() -> Dict[str, Any]:
    """
    Elimina righe vuote dalla prima nota salari.
    Una riga è considerata vuota se importo_busta E importo_bonifico sono entrambi 0 o null.
    """
    db = Database.get_db()
    
    # Conta prima
    prima = await db.prima_nota_salari.count_documents({})
    
    # Elimina righe vuote
    result = await db.prima_nota_salari.delete_many({
        "$and": [
            {"$or": [{"importo_busta": 0}, {"importo_busta": None}, {"importo_busta": {"$exists": False}}]},
            {"$or": [{"importo_bonifico": 0}, {"importo_bonifico": None}, {"importo_bonifico": {"$exists": False}}]}
        ]
    })
    
    dopo = await db.prima_nota_salari.count_documents({})
    
    return {
        "success": True,
        "righe_prima": prima,
        "righe_eliminate": result.deleted_count,
        "righe_dopo": dopo
    }


@router.get("/statistiche")
async def get_statistiche() -> Dict[str, Any]:
    """Statistiche sui record della prima nota salari."""
    db = Database.get_db()
    
    totale = await db.prima_nota_salari.count_documents({})
    
    # Conta righe vuote
    vuote = await db.prima_nota_salari.count_documents({
        "$and": [
            {"$or": [{"importo_busta": 0}, {"importo_busta": None}]},
            {"$or": [{"importo_bonifico": 0}, {"importo_bonifico": None}]}
        ]
    })
    
    # Conta righe con solo busta (bonifico mancante)
    solo_busta = await db.prima_nota_salari.count_documents({
        "importo_busta": {"$gt": 0},
        "$or": [{"importo_bonifico": 0}, {"importo_bonifico": None}]
    })
    
    # Conta righe con differenze
    pipeline = [
        {"$match": {"importo_busta": {"$gt": 0}}},
        {"$project": {
            "diff": {"$subtract": ["$importo_bonifico", "$importo_busta"]}
        }},
        {"$match": {"diff": {"$ne": 0}}},
        {"$count": "total"}
    ]
    diff_result = await db.prima_nota_salari.aggregate(pipeline).to_list(1)
    con_differenze = diff_result[0]["total"] if diff_result else 0
    
    return {
        "totale_record": totale,
        "righe_vuote": vuote,
        "solo_busta_senza_bonifico": solo_busta,
        "con_differenze": con_differenze,
        "righe_valide": totale - vuote
    }

