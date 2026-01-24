"""
Prima Nota Module - Operazioni Prima Nota Cassa.
CRUD e operazioni per movimenti di cassa.
"""
from fastapi import HTTPException, Query, Body
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid

from app.database import Database
from .common import (
    COLLECTION_PRIMA_NOTA_CASSA, TIPO_MOVIMENTO, CATEGORIE_ESCLUSE, calcola_saldo_anni_precedenti
)


async def list_prima_nota_cassa(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    anno: Optional[int] = Query(None, description="Anno (es. 2024, 2025)"),
    data_da: Optional[str] = Query(None, description="Data inizio (YYYY-MM-DD)"),
    data_a: Optional[str] = Query(None, description="Data fine (YYYY-MM-DD)"),
    tipo: Optional[str] = Query(None, description="entrata o uscita"),
    categoria: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Lista movimenti prima nota cassa con saldo separato per anno."""
    db = Database.get_db()
    
    query = {
        "status": {"$nin": ["deleted", "archived"]},
        "categoria": {"$nin": CATEGORIE_ESCLUSE}
    }
    
    if anno:
        query["data"] = {"$gte": f"{anno}-01-01", "$lte": f"{anno}-12-31"}
    
    if data_da:
        query.setdefault("data", {})["$gte"] = data_da
    if data_a:
        query.setdefault("data", {})["$lte"] = data_a
    if tipo:
        query["tipo"] = tipo
    if categoria:
        query["categoria"] = categoria
    
    movimenti = await db[COLLECTION_PRIMA_NOTA_CASSA].find(query, {"_id": 0}).sort("data", -1).skip(skip).limit(limit).to_list(limit)
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "entrate": {"$sum": {"$cond": [{"$eq": ["$tipo", "entrata"]}, "$importo", 0]}},
            "uscite": {"$sum": {"$cond": [{"$eq": ["$tipo", "uscita"]}, "$importo", 0]}}
        }}
    ]
    totals = await db[COLLECTION_PRIMA_NOTA_CASSA].aggregate(pipeline).to_list(1)
    
    entrate_anno = totals[0].get("entrate", 0) if totals else 0
    uscite_anno = totals[0].get("uscite", 0) if totals else 0
    saldo_anno = entrate_anno - uscite_anno
    
    saldo_precedente = await calcola_saldo_anni_precedenti(db, COLLECTION_PRIMA_NOTA_CASSA, anno) if anno else 0.0
    saldo_finale = saldo_precedente + saldo_anno
    
    return {
        "movimenti": movimenti,
        "saldo": round(saldo_finale, 2),
        "saldo_anno": round(saldo_anno, 2),
        "saldo_precedente": round(saldo_precedente, 2),
        "totale_entrate": round(entrate_anno, 2),
        "totale_uscite": round(uscite_anno, 2),
        "count": len(movimenti),
        "anno": anno
    }


async def create_prima_nota_cassa(data: Dict[str, Any] = Body(...)) -> Dict[str, str]:
    """Crea movimento prima nota cassa."""
    db = Database.get_db()
    
    required = ["data", "tipo", "importo", "descrizione"]
    for field in required:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"Campo obbligatorio mancante: {field}")
    
    if data["tipo"] not in TIPO_MOVIMENTO:
        raise HTTPException(status_code=400, detail="Tipo deve essere 'entrata' o 'uscita'")
    
    movimento = {
        "id": str(uuid.uuid4()),
        "data": data["data"],
        "tipo": data["tipo"],
        "importo": float(data["importo"]),
        "descrizione": data["descrizione"],
        "categoria": data.get("categoria", "Altro"),
        "riferimento": data.get("riferimento"),
        "fornitore_piva": data.get("fornitore_piva"),
        "fattura_id": data.get("fattura_id"),
        "note": data.get("note"),
        "source": data.get("source"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db[COLLECTION_PRIMA_NOTA_CASSA].insert_one(movimento.copy())
    return {"message": "Movimento cassa creato", "id": movimento["id"]}


async def update_prima_nota_cassa(
    movimento_id: str,
    data: Dict[str, Any] = Body(...)
) -> Dict[str, str]:
    """Modifica movimento prima nota cassa."""
    db = Database.get_db()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field in ["data", "tipo", "importo", "descrizione", "categoria", "riferimento", "note", "fornitore"]:
        if field in data:
            update_data[field] = float(data[field]) if field == "importo" else data[field]
    
    result = await db[COLLECTION_PRIMA_NOTA_CASSA].update_one(
        {"id": movimento_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    
    return {"message": "Movimento aggiornato", "id": movimento_id}


async def delete_movimento_cassa(
    movimento_id: str,
    force: bool = Query(False, description="Forza eliminazione")
) -> Dict[str, Any]:
    """Elimina un singolo movimento cassa con validazione."""
    from app.services.business_rules import BusinessRules, EntityStatus
    
    db = Database.get_db()
    
    mov = await db[COLLECTION_PRIMA_NOTA_CASSA].find_one({"id": movimento_id})
    if not mov:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    
    validation = BusinessRules.can_delete_movement(mov)
    
    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={"message": "Eliminazione non consentita", "errors": validation.errors}
        )
    
    if validation.warnings and not force:
        return {
            "status": "warning",
            "message": "Eliminazione richiede conferma",
            "warnings": validation.warnings,
            "require_force": True
        }
    
    await db[COLLECTION_PRIMA_NOTA_CASSA].update_one(
        {"id": movimento_id},
        {"$set": {
            "entity_status": EntityStatus.DELETED.value,
            "status": "deleted",
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Movimento eliminato (archiviato)"}


async def delete_all_prima_nota_cassa() -> Dict[str, Any]:
    """Elimina TUTTI i movimenti dalla prima nota cassa."""
    db = Database.get_db()
    result = await db[COLLECTION_PRIMA_NOTA_CASSA].delete_many({})
    return {"message": f"Eliminati {result.deleted_count} movimenti dalla cassa"}


async def delete_cassa_by_source(source: str) -> Dict[str, Any]:
    """Elimina movimenti cassa per source."""
    db = Database.get_db()
    result = await db[COLLECTION_PRIMA_NOTA_CASSA].delete_many({"source": source})
    return {"message": f"Eliminati {result.deleted_count} movimenti con source={source}"}


async def get_fattura_allegata_cassa(movimento_id: str) -> Dict[str, Any]:
    """Recupera la fattura allegata a un movimento cassa."""
    db = Database.get_db()
    
    mov = await db[COLLECTION_PRIMA_NOTA_CASSA].find_one({"id": movimento_id}, {"_id": 0})
    if not mov:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    
    fattura_id = mov.get("fattura_id")
    if not fattura_id:
        return {"movimento_id": movimento_id, "fattura": None, "message": "Nessuna fattura collegata"}
    
    fattura = await db["invoices"].find_one(
        {"$or": [{"id": fattura_id}, {"invoice_key": fattura_id}]},
        {"_id": 0}
    )
    
    return {
        "movimento_id": movimento_id,
        "fattura": fattura,
        "message": "Fattura trovata" if fattura else "Fattura non trovata nel DB"
    }


async def analisi_movimenti_bancari_errati_in_cassa() -> Dict[str, Any]:
    """Analizza i movimenti bancari importati erroneamente in Prima Nota Cassa."""
    db = Database.get_db()
    
    bancari_keywords = ['INC.POS', 'INCAS', 'BONIFICO', 'SEPA', 'ADDEBITO', 'ACCREDITO', 
                        'NUMIA', 'BANK', 'BANCA', 'VERS. CONTANTI', 'PRELIEVO ATM']
    
    movimenti_csv = await db[COLLECTION_PRIMA_NOTA_CASSA].find(
        {"source": "csv_import"},
        {"_id": 0, "id": 1, "descrizione": 1, "importo": 1, "data": 1, "tipo": 1}
    ).to_list(10000)
    
    bancari = []
    non_bancari = []
    totale_importo_bancari = 0
    
    for m in movimenti_csv:
        desc = (m.get('descrizione') or '').upper()
        if any(kw in desc for kw in bancari_keywords):
            bancari.append(m)
            totale_importo_bancari += abs(m.get('importo', 0))
        else:
            non_bancari.append(m)
    
    return {
        "totale_csv_import": len(movimenti_csv),
        "movimenti_bancari_errati": len(bancari),
        "movimenti_legittimi": len(non_bancari),
        "totale_importo_da_eliminare": round(totale_importo_bancari, 2),
        "campione_bancari": bancari[:10],
        "campione_legittimi": non_bancari[:5],
        "azione_consigliata": "DELETE /api/prima-nota/cassa/elimina-movimenti-bancari-errati"
    }


async def elimina_movimenti_bancari_da_cassa() -> Dict[str, Any]:
    """Elimina i movimenti bancari importati erroneamente in Prima Nota Cassa."""
    db = Database.get_db()
    
    bancari_keywords = ['INC.POS', 'INCAS', 'BONIFICO', 'SEPA', 'ADDEBITO', 'ACCREDITO', 
                        'NUMIA', 'BANK', 'BANCA', 'VERS. CONTANTI', 'PRELIEVO ATM']
    
    movimenti_csv = await db[COLLECTION_PRIMA_NOTA_CASSA].find(
        {"source": "csv_import"},
        {"_id": 1, "descrizione": 1}
    ).to_list(10000)
    
    ids_da_eliminare = []
    for m in movimenti_csv:
        desc = (m.get('descrizione') or '').upper()
        if any(kw in desc for kw in bancari_keywords):
            ids_da_eliminare.append(m['_id'])
    
    deleted_count = 0
    if ids_da_eliminare:
        result = await db[COLLECTION_PRIMA_NOTA_CASSA].delete_many({"_id": {"$in": ids_da_eliminare}})
        deleted_count = result.deleted_count
    
    remaining = await db[COLLECTION_PRIMA_NOTA_CASSA].count_documents({"source": "csv_import"})
    
    return {
        "success": True,
        "message": f"Eliminati {deleted_count} movimenti bancari da Prima Nota Cassa",
        "movimenti_eliminati": deleted_count,
        "csv_import_rimanenti": remaining,
        "regola": "L'estratto conto bancario va importato SOLO in estratto_conto_movimenti, NON in prima_nota_cassa"
    }
