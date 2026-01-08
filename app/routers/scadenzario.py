"""
Router Scadenzario - Fatture da pagare ai fornitori
"""
from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
import logging

from app.database import Database

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/fatture-da-pagare")
async def fatture_da_pagare(
    anno: int = None,
    giorni_scadenza: int = 90
) -> Dict[str, Any]:
    """
    Lista fatture fornitori da pagare con scadenzario.
    Raggruppa per scadenza: scadute, in scadenza, future.
    """
    db = Database.get_db()
    
    oggi = datetime.now(timezone.utc).date()
    
    # Query base: fatture non pagate
    query = {
        "$or": [
            {"pagata": {"$ne": True}},
            {"pagata": {"$exists": False}}
        ]
    }
    
    if anno:
        query["invoice_date"] = {"$regex": f"^{anno}"}
    
    fatture = await db["invoices"].find(
        query,
        {"_id": 0, "id": 1, "invoice_number": 1, "invoice_date": 1, 
         "supplier_name": 1, "total_amount": 1, "scadenza": 1}
    ).to_list(5000)
    
    # Categorizza per scadenza
    scadute = []
    in_scadenza_7gg = []
    in_scadenza_30gg = []
    future = []
    
    totale_scaduto = 0
    totale_scadenza_7 = 0
    totale_scadenza_30 = 0
    totale_futuro = 0
    
    for f in fatture:
        importo = f.get("total_amount", 0) or 0
        
        # Determina data scadenza (30 giorni da fattura se non specificata)
        scadenza_str = f.get("scadenza")
        if not scadenza_str:
            data_fattura = f.get("invoice_date", "")[:10]
            if data_fattura:
                try:
                    dt_fattura = datetime.strptime(data_fattura, "%Y-%m-%d").date()
                    scadenza = dt_fattura + timedelta(days=30)
                except:
                    scadenza = oggi + timedelta(days=30)
            else:
                scadenza = oggi + timedelta(days=30)
        else:
            try:
                scadenza = datetime.strptime(scadenza_str[:10], "%Y-%m-%d").date()
            except:
                scadenza = oggi + timedelta(days=30)
        
        giorni = (scadenza - oggi).days
        
        record = {
            "id": f.get("id"),
            "numero_fattura": f.get("invoice_number"),
            "data_fattura": f.get("invoice_date", "")[:10],
            "fornitore": f.get("supplier_name"),
            "importo": importo,
            "scadenza": scadenza.isoformat(),
            "giorni_scadenza": giorni
        }
        
        if giorni < 0:
            record["stato"] = "SCADUTA"
            record["giorni_ritardo"] = abs(giorni)
            scadute.append(record)
            totale_scaduto += importo
        elif giorni <= 7:
            record["stato"] = "IN SCADENZA"
            in_scadenza_7gg.append(record)
            totale_scadenza_7 += importo
        elif giorni <= 30:
            record["stato"] = "PROSSIMA"
            in_scadenza_30gg.append(record)
            totale_scadenza_30 += importo
        else:
            record["stato"] = "FUTURA"
            future.append(record)
            totale_futuro += importo
    
    # Ordina per giorni
    scadute.sort(key=lambda x: x["giorni_ritardo"], reverse=True)
    in_scadenza_7gg.sort(key=lambda x: x["giorni_scadenza"])
    in_scadenza_30gg.sort(key=lambda x: x["giorni_scadenza"])
    future.sort(key=lambda x: x["giorni_scadenza"])
    
    return {
        "data_riferimento": oggi.isoformat(),
        "riepilogo": {
            "totale_da_pagare": round(totale_scaduto + totale_scadenza_7 + totale_scadenza_30 + totale_futuro, 2),
            "totale_scaduto": round(totale_scaduto, 2),
            "totale_scadenza_7gg": round(totale_scadenza_7, 2),
            "totale_scadenza_30gg": round(totale_scadenza_30, 2),
            "totale_futuro": round(totale_futuro, 2),
            "num_scadute": len(scadute),
            "num_in_scadenza": len(in_scadenza_7gg) + len(in_scadenza_30gg)
        },
        "alert": {
            "critico": len(scadute) > 0,
            "urgente": len(in_scadenza_7gg) > 0,
            "messaggio": f"⚠️ {len(scadute)} fatture SCADUTE per €{totale_scaduto:,.2f}" if scadute else "✅ Nessuna fattura scaduta"
        },
        "scadute": scadute[:50],  # Limita per performance
        "in_scadenza_7gg": in_scadenza_7gg,
        "in_scadenza_30gg": in_scadenza_30gg[:30],
        "future": future[:20]
    }


@router.get("/cash-flow-previsionale")
async def cash_flow_previsionale(settimane: int = 4) -> Dict[str, Any]:
    """
    Previsione uscite per le prossime settimane
    basata sulle fatture da pagare.
    """
    db = Database.get_db()
    
    oggi = datetime.now(timezone.utc).date()
    
    fatture = await db["invoices"].find(
        {"$or": [{"pagata": {"$ne": True}}, {"pagata": {"$exists": False}}]},
        {"_id": 0, "total_amount": 1, "scadenza": 1, "invoice_date": 1}
    ).to_list(5000)
    
    # Raggruppa per settimana
    previsioni = {}
    for i in range(settimane):
        inizio_sett = oggi + timedelta(weeks=i)
        fine_sett = oggi + timedelta(weeks=i+1)
        previsioni[f"settimana_{i+1}"] = {
            "dal": inizio_sett.isoformat(),
            "al": fine_sett.isoformat(),
            "importo_previsto": 0,
            "num_fatture": 0
        }
    
    for f in fatture:
        scadenza_str = f.get("scadenza") or f.get("invoice_date")
        if not scadenza_str:
            continue
        
        try:
            scadenza = datetime.strptime(scadenza_str[:10], "%Y-%m-%d").date()
            if not f.get("scadenza"):
                scadenza += timedelta(days=30)
        except:
            continue
        
        importo = f.get("total_amount", 0) or 0
        
        for i in range(settimane):
            inizio_sett = oggi + timedelta(weeks=i)
            fine_sett = oggi + timedelta(weeks=i+1)
            
            if inizio_sett <= scadenza < fine_sett:
                previsioni[f"settimana_{i+1}"]["importo_previsto"] += importo
                previsioni[f"settimana_{i+1}"]["num_fatture"] += 1
                break
    
    # Arrotonda
    for k in previsioni:
        previsioni[k]["importo_previsto"] = round(previsioni[k]["importo_previsto"], 2)
    
    totale = sum(p["importo_previsto"] for p in previsioni.values())
    
    return {
        "settimane_analizzate": settimane,
        "previsioni": previsioni,
        "totale_previsto": round(totale, 2),
        "nota": "Basato sulle scadenze fatture fornitori"
    }
