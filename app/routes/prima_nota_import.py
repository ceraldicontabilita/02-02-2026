# Prima Nota Import Routes - Clean Implementation
# /app/backend/routes/prima_nota_import.py
#
# LOGICA MEMORIZZATA:
# - CORRISPETTIVO = PagatoContanti + PagatoElettronico (dal blocco <Totali>)
# - NON usare: Ammontare, ImportoParziale, ImportoTotale (sono per aliquota IVA)
# - POS XML vanno in pos_xml_data per il confronto
# - Tutti i dati vanno su MongoDB Atlas

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime, timezone
from uuid import uuid4
from io import BytesIO
import pandas as pd
import zipfile
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prima-nota", tags=["Prima Nota Import"])

# Database reference (set from server.py - MUST be Atlas)
db = None

def set_database(database):
    global db
    db = database

def get_current_user():
    """Returns admin user - in production use proper auth"""
    return "admin"


# ============= CORRISPETTIVI XML =============
@router.post("/import-corrispettivi")
async def import_corrispettivi_xml(
    file: UploadFile = File(...),
    username: str = Depends(get_current_user)
):
    """
    Import corrispettivi from ZIP file containing XML files.
    
    LOGICA CORRETTA:
    - CORRISPETTIVO = PagatoContanti + PagatoElettronico
    - Salva in cash_movements come ENTRATA
    - Salva pagato_elettronico in pos_xml_data per confronto POS
    - Chiave duplicati: progressivo
    """
    try:
        contents = await file.read()
        
        if not file.filename.lower().endswith('.zip'):
            raise HTTPException(status_code=400, detail="Formato non supportato. Carica un file ZIP.")
        
        added = 0
        skipped = 0
        total_amount = 0
        skipped_details = []
        
        with zipfile.ZipFile(BytesIO(contents), 'r') as zf:
            xml_files = [f for f in zf.namelist() if f.endswith('.xml')]
            
            for xml_name in xml_files:
                try:
                    xml_content = zf.read(xml_name).decode('utf-8', errors='ignore')
                    
                    # Extract Progressivo (unique ID)
                    progressivo = extract_xml_value(xml_content, 'Progressivo')
                    
                    # Extract date from DataOraRilevazione
                    date_match = re.search(r'<DataOraRilevazione>(\d{4}-\d{2}-\d{2})', xml_content)
                    date = date_match.group(1) if date_match else None
                    
                    # Extract device ID
                    device_id = extract_xml_value(xml_content, 'IdDispositivo') or 'N/A'
                    
                    # CORRISPETTIVO = PagatoContanti + PagatoElettronico
                    pagato_contanti = float(extract_xml_value(xml_content, 'PagatoContanti') or 0)
                    pagato_elettronico = float(extract_xml_value(xml_content, 'PagatoElettronico') or 0)
                    corrispettivo = pagato_contanti + pagato_elettronico
                    
                    # Get number of commercial documents
                    num_docs = int(extract_xml_value(xml_content, 'NumeroDocCommerciali') or 0)
                    
                    # Skip if no date or zero amount
                    if not date or corrispettivo == 0:
                        reason = "Data mancante" if not date else "Corrispettivo zero"
                        skipped_details.append({"file": xml_name, "reason": reason})
                        skipped += 1
                        continue
                    
                    # Check duplicate by progressivo
                    if progressivo:
                        existing = await db.cash_movements.find_one({
                            "user_id": username,
                            "progressivo": progressivo,
                            "category": "Corrispettivo"
                        })
                        if existing:
                            skipped_details.append({"file": xml_name, "reason": "Duplicato", "progressivo": progressivo})
                            skipped += 1
                            continue
                    
                    # Insert CORRISPETTIVO as ENTRATA in cash_movements
                    movement = {
                        "id": str(uuid4()),
                        "user_id": username,
                        "date": date,
                        "amount": corrispettivo,
                        "category": "Corrispettivo",
                        "type": "entrata",
                        "description": f"Corrispettivo - {device_id}",
                        "source": "xml",
                        "progressivo": progressivo,
                        "device_id": device_id,
                        "pagato_contanti": pagato_contanti,
                        "pagato_elettronico": pagato_elettronico,
                        "num_documenti": num_docs,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.cash_movements.insert_one(movement)
                    
                    # Save POS XML data for comparison (pagato_elettronico only)
                    if pagato_elettronico > 0:
                        pos_xml_record = {
                            "id": str(uuid4()),
                            "user_id": username,
                            "date": date,
                            "amount": pagato_elettronico,
                            "device_id": device_id,
                            "progressivo": progressivo,
                            "source": "corrispettivo_xml",
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                        await db.pos_xml_data.insert_one(pos_xml_record)
                    
                    added += 1
                    total_amount += corrispettivo
                    
                except Exception as e:
                    logger.warning(f"Error parsing {xml_name}: {e}")
                    skipped_details.append({"file": xml_name, "reason": f"Errore: {str(e)[:50]}"})
                    skipped += 1
        
        response = {
            "message": f"Import completato: {added} corrispettivi aggiunti (€{total_amount:,.2f})",
            "added": added,
            "skipped": skipped,
            "total_amount": round(total_amount, 2)
        }
        
        if skipped_details:
            response["skipped_details"] = skipped_details[:20]
            if skipped > 0:
                response["message"] += f" - {skipped} saltati"
        
        return response
        
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="File ZIP non valido")
    except Exception as e:
        logger.error(f"Error importing corrispettivi: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============= POS EXCEL =============
@router.post("/import-pos")
async def import_pos_excel(
    file: UploadFile = File(...),
    username: str = Depends(get_current_user)
):
    """
    Import POS data from Excel.
    
    COLONNE SUPPORTATE: DATA, DATE, IMPORTO, AMOUNT, POS, TOTALE
    TIPO: uscita (i soldi escono dalla cassa verso il terminale POS)
    CHIAVE DUPLICATI: date + amount + category
    """
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        df.columns = [c.upper().strip() for c in df.columns]
        
        added = 0
        skipped = 0
        total_amount = 0
        skipped_details = []
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            
            # Get date
            date = None
            for col in ['DATA', 'DATE']:
                if col in df.columns and pd.notna(row.get(col)):
                    date_val = row[col]
                    if hasattr(date_val, 'strftime'):
                        date = date_val.strftime('%Y-%m-%d')
                    else:
                        date = str(date_val)[:10]
                    break
            
            # Get amount
            amount = 0
            for col in ['IMPORTO', 'AMOUNT', 'POS', 'TOTALE']:
                if col in df.columns and pd.notna(row.get(col)):
                    try:
                        amount = float(row[col])
                        break
                    except:
                        pass
            
            if not date or amount == 0:
                reason = "Data mancante" if not date else "Importo zero"
                skipped_details.append({"row": row_num, "reason": reason})
                skipped += 1
                continue
            
            # Check duplicate
            existing = await db.cash_movements.find_one({
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "POS"
            })
            if existing:
                skipped_details.append({"row": row_num, "reason": "Duplicato", "importo": amount})
                skipped += 1
                continue
            
            # POS is USCITA (money goes to POS terminal/bank)
            movement = {
                "id": str(uuid4()),
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "POS",
                "type": "uscita",
                "description": "POS",
                "source": "excel",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.cash_movements.insert_one(movement)
            added += 1
            total_amount += amount
        
        response = {
            "message": f"Import completato: {added} POS aggiunti (€{total_amount:,.2f})",
            "added": added,
            "skipped": skipped,
            "total_amount": round(total_amount, 2)
        }
        
        if skipped_details:
            response["skipped_details"] = skipped_details[:20]
        
        return response
        
    except Exception as e:
        logger.error(f"Error importing POS: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============= FATTURE CASSA EXCEL =============
@router.post("/import-fatture")
async def import_fatture_cassa(
    file: UploadFile = File(...),
    username: str = Depends(get_current_user)
):
    """
    Import invoices paid by cash from Excel.
    
    COLONNE: Data documento, Fornitore, Numero fattura, Totale documento, modalita
    TIPO: uscita
    CHIAVE DUPLICATI: date + invoice_number + amount
    """
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        df.columns = [c.strip() for c in df.columns]
        
        # Normalize column names
        col_map = {}
        for col in df.columns:
            col_lower = col.lower()
            if 'data' in col_lower and 'documento' in col_lower:
                col_map[col] = 'data'
            elif 'fornitore' in col_lower:
                col_map[col] = 'fornitore'
            elif 'numero' in col_lower and 'fattura' in col_lower:
                col_map[col] = 'numero'
            elif 'totale' in col_lower and 'documento' in col_lower:
                col_map[col] = 'totale'
            elif 'modalita' in col_lower or 'modalità' in col_lower:
                col_map[col] = 'modalita'
        
        df = df.rename(columns=col_map)
        
        # Filter only "cassa" if modalita column exists
        if 'modalita' in df.columns:
            df = df[df['modalita'].str.lower().str.strip() == 'cassa']
        
        added = 0
        skipped = 0
        total_amount = 0
        skipped_details = []
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            
            # Get amount
            amount = 0
            if 'totale' in df.columns and pd.notna(row.get('totale')):
                try:
                    amount = float(row['totale'])
                except:
                    pass
            
            fornitore = str(row.get('fornitore', ''))[:50] if pd.notna(row.get('fornitore')) else ''
            numero = str(row.get('numero', ''))[:30] if pd.notna(row.get('numero')) else ''
            
            if amount == 0:
                skipped_details.append({"row": row_num, "reason": "Importo zero", "fornitore": fornitore, "fattura": numero})
                skipped += 1
                continue
            
            # Get date
            date = datetime.now().strftime('%Y-%m-%d')
            if 'data' in df.columns and pd.notna(row.get('data')):
                date_val = row['data']
                if hasattr(date_val, 'strftime'):
                    date = date_val.strftime('%Y-%m-%d')
                else:
                    date = str(date_val)[:10]
            
            # Check duplicate
            existing = await db.cash_movements.find_one({
                "user_id": username,
                "date": date,
                "invoice_number": numero,
                "amount": amount,
                "category": "Fattura Cassa"
            })
            if existing:
                skipped_details.append({"row": row_num, "reason": "Duplicato", "fornitore": fornitore, "fattura": numero, "importo": amount})
                skipped += 1
                continue
            
            description = f"{fornitore} - Fatt. {numero}" if fornitore and numero else fornitore or f"Fattura {numero}" or "Fattura Cassa"
            
            movement = {
                "id": str(uuid4()),
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "Fattura Cassa",
                "type": "uscita",
                "description": description[:100],
                "supplier": fornitore,
                "invoice_number": numero,
                "source": "excel",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.cash_movements.insert_one(movement)
            added += 1
            total_amount += amount
        
        response = {
            "message": f"Import completato: {added} fatture aggiunte (€{total_amount:,.2f})",
            "added": added,
            "skipped": skipped,
            "total_amount": round(total_amount, 2)
        }
        
        if skipped_details:
            response["skipped_details"] = skipped_details[:20]
            response["message"] += f" - {skipped} righe saltate"
        
        return response
        
    except Exception as e:
        logger.error(f"Error importing fatture: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============= VERSAMENTI EXCEL/CSV =============
@router.post("/import-versamenti")
async def import_versamenti(
    file: UploadFile = File(...),
    username: str = Depends(get_current_user)
):
    """
    Import bank deposits from Excel or CSV.
    
    COLONNE: DATA, DATA CONTABILE, DATE, IMPORTO, AMOUNT, VERSAMENTO
    TIPO: uscita (soldi escono dalla cassa verso la banca)
    CHIAVE DUPLICATI: date + amount
    """
    try:
        contents = await file.read()
        
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(BytesIO(contents), sep=';', encoding='utf-8')
        else:
            df = pd.read_excel(BytesIO(contents))
        
        df.columns = [c.upper().strip() for c in df.columns]
        
        added = 0
        skipped = 0
        total_amount = 0
        skipped_details = []
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            
            # Get date
            date = None
            for col in ['DATA', 'DATA CONTABILE', 'DATE']:
                if col in df.columns and pd.notna(row.get(col)):
                    date_val = row[col]
                    if hasattr(date_val, 'strftime'):
                        date = date_val.strftime('%Y-%m-%d')
                    elif isinstance(date_val, str):
                        try:
                            date = datetime.strptime(date_val.strip(), '%d/%m/%Y').strftime('%Y-%m-%d')
                        except:
                            date = str(date_val)[:10]
                    break
            
            # Get amount
            amount = 0
            for col in ['IMPORTO', 'AMOUNT', 'VERSAMENTO']:
                if col in df.columns and pd.notna(row.get(col)):
                    try:
                        amount = float(row[col])
                        break
                    except:
                        pass
            
            if not date or amount == 0:
                reason = "Data mancante" if not date else "Importo zero"
                skipped_details.append({"row": row_num, "reason": reason})
                skipped += 1
                continue
            
            # Check duplicate
            existing = await db.cash_movements.find_one({
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "Versamento"
            })
            if existing:
                skipped_details.append({"row": row_num, "reason": "Duplicato", "importo": amount})
                skipped += 1
                continue
            
            # Versamento is USCITA (money goes from cash to bank)
            movement = {
                "id": str(uuid4()),
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "Versamento",
                "type": "uscita",
                "description": "Versamento Bancario",
                "source": "excel",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.cash_movements.insert_one(movement)
            added += 1
            total_amount += amount
        
        response = {
            "message": f"Import completato: {added} versamenti aggiunti (€{total_amount:,.2f})",
            "added": added,
            "skipped": skipped,
            "total_amount": round(total_amount, 2)
        }
        
        if skipped_details:
            response["skipped_details"] = skipped_details[:20]
        
        return response
        
    except Exception as e:
        logger.error(f"Error importing versamenti: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============= FINANZIAMENTO SOCI EXCEL =============
@router.post("/import-finanziamento")
async def import_finanziamento_soci(
    file: UploadFile = File(...),
    username: str = Depends(get_current_user)
):
    """
    Import partner financing from Excel.
    
    COLONNE: DATA, DATE, DATA OPERAZIONE, DATA MOVIMENTO, DATA CONTABILE,
             IMPORTO, AMOUNT, VERSAMENTO, ENTRATA, ENTRATE, DARE, VALORE,
             DESCRIZIONE, DESCRIPTION, NOTE, CAUSALE, DETTAGLIO
    TIPO: entrata
    CHIAVE DUPLICATI: date + amount
    """
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        original_cols = df.columns.tolist()
        logger.info(f"Finanziamento Soci - Colonne trovate: {original_cols}")
        
        df.columns = [c.upper().strip() for c in df.columns]
        
        added = 0
        skipped = 0
        total_amount = 0
        skipped_details = []
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            
            # Get date
            date = datetime.now().strftime('%Y-%m-%d')
            date_cols = ['DATA', 'DATE', 'DATA OPERAZIONE', 'DATA MOVIMENTO', 'DATA CONTABILE']
            for col in date_cols:
                if col in df.columns and pd.notna(row.get(col)):
                    date_val = row[col]
                    if hasattr(date_val, 'strftime'):
                        date = date_val.strftime('%Y-%m-%d')
                    elif isinstance(date_val, str):
                        try:
                            date = datetime.strptime(date_val.strip(), '%d/%m/%Y').strftime('%Y-%m-%d')
                        except:
                            date = str(date_val)[:10]
                    break
            
            # Get amount
            amount = 0
            amount_cols = ['IMPORTO', 'AMOUNT', 'VERSAMENTO', 'ENTRATA', 'ENTRATE', 'DARE', 'VALORE']
            for col in amount_cols:
                if col in df.columns and pd.notna(row.get(col)):
                    try:
                        val = row[col]
                        if isinstance(val, str):
                            val = val.replace('.', '').replace(',', '.')
                        amount = float(val)
                        if amount != 0:
                            break
                    except:
                        pass
            
            # Get description
            desc = "Finanziamento Soci"
            desc_cols = ['DESCRIZIONE', 'DESCRIPTION', 'NOTE', 'CAUSALE', 'DETTAGLIO']
            for col in desc_cols:
                if col in df.columns and pd.notna(row.get(col)):
                    desc = str(row[col])[:100]
                    break
            
            if amount == 0:
                skipped_details.append({"row": row_num, "reason": "Importo zero"})
                skipped += 1
                continue
            
            # Check duplicate
            existing = await db.cash_movements.find_one({
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "Finanziamento Soci"
            })
            if existing:
                skipped_details.append({"row": row_num, "reason": "Duplicato", "importo": amount})
                skipped += 1
                continue
            
            # Finanziamento Soci is ENTRATA
            movement = {
                "id": str(uuid4()),
                "user_id": username,
                "date": date,
                "amount": amount,
                "category": "Finanziamento Soci",
                "type": "entrata",
                "description": desc,
                "source": "excel",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.cash_movements.insert_one(movement)
            added += 1
            total_amount += amount
        
        response = {
            "message": f"Import completato: {added} movimenti aggiunti (€{total_amount:,.2f})",
            "added": added,
            "skipped": skipped,
            "total_amount": round(total_amount, 2),
            "colonne_trovate": original_cols
        }
        
        if skipped_details:
            response["skipped_details"] = skipped_details[:20]
            response["message"] += f" - {skipped} righe saltate"
        
        return response
        
    except Exception as e:
        logger.error(f"Error importing finanziamento: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============= HELPER FUNCTIONS =============
def extract_xml_value(xml_content: str, tag: str) -> str:
    """Extract value from XML tag"""
    match = re.search(f'<{tag}>([^<]+)</{tag}>', xml_content)
    return match.group(1) if match else None
