"""
Parser per estrarre dati dalle buste paga PDF.
Estrae: Paga Base, Contingenza, TFR, Ferie, Permessi, ROL
"""
import pdfplumber
import re
import os
from datetime import datetime
from typing import Dict, List, Optional, Any

# Mapping mesi italiano -> numero
MESI_MAP = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4,
    'maggio': 5, 'giugno': 6, 'luglio': 7, 'agosto': 8,
    'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12,
    'tredicesima': 12, 'quattordicesima': 7
}

def parse_italian_number(value: str) -> float:
    """Converte numero italiano (1.234,56) in float."""
    if not value:
        return 0.0
    try:
        # Rimuove spazi e caratteri non numerici eccetto . e ,
        clean = re.sub(r'[^\d.,\-]', '', str(value))
        # Gestisce il formato italiano
        clean = clean.replace('.', '').replace(',', '.')
        return float(clean) if clean else 0.0
    except:
        return 0.0

def extract_busta_paga_data(pdf_path: str) -> Dict[str, Any]:
    """
    Estrae i dati principali da una busta paga PDF.
    
    Returns:
        Dict con: dipendente, mese, anno, paga_base, contingenza, 
                  tfr_accantonato, ferie, permessi, netto
    """
    result = {
        'file': os.path.basename(pdf_path),
        'dipendente': None,
        'codice_fiscale': None,
        'mese': None,
        'anno': None,
        'paga_base_oraria': 0.0,
        'contingenza_oraria': 0.0,
        'paga_base_mensile': 0.0,
        'contingenza_mensile': 0.0,
        'tfr_fondo': 0.0,
        'tfr_quota_anno': 0.0,
        'ferie_residuo_ap': 0.0,
        'ferie_maturate': 0.0,
        'ferie_godute': 0.0,
        'ferie_saldo': 0.0,
        'permessi_residuo_ap': 0.0,
        'permessi_maturati': 0.0,
        'permessi_goduti': 0.0,
        'permessi_saldo': 0.0,
        'rol_residuo_ap': 0.0,
        'rol_maturati': 0.0,
        'rol_goduti': 0.0,
        'rol_saldo': 0.0,
        'netto_mese': 0.0,
        'imponibile_inps': 0.0,
        'imponibile_irpef': 0.0,
        'livello': None,
        'qualifica': None,
        'data_assunzione': None,
        'parsed_at': datetime.now().isoformat()
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
            
            lines = full_text.split('\n')
            
            # Estrae mese e anno dal nome file
            filename = os.path.basename(pdf_path).lower()
            for mese_nome, mese_num in MESI_MAP.items():
                if mese_nome in filename:
                    result['mese'] = mese_num
                    break
            
            year_match = re.search(r'20\d{2}', filename)
            if year_match:
                result['anno'] = int(year_match.group())
            
            # Parse linee per estrarre dati
            for i, line in enumerate(lines):
                line_upper = line.upper()
                
                # Nome dipendente e CF
                if 'VSPVCN' in line or re.search(r'[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]', line):
                    cf_match = re.search(r'([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])', line)
                    if cf_match:
                        result['codice_fiscale'] = cf_match.group(1)
                    # Nome prima del CF
                    parts = line.split()
                    for j, p in enumerate(parts):
                        if re.match(r'[A-Z]{6}\d{2}', p):
                            result['dipendente'] = ' '.join(parts[:j])
                            break
                
                # Paga base e contingenza (oraria)
                if 'PAGA BASE' in line_upper and 'SCATTI' in line_upper:
                    # La prossima linea contiene i valori
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        numbers = re.findall(r'[\d]+[,.][\d]+', next_line)
                        if len(numbers) >= 3:
                            result['paga_base_oraria'] = parse_italian_number(numbers[0])
                            # Scatti è il secondo, contingenza è il terzo
                            result['contingenza_oraria'] = parse_italian_number(numbers[2])
                
                # TFR
                if 'T.F.R.' in line and 'F.DO' in line_upper:
                    # Cerca numeri nella stessa linea o successiva
                    numbers = re.findall(r'[\d]+[.,][\d]+', line)
                    if not numbers and i + 1 < len(lines):
                        numbers = re.findall(r'[\d]+[.,][\d]+', lines[i + 1])
                    if numbers:
                        result['tfr_fondo'] = parse_italian_number(numbers[0])
                        if len(numbers) >= 4:
                            result['tfr_quota_anno'] = parse_italian_number(numbers[3])
                
                # Ferie
                if line.startswith('Ferie') or 'FERIE' in line_upper[:20]:
                    numbers = re.findall(r'[\d]+[,.][\d]+', line)
                    if len(numbers) >= 4:
                        result['ferie_residuo_ap'] = parse_italian_number(numbers[0])
                        result['ferie_maturate'] = parse_italian_number(numbers[1])
                        result['ferie_godute'] = parse_italian_number(numbers[2])
                        result['ferie_saldo'] = parse_italian_number(numbers[3])
                
                # Permessi
                if line.startswith('Permessi') or ('PERMESSI' in line_upper[:20] and 'ORE' in line_upper):
                    numbers = re.findall(r'[\d]+[,.][\d]+', line)
                    if len(numbers) >= 2:
                        result['permessi_residuo_ap'] = parse_italian_number(numbers[0])
                        result['permessi_maturati'] = parse_italian_number(numbers[1])
                        if len(numbers) >= 3:
                            result['permessi_goduti'] = parse_italian_number(numbers[2])
                        if len(numbers) >= 4:
                            result['permessi_saldo'] = parse_italian_number(numbers[3])
                
                # ROL
                if 'ROL' in line_upper[:20]:
                    numbers = re.findall(r'[\d]+[,.][\d]+', line)
                    if len(numbers) >= 4:
                        result['rol_residuo_ap'] = parse_italian_number(numbers[0])
                        result['rol_maturati'] = parse_italian_number(numbers[1])
                        result['rol_goduti'] = parse_italian_number(numbers[2])
                        result['rol_saldo'] = parse_italian_number(numbers[3])
                
                # Netto del mese
                if 'NETTO' in line_upper and 'MESE' in line_upper:
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        # Cerca importo con € o senza
                        amount_match = re.search(r'([\d.,]+)\s*€?', next_line)
                        if amount_match:
                            result['netto_mese'] = parse_italian_number(amount_match.group(1))
                
                # Imponibile INPS
                if 'IMP. INPS' in line_upper or 'IMPONIBILE INPS' in line_upper:
                    numbers = re.findall(r'[\d]+[.,][\d]+', line)
                    if numbers:
                        result['imponibile_inps'] = parse_italian_number(numbers[0])
                
                # Imponibile IRPEF
                if 'IMP. IRPEF' in line_upper or 'IMPONIBILE IRPEF' in line_upper:
                    numbers = re.findall(r'[\d]+[.,][\d]+', line)
                    if numbers:
                        result['imponibile_irpef'] = parse_italian_number(numbers[0])
                
                # Livello
                if 'LIVELLO' in line_upper or re.search(r"\d['°^]?\s*LIVELLO", line_upper):
                    level_match = re.search(r"(\d)['°^]?\s*LIVELLO", line_upper)
                    if level_match:
                        result['livello'] = f"{level_match.group(1)}° Livello"
                    elif "''" in line or "5'" in line or "5°" in line:
                        result['livello'] = "5° Livello"
                
                # Qualifica
                if 'BARISTA' in line_upper:
                    result['qualifica'] = 'Barista'
                elif 'CUOCO' in line_upper:
                    result['qualifica'] = 'Cuoco'
                elif 'CAMERIERE' in line_upper:
                    result['qualifica'] = 'Cameriere'
                elif 'AIUTO' in line_upper and 'CUCINA' in line_upper:
                    result['qualifica'] = 'Aiuto Cucina'
                
                # Data assunzione
                if 'ASSUNZIONE' in line_upper or 'DATA ASS' in line_upper:
                    date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{4})', line)
                    if date_match:
                        result['data_assunzione'] = date_match.group(1)
                    else:
                        date_match = re.search(r'(\d{2}[-/]\d{2}[-/]\d{2})', line)
                        if date_match:
                            result['data_assunzione'] = date_match.group(1)
            
            # Calcola paga mensile se abbiamo l'oraria (assumendo 173.33 ore/mese)
            if result['paga_base_oraria'] > 0:
                result['paga_base_mensile'] = round(result['paga_base_oraria'] * 173.33, 2)
            if result['contingenza_oraria'] > 0:
                result['contingenza_mensile'] = round(result['contingenza_oraria'] * 173.33, 2)
    
    except Exception as e:
        result['error'] = str(e)
    
    return result


