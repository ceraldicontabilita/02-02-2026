"""
Router OpenAPI Imprese - Aggiornamento automatico schede fornitore
Utilizza l'API OpenAPI.it per recuperare dati anagrafici aggiornati
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import os
import logging

from app.database import Database
from app.services.openapi_imprese import OpenAPIImprese, map_openapi_to_fornitore

router = APIRouter(prefix="/openapi-imprese", tags=["OpenAPI Imprese"])
logger = logging.getLogger(__name__)

# Token da environment o passato direttamente
OPENAPI_TOKEN = os.environ.get("OPENAPI_IMPRESE_TOKEN", "")


class UpdateFornitoreRequest(BaseModel):
    """Request per aggiornare un fornitore"""
    partita_iva: str
    force_update: bool = False


class BulkUpdateRequest(BaseModel):
    """Request per aggiornamento massivo"""
    partite_iva: List[str]
    force_update: bool = False


class SearchRequest(BaseModel):
    """Request per ricerca azienda"""
    query: str


@router.get("/status")
async def check_api_status() -> Dict[str, Any]:
    """
    Verifica se il token OpenAPI è configurato e funzionante.
    """
    token = OPENAPI_TOKEN
    
    if not token:
        return {
            "configured": False,
            "message": "Token OpenAPI non configurato. Imposta OPENAPI_IMPRESE_TOKEN in .env"
        }
    
    # Test con una P.IVA di esempio (OpenAPI stessa)
    client = OpenAPIImprese(token)
    result = await client.get_base_info("12485671007")
    
    if result.get("success"):
        return {
            "configured": True,
            "status": "OK",
            "test_result": "Connessione API verificata"
        }
    else:
        return {
            "configured": True,
            "status": "ERROR",
            "error": result.get("error", "Errore sconosciuto")
        }


@router.post("/aggiorna-fornitore")
async def aggiorna_fornitore(
    request: UpdateFornitoreRequest,
    token: Optional[str] = Query(None, description="Token OpenAPI (opzionale se configurato in env)")
) -> Dict[str, Any]:
    """
    Aggiorna la scheda di un fornitore con dati da OpenAPI.it
    
    Recupera: ragione sociale, indirizzo, PEC, codice SDI, ATECO, etc.
    """
    api_token = token or OPENAPI_TOKEN
    
    if not api_token:
        raise HTTPException(
            status_code=400,
            detail="Token OpenAPI non fornito. Passalo come query param o configura OPENAPI_IMPRESE_TOKEN"
        )
    
    piva = request.partita_iva.strip().replace(" ", "")
    
    # Valida P.IVA
    if len(piva) != 11 or not piva.isdigit():
        raise HTTPException(status_code=400, detail="Partita IVA non valida (deve essere 11 cifre)")
    
    db = Database.get_db()
    
    # Cerca fornitore esistente
    fornitore = await db.fornitori.find_one({
        "$or": [
            {"partita_iva": piva},
            {"piva": piva},
            {"codice_fiscale": piva}
        ]
    })
    
    # Chiama OpenAPI
    client = OpenAPIImprese(api_token)
    result = await client.get_advance_info(piva)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=404,
            detail=f"Errore OpenAPI: {result.get('error', 'Partita IVA non trovata')}"
        )
    
    # Mappa dati
    openapi_data = result.get("data", {})
    fornitore_update = map_openapi_to_fornitore(openapi_data)
    
    if fornitore:
        # Aggiorna fornitore esistente
        fornitore_update["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.fornitori.update_one(
            {"_id": fornitore["_id"]},
            {"$set": fornitore_update}
        )
        
        return {
            "success": True,
            "action": "updated",
            "fornitore_id": str(fornitore.get("id", fornitore.get("_id"))),
            "data_aggiornati": list(fornitore_update.keys()),
            "openapi_data": fornitore_update
        }
    else:
        # Crea nuovo fornitore
        import uuid
        fornitore_update["id"] = str(uuid.uuid4())
        fornitore_update["created_at"] = datetime.now(timezone.utc).isoformat()
        fornitore_update["updated_at"] = fornitore_update["created_at"]
        fornitore_update["source"] = "openapi"
        
        await db.fornitori.insert_one(fornitore_update)
        
        return {
            "success": True,
            "action": "created",
            "fornitore_id": fornitore_update["id"],
            "openapi_data": fornitore_update
        }


@router.post("/aggiorna-bulk")
async def aggiorna_fornitori_bulk(
    request: BulkUpdateRequest,
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Aggiorna più fornitori in batch.
    Utile per aggiornare tutti i fornitori del database.
    """
    api_token = token or OPENAPI_TOKEN
    
    if not api_token:
        raise HTTPException(status_code=400, detail="Token OpenAPI non fornito")
    
    results = {
        "totale": len(request.partite_iva),
        "aggiornati": 0,
        "creati": 0,
        "errori": 0,
        "dettagli": []
    }
    
    client = OpenAPIImprese(api_token)
    db = Database.get_db()
    
    for piva in request.partite_iva:
        piva = piva.strip().replace(" ", "")
        
        try:
            result = await client.get_advance_info(piva)
            
            if result.get("success"):
                openapi_data = result.get("data", {})
                fornitore_update = map_openapi_to_fornitore(openapi_data)
                fornitore_update["updated_at"] = datetime.now(timezone.utc).isoformat()
                
                # Upsert
                update_result = await db.fornitori.update_one(
                    {"$or": [{"partita_iva": piva}, {"piva": piva}]},
                    {"$set": fornitore_update},
                    upsert=True
                )
                
                if update_result.upserted_id:
                    results["creati"] += 1
                    results["dettagli"].append({"piva": piva, "status": "created"})
                else:
                    results["aggiornati"] += 1
                    results["dettagli"].append({"piva": piva, "status": "updated"})
            else:
                results["errori"] += 1
                results["dettagli"].append({
                    "piva": piva, 
                    "status": "error", 
                    "error": result.get("error")
                })
                
        except Exception as e:
            results["errori"] += 1
            results["dettagli"].append({"piva": piva, "status": "error", "error": str(e)})
    
    return results


