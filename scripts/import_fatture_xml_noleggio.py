"""
Script per importare fatture XML noleggio nel database.
Estrae: verbali, bolli, riparazioni, costi extra e li associa ai veicoli.
"""

import os
import re
import asyncio
import xml.etree.ElementTree as ET
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection
MONGO_URL = "mongodb+srv://Ceraldidatabase:Ceraldicloud2026@cluster0.vofh7iz.mongodb.net/?appName=Cluster0"
DB_NAME = "azienda_erp_db"

# Namespace XML
NS = {'p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2'}

def parse_fattura_xml(filepath):
    """Parsa un file XML di fattura elettronica."""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Rimuovi namespace per semplicità
        for elem in root.iter():
            if '}' in elem.tag:
                elem.tag = elem.tag.split('}')[1]
        
        fattura = {
            "filename": os.path.basename(filepath),
            "fornitore": {},
            "cliente": {},
            "dati_documento": {},
            "linee_dettaglio": [],
            "veicoli_trovati": [],
            "verbali_trovati": [],
            "bolli_trovati": [],
            "riparazioni_trovate": [],
            "contratti_trovati": []
        }
        
        # Estrai dati fornitore (CedentePrestatore)
        cedente = root.find('.//CedentePrestatore')
        if cedente is not None:
            anagrafica = cedente.find('.//Anagrafica')
            if anagrafica is not None:
                denom = anagrafica.find('Denominazione')
                if denom is not None:
                    fattura["fornitore"]["denominazione"] = denom.text
            
            id_fiscale = cedente.find('.//IdFiscaleIVA/IdCodice')
            if id_fiscale is not None:
                fattura["fornitore"]["partita_iva"] = id_fiscale.text
        
        # Estrai dati documento
        dati_gen = root.find('.//DatiGeneraliDocumento')
        if dati_gen is not None:
            numero = dati_gen.find('Numero')
            data = dati_gen.find('Data')
            importo = dati_gen.find('ImportoTotaleDocumento')
            
            if numero is not None:
                fattura["dati_documento"]["numero"] = numero.text
            if data is not None:
                fattura["dati_documento"]["data"] = data.text
            if importo is not None:
                fattura["dati_documento"]["importo_totale"] = float(importo.text)
        
        # Estrai contratti
        for contratto in root.findall('.//DatiContratto'):
            id_doc = contratto.find('IdDocumento')
            if id_doc is not None:
                fattura["contratti_trovati"].append(id_doc.text)
        
        # Estrai linee dettaglio
        for linea in root.findall('.//DettaglioLinee'):
            descrizione_elem = linea.find('Descrizione')
            prezzo_elem = linea.find('PrezzoTotale')
            
            if descrizione_elem is None:
                continue
            
            descrizione = descrizione_elem.text or ""
            prezzo = float(prezzo_elem.text) if prezzo_elem is not None else 0
            
            linea_data = {
                "descrizione": descrizione,
                "prezzo": prezzo
            }
            
            # Cerca targa negli AltriDatiGestionali
            for altri_dati in linea.findall('AltriDatiGestionali'):
                tipo = altri_dati.find('TipoDato')
                rif = altri_dati.find('RiferimentoTesto')
                if tipo is not None and tipo.text == 'TARGA' and rif is not None:
                    # Estrai targa (formato: "GG262JA MAZDA CX-5...")
                    targa_match = re.match(r'([A-Z]{2}\d{3}[A-Z]{2})', rif.text)
                    if targa_match:
                        linea_data["targa"] = targa_match.group(1)
                        if targa_match.group(1) not in fattura["veicoli_trovati"]:
                            fattura["veicoli_trovati"].append(targa_match.group(1))
            
            # Cerca targa nella descrizione
            if "targa" not in linea_data:
                targa_match = re.search(r'\b([A-Z]{2}\d{3}[A-Z]{2})\b', descrizione)
                if targa_match:
                    linea_data["targa"] = targa_match.group(1)
                    if targa_match.group(1) not in fattura["veicoli_trovati"]:
                        fattura["veicoli_trovati"].append(targa_match.group(1))
            
            # Categorizza la linea
            desc_lower = descrizione.lower()
            
            # Verbali/Multe
            if 'verbale' in desc_lower or 'multa' in desc_lower or 'infrazione' in desc_lower or 'sanzione' in desc_lower:
                # Estrai numero verbale
                verbale_match = re.search(r'B(\d{10,})', descrizione)
                if verbale_match:
                    linea_data["numero_verbale"] = "B" + verbale_match.group(1)
                fattura["verbali_trovati"].append(linea_data)
            
            # Bollo auto
            elif 'bollo' in desc_lower or 'tassa' in desc_lower or 'superbollo' in desc_lower:
                fattura["bolli_trovati"].append(linea_data)
            
            # Riparazioni
            elif 'riparazione' in desc_lower or 'carrozzeria' in desc_lower or 'manutenzione' in desc_lower or 'sinistro' in desc_lower:
                fattura["riparazioni_trovate"].append(linea_data)
            
            fattura["linee_dettaglio"].append(linea_data)
        
        return fattura
        
    except Exception as e:
        print(f"Errore parsing {filepath}: {e}")
        return None


