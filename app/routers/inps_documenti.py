"""
Router INPS Documenti - Gestione Delibere FONSI, Dilazioni, Cassa Integrazione
Scarica email PEC e associa documenti ai periodi/dipendenti
"""

import os
import re
import base64
import imaplib
import email
from email.header import decode_header
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.database import Database

router = APIRouter()

# Configurazione email
EMAIL = os.environ.get("EMAIL_ADDRESS", "")
EMAIL_PASSWORD = os.environ.get("EMAIL_APP_PASSWORD", "")
IMAP_SERVER = os.environ.get("IMAP_SERVER", "imap.gmail.com")

COLLECTION_FONSI = "delibere_fonsi"
COLLECTION_DILAZIONI = "dilazioni_inps"
COLLECTION_CASSA_INTEGRAZIONE = "cassa_integrazione"


def decode_email_subject(subject: str) -> str:
    """Decodifica il subject dell'email"""
    if not subject:
        return ""
    decoded_parts = decode_header(subject)
    result = []
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(encoding or 'utf-8', errors='replace'))
        else:
            result.append(part)
    return ''.join(result)


def estrai_periodo_fonsi(testo: str) -> Optional[Dict[str, str]]:
    """
    Estrae il periodo dalla delibera FONSI.
    Pattern: "periodo dal 01/12/2021 al 31/12/2021"
    """
    match = re.search(r'periodo\s+dal\s+(\d{2}/\d{2}/\d{4})\s+al\s+(\d{2}/\d{2}/\d{4})', testo, re.I)
    if match:
        return {
            "data_inizio": match.group(1),
            "data_fine": match.group(2)
        }
    return None


def estrai_dati_cassa_integrazione(testo: str) -> Dict[str, Any]:
    """
    Estrae i dati dalla delibera cassa integrazione.
    """
    dati = {
        "numero_lavoratori": None,
        "ore_totali": None,
        "importo": None,
        "periodo": None
    }
    
    # Cerca numero lavoratori
    match = re.search(r'(\d+)\s*lavorator', testo, re.I)
    if match:
        dati["numero_lavoratori"] = int(match.group(1))
    
    # Cerca ore
    match = re.search(r'(\d+)\s*ore', testo, re.I)
    if match:
        dati["ore_totali"] = int(match.group(1))
    
    # Cerca importo (formato italiano: 5.696,68)
    match = re.search(r'€?\s*([\d.]+,\d{2})', testo)
    if match:
        importo_str = match.group(1).replace('.', '').replace(',', '.')
        dati["importo"] = float(importo_str)
    
    # Cerca periodo
    dati["periodo"] = estrai_periodo_fonsi(testo)
    
    return dati


def estrai_dati_dilazione(testo: str) -> Dict[str, Any]:
    """
    Estrae dati dalla email di dilazione INPS.
    Cerca: Sede INPS, matricola, importo rate
    """
    dati = {
        "sede_inps": None,
        "matricola": None,
        "numero_rate": None,
        "importo_rata": None,
        "codice_dilazione": None
    }
    
    # Cerca sede INPS
    match = re.search(r'Sede\s+(?:INPS\s+)?(\d{4})', testo, re.I)
    if match:
        dati["sede_inps"] = match.group(1)
    
    # Cerca matricola
    match = re.search(r'matricola\s+(\d{10})', testo, re.I)
    if match:
        dati["matricola"] = match.group(1)
    
    # Cerca numero rate
    match = re.search(r'(\d+)\s*rat[ea]', testo, re.I)
    if match:
        dati["numero_rate"] = int(match.group(1))
    
    return dati


