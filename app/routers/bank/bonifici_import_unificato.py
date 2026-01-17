"""\
Endpoint unificato per import Bonifici compatibile con ImportUnificato frontend.

Motivazione:
- La UI ImportUnificato carica file singoli/multipli (PDF/ZIP) verso un singolo endpoint.
- Il router archivio_bonifici espone una pipeline a job: POST /archivio-bonifici/jobs e poi /jobs/{job_id}/upload.

Questo router fornisce:
- POST /api/archivio-bonifici/jobs/import
che:
  1) crea un job
  2) carica i file sul job
  3) restituisce job_id e conteggi

NB: l'elaborazione resta in background (come da archivio_bonifici).
"""

from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from typing import Dict, Any

from app.routers.bank.archivio_bonifici import create_job, upload_files

router = APIRouter(prefix="/archivio-bonifici/jobs", tags=["Archivio Bonifici"])


@router.post("/import")
async def import_bonifici_unificato(
    background: BackgroundTasks,
    file: UploadFile = File(...),
) -> Dict[str, Any]:
    job = await create_job()
    job_id = job.get("id")
    res = await upload_files(job_id=job_id, background=background, files=[file])
    # Standardizza risposta per la UI
    return {
        "success": True,
        "message": "Bonifici caricati: elaborazione avviata in background",
        "job_id": job_id,
        **res,
    }
