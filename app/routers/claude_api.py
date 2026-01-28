"""
API Claude per ERP Contabilità
Assistente AI intelligente per analisi dati contabili, fatture, bilanci
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv

from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

router = APIRouter()

# ============================================================
# MODELLI PYDANTIC
# ============================================================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context_type: Optional[str] = "general"  # general, fatture, bilancio, dipendenti, scadenze

class ChatResponse(BaseModel):
    response: str
    session_id: str
    context_used: Optional[Dict[str, Any]] = None

class AnalyzeRequest(BaseModel):
    document_type: str  # fattura, assegno, cedolino, movimento
    document_data: Dict[str, Any]
    question: Optional[str] = None

class ReportRequest(BaseModel):
    report_type: str  # bilancio, cashflow, anomalie, trend
    periodo: Optional[str] = None  # es: "2025", "gennaio-2025"
    formato: Optional[str] = "narrativo"  # narrativo, bullet_points, executive_summary

class CategorizeRequest(BaseModel):
    descrizione: str
    importo: Optional[float] = None
    fornitore: Optional[str] = None

# ============================================================
# HELPERS - Recupero dati dal database
# ============================================================

from app.database import Database

async def get_context_data(context_type: str, limit: int = 10) -> Dict[str, Any]:
    """Recupera dati contestuali dal database per arricchire le risposte AI"""
    context = {}
    db = Database.get_db()
    if not db:
        return {"error": "Database non disponibile"}
    
    try:
        if context_type in ["general", "bilancio"]:
            # Statistiche generali
            fatture = await db.invoices.count_documents({})
            corrispettivi = await db.corrispettivi.count_documents({})
            dipendenti = await db.employees.count_documents({})
            assegni = await db.assegni.count_documents({})
            
            context["statistiche"] = {
                "fatture_totali": fatture,
                "corrispettivi_totali": corrispettivi,
                "dipendenti": dipendenti,
                "assegni": assegni
            }
            
        if context_type in ["fatture", "general"]:
            # Ultime fatture
            fatture_recenti = await db.invoices.find(
                {}, {"_id": 0, "numero_documento": 1, "fornitore": 1, "totale": 1, "data": 1}
            ).sort("data", -1).limit(5).to_list(5)
            context["ultime_fatture"] = fatture_recenti
            
        if context_type in ["scadenze", "general"]:
            # Scadenze imminenti
            oggi = datetime.now()
            tra_30_giorni = oggi + timedelta(days=30)
            scadenze = await db.calendario_fiscale.find({
                "data_scadenza": {"$gte": oggi.isoformat()[:10], "$lte": tra_30_giorni.isoformat()[:10]}
            }, {"_id": 0}).limit(10).to_list(10)
            context["scadenze_imminenti"] = scadenze
            
        if context_type == "dipendenti":
            # Info dipendenti
            dipendenti = await db.employees.find(
                {}, {"_id": 0, "nome": 1, "cognome": 1, "ruolo": 1}
            ).limit(20).to_list(20)
            context["dipendenti"] = dipendenti
            
    except Exception as e:
        context["error"] = str(e)
        
    return context

def get_system_prompt(context_type: str) -> str:
    """Genera il system prompt in base al contesto"""
    base_prompt = """Sei un assistente contabile AI esperto per un'azienda di ristorazione italiana.
Hai accesso ai dati del gestionale ERP dell'azienda.

REGOLE:
- Rispondi SEMPRE in italiano
- Sii preciso con i numeri e le date
- Usa il formato €X.XXX,XX per gli importi
- Se non hai dati sufficienti, dillo chiaramente
- Per questioni fiscali complesse, suggerisci di consultare il commercialista
"""
    
    context_prompts = {
        "general": """
Puoi aiutare con:
- Analisi fatture e fornitori
- Stato pagamenti e scadenze
- Bilancio e cashflow
- Gestione dipendenti e buste paga
- Corrispettivi e incassi
""",
        "fatture": """
Sei specializzato in:
- Analisi fatture fornitori
- Controllo IVA e detraibilità
- Riconciliazione pagamenti
- Categorizzazione spese
""",
        "bilancio": """
Sei specializzato in:
- Analisi bilancio (attivo, passivo, conto economico)
- Calcolo margini e redditività
- Confronto periodi
- Previsioni cashflow
""",
        "dipendenti": """
