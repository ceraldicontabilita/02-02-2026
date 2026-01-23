"""
Suppliers Import - Import fornitori da Excel e sincronizzazione.
"""
from fastapi import APIRouter, HTTPException, File, UploadFile
from typing import Dict, Any, List
from datetime import datetime
import logging
import io
import uuid

from app.database import Database, Collections

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/import-excel")
async def import_suppliers_excel(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Importa fornitori da file Excel (.xls, .xlsx)."""
    import pandas as pd
    
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File deve essere .xls o .xlsx")
    
    db = Database.get_db()
    
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    
    col_mapping = {
        'denominazione': ['Denominazione', 'denominazione', 'Ragione Sociale', 'Nome'],
        'partita_iva': ['Partita Iva', 'partita_iva', 'P.IVA', 'Partita IVA'],
        'codice_fiscale': ['Codice Fiscale', 'codice_fiscale', 'CF'],
        'email': ['Email', 'email', 'E-mail'],
        'pec': ['PEC', 'pec'],
        'telefono': ['Telefono', 'telefono', 'Tel'],
        'indirizzo': ['Indirizzo', 'indirizzo'],
        'cap': ['CAP', 'cap'],
        'comune': ['Comune', 'comune', 'Città'],
        'provincia': ['Provincia', 'provincia', 'Prov'],
        'nazione': ['Nazione', 'nazione', 'ID Paese', 'Paese'],
    }
    
    def find_col(options):
        for opt in options:
            if opt in df.columns:
                return opt
        return None
    
    imported = 0
    updated = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            denom_col = find_col(col_mapping['denominazione'])
            piva_col = find_col(col_mapping['partita_iva'])
            
            denominazione = str(row.get(denom_col, '')).strip() if denom_col else ''
            partita_iva = str(row.get(piva_col, '')).strip() if piva_col else ''
            
            if not denominazione and not partita_iva:
                continue
            
            partita_iva = partita_iva.replace(' ', '').replace('.', '')
            if partita_iva.lower() == 'nan':
                partita_iva = ''
            
            supplier_data = {
                "denominazione": denominazione.strip('"'),
                "partita_iva": partita_iva,
                "codice_fiscale": str(row.get(find_col(col_mapping['codice_fiscale']), '') or '').strip() if find_col(col_mapping['codice_fiscale']) else '',
                "email": str(row.get(find_col(col_mapping['email']), '') or '').strip() if find_col(col_mapping['email']) else '',
                "pec": str(row.get(find_col(col_mapping['pec']), '') or '').strip() if find_col(col_mapping['pec']) else '',
                "telefono": str(row.get(find_col(col_mapping['telefono']), '') or '').strip() if find_col(col_mapping['telefono']) else '',
                "indirizzo": str(row.get(find_col(col_mapping['indirizzo']), '') or '').strip() if find_col(col_mapping['indirizzo']) else '',
                "cap": str(row.get(find_col(col_mapping['cap']), '') or '').strip() if find_col(col_mapping['cap']) else '',
                "comune": str(row.get(find_col(col_mapping['comune']), '') or '').strip() if find_col(col_mapping['comune']) else '',
                "provincia": str(row.get(find_col(col_mapping['provincia']), '') or '').strip() if find_col(col_mapping['provincia']) else '',
                "nazione": str(row.get(find_col(col_mapping['nazione']), 'IT') or 'IT').strip() if find_col(col_mapping['nazione']) else 'IT',
                "attivo": True,
                "metodo_pagamento": "bonifico",
                "updated_at": datetime.utcnow().isoformat()
            }
            
            for k, v in supplier_data.items():
                if str(v).lower() == 'nan' or v == 'None':
                    supplier_data[k] = ''
            
            existing = None
            if partita_iva:
                existing = await db[Collections.SUPPLIERS].find_one({"partita_iva": partita_iva})
            if not existing and denominazione:
                existing = await db[Collections.SUPPLIERS].find_one({"denominazione": denominazione})
            
            if existing:
                update_data = {k: v for k, v in supplier_data.items() if v}
                await db[Collections.SUPPLIERS].update_one({"_id": existing["_id"]}, {"$set": update_data})
                updated += 1
            else:
                supplier_data["id"] = str(uuid.uuid4())
                supplier_data["created_at"] = datetime.utcnow().isoformat()
                await db[Collections.SUPPLIERS].insert_one(supplier_data.copy())
                imported += 1
                
        except Exception as e:
            errors.append(f"Riga {idx + 2}: {str(e)}")
    
    return {"success": True, "imported": imported, "updated": updated, "errors": errors[:20]}


@router.post("/upload-excel")
async def upload_suppliers_excel(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Alias per import-excel."""
    return await import_suppliers_excel(file)


@router.post("/sync-from-invoices")
async def sync_suppliers_from_invoices() -> Dict[str, Any]:
    """Sincronizza fornitori dalle fatture importate."""
    db = Database.get_db()
    
    pipeline = [
        {"$match": {"$or": [
            {"cedente_piva": {"$exists": True, "$ne": None, "$ne": ""}},
            {"supplier_vat": {"$exists": True, "$ne": None, "$ne": ""}}
        ]}},
        {"$group": {
            "_id": {"$ifNull": ["$cedente_piva", "$supplier_vat"]},
            "denominazione": {"$first": {"$ifNull": ["$cedente_denominazione", "$supplier_name"]}},
            "indirizzo": {"$first": "$cedente_indirizzo"},
            "cap": {"$first": "$cedente_cap"},
            "comune": {"$first": "$cedente_comune"},
            "fatture_count": {"$sum": 1}
        }}
    ]
    
    fornitori_fatture = await db["invoices"].aggregate(pipeline, allowDiskUse=True).to_list(None)
    
    creati = 0
    aggiornati = 0
    
    for f in fornitori_fatture:
        piva = f.get("_id")
        if not piva:
            continue
        
        existing = await db[Collections.SUPPLIERS].find_one({"partita_iva": piva})
        
        if existing:
            if f.get("fatture_count", 0) > existing.get("fatture_count", 0):
                await db[Collections.SUPPLIERS].update_one(
                    {"partita_iva": piva},
                    {"$set": {"fatture_count": f.get("fatture_count"), "updated_at": datetime.utcnow().isoformat()}}
                )
                aggiornati += 1
        else:
            nuovo = {
                "id": str(uuid.uuid4()),
                "partita_iva": piva,
                "denominazione": f.get("denominazione", ""),
                "ragione_sociale": f.get("denominazione", ""),
                "indirizzo": f.get("indirizzo", ""),
                "cap": f.get("cap", ""),
                "comune": f.get("comune", ""),
                "fatture_count": f.get("fatture_count", 0),
                "metodo_pagamento": "bonifico",
                "attivo": True,
                "created_at": datetime.utcnow().isoformat()
            }
            await db[Collections.SUPPLIERS].insert_one(nuovo)
            creati += 1
    
    return {"success": True, "fornitori_fatture": len(fornitori_fatture), "creati": creati, "aggiornati": aggiornati}
