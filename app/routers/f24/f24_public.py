"""
F24 Public Router - Endpoints F24 senza autenticazione
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Body, Query
from fastapi.responses import Response
from typing import Dict, Any
from datetime import datetime
import uuid
import logging
import base64

from app.database import Database

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/test")
async def test_route():
    """Test route."""
    return {"status": "ok"}


@router.get("/models")
async def list_f24_models() -> Dict[str, Any]:
    """Lista tutti i modelli F24 importati da PDF."""
    import time
    t_start = time.time()
    
    db = Database.get_db()
    
    # Query semplice senza operatori speciali
    try:
        f24s = await db["f24_models"].find(
            {},
            {
                "_id": 0,
                "id": 1,
                "tipo_modello": 1,
                "data_scadenza": 1,
                "saldo_finale": 1,
                "pagato": 1,
                "contribuente": 1
            }
        ).sort("data_scadenza", -1).to_list(100)
        
        logger.info(f"F24 models query took {time.time() - t_start:.2f}s for {len(f24s)} items")
    except Exception as e:
        logger.error(f"F24 models query error: {e}")
        f24s = []
    
    return {
        "f24s": f24s,
        "count": len(f24s),
        "totale_da_pagare": sum(f.get("saldo_finale", 0) or 0 for f in f24s if not f.get("pagato")),
        "totale_pagato": sum(f.get("saldo_finale", 0) or 0 for f in f24s if f.get("pagato"))
    }


@router.post("/upload")
async def upload_f24_pdf(
    file: UploadFile = File(..., description="File PDF F24")
) -> Dict[str, Any]:
    """
    Carica PDF F24 ed estrae automaticamente i dati.
    
    **Supporta:**
    - F24 Ordinario
    - F24 Semplificato
    - F24 contributi INPS
    
    Estrae: codice tributo, importo, periodo riferimento, scadenza
    Usa parser basato su coordinate PyMuPDF per maggiore affidabilità.
    """
    import tempfile
    import os
    from app.services.parser_f24 import parse_f24_commercialista
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo file PDF supportati")
    
    pdf_bytes = await file.read()
    
    # Salva temporaneamente il PDF per il parser
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(pdf_bytes)
        tmp_path = tmp_file.name
    
    try:
        # Parse PDF usando il parser robusto basato su coordinate
        parsed = parse_f24_commercialista(tmp_path)
    finally:
        # Rimuovi file temporaneo
        os.unlink(tmp_path)
    
    if "error" in parsed and parsed["error"]:
        return {
            "success": False,
            "error": parsed["error"],
            "filename": file.filename
        }
    
    # Get database
    db = Database.get_db()
    
    # Convert data_versamento to data_scadenza
    data_scadenza = parsed.get("dati_generali", {}).get("data_versamento")
    
    # Converti formato tributi per compatibilità con frontend
    tributi_erario = []
    for t in parsed.get("sezione_erario", []):
        tributi_erario.append({
            "codice_tributo": t.get("codice_tributo"),
            "codice": t.get("codice_tributo"),
            "rateazione": t.get("rateazione", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "anno_riferimento": t.get("anno", ""),
            "anno": t.get("anno", ""),
            "mese": t.get("mese", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", ""),
            "riferimento": t.get("periodo_riferimento", "")
        })
    
    tributi_inps = []
    for t in parsed.get("sezione_inps", []):
        tributi_inps.append({
            "codice_sede": t.get("codice_sede", ""),
            "causale": t.get("causale", ""),
            "causale_contributo": t.get("causale", ""),
            "matricola": t.get("matricola", ""),
            "periodo_da": t.get("mese", ""),
            "periodo_a": t.get("anno", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    tributi_regioni = []
    for t in parsed.get("sezione_regioni", []):
        tributi_regioni.append({
            "codice_tributo": t.get("codice_tributo"),
            "codice": t.get("codice_tributo"),
            "codice_regione": t.get("codice_regione", ""),
            "codice_ente": t.get("codice_regione", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    tributi_imu = []
    for t in parsed.get("sezione_tributi_locali", []):
        tributi_imu.append({
            "codice_tributo": t.get("codice_tributo"),
            "codice": t.get("codice_tributo"),
            "codice_comune": t.get("codice_comune", ""),
            "codice_ente": t.get("codice_comune", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    # Aggiungi anche INAIL se presente
    for t in parsed.get("sezione_inail", []):
        tributi_inps.append({
            "codice_sede": t.get("codice_sede", ""),
            "causale": "INAIL",
            "causale_contributo": t.get("causale", "INAIL"),
            "matricola": t.get("codice_ditta", ""),
            "periodo_da": "",
            "periodo_a": "",
            "periodo_riferimento": t.get("numero_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    totali = parsed.get("totali", {})
    
    # Create F24 record
    f24_id = str(uuid.uuid4())
    f24_record = {
        "id": f24_id,
        "data_scadenza": data_scadenza,
        "scadenza_display": data_scadenza,
        "codice_fiscale": parsed.get("dati_generali", {}).get("codice_fiscale"),
        "contribuente": parsed.get("dati_generali", {}).get("ragione_sociale"),
        "banca": parsed.get("dati_generali", {}).get("banca"),
        "tipo_f24": parsed.get("dati_generali", {}).get("tipo_f24", "F24"),
        "tributi_erario": tributi_erario,
        "tributi_inps": tributi_inps,
        "tributi_regioni": tributi_regioni,
        "tributi_imu": tributi_imu,
        "totale_debito": totali.get("totale_debito", 0),
        "totale_credito": totali.get("totale_credito", 0),
        "saldo_finale": totali.get("saldo_finale", 0),
        "has_ravvedimento": parsed.get("has_ravvedimento", False),
        "pagato": False,
        "filename": file.filename,
        "pdf_data": base64.b64encode(pdf_bytes).decode('utf-8'),
        "source": "pdf_upload",
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Check for duplicates
    existing = await db["f24_models"].find_one({
        "data_scadenza": data_scadenza,
        "saldo_finale": totali.get("saldo_finale", 0)
    })
    
    if existing:
        raise HTTPException(status_code=409, detail="F24 già presente nel sistema")
    
    # Insert into database
    await db["f24_models"].insert_one(f24_record.copy())
    
    logger.info(f"F24 importato: {f24_id} - Scadenza {data_scadenza} - €{totali.get('saldo_finale', 0):.2f}")
    
    return {
        "success": True,
        "id": f24_id,
        "scadenza": data_scadenza,
        "contribuente": parsed.get("dati_generali", {}).get("ragione_sociale"),
        "saldo_finale": totali.get("saldo_finale", 0),
        "tributi": {
            "erario": len(tributi_erario),
            "inps": len(tributi_inps),
            "regioni": len(tributi_regioni),
            "imu": len(tributi_imu)
        },
        "filename": file.filename
    }


@router.get("/pdf/{f24_id}")
async def get_f24_pdf(f24_id: str):
    """Restituisce il PDF originale dell'F24."""
    db = Database.get_db()
    
    f24 = await db["f24_models"].find_one({"id": f24_id})
    
    if not f24:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    pdf_data = f24.get("pdf_data")
    if not pdf_data:
        raise HTTPException(status_code=404, detail="PDF non disponibile per questo F24")
    
    # Decode base64 to bytes
    pdf_bytes = base64.b64decode(pdf_data)
    
    filename = f24.get("filename", f"F24_{f24_id}.pdf")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )


