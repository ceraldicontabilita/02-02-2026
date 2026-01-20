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
    2. Cerca nelle fatture noleggio (campo 'linee') una riga con quel numero verbale
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
    
    # Carica TUTTE le fatture noleggio (ALD, Leasys, Arval, etc.)
    fatture = await db.invoices.find({
        "supplier_name": {"$regex": "ald|leasys|arval|ayvens|locauto|leaseplan|noleggio", "$options": "i"}
    }, {"_id": 0}).to_list(50000)
    
    # Crea indice: numero_verbale -> fattura
    verbale_fattura_idx = {}
    for fattura in fatture:
        linee = fattura.get("linee", [])
        for linea in linee:
            desc = linea.get("descrizione", "")
            # Cerca pattern verbale Bxxxxxxxxxx
            matches = re.findall(r'B\d{10,11}', desc, re.IGNORECASE)
            for num_verb in matches:
                verbale_fattura_idx[num_verb.upper()] = {
                    "fattura_id": fattura.get("id"),
                    "invoice_number": fattura.get("invoice_number"),
                    "supplier_name": fattura.get("supplier_name"),
                    "invoice_date": fattura.get("invoice_date"),
                    "total_amount": fattura.get("total_amount"),
                    "linea_descrizione": desc,
                    "linea_importo": linea.get("prezzo_totale") or linea.get("importo")
                }
    
    logger.info(f"Trovate {len(verbale_fattura_idx)} fatture con verbali")
    
    for verbale in verbali:
        numero = verbale.get("numero_verbale", "").upper()
        
        if numero in verbale_fattura_idx:
            fattura_info = verbale_fattura_idx[numero]
            
            try:
                await db[COLLECTION_VERBALI].update_one(
                    {"numero_verbale": verbale["numero_verbale"]},
                    {"$set": {
                        "fattura_associata": fattura_info["fattura_id"],
                        "invoice_number": fattura_info["invoice_number"],
                        "supplier_name": fattura_info["supplier_name"],
                        "invoice_date": fattura_info["invoice_date"],
                        "importo_fattura": fattura_info["total_amount"],
                        "linea_descrizione": fattura_info["linea_descrizione"],
                        "linea_importo": fattura_info["linea_importo"],
                        "associato_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Aggiorna anche la fattura con riferimento al verbale PDF
                await db.invoices.update_one(
                    {"id": fattura_info["fattura_id"]},
                    {"$set": {
                        f"verbale_pdf.{numero}": {
                            "verbale_id": verbale.get("id"),
                            "pdf_scaricato": True,
                            "scaricato_at": datetime.now(timezone.utc).isoformat()
                        }
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


@router.post("/scansiona-fatture")
async def scansiona_fatture_per_verbali_endpoint() -> Dict[str, Any]:
    """
    Scansiona TUTTE le fatture dei fornitori noleggio dal 2022 al 2026
    ed estrae tutti i verbali con associazioni complete.
    """
    from app.services.verbali_service import scansiona_e_salva_tutti_verbali
    
    try:
        risultato = await scansiona_e_salva_tutti_verbali()
        return {
            "success": True,
            "message": "Scansione completata",
            **risultato
        }
    except Exception as e:
        logger.error(f"Errore scansione verbali: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verbali-completi")
async def get_verbali_completi(
    anno: int = None,
    targa: str = None,
    stato_pagamento: str = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Restituisce i verbali con tutte le associazioni.
    
    Filtri opzionali:
    - anno: Anno del verbale
    - targa: Filtra per targa veicolo
    - stato_pagamento: da_verificare, pagato, sospeso
    """
    from app.services.verbali_service import COLLECTION_VERBALI
    db = Database.get_db()
    
    query = {}
    if anno:
        query["anno"] = str(anno)
    if targa:
        query["targa"] = targa.upper()
    if stato_pagamento:
        query["stato_pagamento"] = stato_pagamento
    
    cursor = db[COLLECTION_VERBALI].find(query, {"_id": 0}).sort("data_fattura", -1).limit(limit)
    verbali = await cursor.to_list(limit)
    
    # Statistiche
    totale = await db[COLLECTION_VERBALI].count_documents(query if query else {})
    pagati = await db[COLLECTION_VERBALI].count_documents({"stato_pagamento": "pagato"})
    sospesi = await db[COLLECTION_VERBALI].count_documents({"stato_pagamento": "sospeso"})
    da_verificare = await db[COLLECTION_VERBALI].count_documents({"stato_pagamento": "da_verificare"})
    
    return {
        "verbali": verbali,
        "count": len(verbali),
        "totale": totale,
        "statistiche": {
            "pagati": pagati,
            "sospesi": sospesi,
            "da_verificare": da_verificare
        }
    }


@router.get("/operazioni-sospese")
async def get_operazioni_sospese_endpoint() -> Dict[str, Any]:
    """
    Restituisce tutte le operazioni sospese (verbali non trovati nell'estratto conto).
    """
    from app.services.verbali_service import get_operazioni_sospese
    
    sospese = await get_operazioni_sospese()
    
    return {
        "operazioni": sospese,
        "count": len(sospese),
        "nota": "Queste operazioni non sono state trovate nell'estratto conto. Cerca manualmente nei documenti bancari."
    }


@router.post("/riconcilia")
async def riconcilia_verbali_endpoint() -> Dict[str, Any]:
    """
    Tenta di riconciliare tutti i verbali con l'estratto conto.
    """
    from app.services.verbali_service import riconcilia_verbali
    
    try:
        risultato = await riconcilia_verbali()
        return {
            "success": True,
            "message": "Riconciliazione completata",
            **risultato
        }
    except Exception as e:
        logger.error(f"Errore riconciliazione: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risolvi-sospeso")
async def risolvi_sospeso_endpoint(
    riferimento: str,
    movimento_id: str
) -> Dict[str, Any]:
    """
    Risolve un'operazione sospesa associandola manualmente a un movimento bancario.
    """
    from app.services.verbali_service import risolvi_operazione_sospesa
    
    success = await risolvi_operazione_sospesa(riferimento, movimento_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Operazione sospesa non trovata")
    
    return {
        "success": True,
        "message": f"Operazione {riferimento} risolta e associata al movimento {movimento_id}"
    }


@router.get("/dettaglio/{numero_verbale}")
async def get_dettaglio_verbale(numero_verbale: str) -> Dict[str, Any]:
    """
    Restituisce il dettaglio completo di un verbale con tutti i documenti associati.
    """
    from app.services.verbali_service import COLLECTION_VERBALI
    db = Database.get_db()
    
    # Cerca nel nuovo sistema
    verbale = await db[COLLECTION_VERBALI].find_one(
        {"numero_verbale": numero_verbale},
        {"_id": 0}
    )
    
    if not verbale:
        # Cerca nel vecchio sistema
        verbale = await db["verbali_noleggio"].find_one(
            {"numero_verbale": numero_verbale},
            {"_id": 0}
        )
    
    if not verbale:
        raise HTTPException(status_code=404, detail="Verbale non trovato")
    
    # Carica info aggiuntive
    risultato = {**verbale}
    
    # Carica info veicolo se presente
    if verbale.get("targa"):
        veicolo = await db["veicoli_noleggio"].find_one(
            {"targa": verbale["targa"]},
            {"_id": 0}
        )
        risultato["veicolo_info"] = veicolo
    
    # Carica fattura se presente
    if verbale.get("fattura_id"):
        fattura = await db["invoices"].find_one(
            {"id": verbale["fattura_id"]},
            {"_id": 0, "linee": 0}  # Escludi linee per non appesantire
        )
        risultato["fattura_info"] = fattura
    
    # Carica movimento bancario se riconciliato
    if verbale.get("movimento_banca_id"):
        movimento = await db["prima_nota_banca"].find_one(
            {"id": verbale["movimento_banca_id"]},
            {"_id": 0}
        )
        risultato["movimento_info"] = movimento
    
    # Carica PDF se disponibili
    pdf_list = verbale.get("pdf_allegati", [])
    if pdf_list:
        risultato["pdf_disponibili"] = [
            {"filename": p.get("filename"), "size": p.get("size"), "indice": i}
            for i, p in enumerate(pdf_list)
        ]
    
    return risultato

