"""
Router API per Riconciliazione Intelligente
=============================================

Endpoint per gestione conferma pagamenti e riconciliazione automatica.

Endpoints:
- GET /dashboard - Dashboard operazioni da verificare
- POST /conferma-pagamento - Conferma metodo pagamento fattura
- POST /applica-spostamento - Applica spostamento Cassa→Banca
- POST /rianalizza - Ri-analizza operazioni dopo nuovo estratto
- GET /fatture-da-confermare - Lista fatture in attesa conferma
- GET /spostamenti-proposti - Lista spostamenti proposti
- GET /stato-estratto - Info su copertura estratto conto
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.database import Database
from app.services.riconciliazione_intelligente import (
    RiconciliazioneIntelligente,
    get_riconciliazione_service,
    StatoRiconciliazione
)

import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# DASHBOARD
# =============================================================================

@router.get("/dashboard")
async def get_dashboard_riconciliazione() -> Dict[str, Any]:
    """
    Dashboard completa delle operazioni da verificare.
    
    Ritorna conteggi e liste per:
    - Fatture in attesa conferma metodo
    - Spostamenti proposti (cassa→banca)
    - Match incerti da verificare
    - Operazioni sospese (attesa estratto)
    - Anomalie
    """
    db = Database.get_db()
    service = get_riconciliazione_service(db)
    
    # Ultima data estratto
    ultima_data_estratto = await service.get_ultima_data_estratto()
    
    # Conteggi per stato
    stati_count = {}
    for stato in StatoRiconciliazione:
        count = await db["invoices"].count_documents({
            "stato_riconciliazione": stato.value
        })
        stati_count[stato.value] = count
    
    # Fatture in attesa conferma (limit 50)
    in_attesa = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.IN_ATTESA_CONFERMA.value},
        {"_id": 0, "id": 1, "numero_documento": 1, "data_documento": 1, 
         "importo_totale": 1, "fornitore_ragione_sociale": 1, "metodo_pagamento": 1}
    ).sort("data_documento", -1).to_list(50)
    
    # Spostamenti proposti (limit 50)
    spostamenti = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.DA_VERIFICARE_SPOSTAMENTO.value},
        {"_id": 0, "id": 1, "numero_documento": 1, "data_documento": 1,
         "importo_totale": 1, "fornitore_ragione_sociale": 1, "match_estratto_proposto": 1}
    ).sort("data_documento", -1).to_list(50)
    
    # Match incerti (limit 50)
    match_incerti = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.DA_VERIFICARE_MATCH_INCERTO.value},
        {"_id": 0, "id": 1, "numero_documento": 1, "data_documento": 1,
         "importo_totale": 1, "fornitore_ragione_sociale": 1, "match_estratto_proposto": 1}
    ).sort("data_documento", -1).to_list(50)
    
    # Sospese (limit 50)
    sospese = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.SOSPESA_ATTESA_ESTRATTO.value},
        {"_id": 0, "id": 1, "numero_documento": 1, "data_documento": 1,
         "importo_totale": 1, "fornitore_ragione_sociale": 1}
    ).sort("data_documento", -1).to_list(50)
    
    # Anomalie (limit 50)
    anomalie = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.ANOMALIA_NON_IN_ESTRATTO.value},
        {"_id": 0, "id": 1, "numero_documento": 1, "data_documento": 1,
         "importo_totale": 1, "fornitore_ragione_sociale": 1, "metodo_pagamento_confermato": 1}
    ).sort("data_documento", -1).to_list(50)
    
    return {
        "success": True,
        "ultima_data_estratto": ultima_data_estratto,
        "conteggi": stati_count,
        "totale_da_verificare": (
            stati_count.get(StatoRiconciliazione.IN_ATTESA_CONFERMA.value, 0) +
            stati_count.get(StatoRiconciliazione.DA_VERIFICARE_SPOSTAMENTO.value, 0) +
            stati_count.get(StatoRiconciliazione.DA_VERIFICARE_MATCH_INCERTO.value, 0) +
            stati_count.get(StatoRiconciliazione.SOSPESA_ATTESA_ESTRATTO.value, 0) +
            stati_count.get(StatoRiconciliazione.ANOMALIA_NON_IN_ESTRATTO.value, 0)
        ),
        "fatture_in_attesa_conferma": in_attesa,
        "spostamenti_proposti": spostamenti,
        "match_incerti": match_incerti,
        "sospese_attesa_estratto": sospese,
        "anomalie": anomalie
    }


# =============================================================================
# CONFERMA PAGAMENTO
# =============================================================================

@router.post("/conferma-pagamento")
async def conferma_pagamento(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Conferma il metodo di pagamento per una fattura.
    
    Payload:
    {
        "fattura_id": "uuid",
        "metodo": "cassa" | "banca",
        "data_pagamento": "YYYY-MM-DD" (opzionale, default: data fattura),
        "note": "Note aggiuntive" (opzionale)
    }
    
    Returns:
        Risultato con nuovo stato, movimento creato, eventuali warning
    """
    db = Database.get_db()
    service = get_riconciliazione_service(db)
    
    fattura_id = payload.get("fattura_id")
    metodo = payload.get("metodo", "").lower()
    data_pagamento = payload.get("data_pagamento")
    note = payload.get("note", "")
    
    if not fattura_id:
        raise HTTPException(status_code=400, detail="fattura_id obbligatorio")
    
    if metodo not in ["cassa", "banca"]:
        raise HTTPException(status_code=400, detail="metodo deve essere 'cassa' o 'banca'")
    
    risultato = await service.conferma_pagamento(
        fattura_id=fattura_id,
        metodo=metodo,
        data_pagamento=data_pagamento,
        note=note
    )
    
    if not risultato.get("success"):
        raise HTTPException(status_code=400, detail=risultato.get("error", "Errore sconosciuto"))
    
    return risultato


