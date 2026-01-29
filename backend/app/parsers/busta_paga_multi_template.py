"""
Parser Buste Paga Multi-Template
Supporta 3 formati diversi usati nel tempo:
- Template 1 (fino 2018): Software CSC - Napoli
- Template 2 (2018-2022): Zucchetti spa (layout classico)
- Template 3 (dal 2022): Zucchetti nuovo (con separatori 's')
"""
import re
from typing import Dict, Any, Optional, Tuple
import fitz  # PyMuPDF


def detect_template(text: str) -> str:
    """Rileva quale template è in uso basandosi sul contenuto del PDF."""
    # Template 3 (nuovo Zucchetti): ha "s" come separatore di parole
    if "COGNOMEsEsNOME" in text or "PERIODOsDIsRETRIBUZIONE" in text:
        return "zucchetti_new"
    # Template 1 (CSC Napoli)
    if "Software CSC" in text or "CSC - Napoli" in text:
        return "csc_napoli"
    # Template 2 (Zucchetti classico)
    if "Zucchetti spa" in text or "LIBRO UNICO DEL LAVORO" in text:
        return "zucchetti_classic"
    # Default al classico
    return "zucchetti_classic"


def parse_importo(value_str: str) -> float:
    """Converte una stringa importo in float."""
    if not value_str:
        return 0.0
    clean = value_str.strip().replace(' ', '').replace('+', '').replace('-', '')
    if ',' in clean and '.' in clean:
        if clean.index('.') < clean.index(','):
            clean = clean.replace('.', '').replace(',', '.')
        else:
            clean = clean.replace(',', '')
    elif ',' in clean:
        clean = clean.replace(',', '.')
    try:
        return float(clean)
    except ValueError:
        return 0.0


def parse_template_csc_napoli(text: str) -> Dict[str, Any]:
    """
    Parser per Template 1: Software CSC - Napoli (fino 2018)
    Formato più vecchio con layout tabellare classico.
    """
    result = {
        "template": "csc_napoli",
        "dipendente": {},
        "periodo": {},
        "totali": {},
        "tfr": {},
        "ferie_permessi": {}
    }
    
    # Estrai periodo (es: "DICEMBRE  2017")
    mesi = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
            'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE']
    for i, mese in enumerate(mesi):
        match = re.search(rf'{mese}\s+(\d{{4}})', text)
        if match:
            result["periodo"]["mese"] = i + 1
            result["periodo"]["mese_nome"] = mese.capitalize()
            result["periodo"]["anno"] = int(match.group(1))
            break
    
    # Estrai nome dipendente (dopo data: es "31/12/2017 DIAS MAHATHELGE")
    nome_match = re.search(r'\d{2}/\d{2}/\d{4}\s+([A-Z][A-Z\'\s]+?)\s+\d{2}/\d{2}/\d{4}', text)
    if nome_match:
        result["dipendente"]["nome_completo"] = nome_match.group(1).strip()
    
    # Estrai codice fiscale
    cf_match = re.search(r'([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])', text)
    if cf_match:
        result["dipendente"]["codice_fiscale"] = cf_match.group(1)
    
    # Estrai livello
    livello_match = re.search(r'O\s+(\d+)\s+[A-Z]+', text)
    if livello_match:
        result["dipendente"]["livello"] = livello_match.group(1)
    
    # TOTALE COMPETENZE
    comp_match = re.search(r'TOTALE COMPETENZE\s+([\d.,]+)\+?', text)
    if comp_match:
        result["totali"]["competenze"] = parse_importo(comp_match.group(1))
    
    # TOTALE TRATTENUTE  
    tratt_match = re.search(r'TOTALE TRATTENUTE\s+([\d.,]+)-?', text)
    if tratt_match:
        result["totali"]["trattenute"] = parse_importo(tratt_match.group(1))
    
    # TOTALE NETTO (cerca pattern come "276,00+" o "TOTALE NETTO 276,00")
    # Pattern 1: dopo arrotondamento
    netto_match = re.search(r'(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+([\d.,]+)\+?\s*Mat\.', text)
    if netto_match:
        result["totali"]["netto"] = parse_importo(netto_match.group(3))
    else:
        # Pattern 2: cerca LIRE con valore
        lire_match = re.search(r'LIRE\s*:\s*([\d.,]+)\+', text)
        if lire_match:
            # Converti da lire a euro (approssimativo)
            lire_val = parse_importo(lire_match.group(1))
            result["totali"]["netto"] = round(lire_val / 1936.27, 2)
    
    # Estrai ore lavorate
    ore_match = re.search(r'(\d+[.,]?\d*)\s*ORE\s+', text)
    if ore_match:
        result["periodo"]["ore_lavorate"] = parse_importo(ore_match.group(1))
    
    # Retribuzione TFR
    tfr_match = re.search(r'RETRIBUZIONE T\.?F\.?R\.?\s+([\d.,]+)', text)
    if tfr_match:
        result["tfr"]["retribuzione"] = parse_importo(tfr_match.group(1))
    
    # Ferie
    ferie_mat_match = re.search(r'Mat\.\s*([\d.,]+)\+?\s*Mat\.\s*([\d.,]+)', text)
    if ferie_mat_match:
        result["ferie_permessi"]["ferie_maturate"] = parse_importo(ferie_mat_match.group(1))
        result["ferie_permessi"]["permessi_maturati"] = parse_importo(ferie_mat_match.group(2))
    
    # Calcola lordo se mancante
    if "competenze" in result["totali"] and "netto" not in result["totali"]:
        if "trattenute" in result["totali"]:
            result["totali"]["netto"] = result["totali"]["competenze"] - result["totali"]["trattenute"]
    
    # Imposta lordo = competenze
    if "competenze" in result["totali"]:
        result["totali"]["lordo"] = result["totali"]["competenze"]
    
    return result


