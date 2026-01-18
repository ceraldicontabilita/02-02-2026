"""
Parlant API Router
Endpoint per gestire il server Parlant AI.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


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
