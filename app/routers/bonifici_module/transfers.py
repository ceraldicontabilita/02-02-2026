"""
Bonifici Module - CRUD operazioni sui bonifici.
"""
from fastapi import HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
import io
import csv

from app.database import Database
from .common import UPLOAD_DIR, COL_TRANSFERS, logger


async def list_transfers(
    job_id: Optional[str] = None,
    search: Optional[str] = None,
    ordinante: Optional[str] = None,
    beneficiario: Optional[str] = None,
    year: Optional[str] = None,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    """Lista bonifici con filtri."""
    db = Database.get_db()
    
    query: Dict[str, Any] = {}
    if job_id:
        query['job_id'] = job_id
    
    ands = []
    if search:
        ands.append({'$or': [
            {'ordinante.nome': {'$regex': search, '$options': 'i'}},
            {'beneficiario.nome': {'$regex': search, '$options': 'i'}},
            {'causale': {'$regex': search, '$options': 'i'}},
            {'cro_trn': {'$regex': search, '$options': 'i'}},
        ]})
    if ordinante:
        ands.append({'ordinante.nome': {'$regex': ordinante, '$options': 'i'}})
    if beneficiario:
        ands.append({'beneficiario.nome': {'$regex': beneficiario, '$options': 'i'}})
    if year:
        ands.append({'data': {'$regex': f'^{year}-'}})
    
    if ands:
        query['$and'] = ands
    
    transfers = await db.bonifici_transfers.find(query, {'_id': 0}).sort('data', -1).to_list(limit)
    return transfers


async def count_transfers(job_id: Optional[str] = None) -> Dict[str, int]:
    """Conta bonifici totali."""
    db = Database.get_db()
    query = {'job_id': job_id} if job_id else {}
    count = await db.bonifici_transfers.count_documents(query)
    return {'count': count}


async def transfers_summary() -> Dict[str, Any]:
    """Riepilogo per anno."""
    db = Database.get_db()
    
    pipeline = [
        {'$addFields': {'year': {'$substr': ['$data', 0, 4]}}},
        {'$group': {
            '_id': '$year',
            'count': {'$sum': 1},
            'total': {'$sum': '$importo'}
        }},
        {'$sort': {'_id': -1}}
    ]
    
    results = await db.bonifici_transfers.aggregate(pipeline).to_list(100)
    return {r['_id']: {'count': r['count'], 'total': round(r['total'] or 0, 2)} for r in results if r['_id']}


async def delete_transfer(transfer_id: str) -> Dict[str, bool]:
    """Elimina un bonifico."""
    db = Database.get_db()
    result = await db.bonifici_transfers.delete_one({'id': transfer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Transfer not found')
    return {'deleted': True}


async def get_bonifico_pdf(transfer_id: str) -> StreamingResponse:
    """Restituisce il PDF originale del bonifico se disponibile."""
    db = Database.get_db()
    
    bonifico = await db.bonifici_transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not bonifico:
        raise HTTPException(status_code=404, detail="Bonifico non trovato")
    
    source_file = bonifico.get("source_file", "")
    job_id = bonifico.get("job_id", "")
    
    if not source_file:
        raise HTTPException(status_code=404, detail="File PDF non disponibile per questo bonifico")
    
    possible_paths = [
        UPLOAD_DIR / job_id / source_file,
        UPLOAD_DIR / source_file,
        Path(f"/tmp/bonifici_uploads/{job_id}/{source_file}"),
    ]
    
    pdf_path = None
    for p in possible_paths:
        if p.exists():
            pdf_path = p
            break
    
    if not pdf_path:
        raise HTTPException(
            status_code=404, 
            detail="Il file PDF originale non è più disponibile. I file vengono rimossi dopo l'elaborazione."
        )
    
    return StreamingResponse(
        open(pdf_path, "rb"),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{source_file}"'}
    )


async def bulk_delete(job_id: Optional[str] = None) -> Dict[str, int]:
    """Elimina tutti i bonifici di un job."""
    db = Database.get_db()
    query = {'job_id': job_id} if job_id else {}
    result = await db.bonifici_transfers.delete_many(query)
    return {'deleted': result.deleted_count}


async def update_transfer(transfer_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Aggiorna un bonifico."""
    db = Database.get_db()
    
    bonifico = await db.bonifici_transfers.find_one({"id": transfer_id})
    if not bonifico:
        raise HTTPException(status_code=404, detail="Bonifico non trovato")
    
    update_fields = {}
    allowed_fields = ["causale", "importo", "data", "note", "categoria", 
                      "salario_associato", "operazione_salario_id",
                      "fattura_associata", "fattura_id"]
    
    for field in allowed_fields:
        if field in data:
            update_fields[field] = data[field]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.bonifici_transfers.update_one({"id": transfer_id}, {"$set": update_fields})
    
    return {"success": True, "updated": list(update_fields.keys())}


async def export_transfers(
    format: str = 'xlsx',
    job_id: Optional[str] = None
) -> StreamingResponse:
    """Esporta bonifici in CSV o XLSX."""
    db = Database.get_db()
    query = {'job_id': job_id} if job_id else {}
    transfers = await db.bonifici_transfers.find(query, {'_id': 0}).to_list(10000)
    
    if format == 'csv':
        buf = io.StringIO()
        w = csv.writer(buf, delimiter=';')
        headers = ['data', 'importo', 'valuta', 'ordinante', 'ordinante_iban', 'beneficiario', 'beneficiario_iban', 'causale', 'cro_trn']
        w.writerow(headers)
        for t in transfers:
            ord_data = t.get('ordinante') or {}
            ben_data = t.get('beneficiario') or {}
            d = t.get('data', '')
            if isinstance(d, datetime):
                d = d.strftime('%Y-%m-%d')
            w.writerow([
                d,
                t.get('importo', ''),
                t.get('valuta', 'EUR'),
                ord_data.get('nome', ''),
                ord_data.get('iban', ''),
                ben_data.get('nome', ''),
                ben_data.get('iban', ''),
                t.get('causale', ''),
                t.get('cro_trn', '')
            ])
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type='text/csv',
            headers={'Content-Disposition': 'attachment; filename=bonifici_export.csv'}
        )
    else:
        try:
            import pandas as pd
            from io import BytesIO
        except ImportError:
            raise HTTPException(status_code=500, detail="pandas non installato")
        
        rows = []
        for t in transfers:
            ord_data = t.get('ordinante') or {}
            ben_data = t.get('beneficiario') or {}
            d = t.get('data', '')
            if isinstance(d, datetime):
                d = d.strftime('%Y-%m-%d')
            rows.append({
                'data': d,
                'importo': t.get('importo'),
                'valuta': t.get('valuta', 'EUR'),
                'ordinante': ord_data.get('nome', ''),
                'ordinante_iban': ord_data.get('iban', ''),
                'beneficiario': ben_data.get('nome', ''),
                'beneficiario_iban': ben_data.get('iban', ''),
                'causale': t.get('causale', ''),
                'cro_trn': t.get('cro_trn', '')
            })
        
        df = pd.DataFrame(rows)
        output = BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': 'attachment; filename=bonifici_export.xlsx'}
        )