@router.post("/conferma-multipla")
async def conferma_pagamento_multipla(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Conferma il metodo di pagamento per multiple fatture.
    
    Payload:
    {
        "fatture": [
            {"fattura_id": "uuid1", "metodo": "cassa"},
            {"fattura_id": "uuid2", "metodo": "banca"},
            ...
        ]
    }
    """
    db = Database.get_db()
    service = get_riconciliazione_service(db)
    
    fatture = payload.get("fatture", [])
    if not fatture:
        raise HTTPException(status_code=400, detail="Lista fatture vuota")
    
    risultati = {
        "success": True,
        "processate": 0,
        "errori": 0,
        "dettagli": []
    }
    
    for item in fatture:
        fattura_id = item.get("fattura_id")
        metodo = item.get("metodo", "").lower()
        
        if not fattura_id or metodo not in ["cassa", "banca"]:
            risultati["errori"] += 1
            risultati["dettagli"].append({
                "fattura_id": fattura_id,
                "success": False,
                "error": "Dati non validi"
            })
            continue
        
        try:
            ris = await service.conferma_pagamento(
                fattura_id=fattura_id,
                metodo=metodo
            )
            risultati["processate"] += 1
            risultati["dettagli"].append({
                "fattura_id": fattura_id,
                "success": ris.get("success"),
                "stato": ris.get("stato_riconciliazione"),
                "warnings": ris.get("warnings", [])
            })
        except Exception as e:
            risultati["errori"] += 1
            risultati["dettagli"].append({
                "fattura_id": fattura_id,
                "success": False,
                "error": str(e)
            })
    
    return risultati


# =============================================================================
# SPOSTAMENTO CASSA → BANCA
# =============================================================================

@router.post("/applica-spostamento")
async def applica_spostamento(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Applica o rifiuta lo spostamento da Cassa a Banca.
    
    Payload:
    {
        "fattura_id": "uuid",
        "movimento_estratto_id": "uuid",
        "conferma": true | false  // true = sposta, false = mantieni cassa (lock)
    }
    """
    db = Database.get_db()
    service = get_riconciliazione_service(db)
    
    fattura_id = payload.get("fattura_id")
    movimento_estratto_id = payload.get("movimento_estratto_id")
    conferma = payload.get("conferma", True)
    
    if not fattura_id:
        raise HTTPException(status_code=400, detail="fattura_id obbligatorio")
    
    if conferma and not movimento_estratto_id:
        raise HTTPException(status_code=400, detail="movimento_estratto_id obbligatorio per conferma")
    
    risultato = await service.applica_spostamento(
        fattura_id=fattura_id,
        movimento_estratto_id=movimento_estratto_id,
        conferma=conferma
    )
    
    if not risultato.get("success"):
        raise HTTPException(status_code=400, detail=risultato.get("error", "Errore sconosciuto"))
    
    return risultato


# =============================================================================
# RI-ANALISI (dopo nuovo estratto)
# =============================================================================

@router.post("/rianalizza")
async def rianalizza_operazioni() -> Dict[str, Any]:
    """
    Ri-analizza tutte le operazioni sospese dopo caricamento nuovo estratto conto.
    
    Chiamare dopo ogni upload di estratto conto.
    
    Returns:
        Report con spostamenti proposti, riconciliate, ancora sospese, anomalie
    """
    db = Database.get_db()
    service = get_riconciliazione_service(db)
    
    risultato = await service.rianalizza_operazioni_sospese()
    
    return {
        "success": True,
        **risultato
    }


# =============================================================================
# LISTE E QUERY
# =============================================================================

@router.get("/fatture-da-confermare")
async def get_fatture_da_confermare(
    limit: int = Query(100, ge=1, le=500),
    anno: int = Query(None)
) -> Dict[str, Any]:
    """
    Lista fatture in attesa di conferma metodo pagamento.
    """
    db = Database.get_db()
    
    query = {"stato_riconciliazione": StatoRiconciliazione.IN_ATTESA_CONFERMA.value}
    
    if anno:
        query["data_documento"] = {"$regex": f"^{anno}"}
    
    fatture = await db["invoices"].find(
        query,
        {"_id": 0, "xml_content": 0, "linee": 0}
    ).sort("data_documento", -1).to_list(limit)
    
    return {
        "success": True,
        "count": len(fatture),
        "fatture": fatture
    }


@router.get("/spostamenti-proposti")
async def get_spostamenti_proposti() -> Dict[str, Any]:
    """
    Lista fatture con spostamento Cassa→Banca proposto.
    """
    db = Database.get_db()
    
    fatture = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.DA_VERIFICARE_SPOSTAMENTO.value},
        {"_id": 0, "xml_content": 0, "linee": 0}
    ).sort("data_documento", -1).to_list(100)
    
    return {
        "success": True,
        "count": len(fatture),
        "fatture": fatture
    }