@router.put("/models/{f24_id}/pagato")
async def mark_f24_pagato(f24_id: str) -> Dict[str, str]:
    """Segna un F24 come pagato."""
    db = Database.get_db()
    
    result = await db["f24_models"].update_one(
        {"id": f24_id},
        {"$set": {"pagato": True, "data_pagamento": datetime.utcnow().isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return {"message": "F24 segnato come pagato", "id": f24_id}


@router.put("/models/{f24_id}")
async def update_f24_model(f24_id: str, data: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Aggiorna un modello F24."""
    db = Database.get_db()
    
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    
    # Campi modificabili
    allowed_fields = [
        "data_scadenza", "scadenza_display", "contribuente", 
        "banca", "pagato", "note", "saldo_finale"
    ]
    
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]
    
    result = await db["f24_models"].update_one(
        {"id": f24_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return {"message": "F24 aggiornato", "id": f24_id}


@router.delete("/models/{f24_id}")
async def delete_f24_model(f24_id: str) -> Dict[str, str]:
    """Elimina un modello F24."""
    db = Database.get_db()
    
    result = await db["f24_models"].delete_one({"id": f24_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="F24 non trovato")
    
    return {"message": "F24 eliminato", "id": f24_id}


@router.post("/upload-overwrite")
async def upload_f24_pdf_overwrite(
    file: UploadFile = File(..., description="File PDF F24"),
    overwrite: bool = Query(False, description="Sovrascrivi se esiste")
) -> Dict[str, Any]:
    """
    Carica PDF F24 con opzione sovrascrivi.
    Se overwrite=True, sostituisce F24 esistenti con stessa scadenza/importo.
    Usa parser basato su coordinate PyMuPDF per maggiore affidabilità.
    """
    import tempfile
    import os
    from app.services.parser_f24 import parse_f24_commercialista
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo file PDF supportati")
    
    pdf_bytes = await file.read()
    
    # Salva temporaneamente il PDF per il parser
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(pdf_bytes)
        tmp_path = tmp_file.name
    
    try:
        parsed = parse_f24_commercialista(tmp_path)
    finally:
        os.unlink(tmp_path)
    
    if "error" in parsed and parsed["error"]:
        return {
            "success": False,
            "error": parsed["error"],
            "filename": file.filename
        }
    
    db = Database.get_db()
    
    # Convert data_versamento to data_scadenza
    data_scadenza = parsed.get("dati_generali", {}).get("data_versamento")
    totali = parsed.get("totali", {})
    
    # Check for existing
    existing = await db["f24_models"].find_one({
        "data_scadenza": data_scadenza,
        "saldo_finale": totali.get("saldo_finale", 0)
    })
    
    if existing and not overwrite:
        return {
            "success": False,
            "error": "F24 già presente. Usa overwrite=True per sovrascrivere.",
            "existing_id": existing.get("id"),
            "filename": file.filename
        }
    
    f24_id = existing.get("id") if existing else str(uuid.uuid4())
    
    # Converti formato tributi per compatibilità con frontend
    tributi_erario = []
    for t in parsed.get("sezione_erario", []):
        tributi_erario.append({
            "codice_tributo": t.get("codice_tributo"),
            "codice": t.get("codice_tributo"),
            "rateazione": t.get("rateazione", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "anno_riferimento": t.get("anno", ""),
            "anno": t.get("anno", ""),
            "mese": t.get("mese", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", ""),
            "riferimento": t.get("periodo_riferimento", "")
        })
    
    tributi_inps = []
    for t in parsed.get("sezione_inps", []):
        tributi_inps.append({
            "codice_sede": t.get("codice_sede", ""),
            "causale": t.get("causale", ""),
            "causale_contributo": t.get("causale", ""),
            "matricola": t.get("matricola", ""),
            "periodo_da": t.get("mese", ""),
            "periodo_a": t.get("anno", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    # Aggiungi INAIL se presente
    for t in parsed.get("sezione_inail", []):
        tributi_inps.append({
            "codice_sede": t.get("codice_sede", ""),
            "causale": "INAIL",
            "causale_contributo": t.get("causale", "INAIL"),
            "matricola": t.get("codice_ditta", ""),
            "periodo_da": "",
            "periodo_a": "",
            "periodo_riferimento": t.get("numero_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    tributi_regioni = []
    for t in parsed.get("sezione_regioni", []):
        tributi_regioni.append({
            "codice_tributo": t.get("codice_tributo"),
            "codice": t.get("codice_tributo"),
            "codice_regione": t.get("codice_regione", ""),
            "codice_ente": t.get("codice_regione", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    tributi_imu = []
    for t in parsed.get("sezione_tributi_locali", []):
        tributi_imu.append({
            "codice_tributo": t.get("codice_tributo"),
            "codice": t.get("codice_tributo"),
            "codice_comune": t.get("codice_comune", ""),
            "codice_ente": t.get("codice_comune", ""),
            "periodo_riferimento": t.get("periodo_riferimento", ""),
            "importo_debito": t.get("importo_debito", 0),
            "importo_credito": t.get("importo_credito", 0),
            "importo": t.get("importo_debito", 0),
            "descrizione": t.get("descrizione", "")
        })
    
    f24_record = {
        "id": f24_id,
        "data_scadenza": data_scadenza,
        "scadenza_display": data_scadenza,
        "codice_fiscale": parsed.get("dati_generali", {}).get("codice_fiscale"),
        "contribuente": parsed.get("dati_generali", {}).get("ragione_sociale"),
        "banca": parsed.get("dati_generali", {}).get("banca"),
        "tipo_f24": parsed.get("dati_generali", {}).get("tipo_f24", "F24"),
        "tributi_erario": tributi_erario,
        "tributi_inps": tributi_inps,
        "tributi_regioni": tributi_regioni,
        "tributi_imu": tributi_imu,
        "totale_debito": totali.get("totale_debito", 0),
        "totale_credito": totali.get("totale_credito", 0),
        "saldo_finale": totali.get("saldo_finale", 0),
        "has_ravvedimento": parsed.get("has_ravvedimento", False),
        "pagato": existing.get("pagato", False) if existing else False,
        "filename": file.filename,
        "pdf_data": base64.b64encode(pdf_bytes).decode('utf-8'),
        "source": "pdf_upload",
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if existing:
        await db["f24_models"].update_one(
            {"id": f24_id},
            {"$set": f24_record}
        )
        action = "aggiornato"
    else:
        f24_record["created_at"] = datetime.utcnow().isoformat()
        await db["f24_models"].insert_one(f24_record.copy())
        action = "creato"
    
    logger.info(f"F24 {action}: {f24_id} - Scadenza {data_scadenza} - €{totali.get('saldo_finale', 0):.2f}")
    
    return {
        "success": True,
        "action": action,
        "id": f24_id,
        "scadenza": data_scadenza,
        "saldo_finale": totali.get("saldo_finale", 0),
        "tributi": {
            "erario": len(tributi_erario),
            "inps": len(tributi_inps),
            "regioni": len(tributi_regioni),
            "imu": len(tributi_imu)
        },
        "filename": file.filename
    }

