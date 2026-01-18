"""
AI Assistant Service per Contabilità
Assistente AI conversazionale integrato con Gemini per:
- Rispondere a domande sulla contabilità
- Guidare gli utenti nelle operazioni
- Eseguire azioni automatiche

Utilizza emergentintegrations con Gemini
"""
import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# System prompt per l'assistente contabile
SYSTEM_PROMPT = """Sei un assistente AI esperto di contabilità italiana, integrato nel sistema gestionale "Contabit".

Il tuo ruolo è:
1. **Rispondere a domande** sulla contabilità, fatturazione, Prima Nota, F24, IVA, etc.
2. **Guidare gli utenti** nelle operazioni del sistema (importazioni, riconciliazioni, etc.)
3. **Suggerire azioni** quando appropriato

CONTESTO DEL SISTEMA:
- Prima Nota: Registro di Cassa e Banca separati
- Fatture: Elettroniche XML (ciclo attivo e passivo)
- F24: Modelli per pagamento tributi
- Riconciliazione: Abbinamento movimenti bancari con fatture
- Corrispettivi: Scontrini giornalieri
- Cedolini: Buste paga dipendenti

REGOLE:
- Rispondi SEMPRE in italiano
- Sii conciso ma esaustivo
- Se non sai qualcosa, ammettilo
- Per operazioni complesse, guida passo-passo
- Usa terminologia contabile italiana corretta

FUNZIONALITÀ DISPONIBILI:
- /import-unificato → Importazione documenti (PDF, Excel, XML)
- /riconciliazione/banca → Riconciliazione bancaria
- /prima-nota → Visualizza Prima Nota
- /fatture → Gestione fatture
- /f24 → Modelli F24
- /fornitori → Anagrafica fornitori

Se l'utente chiede di eseguire un'azione, suggerisci la pagina corretta da visitare."""


class AIAssistantService:
    """Servizio per l'assistente AI conversazionale."""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not self.api_key:
            logger.warning("EMERGENT_LLM_KEY non trovata, assistente AI disabilitato")
        
        self.sessions: Dict[str, List[Dict]] = {}  # In-memory sessions (per demo)
    
    async def chat(
        self, 
        message: str, 
        session_id: str = None,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Invia un messaggio all'assistente e ottieni una risposta.
        
        Args:
            message: Messaggio dell'utente
            session_id: ID sessione per mantenere la cronologia
            context: Contesto aggiuntivo (pagina corrente, dati, etc.)
            
        Returns:
            Dizionario con risposta e metadata
        """
        if not self.api_key:
            return {
                "success": False,
                "response": "Assistente AI non configurato. Contatta l'amministratore.",
                "session_id": session_id
            }
        
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            # Genera session_id se non fornito
            if not session_id:
                session_id = str(uuid.uuid4())[:12]
            
            # Prepara il messaggio con contesto
            full_message = message
            if context:
                context_info = []
                if context.get("current_page"):
                    context_info.append(f"Pagina corrente: {context['current_page']}")
                if context.get("selected_data"):
                    context_info.append(f"Dati selezionati: {context['selected_data']}")
                
                if context_info:
                    full_message = f"[CONTESTO: {', '.join(context_info)}]\n\n{message}"
            
            # Inizializza chat con Gemini
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=SYSTEM_PROMPT
            )
            chat.with_model("gemini", "gemini-3-flash-preview")
            
            # Carica cronologia sessione se esiste
            if session_id in self.sessions:
                for msg in self.sessions[session_id][-10:]:  # Ultimi 10 messaggi
                    if msg["role"] == "user":
                        chat.messages.append({"role": "user", "content": msg["content"]})
                    else:
                        chat.messages.append({"role": "assistant", "content": msg["content"]})
            
            # Invia messaggio
            user_msg = UserMessage(text=full_message)
            response = await chat.send_message(user_msg)
            
            # Salva nella cronologia
            if session_id not in self.sessions:
                self.sessions[session_id] = []
            
            self.sessions[session_id].append({
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            self.sessions[session_id].append({
                "role": "assistant",
                "content": response,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Limita cronologia a 50 messaggi
            if len(self.sessions[session_id]) > 50:
                self.sessions[session_id] = self.sessions[session_id][-50:]
            
            # Rileva suggerimenti di navigazione
            suggested_page = self._extract_suggested_page(response)
            
            return {
                "success": True,
                "response": response,
                "session_id": session_id,
                "suggested_page": suggested_page,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.exception(f"Errore chat AI: {e}")
            return {
                "success": False,
                "response": f"Errore durante l'elaborazione: {str(e)}",
                "session_id": session_id
            }
    
    def _extract_suggested_page(self, response: str) -> Optional[str]:
        """Estrae un eventuale suggerimento di navigazione dalla risposta."""
        page_mappings = {
            "/import-unificato": ["import", "importa", "carica"],
            "/riconciliazione/banca": ["riconcilia", "riconciliazione", "abbina"],
            "/prima-nota": ["prima nota", "primanota", "registro"],
            "/fatture": ["fattur", "invoice"],
            "/f24": ["f24", "tribut", "pagament"],
            "/fornitori": ["fornitor", "supplier"],
            "/corrispettivi": ["corrispettiv", "scontrin"],
            "/cedolini": ["cedolin", "busta paga", "stipend"]
        }
        
        response_lower = response.lower()
        for page, keywords in page_mappings.items():
            if any(kw in response_lower for kw in keywords):
                if page in response or f"vai a {page}" in response_lower or f"visita {page}" in response_lower:
                    return page
        
        return None
    
    def get_session_history(self, session_id: str) -> List[Dict]:
        """Recupera la cronologia di una sessione."""
        return self.sessions.get(session_id, [])
    
    def clear_session(self, session_id: str) -> bool:
        """Cancella la cronologia di una sessione."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False


# Singleton
ai_assistant = AIAssistantService()
