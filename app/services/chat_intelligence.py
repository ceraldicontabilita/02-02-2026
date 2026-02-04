"""
Chat Intelligente Aziendale
Sistema di interrogazione dati tramite linguaggio naturale.
Usa AI per interpretare domande e restituire risposte basate sui dati reali del gestionale.

Supporta domande su:
- Fatture (XML e PDF)
- F24 e tributi
- Cedolini e dipendenti
- Estratti conto bancari
- Bilancio e dati contabili
- Fornitori e clienti
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

logger = logging.getLogger(__name__)


async def query_database_for_context(db, query_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Esegue query sul database per ottenere contesto per la risposta AI.
    
    Args:
        db: Database connection
        query_type: Tipo di query (fatture, f24, cedolini, fornitori, bilancio, etc.)
        params: Parametri per la query (anno, mese, fornitore, etc.)
    """
    result = {"data": [], "summary": {}}
    
    try:
        if query_type == "fatture":
            # Query fatture
            query = {}
            if params.get("anno"):
                query["invoice_date"] = {"$regex": f"^{params['anno']}"}
            if params.get("fornitore"):
                query["supplier_name"] = {"$regex": params["fornitore"], "$options": "i"}
            if params.get("mese"):
                mese = str(params["mese"]).zfill(2)
                anno = params.get("anno", datetime.now().year)
                query["invoice_date"] = {"$regex": f"^{anno}-{mese}"}
            
            fatture = await db["invoices"].find(query, {"_id": 0, "xml_content": 0, "pdf_data": 0}).limit(100).to_list(100)
            
            totale = sum(f.get("total_amount", 0) or 0 for f in fatture)
            result["data"] = fatture
            result["summary"] = {
                "count": len(fatture),
                "totale_importo": round(totale, 2),
                "media_importo": round(totale / len(fatture), 2) if fatture else 0
            }
            
        elif query_type == "f24":
            # Query F24
            query = {}
            if params.get("anno"):
                query["data_pagamento"] = {"$regex": f"^{params['anno']}"}
            
            f24_docs = await db["f24_unificato"].find(query, {"_id": 0, "pdf_data": 0}).limit(100).to_list(100)
            
            totale = sum(f.get("totale_versato", 0) or 0 for f in f24_docs)
            result["data"] = f24_docs
            result["summary"] = {
                "count": len(f24_docs),
                "totale_versato": round(totale, 2)
            }
            
        elif query_type == "cedolini":
            # Query cedolini
            query = {}
            if params.get("anno"):
                query["periodo.anno"] = params["anno"]
            if params.get("mese"):
                query["periodo.mese"] = params["mese"]
            if params.get("dipendente"):
                query["dipendente_nome"] = {"$regex": params["dipendente"], "$options": "i"}
            
            cedolini = await db["cedolini"].find(query, {"_id": 0, "pdf_data": 0}).limit(100).to_list(100)
            
            totale_netto = sum(c.get("netto_pagato", 0) or 0 for c in cedolini)
            totale_lordo = sum(c.get("lordo_totale", 0) or 0 for c in cedolini)
            result["data"] = cedolini
            result["summary"] = {
                "count": len(cedolini),
                "totale_netto": round(totale_netto, 2),
                "totale_lordo": round(totale_lordo, 2)
            }
            
        elif query_type == "dipendenti":
            # Query dipendenti
            query = {}
            if params.get("nome"):
                query["$or"] = [
                    {"nome": {"$regex": params["nome"], "$options": "i"}},
                    {"cognome": {"$regex": params["nome"], "$options": "i"}}
                ]
            if params.get("in_carico") is not None:
                query["in_carico"] = params["in_carico"]
            
            dipendenti = await db["employees"].find(query, {"_id": 0}).limit(50).to_list(50)
            result["data"] = dipendenti
            result["summary"] = {
                "count": len(dipendenti),
                "in_carico": len([d for d in dipendenti if d.get("in_carico", True)])
            }
            
        elif query_type == "fornitori":
            # Query fornitori
            query = {}
            if params.get("nome"):
                query["$or"] = [
                    {"ragione_sociale": {"$regex": params["nome"], "$options": "i"}},
                    {"denominazione": {"$regex": params["nome"], "$options": "i"}}
                ]
            
            fornitori = await db["fornitori"].find(query, {"_id": 0}).limit(50).to_list(50)
            result["data"] = fornitori
            result["summary"] = {"count": len(fornitori)}
            
        elif query_type == "estratto_conto":
            # Query estratto conto
            query = {}
            if params.get("anno"):
                query["data"] = {"$regex": f"^{params['anno']}"}
            if params.get("mese"):
                mese = str(params["mese"]).zfill(2)
                anno = params.get("anno", datetime.now().year)
                query["data"] = {"$regex": f"^{anno}-{mese}"}
            
            movimenti = await db["estratto_conto_movimenti"].find(query, {"_id": 0}).limit(200).to_list(200)
            
            entrate = sum(m.get("importo", 0) for m in movimenti if (m.get("importo", 0) or 0) > 0)
            uscite = abs(sum(m.get("importo", 0) for m in movimenti if (m.get("importo", 0) or 0) < 0))
            result["data"] = movimenti
            result["summary"] = {
                "count": len(movimenti),
                "entrate": round(entrate, 2),
                "uscite": round(uscite, 2),
                "saldo": round(entrate - uscite, 2)
            }
            
        elif query_type == "bilancio":
            # Calcola dati di bilancio
            anno = params.get("anno", datetime.now().year)
            
            # Fatture ricevute (costi)
            fatture = await db["invoices"].find(
                {"invoice_date": {"$regex": f"^{anno}"}},
                {"_id": 0, "total_amount": 1, "imponibile": 1, "iva": 1}
            ).to_list(10000)
            
            totale_acquisti = sum(f.get("total_amount", 0) or 0 for f in fatture)
            totale_imponibile = sum(f.get("imponibile", 0) or 0 for f in fatture)
            totale_iva = sum(f.get("iva", 0) or 0 for f in fatture)
            
            # Corrispettivi (ricavi)
            corrispettivi = await db["corrispettivi"].find(
                {"data": {"$regex": f"^{anno}"}},
                {"_id": 0, "totale": 1}
            ).to_list(1000)
            totale_ricavi = sum(c.get("totale", 0) or 0 for c in corrispettivi)
            
            # F24 (imposte)
            f24_docs = await db["f24_unificato"].find(
                {"data_pagamento": {"$regex": f"^{anno}"}},
                {"_id": 0, "totale_versato": 1}
            ).to_list(500)
            totale_f24 = sum(f.get("totale_versato", 0) or 0 for f in f24_docs)
            
            # Cedolini (costo personale)
            cedolini = await db["cedolini"].find(
                {"periodo.anno": anno},
                {"_id": 0, "lordo_totale": 1, "netto_pagato": 1}
            ).to_list(1000)
            totale_stipendi_lordi = sum(c.get("lordo_totale", 0) or 0 for c in cedolini)
            totale_stipendi_netti = sum(c.get("netto_pagato", 0) or 0 for c in cedolini)
            
            result["data"] = {
                "anno": anno,
                "acquisti": {
                    "totale": round(totale_acquisti, 2),
                    "imponibile": round(totale_imponibile, 2),
                    "iva": round(totale_iva, 2),
                    "num_fatture": len(fatture)
                },
                "ricavi": {
                    "corrispettivi": round(totale_ricavi, 2),
                    "num_corrispettivi": len(corrispettivi)
                },
                "imposte": {
                    "f24_versati": round(totale_f24, 2),
                    "num_f24": len(f24_docs)
                },
                "personale": {
                    "lordo": round(totale_stipendi_lordi, 2),
                    "netto": round(totale_stipendi_netti, 2),
                    "num_cedolini": len(cedolini)
                }
            }
            result["summary"] = {
                "ricavi_totali": round(totale_ricavi, 2),
                "costi_totali": round(totale_acquisti + totale_stipendi_lordi, 2),
                "margine_lordo": round(totale_ricavi - totale_acquisti - totale_stipendi_lordi, 2)
            }
            
        elif query_type == "statistiche_generali":
            # Statistiche generali del sistema
            stats = {
                "fatture": await db["invoices"].count_documents({}),
                "fornitori": await db["fornitori"].count_documents({}),
                "dipendenti": await db["employees"].count_documents({}),
                "cedolini": await db["cedolini"].count_documents({}),
                "f24": await db["f24_unificato"].count_documents({}),
                "movimenti_banca": await db["estratto_conto_movimenti"].count_documents({})
            }
            result["data"] = stats
            result["summary"] = stats
            
    except Exception as e:
        logger.error(f"Errore query_database_for_context: {e}")
        result["error"] = str(e)
    
    return result


