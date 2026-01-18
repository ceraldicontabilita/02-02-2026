"""
AI Assistant Router
Endpoint per l'assistente AI conversazionale
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    """Richiesta chat."""
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    """Risposta chat."""
    success: bool
    response: str
    session_id: str
    suggested_page: Optional[str] = None
    timestamp: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Invia un messaggio all'assistente AI.
    
    - **message**: Il messaggio dell'utente
    - **session_id**: ID sessione per mantenere la cronologia (opzionale)
    - **context**: Contesto aggiuntivo come pagina corrente, dati selezionati (opzionale)
    """
    from app.services.ai_assistant import ai_assistant
    
    result = await ai_assistant.chat(
        message=request.message,
        session_id=request.session_id,
        context=request.context
    )
    
    return ChatResponse(**result)


@router.get("/history/{session_id}")
async def get_history(session_id: str) -> Dict[str, Any]:
    """Recupera la cronologia di una sessione chat."""
    from app.services.ai_assistant import ai_assistant
    
    history = ai_assistant.get_session_history(session_id)
    
    return {
        "session_id": session_id,
        "messages": history,
        "total": len(history)
    }


@router.delete("/history/{session_id}")
async def clear_history(session_id: str) -> Dict[str, Any]:
    """Cancella la cronologia di una sessione."""
    from app.services.ai_assistant import ai_assistant
    
    success = ai_assistant.clear_session(session_id)
    
    return {
        "success": success,
        "message": "Cronologia cancellata" if success else "Sessione non trovata"
    }


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Verifica lo stato dell'assistente AI."""
    import os
    
    has_key = bool(os.environ.get("EMERGENT_LLM_KEY"))
    
    return {
        "enabled": has_key,
        "model": "gemini-3-flash-preview",
        "provider": "gemini",
        "status": "online" if has_key else "offline - API key mancante"
    }


@router.get("/suggestions")
async def get_suggestions() -> Dict[str, Any]:
    """Restituisce suggerimenti di domande frequenti."""
    
    return {
        "suggestions": [
            {
                "category": "Contabilità",
                "questions": [
                    "Come funziona la Prima Nota?",
                    "Qual è la differenza tra Prima Nota Cassa e Banca?",
                    "Come registro un pagamento con assegno?"
                ]
            },
            {
                "category": "Importazioni",
                "questions": [
                    "Come importo un estratto conto PDF?",
                    "Come carico le fatture XML?",
                    "Come importo i corrispettivi?"
                ]
            },
            {
                "category": "Riconciliazione",
                "questions": [
                    "Come riconcilio i movimenti bancari?",
                    "Come abbino una fattura a un pagamento?",
                    "Cosa significa 'Da Riconciliare'?"
                ]
            },
            {
                "category": "F24 e Tributi",
                "questions": [
                    "Come registro un F24 pagato?",
                    "Quali codici tributo devo usare?",
                    "Come importo le quietanze F24?"
                ]
            },
            {
                "category": "Operazioni",
                "questions": [
                    "Come aggiungo un nuovo fornitore?",
                    "Come gestisco le buste paga?",
                    "Come esporto i dati in Excel?"
                ]
            }
        ]
    }
