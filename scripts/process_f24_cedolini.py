"""
Script per processare F24 e Cedolini unici con AI Parser.
Evita duplicati e salva nel database.
"""
import asyncio
import os
import sys
import glob
import hashlib
sys.path.insert(0, '/app')

from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

from app.database import Database
from app.services.ai_document_parser import parse_f24_ai, parse_busta_paga_ai, convert_ai_busta_paga_to_dipendente_update


def get_file_hash(filepath):
    """Calcola hash MD5 del file per deduplica."""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


async def process_unique_f24(limit=50):
    """Processa solo F24 unici (no duplicati)."""
    db = Database.get_db()
    
    # Trova tutti i file F24
    f24_files = glob.glob('/app/documents/F24/*.PDF') + glob.glob('/app/documents/F24/*.pdf')
    
    # Deduplica per contenuto (hash)
    unique_files = {}
    for filepath in f24_files:
        try:
            file_hash = get_file_hash(filepath)
            if file_hash not in unique_files:
                unique_files[file_hash] = filepath
        except Exception as e:
            print(f"Errore hash {filepath}: {e}")
    
    print(f"📄 File F24 totali: {len(f24_files)}")
    print(f"📄 File F24 unici: {len(unique_files)}")
    
    # Verifica quali sono già nel DB
    existing_hashes = await db["f24_unificato"].distinct("file_hash")
    existing_set = set(existing_hashes)
    
    to_process = [(h, p) for h, p in unique_files.items() if h not in existing_set][:limit]
    
    print(f"📄 Da processare: {len(to_process)}")
    
    success = 0
    errors = 0
    
    for i, (file_hash, filepath) in enumerate(to_process):
        try:
            filename = os.path.basename(filepath)
            print(f"  [{i+1}/{len(to_process)}] {filename[:50]}...", end=" ")
            
            with open(filepath, 'rb') as f:
                pdf_data = f.read()
            
            result = await parse_f24_ai(file_bytes=pdf_data)
            
            if result.get('success'):
                doc = {
                    "id": f"f24_{datetime.now().timestamp()}_{i}",
                    "filename": filename,
                    "file_hash": file_hash,
                    "tipo_documento": result.get("tipo_documento"),
                    "data_pagamento": result.get("data_pagamento"),
                    "codice_fiscale": result.get("codice_fiscale"),
                    "ragione_sociale": result.get("ragione_sociale"),
                    "totale_versato": result.get("totali", {}).get("totale_debito", 0),
                    "sezione_erario": result.get("sezione_erario", []),
                    "sezione_inps": result.get("sezione_inps", []),
                    "sezione_regioni": result.get("sezione_regioni", []),
                    "banca": result.get("banca"),
                    "ai_parsed": True,
                    "parsed_at": datetime.now(timezone.utc).isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db["f24_unificato"].insert_one(doc)
                success += 1
                totale = result.get('totali', {}).get('totale_debito', 0)
                print(f"✅ €{totale:,.2f}")
            else:
                errors += 1
                print(f"❌ {result.get('error', 'Errore')[:40]}")
                
        except Exception as e:
            errors += 1
            print(f"❌ {str(e)[:40]}")
    
    return {"success": success, "errors": errors}


async def process_cedolini(limit=30):
    """Processa cedolini e aggiorna dipendenti."""
    db = Database.get_db()
    
    # Trova file cedolini
    cedolini_files = glob.glob('/app/documents/Buste Paga/*.pdf') + glob.glob('/app/documents/Buste Paga/*.PDF')
    
    # Deduplica
    unique_files = {}
    for filepath in cedolini_files:
        try:
            file_hash = get_file_hash(filepath)
            if file_hash not in unique_files:
                unique_files[file_hash] = filepath
        except:
            pass
    
    print(f"📄 Cedolini totali: {len(cedolini_files)}")
    print(f"📄 Cedolini unici: {len(unique_files)}")
    
    # Verifica già processati
    existing_hashes = await db["cedolini_parsed"].distinct("file_hash")
    existing_set = set(existing_hashes)
    
    to_process = [(h, p) for h, p in unique_files.items() if h not in existing_set][:limit]
    
    print(f"📄 Da processare: {len(to_process)}")
    
    success = 0
    errors = 0
    dipendenti_aggiornati = 0
    
    for i, (file_hash, filepath) in enumerate(to_process):
        try:
            filename = os.path.basename(filepath)
            print(f"  [{i+1}/{len(to_process)}] {filename[:40]}...", end=" ")
            
            with open(filepath, 'rb') as f:
                pdf_data = f.read()
            
            result = await parse_busta_paga_ai(file_bytes=pdf_data)
            
            if result.get('success'):
                doc = {
                    "id": f"ced_{datetime.now().timestamp()}_{i}",
                    "filename": filename,
                    "file_hash": file_hash,
                    **result,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                doc.pop('pdf_data', None)
                
                await db["cedolini_parsed"].insert_one(doc)
                
                # Aggiorna dipendente
                cf = result.get("dipendente", {}).get("codice_fiscale")
                if cf:
                    dip = await db["employees"].find_one({"codice_fiscale": cf})
                    if dip:
                        update_data = convert_ai_busta_paga_to_dipendente_update(result)
                        await db["employees"].update_one(
                            {"codice_fiscale": cf},
                            {"$set": {
                                "progressivi": update_data["progressivi"],
                                "tfr_accantonato": update_data["tfr"]["fondo_accantonato"],
                                "ultimo_cedolino": update_data["ultimo_cedolino"],
                                "progressivi_aggiornati_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        dipendenti_aggiornati += 1
                
                success += 1
                nome = result.get('dipendente', {}).get('cognome', '?')
                print(f"✅ {nome}")
            else:
                errors += 1
                print(f"❌ {result.get('error', 'Errore')[:40]}")
                
        except Exception as e:
            errors += 1
            print(f"❌ {str(e)[:40]}")
    
    return {"success": success, "errors": errors, "dipendenti": dipendenti_aggiornati}


async def main():
    print("=" * 60)
    print("   PROCESSING F24 E CEDOLINI CON AI")
    print("=" * 60)
    
    await Database.connect_db()
    
    print("\n--- F24 ---")
    r1 = await process_unique_f24(limit=20)
    print(f"\n📊 F24: {r1['success']} success, {r1['errors']} errors")
    
    print("\n--- CEDOLINI ---")
    r2 = await process_cedolini(limit=15)
    print(f"\n📊 Cedolini: {r2['success']} success, {r2['errors']} errors")
    print(f"📊 Dipendenti aggiornati: {r2['dipendenti']}")
    
    # Stato finale
    db = Database.get_db()
    f24_count = await db["f24"].count_documents({})
    ced_count = await db["cedolini_parsed"].count_documents({})
    
    print("\n" + "=" * 60)
    print(f"   STATO FINALE: {f24_count} F24, {ced_count} cedolini nel DB")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
