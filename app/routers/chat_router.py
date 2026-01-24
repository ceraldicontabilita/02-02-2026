"""
Router Chat Intelligente
Endpoint per interrogare il gestionale in linguaggio naturale.
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import logging

from app.database import Database
from app.services.chat_intelligence import chat_query, query_database_for_context

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ask")
async def ask_question(
    data: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Fai una domanda in linguaggio naturale sul gestionale.
    
    Body:
        question: La domanda (es. "Quante fatture ho ricevuto nel 2025?")
        use_ai: Se True, usa AI per risposta naturale (default: True)
        
    Esempi di domande supportate:
    - "Quante fatture ho ricevuto nel 2025?"
    - "Qual è il totale degli F24 versati?"
    - "Dammi il bilancio del 2025"
    - "Quanti dipendenti ho in carico?"
    - "Quali sono le fatture di gennaio 2025?"
    - "Quanto ho speso in stipendi?"
    """
    question = data.get("question", "")
    use_ai = data.get("use_ai", True)
    
    if not question or len(question.strip()) < 3:
        raise HTTPException(status_code=400, detail="Domanda troppo corta o mancante")
    
    db = Database.get_db()
    
    result = await chat_query(db, question.strip(), use_ai=use_ai)
    
    # Aggiungi timestamp
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    return result


@router.get("/ask")
async def ask_question_get(
    q: str = Query(..., description="La domanda in linguaggio naturale"),
    use_ai: bool = Query(default=True, description="Usa AI per risposta naturale")
) -> Dict[str, Any]:
    """
    Versione GET dell'endpoint ask.
    Usa il parametro q per la domanda.
    """
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="Domanda troppo corta")
    
    db = Database.get_db()
    
    result = await chat_query(db, q.strip(), use_ai=use_ai)
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    return result


@router.get("/query/{query_type}")
async def direct_query(
    query_type: str,
    anno: Optional[int] = Query(default=None),
    mese: Optional[int] = Query(default=None),
    fornitore: Optional[str] = Query(default=None),
    dipendente: Optional[str] = Query(default=None),
    nome: Optional[str] = Query(default=None)
) -> Dict[str, Any]:
    """
    Query diretta senza interpretazione AI.
    
    query_type: fatture, f24, cedolini, dipendenti, fornitori, estratto_conto, bilancio, statistiche_generali
    """
    valid_types = ["fatture", "f24", "cedolini", "dipendenti", "fornitori", "estratto_conto", "bilancio", "statistiche_generali"]
    
    if query_type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo query non valido. Valori ammessi: {', '.join(valid_types)}"
        )
    
    params = {}
    if anno:
        params["anno"] = anno
    if mese:
        params["mese"] = mese
    if fornitore:
        params["fornitore"] = fornitore
    if dipendente:
        params["dipendente"] = dipendente
    if nome:
        params["nome"] = nome
    
    db = Database.get_db()
    
    result = await query_database_for_context(db, query_type, params)
    result["query_type"] = query_type
    result["params"] = params
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    return result


@router.get("/help")
async def get_help() -> Dict[str, Any]:
    """
    Restituisce la guida su come usare la chat intelligente.
    """
    return {
        "descrizione": "Chat Intelligente Aziendale - Interroga il gestionale in linguaggio naturale",
        "endpoint_principale": "POST /api/chat/ask",
        "esempi_domande": [
            "Quante fatture ho ricevuto nel 2025?",
            "Qual è il totale degli F24 versati?",
            "Dammi il bilancio del 2025",
            "Quanti dipendenti ho in carico?",
            "Quali sono le fatture di gennaio 2025?",
            "Quanto ho speso in stipendi?",
            "Mostrami i movimenti bancari di dicembre",
            "Panoramica generale del sistema",
            "Fatture del fornitore METRO",
            "Cedolini di Mario Rossi"
        ],
        "tipi_query_supportati": [
            {"tipo": "fatture", "descrizione": "Fatture ricevute (XML e PDF)"},
            {"tipo": "f24", "descrizione": "F24 e tributi versati"},
            {"tipo": "cedolini", "descrizione": "Buste paga e stipendi"},
            {"tipo": "dipendenti", "descrizione": "Anagrafica dipendenti"},
            {"tipo": "fornitori", "descrizione": "Anagrafica fornitori"},
            {"tipo": "estratto_conto", "descrizione": "Movimenti bancari"},
            {"tipo": "bilancio", "descrizione": "Dati di bilancio aggregati"},
            {"tipo": "statistiche_generali", "descrizione": "Panoramica del sistema"}
        ],
        "parametri_supportati": ["anno", "mese", "fornitore", "dipendente"],
        "note": "Il sistema interpreta automaticamente la domanda e estrae i parametri. Per query dirette usa GET /api/chat/query/{tipo}"
    }


@router.get("/stats")
async def get_chat_stats() -> Dict[str, Any]:
    """
    Statistiche veloci del sistema (senza AI).
    """
    db = Database.get_db()
    
    result = await query_database_for_context(db, "statistiche_generali", {})
    
    return {
        "success": True,
        "stats": result.get("data", {}),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
