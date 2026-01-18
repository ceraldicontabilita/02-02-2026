"""
Parlant API Router
Endpoint per gestire il server Parlant AI.
Include proxy per permettere al frontend di comunicare con Parlant.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional
import os
import logging
import httpx

logger = logging.getLogger(__name__)
router = APIRouter()

PARLANT_SERVER = "http://localhost:8800"


@router.get("/agent-id")
async def get_agent_id() -> Dict[str, Any]:
    """Ottieni l'ID dell'agente Parlant."""
    try:
        # Leggi agent_id dal file
        if os.path.exists("/tmp/parlant_agent_id.txt"):
            with open("/tmp/parlant_agent_id.txt", "r") as f:
                agent_id = f.read().strip()
                if agent_id:
                    return {
                        "success": True,
                        "agent_id": agent_id,
                        "server_url": "http://localhost:8800"
                    }
        
        return {
            "success": False,
            "error": "Agent non trovato. Avvia il server Parlant."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Verifica lo stato del server Parlant."""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:8800/agents")
            if response.status_code == 200:
                agents = response.json()
                return {
                    "online": True,
                    "agents": len(agents),
                    "server_url": "http://localhost:8800"
                }
    except Exception as e:
        pass
    
    return {
        "online": False,
        "message": "Server Parlant non raggiungibile"
    }


@router.get("/config")
async def get_config() -> Dict[str, Any]:
    """Configurazione per il widget React."""
    agent_id = None
    
    if os.path.exists("/tmp/parlant_agent_id.txt"):
        with open("/tmp/parlant_agent_id.txt", "r") as f:
            agent_id = f.read().strip()
    
    return {
        "server_url": "http://localhost:8800",
        "agent_id": agent_id,
        "widget": {
            "title": "Assistente Contabit",
            "subtitle": "AI per la contabilità",
            "placeholder": "Scrivi una domanda...",
            "welcomeMessage": "Ciao! Sono l'assistente AI di Contabit. Come posso aiutarti?"
        }
    }


# ============== PROXY ENDPOINTS ==============
# Questi endpoint fanno da proxy tra il frontend e il server Parlant locale

@router.get("/proxy/agents")
async def proxy_get_agents():
    """Proxy per ottenere lista agenti Parlant."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{PARLANT_SERVER}/agents")
            return response.json()
    except Exception as e:
        logger.error(f"Errore proxy agents: {e}")
        raise HTTPException(status_code=503, detail="Server Parlant non disponibile")


@router.post("/proxy/sessions")
async def proxy_create_session(request: Request):
    """Proxy per creare una sessione Parlant."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{PARLANT_SERVER}/sessions",
                json=body,
                headers={"Content-Type": "application/json"}
            )
            return response.json()
    except Exception as e:
        logger.error(f"Errore proxy create session: {e}")
        raise HTTPException(status_code=503, detail="Server Parlant non disponibile")


@router.get("/proxy/sessions/{session_id}")
async def proxy_get_session(session_id: str):
    """Proxy per ottenere dettagli sessione."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{PARLANT_SERVER}/sessions/{session_id}")
            return response.json()
    except Exception as e:
        logger.error(f"Errore proxy get session: {e}")
        raise HTTPException(status_code=503, detail="Server Parlant non disponibile")


@router.get("/proxy/sessions/{session_id}/events")
async def proxy_get_events(session_id: str):
    """Proxy per ottenere eventi di una sessione."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{PARLANT_SERVER}/sessions/{session_id}/events")
            return response.json()
    except Exception as e:
        logger.error(f"Errore proxy get events: {e}")
        raise HTTPException(status_code=503, detail="Server Parlant non disponibile")


@router.post("/proxy/sessions/{session_id}/events")
async def proxy_post_event(session_id: str, request: Request):
    """Proxy per inviare un evento (messaggio) a una sessione."""
    try:
        body = await request.json()
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{PARLANT_SERVER}/sessions/{session_id}/events",
                json=body,
                headers={"Content-Type": "application/json"}
            )
            return response.json()
    except Exception as e:
        logger.error(f"Errore proxy post event: {e}")
        raise HTTPException(status_code=503, detail="Server Parlant non disponibile")


@router.get("/proxy/sessions/{session_id}/events/stream")
async def proxy_stream_events(session_id: str, request: Request):
    """Proxy per streaming eventi SSE da Parlant."""
    try:
        async def event_generator():
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "GET",
                    f"{PARLANT_SERVER}/sessions/{session_id}/events/stream",
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    async for line in response.aiter_lines():
                        yield f"{line}\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.error(f"Errore proxy stream: {e}")
        raise HTTPException(status_code=503, detail="Server Parlant non disponibile")
