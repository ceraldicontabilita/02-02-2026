"""
Bank Statement PDF Parser Router
Parser per estratti conto BANCO BPM
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Dict, Any, List, Optional
import logging
import re
from datetime import datetime
import io

logger = logging.getLogger(__name__)
router = APIRouter()

# Mapping mesi italiano -> numero
MESI_IT = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
}

def parse_date(date_str: str) -> Optional[str]:
    """
    Converte data da formato DD/MM/YY a YYYY-MM-DD
    """
    if not date_str:
        return None
    try:
        # Rimuovi spazi
        date_str = date_str.strip()
        
        # Formato DD/MM/YY
        if re.match(r'^\d{2}/\d{2}/\d{2}$', date_str):
            parts = date_str.split('/')
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            # Assumi 2000+ per anni < 50, altrimenti 1900+
            full_year = 2000 + year if year < 50 else 1900 + year
            return f"{full_year}-{month:02d}-{day:02d}"
        
        # Formato DD.MM.YYYY
        if re.match(r'^\d{2}\.\d{2}\.\d{4}$', date_str):
            parts = date_str.split('.')
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            return f"{year}-{month:02d}-{day:02d}"
            
        return None
    except Exception as e:
        logger.warning(f"Errore parsing data '{date_str}': {e}")
        return None

def parse_amount(amount_str: str) -> Optional[float]:
    """
    Converte importo da formato italiano (1.234,56) a float
    """
    if not amount_str:
        return None
    try:
        # Rimuovi spazi
        amount_str = amount_str.strip()
        
        # Rimuovi simbolo euro e spazi
        amount_str = amount_str.replace('€', '').replace(' ', '')
        
        # Converti formato italiano (1.234,56 -> 1234.56)
        amount_str = amount_str.replace('.', '').replace(',', '.')
        
        return float(amount_str)
    except Exception as e:
        logger.warning(f"Errore parsing importo '{amount_str}': {e}")
        return None

def extract_transactions_from_text(text: str) -> List[Dict[str, Any]]:
    """
    Estrae le transazioni dal testo dell'estratto conto BANCO BPM
    
    Struttura attesa:
    DATA_CONTABILE DATA_VALUTA DATA_DISPONIBILE USCITE ENTRATE DESCRIZIONE
    """
    transactions = []
    lines = text.split('\n')
    
    # Pattern per identificare linee con transazioni
    # Formato: DD/MM/YY DD/MM/YY DD/MM/YY [importo] [importo] descrizione
    date_pattern = r'(\d{2}/\d{2}/\d{2})'
    amount_pattern = r'([\d.,]+(?:,\d{2})?)'
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Cerca linee che iniziano con una data
        date_match = re.match(r'^' + date_pattern, line)
        if date_match:
            # Prova ad estrarre una transazione
            transaction = extract_single_transaction(line, lines, i)
            if transaction:
                transactions.append(transaction)
        
        i += 1
    
    return transactions

def extract_single_transaction(line: str, all_lines: List[str], current_index: int) -> Optional[Dict[str, Any]]:
    """
    Estrae una singola transazione dalla linea
    """
    # Pattern più flessibile per BANCO BPM
    # Formato tipico: DD/MM/YY DD/MM/YY DD/MM/YY [uscita] [entrata] descrizione
    
    # Estrai tutte le date dalla linea
    dates = re.findall(r'\d{2}/\d{2}/\d{2}', line)
    
    if len(dates) < 2:
        return None
    
    # Estrai importi (formato italiano: 1.234,56 o 1234,56)
    # Pattern per importi con segno opzionale
    amounts = re.findall(r'-?[\d.]+,\d{2}', line)
    
    # Cerca la descrizione (tutto dopo gli importi o le date)
    # Rimuovi le date e gli importi dalla linea per ottenere la descrizione
    desc_line = line
    for date in dates:
        desc_line = desc_line.replace(date, '', 1)
    for amount in amounts:
        desc_line = desc_line.replace(amount, '', 1)
    
    # Pulisci la descrizione
    description = ' '.join(desc_line.split()).strip()
    
    # Se la descrizione è vuota, prova a prenderla dalla linea successiva
    if not description and current_index + 1 < len(all_lines):
        next_line = all_lines[current_index + 1].strip()
        # Verifica che non sia un'altra transazione
        if not re.match(r'^\d{2}/\d{2}/\d{2}', next_line):
            description = next_line
    
    # Determina uscita/entrata
    uscita = None
    entrata = None
    
    if amounts:
        for amt in amounts:
            parsed = parse_amount(amt)
            if parsed:
                if parsed < 0:
                    uscita = abs(parsed)
                else:
                    # In BANCO BPM, il primo importo è tipicamente uscita, il secondo entrata
                    if uscita is None and len(amounts) > 1:
                        uscita = parsed
                    else:
                        entrata = parsed
    
    # Verifica che ci sia almeno una data e un importo
    if len(dates) >= 2 and (uscita or entrata):
        return {
            "data_contabile": parse_date(dates[0]),
            "data_valuta": parse_date(dates[1]) if len(dates) > 1 else None,
            "data_disponibile": parse_date(dates[2]) if len(dates) > 2 else None,
            "uscita": uscita,
            "entrata": entrata,
            "descrizione": description[:500] if description else "Movimento",
            "raw_line": line[:200]
        }
    
    return None

def parse_banco_bpm_statement(text: str) -> Dict[str, Any]:
    """
    Parser specifico per estratti conto BANCO BPM
    """
    result = {
        "banca": "BANCO BPM",
        "tipo_documento": "ESTRATTO CONTO CORRENTE",
        "intestatario": None,
        "iban": None,
        "periodo_riferimento": None,
        "saldo_iniziale": None,
        "saldo_finale": None,
        "movimenti": [],
        "totale_entrate": 0,
        "totale_uscite": 0,
        "parse_warnings": []
    }
    
    # Estrai intestatario
    intestatario_match = re.search(r'Intestato a[:\s]+([A-Z][A-Z\s.]+(?:S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?A\.?S\.?|S\.?N\.?C\.?)?)[\n\r]', text, re.IGNORECASE)
    if intestatario_match:
        result["intestatario"] = intestatario_match.group(1).strip()
    
    # Estrai IBAN
    iban_match = re.search(r'(?:IBAN|Coordinate[^:]*)[:\s]*([A-Z]{2}\s*\d{2}\s*[A-Z\d\s]{20,})', text)
    if iban_match:
        result["iban"] = iban_match.group(1).replace(' ', '')
    
    # Estrai periodo riferimento
    periodo_match = re.search(r'AL\s+(\d{2}\.\d{2}\.\d{4})', text)
    if periodo_match:
        result["periodo_riferimento"] = parse_date(periodo_match.group(1))
    
    # Estrai saldo iniziale
    saldo_iniziale_match = re.search(r'SALDO\s+INIZIALE[^0-9]*([0-9.,]+)', text, re.IGNORECASE)
    if saldo_iniziale_match:
        result["saldo_iniziale"] = parse_amount(saldo_iniziale_match.group(1))
    
    # Estrai saldo finale
    saldo_finale_match = re.search(r'Saldo\s+(?:liquido\s+)?finale[^0-9]*([0-9.,]+)', text, re.IGNORECASE)
    if saldo_finale_match:
        result["saldo_finale"] = parse_amount(saldo_finale_match.group(1))
    
    # Estrai movimenti
    result["movimenti"] = extract_transactions_from_text(text)
    
    # Calcola totali
    for mov in result["movimenti"]:
        if mov.get("entrata"):
            result["totale_entrate"] += mov["entrata"]
        if mov.get("uscita"):
            result["totale_uscite"] += mov["uscita"]
    
    return result

@router.post(
    "/parse",
    summary="Parse bank statement PDF",
    description="Carica e analizza un PDF di estratto conto BANCO BPM"
)
async def parse_bank_statement(
    file: UploadFile = File(..., description="File PDF estratto conto")
) -> Dict[str, Any]:
    """
    Analizza un PDF di estratto conto bancario e restituisce i dati strutturati
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Il file deve essere un PDF")
    
    try:
        # Leggi il file
        content = await file.read()
        
        # Estrai testo dal PDF
        try:
            import fitz  # PyMuPDF
            
            pdf_document = fitz.open(stream=content, filetype="pdf")
            text = ""
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                text += page.get_text() + "\n"
            pdf_document.close()
            
        except ImportError:
            # Fallback a pdfplumber se PyMuPDF non è disponibile
            try:
                import pdfplumber
                
                pdf_file = io.BytesIO(content)
                with pdfplumber.open(pdf_file) as pdf:
                    text = ""
                    for page in pdf.pages:
                        text += page.extract_text() or ""
                        text += "\n"
            except ImportError:
                raise HTTPException(
                    status_code=500, 
                    detail="Nessuna libreria PDF disponibile. Installa PyMuPDF o pdfplumber."
                )
        
        # Parse del testo estratto
        result = parse_banco_bpm_statement(text)
        result["filename"] = file.filename
        result["pagine_totali"] = len(pdf_document) if 'pdf_document' in dir() else None
        
        return {
            "success": True,
            "data": result,
            "message": f"Estratte {len(result['movimenti'])} transazioni"
        }
        
    except Exception as e:
        logger.error(f"Errore parsing PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Errore parsing PDF: {str(e)}")

