"""
Fatture Module - Operazioni di pagamento e riconciliazione.
"""
from fastapi import HTTPException, Query
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import logging

from app.database import Database
from app.routers.ciclo_passivo_integrato import COL_SCADENZIARIO
from .common import COL_FORNITORI, COL_FATTURE_RICEVUTE, logger


async def paga_fattura_manuale(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Registra pagamento manuale di una fattura (Cassa o Banca)."""
    db = Database.get_db()
    
    fattura_id = payload.get("fattura_id")
    scadenza_id = payload.get("scadenza_id")
    importo = float(payload.get("importo", 0))
    metodo = payload.get("metodo", "banca").lower()
    data_pagamento = payload.get("data_pagamento")
    fornitore = payload.get("fornitore", "Fornitore")
    numero_fattura = payload.get("numero_fattura", "")
    
    if not fattura_id or importo <= 0:
        raise HTTPException(status_code=400, detail="fattura_id e importo sono obbligatori")
    
    if metodo not in ["cassa", "banca"]:
        raise HTTPException(status_code=400, detail="metodo deve essere 'cassa' o 'banca'")
    
    risultato = {"success": True, "movimento_id": None, "metodo": metodo, "importo": importo}
    
    try:
        movimento_id = str(uuid.uuid4())
        movimento = {
            "id": movimento_id,
            "data": data_pagamento,
            "descrizione": f"Pagamento Fatt. {numero_fattura} - {fornitore}",
            "causale": f"Pagamento fattura fornitore",
            "importo": importo,
            "tipo": "uscita",
            "categoria": "fornitori",
            "stato": "confermato",
            "fattura_id": fattura_id,
            "fattura_collegata": fattura_id,
            "fattura_numero": numero_fattura,
            "fornitore": fornitore,
            "metodo_pagamento": metodo,
            "provvisorio": True,
            "riconciliato": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "pagamento_manuale"
        }
        
        collection = "prima_nota_cassa" if metodo == "cassa" else "prima_nota_banca"
        await db[collection].insert_one(movimento)
        risultato["movimento_id"] = movimento_id
        risultato["collection"] = collection
        
        if scadenza_id:
            await db[COL_SCADENZIARIO].update_one(
                {"id": scadenza_id},
                {"$set": {
                    "stato": "pagato",
                    "data_pagamento": data_pagamento,
                    "metodo_effettivo": metodo,
                    "movimento_id": movimento_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        update_fields = {
            "status": "paid",
            "pagato": True,
            "stato_pagamento": "pagata",
            "data_pagamento": data_pagamento,
            "metodo_pagamento_effettivo": metodo,
            "metodo_pagamento": metodo,
            "metodo_pagamento_modificato_manualmente": True,
            "provvisorio": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if metodo == "cassa":
            update_fields["prima_nota_cassa_id"] = movimento_id
            update_fields["prima_nota_banca_id"] = None
        else:
            update_fields["prima_nota_banca_id"] = movimento_id
            update_fields["prima_nota_cassa_id"] = None
        
        await db[COL_FATTURE_RICEVUTE].update_one({"id": fattura_id}, {"$set": update_fields})
        logger.info(f"Pagamento manuale registrato: {fattura_id} -> {collection}, €{importo}")
        
    except Exception as e:
        logger.error(f"Errore pagamento manuale: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    return risultato


async def cambia_metodo_pagamento_fattura(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Modifica il metodo di pagamento di una fattura."""
    db = Database.get_db()
    
    fattura_id = payload.get("fattura_id")
    nuovo_metodo = payload.get("metodo")
    
    if not fattura_id or not nuovo_metodo:
        raise HTTPException(status_code=400, detail="fattura_id e metodo sono obbligatori")
    
    fattura = await db[COL_FATTURE_RICEVUTE].find_one({"id": fattura_id})
    if not fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    
    metodo_precedente = fattura.get("metodo_pagamento")
    
    # Aggiorna fattura
    await db[COL_FATTURE_RICEVUTE].update_one(
        {"id": fattura_id},
        {"$set": {
            "metodo_pagamento": nuovo_metodo,
            "metodo_pagamento_precedente": metodo_precedente,
            "metodo_pagamento_modificato_manualmente": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Aggiorna scadenze collegate
    await db[COL_SCADENZIARIO].update_many(
        {"fattura_id": fattura_id},
        {"$set": {"metodo_pagamento": nuovo_metodo, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Aggiorna metodo predefinito fornitore se richiesto
    piva = fattura.get("fornitore_partita_iva") or fattura.get("supplier_vat")
    if piva and payload.get("aggiorna_fornitore"):
        await db[COL_FORNITORI].update_one(
            {"partita_iva": piva},
            {"$set": {
                "metodo_pagamento": nuovo_metodo,
                "metodo_pagamento_predefinito": nuovo_metodo,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "success": True,
        "fattura_id": fattura_id,
        "metodo_precedente": metodo_precedente,
        "metodo_nuovo": nuovo_metodo
    }


async def riconcilia_fattura_con_estratto_conto(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Riconcilia fattura con movimento estratto conto."""
    db = Database.get_db()
    
    fattura_id = payload.get("fattura_id")
    movimento_id = payload.get("movimento_id")
    
    if not fattura_id or not movimento_id:
        raise HTTPException(status_code=400, detail="fattura_id e movimento_id sono obbligatori")
    
    fattura = await db[COL_FATTURE_RICEVUTE].find_one({"id": fattura_id})
    if not fattura:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    
    movimento = await db["estratto_conto_movimenti"].find_one({"id": movimento_id})
    if not movimento:
        raise HTTPException(status_code=404, detail="Movimento non trovato")
    
    # Aggiorna fattura
    await db[COL_FATTURE_RICEVUTE].update_one(
        {"id": fattura_id},
        {"$set": {
            "riconciliato": True,
            "movimento_bancario_id": movimento_id,
            "data_riconciliazione": datetime.now(timezone.utc).isoformat(),
            "provvisorio": False,
            "pagato": True,
            "stato_pagamento": "pagata",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Aggiorna movimento
    await db["estratto_conto_movimenti"].update_one(
        {"id": movimento_id},
        {"$set": {
            "riconciliato": True,
            "fattura_id": fattura_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Aggiorna prima nota banca se esiste
    prima_nota_id = fattura.get("prima_nota_banca_id")
    if prima_nota_id:
        await db["prima_nota_banca"].update_one(
            {"id": prima_nota_id},
            {"$set": {
                "riconciliato": True,
                "movimento_bancario_id": movimento_id,
                "provvisorio": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "success": True,
        "fattura_id": fattura_id,
        "movimento_id": movimento_id,
        "message": "Riconciliazione completata"
    }


async def verifica_incoerenze_estratto_conto() -> Dict[str, Any]:
    """Verifica incoerenze tra fatture e estratto conto."""
    db = Database.get_db()
    
    fatture_banca = await db[COL_FATTURE_RICEVUTE].find(
        {"metodo_pagamento": {"$in": ["bonifico", "banca", "sepa"]}, "pagato": True, "riconciliato": {"$ne": True}},
        {"_id": 0, "id": 1, "numero_documento": 1, "importo_totale": 1, "fornitore_ragione_sociale": 1, "data_pagamento": 1}
    ).to_list(1000)
    
    incoerenze = []
    for f in fatture_banca:
        importo = f.get("importo_totale", 0)
        data = f.get("data_pagamento", "")
        
        movimento = await db["estratto_conto_movimenti"].find_one({
            "importo": {"$gte": importo - 0.5, "$lte": importo + 0.5},
            "data": {"$gte": data[:10] if data else "", "$lte": (data[:10] if data else "") + "T23:59:59"} if data else {},
            "riconciliato": {"$ne": True}
        })
        
        if not movimento:
            incoerenze.append({
                "fattura_id": f.get("id"),
                "numero": f.get("numero_documento"),
                "importo": importo,
                "fornitore": f.get("fornitore_ragione_sociale"),
                "data_pagamento": data,
                "problema": "Nessun movimento bancario corrispondente"
            })
    
    return {
        "totale_fatture_banca_pagate": len(fatture_banca),
        "incoerenze": len(incoerenze),
        "dettagli": incoerenze[:50]
    }


async def aggiorna_metodi_pagamento_da_fornitori() -> Dict[str, Any]:
    """Aggiorna metodi pagamento fatture dal fornitore."""
    db = Database.get_db()
    
    fatture = await db[COL_FATTURE_RICEVUTE].find(
        {"metodo_pagamento": {"$in": [None, "", "da_configurare"]}, "metodo_pagamento_modificato_manualmente": {"$ne": True}},
        {"_id": 0, "id": 1, "fornitore_partita_iva": 1, "supplier_vat": 1}
    ).to_list(10000)
    
    aggiornate = 0
    for f in fatture:
        piva = f.get("fornitore_partita_iva") or f.get("supplier_vat")
        if not piva:
            continue
        
        fornitore = await db[COL_FORNITORI].find_one({"partita_iva": piva}, {"_id": 0, "metodo_pagamento": 1})
        if fornitore and fornitore.get("metodo_pagamento"):
            await db[COL_FATTURE_RICEVUTE].update_one(
                {"id": f["id"]},
                {"$set": {"metodo_pagamento": fornitore["metodo_pagamento"], "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            aggiornate += 1
    
    return {"success": True, "fatture_aggiornate": aggiornate, "totale_analizzate": len(fatture)}
