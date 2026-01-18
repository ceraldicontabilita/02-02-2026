"""
Parlant Agent Router
Endpoint per gestire l'agente Parlant AI.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()


class StartResponse(BaseModel):
    """Risposta avvio Parlant."""
    success: bool
    agent_id: Optional[str] = None
    port: Optional[int] = None
    error: Optional[str] = None


class StatusResponse(BaseModel):
    """Stato Parlant."""
    running: bool
    agent_id: Optional[str] = None
    port: Optional[int] = None
    url: Optional[str] = None


@router.post("/start", response_model=StartResponse)
async def start_parlant(background_tasks: BackgroundTasks) -> StartResponse:
    """
    Avvia il server Parlant con l'agente contabile.
    
    Il server viene avviato sulla porta 8800.
    L'agente viene configurato con guidelines e tools per la contabilità.
    """
    from app.services.parlant_agent import parlant_service
    
    if parlant_service.is_running:
        return StartResponse(
            success=True,
            agent_id=parlant_service.agent_id,
            port=8800,
            error="Server già in esecuzione"
        )
    
    try:
        result = await parlant_service.start()
        
        if result["success"]:
            return StartResponse(
                success=True,
                agent_id=result.get("agent_id"),
                port=result.get("port")
            )
        else:
            return StartResponse(
                success=False,
                error=result.get("error", "Errore sconosciuto")
            )
    except Exception as e:
        logger.exception(f"Errore avvio Parlant: {e}")
        return StartResponse(
            success=False,
            error=str(e)
        )


@router.post("/stop")
async def stop_parlant() -> Dict[str, Any]:
    """Ferma il server Parlant."""
    from app.services.parlant_agent import parlant_service
    
    if not parlant_service.is_running:
        return {"success": True, "message": "Server non in esecuzione"}
    
    try:
        await parlant_service.stop()
        return {"success": True, "message": "Server Parlant fermato"}
    except Exception as e:
        logger.exception(f"Errore stop Parlant: {e}")
        return {"success": False, "error": str(e)}


@router.get("/status", response_model=StatusResponse)
async def get_status() -> StatusResponse:
    """Ottieni lo stato del server Parlant."""
    from app.services.parlant_agent import parlant_service
    
    status = parlant_service.get_status()
    return StatusResponse(**status)


@router.get("/agent-id")
async def get_agent_id() -> Dict[str, Any]:
    """Ottieni l'ID dell'agente per il widget frontend."""
    from app.services.parlant_agent import parlant_service
    
    if not parlant_service.is_running:
        raise HTTPException(status_code=503, detail="Server Parlant non in esecuzione")
    
    return {
        "agent_id": parlant_service.agent_id,
        "server_url": f"http://localhost:8800"
    }


@router.get("/config")
async def get_config() -> Dict[str, Any]:
    """Configurazione per il widget React Parlant."""
    from app.services.parlant_agent import parlant_service
    import os
    
    # Per il frontend, usa l'URL esterno se disponibile
    backend_url = os.getenv("REACT_APP_BACKEND_URL", "http://localhost:8800")
    
    return {
        "enabled": parlant_service.is_running,
        "server_url": f"{backend_url.rstrip('/')}/parlant" if parlant_service.is_running else None,
        "agent_id": parlant_service.agent_id,
        "widget_config": {
            "title": "Assistente Contabit",
            "subtitle": "AI per la contabilità",
            "placeholder": "Scrivi una domanda...",
            "welcomeMessage": "Ciao! Sono l'assistente AI di Contabit. Come posso aiutarti oggi?"
        }
    }
