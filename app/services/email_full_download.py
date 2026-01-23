"""
Servizio Download COMPLETO Email e Allegati
Scarica TUTTI i PDF dalla posta e li salva nel database.
Gestisce deduplicazione e documenti non associati.
"""

import imaplib
import email
from email.header import decode_header
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import logging
import hashlib
import base64
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Configurazione IMAP - Usa variabili d'ambiente
IMAP_SERVER = os.environ.get("IMAP_SERVER", "imap.gmail.com")
EMAIL_USER = os.environ.get("EMAIL_USER", os.environ.get("GMAIL_EMAIL", ""))
EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD", os.environ.get("EMAIL_APP_PASSWORD", ""))

# Mapping categoria -> collezione MongoDB
CATEGORY_COLLECTIONS = {
    "f24": "f24_email_attachments",
    "fattura": "fatture_email_attachments", 
    "busta_paga": "cedolini_email_attachments",
    "estratto_conto": "estratti_email_attachments",
    "quietanza": "quietanze_email_attachments",
    "bonifico": "bonifici_email_attachments",
    "verbale": "verbali_email_attachments",
    "certificato_medico": "certificati_email_attachments",
    "cartella_esattoriale": "cartelle_email_attachments",
    "altro": "documenti_non_associati"  # Documenti da associare manualmente
}

# Pattern per riconoscere il tipo di documento
DOCUMENT_PATTERNS = {
    "f24": [
        r"f[\s\-_]?24", r"modello\s*f24", r"tribut", r"agenzia.*entrate",
        r"inps.*contribut", r"ritenute", r"imu", r"tasi", r"acconto.*irpef"
    ],
    "fattura": [
        r"fattur[ae]", r"invoice", r"n\.\s*\d+.*del", r"ft\s*\d+",
        r"importo.*iva", r"imponibile"
    ],
    "busta_paga": [
        r"busta\s*paga", r"cedolino", r"libro\s*unico", r"lul\s*\d+",
        r"stipendio", r"retribuzione", r"netto.*pagare"
    ],
    "estratto_conto": [
        r"estratto\s*conto", r"moviment[io]", r"saldo.*precedente",
        r"c/c", r"conto\s*corrente", r"iban"
    ],
    "quietanza": [
        r"quietanza", r"ricevuta\s*pagamento", r"attestazione\s*versamento",
        r"pagamento.*effettuato", r"versato"
    ],
    "bonifico": [
        r"bonifico", r"disposizione.*pagamento", r"trasferimento",
        r"cro\s*\d+", r"trn\s*\d+"
    ],
    "verbale": [
        r"verbal[ei]", r"multa", r"sanzione", r"infrazione",
        r"codice.*strada", r"polizia.*municipal"
    ],
    "certificato_medico": [
        r"certificato\s*medico", r"inps.*malattia", r"puc\s*\d+",
        r"prognosi", r"diagnosi"
    ],
    "cartella_esattoriale": [
        r"cartella.*esattorial", r"riscossione", r"equitalia",
        r"ader.*riscossione", r"intimazione"
    ]
}


def decode_mime_header(header_value: str) -> str:
    """Decodifica header MIME."""
    if not header_value:
        return ""
    try:
        decoded_parts = decode_header(header_value)
        result = []
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(encoding or 'utf-8', errors='replace'))
            else:
                result.append(part)
        return ''.join(result)
    except:
        return str(header_value)


def calculate_pdf_hash(content: bytes) -> str:
    """Calcola hash MD5 del contenuto PDF per deduplicazione."""
    return hashlib.md5(content).hexdigest()


def categorize_document(filename: str, subject: str = "", body: str = "") -> str:
    """
    Categorizza un documento in base al nome file, oggetto e contenuto.
    """
    text_to_check = f"{filename} {subject} {body}".lower()
    
    for category, patterns in DOCUMENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_to_check, re.IGNORECASE):
                return category
    
    return "altro"