def scan_dipendente_folder(folder_path: str) -> List[Dict]:
    """
    Scansiona una cartella di un dipendente e estrae i dati da tutte le buste paga.
    Restituisce la lista ordinata per data (più recente prima).
    """
    results = []
    
    if not os.path.exists(folder_path):
        return results
    
    for filename in os.listdir(folder_path):
        if filename.lower().endswith('.pdf'):
            pdf_path = os.path.join(folder_path, filename)
            data = extract_busta_paga_data(pdf_path)
            if data.get('anno') and data.get('mese'):
                results.append(data)
    
    # Ordina per anno e mese decrescente
    results.sort(key=lambda x: (x.get('anno', 0), x.get('mese', 0)), reverse=True)
    
    return results


def get_latest_progressivi(folder_path: str) -> Dict[str, Any]:
    """
    Ottiene i progressivi più recenti da una cartella dipendente.
    Prende preferibilmente dicembre o l'ultimo mese disponibile.
    """
    buste = scan_dipendente_folder(folder_path)
    
    if not buste:
        return {}
    
    # Cerca prima dicembre dell'anno più recente
    for busta in buste:
        if busta.get('mese') == 12:
            return {
                'tfr_accantonato': busta.get('tfr_fondo', 0),
                'tfr_quota_anno': busta.get('tfr_quota_anno', 0),
                'ferie_maturate': busta.get('ferie_maturate', 0),
                'ferie_godute': busta.get('ferie_godute', 0),
                'ferie_residue': busta.get('ferie_saldo', 0),
                'permessi_maturati': busta.get('permessi_maturati', 0),
                'permessi_goduti': busta.get('permessi_goduti', 0),
                'permessi_residui': busta.get('permessi_saldo', 0),
                'rol_maturati': busta.get('rol_maturati', 0),
                'rol_goduti': busta.get('rol_goduti', 0),
                'rol_residui': busta.get('rol_saldo', 0),
                'paga_base': busta.get('paga_base_mensile', 0),
                'contingenza': busta.get('contingenza_mensile', 0),
                'netto_mese': busta.get('netto_mese', 0),
                'anno_riferimento': busta.get('anno'),
                'mese_riferimento': busta.get('mese'),
                'fonte': busta.get('file')
            }
    
    # Se non c'è dicembre, prende l'ultimo disponibile
    busta = buste[0]
    return {
        'tfr_accantonato': busta.get('tfr_fondo', 0),
        'tfr_quota_anno': busta.get('tfr_quota_anno', 0),
        'ferie_maturate': busta.get('ferie_maturate', 0),
        'ferie_godute': busta.get('ferie_godute', 0),
        'ferie_residue': busta.get('ferie_saldo', 0),
        'permessi_maturati': busta.get('permessi_maturati', 0),
        'permessi_goduti': busta.get('permessi_goduti', 0),
        'permessi_residui': busta.get('permessi_saldo', 0),
        'rol_maturati': busta.get('rol_maturati', 0),
        'rol_goduti': busta.get('rol_goduti', 0),
        'rol_residui': busta.get('rol_saldo', 0),
        'paga_base': busta.get('paga_base_mensile', 0),
        'contingenza': busta.get('contingenza_mensile', 0),
        'netto_mese': busta.get('netto_mese', 0),
        'anno_riferimento': busta.get('anno'),
        'mese_riferimento': busta.get('mese'),
        'fonte': busta.get('file')
    }