async def interpret_question(question: str) -> Dict[str, Any]:
    """
    Interpreta la domanda dell'utente e determina il tipo di query da eseguire.
    Usa pattern matching e keywords per identificare l'intento.
    """
    question_lower = question.lower()
    
    # Keywords per tipo di query
    patterns = {
        "fatture": ["fattur", "acquist", "fornitor", "spesa", "spese", "costo", "costi"],
        "f24": ["f24", "tribut", "tasse", "impost", "irpef", "iva versata", "inps"],
        "cedolini": ["cedolin", "busta paga", "stipendi", "salari", "retribuzion"],
        "dipendenti": ["dipendent", "personale", "lavorator", "impiegat", "ferie", "permess"],
        "fornitori": ["fornitor", "vendor", "supplier"],
        "estratto_conto": ["banca", "conto corrente", "moviment", "bonifici", "estratto"],
        "bilancio": ["bilancio", "utile", "perdita", "margine", "ricavi", "fatturato", "totale anno"],
        "statistiche_generali": ["quanti", "statistiche", "riepilogo", "panoramica", "situazione"]
    }
    
    # Trova il tipo di query più probabile
    query_type = "statistiche_generali"  # Default
    max_matches = 0
    
    for qtype, keywords in patterns.items():
        matches = sum(1 for kw in keywords if kw in question_lower)
        if matches > max_matches:
            max_matches = matches
            query_type = qtype
    
    # Estrai parametri dalla domanda
    params = {}
    
    # Estrai anno
    import re
    year_match = re.search(r'\b(202[0-9])\b', question)
    if year_match:
        params["anno"] = int(year_match.group(1))
    
    # Estrai mese
    mesi = {
        "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4,
        "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8,
        "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12
    }
    for mese_nome, mese_num in mesi.items():
        if mese_nome in question_lower:
            params["mese"] = mese_num
            break
    
    # Estrai nome fornitore/dipendente
    # (Pattern semplice - può essere migliorato)
    if "di " in question_lower:
        parts = question_lower.split("di ")
        if len(parts) > 1:
            potential_name = parts[1].split()[0] if parts[1].split() else ""
            if len(potential_name) > 2 and potential_name not in ["tutti", "tutte", "questo", "questa"]:
                if query_type == "dipendenti":
                    params["nome"] = potential_name.title()
                elif query_type in ["fatture", "fornitori"]:
                    params["fornitore"] = potential_name.title()
    
    return {
        "query_type": query_type,
        "params": params,
        "original_question": question
    }