async def import_fatture_to_db(fatture_dir, db):
    """Importa tutte le fatture nel database."""
    
    risultati = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "file_processati": 0,
        "fatture_importate": 0,
        "fatture_duplicate": 0,
        "veicoli_trovati": set(),
        "verbali_totali": 0,
        "bolli_totali": 0,
        "riparazioni_totali": 0,
        "errori": []
    }
    
    xml_files = [f for f in os.listdir(fatture_dir) if f.endswith('.xml')]
    print(f"Trovati {len(xml_files)} file XML")
    
    for filename in xml_files:
        filepath = os.path.join(fatture_dir, filename)
        risultati["file_processati"] += 1
        
        # Parsa XML
        fattura = parse_fattura_xml(filepath)
        if not fattura:
            risultati["errori"].append(f"Errore parsing: {filename}")
            continue
        
        # Verifica se già importata
        existing = await db.fatture_noleggio_xml.find_one({
            "filename": filename
        })
        
        if existing:
            risultati["fatture_duplicate"] += 1
            continue
        
        # Salva nel database
        fattura["data_importazione"] = datetime.utcnow().isoformat() + "Z"
        fattura["processato_noleggio"] = False
        
        await db.fatture_noleggio_xml.insert_one(fattura)
        risultati["fatture_importate"] += 1
        
        # Statistiche
        risultati["veicoli_trovati"].update(fattura["veicoli_trovati"])
        risultati["verbali_totali"] += len(fattura["verbali_trovati"])
        risultati["bolli_totali"] += len(fattura["bolli_trovati"])
        risultati["riparazioni_totali"] += len(fattura["riparazioni_trovate"])
        
        print(f"  {filename}: {fattura['fornitore'].get('denominazione', 'N/A')} - €{fattura['dati_documento'].get('importo_totale', 0):.2f}")
    
    risultati["veicoli_trovati"] = list(risultati["veicoli_trovati"])
    
    return risultati


