"""
Servizio Scan Email Verbali con Logica di Priorità

PRINCIPIO: PRIMA COMPLETA, POI AGGIUNGI

1. FASE 1: Cerca documenti per completare verbali SOSPESI
   - Quietanze per verbali "da_pagare"
   - PDF per verbali senza allegato
   
2. FASE 2: Aggiungi nuovi verbali trovati
"""

import imaplib
import email
from email.header import decode_header
import os
import re
import uuid
import base64
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Configurazione IMAP
IMAP_SERVER = os.environ.get("IMAP_SERVER", "imap.gmail.com")


def get_email_credentials():
    """Ottieni credenziali email."""
    from app.config import settings
    email_user = settings.EMAIL_USER or settings.GMAIL_EMAIL or settings.EMAIL_ADDRESS or ""
    email_password = settings.EMAIL_PASSWORD or settings.EMAIL_APP_PASSWORD or settings.GMAIL_APP_PASSWORD or ""
    return email_user, email_password


def decode_mime_header(header: str) -> str:
    """Decodifica header MIME."""
    if not header:
        return ""
    decoded_parts = decode_header(header)
    result = []
    for content, encoding in decoded_parts:
        if isinstance(content, bytes):
            try:
                result.append(content.decode(encoding or 'utf-8', errors='replace'))
            except:
                result.append(content.decode('utf-8', errors='replace'))
        else:
            result.append(content)
    return ' '.join(result)


