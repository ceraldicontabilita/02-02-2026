"""
Parser F24 v2.0 - PARSING ROBUSTO CON PDFPLUMBER
Gestisce correttamente decimali italiani e pattern complessi

LOGICA CORRETTA DEBITO/CREDITO:
- Colonna DEBITO (sinistra) = Importo da versare (si somma)
- Colonna CREDITO (destra) = Importo compensato (si sottrae)
- Saldo sezione: debito - credito
"""

import pdfplumber
import re
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def parse_italian_amount(text: str) -> float:
    """
    Parse importo in formato italiano con gestione robusta
    
    Esempi:
        "1.048, 63" → 1048.63
        "350, 00" → 350.00
        ", " o "," → 0.0
        "4.974, 00" → 4974.00
    """
    if not text or not text.strip():
        return 0.0
    
    # Pulisci
    cleaned = text.strip()
    
    # Se è solo virgola o trattino, è vuoto
    if cleaned in [',', '-', '']:
        return 0.0
    
    # Rimuovi tutti gli spazi
    cleaned = cleaned.replace(' ', '')
    
    # Se finisce con virgola (es. "1.048,"), aggiungi 00
    if cleaned.endswith(','):
        cleaned += '00'
    
    # Rimuovi punti (separatori migliaia)
    cleaned = cleaned.replace('.', '')
    
    # Sostituisci virgola decimale con punto
    cleaned = cleaned.replace(',', '.')
    
    try:
        return float(cleaned)
    except ValueError:
        logger.warning(f"⚠️ Impossibile convertire '{text}' in float")
        return 0.0


def extract_amounts_pair(text: str) -> tuple[float, float]:
    """
    Estrae coppia (debito, credito) da testo
    
    Pattern tipici:
        "1.048, 63 ," → debito=1048.63, credito=0.0
        ", 94, 47" → debito=0.0, credito=94.47
        "138, 42 99, 21" → debito=138.42, credito=99.21 (raro, di solito c'è virgola)
    """
    # Pattern per importo italiano: numero con punti migliaia opzionali + virgola decimale + 2 cifre
    # Esempi: "1.048, 63" "350, 00" "7, 90"
    amount_pattern = r'(?:\d{1,3}(?:\.\d{3})*|\d+),\s*\d{2}'
    
    amounts = re.findall(amount_pattern, text)
    
    if len(amounts) == 0:
        # Nessun importo trovato
        return 0.0, 0.0
    elif len(amounts) == 1:
        # Solo un importo - capire se è debito o credito dalla posizione della virgola solitaria
        amount_val = parse_italian_amount(amounts[0])
        
        # Cerca virgola solitaria prima o dopo l'importo
        # Se ", 1.048, 63" → credito
        # Se "1.048, 63 ," → debito
        if text.strip().startswith(','):
            return 0.0, amount_val  # è credito
        else:
            return amount_val, 0.0  # è debito
    else:
        # Due importi trovati
        return parse_italian_amount(amounts[0]), parse_italian_amount(amounts[1])


