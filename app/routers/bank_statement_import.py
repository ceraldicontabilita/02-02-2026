"""
Bank Statement Import Router - Import estratto conto bancario.
Parsa PDF/Excel/CSV estratto conto e riconcilia con Prima Nota Banca.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import logging
import io
import re

from app.database import Database

logger = logging.getLogger(__name__)
router = APIRouter()

# Collections
COLLECTION_PRIMA_NOTA_BANCA = "prima_nota_banca"
COLLECTION_BANK_STATEMENTS = "bank_statements_imported"


def parse_italian_amount(amount_str: str) -> float:
    """Converte importo italiano (es. -704,7 o 1.530,9) in float."""
    if not amount_str:
        return 0.0
    amount_str = str(amount_str).strip()
    # Rimuovi simbolo valuta
    amount_str = amount_str.replace("€", "").replace("EUR", "").strip()
    # Rimuovi punti come separatore migliaia
    amount_str = amount_str.replace(".", "")
    # Sostituisci virgola con punto per decimali
    amount_str = amount_str.replace(",", ".")
    try:
        return float(amount_str)
    except:
        return 0.0


def parse_italian_date(date_str: str) -> str:
    """Converte data italiana (gg/mm/aaaa) in formato ISO (YYYY-MM-DD)."""
    if not date_str:
        return ""
    try:
        date_str = str(date_str).strip()
        if "/" in date_str:
            parts = date_str.split("/")
            if len(parts) == 3:
                day, month, year = parts
                if len(year) == 2:
                    year = "20" + year
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        elif "-" in date_str and len(date_str) >= 10:
            return date_str[:10]
        return date_str
    except:
        return date_str


def extract_movements_from_pdf(content: bytes) -> List[Dict[str, Any]]:
    """Estrae movimenti da PDF estratto conto."""
    import pdfplumber
    
    movements = []
    
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            # Extract tables
            tables = page.extract_tables()
            for table in tables:
                if not table:
                    continue
                
                # Skip header rows
                for row in table:
                    if not row or len(row) < 3:
                        continue
                    
                    row_text = ' '.join([str(c) if c else '' for c in row]).upper()
                    
                    # Skip header rows
                    if any(h in row_text for h in ['DATA', 'VALUTA', 'DESCRIZIONE', 'SALDO', 'CAUSALE']):
                        continue
                    
                    movement = parse_table_row(row)
                    if movement:
                        movements.append(movement)
            
            # Also extract text for line-by-line parsing
            text = page.extract_text()
            if text:
                text_movements = parse_text_movements(text)
                movements.extend(text_movements)
    
    return movements


def parse_table_row(row: List[Any]) -> Optional[Dict[str, Any]]:
    """Parsa una riga di tabella estratto conto."""
    if not row or len(row) < 3:
        return None
    
    # Common PDF table formats:
    # Format 1: [Data Contabile, Data Valuta, Descrizione, Dare/Avere, Saldo]
    # Format 2: [Data, Descrizione, Entrate, Uscite, Saldo]
    # Format 3: [Data, Causale, Descrizione, Importo]
    
    data = None
    descrizione = ""
    importo = 0.0
    tipo = "uscita"
    
    for idx, cell in enumerate(row):
        if not cell:
            continue
        cell_str = str(cell).strip()
        
        # Try to find date
        if not data:
            date_match = re.search(r'(\d{2}/\d{2}/\d{2,4})', cell_str)
            if date_match:
                data = parse_italian_date(date_match.group(1))
                continue
        
        # Try to find amount (negative or positive)
        amount_match = re.search(r'^-?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$', cell_str.replace(' ', ''))
        if amount_match:
            parsed_amount = parse_italian_amount(cell_str)
            if abs(parsed_amount) > 0:
                if parsed_amount < 0 or '-' in cell_str:
                    tipo = "uscita"
                    importo = abs(parsed_amount)
                else:
                    tipo = "entrata"
                    importo = parsed_amount
                continue
        
        # Assume it's description
        if len(cell_str) > 5 and not cell_str.replace('.', '').replace(',', '').isdigit():
            descrizione = (descrizione + " " + cell_str).strip()[:200]
    
    if data and importo > 0:
        return {
            "data": data,
            "descrizione": descrizione or "Movimento estratto conto",
            "importo": importo,
            "tipo": tipo
        }
    
    return None


def parse_text_movements(text: str) -> List[Dict[str, Any]]:
    """Parsa movimenti da testo estratto conto."""
    movements = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 10:
            continue
        
        # Skip headers
        if any(h in line.upper() for h in ['DATA CONTABILE', 'DATA VALUTA', 'SALDO INIZIALE', 'SALDO FINALE']):
            continue
        
        # Try to find date and amount in same line
        date_match = re.search(r'(\d{2}/\d{2}/\d{2,4})', line)
        amount_match = re.search(r'(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*$', line)
        
        if date_match and amount_match:
            data = parse_italian_date(date_match.group(1))
            importo_str = amount_match.group(1)
            importo = parse_italian_amount(importo_str)
            
            if abs(importo) > 0:
                # Extract description (between date and amount)
                start = date_match.end()
                end = amount_match.start()
                descrizione = line[start:end].strip()[:200]
                
                tipo = "uscita" if importo < 0 or '-' in importo_str else "entrata"
                
                movements.append({
                    "data": data,
                    "descrizione": descrizione or "Movimento estratto conto",
                    "importo": abs(importo),
                    "tipo": tipo
                })
    
    return movements


def extract_movements_from_excel(content: bytes, filename: str) -> List[Dict[str, Any]]:
    """Estrae movimenti da Excel/CSV estratto conto."""
    import pandas as pd
    
    movements = []
    
    try:
        if filename.lower().endswith('.csv'):
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(content), sep=';', encoding=encoding)
                    break
                except:
                    continue
        elif filename.lower().endswith('.xls'):
            df = pd.read_excel(io.BytesIO(content), engine='xlrd')
        else:
            df = pd.read_excel(io.BytesIO(content), engine='openpyxl')
        
        # Normalize column names
        df.columns = df.columns.str.lower().str.strip()
        
        # Find relevant columns
        date_cols = [c for c in df.columns if any(d in c for d in ['data', 'date', 'valuta'])]
        desc_cols = [c for c in df.columns if any(d in c for d in ['descrizione', 'causale', 'description', 'operazione'])]
        amount_cols = [c for c in df.columns if any(a in c for a in ['importo', 'amount', 'dare', 'avere', 'entrate', 'uscite'])]
        
        for idx, row in df.iterrows():
            try:
                # Get date
                data = None
                for col in date_cols:
                    val = row.get(col)
                    if pd.notna(val):
                        if isinstance(val, datetime):
                            data = val.strftime("%Y-%m-%d")
                        else:
                            data = parse_italian_date(str(val))
                        if data:
                            break
                
                if not data:
                    continue
                
                # Get description
                descrizione = ""
                for col in desc_cols:
                    val = row.get(col)
                    if pd.notna(val):
                        descrizione = str(val)[:200]
                        break
                
                # Get amount and type
                importo = 0.0
                tipo = "uscita"
                
                # Try specific columns first
                for col in amount_cols:
                    val = row.get(col)
                    if pd.notna(val):
                        parsed = parse_italian_amount(str(val))
                        if abs(parsed) > 0:
                            if 'uscite' in col or 'dare' in col:
                                tipo = "uscita"
                            elif 'entrate' in col or 'avere' in col:
                                tipo = "entrata"
                            elif parsed < 0:
                                tipo = "uscita"
                            else:
                                tipo = "entrata"
                            importo = abs(parsed)
                            break
                
                if data and importo > 0:
                    movements.append({
                        "data": data,
                        "descrizione": descrizione or f"Movimento del {data}",
                        "importo": importo,
                        "tipo": tipo
                    })
                    
            except Exception as e:
                logger.warning(f"Error parsing row {idx}: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Error parsing Excel/CSV: {e}")
    
    return movements


async def reconcile_movement(db, movement: Dict[str, Any], tolerance: float = 0.01) -> Optional[Dict[str, Any]]:
    """Riconcilia un movimento con Prima Nota Banca."""
    data = movement["data"]
    importo = movement["importo"]
    tipo = movement["tipo"]
    
    # Search in Prima Nota Banca with same date, type and similar amount
    query = {
        "data": data,
        "tipo": tipo,
        "importo": {"$gte": importo * (1 - tolerance), "$lte": importo * (1 + tolerance)},
        "riconciliato": {"$ne": True}
    }
    
    match = await db[COLLECTION_PRIMA_NOTA_BANCA].find_one(query)
    
    if match:
        # Mark as reconciled
        await db[COLLECTION_PRIMA_NOTA_BANCA].update_one(
            {"id": match["id"]},
            {"$set": {
                "riconciliato": True,
                "data_riconciliazione": datetime.utcnow().isoformat(),
                "estratto_conto_ref": movement.get("descrizione", "")[:100]
            }}
        )
        return {
            "movimento_id": match["id"],
            "descrizione": match.get("descrizione", ""),
            "importo": match.get("importo", 0)
        }
    
    return None


@router.post("/import")
async def import_bank_statement(
    file: UploadFile = File(...),
    auto_reconcile: bool = Query(True, description="Riconcilia automaticamente con Prima Nota")
) -> Dict[str, Any]:
    """
    Importa estratto conto bancario e riconcilia con Prima Nota Banca.
    
    Supporta formati: PDF, Excel (.xlsx, .xls), CSV
    
    Returns:
        - Movimenti estratti
        - Movimenti riconciliati
        - Movimenti non trovati in Prima Nota
    """
    filename = file.filename.lower()
    if not filename.endswith(('.pdf', '.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato non supportato. Usa PDF, Excel o CSV.")
    
    content = await file.read()
    
    # Extract movements based on file type
    movements = []
    
    try:
        if filename.endswith('.pdf'):
            movements = extract_movements_from_pdf(content)
        else:
            movements = extract_movements_from_excel(content, filename)
    except Exception as e:
        logger.error(f"Error extracting movements: {e}")
        raise HTTPException(status_code=500, detail=f"Errore parsing file: {str(e)}")
    
    if not movements:
        return {
            "success": False,
            "message": "Nessun movimento trovato nel file",
            "movements_found": 0,
            "movements": []
        }
    
    # Remove duplicates
    seen = set()
    unique_movements = []
    for m in movements:
        key = f"{m['data']}_{m['tipo']}_{m['importo']:.2f}"
        if key not in seen:
            seen.add(key)
            unique_movements.append(m)
    
    movements = unique_movements
    
    db = Database.get_db()
    now = datetime.utcnow().isoformat()
    
    results = {
        "success": True,
        "filename": file.filename,
        "movements_found": len(movements),
        "reconciled": 0,
        "not_found": 0,
        "movements": [],
        "reconciled_details": [],
        "not_found_details": []
    }
    
    # Save imported statement
    statement_id = str(uuid.uuid4())
    statement_record = {
        "id": statement_id,
        "filename": file.filename,
        "import_date": now,
        "movements_count": len(movements),
        "created_at": now
    }
    await db[COLLECTION_BANK_STATEMENTS].insert_one(statement_record)
    
    # Process each movement
    for movement in movements:
        movement["id"] = str(uuid.uuid4())
        movement["statement_id"] = statement_id
        movement["source"] = "estratto_conto_import"
        movement["created_at"] = now
        
        if auto_reconcile:
            match = await reconcile_movement(db, movement)
            if match:
                movement["riconciliato"] = True
                movement["prima_nota_match"] = match
                results["reconciled"] += 1
                results["reconciled_details"].append({
                    "estratto_conto": {
                        "data": movement["data"],
                        "descrizione": movement["descrizione"][:50],
                        "importo": movement["importo"],
                        "tipo": movement["tipo"]
                    },
                    "prima_nota": match
                })
            else:
                movement["riconciliato"] = False
                results["not_found"] += 1
                results["not_found_details"].append({
                    "data": movement["data"],
                    "descrizione": movement["descrizione"][:50],
                    "importo": movement["importo"],
                    "tipo": movement["tipo"]
                })
        
        results["movements"].append({
            "data": movement["data"],
            "descrizione": movement["descrizione"][:50],
            "importo": movement["importo"],
            "tipo": movement["tipo"],
            "riconciliato": movement.get("riconciliato", False)
        })
    
    # Summary message
    if results["reconciled"] > 0:
        results["message"] = f"Importati {len(movements)} movimenti. Riconciliati: {results['reconciled']}, Non trovati: {results['not_found']}"
    else:
        results["message"] = f"Importati {len(movements)} movimenti. Nessuna corrispondenza trovata in Prima Nota."
    
    return results


@router.get("/stats")
async def get_import_stats() -> Dict[str, Any]:
    """Statistiche importazioni estratto conto."""
    db = Database.get_db()
    
    # Count imported statements
    statements_count = await db[COLLECTION_BANK_STATEMENTS].count_documents({})
    
    # Count Prima Nota movements
    total_banca = await db[COLLECTION_PRIMA_NOTA_BANCA].count_documents({})
    riconciliati = await db[COLLECTION_PRIMA_NOTA_BANCA].count_documents({"riconciliato": True})
    
    return {
        "estratti_conto_importati": statements_count,
        "movimenti_banca_totali": total_banca,
        "movimenti_riconciliati": riconciliati,
        "movimenti_non_riconciliati": total_banca - riconciliati,
        "percentuale_riconciliazione": round((riconciliati / total_banca * 100) if total_banca > 0 else 0, 1)
    }


@router.post("/riconcilia-manuale")
async def manual_reconcile(
    estratto_conto_movimento_id: str = Query(..., description="ID movimento estratto conto"),
    prima_nota_movimento_id: str = Query(..., description="ID movimento Prima Nota Banca")
) -> Dict[str, Any]:
    """Riconcilia manualmente un movimento estratto conto con Prima Nota."""
    db = Database.get_db()
    
    # Update Prima Nota Banca
    result = await db[COLLECTION_PRIMA_NOTA_BANCA].update_one(
        {"id": prima_nota_movimento_id},
        {"$set": {
            "riconciliato": True,
            "data_riconciliazione": datetime.utcnow().isoformat(),
            "estratto_conto_ref": estratto_conto_movimento_id
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Movimento Prima Nota non trovato")
    
    return {
        "success": True,
        "message": "Riconciliazione completata",
        "prima_nota_id": prima_nota_movimento_id,
        "estratto_conto_id": estratto_conto_movimento_id
    }