@router.get("/cartelle-delibere")
async def get_cartelle_delibere() -> Dict[str, Any]:
    """
    Lista le cartelle email che potrebbero contenere delibere FONSI.
    """
    if not EMAIL or not EMAIL_PASSWORD:
        raise HTTPException(status_code=500, detail="Credenziali email non configurate")
    
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL, EMAIL_PASSWORD)
        
        # Lista tutte le cartelle
        status, folders = mail.list()
        cartelle = []
        
        if status == "OK":
            for folder in folders:
                folder_str = folder.decode()
                # Estrai nome cartella
                match = re.search(r'"([^"]+)"$', folder_str)
                if match:
                    nome = match.group(1)
                    # Filtra cartelle rilevanti
                    if any(kw in nome.lower() for kw in ['inps', 'fonsi', 'deliber', 'pec', 'certificata']):
                        cartelle.append(nome)
        
        mail.logout()
        
        return {
            "cartelle": cartelle,
            "totale": len(cartelle)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore connessione email: {str(e)}")


@router.post("/scarica-delibere-fonsi")
async def scarica_delibere_fonsi(
    cartella: str = Query("INBOX", description="Cartella email da cercare"),
    data_inizio: str = Query(None, description="Data inizio ricerca (YYYY-MM-DD)"),
    data_fine: str = Query(None, description="Data fine ricerca (YYYY-MM-DD)")
) -> Dict[str, Any]:
    """
    Scarica le delibere FONSI dalla posta certificata.
    Cerca: "POSTA CERTIFICATA: Delibere - Fonsi"
    """
    if not EMAIL or not EMAIL_PASSWORD:
        raise HTTPException(status_code=500, detail="Credenziali email non configurate")
    
    db = Database.get_db()
    risultati = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "delibere_trovate": 0,
        "delibere_salvate": 0,
        "delibere": [],
        "errori": []
    }
    
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL, EMAIL_PASSWORD)
        mail.select(cartella)
        
        # Costruisci query di ricerca
        search_criteria = '(SUBJECT "Delibere - Fonsi")'
        
        if data_inizio:
            # Formato IMAP: DD-Mon-YYYY
            try:
                dt = datetime.strptime(data_inizio, "%Y-%m-%d")
                search_criteria = f'(SINCE {dt.strftime("%d-%b-%Y")} {search_criteria[1:-1]})'
            except:
                pass
        
        status, messages = mail.search(None, search_criteria)
        
        if status != "OK":
            mail.logout()
            return risultati
        
        message_ids = messages[0].split()
        risultati["delibere_trovate"] = len(message_ids)
        
        for msg_id in message_ids:
            try:
                status, msg_data = mail.fetch(msg_id, "(RFC822)")
                if status != "OK":
                    continue
                
                email_body = msg_data[0][1]
                msg = email.message_from_bytes(email_body)
                
                subject = decode_email_subject(msg.get("Subject", ""))
                date_str = msg.get("Date", "")
                
                # Estrai periodo dal subject
                periodo = estrai_periodo_fonsi(subject)
                
                delibera = {
                    "subject": subject,
                    "data_email": date_str,
                    "periodo": periodo,
                    "allegati": [],
                    "dati_cassa_integrazione": None
                }
                
                # Cerca allegati PDF
                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart':
                        continue
                    
                    filename = part.get_filename()
                    if filename and filename.lower().endswith('.pdf'):
                        filename = decode_email_subject(filename)
                        payload = part.get_payload(decode=True)
                        
                        if payload:
                            pdf_base64 = base64.b64encode(payload).decode('utf-8')
                            
                            # Salva nel database
                            doc = {
                                "tipo": "delibera_fonsi",
                                "subject": subject,
                                "data_email": date_str,
                                "periodo": periodo,
                                "filename": filename,
                                "pdf_base64": pdf_base64,
                                "data_inserimento": datetime.utcnow().isoformat() + "Z"
                            }
                            
                            # Evita duplicati
                            existing = await db[COLLECTION_FONSI].find_one({
                                "subject": subject,
                                "filename": filename
                            })
                            
                            if not existing:
                                await db[COLLECTION_FONSI].insert_one(doc)
                                risultati["delibere_salvate"] += 1
                            
                            delibera["allegati"].append({
                                "filename": filename,
                                "size": len(payload)
                            })
                
                risultati["delibere"].append(delibera)
                
            except Exception as e:
                risultati["errori"].append(f"Errore parsing email: {str(e)}")
        
        mail.logout()
        
    except Exception as e:
        risultati["errori"].append(f"Errore connessione: {str(e)}")
    
    return risultati