Sei specializzato in:
- Gestione buste paga
- Calcolo ferie e permessi
- Costi del personale
- Scadenze contributive
""",
        "scadenze": """
Sei specializzato in:
- Calendario fiscale italiano
- Scadenze IVA, F24, contributi
- Adempimenti periodici
- Promemoria pagamenti
"""
    }
    
    return base_prompt + context_prompts.get(context_type, context_prompts["general"])

# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/chat", response_model=ChatResponse)
async def chat_with_claude(request: ChatRequest):
    """
    Chat con Claude per domande contabili
    
    Esempi:
    - "Qual è il totale fatture di questo mese?"
    - "Ci sono scadenze fiscali imminenti?"
    - "Analizza il margine sui corrispettivi"
    """
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
    
    session_id = request.session_id or f"erp-chat-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    try:
        # Recupera contesto dal database
        context_data = await get_context_data(request.context_type)
        
        # Prepara il messaggio con contesto
        context_info = ""
        if context_data and not context_data.get("error"):
            context_info = f"\n\nDATI AZIENDALI ATTUALI:\n{json.dumps(context_data, indent=2, default=str, ensure_ascii=False)}"
        
        # Inizializza chat Claude
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=get_system_prompt(request.context_type)
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Invia messaggio
        user_message = UserMessage(text=request.message + context_info)
        response = await chat.send_message(user_message)
        
        return ChatResponse(
            response=response,
            session_id=session_id,
            context_used=context_data if context_data else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore Claude: {str(e)}")


@router.post("/analyze")
async def analyze_document(request: AnalyzeRequest):
    """
    Analizza un documento con AI e fornisce insights
    
    document_type: fattura, assegno, cedolino, movimento
    """
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
    
    prompts = {
        "fattura": """Analizza questa fattura e fornisci:
1. Riepilogo (fornitore, importo, data)
2. Categoria di spesa suggerita
3. Detraibilità IVA
4. Eventuali anomalie o problemi""",
        
        "assegno": """Analizza questo assegno e verifica:
1. Coerenza importo con fattura collegata
2. Stato del pagamento
3. Eventuali ritardi o problemi""",
        
        "cedolino": """Analizza questa busta paga e fornisci:
1. Riepilogo competenze/trattenute
2. Verifica calcoli (lordo, netto, contributi)
3. Situazione ferie/permessi
4. Eventuali anomalie""",
        
        "movimento": """Analizza questo movimento bancario e suggerisci:
1. Categoria (incasso, pagamento, bonifico)
2. Possibile associazione con fatture
3. Registrazione in prima nota"""
    }
    
    prompt = prompts.get(request.document_type, "Analizza questo documento e fornisci un riepilogo.")
    
    if request.question:
        prompt += f"\n\nDomanda specifica: {request.question}"
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analyze-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message="Sei un esperto contabile. Analizza i documenti con precisione e fornisci suggerimenti pratici. Rispondi in italiano."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        message_text = f"{prompt}\n\nDOCUMENTO:\n{json.dumps(request.document_data, indent=2, default=str, ensure_ascii=False)}"
        user_message = UserMessage(text=message_text)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "document_type": request.document_type,
            "analysis": response
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore analisi: {str(e)}")


@router.post("/report")
async def generate_report(request: ReportRequest):
    """
    Genera report narrativi AI sui dati contabili
    
    report_type: bilancio, cashflow, anomalie, trend
    """
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
    
    # Recupera dati per il report
    report_data = {}
    
    try:
        if request.report_type == "bilancio":
            # Dati bilancio
            fatture_ricevute = await db.invoices.aggregate([
                {"$group": {"_id": None, "totale": {"$sum": "$totale"}, "count": {"$sum": 1}}}
            ]).to_list(1)
            corrispettivi = await db.corrispettivi.aggregate([
                {"$group": {"_id": None, "totale": {"$sum": "$totale"}, "count": {"$sum": 1}}}
            ]).to_list(1)
            
            report_data = {
                "fatture_passive": fatture_ricevute[0] if fatture_ricevute else {"totale": 0, "count": 0},
                "ricavi_corrispettivi": corrispettivi[0] if corrispettivi else {"totale": 0, "count": 0}
            }
            
        elif request.report_type == "cashflow":
            # Prima nota
            prima_nota = await db.prima_nota_cassa.aggregate([
                {"$group": {
                    "_id": "$tipo",
                    "totale": {"$sum": "$importo"}
                }}
            ]).to_list(10)
            report_data["movimenti"] = prima_nota
            
        elif request.report_type == "anomalie":
            # Cerca anomalie
            assegni_senza_fattura = await db.assegni.count_documents({
                "fatture_collegate": {"$in": [None, []]},
                "stato": {"$in": ["emesso", "compilato"]}
            })
            report_data["anomalie"] = {
                "assegni_senza_fattura": assegni_senza_fattura
            }
            
        prompt_format = {
            "narrativo": "Scrivi un report narrativo discorsivo, come se stessi parlando con il titolare dell'azienda.",
            "bullet_points": "Organizza il report in punti elenco chiari e concisi.",
            "executive_summary": "Scrivi un executive summary di massimo 5 righe con i punti chiave."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"report-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message=f"""Sei un controller aziendale esperto. Genera report chiari e utili per il management.
{prompt_format.get(request.formato, prompt_format['narrativo'])}
Rispondi sempre in italiano. Usa il formato €X.XXX,XX per gli importi."""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        message = f"""Genera un report di tipo '{request.report_type}' per il periodo '{request.periodo or 'corrente'}'.

