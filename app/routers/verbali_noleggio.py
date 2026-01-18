"""
Router Verbali Noleggio - Scarica verbali dalla posta e li associa alle fatture.

Cerca nelle cartelle email i verbali (pattern Bxxxxxxxxxx) e li associa
alle righe corrispondenti nelle fatture noleggio.
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from datetime import datetime, timezone
import imaplib
import email
from email.header import decode_header
import os
import re
import uuid
import logging
import base64

from app.database import Database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verbali-noleggio", tags=["Verbali Noleggio"])

# Configurazione Email
IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993
EMAIL_ADDRESS = os.environ.get("GMAIL_EMAIL", "ceraldigroupsrl@gmail.com")
EMAIL_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")

# Collection
COLLECTION_VERBALI = "verbali_noleggio"
COLLECTION_FATTURE_NOLEGGIO = "fatture_noleggio"


def get_imap_connection():
    """Crea connessione IMAP a Gmail."""
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        return mail
    except Exception as e:
        logger.error(f"Errore connessione IMAP: {e}")
        return None


def decode_header_value(value: str) -> str:
    """Decodifica header email."""
    if not value:
        return ""
    try:
        decoded = decode_header(value)
        result = ""
        for part, enc in decoded:
            if isinstance(part, bytes):
                result += part.decode(enc or 'utf-8', errors='ignore')
            else:
                result += str(part)
        return result
    except:
        return str(value)


@router.get("/cartelle-verbali")
async def lista_cartelle_verbali() -> Dict[str, Any]:
    """
    Lista tutte le cartelle email che contengono verbali noleggio.
    Pattern: Bxxxxxxxxxx (es. B23123049750)
    """
    mail = get_imap_connection()
    if not mail:
        raise HTTPException(status_code=500, detail="Connessione email fallita")
    
    try:
        status, folders = mail.list()
        
        verbali_cartelle = []
        pattern = re.compile(r'^B\d{10,11}$')
        
        for folder in folders:
            folder_str = folder.decode()
            if '"/"' in folder_str:
                name = folder_str.split('"/"')[-1].strip().strip('"')
                if pattern.match(name):
                    verbali_cartelle.append(name)
        
        mail.logout()
        
        return {
            "cartelle": sorted(verbali_cartelle),
            "count": len(verbali_cartelle)
        }
    except Exception as e:
        mail.logout()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scarica-tutti")
async def scarica_tutti_verbali() -> Dict[str, Any]:
    """
    Scarica tutti i PDF dei verbali dalle cartelle email.
    Li salva nel database con il numero verbale come chiave.
    """
    db = Database.get_db()
    
    mail = get_imap_connection()
    if not mail:
        raise HTTPException(status_code=500, detail="Connessione email fallita")
    
    risultati = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cartelle_analizzate": 0,
        "verbali_trovati": 0,
        "pdf_scaricati": 0,
        "gia_presenti": 0,
        "errori": []
    }
    
    try:
        # Lista cartelle verbali
        status, folders = mail.list()
        
        pattern = re.compile(r'^B\d{10,11}$')
        cartelle_verbali = []
        
        for folder in folders:
            folder_str = folder.decode()
            if '"/"' in folder_str:
                name = folder_str.split('"/"')[-1].strip().strip('"')
                if pattern.match(name):
                    cartelle_verbali.append(name)
        
        risultati["cartelle_analizzate"] = len(cartelle_verbali)
        
        for cartella in cartelle_verbali:
            numero_verbale = cartella  # Il nome cartella è il numero verbale
            
            # Verifica se già scaricato
            esistente = await db[COLLECTION_VERBALI].find_one({"numero_verbale": numero_verbale})
            if esistente and esistente.get("pdf_scaricato"):
                risultati["gia_presenti"] += 1
                continue
            
            try:
                status, _ = mail.select(f'"{cartella}"', readonly=True)
                if status != 'OK':
                    continue
                
                status, messages = mail.search(None, 'ALL')
                if status != 'OK':
                    continue
                
                msg_ids = messages[0].split()
                risultati["verbali_trovati"] += 1
                
                pdf_allegati = []
                subject_verbale = ""
                data_email = None
                mittente = ""
                
                for msg_id in msg_ids:
                    status, msg_data = mail.fetch(msg_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    
                    msg = email.message_from_bytes(msg_data[0][1])
                    
                    # Info email
                    subject_verbale = decode_header_value(msg.get('Subject', ''))
                    mittente = msg.get('From', '')
                    date_str = msg.get('Date', '')
                    
                    # Cerca PDF allegati
                    if msg.is_multipart():
                        for part in msg.walk():
                            filename = part.get_filename()
                            if filename and '.pdf' in filename.lower():
                                # Scarica contenuto PDF
                                pdf_content = part.get_payload(decode=True)
                                if pdf_content:
                                    pdf_allegati.append({
                                        "filename": decode_header_value(filename),
                                        "content_base64": base64.b64encode(pdf_content).decode('utf-8'),
                                        "size": len(pdf_content)
                                    })
                
                # Salva in database
                verbale_doc = {
                    "id": str(uuid.uuid4()),
                    "numero_verbale": numero_verbale,
                    "cartella_email": cartella,
                    "subject": subject_verbale,
                    "mittente": mittente,
                    "pdf_allegati": pdf_allegati,
                    "pdf_scaricato": len(pdf_allegati) > 0,
                    "num_pdf": len(pdf_allegati),
                    "fattura_associata": None,
                    "riga_fattura_id": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db[COLLECTION_VERBALI].update_one(
                    {"numero_verbale": numero_verbale},
                    {"$set": verbale_doc},
                    upsert=True
                )
                
                if pdf_allegati:
                    risultati["pdf_scaricati"] += len(pdf_allegati)
                
            except Exception as e:
                risultati["errori"].append(f"{cartella}: {str(e)}")
        
        mail.logout()
        return risultati
        
    except Exception as e:
        if mail:
            mail.logout()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verbali")
async def lista_verbali(
    associato: bool = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Lista verbali scaricati."""
    db = Database.get_db()
    
    query = {}
    if associato is not None:
        if associato:
            query["fattura_associata"] = {"$ne": None}
        else:
            query["fattura_associata"] = None
    
    verbali = await db[COLLECTION_VERBALI].find(
        query, 
        {"_id": 0, "pdf_allegati": 0}  # Escludi PDF pesanti dalla lista
    ).sort("numero_verbale", -1).limit(limit).to_list(limit)
    
    return verbali