@router.get("/cerca")
async def cerca_azienda(
    query: str = Query(..., description="Nome azienda (parziale)"),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Cerca un'azienda per nome usando l'API OpenAPI.
    Restituisce lista di risultati con ID e denominazione.
    """
    api_token = token or OPENAPI_TOKEN
    
    if not api_token:
        raise HTTPException(status_code=400, detail="Token OpenAPI non fornito")
    
    client = OpenAPIImprese(api_token)
    result = await client.search_by_name(query)
    
    if result.get("success"):
        return {
            "success": True,
            "query": query,
            "count": len(result.get("results", [])),
            "results": result.get("results", [])
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error"))


@router.get("/info/{partita_iva}")
async def get_info_azienda(
    partita_iva: str,
    token: Optional[str] = Query(None),
    tipo: str = Query("advance", description="base o advance")
) -> Dict[str, Any]:
    """
    Recupera informazioni su un'azienda senza aggiornare il database.
    Utile per preview prima di aggiornare.
    """
    api_token = token or OPENAPI_TOKEN
    
    if not api_token:
        raise HTTPException(status_code=400, detail="Token OpenAPI non fornito")
    
    piva = partita_iva.strip().replace(" ", "")
    client = OpenAPIImprese(api_token)
    
    if tipo == "base":
        result = await client.get_base_info(piva)
    else:
        result = await client.get_advance_info(piva)
    
    if result.get("success"):
        return {
            "success": True,
            "partita_iva": piva,
            "data": result.get("data", {}),
            "campi_mappati": map_openapi_to_fornitore(result.get("data", {}))
        }
    else:
        raise HTTPException(status_code=404, detail=result.get("error"))


@router.post("/aggiorna-tutti-fornitori")
async def aggiorna_tutti_fornitori(
    token: Optional[str] = Query(None),
    limit: int = Query(50, description="Limite fornitori da aggiornare")
) -> Dict[str, Any]:
    """
    Aggiorna tutti i fornitori nel database che hanno una P.IVA valida.
    Elabora solo fornitori non aggiornati di recente.
    """
    api_token = token or OPENAPI_TOKEN
    
    if not api_token:
        raise HTTPException(status_code=400, detail="Token OpenAPI non fornito")
    
    db = Database.get_db()
    
    # Trova fornitori con P.IVA ma senza aggiornamento OpenAPI recente
    fornitori = await db.fornitori.find({
        "$or": [
            {"partita_iva": {"$exists": True, "$ne": None, "$ne": ""}},
            {"piva": {"$exists": True, "$ne": None, "$ne": ""}}
        ],
        "openapi_last_update": {"$exists": False}
    }).limit(limit).to_list(length=limit)
    
    if not fornitori:
        # Prova anche quelli già aggiornati ma vecchi (> 30 giorni)
        from datetime import timedelta
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        
        fornitori = await db.fornitori.find({
            "$or": [
                {"partita_iva": {"$exists": True, "$ne": None, "$ne": ""}},
                {"piva": {"$exists": True, "$ne": None, "$ne": ""}}
            ],
            "openapi_last_update": {"$lt": thirty_days_ago}
        }).limit(limit).to_list(length=limit)
    
    if not fornitori:
        return {
            "success": True,
            "message": "Tutti i fornitori sono già aggiornati",
            "aggiornati": 0
        }
    
    # Estrai le P.IVA
    partite_iva = []
    for f in fornitori:
        piva = f.get("partita_iva") or f.get("piva")
        if piva and len(piva.replace(" ", "")) == 11:
            partite_iva.append(piva)
    
    # Usa bulk update
    bulk_request = BulkUpdateRequest(partite_iva=partite_iva, force_update=True)
    return await aggiorna_fornitori_bulk(bulk_request, token=api_token)


@router.get("/fornitori-da-aggiornare")
async def get_fornitori_da_aggiornare(
    limit: int = Query(100)
) -> Dict[str, Any]:
    """
    Lista fornitori che necessitano aggiornamento da OpenAPI.
    """
    db = Database.get_db()
    
    # Fornitori con P.IVA ma senza dati OpenAPI
    fornitori = await db.fornitori.find({
        "$or": [
            {"partita_iva": {"$exists": True, "$ne": None, "$ne": ""}},
            {"piva": {"$exists": True, "$ne": None, "$ne": ""}}
        ],
        "openapi_last_update": {"$exists": False}
    }, {"_id": 0, "id": 1, "ragione_sociale": 1, "partita_iva": 1, "piva": 1}).limit(limit).to_list(length=limit)
    
    return {
        "count": len(fornitori),
        "fornitori": [
            {
                "id": f.get("id"),
                "ragione_sociale": f.get("ragione_sociale", "N/A"),
                "partita_iva": f.get("partita_iva") or f.get("piva")
            }
            for f in fornitori
        ]
    }