async def generate_response_with_ai(question: str, context: Dict[str, Any]) -> str:
    """
    Genera una risposta in linguaggio naturale usando AI basandosi sul contesto dei dati.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        # Fallback: genera risposta semplice senza AI
        return generate_simple_response(question, context)
    
    try:
        # Prepara il contesto per l'AI
        context_text = json.dumps(context, ensure_ascii=False, indent=2, default=str)
        
        prompt = f"""Sei un assistente contabile italiano esperto. Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sui dati forniti.

DOMANDA: {question}

DATI DAL GESTIONALE:
{context_text}

ISTRUZIONI:
- Rispondi in italiano in modo chiaro e professionale
- Usa i numeri esatti dai dati forniti
- Formatta gli importi in euro (€)
- Se non ci sono dati sufficienti, dillo chiaramente
- Mantieni la risposta concisa ma completa
- NON inventare dati non presenti nel contesto
"""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"chat_{datetime.now().timestamp()}",
            system_message="Sei un assistente contabile esperto che risponde in italiano."
        ).with_model("anthropic", "claude-sonnet-4-20250514")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return response if isinstance(response, str) else str(response)
        
    except Exception as e:
        logger.error(f"Errore generate_response_with_ai: {e}")
        return generate_simple_response(question, context)


def generate_simple_response(question: str, context: Dict[str, Any]) -> str:
    """
    Genera una risposta semplice senza AI, basandosi sui dati.
    """
    summary = context.get("summary", {})
    data = context.get("data", [])
    query_type = context.get("query_type", "")
    
    if context.get("error"):
        return f"❌ Si è verificato un errore: {context['error']}"
    
    if not data and not summary:
        return "Non ho trovato dati corrispondenti alla tua richiesta."
    
    # Risposte per tipo
    if query_type == "fatture":
        return f"""📊 **Fatture trovate: {summary.get('count', 0)}**