def extract_f24_data(pdf_bytes: bytes) -> Dict:
    """
    Estrae dati F24 con parsing robusto line-by-line
    
    Returns:
        {
            "success": bool,
            "codice_fiscale": str,
            "ragione_sociale": str,
            "scadenza": str,
            "sezioni": {
                "ERARIO": [{"codice": str, "causale": str, "periodo": str, "debito": float, "credito": float}],
                "INPS": [...],
                "REGIONI": [...],
                "IMU": [...]
            },
            "totali": {
                "ERARIO": {"debito": float, "credito": float, "saldo": float},
                ...
            },
            "saldo_finale": float,
            "error": str
        }
    """
    from io import BytesIO
    
    result = {
        "success": False,
        "codice_fiscale": "",
        "ragione_sociale": "",
        "scadenza": "",
        "sezioni": {
            "ERARIO": [],
            "INPS": [],
            "REGIONI": [],
            "IMU": []
        },
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
            
            logger.info("📄 Inizio parsing F24...")
            
            # ===== ESTRAZIONE DATI ANAGRAFICI =====
            
            # 1. CODICE FISCALE - pattern: cifre separate da spazi o consecutive
            # "0 4 5 2 3 8 3 1 2 1 4" → "04523831214"
            # o anche "04523831214" diretto
            cf_match = re.search(r'CODICE FISCALE\s+([0-9\s]{14,20})', text, re.IGNORECASE)
            if cf_match:
                cf_raw = cf_match.group(1)
                # Rimuovi tutti gli spazi e prendi solo cifre
                cf_clean = ''.join(c for c in cf_raw if c.isdigit() or c.isalpha())
                if len(cf_clean) >= 11:
                    result["codice_fiscale"] = cf_clean[:16]  # Max 16 caratteri
                    logger.info(f"📋 Codice fiscale: {result['codice_fiscale']}")
            
            # 2. RAGIONE SOCIALE
            # Cerca "DATI ANAGRAFICI" seguito da nome sulla stessa riga o successiva
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if 'DATI ANAGRAFICI' in line:
                    # Caso 1: Nome sulla stessa riga dopo "DATI ANAGRAFICI"
                    parts = line.split('DATI ANAGRAFICI')
                    if len(parts) > 1 and parts[1].strip():
                        candidate = parts[1].strip()
                        # Rimuovi pattern di date/numeri all'inizio
                        candidate = re.sub(r'^[\d\s/]+', '', candidate)
                        if candidate and len(candidate) > 3:
                            result["ragione_sociale"] = candidate
                            logger.info(f"🏢 Ragione sociale: {result['ragione_sociale']}")
                            break
                    
                    # Caso 2: Nome sulla riga successiva
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        if next_line and not next_line[0].isdigit() and 'comune' not in next_line.lower():
                            result["ragione_sociale"] = next_line
                            logger.info(f"🏢 Ragione sociale: {result['ragione_sociale']}")
                            break
            
            # 3. SCADENZA
            scad_match = re.search(r'Scadenza\s+(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
            if scad_match:
                result["scadenza"] = scad_match.group(1)
                logger.info(f"📅 Scadenza: {result['scadenza']}")
            
            # ===== PARSING SEZIONI =====
            
            # SEZIONE ERARIO
            # Due pattern: con e senza causale
            # SENZA causale: "1627 2025 , 94, 47" → codice, anno, importi
            # CON causale: "1001 0009 2025 1.048, 63 ," → codice, causale, anno, importi
            
            # Pattern: cattura da 2 a 3 gruppi di 4 cifre all'inizio
            erario_pattern = r'^(\d{4})\s+(\d{4})(?:\s+(\d{4}))?\s+(.*?)$'
            
            for line in lines:
                line_stripped = line.strip()
                match = re.match(erario_pattern, line_stripped)
                
                if match and ',' in (match.group(4) or ''):
                    codice = match.group(1)
                    group2 = match.group(2)
                    group3 = match.group(3)  # può essere None
                    importi_text = match.group(4)
                    
                    # Determina se abbiamo causale o no
                    if group3:
                        # 3 gruppi: codice + causale + anno
                        causale = group2
                        anno = group3
                    else:
                        # 2 gruppi: codice + anno
                        causale = ""
                        anno = group2
                    
                    # Estrai debito e credito
                    debito, credito = extract_amounts_pair(importi_text)
                    
                    # Filtra voci vuote
                    if debito > 0 or credito > 0:
                        entry = {
                            "codice": codice,
                            "causale": causale,
                            "periodo": anno,
                            "debito": debito,
                            "credito": credito
                        }
                        
                        result["sezioni"]["ERARIO"].append(entry)
                        logger.debug(f"  ERARIO: {codice} {causale} {anno} | D:{debito:,.2f} C:{credito:,.2f}")
            
            # SEZIONE INPS
            # Pattern: CODICE CAUSALE MATRICOLA MESE ANNO IMPORTI
            # "5100 CXX 80143NAPOLI 09 2025 350, 00 ,"
            # "5100 DM10 5124776507 09 2025 4.974, 00 ,"
            inps_pattern = r'^(5\d{3})\s+([A-Z0-9]+)\s+([\dA-Z]+)\s+(\d{2})\s+(\d{4})\s+(.*?)$'
            
            for line in lines:
                match = re.match(inps_pattern, line.strip())
                if match:
                    codice = match.group(1)
                    causale = match.group(2)
                    matricola = match.group(3)
                    mese = match.group(4)
                    anno = match.group(5)
                    importi_text = match.group(6)
                    
                    debito, credito = extract_amounts_pair(importi_text)
                    
                    entry = {
                        "codice": codice,
                        "causale": causale,
                        "matricola": matricola,
                        "periodo": f"{mese}/{anno}",
                        "debito": debito,
                        "credito": credito
                    }
                    
                    result["sezioni"]["INPS"].append(entry)
                    periodo_str = entry["periodo"]
                    logger.debug(f"  INPS: {codice} {causale} {periodo_str} | D:{debito:,.2f} C:{credito:,.2f}")
            
            # SEZIONE REGIONI
            # Pattern: 0 5 CODICE CAUSALE? ANNO IMPORTI
            # "0 5 3802 0009 2024 138, 42 ,"
            # "0 5 3796 2024 , 99, 21"
            regioni_pattern = r'^0\s+5\s+(\d{4})(?:\s+(\d{4}))?\s+(\d{4})\s+(.*?)$'
            
            for line in lines:
                line_stripped = line.strip()
                match = re.match(regioni_pattern, line_stripped)
                
                if match and ',' in (match.group(4) or ''):
                    codice = match.group(1)
                    group2 = match.group(2)  # può essere None (causale opzionale)
                    anno = match.group(3)
                    importi_text = match.group(4)
                    
                    causale = group2 if group2 else ""
                    
                    debito, credito = extract_amounts_pair(importi_text)
                    
                    if debito > 0 or credito > 0:
                        entry = {
                            "codice": codice,
                            "causale": causale,
                            "periodo": anno,
                            "debito": debito,
                            "credito": credito
                        }
                        
                        result["sezioni"]["REGIONI"].append(entry)
                        logger.debug(f"  REGIONI: {codice} {causale} {anno} | D:{debito:,.2f} C:{credito:,.2f}")
            
            # SEZIONE IMU
            # Pattern: CATASTALE CODICE CAUSALE? ANNO IMPORTI
            # "B 9 9 0 3847 0009 2025 7, 90 ,"
            # "F 8 3 9 3848 0009 2024 55, 93 ,"
            # "B 9 9 0 3797 2024 , 0, 39" (senza causale)
            imu_pattern = r'^[A-Z]\s+\d\s+\d\s+\d\s+(\d{4})(?:\s+(\d{4}))?\s+(\d{4})\s+(.*?)$'
            
            for line in lines:
                line_stripped = line.strip()
                match = re.match(imu_pattern, line_stripped)
                
                if match and ',' in (match.group(4) or ''):
                    codice = match.group(1)
                    group2 = match.group(2)  # può essere None (causale opzionale)
                    anno = match.group(3)
                    importi_text = match.group(4)
                    
                    causale = group2 if group2 else ""
                    
                    debito, credito = extract_amounts_pair(importi_text)
                    
                    if debito > 0 or credito > 0:
                        entry = {
                            "codice": codice,
                            "causale": causale,
                            "periodo": anno,
                            "debito": debito,
                            "credito": credito
                        }
                        
                        result["sezioni"]["IMU"].append(entry)
                        logger.debug(f"  IMU: {codice} {causale} {anno} | D:{debito:,.2f} C:{credito:,.2f}")
            
            # ===== CALCOLO TOTALI =====
            for sezione_name, entries in result["sezioni"].items():
                if not entries:
                    continue
                
                total_debito = sum(e["debito"] for e in entries)
                total_credito = sum(e["credito"] for e in entries)
                saldo = total_debito - total_credito
                
                result["totali"][sezione_name] = {
                    "debito": total_debito,
                    "credito": total_credito,
                    "saldo": saldo
                }
                
                logger.info(f"✅ {sezione_name}: D={total_debito:,.2f} C={total_credito:,.2f} SALDO={saldo:+,.2f}")
            
            # ===== SALDO FINALE =====
            # Cerca pattern "SALDO FINALE ... + 4.634, 31" o "- 828, 29"
            saldo_match = re.search(r'SALDO\s+FINALE.*?([-+])\s*([\d\.,\s]+)', text, re.IGNORECASE)
            if saldo_match:
                segno = saldo_match.group(1)
                importo_text = saldo_match.group(2)
                importo = parse_italian_amount(importo_text)
                result["saldo_finale"] = -importo if segno == '-' else importo
                logger.info(f"💰 SALDO FINALE dal PDF: {segno}{importo:,.2f} = {result['saldo_finale']:+,.2f}")
            else:
                # Calcola da totali
                saldo_calc = sum(t["saldo"] for t in result["totali"].values())
                result["saldo_finale"] = saldo_calc
                logger.info(f"💰 SALDO FINALE calcolato: {saldo_calc:+,.2f}")
            
            result["success"] = True
            logger.info(f"✅ Parsing completato: {sum(len(v) for v in result['sezioni'].values())} voci totali")
            
            return result
    
    except Exception as e:
        logger.error(f"❌ Errore parsing F24: {str(e)}", exc_info=True)
        result["error"] = str(e)
        return result


# Alias per compatibilità
extract_f24_structured = extract_f24_data
