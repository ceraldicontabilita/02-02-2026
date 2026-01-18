"""
Router per Document AI Extractor
API per estrarre dati strutturati da documenti (F24, buste paga, estratti conto)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Optional
import base64
from datetime import datetime, timezone

from app.services.document_ai_extractor import (
    process_document,
    process_document_from_base64,
    extract_text_from_pdf,
    detect_document_type,
    PROMPTS
)
from app.database import get_database

router = APIRouter()


@router.post("/extract")
async def extract_from_file(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    model: str = Form("gpt-4o"),
    save_to_db: bool = Form(False)
):
    """
    Estrae dati strutturati da un documento caricato.
    
    - **file**: File PDF o immagine
    - **document_type**: Tipo documento (f24, busta_paga, estratto_conto, fattura, generico). Auto-detect se non specificato.
    - **model**: Modello LLM (default: gpt-4o)
    - **save_to_db**: Se True, salva il risultato nel database
    """
    try:
        # Leggi file
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File vuoto")
        
        if len(content) > 20 * 1024 * 1024:  # 20MB max
            raise HTTPException(status_code=400, detail="File troppo grande (max 20MB)")
        
        # Processa documento
        result = await process_document(
            file_data=content,
            filename=file.filename,
            document_type=document_type,
            model=model
        )
        
        # Salva nel DB se richiesto
        if save_to_db and result.get("structured_data", {}).get("success"):
            db = await get_database()
            doc = {
                "filename": file.filename,
                "document_type": result.get("structured_data", {}).get("document_type"),
                "extracted_data": result.get("structured_data", {}).get("data"),
                "text_preview": result.get("text", "")[:1000],
                "ocr_used": result.get("ocr_used"),
                "model_used": model,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db["extracted_documents"].insert_one(doc)
            result["saved_to_db"] = True
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-base64")
async def extract_from_base64(
    base64_data: str,
    filename: str,
    document_type: Optional[str] = None,
    model: str = "gpt-4o",
    save_to_db: bool = False
):
    """
    Estrae dati strutturati da un documento in formato base64.
    Utile per processare documenti già salvati nel database.
    """
    try:
        result = await process_document_from_base64(
            base64_data=base64_data,
            filename=filename,
            document_type=document_type,
            model=model
        )
        
        if save_to_db and result.get("structured_data", {}).get("success"):
            db = await get_database()
            doc = {
                "filename": filename,
                "document_type": result.get("structured_data", {}).get("document_type"),
                "extracted_data": result.get("structured_data", {}).get("data"),
                "text_preview": result.get("text", "")[:1000],
                "ocr_used": result.get("ocr_used"),
                "model_used": model,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db["extracted_documents"].insert_one(doc)
            result["saved_to_db"] = True
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-text-only")
async def extract_text_only(file: UploadFile = File(...)):
    """
    Estrae solo il testo da un PDF (senza analisi LLM).
    Utile per debug o per vedere cosa viene estratto.
    """
    try:
        content = await file.read()
        
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Solo file PDF supportati")
        
        text = extract_text_from_pdf(content)
        doc_type = detect_document_type(text)
        
        return {
            "filename": file.filename,
            "text": text,
            "text_length": len(text),
            "detected_type": doc_type,
            "ocr_used": "OCR" in text
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document-types")
async def get_document_types():
    """
    Ritorna i tipi di documento supportati e i relativi prompt.
    """
    return {
        "types": list(PROMPTS.keys()),
        "descriptions": {
            "f24": "Modello F24 - Versamenti fiscali e contributivi",
            "busta_paga": "Busta paga / Cedolino dipendente",
            "estratto_conto": "Estratto conto bancario",
            "fattura": "Fattura commerciale",
            "generico": "Documento generico (auto-detect)"
        }
    }


@router.get("/extracted-documents")
async def get_extracted_documents(
    document_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """
    Recupera i documenti estratti salvati nel database.
    """
    db = await get_database()
    
    query = {}
    if document_type:
        query["document_type"] = document_type
    
    cursor = db["extracted_documents"].find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    documents = await cursor.to_list(length=limit)
    total = await db["extracted_documents"].count_documents(query)
    
    return {
        "documents": documents,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.post("/process-classified-email")
async def process_classified_email(
    email_id: str,
    model: str = "gpt-4o"
):
    """
    Processa un documento classificato dal sistema email.
    Legge il PDF da documents_classified e estrae i dati.
    """
    db = get_database()
    
    # Trova il documento classificato
    from bson import ObjectId
    try:
        doc = await db["documents_classified"].find_one({"_id": ObjectId(email_id)})
    except:
        doc = await db["documents_classified"].find_one({"msg_id": email_id})
    
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    if "pdf_base64" not in doc:
        raise HTTPException(status_code=400, detail="Documento senza PDF allegato")
    
    # Determina tipo documento dalla categoria email
    category_to_type = {
        "f24": "f24",
        "buste_paga": "busta_paga",
        "estratti_conto": "estratto_conto",
        "fatture": "fattura"
    }
    doc_type = category_to_type.get(doc.get("tipo"), None)
    
    # Processa
    result = await process_document_from_base64(
        base64_data=doc["pdf_base64"],
        filename=doc.get("filename", "documento.pdf"),
        document_type=doc_type,
        model=model
    )
    
    # Aggiorna il documento classificato con i dati estratti
    if result.get("structured_data", {}).get("success"):
        await db["documents_classified"].update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "extracted_data": result["structured_data"]["data"],
                    "extraction_model": model,
                    "extracted_at": datetime.now(timezone.utc).isoformat(),
                    "processed": True
                }
            }
        )
        result["document_updated"] = True
    
    return result