def scan_all_dipendenti(base_path: str = "/app/documents/buste_paga") -> Dict[str, Dict]:
    """
    Scansiona tutte le cartelle dei dipendenti e restituisce un dizionario
    con i progressivi più recenti per ogni dipendente.
    """
    result = {}
    
    if not os.path.exists(base_path):
        return result
    
    for folder_name in os.listdir(base_path):
        folder_path = os.path.join(base_path, folder_name)
        if os.path.isdir(folder_path):
            progressivi = get_latest_progressivi(folder_path)
            if progressivi:
                # Usa il nome della cartella come chiave
                nome_normalizzato = folder_name.replace('_', ' ')
                result[nome_normalizzato] = progressivi
    
    return result


if __name__ == "__main__":
    # Test
    import json
    
    # Test singola busta
    print("=== TEST SINGOLA BUSTA ===")
    test_path = "/app/documents/buste_paga/Vincenzo_Vespa/Busta paga - Vespa Vincenzo - Dicembre 2024.pdf"
    if os.path.exists(test_path):
        data = extract_busta_paga_data(test_path)
        print(json.dumps(data, indent=2, ensure_ascii=False))
    
    # Test progressivi
    print("\n=== TEST PROGRESSIVI ===")
    progressivi = get_latest_progressivi("/app/documents/buste_paga/Vincenzo_Vespa")
    print(json.dumps(progressivi, indent=2, ensure_ascii=False))
    
    # Test scan tutti
    print("\n=== TEST SCAN TUTTI (primi 3) ===")
    tutti = scan_all_dipendenti()
    for i, (nome, prog) in enumerate(list(tutti.items())[:3]):
        print(f"\n{nome}:")
        print(json.dumps(prog, indent=2, ensure_ascii=False))