@router.post("/scarica-dilazioni-inps")
async def scarica_dilazioni_inps(
    cartella: str = Query("INBOX", description="Cartella email"),
    sede_inps: str = Query("5100", description="Sede INPS da cercare"),
    matricola: str = Query("5124776507", description="Matricola da cercare")
) -> Dict[str, Any]:
    """
    Scarica le email di dilazione INPS.
    Cerca: "Sede INPS {sede}, matricola {matricola}, Dilazione amministrativa"
    """
    if not EMAIL or not EMAIL_PASSWORD:
        raise HTTPException(status_code=500, detail="Credenziali email non configurate")
    
    db = Database.get_db()
    risultati = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "email_trovate": 0,
        "dilazioni_salvate": 0,
        "dilazioni": [],
        "errori": []
    }
    
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL, EMAIL_PASSWORD)
        mail.select(cartella)
        
        # Cerca email con dilazione
        search_criteria = f'(OR (BODY "{sede_inps}") (BODY "{matricola}"))'
        
        status, messages = mail.search(None, search_criteria)
        
        if status != "OK":
            mail.logout()
            return risultati
        
        message_ids = messages[0].split()
        
        for msg_id in message_ids:
            try:
                status, msg_data = mail.fetch(msg_id, "(RFC822)")
                if status != "OK":
                    continue
                
                email_body = msg_data[0][1]
                msg = email.message_from_bytes(email_body)
                
                subject = decode_email_subject(msg.get("Subject", ""))
                
                # Filtra per dilazione
                if "dilazion" not in subject.lower() and "inps" not in subject.lower():
                    continue
                
                risultati["email_trovate"] += 1
                
                date_str = msg.get("Date", "")
                
                dilazione = {
                    "subject": subject,
                    "data_email": date_str,
                    "sede_inps": sede_inps,
                    "matricola": matricola,
                    "allegati": []
                }
                
                # Cerca allegati PDF
                for part in msg.walk():
                    if part.get_content_maintype() == 'multipart':
                        continue
                    
                    filename = part.get_filename()
                    if filename and filename.lower().endswith('.pdf'):
                        filename = decode_email_subject(filename)
                        payload = part.get_payload(decode=True)
                        
                        if payload:
                            pdf_base64 = base64.b64encode(payload).decode('utf-8')
                            
                            doc = {
                                "tipo": "dilazione_inps",
                                "subject": subject,
                                "data_email": date_str,
                                "sede_inps": sede_inps,
                                "matricola": matricola,
                                "filename": filename,
                                "pdf_base64": pdf_base64,
                                "data_inserimento": datetime.utcnow().isoformat() + "Z"
                            }
                            
                            existing = await db[COLLECTION_DILAZIONI].find_one({
                                "subject": subject,
                                "filename": filename
                            })
                            
                            if not existing:
                                await db[COLLECTION_DILAZIONI].insert_one(doc)
                                risultati["dilazioni_salvate"] += 1
                            
                            dilazione["allegati"].append({
                                "filename": filename,
                                "size": len(payload)
                            })
                
                risultati["dilazioni"].append(dilazione)
                
            except Exception as e:
                risultati["errori"].append(str(e))
        
        mail.logout()
        
    except Exception as e:
        risultati["errori"].append(str(e))
    
    return risultati


@router.get("/delibere-fonsi")
async def get_delibere_fonsi(
    anno: int = Query(None, description="Filtra per anno")
) -> List[Dict[str, Any]]:
    """Lista tutte le delibere FONSI salvate."""
    db = Database.get_db()
    
    query = {}
    if anno:
        query["periodo.data_inizio"] = {"$regex": f"/{anno}$"}
    
    cursor = db[COLLECTION_FONSI].find(query, {"pdf_base64": 0})
    delibere = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        delibere.append(doc)
    
    return delibere


@router.get("/dilazioni-inps")
async def get_dilazioni_inps() -> List[Dict[str, Any]]:
    """Lista tutte le dilazioni INPS salvate."""
    db = Database.get_db()
    
    cursor = db[COLLECTION_DILAZIONI].find({}, {"pdf_base64": 0})
    dilazioni = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        dilazioni.append(doc)
    
    return dilazioni


@router.get("/stats")
async def get_stats() -> Dict[str, Any]:
    """Statistiche documenti INPS."""
    db = Database.get_db()
    
    totale_fonsi = await db[COLLECTION_FONSI].count_documents({})
    totale_dilazioni = await db[COLLECTION_DILAZIONI].count_documents({})
    totale_cassa = await db[COLLECTION_CASSA_INTEGRAZIONE].count_documents({})
    
    return {
        "delibere_fonsi": totale_fonsi,
        "dilazioni_inps": totale_dilazioni,
        "cassa_integrazione": totale_cassa
    }