@router.get("/anomalie")
async def get_anomalie() -> Dict[str, Any]:
    """
    Lista fatture con anomalie (banca non trovata in estratto).
    """
    db = Database.get_db()
    
    fatture = await db["invoices"].find(
        {"stato_riconciliazione": StatoRiconciliazione.ANOMALIA_NON_IN_ESTRATTO.value},
        {"_id": 0, "xml_content": 0, "linee": 0}
    ).sort("data_documento", -1).to_list(100)
    
    return {
        "success": True,
        "count": len(fatture),
        "fatture": fatture
    }


@router.get("/stato-estratto")
async def get_stato_estratto() -> Dict[str, Any]:
    """
    Info sullo stato dell'estratto conto.
    """
    db = Database.get_db()
    service = get_riconciliazione_service(db)
    
    ultima_data = await service.get_ultima_data_estratto()
    
    # Conteggio movimenti per anno
    pipeline = [
        {"$group": {
            "_id": {"$substr": ["$data", 0, 4]},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}}
    ]
    movimenti_per_anno = await db["estratto_conto_movimenti"].aggregate(pipeline).to_list(10)
    
    # Totale movimenti
    totale_movimenti = await db["estratto_conto_movimenti"].count_documents({})
    
    # Movimenti non riconciliati
    non_riconciliati = await db["estratto_conto_movimenti"].count_documents({
        "fattura_id": {"$exists": False}
    })
    
    return {
        "success": True,
        "ultima_data_movimento": ultima_data,
        "totale_movimenti": totale_movimenti,
        "movimenti_non_riconciliati": non_riconciliati,
        "movimenti_per_anno": {item["_id"]: item["count"] for item in movimenti_per_anno}
    }


# =============================================================================
# LOCK MANUALE
# =============================================================================

