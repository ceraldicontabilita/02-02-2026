"""
Router API per il Motore Contabile
==================================

Espone le funzionalità di accounting_engine.py via REST API.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.database import Database
from app.services.accounting_engine import (
    AccountingEngine, 
    get_accounting_engine,
    valida_operazione_prima_nota,
    PIANO_DEI_CONTI,
    REGOLE_CONTABILI
)

router = APIRouter()


@router.get("/piano-conti")
async def get_piano_conti() -> Dict[str, Any]:
    """Restituisce il piano dei conti italiano."""
    return {
        "success": True,
        "piano_conti": [
            {
                "codice": codice,
                "nome": info["nome"],
                "tipo": info["tipo"].value,
                "descrizione": info["descrizione"]
            }
            for codice, info in PIANO_DEI_CONTI.items()
        ],
        "totale": len(PIANO_DEI_CONTI)
    }


@router.get("/regole-contabili")
async def get_regole_contabili_api() -> Dict[str, Any]:
    """Restituisce le regole contabili implementate."""
    return {
        "success": True,
        "regole": [
            {
                "tipo": tipo,
                "descrizione": regola["descrizione"],
                "conto_dare": regola["dare"],
                "conto_avere": regola["avere"],
                "prima_nota": regola["prima_nota"],
                "tipo_movimento": regola["tipo_movimento"]
            }
            for tipo, regola in REGOLE_CONTABILI.items()
        ],
        "totale": len(REGOLE_CONTABILI)
    }


@router.post("/valida-operazione")
async def valida_operazione(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Valida un'operazione prima di inserirla.
    
    Body:
    {
        "descrizione": "Pagamento fattura...",
        "importo": 100.00,
        "data": "2026-01-15",
        "tipo": "uscita",
        "prima_nota": "cassa"
    }
    """
    prima_nota = data.get("prima_nota", "cassa")
    valido, errori = valida_operazione_prima_nota(data, prima_nota)
    
    engine = AccountingEngine()
    tipo_operazione = engine.determina_tipo_operazione(
        data.get("descrizione", ""),
        data.get("importo", 0)
    )
    
    regola = REGOLE_CONTABILI.get(tipo_operazione, {})
    
    return {
        "valido": valido,
        "errori": errori,
        "tipo_operazione_rilevato": tipo_operazione,
        "prima_nota_corretta": regola.get("prima_nota"),
        "suggerimento": {
            "dare": regola.get("dare"),
            "avere": regola.get("avere"),
            "descrizione_regola": regola.get("descrizione")
        }
    }


@router.post("/analizza-prima-nota/{tipo}")
async def analizza_prima_nota(tipo: str) -> Dict[str, Any]:
    """
    Analizza la prima nota (cassa o banca) per trovare errori e duplicati.
    
    Args:
        tipo: "cassa" o "banca"
    """
    if tipo not in ["cassa", "banca"]:
        raise HTTPException(status_code=400, detail="Tipo deve essere 'cassa' o 'banca'")
    
    db = Database.get_db()
    collection = f"prima_nota_{tipo}"
    
    # Carica movimenti
    movimenti = await db[collection].find({}, {"_id": 0}).to_list(5000)
    
    # Analizza
    engine = AccountingEngine()
    analisi = engine.analizza_prima_nota(movimenti, tipo)
    
    return {
        "success": True,
        "tipo": tipo,
        "analisi": analisi
    }