def parse_template_zucchetti_classic(text: str) -> Dict[str, Any]:
    """
    Parser per Template 2: Zucchetti spa classico (2018-2022)
    """
    result = {
        "template": "zucchetti_classic",
        "dipendente": {},
        "periodo": {},
        "totali": {},
        "tfr": {},
        "ferie_permessi": {}
    }
    
    # Estrai periodo
    mesi = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
            'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE']
    for i, mese in enumerate(mesi):
        match = re.search(rf'{mese}\s+(\d{{4}})', text, re.IGNORECASE)
        if match:
            result["periodo"]["mese"] = i + 1
            result["periodo"]["mese_nome"] = mese.capitalize()
            result["periodo"]["anno"] = int(match.group(1))
            break
    
    # Estrai nome dipendente
    nome_match = re.search(r'\d{2}/\d{2}/\d{4}\s+([A-Z][A-Z\'\s]+?)\s+\d{2}/\d{2}/\d{4}', text)
    if nome_match:
        result["dipendente"]["nome_completo"] = nome_match.group(1).strip()
    
    # Codice fiscale
    cf_match = re.search(r'([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])', text)
    if cf_match:
        result["dipendente"]["codice_fiscale"] = cf_match.group(1)
    
    # Livello
    livello_match = re.search(r'O\s+(\d+)\s+[A-Z]+', text)
    if livello_match:
        result["dipendente"]["livello"] = livello_match.group(1)
    
    # TOTALE COMPETENZE
    comp_match = re.search(r'TOTALE COMPETENZE\s+([\d.,]+)', text)
    if comp_match:
        result["totali"]["competenze"] = parse_importo(comp_match.group(1))
        result["totali"]["lordo"] = result["totali"]["competenze"]
    
    # TOTALE TRATTENUTE
    tratt_match = re.search(r'TOTALE TRATTENUTE\s+([\d.,]+)', text)
    if tratt_match:
        result["totali"]["trattenute"] = parse_importo(tratt_match.group(1))
    
    # NETTO - cerca LIRE
    lire_match = re.search(r'LIRE\s*:\s*([\d.,]+)\+', text)
    if lire_match:
        lire_val = parse_importo(lire_match.group(1))
        result["totali"]["netto"] = round(lire_val / 1936.27, 2)
    else:
        # Calcola da competenze - trattenute
        if "competenze" in result["totali"] and "trattenute" in result["totali"]:
            result["totali"]["netto"] = round(
                result["totali"]["competenze"] - result["totali"]["trattenute"], 2
            )
    
    # Ore lavorate - pattern "ORE LAVORATE" o dopo numeri
    ore_match = re.search(r'(\d{2,3})[.,]00\s+\d+\s+\d+\s+(\d{2,3})[.,]00', text)
    if ore_match:
        result["periodo"]["ore_lavorate"] = parse_importo(ore_match.group(2))
    
    # Giorni lavorati
    giorni_match = re.search(r'(\d+)\s+(\d+)[.,]00\s+\d+\s+\d+', text)
    if giorni_match:
        result["periodo"]["giorni_lavorati"] = int(giorni_match.group(1))
    
    # TFR
    tfr_match = re.search(r'RETRIBUZIONE T\.?F\.?R\.?\s+([\d.,]+)', text)
    if tfr_match:
        result["tfr"]["retribuzione"] = parse_importo(tfr_match.group(1))
    
    # Ferie maturate/godute
    ferie_mat = re.search(r'Mat\.\s*([\d.,]+)\+', text)
    if ferie_mat:
        result["ferie_permessi"]["ferie_maturate"] = parse_importo(ferie_mat.group(1))
    
    ferie_god = re.search(r'God\.\s*([\d.,]+)\+', text)
    if ferie_god:
        result["ferie_permessi"]["ferie_godute"] = parse_importo(ferie_god.group(1))
    
    return result


