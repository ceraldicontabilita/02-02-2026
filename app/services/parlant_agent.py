"""
Parlant AI Agent Service
Integrazione di Parlant SDK nel sistema Contabit.

Crea un agente conversazionale con:
- Guidelines per comportamento contestuale
- Tools per accesso ai dati
- Journeys per guidare l'utente
"""
import os
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

logger = logging.getLogger(__name__)

# Configurazione - usa GEMINI_API_KEY per Parlant
PARLANT_PORT = 8800
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Imposta la chiave nell'ambiente per Parlant
if GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY


class ParlantAgentService:
    """Servizio per gestire l'agente Parlant."""
    
    def __init__(self):
        self.server = None
        self.agent = None
        self.agent_id = None
        self.is_running = False
    
    async def start(self):
        """Avvia il server Parlant e crea l'agente."""
        try:
            import parlant.sdk as p
            
            # Verifica chiave API
            if not GEMINI_API_KEY:
                return {
                    "success": False,
                    "error": "GEMINI_API_KEY non configurata"
                }
            
            logger.info(f"Avvio server Parlant con Gemini...")
            
            # Crea server con Gemini come NLP service
            self.server = p.Server(
                nlp_service=p.NLPServices.gemini,
                port=PARLANT_PORT
            )
            
            await self.server.__aenter__()
            
            # Crea l'agente contabile
            self.agent = await self.server.create_agent(
                name="Assistente Contabit",
                description="""Sei un assistente AI esperto di contabilità italiana.
                
Lavori nel sistema gestionale Contabit e aiuti gli utenti con:
- Registrazioni in Prima Nota (Cassa e Banca)
- Fatturazione elettronica (ciclo attivo e passivo)
- Riconciliazione bancaria
- F24 e tributi
- Gestione cedolini e dipendenti
- Import documenti (PDF, Excel, XML)

Sei professionale, preciso e disponibile. Usi terminologia contabile italiana corretta.
Quando possibile, guidi l'utente verso le pagine corrette del sistema."""
            )
            
            self.agent_id = self.agent.id
            
            # Aggiungi guidelines comportamentali
            await self._create_guidelines()
            
            # Aggiungi tools per accesso ai dati
            await self._create_tools()
            
            self.is_running = True
            logger.info(f"Parlant server avviato su porta {PARLANT_PORT}, Agent ID: {self.agent_id}")
            
            return {
                "success": True,
                "agent_id": self.agent_id,
                "port": PARLANT_PORT
            }
            
        except Exception as e:
            logger.exception(f"Errore avvio Parlant: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def stop(self):
        """Ferma il server Parlant."""
        if self.server:
            try:
                await self.server.__aexit__(None, None, None)
                self.is_running = False
                logger.info("Server Parlant fermato")
            except Exception as e:
                logger.error(f"Errore chiusura Parlant: {e}")
    
    async def _create_guidelines(self):
        """Crea le guidelines comportamentali per l'agente."""
        if not self.agent:
            return
        
        guidelines = [
            # Saluti e introduzione
            {
                "condition": "l'utente saluta o dice ciao",
                "action": "rispondi con un saluto cordiale e chiedi come puoi aiutare con la contabilità"
            },
            # Prima Nota
            {
                "condition": "l'utente chiede della Prima Nota o come registrare un movimento",
                "action": "spiega che la Prima Nota è divisa in Cassa e Banca, e guida alla pagina /prima-nota"
            },
            # Riconciliazione
            {
                "condition": "l'utente chiede della riconciliazione o abbinamento movimenti",
                "action": "spiega il processo di riconciliazione bancaria e guida alla pagina /riconciliazione/banca"
            },
            # Importazione documenti
            {
                "condition": "l'utente vuole importare documenti, fatture XML o estratti conto",
                "action": "guida alla pagina /import-unificato spiegando i formati supportati (PDF, Excel, XML)"
            },
            # F24
            {
                "condition": "l'utente chiede degli F24 o tributi",
                "action": "spiega come gestire gli F24 nel sistema e guida alla pagina /f24"
            },
            # Fatture
            {
                "condition": "l'utente chiede delle fatture ricevute o ciclo passivo",
                "action": "spiega la gestione fatture e guida alla pagina /fatture-ricevute"
            },
            # Fornitori
            {
                "condition": "l'utente chiede dei fornitori o anagrafica",
                "action": "guida alla pagina /fornitori per la gestione anagrafica"
            },
            # Dipendenti e cedolini
            {
                "condition": "l'utente chiede di buste paga, cedolini o stipendi",
                "action": "spiega la gestione cedolini e guida alla pagina /cedolini-riconciliazione"
            },
            # Errori e problemi
            {
                "condition": "l'utente segnala un errore o problema",
                "action": "chiedi dettagli specifici sull'errore e prova a suggerire soluzioni"
            },
            # Domande generiche contabilità
            {
                "condition": "l'utente fa una domanda generica sulla contabilità italiana",
                "action": "rispondi in modo chiaro e conciso, usando terminologia contabile corretta"
            }
        ]
        
        for g in guidelines:
            try:
                await self.agent.create_guideline(
                    condition=g["condition"],
                    action=g["action"]
                )
            except Exception as e:
                logger.warning(f"Errore creazione guideline: {e}")
    
    async def _create_tools(self):
        """Crea i tools per accesso ai dati."""
        if not self.agent:
            return
        
        # Tool per cercare fatture
        @self.agent.tool
        async def cerca_fattura(fornitore: str = "", numero: str = "") -> str:
            """Cerca fatture nel sistema per fornitore o numero."""
            from app.database import Database
            
            try:
                db = Database.get_db()
                query = {}
                if fornitore:
                    query["fornitore"] = {"$regex": fornitore, "$options": "i"}
                if numero:
                    query["numero_fattura"] = {"$regex": numero, "$options": "i"}
                
                fatture = await db["invoices"].find(query, {"_id": 0}).limit(5).to_list(5)
                
                if not fatture:
                    return "Nessuna fattura trovata con questi criteri."
                
                result = f"Trovate {len(fatture)} fatture:\n"
                for f in fatture:
                    result += f"- {f.get('fornitore', 'N/D')}: €{f.get('importo_totale', 0):.2f} del {f.get('data', 'N/D')}\n"
                
                return result
            except Exception as e:
                return f"Errore ricerca: {str(e)}"
        
        # Tool per stato riconciliazione
        @self.agent.tool
        async def stato_riconciliazione() -> str:
            """Mostra lo stato attuale della riconciliazione bancaria."""
            from app.database import Database
            
            try:
                db = Database.get_db()
                
                da_riconciliare = await db["estratto_conto_movimenti"].count_documents(
                    {"riconciliato": {"$ne": True}}
                )
                riconciliati = await db["estratto_conto_movimenti"].count_documents(
                    {"riconciliato": True}
                )
                
                return f"Stato riconciliazione:\n- Da riconciliare: {da_riconciliare}\n- Già riconciliati: {riconciliati}"
            except Exception as e:
                return f"Errore: {str(e)}"
        
        # Tool per statistiche generali
        @self.agent.tool
        async def statistiche_generali() -> str:
            """Mostra statistiche generali del sistema."""
            from app.database import Database
            
            try:
                db = Database.get_db()
                
                stats = {
                    "fatture": await db["invoices"].count_documents({}),
                    "fornitori": await db["fornitori"].count_documents({}),
                    "cedolini": await db["cedolini"].count_documents({}),
                    "f24": await db["f24_models"].count_documents({}),
                    "movimenti_banca": await db["estratto_conto_movimenti"].count_documents({})
                }
                
                result = "📊 Statistiche sistema:\n"
                result += f"- Fatture: {stats['fatture']}\n"
                result += f"- Fornitori: {stats['fornitori']}\n"
                result += f"- Cedolini: {stats['cedolini']}\n"
                result += f"- F24: {stats['f24']}\n"
                result += f"- Movimenti bancari: {stats['movimenti_banca']}"
                
                return result
            except Exception as e:
                return f"Errore: {str(e)}"
    
    def get_status(self) -> Dict[str, Any]:
        """Restituisce lo stato del servizio."""
        return {
            "running": self.is_running,
            "agent_id": self.agent_id,
            "port": PARLANT_PORT if self.is_running else None,
            "url": f"http://localhost:{PARLANT_PORT}" if self.is_running else None
        }


# Singleton
parlant_service = ParlantAgentService()


async def start_parlant_background():
    """Avvia Parlant in background."""
    result = await parlant_service.start()
    if result["success"]:
        logger.info(f"Parlant avviato: {result}")
    else:
        logger.error(f"Errore avvio Parlant: {result}")
    return result