def extract_period_from_text(text: str) -> Dict[str, Any]:
    """Estrae mese e anno dal testo."""
    result = {"mese": None, "anno": None}
    
    # Pattern mese/anno
    mesi_it = {
        "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4,
        "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8,
        "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12
    }
    
    text_lower = text.lower()
    
    # Pattern 1: "gennaio 2025", "febbraio 2024"
    for mese_nome, mese_num in mesi_it.items():
        pattern = rf'{mese_nome}\s*[/_\-]?\s*(\d{{4}})'
        match = re.search(pattern, text_lower)
        if match:
            result["mese"] = mese_num
            result["anno"] = int(match.group(1))
            return result
    
    # Pattern 2: "01/2025"
    match = re.search(r'(\d{1,2})[/_\-](\d{4})', text)
    if match:
        mese = int(match.group(1))
        anno = int(match.group(2))
        if 1 <= mese <= 12 and 2020 <= anno <= 2030:
            result["mese"] = mese
            result["anno"] = anno
            return result
    
    # Pattern 3: "2025" solo anno
    match = re.search(r'20(2[0-9])', text)
    if match:
        result["anno"] = int(f"20{match.group(1)}")
    
    return result


class EmailFullDownloader:
    """
    Scarica TUTTI gli allegati PDF dalla posta e li salva nel database.
    Supporta deduplicazione e categorizzazione automatica.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.connection = None
        self.stats = {
            "emails_processed": 0,
            "pdfs_downloaded": 0,
            "pdfs_duplicates": 0,
            "pdfs_by_category": {},
            "errors": []
        }
    
    def connect(self) -> bool:
        """Connette al server IMAP."""
        try:
            self.connection = imaplib.IMAP4_SSL(IMAP_SERVER)
            self.connection.login(EMAIL_USER, EMAIL_PASSWORD)
            logger.info(f"Connesso a {IMAP_SERVER} come {EMAIL_USER}")
            return True
        except Exception as e:
            logger.error(f"Errore connessione IMAP: {e}")
            self.stats["errors"].append(f"Connessione: {str(e)}")
            return False
    
    def disconnect(self):
        """Disconnette dal server IMAP."""
        if self.connection:
            try:
                self.connection.logout()
            except:
                pass
            self.connection = None
    
    async def check_duplicate(self, pdf_hash: str) -> bool:
        """Verifica se un PDF con questo hash esiste già."""
        # Controlla in tutte le collezioni di allegati
        for collection_name in CATEGORY_COLLECTIONS.values():
            existing = await self.db[collection_name].find_one({"pdf_hash": pdf_hash})
            if existing:
                return True
        return False
    
    async def save_pdf_to_db(
        self,
        pdf_content: bytes,
        filename: str,
        category: str,
        email_info: Dict[str, Any],
        period_info: Dict[str, Any]
    ) -> Optional[str]:
        """
        Salva un PDF nel database nella collezione appropriata.
        Ritorna l'ID del documento salvato o None se duplicato.
        """
        pdf_hash = calculate_pdf_hash(pdf_content)
        
        # Verifica duplicato
        if await self.check_duplicate(pdf_hash):
            self.stats["pdfs_duplicates"] += 1
            logger.debug(f"PDF duplicato saltato: {filename}")
            return None
        
        # Prepara documento
        doc_id = str(uuid.uuid4())
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
        
        document = {
            "id": doc_id,
            "filename": filename,
            "pdf_data": pdf_base64,
            "pdf_hash": pdf_hash,
            "pdf_size": len(pdf_content),
            "category": category,
            "email_subject": email_info.get("subject", ""),
            "email_from": email_info.get("from", ""),
            "email_date": email_info.get("date", ""),
            "email_uid": email_info.get("uid", ""),
            "mese": period_info.get("mese"),
            "anno": period_info.get("anno"),
            "associato": False,  # Da associare manualmente se in "altro"
            "documento_associato_id": None,
            "documento_associato_collection": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "processed": False
        }
        
        # Determina collezione
        collection_name = CATEGORY_COLLECTIONS.get(category, "documenti_non_associati")
        
        # Salva nel database
        await self.db[collection_name].insert_one(document)
        
        self.stats["pdfs_downloaded"] += 1
        self.stats["pdfs_by_category"][category] = self.stats["pdfs_by_category"].get(category, 0) + 1
        
        logger.info(f"PDF salvato: {filename} -> {collection_name}")
        return doc_id
    
    def extract_pdfs_from_email(self, msg: email.message.Message) -> List[Tuple[str, bytes]]:
        """Estrae tutti i PDF da un'email."""
        pdfs = []
        
        # Estensioni da escludere (firme, certificati, non PDF)
        EXCLUDED_EXTENSIONS = {'.p7s', '.p7m', '.p7c', '.sig', '.asc', '.gpg', '.pgp', '.xml', '.txt'}
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                # Verifica se è un PDF
                filename = part.get_filename()
                if filename:
                    filename = decode_mime_header(filename)
                    
                    # Salta file esclusi
                    ext = os.path.splitext(filename.lower())[1]
                    if ext in EXCLUDED_EXTENSIONS:
                        continue
                
                # Solo PDF veri
                is_pdf = (
                    content_type == "application/pdf" or
                    (filename and filename.lower().endswith(".pdf"))
                )
                
                # Oppure allegati che sembrano documenti
                is_document = (
                    "attachment" in content_disposition.lower() and
                    filename and
                    any(filename.lower().endswith(ext) for ext in ['.pdf', '.png', '.jpg', '.jpeg'])
                )
                
                if is_pdf or is_document:
                    try:
                        content = part.get_payload(decode=True)
                        if content and len(content) > 500:  # File valido (>500 bytes)
                            if not filename:
                                filename = f"allegato_{uuid.uuid4().hex[:8]}.pdf"
                            pdfs.append((filename, content))
                    except Exception as e:
                        logger.debug(f"Errore estrazione allegato: {e}")
        else:
            # Email non multipart, verifica se è un PDF direttamente
            content_type = msg.get_content_type()
            if content_type == "application/pdf":
                try:
                    content = msg.get_payload(decode=True)
                    if content:
                        filename = msg.get_filename() or "documento.pdf"
                        pdfs.append((decode_mime_header(filename), content))
                except:
                    pass
        
        return pdfs
    
    async def process_email(self, email_uid: bytes, msg: email.message.Message) -> int:
        """Processa una singola email ed estrae i PDF."""
        pdfs_saved = 0
        
        # Estrai info email
        subject = decode_mime_header(msg.get("Subject", ""))
        from_addr = decode_mime_header(msg.get("From", ""))
        date_str = msg.get("Date", "")
        
        email_info = {
            "uid": email_uid.decode() if isinstance(email_uid, bytes) else str(email_uid),
            "subject": subject,
            "from": from_addr,
            "date": date_str
        }
        
        # Estrai body per categorizzazione
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                        break
                    except:
                        pass
        else:
            try:
                body = msg.get_payload(decode=True).decode('utf-8', errors='replace')
            except:
                pass
        
        # Estrai tutti i PDF
        pdfs = self.extract_pdfs_from_email(msg)
        
        for filename, content in pdfs:
            # Categorizza
            category = categorize_document(filename, subject, body)
            
            # Estrai periodo
            period_info = extract_period_from_text(f"{filename} {subject}")
            
            # Salva nel database
            doc_id = await self.save_pdf_to_db(
                pdf_content=content,
                filename=filename,
                category=category,
                email_info=email_info,
                period_info=period_info
            )
            
            if doc_id:
                pdfs_saved += 1
        
        return pdfs_saved
    
    async def download_all_emails(
        self,
        folder: str = "INBOX",
        days_back: int = 365,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Scarica TUTTE le email con PDF degli ultimi N giorni.
        """
        if not self.connect():
            return {"success": False, "error": "Connessione IMAP fallita", "stats": self.stats}
        
        try:
            # Seleziona cartella
            status, _ = self.connection.select(folder)
            if status != "OK":
                return {"success": False, "error": f"Cartella {folder} non trovata", "stats": self.stats}
            
            # Calcola data di inizio
            since_date = (datetime.now() - timedelta(days=days_back)).strftime("%d-%b-%Y")
            
            # Cerca tutte le email dal periodo
            search_criteria = f'(SINCE "{since_date}")'
            status, messages = self.connection.search(None, search_criteria)
            
            if status != "OK":
                return {"success": False, "error": "Ricerca email fallita", "stats": self.stats}
            
            email_ids = messages[0].split()
            total_emails = len(email_ids)
            logger.info(f"Trovate {total_emails} email da processare")
            
            # Processa in batch
            for i in range(0, total_emails, batch_size):
                batch = email_ids[i:i + batch_size]
                logger.info(f"Processando batch {i//batch_size + 1}: {len(batch)} email")
                
                for email_uid in batch:
                    try:
                        # Scarica email
                        status, msg_data = self.connection.fetch(email_uid, "(RFC822)")
                        if status != "OK":
                            continue
                        
                        # Parse email
                        raw_email = msg_data[0][1]
                        msg = email.message_from_bytes(raw_email)
                        
                        # Processa
                        await self.process_email(email_uid, msg)
                        self.stats["emails_processed"] += 1
                        
                    except Exception as e:
                        logger.error(f"Errore processing email {email_uid}: {e}")
                        self.stats["errors"].append(str(e))
                
                # Log progresso
                progress = min(i + batch_size, total_emails)
                logger.info(f"Progresso: {progress}/{total_emails} email processate")
            
            return {
                "success": True,
                "stats": self.stats
            }
            
        except Exception as e:
            logger.error(f"Errore download email: {e}")
            return {"success": False, "error": str(e), "stats": self.stats}
        
        finally:
            self.disconnect()
    
    async def download_single_day(self, target_date: datetime) -> Dict[str, Any]:
        """
        Scarica email di un singolo giorno specifico.
        """
        if not self.connect():
            return {"success": False, "error": "Connessione IMAP fallita"}
        
        try:
            self.connection.select("INBOX")
            
            # Cerca email di quel giorno specifico
            date_str = target_date.strftime("%d-%b-%Y")
            next_date_str = (target_date + timedelta(days=1)).strftime("%d-%b-%Y")
            
            search_criteria = f'(SINCE "{date_str}" BEFORE "{next_date_str}")'
            status, messages = self.connection.search(None, search_criteria)
            
            if status != "OK":
                return {"success": False, "error": "Ricerca fallita"}
            
            email_ids = messages[0].split()
            logger.info(f"Trovate {len(email_ids)} email per {date_str}")
            
            for email_uid in email_ids:
                try:
                    status, msg_data = self.connection.fetch(email_uid, "(RFC822)")
                    if status == "OK":
                        msg = email.message_from_bytes(msg_data[0][1])
                        await self.process_email(email_uid, msg)
                        self.stats["emails_processed"] += 1
                except Exception as e:
                    logger.error(f"Errore: {e}")
            
            return {"success": True, "stats": self.stats}
            
        finally:
            self.disconnect()


async def associate_pdf_to_document(
    db: AsyncIOMotorDatabase,
    pdf_id: str,
    source_collection: str,
    target_document_id: str,
    target_collection: str
) -> bool:
    """
    Associa un PDF scaricato a un documento esistente.
    Copia il pdf_data nella collezione di destinazione.
    """
    try:
        # Trova il PDF
        pdf_doc = await db[source_collection].find_one({"id": pdf_id})
        if not pdf_doc:
            return False
        
        # Aggiorna documento destinazione con il PDF
        result = await db[target_collection].update_one(
            {"id": target_document_id},
            {
                "$set": {
                    "pdf_data": pdf_doc["pdf_data"],
                    "pdf_filename": pdf_doc["filename"],
                    "pdf_hash": pdf_doc["pdf_hash"]
                }
            }
        )
        
        if result.modified_count > 0:
            # Marca il PDF come associato
            await db[source_collection].update_one(
                {"id": pdf_id},
                {
                    "$set": {
                        "associato": True,
                        "documento_associato_id": target_document_id,
                        "documento_associato_collection": target_collection,
                        "associated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Errore associazione PDF: {e}")
        return False


async def get_documenti_non_associati(
    db: AsyncIOMotorDatabase,
    category: str = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Recupera i documenti non ancora associati per l'associazione manuale.
    """
    query = {"associato": False}
    if category:
        query["category"] = category
    
    # Cerca in tutte le collezioni di allegati
    results = []
    for coll_name in CATEGORY_COLLECTIONS.values():
        cursor = db[coll_name].find(
            query,
            {"_id": 0, "pdf_data": 0}  # Escludi PDF pesante
        ).limit(limit)
        
        async for doc in cursor:
            doc["source_collection"] = coll_name
            results.append(doc)
    
    return results[:limit]


async def smart_auto_associate(db: AsyncIOMotorDatabase) -> Dict[str, int]:
    """
    Tenta di associare automaticamente i PDF ai documenti esistenti
    basandosi su filename, periodo e categoria.
    """
    stats = {"associated": 0, "skipped": 0, "errors": 0}
    
    # ========== ASSOCIAZIONE CEDOLINI (BUSTE PAGA) ==========
    # Pattern filename: "Busta paga - Vespa Vincenzo - Settembre 2024 - 2.pdf"
    mesi_it = {
        "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4,
        "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8,
        "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12
    }
    
    cursor = db["cedolini_email_attachments"].find({"associato": False})
    async for pdf_doc in cursor:
        try:
            filename = pdf_doc.get("filename", "")
            
            # Estrai nome dipendente e periodo dal filename
            # Pattern: "Busta paga - COGNOME NOME - MESE ANNO"
            import re
            match = re.search(r'[Bb]usta\s*[Pp]aga\s*-\s*([^-]+)\s*-\s*(\w+)\s*(\d{4})', filename)
            
            if match:
                nome_completo = match.group(1).strip()
                mese_str = match.group(2).lower()
                anno = int(match.group(3))
                mese = mesi_it.get(mese_str, pdf_doc.get("mese"))
                
                # Cerca dipendente per nome/cognome
                parts = nome_completo.split()
                if len(parts) >= 2:
                    cognome = parts[0]
                    nome = " ".join(parts[1:])
                    
                    # Cerca cedolino corrispondente
                    cedolino = await db["cedolini"].find_one({
                        "mese": mese,
                        "anno": anno,
                        "$or": [
                            {"pdf_data": None},
                            {"pdf_data": ""},
                            {"pdf_data": {"$exists": False}}
                        ]
                    })
                    
                    if not cedolino:
                        # Cerca anche per nome dipendente
                        cedolino = await db["cedolini"].find_one({
                            "dipendente": {"$regex": cognome, "$options": "i"},
                            "mese": mese,
                            "anno": anno,
                            "$or": [
                                {"pdf_data": None},
                                {"pdf_data": ""},
                                {"pdf_data": {"$exists": False}}
                            ]
                        })
                    
                    if cedolino:
                        # Associa
                        await db["cedolini"].update_one(
                            {"id": cedolino["id"]},
                            {"$set": {
                                "pdf_data": pdf_doc["pdf_data"],
                                "pdf_filename": filename,
                                "pdf_hash": pdf_doc.get("pdf_hash")
                            }}
                        )
                        await db["cedolini_email_attachments"].update_one(
                            {"id": pdf_doc["id"]},
                            {"$set": {
                                "associato": True,
                                "documento_associato_id": cedolino["id"],
                                "documento_associato_collection": "cedolini",
                                "associated_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        stats["associated"] += 1
                        logger.info(f"Cedolino associato: {filename} -> {cedolino['id']}")
                        continue
            
            stats["skipped"] += 1
            
        except Exception as e:
            logger.error(f"Errore auto-associazione cedolino: {e}")
            stats["errors"] += 1
    
    # ========== ASSOCIAZIONE F24 ==========
    cursor = db["f24_email_attachments"].find({"associato": False})
    async for pdf_doc in cursor:
        try:
            filename = pdf_doc.get("filename", "")
            
            # Cerca F24 con lo stesso filename
            f24 = await db["f24_commercialista"].find_one({
                "$or": [
                    {"file_name": filename},
                    {"filename": filename},
                    {"file_name": {"$regex": filename[:30], "$options": "i"}}
                ],
                "$or": [
                    {"pdf_data": None},
                    {"pdf_data": ""},
                    {"pdf_data": {"$exists": False}}
                ]
            })
            
            if f24:
                await db["f24_commercialista"].update_one(
                    {"id": f24["id"]},
                    {"$set": {
                        "pdf_data": pdf_doc["pdf_data"],
                        "pdf_filename": filename,
                        "pdf_hash": pdf_doc.get("pdf_hash")
                    }}
                )
                await db["f24_email_attachments"].update_one(
                    {"id": pdf_doc["id"]},
                    {"$set": {
                        "associato": True,
                        "documento_associato_id": f24["id"],
                        "documento_associato_collection": "f24_commercialista",
                        "associated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                stats["associated"] += 1
                logger.info(f"F24 associato: {filename}")
            else:
                stats["skipped"] += 1
                
        except Exception as e:
            logger.error(f"Errore auto-associazione F24: {e}")
            stats["errors"] += 1
    
    return stats