def parse_template_zucchetti_new(text: str) -> Dict[str, Any]:
    """
    Parser per Template 3: Zucchetti nuovo (dal 2022)
    Questo template usa 's' come separatore nelle etichette.
    """
    result = {
        "template": "zucchetti_new",
        "dipendente": {},
        "periodo": {},
        "totali": {},
        "tfr": {},
        "ferie_permessi": {},
        "irpef": {}
    }
    
    # Sostituisci i separatori 's' con spazi per leggibilità
    text_clean = text.replace('sEs', ' E ').replace('sDIs', ' DI ')
    text_clean = text_clean.replace('sDELs', ' DEL ').replace('sDELLAs', ' DELLA ')
    
    # Estrai periodo (es: "Giugno 2024")
    mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    for i, mese in enumerate(mesi):
        match = re.search(rf'{mese}\s+(\d{{4}})', text, re.IGNORECASE)
        if match:
            result["periodo"]["mese"] = i + 1
            result["periodo"]["mese_nome"] = mese
            result["periodo"]["anno"] = int(match.group(1))
            break
    
    # Nome dipendente (dopo codice numerico)
    nome_match = re.search(r'0300\d{3}\s+([A-Z][A-Z\'\s]+?)\s+[A-Z]{6}\d{2}', text)
    if nome_match:
        result["dipendente"]["nome_completo"] = nome_match.group(1).strip()
    else:
        # Pattern alternativo
        nome_match2 = re.search(r"D'[A-Z]+\s+[A-Z]+", text)
        if nome_match2:
            result["dipendente"]["nome_completo"] = nome_match2.group(0)
    
    # Codice fiscale
    cf_match = re.search(r'([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])', text)
    if cf_match:
        result["dipendente"]["codice_fiscale"] = cf_match.group(1)
    
    # Livello (es: "5' Livello")
    livello_match = re.search(r"(\d+)['\s]*Livello", text)
    if livello_match:
        result["dipendente"]["livello"] = livello_match.group(1)
    
    # Mansione
    mansione_match = re.search(r'Livello\s+([A-Z]+)', text)
    if mansione_match:
        result["dipendente"]["mansione"] = mansione_match.group(1)
    
    # Part Time
    pt_match = re.search(r'Part\s*Time\s+([\d.,]+)%', text)
    if pt_match:
        result["dipendente"]["part_time_perc"] = parse_importo(pt_match.group(1))
    
    # Paga base e contingenza
    paga_match = re.search(r'PAGA BASE\s+([\d,]+)', text)
    if paga_match:
        result["dipendente"]["paga_base"] = parse_importo(paga_match.group(1))
    
    conting_match = re.search(r'CONTING\.\s+([\d,]+)', text)
    if conting_match:
        result["dipendente"]["contingenza"] = parse_importo(conting_match.group(1))
    
    # TOTALE COMPETENZE - cerca pattern multilinea per voci Z5xxxx
    competenze = []
    # Pattern: Z5xxxx descrizione \n base \n ore/gg ORE/GG \n importo
    voci_pattern = re.findall(
        r'(Z5\d{4})\s+([^\n]+)\n([\d,\.]+)\n([\d,\.]+)\s*(?:ORE|GG)?\n([\d,\.]+)', 
        text
    )
    for match in voci_pattern:
        codice, desc, base, rif, importo = match
        val = parse_importo(importo)
        if val > 0:
            competenze.append(val)
    
    # Se non trovato con pattern multilinea, cerca inline
    if not competenze:
        voci_inline = re.findall(r'Z5\d{4}[^\d]+([\d,\.]+)\s*$', text, re.MULTILINE)
        for val_str in voci_inline:
            val = parse_importo(val_str)
            if val > 0:
                competenze.append(val)
    
    if competenze:
        result["totali"]["competenze"] = round(sum(competenze), 2)
        result["totali"]["lordo"] = result["totali"]["competenze"]
    
    # IRPEF e trattenute
    irpef_match = re.search(r'F06020\s+Ritenute IRPEF\s+Tass\.aut\.\s+([\d,]+)', text)
    if irpef_match:
        result["irpef"]["ritenute"] = parse_importo(irpef_match.group(1))
    
    # Contributo IVS (INPS)
    ivs_match = re.search(r'Z00000\s+Contributo IVS\s+([\d,]+)\s+%\s+[\d,]+\s+([\d,]+)', text)
    if ivs_match:
        result["totali"]["inps_dipendente"] = parse_importo(ivs_match.group(2))
    
    # TFR
    tfr_fondo = re.search(r'ZP8130\s+Fondo T\.F\.R\.\s+al 31/12\s+([\d,]+)', text)
    if tfr_fondo:
        result["tfr"]["fondo_31_12"] = parse_importo(tfr_fondo.group(1))
    
    tfr_quota = re.search(r'ZP8134\s+Quota T\.F\.R\.\s+dell.anno\s+([\d,]+)', text)
    if tfr_quota:
        result["tfr"]["quota_anno"] = parse_importo(tfr_quota.group(1))
    
    # Pignoramento (trattenute speciali)
    pign_matches = re.findall(r'000307\s+Pignoramento\s+([\d,]+)', text)
    if pign_matches:
        result["totali"]["pignoramenti"] = sum(parse_importo(p) for p in pign_matches)
    
    # Calcola trattenute totali
    trattenute = 0
    if "inps_dipendente" in result["totali"]:
        trattenute += result["totali"]["inps_dipendente"]
    if "ritenute" in result.get("irpef", {}):
        trattenute += result["irpef"]["ritenute"]
    if "pignoramenti" in result["totali"]:
        trattenute += result["totali"]["pignoramenti"]
    if trattenute > 0:
        result["totali"]["trattenute"] = trattenute
    
    # Calcola netto
    if "competenze" in result["totali"] and "trattenute" in result["totali"]:
        result["totali"]["netto"] = round(
            result["totali"]["competenze"] - result["totali"]["trattenute"], 2
        )
    
    # Cerca NETTO DEL MESE esplicito
    netto_match = re.search(r'NETTO\s*DEL\s*MESE[:\s]*([\d.,]+)', text.replace('s', ' '))
    if netto_match:
        result["totali"]["netto"] = parse_importo(netto_match.group(1))
    
    return result


