"""
Router F24 - Gestione modelli F24, alerts e riconciliazione.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import logging

from ..services.f24_alert_system import (
    check_f24_scadenze,
    riconcilia_f24_con_banca,
    auto_riconcilia_f24,
    get_f24_dashboard
)
from ..constants.codici_tributo_f24 import (
    CODICI_TRIBUTO_F24,
    SEZIONI_F24,
    get_codice_info,
    get_codici_per_sezione
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/f24", tags=["F24"])

# Database reference
db = None

def set_database(database):
    """Set database reference from main server."""
    global db
    db = database


# ============== CRUD F24 ==============

@router.get("")
async def list_f24(skip: int = 0, limit: int = 10000) -> List[Dict[str, Any]]:
    """Lista tutti i modelli F24."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    f24_list = await db["f24"].find({}, {"_id": 0}).sort("scadenza", 1).skip(skip).limit(limit).to_list(limit)
    return f24_list


@router.post("")
async def create_f24(data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Crea nuovo modello F24."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    f24 = {
        "id": str(uuid.uuid4()),
        "tipo": data.get("tipo", "F24"),
        "descrizione": data.get("descrizione", ""),
        "importo": float(data.get("importo", 0) or 0),
        "scadenza": data.get("scadenza", ""),
        "periodo_riferimento": data.get("periodo_riferimento", ""),
        "codici_tributo": data.get("codici_tributo", []),
        "sezione": data.get("sezione", "erario"),
        "status": data.get("status", "pending"),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db["f24"].insert_one(f24)
    f24.pop("_id", None)
    
    return f24


@router.get("/{f24_id}")
async def get_f24(f24_id: str) -> Dict[str, Any]:
    """Ottiene singolo F24."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    f24 = await db["f24"].find_one({"id": f24_id}, {"_id": 0})
    if not f24:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return f24


@router.put("/{f24_id}")
async def update_f24(f24_id: str, data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Aggiorna F24."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    update_data = {k: v for k, v in data.items() if k != "id" and k != "_id"}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db["f24"].update_one(
        {"id": f24_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return await get_f24(f24_id)


@router.delete("/{f24_id}")
async def delete_f24(f24_id: str) -> Dict[str, Any]:
    """Elimina F24."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    result = await db["f24"].delete_one({"id": f24_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return {"success": True, "deleted_id": f24_id}


# ============== ALERTS ==============

@router.get("/alerts/scadenze")
async def get_alerts_scadenze(username: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Ottiene alert scadenze F24.
    Restituisce F24 in scadenza o scaduti con severity.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    return await check_f24_scadenze(db, username)


@router.get("/dashboard")
async def get_dashboard(username: Optional[str] = None) -> Dict[str, Any]:
    """
    Dashboard riepilogativa F24.
    Statistiche pagati/non pagati, per codice tributo.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    return await get_f24_dashboard(db, username)


# ============== RICONCILIAZIONE ==============

@router.post("/riconcilia")
async def riconcilia_manuale(
    f24_id: str = Body(...),
    movimento_bancario_id: str = Body(...)
) -> Dict[str, Any]:
    """
    Riconciliazione manuale F24 con movimento bancario.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    result = await riconcilia_f24_con_banca(db, f24_id, movimento_bancario_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Errore riconciliazione"))
    
    return result


@router.post("/auto-riconcilia")
async def auto_riconcilia() -> Dict[str, Any]:
    """
    Riconciliazione automatica F24 con movimenti bancari.
    Cerca corrispondenze per importo e keywords.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    return await auto_riconcilia_f24(db)


@router.post("/{f24_id}/mark-paid")
async def mark_f24_paid(f24_id: str, paid_date: Optional[str] = None) -> Dict[str, Any]:
    """Marca F24 come pagato manualmente."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database non configurato")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db["f24"].update_one(
        {"id": f24_id},
        {"$set": {
            "status": "paid",
            "paid_date": paid_date or now,
            "updated_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return {"success": True, "message": "F24 marcato come pagato"}


# ============== CODICI TRIBUTO ==============

@router.get("/codici/all")
async def get_all_codici() -> Dict[str, Any]:
    """Restituisce tutti i codici tributo."""
    return {
        "codici": CODICI_TRIBUTO_F24,
        "sezioni": SEZIONI_F24
    }


@router.get("/codici/{codice}")
async def get_codice(codice: str) -> Dict[str, Any]:
    """Restituisce info su singolo codice tributo."""
    return get_codice_info(codice)


@router.get("/codici/sezione/{sezione}")
async def get_codici_sezione(sezione: str) -> List[Dict[str, Any]]:
    """Restituisce codici tributo per sezione."""
    return get_codici_per_sezione(sezione)