@router.get("/verbale/{numero_verbale}")
async def get_verbale(numero_verbale: str) -> Dict[str, Any]:
    """Dettaglio verbale con PDF."""
    db = Database.get_db()
    
    verbale = await db[COLLECTION_VERBALI].find_one(
        {"numero_verbale": numero_verbale},
        {"_id": 0}
    )
    
    if not verbale:
        raise HTTPException(status_code=404, detail="Verbale non trovato")
    
    return verbale


@router.post("/associa-fatture")
async def associa_verbali_a_fatture() -> Dict[str, Any]:
    """
    Cerca nelle fatture noleggio i verbali e li associa automaticamente.
    
    Logica:
    1. Per ogni verbale scaricato
    2. Cerca nelle fatture noleggio una riga con quel numero verbale
    3. Se trovata, associa
    """
    db = Database.get_db()
    
    risultati = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "verbali_analizzati": 0,
        "associazioni_trovate": 0,
        "non_trovati": [],
        "errori": []
    }
    
    # Carica tutti i verbali non ancora associati
    verbali = await db[COLLECTION_VERBALI].find(
        {"fattura_associata": None},
        {"_id": 0, "pdf_allegati": 0}
    ).to_list(1000)
    
    risultati["verbali_analizzati"] = len(verbali)
    
    # Carica fatture noleggio (collezione invoices, cerca quelle con verbali)
    # Le fatture noleggio hanno righe con riferimento al verbale
    fatture = await db.invoices.find({
        "$or": [
            {"note": {"$regex": "verbale", "$options": "i"}},
            {"descrizione": {"$regex": "verbale", "$options": "i"}},
            {"supplier_name": {"$regex": "leasys|ald|ayvens|arval|locauto|noleggio", "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(10000)
    
    # Cerca anche nelle righe dettaglio
    righe_fatture = await db.dettaglio_righe_fatture.find(
        {"descrizione": {"$regex": "verbale", "$options": "i"}},
        {"_id": 0}
    ).to_list(50000)
    
    # Indice righe per numero verbale
    righe_idx = {}
    for riga in righe_fatture:
        desc = riga.get("descrizione", "")
        # Estrai numero verbale dalla descrizione
        match = re.search(r'B\d{10,11}', desc)
        if match:
            num_verb = match.group(0)
            righe_idx[num_verb] = riga
    
    for verbale in verbali:
        numero = verbale.get("numero_verbale")
        
        if numero in righe_idx:
            riga = righe_idx[numero]
            
            try:
                await db[COLLECTION_VERBALI].update_one(
                    {"numero_verbale": numero},
                    {"$set": {
                        "fattura_associata": riga.get("fattura_id"),
                        "riga_fattura_id": riga.get("id"),
                        "riga_descrizione": riga.get("descrizione"),
                        "riga_importo": riga.get("importo"),
                        "associato_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Aggiorna anche la riga con riferimento al verbale PDF
                await db.dettaglio_righe_fatture.update_one(
                    {"id": riga.get("id")},
                    {"$set": {
                        "verbale_pdf_id": verbale.get("id"),
                        "verbale_scaricato": True
                    }}
                )
                
                risultati["associazioni_trovate"] += 1
            except Exception as e:
                risultati["errori"].append(f"{numero}: {str(e)}")
        else:
            risultati["non_trovati"].append(numero)
    
    return risultati


@router.get("/pdf/{numero_verbale}")
async def get_pdf_verbale(numero_verbale: str, indice: int = 0) -> Dict[str, Any]:
    """
    Ottiene il PDF del verbale in base64.
    indice: quale PDF se ce ne sono più di uno (default primo)
    """
    db = Database.get_db()
    
    verbale = await db[COLLECTION_VERBALI].find_one(
        {"numero_verbale": numero_verbale},
        {"_id": 0}
    )
    
    if not verbale:
        raise HTTPException(status_code=404, detail="Verbale non trovato")
    
    pdf_allegati = verbale.get("pdf_allegati", [])
    
    if not pdf_allegati or indice >= len(pdf_allegati):
        raise HTTPException(status_code=404, detail="PDF non trovato")
    
    pdf = pdf_allegati[indice]
    
    return {
        "numero_verbale": numero_verbale,
        "filename": pdf.get("filename"),
        "content_base64": pdf.get("content_base64"),
        "size": pdf.get("size")
    }


@router.get("/stats")
async def stats_verbali() -> Dict[str, Any]:
    """Statistiche verbali."""
    db = Database.get_db()
    
    totale = await db[COLLECTION_VERBALI].count_documents({})
    con_pdf = await db[COLLECTION_VERBALI].count_documents({"pdf_scaricato": True})
    associati = await db[COLLECTION_VERBALI].count_documents({"fattura_associata": {"$ne": None}})
    
    return {
        "totale_verbali": totale,
        "con_pdf": con_pdf,
        "associati_a_fatture": associati,
        "non_associati": totale - associati
    }
