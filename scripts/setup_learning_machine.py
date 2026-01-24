"""
Script definitivo per configurazione Learning Machine.
Configura fornitori mancanti e riclassifica tutte le fatture.
"""
import asyncio
import sys
sys.path.insert(0, '/app')

from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

from app.database import Database

# Mappatura fornitori -> centro di costo basata su ricerca
FORNITORI_CONFIG = {
    # FOOD & BEVANDE (CDC-01)
    "DF BALDASSARRE SRL": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["uova", "freschi", "alimentari"]},
    "KIMBO S.P.A.": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["caffè", "espresso", "torrefazione"]},
    "G.I.A.L. GENERALE INGROSSO ALIMENTARE S.R.L.": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["ingrosso", "alimentari"]},
    "CILATTE": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["latte", "latticini", "mozzarella"]},
    "DOMORI SPA": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["cioccolato", "cacao"]},
    "INGROSSO E DISTRIBUZIONE BIBITE DI CINOGLOSSO": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["bibite", "bevande"]},
    "FAZZARI VINCENZO SRL": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["alimentari"]},
    "SELEZIONE CATERING SRL": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["catering"]},
    "BEER IMPORT S.R.L.": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["birra", "bevande"]},
    "CAFFE' CAROL": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["caffè"]},
    "CARPINO S.R.L.": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["alimentari"]},
    "Ristodom": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["ristorazione"]},
    "FERLAM S.R.L.": {"cdc": "CDC-01", "nome": "Costi Food & Bevande", "keywords": ["alimentari"]},
    
    # SERVIZI E MATERIALI (CDC-02)
    "GTM DETERSIVI": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["detersivi", "pulizia"]},
    "CARTA & PARTY": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["carta", "monouso", "tovaglioli"]},
    "Today Service": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["servizi", "pulizia"]},
    "EUREKA ONLUS": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["cooperativa", "servizi"]},
    "GRAFIPRINT ETICHETTE": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["etichette", "stampa"]},
    "Ebizlab": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["software", "web"]},
    "3P SRL": {"cdc": "CDC-02", "nome": "Costi Servizi e Materiali", "keywords": ["servizi"]},
    
    # UTENZE (CDC-04)
    "Enel Energia": {"cdc": "CDC-04", "nome": "Utenze", "keywords": ["energia", "elettricità", "luce"]},
    "Eni Plenitude": {"cdc": "CDC-04", "nome": "Utenze", "keywords": ["energia", "gas"]},
    "ABC - ACQUA BENE COMUNE": {"cdc": "CDC-04", "nome": "Utenze", "keywords": ["acqua"]},
    
    # NOLEGGIO AUTO (CDC-99)
    "ARVAL SERVICE LEASE": {"cdc": "CDC-99", "nome": "Altri Costi", "keywords": ["noleggio", "auto", "leasing"]},
    "Leasys": {"cdc": "CDC-99", "nome": "Altri Costi", "keywords": ["noleggio", "auto", "leasing"]},
    "ALD Automotive": {"cdc": "CDC-99", "nome": "Altri Costi", "keywords": ["noleggio", "auto"]},
    "Ceraldi Group": {"cdc": "CDC-99", "nome": "Altri Costi", "keywords": ["ceraldi"]},
}


def normalizza_nome(nome):
    """Normalizza nome fornitore."""
    nome = nome.lower().strip()
    for suff in [" s.r.l.", " srl", " s.p.a.", " spa", " s.a.s.", " sas", " s.n.c.", " snc", 
                 " societa' a responsabilita' limitata", " società benefit"]:
        nome = nome.replace(suff, "")
    return nome.strip()


async def configura_fornitori():
    """Configura tutti i fornitori mancanti."""
    db = Database.get_db()
    
    # Carica fornitori già configurati
    esistenti = await db["fornitori_keywords"].distinct("fornitore_nome_normalizzato")
    esistenti_set = set(e.lower() for e in esistenti if e)
    
    print(f"📚 Fornitori già configurati: {len(esistenti_set)}")
    
    # Trova tutti i fornitori unici dalle fatture
    fornitori_fatture = await db["invoices"].distinct("supplier_name")
    fornitori_fatture = [f for f in fornitori_fatture if f]
    
    print(f"📄 Fornitori totali nelle fatture: {len(fornitori_fatture)}")
    
    configurati = 0
    
    for fornitore in fornitori_fatture:
        nome_norm = normalizza_nome(fornitore)
        
        # Skip se già configurato
        if nome_norm in esistenti_set:
            continue
        
        # Cerca match nella configurazione
        config = None
        for pattern, cfg in FORNITORI_CONFIG.items():
            if pattern.lower() in fornitore.lower() or fornitore.lower() in pattern.lower():
                config = cfg
                break
        
        if config:
            # Conta fatture
            count = await db["invoices"].count_documents({
                "supplier_name": {"$regex": f"^{fornitore[:20]}", "$options": "i"}
            })
            
            doc = {
                "id": f"fk_{nome_norm.replace(' ', '_')[:50]}",
                "fornitore_nome": fornitore,
                "fornitore_nome_normalizzato": nome_norm,
                "keywords": config["keywords"],
                "centro_costo_suggerito": config["cdc"],
                "centro_costo_nome": config["nome"],
                "fatture_count": count,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "auto_configured": True
            }
            
            await db["fornitori_keywords"].update_one(
                {"fornitore_nome_normalizzato": nome_norm},
                {"$set": doc},
                upsert=True
            )
            
            print(f"  ✅ {fornitore[:40]} -> {config['cdc']}")
            configurati += 1
            esistenti_set.add(nome_norm)
    
    print(f"\n📊 Nuovi fornitori configurati: {configurati}")
    return configurati


