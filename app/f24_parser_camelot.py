"""
Parser F24 con pdfplumber per estrarre CORRETTAMENTE dati strutturati
Specializzato per modelli F24 con tabelle complesse

LOGICA CORRETTA:
- Colonna DEBITO = Importo da versare
- Colonna CREDITO = Importo compensato (si scala)
- Saldo sezione con + = DEBITO (si somma al totale)
- Saldo sezione con - = CREDITO (si sottrae dal totale)
"""

import pdfplumber
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def clean_amount(amount_str: str) -> float:
    """Pulisce e converte importo in float"""
    if not amount_str or amount_str.strip() == '-' or amount_str.strip() == ',':
        return 0.0
    
    # Rimuovi spazi e punti (separatori migliaia)
    cleaned = amount_str.replace(' ', '').replace('.', '')
    # Sostituisci virgola con punto (decimali)
    cleaned = cleaned.replace(',', '.')
    
    try:
        return float(cleaned)
    except:
        return 0.0


def extract_f24_structured(pdf_bytes: bytes) -> Dict:
    """
    Estrae dati strutturati da F24 usando pdfplumber
    
    Returns:
        {
            "success": bool,
            "codice_fiscale": str,
            "ragione_sociale": str,
            "scadenza": str,
            "sezioni": {
                "ERARIO": [{"codice": ..., "causale": ..., "periodo": ..., "debito": ..., "credito": ...}],
                "INPS": [...],
                "REGIONI": [...],
                "IMU": [...]
            },
            "totali": {
                "ERARIO": {"debito": ..., "credito": ..., "saldo": ...},
                ...
            },
            "saldo_finale": float
        }
    """
    from io import BytesIO
    
    result = {
        "success": False,
        "codice_fiscale": "",
        "ragione_sociale": "",
        "scadenza": "",
        "sezioni": {},
        "totali": {},
        "saldo_finale": 0.0,
        "error": ""
    }
    
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            if not pdf.pages:
                result["error"] = "PDF vuoto"
                return result
            
            page = pdf.pages[0]
            text = page.extract_text()
            
            if not text:
                result["error"] = "Impossibile estrarre testo dal PDF"
                return result
            
            # 1. CODICE FISCALE
            cf_match = re.search(r'CODICE FISCALE[^\n]*?\n[^\n]*?([A-Z0-9]{16})', text, re.IGNORECASE)
            if cf_match:
                result["codice_fiscale"] = cf_match.group(1).replace(' ', '')
            
            # 2. RAGIONE SOCIALE
            rs_lines = text.split('\n')
            for i, line in enumerate(rs_lines):
                if 'cognome, denominazione o ragione sociale' in line.lower():
                    if i + 1 < len(rs_lines):
                        result["ragione_sociale"] = rs_lines[i + 1].strip()
                    break
            
            # 3. SCADENZA
            scadenza_match = re.search(r'Scadenza\s+(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
            if scadenza_match:
                result["scadenza"] = scadenza_match.group(1)
            
            # 4. SEZIONE ERARIO (Imposte Dirette, IVA, Ritenute)
            erario_entries = []
            
            # Pattern per righe ERARIO: codice anno debito credito
            # Esempio: "1627 2025 , 94, 47"  o "1001 0009 2025 1.048, 63 ,"
            erario_pattern = r'(\d{4})\s+([\dA-Z\s]*?)\s+(\d{4})\s+([\d\.,\s]+)'
            
            for match in re.finditer(erario_pattern, text):
                codice = match.group(1)
                causale_raw = match.group(2).strip()
                anno = match.group(3)
                importi_raw = match.group(4)
                
                # Parse importi (possono essere "debito, credito" o ", credito" o "debito,")
                importi = importi_raw.split(',')
                
                debito = 0.0
                credito = 0.0
                
                if len(importi) >= 2:
                    debito = clean_amount(importi[0])
                    credito = clean_amount(importi[1])
                elif len(importi) == 1:
                    debito = clean_amount(importi[0])
                
                entry = {
                    "codice": codice,
                    "causale": causale_raw if causale_raw else "",
                    "periodo": anno,
                    "debito": debito,
                    "credito": credito
                }
                
                erario_entries.append(entry)
            
            result["sezioni"]["ERARIO"] = erario_entries
            
            # 5. SEZIONE INPS
            inps_entries = []
            
            # Pattern INPS: codice causale codice_sede periodo debito credito
            # Esempio: "5100 CXX 80143NAPOLI 09 2025 350, 00 ,"
            inps_pattern = r'5\d{3}\s+([A-Z0-9\s]+?)\s+(\d{8}[A-Z]+|\d{10}|[A-Z]+)?\s*(\d{2})\s+(\d{4})\s+([\d\.,\s]+)'
            
            for match in re.finditer(inps_pattern, text):
                codice = match.group(0)[:4]  # Primi 4 caratteri
                causale = match.group(1).strip()
                periodo = f"{match.group(3)}/{match.group(4)}"
                importi_raw = match.group(5)
                
                importi = importi_raw.split(',')
                debito = 0.0
                credito = 0.0
                
                if len(importi) >= 2:
                    debito = clean_amount(importi[0])
                    credito = clean_amount(importi[1])
                
                entry = {
                    "codice": codice,
                    "causale": causale,
                    "periodo": periodo,
                    "debito": debito,
                    "credito": credito
                }
                
                inps_entries.append(entry)
            
            result["sezioni"]["INPS"] = inps_entries
            
            # 6. SEZIONE REGIONI
            regioni_entries = []
            
            # Pattern REGIONI: "0 5 3802 0009 2024 138, 42 ,"
            regioni_pattern = r'0\s+5\s+(\d{4})\s+([\dA-Z\s]*?)\s+(\d{4})\s+([\d\.,\s]+)'
            
            for match in re.finditer(regioni_pattern, text):
                codice = match.group(1)
                causale = match.group(2).strip()
                anno = match.group(3)
                importi_raw = match.group(4)
                
                importi = importi_raw.split(',')
                debito = 0.0
                credito = 0.0
                
                if len(importi) >= 2:
                    debito = clean_amount(importi[0])
                    credito = clean_amount(importi[1])
                
                entry = {
                    "codice": codice,
                    "causale": causale,
                    "periodo": anno,
                    "debito": debito,
                    "credito": credito
                }
                
                regioni_entries.append(entry)
            
            result["sezioni"]["REGIONI"] = regioni_entries
            
            # 7. SEZIONE IMU
            imu_entries = []
            
            # Pattern IMU: "B 9 9 0 3847 0009 2025 7, 90 ,"
            imu_pattern = r'[A-Z]\s+\d\s+\d\s+\d\s+(\d{4})\s+([\dA-Z\s]*?)\s+(\d{4})\s+([\d\.,\s]+)'
            
            for match in re.finditer(imu_pattern, text):
                codice = match.group(1)
                causale = match.group(2).strip()
                anno = match.group(3)
                importi_raw = match.group(4)
                
                importi = importi_raw.split(',')
                debito = 0.0
                credito = 0.0
                
                if len(importi) >= 2:
                    debito = clean_amount(importi[0])
                    credito = clean_amount(importi[1])
                
                entry = {
                    "codice": codice,
                    "causale": causale,
                    "periodo": anno,
                    "debito": debito,
                    "credito": credito
                }
                
                imu_entries.append(entry)
            
            result["sezioni"]["IMU"] = imu_entries
            
            # 8. CALCOLA TOTALI PER SEZIONE
            for sezione_name, entries in result["sezioni"].items():
                total_debito = sum(e["debito"] for e in entries)
                total_credito = sum(e["credito"] for e in entries)
                saldo = total_debito - total_credito
                
                result["totali"][sezione_name] = {
                    "debito": total_debito,
                    "credito": total_credito,
                    "saldo": saldo
                }
            
            # 9. SALDO FINALE CON SEGNO
            # Cerca "SALDO FINALE EURO + 4.634,31" o "EURO - 828,29"
            saldo_match = re.search(r'SALDO\s+FINALE.*?EURO\s*([-+]?)\s*([\d\.,\s]+)', text, re.IGNORECASE)
            if saldo_match:
                segno = saldo_match.group(1)
                importo = clean_amount(saldo_match.group(2))
                # Se segno è - , il saldo è negativo (credito)
                result["saldo_finale"] = -importo if segno == '-' else importo
                logger.info(f"💰 Saldo finale estratto: {segno}{importo:,.2f} = {result['saldo_finale']:,.2f}")
            else:
                # Calcola da totali con logica corretta
                # Somma i saldi POSITIVI e sottrai quelli NEGATIVI
                saldo_calcolato = 0.0
                for sezione_name, totals in result["totali"].items():
                    saldo_sezione = totals["saldo"]
                    saldo_calcolato += saldo_sezione
                    logger.info(f"  {sezione_name}: {saldo_sezione:+,.2f}")
                
                result["saldo_finale"] = saldo_calcolato
                logger.info(f"💰 Saldo finale calcolato: {saldo_calcolato:,.2f}")
            
            result["success"] = True
            
            logger.info(f"✅ F24 parsed: {len(result['sezioni'])} sezioni, saldo finale €{result['saldo_finale']:,.2f}")
            
            return result
    
    except Exception as e:
        logger.error(f"❌ Errore parsing F24: {str(e)}", exc_info=True)
        result["error"] = str(e)
        return result


def format_f24_for_reconciliation(parsed_data: Dict) -> List[Dict]:
    """
    Formatta dati F24 per tabella riconciliazione bancaria
    
    Returns:
        Lista di righe per tabella con campi:
        - sezione: str
        - codice: str
        - causale: str
        - periodo: str
        - debito: float
        - credito: float
        - saldo: float
    """
    rows = []
    
    if not parsed_data.get("success"):
        return rows
    
    for sezione_name, entries in parsed_data.get("sezioni", {}).items():
        for entry in entries:
            row = {
                "sezione": sezione_name,
                "codice": entry["codice"],
                "causale": entry.get("causale", ""),
                "periodo": entry["periodo"],
                "debito": entry["debito"],
                "credito": entry["credito"],
                "saldo": entry["debito"] - entry["credito"]
            }
            rows.append(row)
    
    # Aggiungi riga totale per ogni sezione
    for sezione_name, totals in parsed_data.get("totali", {}).items():
        row = {
            "sezione": f"{sezione_name} - TOTALE",
            "codice": "",
            "causale": "",
            "periodo": "",
            "debito": totals["debito"],
            "credito": totals["credito"],
            "saldo": totals["saldo"]
        }
        rows.append(row)
    
    # Riga saldo finale
    rows.append({
        "sezione": "SALDO FINALE DA VERSARE",
        "codice": "",
        "causale": "",
        "periodo": "",
        "debito": 0.0,
        "credito": 0.0,
        "saldo": parsed_data.get("saldo_finale", 0.0)
    })
    
    return rows