DATI DISPONIBILI:
{json.dumps(report_data, indent=2, default=str, ensure_ascii=False)}"""
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "report_type": request.report_type,
            "periodo": request.periodo,
            "formato": request.formato,
            "report": response,
            "data_source": report_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore generazione report: {str(e)}")


@router.post("/categorize")
async def categorize_transaction(request: CategorizeRequest):
    """
    Categorizza automaticamente una transazione/spesa
    """
    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configurata")
    
    # Categorie disponibili nel sistema
    categorie = [
        "Materie Prime - Alimentari",
        "Materie Prime - Bevande",
        "Utenze - Elettricità",
        "Utenze - Gas",
        "Utenze - Acqua",
        "Utenze - Telefono/Internet",
        "Personale - Stipendi",
        "Personale - Contributi",
        "Affitto Locali",
        "Manutenzione Ordinaria",
        "Manutenzione Straordinaria",
        "Attrezzature",
        "Marketing/Pubblicità",
        "Consulenze Professionali",
        "Assicurazioni",
        "Imposte e Tasse",
        "Servizi Bancari",
        "Trasporti",
        "Altro"
    ]
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"categorize-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message="""Sei un esperto di categorizzazione spese per un ristorante.
Devi assegnare la categoria più appropriata tra quelle disponibili.
Rispondi SOLO con un JSON valido nel formato: {"categoria": "...", "confidenza": 0.X, "note": "..."}"""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        message = f"""Categorizza questa transazione:

Descrizione: {request.descrizione}
Importo: €{request.importo or 'N/A'}
Fornitore: {request.fornitore or 'N/A'}

CATEGORIE DISPONIBILI:
{json.dumps(categorie, ensure_ascii=False)}

Rispondi con JSON: {{"categoria": "...", "confidenza": 0.X, "note": "..."}}"""
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        # Prova a parsare JSON dalla risposta
        try:
            # Cerca JSON nella risposta
            import re
            json_match = re.search(r'\{[^}]+\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = {"categoria": "Altro", "confidenza": 0.5, "note": response}
        except:
            result = {"categoria": "Altro", "confidenza": 0.5, "note": response}
        
        return {
            "success": True,
            "input": {
                "descrizione": request.descrizione,
                "importo": request.importo,
                "fornitore": request.fornitore
            },
            "categorization": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore categorizzazione: {str(e)}")


@router.get("/status")
async def claude_status():
    """Verifica stato API Claude"""
    api_key = os.getenv("EMERGENT_LLM_KEY")
    
    return {
        "status": "active" if api_key else "not_configured",
        "model": "claude-sonnet-4-5-20250929",
        "provider": "anthropic",
        "features": [
            "chat - Assistente contabile AI",
            "analyze - Analisi documenti",
            "report - Generazione report",
            "categorize - Categorizzazione automatica"
        ]
    }
