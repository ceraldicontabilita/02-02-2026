"""
Script batch per processare tutti i documenti con AI Parser.
Processa: F24, Cedolini, Quietanze F24
"""
import asyncio
import os
import sys
import glob
from datetime import datetime, timezone

# Aggiungi path per imports
sys.path.insert(0, '/app')

from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

from app.database import Database
from app.services.ai_document_parser import (
    parse_f24_ai,
    parse_busta_paga_ai,
    convert_ai_busta_paga_to_dipendente_update
)

async def process_f24_batch(limit=50):
    """Processa batch di F24 PDF."""
    db = Database.get_db()
    
    # Trova tutti i PDF F24
    f24_paths = glob.glob('/app/documents/F24/*.PDF') + glob.glob('/app/documents/F24/*.pdf')
    f24_paths += glob.glob('/app/uploads/quietanze_f24/*.PDF') + glob.glob('/app/uploads/quietanze_f24/*.pdf')
    
    print(f"🔍 Trovati {len(f24_paths)} file F24")
    
    # Trova quelli già processati
    existing = await db["f24_parsed"].distinct("source_file")
    to_process = [p for p in f24_paths if os.path.basename(p) not in existing][:limit]
    
    print(f"📄 Da processare: {len(to_process)} (già processati: {len(existing)})")
    
    success = 0
    errors = 0
    
    for i, filepath in enumerate(to_process):
        try:
            print(f"  [{i+1}/{len(to_process)}] Parsing {os.path.basename(filepath)}...", end=" ")
            
            with open(filepath, 'rb') as f:
                pdf_data = f.read()
            
            result = await parse_f24_ai(file_bytes=pdf_data)
            
            if result.get('success'):
                # Salva nel database
                doc = {
                    **result,
                    "source_file": os.path.basename(filepath),
                    "source_path": filepath,
                    "imported_at": datetime.now(timezone.utc).isoformat()
                }
                # Rimuovi pdf_data per non duplicare
                doc.pop('pdf_data', None)
                
                await db["f24_parsed"].insert_one(doc)
                
                # Aggiorna anche collezione f24 principale se non esiste
                existing_f24 = await db["f24"].find_one({"filename": os.path.basename(filepath)})
                if not existing_f24:
                    f24_doc = {
                        "id": f"f24_{datetime.now().timestamp()}",
                        "filename": os.path.basename(filepath),
                        "data_pagamento": result.get("data_pagamento"),
                        "codice_fiscale": result.get("codice_fiscale"),
                        "ragione_sociale": result.get("ragione_sociale"),
                        "totale_versato": result.get("totali", {}).get("totale_debito", 0),
                        "sezione_erario": result.get("sezione_erario", []),
                        "sezione_inps": result.get("sezione_inps", []),
                        "ai_parsed": True,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db["f24"].insert_one(f24_doc)
                
                success += 1
                totale = result.get('totali', {}).get('totale_debito', 0)
                print(f"✅ €{totale:,.2f}")
            else:
                errors += 1
                print(f"❌ {result.get('error', 'Errore')[:50]}")
                
        except Exception as e:
            errors += 1
            print(f"❌ {str(e)[:50]}")
    
    return {"success": success, "errors": errors, "total": len(to_process)}


async def process_cedolini_batch(limit=30):
    """Processa batch di cedolini/buste paga."""
    db = Database.get_db()
    
    # Trova tutti i PDF cedolini
    cedolini_paths = glob.glob('/app/documents/Buste Paga/*.PDF') + glob.glob('/app/documents/Buste Paga/*.pdf')
    cedolini_paths += glob.glob('/app/uploads/paghe/*.PDF') + glob.glob('/app/uploads/paghe/*.pdf')
    
    print(f"🔍 Trovati {len(cedolini_paths)} file cedolini")
    
    # Trova quelli già processati
    existing = await db["cedolini_parsed"].distinct("source_file")
    to_process = [p for p in cedolini_paths if os.path.basename(p) not in existing][:limit]
    
    print(f"📄 Da processare: {len(to_process)} (già processati: {len(existing)})")
    
    success = 0
    errors = 0
    dipendenti_aggiornati = 0
    
    for i, filepath in enumerate(to_process):
        try:
            print(f"  [{i+1}/{len(to_process)}] Parsing {os.path.basename(filepath)}...", end=" ")
            
            with open(filepath, 'rb') as f:
                pdf_data = f.read()
            
            result = await parse_busta_paga_ai(file_bytes=pdf_data)
            
            if result.get('success'):
                # Salva nel database
                doc = {
                    **result,
                    "source_file": os.path.basename(filepath),
                    "source_path": filepath,
                    "imported_at": datetime.now(timezone.utc).isoformat()
                }
                doc.pop('pdf_data', None)
                
                await db["cedolini_parsed"].insert_one(doc)
                
                # Aggiorna scheda dipendente se trovato
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
                netto = result.get('netto', {}).get('netto_pagato', 0)
                print(f"✅ {nome} €{netto:,.2f}")
            else:
                errors += 1
                print(f"❌ {result.get('error', 'Errore')[:50]}")
                
        except Exception as e:
            errors += 1
            print(f"❌ {str(e)[:50]}")
    
    return {"success": success, "errors": errors, "total": len(to_process), "dipendenti_aggiornati": dipendenti_aggiornati}


async def riclassifica_fatture():
    """Riclassifica tutte le fatture non classificate usando Learning Machine."""
    db = Database.get_db()
    
    # Carica tutte le keywords
    keywords = await db["fornitori_keywords"].find({}, {"_id": 0}).to_list(None)
    keywords_map = {}
    for k in keywords:
        nome_norm = k.get("fornitore_nome_normalizzato", "").lower()
        keywords_map[nome_norm] = {
            "centro_costo": k.get("centro_costo_suggerito"),
            "nome": k.get("centro_costo_nome", k.get("centro_costo_suggerito"))
        }
    
    print(f"📚 Caricate {len(keywords_map)} regole di classificazione")
    
    # Trova fatture non classificate
    fatture = await db["invoices"].find({
        "$or": [
            {"centro_costo_id": {"$exists": False}},
            {"centro_costo_id": None},
            {"centro_costo_id": ""}
        ]
    }).to_list(None)
    
    print(f"📄 Fatture da classificare: {len(fatture)}")
    
    classificate = 0
    for f in fatture:
        supplier = f.get("supplier_name", "")
        if not supplier:
            continue
        
        # Normalizza nome
        nome_norm = supplier.lower().strip()
        for suffix in [" s.r.l.", " srl", " s.p.a.", " spa", " s.a.s.", " sas", " s.n.c.", " snc"]:
            nome_norm = nome_norm.replace(suffix, "")
        nome_norm = nome_norm.strip()
        
        # Cerca match
        match = None
        for key, val in keywords_map.items():
            if key in nome_norm or nome_norm in key:
                match = val
                break
        
        if match:
            await db["invoices"].update_one(
                {"_id": f["_id"]},
                {"$set": {
                    "centro_costo_id": match["centro_costo"],
                    "centro_costo_nome": match["nome"],
                    "classificazione_automatica": True,
                    "classificato_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            classificate += 1
    
    print(f"✅ Classificate {classificate} fatture")
    return {"classificate": classificate, "totale": len(fatture)}


async def main():
    print("=" * 60)
    print("   BATCH PROCESSING - LEARNING MACHINE + AI PARSER")
    print("=" * 60)
    
    # Connetti al database
    await Database.connect()
    
    print("\n" + "=" * 60)
    print("   FASE 1: RICLASSIFICA FATTURE")
    print("=" * 60)
    result_fatture = await riclassifica_fatture()
    
    print("\n" + "=" * 60)
    print("   FASE 2: PROCESSING F24 (primi 30)")
    print("=" * 60)
    result_f24 = await process_f24_batch(limit=30)
    
    print("\n" + "=" * 60)
    print("   FASE 3: PROCESSING CEDOLINI (primi 20)")
    print("=" * 60)
    result_cedolini = await process_cedolini_batch(limit=20)
    
    print("\n" + "=" * 60)
    print("   RIEPILOGO FINALE")
    print("=" * 60)
    print(f"📊 Fatture classificate: {result_fatture['classificate']}")
    print(f"📊 F24 processati: {result_f24['success']}/{result_f24['total']} (errori: {result_f24['errors']})")
    print(f"📊 Cedolini processati: {result_cedolini['success']}/{result_cedolini['total']} (errori: {result_cedolini['errors']})")
    print(f"📊 Dipendenti aggiornati: {result_cedolini['dipendenti_aggiornati']}")


if __name__ == "__main__":
    asyncio.run(main())
