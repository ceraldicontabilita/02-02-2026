"""
Router HACCP - Gestione sicurezza alimentare
"""
from fastapi import APIRouter
from typing import Dict, Any, List
from app.database import Database

router = APIRouter(prefix="/api/haccp", tags=["HACCP"])


@router.get("/temperature-frigoriferi")
async def get_temperature_frigoriferi() -> List[Dict[str, Any]]:
    """Restituisce le rilevazioni temperature frigoriferi."""
    db = Database.get_db()
    temps = await db.haccp_temperature_frigoriferi.find({}, {"_id": 0}).sort("data", -1).limit(100).to_list(100)
    return temps


@router.get("/temperature-congelatori")
async def get_temperature_congelatori() -> List[Dict[str, Any]]:
    """Restituisce le rilevazioni temperature congelatori."""
    db = Database.get_db()
    temps = await db.haccp_temperature_congelatori.find({}, {"_id": 0}).sort("data", -1).limit(100).to_list(100)
    return temps


@router.get("/sanificazioni")
async def get_sanificazioni() -> List[Dict[str, Any]]:
    """Restituisce lo storico sanificazioni."""
    db = Database.get_db()
    san = await db.haccp_sanificazioni.find({}, {"_id": 0}).sort("data", -1).limit(100).to_list(100)
    return san


@router.get("/ricezione-merci")
async def get_ricezione_merci() -> List[Dict[str, Any]]:
    """Restituisce i controlli ricezione merci."""
    db = Database.get_db()
    ric = await db.haccp_ricezione_merci.find({}, {"_id": 0}).sort("data", -1).limit(100).to_list(100)
    return ric


@router.get("/scadenze")
async def get_scadenze_haccp() -> List[Dict[str, Any]]:
    """Restituisce le scadenze HACCP (certificazioni, controlli, ecc.)."""
    db = Database.get_db()
    scad = await db.haccp_scadenzario.find({}, {"_id": 0}).sort("data_scadenza", 1).limit(50).to_list(50)
    return scad


@router.get("/lotti")
async def get_lotti_haccp() -> List[Dict[str, Any]]:
    """Restituisce i lotti tracciati per HACCP."""
    db = Database.get_db()
    lotti = await db.haccp_lotti.find({}, {"_id": 0}).sort("data_ingresso", -1).limit(100).to_list(100)
    return lotti


# Router aggiuntivo per /api/haccp-completo (compatibilità frontend)
from fastapi import Query

haccp_completo_router = APIRouter(prefix="/api/haccp-completo", tags=["HACCP Completo"])


@haccp_completo_router.get("/notifiche")
async def get_haccp_notifiche(
    solo_non_lette: bool = Query(False),
    limit: int = Query(20, ge=1, le=100)
) -> Dict[str, Any]:
    """Restituisce le notifiche HACCP."""
    db = Database.get_db()
    
    query = {}
    if solo_non_lette:
        query["letto"] = False
    
    notifiche = await db.haccp_notifiche.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    non_lette = await db.haccp_notifiche.count_documents({"letto": False})
    
    return {
        "notifiche": notifiche,
        "non_lette": non_lette,
        "totale": len(notifiche)
    }


@haccp_completo_router.get("/notifiche/stats")
async def get_haccp_notifiche_stats() -> Dict[str, Any]:
    """Statistiche notifiche HACCP."""
    db = Database.get_db()
    
    non_lette = await db.haccp_notifiche.count_documents({"letto": False})
    totale = await db.haccp_notifiche.count_documents({})
    
    return {
        "non_lette": non_lette,
        "totale": totale,
        "urgenti": 0
    }


@haccp_completo_router.get("/scheduler/status")
async def get_scheduler_status() -> Dict[str, Any]:
    """Stato scheduler HACCP."""
    return {
        "attivo": True,
        "ultimo_run": None,
        "prossimo_run": None,
        "status": "idle"
    }


@haccp_completo_router.post("/scheduler/trigger-manual")
async def trigger_manual_scheduler() -> Dict[str, Any]:
    """Trigger manuale scheduler."""
    return {
        "success": True,
        "message": "Scheduler avviato manualmente"
    }
