"""
Script per unificare i cedolini:
1. I dati da Excel (netto) devono essere agganciati ai PDF dello stesso mese/dipendente
2. Rimuove duplicati
3. Mantiene cedolini come unica collezione di riferimento
"""
import asyncio
import base64
import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

import sys
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')


async def unifica_cedolini():
    """
    Unifica i cedolini Excel con i PDF:
    - Se esiste un PDF per lo stesso mese/dipendente, aggancia i dati
    - I cedolini Excel senza PDF rimangono per tracciare i mesi mancanti
    """
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client['azienda_erp_db']
    
    stats = {
        "cedolini_excel": 0,
        "cedolini_pdf": 0,
        "agganciati": 0,
        "non_agganciati": 0,
        "errori": 0
    }
    
    # Trova tutti i cedolini da Excel (source = excel_paghe_bonifici)
    cedolini_excel = await db.cedolini.find(
        {"source": "excel_paghe_bonifici"},
        {"_id": 1, "id": 1, "dipendente_nome": 1, "codice_fiscale": 1, 
         "mese": 1, "anno": 1, "netto": 1, "netto_mese": 1}
    ).to_list(1000)
    
    stats["cedolini_excel"] = len(cedolini_excel)
    logger.info(f"Trovati {len(cedolini_excel)} cedolini da Excel")
    
    for ced_excel in cedolini_excel:
        try:
            mese = ced_excel.get("mese")
            anno = ced_excel.get("anno")
            cf = ced_excel.get("codice_fiscale")
            nome = ced_excel.get("dipendente_nome", "")
            netto_excel = ced_excel.get("netto") or ced_excel.get("netto_mese") or 0
            
            if not mese or not anno:
                continue
            
            # Cerca cedolino PDF corrispondente
            query = {
                "source": "pdf_upload",
                "mese": mese,
                "anno": anno
            }
            
            # Match per codice fiscale o nome
            if cf:
                query["$or"] = [
                    {"codice_fiscale": cf},
                    {"codice_fiscale_parsed": cf}
                ]
            elif nome:
                # Match fuzzy per nome
                nome_parts = nome.upper().split()
                query["$or"] = [
                    {"dipendente_nome": {"$regex": nome_parts[0], "$options": "i"}},
                    {"nome_dipendente_parsed": {"$regex": nome_parts[0], "$options": "i"}}
                ]
            
            ced_pdf = await db.cedolini.find_one(query)
            
            if ced_pdf:
                # AGGANCIA: aggiorna il cedolino PDF con il netto da Excel
                update_data = {
                    "netto_excel": netto_excel,
                    "excel_agganciato": True,
                    "excel_id": ced_excel.get("id"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Se il PDF non ha netto ma l'Excel sì, usa quello
                if not ced_pdf.get("netto") and netto_excel > 0:
                    update_data["netto"] = netto_excel
                
                await db.cedolini.update_one(
                    {"_id": ced_pdf["_id"]},
                    {"$set": update_data}
                )
                
                # Elimina il cedolino Excel (ora è agganciato al PDF)
                await db.cedolini.delete_one({"_id": ced_excel["_id"]})
                
                stats["agganciati"] += 1
                logger.info(f"Agganciato: {nome} {mese:02d}/{anno}")
            else:
                # Nessun PDF trovato - il cedolino Excel rimane per tracciare il mese mancante
                await db.cedolini.update_one(
                    {"_id": ced_excel["_id"]},
                    {"$set": {"pdf_mancante": True}}
                )
                stats["non_agganciati"] += 1
                
        except Exception as e:
            logger.error(f"Errore: {e}")
            stats["errori"] += 1
    
    # Conta cedolini PDF
    stats["cedolini_pdf"] = await db.cedolini.count_documents({"source": "pdf_upload"})
    
    client.close()
    return stats


async def pulisci_duplicati():
    """Rimuove cedolini duplicati (stesso mese/anno/dipendente)."""
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client['azienda_erp_db']
    
    # Trova duplicati
    pipeline = [
        {"$group": {
            "_id": {
                "mese": "$mese",
                "anno": "$anno",
                "codice_fiscale": "$codice_fiscale"
            },
            "count": {"$sum": 1},
            "ids": {"$push": "$_id"}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    
    duplicati = await db.cedolini.aggregate(pipeline).to_list(1000)
    
    rimossi = 0
    for dup in duplicati:
        ids = dup["ids"]
        # Mantieni il primo (preferibilmente quello con PDF)
        cedolini = await db.cedolini.find(
            {"_id": {"$in": ids}},
            {"_id": 1, "source": 1, "pdf_data": 1, "lordo": 1}
        ).to_list(10)
        
        # Ordina: PDF con lordo > PDF senza lordo > Excel
        def priority(c):
            has_pdf = c.get("pdf_data") is not None
            has_lordo = (c.get("lordo") or 0) > 0
            if has_pdf and has_lordo:
                return 0
            if has_pdf:
                return 1
            return 2
        
        cedolini.sort(key=priority)
        
        # Mantieni il primo, elimina gli altri
        for c in cedolini[1:]:
            await db.cedolini.delete_one({"_id": c["_id"]})
            rimossi += 1
    
    client.close()
    return rimossi


async def ricalcola_statistiche():
    """Ricalcola statistiche dopo la pulizia."""
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client['azienda_erp_db']
    
    totale = await db.cedolini.count_documents({})
    con_pdf = await db.cedolini.count_documents({"pdf_data": {"$exists": True, "$ne": None}})
    con_lordo = await db.cedolini.count_documents({"lordo": {"$gt": 0}})
    senza_pdf = await db.cedolini.count_documents({"pdf_mancante": True})
    
    # Per anno
    pipeline = [
        {"$group": {"_id": "$anno", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    per_anno = await db.cedolini.aggregate(pipeline).to_list(50)
    
    client.close()
    
    return {
        "totale": totale,
        "con_pdf": con_pdf,
        "con_lordo": con_lordo,
        "senza_pdf_marker": senza_pdf,
        "per_anno": {r["_id"]: r["count"] for r in per_anno if r["_id"]}
    }


async def main():
    logger.info("=" * 60)
    logger.info("UNIFICAZIONE CEDOLINI - Excel + PDF")
    logger.info("=" * 60)
    
    # 1. Unifica Excel con PDF
    logger.info("\n1. Agganciando cedolini Excel a PDF...")
    stats = await unifica_cedolini()
    logger.info(f"   Cedolini Excel: {stats['cedolini_excel']}")
    logger.info(f"   Agganciati a PDF: {stats['agganciati']}")
    logger.info(f"   Senza PDF (mesi mancanti): {stats['non_agganciati']}")
    
    # 2. Pulisci duplicati
    logger.info("\n2. Rimuovendo duplicati...")
    rimossi = await pulisci_duplicati()
    logger.info(f"   Duplicati rimossi: {rimossi}")
    
    # 3. Statistiche finali
    logger.info("\n3. Statistiche finali...")
    stats_finali = await ricalcola_statistiche()
    logger.info(f"   Totale cedolini: {stats_finali['totale']}")
    logger.info(f"   Con PDF: {stats_finali['con_pdf']}")
    logger.info(f"   Con lordo estratto: {stats_finali['con_lordo']}")
    logger.info(f"   Mesi senza PDF: {stats_finali['senza_pdf_marker']}")
    logger.info("\n   Per anno:")
    for anno, count in sorted(stats_finali['per_anno'].items()):
        logger.info(f"      {anno}: {count}")


if __name__ == "__main__":
    asyncio.run(main())
