"""
Script di ripristino database da backup JSON.
Eseguire con: python3 restore_database.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
from pathlib import Path

async def restore_database():
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        raise ValueError("MONGO_URL environment variable is required - use MongoDB Atlas connection string")
    client = AsyncIOMotorClient(mongo_url)
    db_name = os.environ.get('DB_NAME', 'azienda_erp_db')
    db = client[db_name]
    
    backup_dir = Path(__file__).parent
    
    print("=== RIPRISTINO DATABASE ===")
    print(f"Directory backup: {backup_dir}")
    
    # Trova tutti i file JSON (escludendo il summary)
    json_files = [f for f in backup_dir.glob("*.json") if f.name != "migration_summary.json"]
    
    for json_file in sorted(json_files):
        coll_name = json_file.stem
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                docs = json.load(f)
            
            if docs:
                # Svuota collezione esistente
                await db[coll_name].delete_many({})
                
                # Inserisci documenti
                if isinstance(docs, list) and len(docs) > 0:
                    await db[coll_name].insert_many(docs)
                    print(f"  ✅ {coll_name}: {len(docs)} documenti ripristinati")
                else:
                    print(f"  ⚠️ {coll_name}: Nessun documento da ripristinare")
                    
        except Exception as e:
            print(f"  ❌ {coll_name}: Errore - {e}")
    
    print("\n=== RIPRISTINO COMPLETATO ===")

if __name__ == "__main__":
    asyncio.run(restore_database())
