"""
Router per Download Completo Email e Gestione Documenti Non Associati
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from app.database import Database
from app.services.email_full_download import (
    EmailFullDownloader,
    get_documenti_non_associati,
    associate_pdf_to_document,
    smart_auto_associate,
    smart_auto_associate_v2,
    populate_payslips_pdf_data,
    get_documents_inbox_stats,
    sync_filesystem_pdfs_to_db,
    associate_f24_from_filesystem,
    CATEGORY_COLLECTIONS
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-download", tags=["Email Download"])

# Stato del download in corso
download_status = {
    "in_progress": False,
    "started_at": None,
    "stats": None,
    "error": None
}


@router.get("/status")
async def get_download_status() -> Dict[str, Any]:
    """Ottiene lo stato del download in corso."""
    return download_status


@router.post("/start-full-download")
async def start_full_download(
    background_tasks: BackgroundTasks,
    days_back: int = Query(default=365, description="Giorni indietro da scaricare"),
    folder: str = Query(default="INBOX", description="Cartella IMAP")
) -> Dict[str, Any]:
    """
    Avvia il download completo di tutte le email con PDF.
    Il processo viene eseguito in background.
    """
    global download_status
    
    if download_status["in_progress"]:
        raise HTTPException(status_code=400, detail="Download già in corso")
    
    download_status["in_progress"] = True
    download_status["started_at"] = datetime.now(timezone.utc).isoformat()
    download_status["stats"] = None
    download_status["error"] = None
    
    async def run_download():
        global download_status
        try:
            db = Database.get_db()
            downloader = EmailFullDownloader(db)
            result = await downloader.download_all_emails(
                folder=folder,
                days_back=days_back
            )
            download_status["stats"] = result.get("stats")
            if not result.get("success"):
                download_status["error"] = result.get("error")
        except Exception as e:
            logger.error(f"Errore download: {e}")
            download_status["error"] = str(e)
        finally:
            download_status["in_progress"] = False
    
    background_tasks.add_task(run_download)
    
    return {
        "message": "Download avviato in background",
        "days_back": days_back,
        "folder": folder
    }


@router.post("/download-single-day")
async def download_single_day(
    date: str = Query(..., description="Data nel formato YYYY-MM-DD")
) -> Dict[str, Any]:
    """
    Scarica email di un singolo giorno.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato data non valido. Usa YYYY-MM-DD")
    
    db = Database.get_db()
    downloader = EmailFullDownloader(db)
    result = await downloader.download_single_day(target_date)
    
    return result


@router.get("/documenti-non-associati")
async def list_documenti_non_associati(
    category: Optional[str] = Query(default=None, description="Filtra per categoria"),
    limit: int = Query(default=100, le=500)
) -> Dict[str, Any]:
    """
    Lista i documenti PDF scaricati ma non ancora associati.
    """
    db = Database.get_db()
    docs = await get_documenti_non_associati(db, category, limit)
    
    return {
        "count": len(docs),
        "documenti": docs
    }


@router.post("/associa-documento")
async def associa_documento(
    pdf_id: str,
    source_collection: str,
    target_document_id: str,
    target_collection: str
) -> Dict[str, Any]:
    """
    Associa manualmente un PDF a un documento esistente.
    """
    db = Database.get_db()
    
    success = await associate_pdf_to_document(
        db,
        pdf_id,
        source_collection,
        target_document_id,
        target_collection
    )
    
    if success:
        return {"success": True, "message": "PDF associato con successo"}
    else:
        raise HTTPException(status_code=400, detail="Associazione fallita")


@router.post("/auto-associa")
async def auto_associa_documenti() -> Dict[str, Any]:
    """
    Tenta di associare automaticamente i PDF ai documenti esistenti
    usando logica intelligente.
    """
    db = Database.get_db()
    stats = await smart_auto_associate(db)
    
    return {
        "success": True,
        "stats": stats
    }


@router.post("/auto-associa-v2")
async def auto_associa_documenti_v2() -> Dict[str, Any]:
    """
    Versione migliorata dell'auto-associazione che:
    1. Popola pdf_data nei payslips dal filesystem
    2. Associa documenti di documents_inbox
    3. Gestisce fatture, F24 e buste paga
    """
    db = Database.get_db()
    stats = await smart_auto_associate_v2(db)
    
    return {
        "success": True,
        "message": "Auto-associazione v2 completata",
        "stats": stats
    }


@router.post("/popola-pdf-payslips")
async def popola_pdf_payslips() -> Dict[str, Any]:
    """
    Popola il campo pdf_data in tutti i payslips che hanno filepath
    ma non hanno ancora pdf_data.
    """
    db = Database.get_db()
    stats = await populate_payslips_pdf_data(db)
    
    return {
        "success": True,
        "message": "Popolazione PDF payslips completata",
        "stats": stats
    }


@router.get("/documents-inbox-stats")
async def get_inbox_stats() -> Dict[str, Any]:
    """
    Statistiche dettagliate sulla collezione documents_inbox.
    """
    db = Database.get_db()
    stats = await get_documents_inbox_stats(db)
    
    return stats


@router.get("/statistiche")
async def get_statistiche_allegati() -> Dict[str, Any]:
    """
    Statistiche sui PDF scaricati e associati.
    """
    db = Database.get_db()
    stats = {}
    
    for category, collection in CATEGORY_COLLECTIONS.items():
        total = await db[collection].count_documents({})
        associati = await db[collection].count_documents({"associato": True})
        non_associati = await db[collection].count_documents({"associato": False})
        
        if total > 0:
            stats[category] = {
                "totale": total,
                "associati": associati,
                "non_associati": non_associati,
                "percentuale_associati": round(associati / total * 100, 1)
            }
    
    return stats


@router.get("/pdf/{collection}/{pdf_id}")
async def get_pdf_content(collection: str, pdf_id: str):
    """
    Recupera il contenuto di un PDF specifico.
    """
    from fastapi.responses import Response
    import base64
    
    db = Database.get_db()
    
    # Verifica che la collezione sia valida
    if collection not in CATEGORY_COLLECTIONS.values():
        raise HTTPException(status_code=400, detail="Collezione non valida")
    
    doc = await db[collection].find_one({"id": pdf_id})
    if not doc:
        raise HTTPException(status_code=404, detail="PDF non trovato")
    
    pdf_data = doc.get("pdf_data")
    if not pdf_data:
        raise HTTPException(status_code=404, detail="Contenuto PDF non disponibile")
    
    pdf_bytes = base64.b64decode(pdf_data)
    filename = doc.get("filename", "documento.pdf")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


@router.delete("/pulisci-duplicati")
async def pulisci_duplicati() -> Dict[str, Any]:
    """
    Rimuove i PDF duplicati basandosi sull'hash.
    """
    db = Database.get_db()
    deleted_count = 0
    
    for collection in CATEGORY_COLLECTIONS.values():
        # Trova hash duplicati
        pipeline = [
            {"$group": {
                "_id": "$pdf_hash",
                "count": {"$sum": 1},
                "ids": {"$push": "$id"}
            }},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        async for group in db[collection].aggregate(pipeline):
            # Mantieni il primo, elimina gli altri
            ids_to_delete = group["ids"][1:]
            result = await db[collection].delete_many({"id": {"$in": ids_to_delete}})
            deleted_count += result.deleted_count
    
    return {
        "success": True,
        "duplicati_rimossi": deleted_count
    }
