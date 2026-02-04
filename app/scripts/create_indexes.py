"""
Script per creare indici MongoDB ottimizzati.

Esegui con: python -m app.scripts.create_indexes
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "azienda_erp_db")

if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is required - use MongoDB Atlas connection string")


async def safe_create_index(collection, *args, **kwargs):
    """Crea un indice in modo sicuro, ignorando conflitti con indici esistenti."""
    try:
        return await collection.create_index(*args, **kwargs)
    except OperationFailure as e:
        if e.code == 86:  # IndexKeySpecsConflict
            logger.warning(f"⚠️ Indice già esistente con specifiche diverse, saltato: {args}")
            return None
        raise


async def create_indexes():
    """Crea tutti gli indici ottimizzati per le collezioni principali."""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    logger.info("🚀 Creazione indici MongoDB...")
    
    indexes_created = []
    
    try:
        # ============================================
        # FATTURE RICEVUTE
        # ============================================
        await safe_create_index(db["fatture_ricevute"], "data_ricezione")
        await safe_create_index(db["fatture_ricevute"]("data_fattura")
        await safe_create_index(db["fatture_ricevute"]("fornitore")
        await safe_create_index(db["fatture_ricevute"]("numero_fattura")
        await safe_create_index(db["fatture_ricevute"]([("data_ricezione", -1), ("fornitore", 1)])
        indexes_created.append("fatture_ricevute: data_ricezione, data_fattura, fornitore, numero_fattura")
        logger.info("✅ Indici fatture_ricevute creati")
        
        # ============================================
        # FATTURE EMESSE
        # ============================================
        await safe_create_index(db["fatture_emesse"]("data_fattura")
        await safe_create_index(db["fatture_emesse"]("cliente")
        await safe_create_index(db["fatture_emesse"]("numero")
        await safe_create_index(db["fatture_emesse"]("stato")
        await safe_create_index(db["fatture_emesse"]([("data_fattura", -1)])
        indexes_created.append("fatture_emesse: data_fattura, cliente, numero, stato")
        logger.info("✅ Indici fatture_emesse creati")
        
        # ============================================
        # PRIMA NOTA
        # ============================================
        await safe_create_index(db["prima_nota"]("data")
        await safe_create_index(db["prima_nota"]("tipo")
        await safe_create_index(db["prima_nota"]("categoria")
        await safe_create_index(db["prima_nota"]([("data", -1), ("tipo", 1)])
        await safe_create_index(db["prima_nota"]([("data", 1), ("categoria", 1)])
        indexes_created.append("prima_nota: data, tipo, categoria, compound indexes")
        logger.info("✅ Indici prima_nota creati")
        
        # ============================================
        # ESTRATTO CONTO MOVIMENTI
        # ============================================
        await safe_create_index(db["estratto_conto_movimenti"]("data_operazione")
        await safe_create_index(db["estratto_conto_movimenti"]("data_valuta")
        await safe_create_index(db["estratto_conto_movimenti"]("stato")
        await safe_create_index(db["estratto_conto_movimenti"]("riconciliato")
        await safe_create_index(db["estratto_conto_movimenti"]([("data_operazione", -1), ("stato", 1)])
        indexes_created.append("estratto_conto_movimenti: data_operazione, data_valuta, stato, riconciliato")
        logger.info("✅ Indici estratto_conto_movimenti creati")
        
        # ============================================
        # DIPENDENTI
        # ============================================
        await safe_create_index(db["employees"]("codice_fiscale", unique=True, sparse=True)
        await safe_create_index(db["employees"]("status")
        await safe_create_index(db["employees"]("nome_completo")
        await safe_create_index(db["employees"]([("cognome", 1), ("nome", 1)])
        indexes_created.append("employees: codice_fiscale (unique), status, nome_completo")
        logger.info("✅ Indici employees creati")
        
        # ============================================
        # CEDOLINI
        # ============================================
        await safe_create_index(db["cedolini"]("dipendente_id")
        await safe_create_index(db["cedolini"]([("anno", -1), ("mese", -1)])
        await safe_create_index(db["cedolini"]([("dipendente_id", 1), ("anno", 1), ("mese", 1)])
        indexes_created.append("cedolini: dipendente_id, anno/mese compound")
        logger.info("✅ Indici cedolini creati")
        
        # ============================================
        # F24
        # ============================================
        await safe_create_index(db["f24_models"]("data_scadenza")
        await safe_create_index(db["f24_models"]("pagato")
        await safe_create_index(db["f24_models"]([("data_scadenza", 1), ("pagato", 1)])
        indexes_created.append("f24_models: data_scadenza, pagato")
        logger.info("✅ Indici f24_models creati")
        
        # ============================================
        # SCADENZARIO
        # ============================================
        await safe_create_index(db["scadenzario"]("data_scadenza")
        await safe_create_index(db["scadenzario"]("pagato")
        await safe_create_index(db["scadenzario"]("tipo")
        await safe_create_index(db["scadenzario"]([("data_scadenza", 1), ("pagato", 1)])
        indexes_created.append("scadenzario: data_scadenza, pagato, tipo")
        logger.info("✅ Indici scadenzario creati")
        
        # ============================================
        # CORRISPETTIVI
        # ============================================
        await safe_create_index(db["corrispettivi"]("data")
        await safe_create_index(db["corrispettivi"]([("data", -1)])
        indexes_created.append("corrispettivi: data")
        logger.info("✅ Indici corrispettivi creati")
        
        # ============================================
        # FORNITORI
        # ============================================
        await safe_create_index(db["fornitori"]("partita_iva", unique=True, sparse=True)
        await safe_create_index(db["fornitori"]("ragione_sociale")
        await safe_create_index(db["fornitori"]([("ragione_sociale", "text")])
        indexes_created.append("fornitori: partita_iva (unique), ragione_sociale, text search")
        logger.info("✅ Indici fornitori creati")
        
        # ============================================
        # API CLIENTS
        # ============================================
        await safe_create_index(db["api_clients"]("key_hash", unique=True)
        await safe_create_index(db["api_clients"]("active")
        indexes_created.append("api_clients: key_hash (unique), active")
        logger.info("✅ Indici api_clients creati")
        
        # ============================================
        # DOCUMENTS INBOX
        # ============================================
        await safe_create_index(db["documents_inbox"]("category")
        await safe_create_index(db["documents_inbox"]("status")
        await safe_create_index(db["documents_inbox"]("downloaded_at")
        await safe_create_index(db["documents_inbox"]("filename")
        await safe_create_index(db["documents_inbox"]("hash")
        await safe_create_index(db["documents_inbox"]([("category", 1), ("status", 1)])
        await safe_create_index(db["documents_inbox"]([("downloaded_at", -1)])
        indexes_created.append("documents_inbox: category, status, downloaded_at, filename, hash")
        logger.info("✅ Indici documents_inbox creati")
        
        # ============================================
        # ASSEGNI
        # ============================================
        await safe_create_index(db["assegni"]("numero")
        await safe_create_index(db["assegni"]("importo")
        await safe_create_index(db["assegni"]("stato")
        await safe_create_index(db["assegni"]("beneficiario")
        await safe_create_index(db["assegni"]("fattura_collegata")
        await safe_create_index(db["assegni"]([("importo", 1), ("stato", 1)])
        await safe_create_index(db["assegni"]([("data_emissione", -1)])
        indexes_created.append("assegni: numero, importo, stato, beneficiario, fattura_collegata")
        logger.info("✅ Indici assegni creati")

        # ============================================
        # PRESENZE (ATTENDANCE)
        # ============================================
        await safe_create_index(db["presenze"]("dipendente_id")
        await safe_create_index(db["presenze"]("data")
        await safe_create_index(db["presenze"]("stato")
        await safe_create_index(db["presenze"]([("dipendente_id", 1), ("data", 1)])
        await safe_create_index(db["presenze"]([("data", -1), ("dipendente_id", 1)])
        indexes_created.append("presenze: dipendente_id, data, stato, compound")
        logger.info("✅ Indici presenze creati")

        # ============================================
        # TURNI
        # ============================================
        await safe_create_index(db["turni"]([("anno", 1), ("mese", 1)])
        await safe_create_index(db["turni"]("dipendente_id")
        indexes_created.append("turni: anno/mese, dipendente_id")
        logger.info("✅ Indici turni creati")

        # ============================================
        # REGOLE CATEGORIZZAZIONE
        # ============================================
        await safe_create_index(db["regole_categorizzazione_fornitori"]("pattern")
        await safe_create_index(db["regole_categorizzazione_fornitori"]("categoria")
        await safe_create_index(db["regole_categorizzazione_descrizioni"]("pattern")
        await safe_create_index(db["regole_categorizzazione_descrizioni"]("categoria")
        indexes_created.append("regole_categorizzazione: pattern, categoria")
        logger.info("✅ Indici regole_categorizzazione creati")

        # ============================================
        # INVOICES (collection principale)
        # ============================================
        await safe_create_index(db["invoices"]("supplier_name")
        await safe_create_index(db["invoices"]("invoice_number")
        await safe_create_index(db["invoices"]("total_amount")
        await safe_create_index(db["invoices"]("status")
        await safe_create_index(db["invoices"]("invoice_date")
        await safe_create_index(db["invoices"]([("status", 1), ("total_amount", 1)])
        await safe_create_index(db["invoices"]([("invoice_date", -1)])
        indexes_created.append("invoices: supplier_name, invoice_number, total_amount, status, invoice_date")
        logger.info("✅ Indici invoices creati")
        
        logger.info(f"\n{'='*50}")
        logger.info(f"✅ COMPLETATO: {len(indexes_created)} gruppi di indici creati")
        logger.info(f"{'='*50}")
        
        for idx in indexes_created:
            logger.info(f"  • {idx}")
        
    except Exception as e:
        logger.error(f"❌ Errore creazione indici: {e}")
        raise
    finally:
        client.close()
    
    return indexes_created


async def show_indexes():
    """Mostra tutti gli indici esistenti."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    collections = await db.list_collection_names()
    
    logger.info("\n📊 INDICI ESISTENTI:")
    logger.info("="*50)
    
    for coll_name in sorted(collections):
        indexes = await db[coll_name].index_information()
        if len(indexes) > 1:  # Più di solo _id
            logger.info(f"\n{coll_name}:")
            for idx_name, idx_info in indexes.items():
                if idx_name != "_id_":
                    keys = idx_info.get("key", [])
                    logger.info(f"  • {idx_name}: {keys}")
    
    client.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--show":
        asyncio.run(show_indexes())
    else:
        asyncio.run(create_indexes())