@router.post(
    "/import",
    summary="Import bank statement to Prima Nota",
    description="Importa le transazioni dell'estratto conto nella Prima Nota Banca"
)
async def import_bank_statement(
    file: UploadFile = File(...),
    anno: int = Query(..., description="Anno di riferimento"),
    auto_riconcilia: bool = Query(False, description="Riconcilia automaticamente con fatture")
) -> Dict[str, Any]:
    """
    Importa l'estratto conto nella Prima Nota Banca
    """
    from app.database import Database
    
    # Prima parsa il file
    parse_result = await parse_bank_statement(file)
    
    if not parse_result["success"]:
        raise HTTPException(status_code=400, detail="Errore nel parsing del PDF")
    
    data = parse_result["data"]
    movimenti = data.get("movimenti", [])
    
    if not movimenti:
        return {
            "success": False,
            "message": "Nessun movimento trovato nel documento",
            "imported": 0
        }
    
    db = Database.get_db()
    imported = 0
    skipped = 0
    errors = []
    
    for mov in movimenti:
        try:
            # Verifica se esiste già (basato su data e importo)
            data_contabile = mov.get("data_contabile")
            importo = mov.get("entrata") or mov.get("uscita")
            
            if not data_contabile or not importo:
                skipped += 1
                continue
            
            # Controlla duplicati
            existing = await db["prima_nota"].find_one({
                "data": data_contabile,
                "importo": importo,
                "tipo": "banca"
            })
            
            if existing:
                skipped += 1
                continue
            
            # Determina tipo movimento
            if mov.get("entrata"):
                tipo_movimento = "entrata"
                importo_finale = mov["entrata"]
            else:
                tipo_movimento = "uscita"
                importo_finale = mov["uscita"]
            
            # Crea il record prima nota
            prima_nota_record = {
                "data": data_contabile,
                "data_valuta": mov.get("data_valuta"),
                "tipo": "banca",
                "tipo_movimento": tipo_movimento,
                "importo": importo_finale,
                "descrizione": mov.get("descrizione", "Movimento importato"),
                "anno": anno,
                "mese": int(data_contabile.split('-')[1]) if data_contabile else None,
                "fonte": "estratto_conto_import",
                "filename_origine": data.get("filename"),
                "riconciliato": False,
                "created_at": datetime.utcnow().isoformat()
            }
            
            await db["prima_nota"].insert_one(prima_nota_record)
            imported += 1
            
        except Exception as e:
            errors.append(f"Errore movimento {mov.get('descrizione', 'N/A')}: {str(e)}")
    
    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "total": len(movimenti),
        "errors": errors[:10],  # Limita a 10 errori
        "saldo_iniziale": data.get("saldo_iniziale"),
        "saldo_finale": data.get("saldo_finale"),
        "totale_entrate": data.get("totale_entrate"),
        "totale_uscite": data.get("totale_uscite")
    }

@router.get(
    "/preview",
    summary="Preview parsed data",
    description="Mostra un'anteprima dei dati parsati senza salvare"
)
async def preview_statement() -> Dict[str, Any]:
    """
    Endpoint di test per verificare il parser
    """
    return {
        "message": "Usa POST /api/bank-statement/parse per caricare un PDF",
        "supported_banks": ["BANCO BPM"],
        "expected_format": "Estratto conto corrente ordinario PDF"
    }