async def riclassifica_fatture():
    """Riclassifica tutte le fatture usando le keywords."""
    db = Database.get_db()
    
    # Carica tutte le keywords
    keywords_docs = await db["fornitori_keywords"].find({}, {"_id": 0}).to_list(None)
    
    # Crea indice per ricerca veloce
    keywords_index = {}
    for k in keywords_docs:
        nome_norm = normalizza_nome(k.get("fornitore_nome", ""))
        keywords_index[nome_norm] = {
            "cdc": k.get("centro_costo_suggerito"),
            "nome": k.get("centro_costo_nome", k.get("centro_costo_suggerito")),
            "keywords": k.get("keywords", [])
        }
    
    print(f"📚 Regole di classificazione: {len(keywords_index)}")
    
    # Trova fatture senza CDC
    fatture = await db["invoices"].find({
        "$or": [
            {"centro_costo_id": {"$exists": False}},
            {"centro_costo_id": None},
            {"centro_costo_id": ""}
        ]
    }, {"_id": 1, "supplier_name": 1}).to_list(None)
    
    print(f"📄 Fatture da classificare: {len(fatture)}")
    
    classificate = 0
    batch_updates = []
    
    for f in fatture:
        supplier = f.get("supplier_name", "")
        if not supplier:
            continue
        
        nome_norm = normalizza_nome(supplier)
        
        # Cerca match esatto
        match = keywords_index.get(nome_norm)
        
        # Se non trovato, cerca match parziale
        if not match:
            for key, val in keywords_index.items():
                if key in nome_norm or nome_norm in key:
                    match = val
                    break
        
        if match:
            batch_updates.append({
                "filter": {"_id": f["_id"]},
                "update": {"$set": {
                    "centro_costo_id": match["cdc"],
                    "centro_costo_nome": match["nome"],
                    "classificazione_automatica": True,
                    "classificato_at": datetime.now(timezone.utc).isoformat()
                }}
            })
            classificate += 1
    
    # Esegui updates in batch
    if batch_updates:
        for update in batch_updates:
            await db["invoices"].update_one(update["filter"], update["update"])
    
    print(f"✅ Fatture classificate: {classificate}/{len(fatture)}")
    return classificate


async def verifica_stato():
    """Verifica stato finale."""
    db = Database.get_db()
    
    # Fornitori configurati
    fornitori = await db["fornitori_keywords"].count_documents({})
    
    # Fatture
    tot_fatture = await db["invoices"].count_documents({})
    con_cdc = await db["invoices"].count_documents({
        "centro_costo_id": {"$exists": True, "$ne": None, "$ne": ""}
    })
    
    # F24
    tot_f24 = await db["f24"].count_documents({})
    
    # Dipendenti
    tot_dip = await db["employees"].count_documents({})
    con_prog = await db["employees"].count_documents({
        "progressivi": {"$exists": True}
    })
    
    print("\n" + "=" * 50)
    print("   STATO FINALE LEARNING MACHINE")
    print("=" * 50)
    print(f"   Fornitori configurati: {fornitori}")
    print(f"   Fatture: {con_cdc}/{tot_fatture} ({round(con_cdc/max(tot_fatture,1)*100, 1)}%)")
    print(f"   F24: {tot_f24}")
    print(f"   Dipendenti con progressivi: {con_prog}/{tot_dip}")
    print("=" * 50)


async def main():
    print("=" * 60)
    print("   CONFIGURAZIONE DEFINITIVA LEARNING MACHINE")
    print("=" * 60)
    
    await Database.connect_db()
    
    print("\n--- FASE 1: Configurazione fornitori ---")
    await configura_fornitori()
    
    print("\n--- FASE 2: Riclassificazione fatture ---")
    await riclassifica_fatture()
    
    print("\n--- FASE 3: Verifica finale ---")
    await verifica_stato()


if __name__ == "__main__":
    asyncio.run(main())