@router.post("/lock-manuale")
async def lock_manuale(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Blocca una fattura per evitare verifiche automatiche.
    
    Payload:
    {
        "fattura_id": "uuid",
        "motivo": "Motivo del blocco"
    }
    """
    db = Database.get_db()
    
    fattura_id = payload.get("fattura_id")
    motivo = payload.get("motivo", "Blocco manuale utente")
    
    if not fattura_id:
        raise HTTPException(status_code=400, detail="fattura_id obbligatorio")
    
    result = await db["invoices"].update_one(
        {"id": fattura_id},
        {"$set": {
            "stato_riconciliazione": StatoRiconciliazione.LOCK_MANUALE.value,
            "lock_manuale": True,
            "lock_manuale_motivo": motivo,
            "lock_manuale_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    
    return {
        "success": True,
        "message": f"Fattura bloccata. Non verrà più verificata automaticamente.",
        "motivo": motivo
    }


@router.post("/sblocca")
async def sblocca_fattura(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sblocca una fattura e la rimette in verifica.
    
    Payload:
    {
        "fattura_id": "uuid"
    }
    """
    db = Database.get_db()
    
    fattura_id = payload.get("fattura_id")
    
    if not fattura_id:
        raise HTTPException(status_code=400, detail="fattura_id obbligatorio")
    
    # Recupera fattura per determinare nuovo stato
    fattura = await db["invoices"].find_one({"id": fattura_id}, {"_id": 0})
    
    if not fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    
    # Determina stato in base al metodo confermato
    metodo = fattura.get("metodo_pagamento_confermato", "")
    if metodo == "cassa":
        nuovo_stato = StatoRiconciliazione.CONFERMATA_CASSA.value
    elif metodo == "banca":
        nuovo_stato = StatoRiconciliazione.CONFERMATA_BANCA.value
    else:
        nuovo_stato = StatoRiconciliazione.IN_ATTESA_CONFERMA.value
    
    result = await db["invoices"].update_one(
        {"id": fattura_id},
        {"$set": {
            "stato_riconciliazione": nuovo_stato,
            "lock_manuale": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        "$unset": {
            "lock_manuale_motivo": "",
            "lock_manuale_at": ""
        }}
    )
    
    return {
        "success": True,
        "message": "Fattura sbloccata",
        "nuovo_stato": nuovo_stato
    }


# =============================================================================
# STATISTICHE
# =============================================================================

@router.get("/statistiche")
async def get_statistiche() -> Dict[str, Any]:
    """
    Statistiche complete sulla riconciliazione.
    """
    db = Database.get_db()
    
    # Conteggi per stato
    stati_count = {}
    for stato in StatoRiconciliazione:
        count = await db["invoices"].count_documents({
            "stato_riconciliazione": stato.value
        })
        stati_count[stato.value] = count
    
    # Totale fatture con stato riconciliazione
    totale_gestite = sum(stati_count.values())
    
    # Fatture senza stato (legacy)
    totale_fatture = await db["invoices"].count_documents({})
    legacy = totale_fatture - totale_gestite
    
    # Importi
    pipeline_importi = [
        {"$match": {"stato_riconciliazione": {"$exists": True}}},
        {"$group": {
            "_id": "$stato_riconciliazione",
            "totale_importo": {"$sum": "$importo_totale"},
            "count": {"$sum": 1}
        }}
    ]
    importi_per_stato = await db["invoices"].aggregate(pipeline_importi).to_list(20)
    
    return {
        "success": True,
        "conteggi_per_stato": stati_count,
        "totale_fatture": totale_fatture,
        "totale_gestite_sistema": totale_gestite,
        "fatture_legacy": legacy,
        "importi_per_stato": {
            item["_id"]: {
                "count": item["count"],
                "importo_totale": round(item["totale_importo"], 2)
            }
            for item in importi_per_stato
        }
    }



# =============================================================================
# MIGRAZIONE FATTURE ESISTENTI
# =============================================================================

@router.post("/migra-fatture-legacy")
async def migra_fatture_legacy(payload: Dict[str, Any] = {}) -> Dict[str, Any]:
    """
    Migra le fatture esistenti al nuovo sistema di riconciliazione intelligente.
    
    Payload (opzionale):
    {
        "anno": 2025,  // Solo anno specifico
        "limit": 100   // Limite fatture da migrare
    }
    
    LOGICA MIGRAZIONE:
    - Fatture con pagato=True e prima_nota_cassa_id → confermata_cassa
    - Fatture con pagato=True e prima_nota_banca_id → confermata_banca  
    - Fatture con riconciliato=True → riconciliata
    - Altre fatture → in_attesa_conferma
    """
    db = Database.get_db()
    
    anno = payload.get("anno")
    limit = payload.get("limit", 500)
    
    # Query per fatture senza stato_riconciliazione
    query = {"stato_riconciliazione": {"$exists": False}}
    if anno:
        query["data_documento"] = {"$regex": f"^{anno}"}
    
    fatture = await db["invoices"].find(
        query,
        {"_id": 0, "id": 1, "pagato": 1, "riconciliato": 1, 
         "prima_nota_cassa_id": 1, "prima_nota_banca_id": 1,
         "metodo_pagamento": 1, "provvisorio": 1}
    ).to_list(limit)
    
    risultato = {
        "migrate": 0,
        "in_attesa_conferma": 0,
        "confermata_cassa": 0,
        "confermata_banca": 0,
        "riconciliata": 0,
        "dettagli": []
    }
    
    for fattura in fatture:
        fattura_id = fattura.get("id")
        pagato = fattura.get("pagato", False)
        riconciliato = fattura.get("riconciliato", False)
        has_cassa = bool(fattura.get("prima_nota_cassa_id"))
        has_banca = bool(fattura.get("prima_nota_banca_id"))
        metodo = (fattura.get("metodo_pagamento") or "").lower()
        
        # Determina stato
        if riconciliato:
            nuovo_stato = StatoRiconciliazione.RICONCILIATA.value
            risultato["riconciliata"] += 1
        elif pagato and has_cassa:
            nuovo_stato = StatoRiconciliazione.CONFERMATA_CASSA.value
            risultato["confermata_cassa"] += 1
        elif pagato and has_banca:
            nuovo_stato = StatoRiconciliazione.CONFERMATA_BANCA.value
            risultato["confermata_banca"] += 1
        elif pagato:
            # Pagato ma senza riferimento prima nota
            if metodo in ["contanti", "cassa", "cash"]:
                nuovo_stato = StatoRiconciliazione.CONFERMATA_CASSA.value
                risultato["confermata_cassa"] += 1
            else:
                nuovo_stato = StatoRiconciliazione.CONFERMATA_BANCA.value
                risultato["confermata_banca"] += 1
        else:
            nuovo_stato = StatoRiconciliazione.IN_ATTESA_CONFERMA.value
            risultato["in_attesa_conferma"] += 1
        
        # Aggiorna fattura
        await db["invoices"].update_one(
            {"id": fattura_id},
            {"$set": {
                "stato_riconciliazione": nuovo_stato,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        risultato["migrate"] += 1
    
    logger.info(f"Migrazione completata: {risultato['migrate']} fatture migrate")
    
    return {
        "success": True,
        **risultato
    }


@router.post("/imposta-stato-fattura")
async def imposta_stato_fattura(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Imposta manualmente lo stato di una fattura.
    Utile per correzioni manuali.
    
    Payload:
    {
        "fattura_id": "uuid",
        "stato": "in_attesa_conferma" | "confermata_cassa" | etc.
    }
    """
    db = Database.get_db()
    
    fattura_id = payload.get("fattura_id")
    stato = payload.get("stato")
    
    if not fattura_id or not stato:
        raise HTTPException(status_code=400, detail="fattura_id e stato obbligatori")
    
    # Verifica stato valido
    stati_validi = [s.value for s in StatoRiconciliazione]
    if stato not in stati_validi:
        raise HTTPException(status_code=400, detail=f"Stato non valido. Stati ammessi: {stati_validi}")
    
    result = await db["invoices"].update_one(
        {"id": fattura_id},
        {"$set": {
            "stato_riconciliazione": stato,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    
    return {
        "success": True,
        "fattura_id": fattura_id,
        "nuovo_stato": stato
    }