💰 Totale importo: € {summary.get('totale_importo', 0):,.2f}
📈 Media per fattura: € {summary.get('media_importo', 0):,.2f}"""

    elif query_type == "f24":
        return f"""📋 **F24 trovati: {summary.get('count', 0)}**

💰 Totale versato: € {summary.get('totale_versato', 0):,.2f}"""

    elif query_type == "cedolini":
        return f"""📄 **Cedolini trovati: {summary.get('count', 0)}**

💵 Totale netto pagato: € {summary.get('totale_netto', 0):,.2f}
💰 Totale lordo: € {summary.get('totale_lordo', 0):,.2f}"""

    elif query_type == "dipendenti":
        return f"""👥 **Dipendenti: {summary.get('count', 0)}**

✅ In carico: {summary.get('in_carico', 0)}"""

    elif query_type == "bilancio" and isinstance(data, dict):
        return f"""📊 **Bilancio {data.get('anno', '')}**

📈 **Ricavi**
• Corrispettivi: € {data.get('ricavi', {}).get('corrispettivi', 0):,.2f}

📉 **Costi**
• Acquisti: € {data.get('acquisti', {}).get('totale', 0):,.2f}
• Personale lordo: € {data.get('personale', {}).get('lordo', 0):,.2f}

💰 **Imposte**
• F24 versati: € {data.get('imposte', {}).get('f24_versati', 0):,.2f}

📊 **Margine lordo**: € {summary.get('margine_lordo', 0):,.2f}"""

    elif query_type == "estratto_conto":
        return f"""🏦 **Movimenti bancari: {summary.get('count', 0)}**

💚 Entrate: € {summary.get('entrate', 0):,.2f}
🔴 Uscite: € {summary.get('uscite', 0):,.2f}
📊 Saldo: € {summary.get('saldo', 0):,.2f}"""

    elif query_type == "statistiche_generali" and isinstance(data, dict):
        return f"""📊 **Panoramica Sistema**

📄 Fatture: {data.get('fatture', 0)}
🏢 Fornitori: {data.get('fornitori', 0)}
👥 Dipendenti: {data.get('dipendenti', 0)}
📋 Cedolini: {data.get('cedolini', 0)}
📑 F24: {data.get('f24', 0)}
🏦 Movimenti banca: {data.get('movimenti_banca', 0)}"""

    else:
        return f"Ho trovato {len(data) if isinstance(data, list) else 1} risultati."


async def chat_query(db, question: str, use_ai: bool = True) -> Dict[str, Any]:
    """
    Entry point principale per le query chat.
    
    Args:
        db: Database connection
        question: Domanda in linguaggio naturale
        use_ai: Se True, usa AI per generare risposta naturale
        
    Returns:
        Dict con risposta e dati di contesto
    """
    try:
        # 1. Interpreta la domanda
        interpretation = await interpret_question(question)
        
        # 2. Query database per contesto
        context = await query_database_for_context(
            db, 
            interpretation["query_type"],
            interpretation["params"]
        )
        context["query_type"] = interpretation["query_type"]
        
        # 3. Genera risposta
        if use_ai:
            response_text = await generate_response_with_ai(question, context)
        else:
            response_text = generate_simple_response(question, context)
        
        return {
            "success": True,
            "question": question,
            "response": response_text,
            "query_type": interpretation["query_type"],
            "params_detected": interpretation["params"],
            "summary": context.get("summary", {}),
            "data_count": len(context.get("data", [])) if isinstance(context.get("data"), list) else 1
        }
        
    except Exception as e:
        logger.error(f"Errore chat_query: {e}")
        return {
            "success": False,
            "question": question,
            "response": f"Mi dispiace, si è verificato un errore: {str(e)}",
            "error": str(e)
        }