def extract_numero_verbale(text: str) -> Optional[str]:
    """Estrae numero verbale dal testo."""
    if not text:
        return None
    
    patterns = [
        r'Verbale\s*(?:Nr|N\.?)?\s*[:\s]*([A-Z]\d{8,12})',
        r'N\.\s*Verbale[:\s]*([A-Z]\d{8,12})',
        r'\b([ABCDEFGHIJKLMNOPQRSTUVWXYZ]\d{10,12})\b',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return None


def extract_targa(text: str) -> Optional[str]:
    """Estrae targa dal testo."""
    if not text:
        return None
    
    match = re.search(r'\b([A-Z]{2}\d{3}[A-Z]{2})\b', text, re.IGNORECASE)
    return match.group(1).upper() if match else None


def is_email_quietanza(subject: str, body: str) -> bool:
    """Verifica se email contiene quietanza."""
    keywords = ["quietanza", "pagamento effettuato", "ricevuta", "paypal", "bonifico eseguito", "pagato"]
    text = f"{subject} {body}".lower()
    return any(kw in text for kw in keywords)


def is_email_verbale(subject: str, body: str, filename: str = "") -> bool:
    """Verifica se email contiene verbale."""
    keywords = ["verbale", "multa", "contravvenzione", "notifica", "infrazione", "sanzione"]
    text = f"{subject} {body} {filename}".lower()
    return any(kw in text for kw in keywords)


class VerbaliEmailScanner:
    """
    Scanner email specifico per verbali con logica di priorità.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.connection = None
        self.stats = {
            "fase1_quietanze_trovate": 0,
            "fase1_pdf_trovati": 0,
            "fase2_verbali_nuovi": 0,
            "fase2_quietanze_nuove": 0,
            "emails_processate": 0,
            "errori": []
        }
    
    def connect(self) -> bool:
        """Connette al server IMAP."""
        try:
            email_user, email_password = get_email_credentials()
            if not email_user or not email_password:
                raise Exception("Credenziali email non configurate")
            
            self.connection = imaplib.IMAP4_SSL(IMAP_SERVER)
            self.connection.login(email_user, email_password)
            logger.info(f"✅ Connesso a {IMAP_SERVER} come {email_user}")
            return True
        except Exception as e:
            logger.error(f"❌ Errore connessione IMAP: {e}")
            self.stats["errori"].append(f"Connessione: {str(e)}")
            return False
    
    def disconnect(self):
        """Disconnette dal server IMAP."""
        if self.connection:
            try:
                self.connection.logout()
            except:
                pass
            self.connection = None
    
    async def get_verbali_pendenti(self) -> Dict[str, List[str]]:
        """
        Carica lista verbali che necessitano di completamento.
        
        Returns:
            Dict con liste di numeri verbale per tipo di dato mancante
        """
        pendenti = {
            "senza_quietanza": [],
            "senza_pdf": []
        }
        
        # Verbali senza quietanza (da pagare)
        cursor = self.db["verbali_noleggio"].find(
            {
                "stato": {"$in": ["da_pagare", "DA_PAGARE", "identificato", "fattura_ricevuta"]},
                "$or": [
                    {"quietanza_ricevuta": {"$exists": False}},
                    {"quietanza_ricevuta": False}
                ]
            },
            {"numero_verbale": 1, "_id": 0}
        )
        async for v in cursor:
            if v.get("numero_verbale"):
                pendenti["senza_quietanza"].append(v["numero_verbale"])
        
        # Verbali senza PDF
        cursor = self.db["verbali_noleggio"].find(
            {
                "$or": [
                    {"pdf_data": {"$exists": False}},
                    {"pdf_data": None},
                    {"pdf_data": ""}
                ]
            },
            {"numero_verbale": 1, "_id": 0}
        )
        async for v in cursor:
            if v.get("numero_verbale"):
                pendenti["senza_pdf"].append(v["numero_verbale"])
        
        logger.info(f"📋 Verbali pendenti: {len(pendenti['senza_quietanza'])} senza quietanza, {len(pendenti['senza_pdf'])} senza PDF")
        return pendenti
    
    def extract_pdfs_from_email(self, msg) -> List[Tuple[str, bytes]]:
        """Estrae tutti i PDF da un'email."""
        pdfs = []
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                if content_type == "application/pdf" or ".pdf" in content_disposition.lower():
                    filename = part.get_filename()
                    if filename:
                        filename = decode_mime_header(filename)
                    else:
                        filename = f"allegato_{uuid.uuid4().hex[:8]}.pdf"
                    
                    try:
                        content = part.get_payload(decode=True)
                        if content and len(content) > 100:  # Minimo 100 bytes
                            pdfs.append((filename, content))
                    except:
                        pass
        
        return pdfs
    
    async def cerca_quietanza_per_verbale(self, numero_verbale: str, folder: str = "INBOX") -> bool:
        """
        Cerca specificamente una quietanza per un verbale.
        
        Returns:
            True se trovata e registrata, False altrimenti
        """
        if not self.connection:
            return False
        
        try:
            self.connection.select(folder)
            
            # Cerca email con numero verbale
            search_criteria = f'(TEXT "{numero_verbale}")'
            status, messages = self.connection.search(None, search_criteria)
            
            if status != "OK":
                return False
            
            email_ids = messages[0].split()
            
            for email_id in email_ids:
                status, msg_data = self.connection.fetch(email_id, "(RFC822)")
                if status != "OK":
                    continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                subject = decode_mime_header(msg.get("Subject", ""))
                body = ""
                
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            try:
                                body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                                break
                            except:
                                pass
                
                # Verifica se è una quietanza
                if is_email_quietanza(subject, body):
                    # Registra quietanza
                    await self.registra_quietanza(numero_verbale, {
                        "email_subject": subject,
                        "email_date": msg.get("Date", ""),
                        "metodo": self._detect_payment_method(subject, body)
                    })
                    self.stats["fase1_quietanze_trovate"] += 1
                    return True
            
            return False
        except Exception as e:
            logger.warning(f"Errore ricerca quietanza {numero_verbale}: {e}")
            return False
    
    async def cerca_pdf_per_verbale(self, numero_verbale: str, folder: str = "INBOX") -> bool:
        """
        Cerca il PDF di un verbale specifico nelle email.
        """
        if not self.connection:
            return False
        
        try:
            self.connection.select(folder)
            
            search_criteria = f'(TEXT "{numero_verbale}")'
            status, messages = self.connection.search(None, search_criteria)
            
            if status != "OK":
                return False
            
            email_ids = messages[0].split()
            
            for email_id in email_ids:
                status, msg_data = self.connection.fetch(email_id, "(RFC822)")
                if status != "OK":
                    continue
                
                msg = email.message_from_bytes(msg_data[0][1])
                pdfs = self.extract_pdfs_from_email(msg)
                
                for filename, content in pdfs:
                    # Verifica se è il PDF del verbale
                    if "verbale" in filename.lower() or numero_verbale.lower() in filename.lower():
                        # Salva PDF nel verbale
                        pdf_base64 = base64.b64encode(content).decode('utf-8')
                        await self.db["verbali_noleggio"].update_one(
                            {"numero_verbale": numero_verbale},
                            {"$set": {
                                "pdf_data": pdf_base64,
                                "pdf_filename": filename,
                                "updated_at": datetime.now(timezone.utc)
                            }}
                        )
                        self.stats["fase1_pdf_trovati"] += 1
                        logger.info(f"📄 PDF trovato per verbale {numero_verbale}")
                        return True
            
            return False
        except Exception as e:
            logger.warning(f"Errore ricerca PDF {numero_verbale}: {e}")
            return False
    
    async def registra_quietanza(self, numero_verbale: str, quietanza_info: Dict):
        """Registra una quietanza trovata."""
        update_data = {
            "quietanza_ricevuta": True,
            "data_quietanza": datetime.now(timezone.utc).isoformat(),
            "quietanza_email_subject": quietanza_info.get("email_subject"),
            "metodo_pagamento": quietanza_info.get("metodo"),
            "stato_pagamento": "pagato",
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Verifica se ha fattura per determinare stato finale
        verbale = await self.db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
        if verbale and verbale.get("fattura_id"):
            update_data["stato"] = "riconciliato"
            update_data["riconciliato"] = True
        else:
            update_data["stato"] = "pagato"
        
        await self.db["verbali_noleggio"].update_one(
            {"numero_verbale": numero_verbale},
            {"$set": update_data}
        )
        logger.info(f"✅ Quietanza registrata per {numero_verbale}")
    
    def _detect_payment_method(self, subject: str, body: str) -> str:
        """Rileva il metodo di pagamento dal testo."""
        text = f"{subject} {body}".lower()
        if "paypal" in text:
            return "PayPal"
        if "bonifico" in text:
            return "Bonifico"
        if "carta" in text or "credit" in text:
            return "Carta"
        if "contanti" in text or "cash" in text:
            return "Contanti"
        return "Altro"
    
    async def scan_nuovi_verbali(self, folders: List[str] = None, days_back: int = 30) -> List[Dict]:
        """
        Cerca nuovi verbali nelle email recenti scansionando TUTTE le cartelle.
        """
        if folders is None:
            folders = ["INBOX", "Sent", "Drafts", "Spam", "Trash", "Archive"]
        
        nuovi_verbali = []
        
        if not self.connection:
            return nuovi_verbali
        
        # Scansiona tutte le cartelle disponibili
        for folder in folders:
            try:
                # Prova a selezionare la cartella
                status, _ = self.connection.select(folder)
                if status != "OK":
                    logger.debug(f"📁 Cartella {folder} non disponibile, skip")
                    continue
                
                logger.info(f"📁 Scansionando cartella: {folder}")
                
                since_date = (datetime.now() - timedelta(days=days_back)).strftime("%d-%b-%Y")
                search_criteria = f'(SINCE "{since_date}" TEXT "verbale")'
                status, messages = self.connection.search(None, search_criteria)
                
                if status != "OK":
                    continue
                
                email_ids = messages[0].split()
                logger.info(f"📧 Trovate {len(email_ids)} email con 'verbale' in {folder} negli ultimi {days_back} giorni")
                
                for email_id in email_ids[-50:]:  # Max 50 email per cartella
                    try:
                        status, msg_data = self.connection.fetch(email_id, "(RFC822)")
                        if status != "OK":
                            continue
                        
                        msg = email.message_from_bytes(msg_data[0][1])
                        subject = decode_mime_header(msg.get("Subject", ""))
                        from_addr = decode_mime_header(msg.get("From", ""))
                        date_str = msg.get("Date", "")
                        
                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                if part.get_content_type() == "text/plain":
                                    try:
                                        body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                                        break
                                    except:
                                        pass
                        
                        # Estrai numero verbale
                        full_text = f"{subject} {body}"
                        numero_verbale = extract_numero_verbale(full_text)
                        
                        if not numero_verbale:
                            continue
                        
                        # Verifica se esiste già
                        existing = await self.db["verbali_noleggio"].find_one({"numero_verbale": numero_verbale})
                        if existing:
                            continue
                        
                        # Estrai targa
                        targa = extract_targa(full_text)
                        
                        # Estrai PDF
                        pdfs = self.extract_pdfs_from_email(msg)
                        pdf_data = None
                        pdf_filename = None
                        for filename, content in pdfs:
                            if "verbale" in filename.lower():
                                pdf_data = base64.b64encode(content).decode('utf-8')
                                pdf_filename = filename
                                break
                        
                        # Crea nuovo verbale
                        nuovo_verbale = {
                            "id": str(uuid.uuid4()),
                            "numero_verbale": numero_verbale,
                            "targa": targa,
                            "email_subject": subject,
                            "email_from": from_addr,
                            "email_date": date_str,
                            "pdf_data": pdf_data,
                            "pdf_filename": pdf_filename,
                            "stato": "da_pagare" if pdf_data else "da_scaricare",
                            "source": f"email_scan_{folder}",
                            "created_at": datetime.now(timezone.utc)
                        }
                        
                        # Trova driver se abbiamo la targa
                        if targa:
                            veicolo = await self.db["veicoli_noleggio"].find_one({"targa": targa.upper()})
                            if veicolo:
                                nuovo_verbale["veicolo_id"] = veicolo.get("id")
                                nuovo_verbale["driver"] = veicolo.get("driver")
                                nuovo_verbale["driver_nome"] = veicolo.get("driver")
                                nuovo_verbale["driver_id"] = veicolo.get("driver_id")
                                nuovo_verbale["stato"] = "identificato"
                        
                        # Salva nel database
                        await self.db["verbali_noleggio"].insert_one(nuovo_verbale.copy())
                        nuovi_verbali.append(nuovo_verbale)
                        self.stats["fase2_verbali_nuovi"] += 1
                        logger.info(f"🆕 Nuovo verbale trovato in {folder}: {numero_verbale}")
                        
                    except Exception as e:
                        logger.warning(f"Errore processamento email in {folder}: {e}")
                        continue
                
            except Exception as e:
                logger.error(f"Errore scansione cartella {folder}: {e}")
                self.stats["errori"].append(f"Cartella {folder}: {str(e)}")
                continue
        
        logger.info(f"✅ Scan completato su {len(folders) if folders else 0} cartelle, trovati {len(nuovi_verbali)} nuovi verbali")
        return nuovi_verbali
    
    async def scan_completo_priorita(self, folder: str = "INBOX", days_back: int = 365) -> Dict[str, Any]:
        """
        Esegue scan completo con logica di priorità:
        1. PRIMA completa verbali sospesi
        2. POI aggiungi nuovi verbali
        
        Args:
            folder: Cartella email da scansionare
            days_back: Quanti giorni indietro cercare
        
        Returns:
            Dict con risultati dello scan
        """
        risultato = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "fase1": {
                "quietanze_cercate": 0,
                "quietanze_trovate": 0,
                "pdf_cercati": 0,
                "pdf_trovati": 0
            },
            "fase2": {
                "verbali_nuovi": 0
            },
            "errori": []
        }
        
        # Connetti
        if not self.connect():
            risultato["errori"].append("Impossibile connettersi al server email")
            return risultato
        
        try:
            # ===== FASE 1: COMPLETA SOSPESI =====
            logger.info("🔍 FASE 1: Cercando documenti per completare verbali sospesi...")
            
            pendenti = await self.get_verbali_pendenti()
            
            # 1a. Cerca quietanze
            for numero in pendenti["senza_quietanza"][:30]:  # Max 30 per scan
                risultato["fase1"]["quietanze_cercate"] += 1
                if await self.cerca_quietanza_per_verbale(numero, folder):
                    risultato["fase1"]["quietanze_trovate"] += 1
            
            # 1b. Cerca PDF
            for numero in pendenti["senza_pdf"][:30]:
                risultato["fase1"]["pdf_cercati"] += 1
                if await self.cerca_pdf_per_verbale(numero, folder):
                    risultato["fase1"]["pdf_trovati"] += 1
            
            # ===== FASE 2: AGGIUNGI NUOVI =====
            logger.info("🔍 FASE 2: Cercando nuovi verbali...")
            
            nuovi = await self.scan_nuovi_verbali(folder, days_back)
            risultato["fase2"]["verbali_nuovi"] = len(nuovi)
            
            risultato["success"] = True
            risultato["stats"] = self.stats
            
            logger.info(f"✅ Scan completato: {risultato}")
            return risultato
            
        except Exception as e:
            logger.error(f"Errore scan: {e}")
            risultato["errori"].append(str(e))
            return risultato
        finally:
            self.disconnect()


async def esegui_scan_verbali_email(db: AsyncIOMotorDatabase, days_back: int = 365) -> Dict[str, Any]:
    """
    Funzione helper per eseguire lo scan email verbali.
    
    Chiamata dagli endpoint API o da job schedulati.
    """
    scanner = VerbaliEmailScanner(db)
    return await scanner.scan_completo_priorita(days_back=days_back)
