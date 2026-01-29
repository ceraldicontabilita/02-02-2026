"""
Script per rielaborare cedolini PDF con il nuovo parser multi-template.
Aggiorna i record esistenti nel database con i dati estratti correttamente.
"""
import asyncio
import base64
import logging
import sys
from datetime import datetime, timezone

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add paths
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

# Import parser
from app.parsers.busta_paga_multi_template import parse_busta_paga_from_bytes, extract_summary


async def reparse_cedolini():
    """Rielabora tutti i cedolini PDF nel database."""
    
    # Connessione MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'azienda_erp_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    stats = {
        "totale": 0,
        "processati": 0,
        "aggiornati": 0,
        "errori": 0,
        "senza_pdf": 0,
        "per_template": {
            "csc_napoli": 0,
            "zucchetti_classic": 0,
            "zucchetti_new": 0,
            "unknown": 0
        },
        "per_anno": {}
    }
    
    # Trova tutti i cedolini con pdf_data
    cursor = db["cedolini"].find(
        {"pdf_data": {"$exists": True, "$ne": None}},
        {"_id": 1, "id": 1, "pdf_data": 1, "anno": 1, "mese": 1, "dipendente_nome": 1, "netto": 1, "lordo": 1}
    )
    
    cedolini = await cursor.to_list(length=1000)
    stats["totale"] = len(cedolini)
    
    logger.info(f"Trovati {stats['totale']} cedolini con PDF da rielaborare")
    
    for i, ced in enumerate(cedolini):
        try:
            pdf_data = ced.get("pdf_data")
            if not pdf_data:
                stats["senza_pdf"] += 1
                continue
            
            # Decodifica PDF
            try:
                pdf_bytes = base64.b64decode(pdf_data)
            except Exception as e:
                logger.warning(f"Errore decodifica PDF {ced.get('id')}: {e}")
                stats["errori"] += 1
                continue
            
            # Parse con nuovo parser
            result = parse_busta_paga_from_bytes(pdf_bytes)
            
            if not result.get("parse_success"):
                logger.warning(f"Parse fallito per {ced.get('id')}: {result.get('parse_error')}")
                stats["errori"] += 1
                continue
            
            stats["processati"] += 1
            
            # Estrai summary
            summary = extract_summary(result)
            template = result.get("template", "unknown")
            stats["per_template"][template] = stats["per_template"].get(template, 0) + 1
            
            anno = summary.get("anno") or ced.get("anno")
            if anno:
                stats["per_anno"][anno] = stats["per_anno"].get(anno, 0) + 1
            
            # Prepara update
            update_data = {
                "template_rilevato": template,
                "reparse_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Aggiorna solo se abbiamo dati nuovi
            if summary.get("lordo") and summary["lordo"] > 0:
                update_data["lordo"] = summary["lordo"]
            
            if summary.get("trattenute") and summary["trattenute"] > 0:
                update_data["totale_trattenute"] = summary["trattenute"]
            
            # Aggiorna netto solo se diverso e valido
            if summary.get("netto") and summary["netto"] != 0:
                # Mantieni il vecchio netto se quello nuovo è negativo (pignoramenti)
                if summary["netto"] > 0 or not ced.get("netto"):
                    update_data["netto"] = summary["netto"]
            
            if summary.get("dipendente_nome"):
                update_data["nome_dipendente_parsed"] = summary["dipendente_nome"]
            
            if summary.get("codice_fiscale"):
                update_data["codice_fiscale_parsed"] = summary["codice_fiscale"]
            
            if summary.get("ore_lavorate"):
                update_data["ore_lavorate"] = summary["ore_lavorate"]
            
            if summary.get("giorni_lavorati"):
                update_data["giorni_lavorati"] = summary["giorni_lavorati"]
            
            if summary.get("inps_dipendente"):
                update_data["inps_dipendente"] = summary["inps_dipendente"]
            
            if summary.get("irpef"):
                update_data["irpef"] = summary["irpef"]
            
            if summary.get("tfr_quota"):
                update_data["tfr_quota"] = summary["tfr_quota"]
            
            # Aggiorna record
            await db["cedolini"].update_one(
                {"_id": ced["_id"]},
                {"$set": update_data}
            )
            stats["aggiornati"] += 1
            
            # Log progresso ogni 50 record
            if (i + 1) % 50 == 0:
                logger.info(f"Processati {i + 1}/{stats['totale']} cedolini...")
            
        except Exception as e:
            logger.error(f"Errore processamento cedolino {ced.get('id')}: {e}")
            stats["errori"] += 1
    
    # Chiudi connessione
    client.close()
    
    return stats


async def main():
    logger.info("=" * 60)
    logger.info("RIELABORAZIONE CEDOLINI PDF CON NUOVO PARSER MULTI-TEMPLATE")
    logger.info("=" * 60)
    
    stats = await reparse_cedolini()
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("RIEPILOGO")
    logger.info("=" * 60)
    logger.info(f"Totale cedolini trovati: {stats['totale']}")
    logger.info(f"Processati con successo: {stats['processati']}")
    logger.info(f"Aggiornati nel database: {stats['aggiornati']}")
    logger.info(f"Errori: {stats['errori']}")
    logger.info(f"Senza PDF: {stats['senza_pdf']}")
    logger.info("")
    logger.info("Per template:")
    for template, count in stats["per_template"].items():
        logger.info(f"  {template}: {count}")
    logger.info("")
    logger.info("Per anno:")
    for anno in sorted(stats["per_anno"].keys()):
        logger.info(f"  {anno}: {stats['per_anno'][anno]}")


if __name__ == "__main__":
    asyncio.run(main())