@router.post("/correggi-errori-cassa")
async def correggi_errori_cassa() -> Dict[str, Any]:
    """
    Corregge automaticamente gli errori in Prima Nota Cassa:
    1. Rimuove operazioni bancarie (bonifici, SEPA, ecc.)
    2. Corregge DARE/AVERE per rimborsi
    3. Elimina duplicati
    """
    db = Database.get_db()
    
    correzioni = {
        "operazioni_bancarie_rimosse": 0,
        "rimborsi_corretti": 0,
        "duplicati_rimossi": 0,
        "dettagli": []
    }
    
    # 1. Trova e rimuovi operazioni bancarie
    keywords_bancarie = ["BONIFICO", "BONIF.", "SEPA", "RID", "F24", "ADDEBITO DIRETTO"]
    
    operazioni_bancarie = await db.prima_nota_cassa.find({
        "descrizione": {"$regex": "|".join(keywords_bancarie), "$options": "i"}
    }).to_list(1000)
    
    for op in operazioni_bancarie:
        # Sposta in prima_nota_banca invece di eliminare
        op_banca = {**op}
        op_banca.pop("_id", None)
        op_banca["source"] = "migrato_da_cassa"
        op_banca["migrato_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.prima_nota_banca.insert_one(op_banca)
        await db.prima_nota_cassa.delete_one({"_id": op["_id"]})
        
        correzioni["operazioni_bancarie_rimosse"] += 1
        correzioni["dettagli"].append({
            "azione": "spostato_in_banca",
            "descrizione": op.get("descrizione", "")[:50],
            "importo": op.get("importo")
        })
    
    # 2. Correggi rimborsi (devono essere ENTRATE/DARE)
    rimborsi_errati = await db.prima_nota_cassa.find({
        "descrizione": {"$regex": "rimborso", "$options": "i"},
        "tipo": "uscita"
    }).to_list(100)
    
    for rimb in rimborsi_errati:
        await db.prima_nota_cassa.update_one(
            {"_id": rimb["_id"]},
            {"$set": {
                "tipo": "entrata",
                "corretto_at": datetime.now(timezone.utc).isoformat(),
                "correzione_motivo": "Rimborso è un'entrata (DARE), non un'uscita"
            }}
        )
        correzioni["rimborsi_corretti"] += 1
        correzioni["dettagli"].append({
            "azione": "corretto_dare_avere",
            "descrizione": rimb.get("descrizione", "")[:50],
            "da": "uscita",
            "a": "entrata"
        })
    
    # 3. Rimuovi duplicati
    pipeline = [
        {"$group": {
            "_id": {
                "data": "$data",
                "importo": "$importo",
                "descrizione": {"$substr": ["$descrizione", 0, 50]}
            },
            "count": {"$sum": 1},
            "ids": {"$push": "$_id"}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    
    duplicati = await db.prima_nota_cassa.aggregate(pipeline).to_list(500)
    
    for dup in duplicati:
        # Mantieni il primo, elimina gli altri
        ids_da_eliminare = dup["ids"][1:]
        result = await db.prima_nota_cassa.delete_many({"_id": {"$in": ids_da_eliminare}})
        correzioni["duplicati_rimossi"] += result.deleted_count
    
    return {
        "success": True,
        "correzioni": correzioni
    }


@router.get("/bilancio-verifica")
async def get_bilancio_verifica(anno: int = Query(None)) -> Dict[str, Any]:
    """
    Genera un bilancio di verifica.
    
    Args:
        anno: Anno di riferimento (opzionale)
    """
    db = Database.get_db()
    
    # Carica tutte le scritture contabili
    query = {}
    if anno:
        query["data_documento"] = {"$regex": f"^{anno}"}
    
    scritture = await db.scritture_contabili.find(query, {"_id": 0}).to_list(10000)
    
    if not scritture:
        return {
            "success": True,
            "bilancio": [],
            "totale_dare": 0,
            "totale_avere": 0,
            "quadratura": True,
            "note": "Nessuna scrittura contabile trovata"
        }
    
    engine = AccountingEngine()
    df = engine.genera_bilancio_verifica(scritture)
    
    bilancio = df.to_dict('records') if not df.empty else []
    totale_dare = df['dare'].sum() if not df.empty else 0
    totale_avere = df['avere'].sum() if not df.empty else 0
    
    return {
        "success": True,
        "anno": anno,
        "bilancio": bilancio,
        "totale_dare": round(totale_dare, 2),
        "totale_avere": round(totale_avere, 2),
        "quadratura": abs(totale_dare - totale_avere) < 0.01
    }


@router.post("/storna-operazione/{operazione_id}")
async def storna_operazione(operazione_id: str, motivo: str = Query(...)) -> Dict[str, Any]:
    """
    Crea uno storno per un'operazione esistente.
    
    Invece di cancellare, crea una scrittura inversa che annulla l'effetto contabile.
    """
    db = Database.get_db()
    
    # Trova l'operazione originale
    originale = await db.scritture_contabili.find_one({"id": operazione_id})
    
    if not originale:
        raise HTTPException(status_code=404, detail="Operazione non trovata")
    
    if originale.get("stato") == "stornata":
        raise HTTPException(status_code=400, detail="Operazione già stornata")
    
    # Crea storno
    engine = AccountingEngine()
    storno = engine.crea_storno(originale, motivo)
    
    # Salva storno
    await db.scritture_contabili.insert_one(storno)
    
    # Aggiorna originale come stornata
    await db.scritture_contabili.update_one(
        {"id": operazione_id},
        {"$set": {
            "stato": "stornata",
            "stornato_da": storno["id"],
            "stornato_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Operazione stornata con successo",
        "storno_id": storno["id"],
        "operazione_originale_id": operazione_id
    }