async def associa_a_veicoli_noleggio(db):
    """Associa le fatture importate ai veicoli nel sistema noleggio."""
    
    risultati = {
        "fatture_processate": 0,
        "verbali_associati": 0,
        "bolli_associati": 0,
        "veicoli_aggiornati": set()
    }
    
    # Trova fatture non ancora processate
    cursor = db.fatture_noleggio_xml.find({"processato_noleggio": False})
    
    async for fattura in cursor:
        risultati["fatture_processate"] += 1
        
        for targa in fattura.get("veicoli_trovati", []):
            # Trova veicolo nel sistema noleggio
            veicolo = await db.veicoli_noleggio.find_one({"targa": targa})
            
            if veicolo:
                updates = {"$push": {}, "$set": {"data_aggiornamento": datetime.utcnow().isoformat() + "Z"}}
                
                # Aggiungi verbali
                for verbale in fattura.get("verbali_trovati", []):
                    if verbale.get("targa") == targa or targa in verbale.get("descrizione", ""):
                        updates["$push"].setdefault("verbali", {"$each": []})
                        updates["$push"]["verbali"]["$each"].append({
                            "numero": verbale.get("numero_verbale"),
                            "descrizione": verbale.get("descrizione"),
                            "importo": verbale.get("prezzo"),
                            "fattura": fattura["dati_documento"].get("numero"),
                            "data_fattura": fattura["dati_documento"].get("data"),
                            "fonte": "import_xml"
                        })
                        risultati["verbali_associati"] += 1
                
                # Aggiungi bolli
                for bollo in fattura.get("bolli_trovati", []):
                    if bollo.get("targa") == targa or targa in bollo.get("descrizione", ""):
                        updates["$push"].setdefault("bolli", {"$each": []})
                        updates["$push"]["bolli"]["$each"].append({
                            "descrizione": bollo.get("descrizione"),
                            "importo": bollo.get("prezzo"),
                            "fattura": fattura["dati_documento"].get("numero"),
                            "data_fattura": fattura["dati_documento"].get("data"),
                            "fonte": "import_xml"
                        })
                        risultati["bolli_associati"] += 1
                
                if updates["$push"]:
                    await db.veicoli_noleggio.update_one({"_id": veicolo["_id"]}, updates)
                    risultati["veicoli_aggiornati"].add(targa)
        
        # Marca come processato
        await db.fatture_noleggio_xml.update_one(
            {"_id": fattura["_id"]},
            {"$set": {"processato_noleggio": True}}
        )
    
    risultati["veicoli_aggiornati"] = list(risultati["veicoli_aggiornati"])
    return risultati


async def main():
    # Directory fatture
    fatture_dir = "/app/temp_fatture/20260118_ExportFattureRicevute (12)"
    
    if not os.path.exists(fatture_dir):
        print(f"Directory non trovata: {fatture_dir}")
        return
    
    # Connessione DB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("IMPORTAZIONE FATTURE XML NOLEGGIO")
    print("=" * 60)
    
    # Fase 1: Importa fatture
    print("\n1. Importazione fatture XML...")
    risultati_import = await import_fatture_to_db(fatture_dir, db)
    
    print("\n--- RISULTATI IMPORTAZIONE ---")
    print(f"File processati: {risultati_import['file_processati']}")
    print(f"Fatture importate: {risultati_import['fatture_importate']}")
    print(f"Fatture duplicate: {risultati_import['fatture_duplicate']}")
    print(f"Veicoli trovati: {len(risultati_import['veicoli_trovati'])}")
    print(f"  Targhe: {risultati_import['veicoli_trovati'][:10]}...")
    print(f"Verbali totali: {risultati_import['verbali_totali']}")
    print(f"Bolli totali: {risultati_import['bolli_totali']}")
    print(f"Riparazioni totali: {risultati_import['riparazioni_totali']}")
    if risultati_import['errori']:
        print(f"Errori: {risultati_import['errori'][:5]}")
    
    # Fase 2: Associa a veicoli
    print("\n2. Associazione ai veicoli noleggio...")
    risultati_assoc = await associa_a_veicoli_noleggio(db)
    
    print("\n--- RISULTATI ASSOCIAZIONE ---")
    print(f"Fatture processate: {risultati_assoc['fatture_processate']}")
    print(f"Verbali associati: {risultati_assoc['verbali_associati']}")
    print(f"Bolli associati: {risultati_assoc['bolli_associati']}")
    print(f"Veicoli aggiornati: {risultati_assoc['veicoli_aggiornati']}")
    
    print("\n" + "=" * 60)
    print("IMPORTAZIONE COMPLETATA")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