def parse_busta_paga_multi(pdf_path: str) -> Dict[str, Any]:
    """
    Parser principale che rileva automaticamente il template e applica
    il parser corretto.
    
    Args:
        pdf_path: Percorso del file PDF
        
    Returns:
        Dizionario con tutti i dati estratti
    """
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    # Rileva il template
    template = detect_template(text)
    
    # Applica il parser corretto
    if template == "csc_napoli":
        result = parse_template_csc_napoli(text)
    elif template == "zucchetti_new":
        result = parse_template_zucchetti_new(text)
    else:
        result = parse_template_zucchetti_classic(text)
    
    result["raw_text_length"] = len(text)
    result["parse_success"] = True
    
    # Validazione minima
    if not result.get("totali", {}).get("netto") and not result.get("totali", {}).get("lordo"):
        result["parse_success"] = False
        result["parse_error"] = "Nessun importo estratto"
    
    return result


def parse_busta_paga_from_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
    """Parse busta paga da bytes (per upload via API o dati da MongoDB)."""
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    
    try:
        result = parse_busta_paga_multi(tmp_path)
    finally:
        os.unlink(tmp_path)
    
    return result


def extract_summary(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """Estrae un riepilogo per aggiornamento database."""
    totali = parsed_data.get("totali", {})
    dipendente = parsed_data.get("dipendente", {})
    periodo = parsed_data.get("periodo", {})
    
    return {
        "template": parsed_data.get("template", "unknown"),
        "dipendente_nome": dipendente.get("nome_completo"),
        "codice_fiscale": dipendente.get("codice_fiscale"),
        "livello": dipendente.get("livello"),
        "mese": periodo.get("mese"),
        "anno": periodo.get("anno"),
        "lordo": totali.get("lordo") or totali.get("competenze"),
        "trattenute": totali.get("trattenute"),
        "netto": totali.get("netto"),
        "ore_lavorate": periodo.get("ore_lavorate"),
        "giorni_lavorati": periodo.get("giorni_lavorati"),
        "inps_dipendente": totali.get("inps_dipendente"),
        "irpef": parsed_data.get("irpef", {}).get("ritenute"),
        "tfr_quota": parsed_data.get("tfr", {}).get("quota_anno"),
    }
