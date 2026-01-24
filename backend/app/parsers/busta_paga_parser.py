"""
Parser Buste Paga - Formato Zucchetti
Estrae dati dalle buste paga PDF generate da software Zucchetti
Versione migliorata con estrazione completa di tutte le voci
"""
import re
from typing import Dict, Any
import fitz  # PyMuPDF


def parse_busta_paga_zucchetti(pdf_path: str) -> Dict[str, Any]:
    """
    Parse una busta paga in formato Zucchetti.
    
    Args:
        pdf_path: Percorso del file PDF
        
    Returns:
        Dizionario con tutti i dati estratti dalla busta paga
    """
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    # Normalizza spazi multipli
    text_clean = re.sub(r'\s+', ' ', text)
    
    result = {
        "tipo_documento": "busta_paga",
        "software": "zucchetti",
        "parse_success": True,
        "raw_text_length": len(text),
        
        # Dati Azienda
        "azienda": {},
        
        # Dati Dipendente
        "dipendente": {},
        
        # Periodo
        "periodo": {},
        
        # Voci Variabili (competenze e trattenute)
        "voci_variabili": [],
        
        # Totali
        "totali": {},
        
        # Progressivi
        "progressivi": {},
        
        # Ferie e Permessi
        "ferie_permessi": {},
        
        # TFR
        "tfr": {}
    }
    
    # === ESTRAZIONE DATI AZIENDA ===
    # Ragione Sociale
    rag_match = re.search(r'Ragione Sociale\s*([A-Z][A-Z0-9\s.]+(?:S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?))', text, re.IGNORECASE)
    if rag_match:
        result["azienda"]["ragione_sociale"] = rag_match.group(1).strip()
    
    # Codice Fiscale Azienda
    cf_az_match = re.search(r'Codice Fiscale\s+(\d{11})', text)
    if cf_az_match:
        result["azienda"]["codice_fiscale"] = cf_az_match.group(1)
    
    # Posizione INPS
    inps_match = re.search(r'Posizione Inps\s+(\d+/\d+)', text)
    if inps_match:
        result["azienda"]["posizione_inps"] = inps_match.group(1)
    
    # PAT INAIL
    inail_match = re.search(r'P\.?A\.?T\.?\s*Inail\s+(\d+/\d+)', text)
    if inail_match:
        result["azienda"]["pat_inail"] = inail_match.group(1)
    
    # === ESTRAZIONE DATI DIPENDENTE ===
    # Codice dipendente
    cod_dip_match = re.search(r'Codice dipendente\s+(\d+)', text)
    if cod_dip_match:
        result["dipendente"]["codice"] = cod_dip_match.group(1)
    
    # Nome completo (COGNOMEENOME o pattern simile)
    nome_match = re.search(r'COGNOMEENOME\s+([A-Z][A-Z\s]+?)(?:\s+Data|$)', text)
    if nome_match:
        result["dipendente"]["nome_completo"] = nome_match.group(1).strip()
    else:
        # Pattern alternativo
        nome_match2 = re.search(r'(?:DE SIMONE|ROSSI|BIANCHI|ESPOSITO|RUSSO)[A-Z\s]+', text)
        if nome_match2:
            result["dipendente"]["nome_completo"] = nome_match2.group(0).strip()
    
    # Codice Fiscale Dipendente
    cf_dip_match = re.search(r'Codice Fiscale\s+Matricola\s+([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])', text)
    if cf_dip_match:
        result["dipendente"]["codice_fiscale"] = cf_dip_match.group(1)
    else:
        # Pattern alternativo - cerca CF standard
        cf_alt = re.search(r'([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])', text)
        if cf_alt:
            result["dipendente"]["codice_fiscale"] = cf_alt.group(1)
    
    # Data di Nascita
    nascita_match = re.search(r'Data di Nascita\s+(\d{2}-\d{2}-\d{4})', text)
    if nascita_match:
        result["dipendente"]["data_nascita"] = nascita_match.group(1)
    
    # Data Assunzione
    assunz_match = re.search(r'Data Assunzione\s+(\d{2}-\d{2}-\d{4})', text)
    if assunz_match:
        result["dipendente"]["data_assunzione"] = assunz_match.group(1)
    
    # Livello
    livello_match = re.search(r'(\d+)\s*Livello(?:\s+Super)?', text)
    if livello_match:
        result["dipendente"]["livello"] = livello_match.group(1)
    
    # Part Time
    pt_match = re.search(r'Part\s*Time\s+(\d+[.,]?\d*)\s*%', text)
    if pt_match:
        result["dipendente"]["part_time_perc"] = float(pt_match.group(1).replace(',', '.'))
    
    # Tipo contratto
    contratto_match = re.search(r'T\.?\s*Deter\.?\s*(\d{2}/\d{2}/\d{4})', text)
    if contratto_match:
        result["dipendente"]["tipo_contratto"] = "Tempo Determinato"
        result["dipendente"]["scadenza_contratto"] = contratto_match.group(1)
    else:
        result["dipendente"]["tipo_contratto"] = "Tempo Indeterminato"
    
    # === ESTRAZIONE PERIODO ===
    mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
    
    periodo_match = re.search(r'PERIODO DI RETRIBUZIONE\s+(' + '|'.join(mesi) + r')\s+(\d{4})', text, re.IGNORECASE)
    if periodo_match:
        result["periodo"]["mese_nome"] = periodo_match.group(1).capitalize()
        result["periodo"]["anno"] = int(periodo_match.group(2))
        result["periodo"]["mese"] = mesi.index(periodo_match.group(1).lower()) + 1
    
    # Ore lavorate
    ore_match = re.search(r'Ore ordinarie\s+.*?(\d+[.,]?\d*)\s*$', text, re.MULTILINE)
    if ore_match:
        result["periodo"]["ore_ordinarie"] = parse_importo(ore_match.group(1))
    
    # Giorni lavorati
    giorni_match = re.search(r'LAVORATO\s+\d+\s+\d+\s+(\d+)', text)
    if giorni_match:
        result["periodo"]["giorni_lavorati"] = int(giorni_match.group(1))
    
    # === ESTRAZIONE PAGA BASE E CONTINGENZA ===
    paga_base_match = re.search(r'PAGA BASE\s+(\d+[.,]\d+)', text)
    if paga_base_match:
        result["dipendente"]["paga_base_oraria"] = parse_importo(paga_base_match.group(1))
    
    conting_match = re.search(r'CONTING\.?\s+(\d+[.,]\d+)', text)
    if conting_match:
        result["dipendente"]["contingenza_oraria"] = parse_importo(conting_match.group(1))
    
    totale_orario_match = re.search(r'TOTALE\s+(\d+[.,]\d+)', text)
    if totale_orario_match:
        result["dipendente"]["totale_orario"] = parse_importo(totale_orario_match.group(1))
    
    # === ESTRAZIONE VOCI VARIABILI (competenze e trattenute) ===
    # Pattern per voci tipo: Z00001 Retribuzione 8,60913 56,00000 ORE 482,11
    # O: Z00000 Contributo IVS 881,00 9,19000% 80,96
    voci_pattern = re.findall(
        r'([A-Z0-9]{5,7})\s+([A-Za-z0-9\s\.\'\/]+?)\s+(\d+[.,]\d+)\s+(?:(\d+[.,]\d+)\s*(ORE|%|))?\s*(\d+[.,]\d+)?',
        text
    )
    
    for match in voci_pattern:
        codice, descrizione, base_o_importo, riferimento, unita, importo_finale = match
        
        voce = {
            "codice": codice.strip(),
            "descrizione": descrizione.strip(),
        }
        
        if importo_finale:
            voce["importo"] = parse_importo(importo_finale)
            voce["base"] = parse_importo(base_o_importo)
            if riferimento:
                voce["riferimento"] = parse_importo(riferimento)
                voce["unita"] = unita if unita else None
        else:
            voce["importo"] = parse_importo(base_o_importo)
        
        # Determina se è competenza o trattenuta
        if codice.startswith('Z0000') and codice != 'Z00001':  # Trattenute INPS
            voce["tipo"] = "trattenuta"
        elif codice.startswith('F'):  # Voci IRPEF
            voce["tipo"] = "irpef"
        elif codice in ['000306', 'ZP9960']:  # Altre trattenute
            voce["tipo"] = "trattenuta"
        else:
            voce["tipo"] = "competenza"
        
        result["voci_variabili"].append(voce)
    
    # === ESTRAZIONE SPECIFICHE VOCI IRPEF ===
    irpef_patterns = {
        "imponibile_irpef": r'F02000\s+Imponibile IRPEF\s+(\d+[.,]\d+)',
        "irpef_lorda": r'F02010\s+IRPEF lorda\s+(\d+[.,]\d+)',
        "detrazioni_lavoro_dip": r'F02500\s+Detrazioni lav\.dip\.\s+(\d+[.,]\d+)',
        "ritenute_irpef": r'F03020\s+Ritenute IRPEF\s+(\d+[.,]\d+)',
        "imponibile_tass_aut": r'F06000\s+Imponibile Tass\.aut\.\s+(\d+[.,]\d+)',
        "irpef_lorda_tass_aut": r'F06010\s+IRPEF lorda Tass\.aut\s+(\d+[.,]\d+)',
        "ritenute_irpef_tass_aut": r'F06020\s+Ritenute IRPEF Tass\.aut\.\s+(\d+[.,]\d+)',
    }
    
    result["irpef"] = {}
    for key, pattern in irpef_patterns.items():
        match = re.search(pattern, text)
        if match:
            result["irpef"][key] = parse_importo(match.group(1))
    
    # === ESTRAZIONE TOTALI ===
    tot_comp_match = re.search(r'TOTALE COMPETENZE\s+(\d+[.,]\d+)', text)
    if tot_comp_match:
        result["totali"]["competenze"] = parse_importo(tot_comp_match.group(1))
    
    tot_tratt_match = re.search(r'TOTALE TRATTENUTE\s+(\d+[.,]\d+)', text)
    if tot_tratt_match:
        result["totali"]["trattenute"] = parse_importo(tot_tratt_match.group(1))
    
    arrot_match = re.search(r'ARROTONDAMENTO\s+([-]?\d+[.,]\d+)', text)
    if arrot_match:
        result["totali"]["arrotondamento"] = parse_importo(arrot_match.group(1))
    
    netto_match = re.search(r'NETTO DEL MESE\s+(\d+[.,]\d+)\s*€?', text)
    if netto_match:
        result["totali"]["netto"] = parse_importo(netto_match.group(1))
    
    # === ESTRAZIONE PROGRESSIVI ===
    prog_inps_match = re.search(r'Imp\.\s*INPS\s+(\d+[.,]\d+)', text)
    if prog_inps_match:
        result["progressivi"]["imponibile_inps"] = parse_importo(prog_inps_match.group(1))
    
    prog_inail_match = re.search(r'Imp\.\s*INAIL\s+(\d+[.,]\d+)', text)
    if prog_inail_match:
        result["progressivi"]["imponibile_inail"] = parse_importo(prog_inail_match.group(1))
    
    prog_irpef_match = re.search(r'Imp\.\s*IRPEF\s+(\d+[.,]\d+)', text)
    if prog_irpef_match:
        result["progressivi"]["imponibile_irpef"] = parse_importo(prog_irpef_match.group(1))
    
    irpef_pagata_match = re.search(r'IRPEF pagata\s+(\d+[.,]\d+)', text)
    if irpef_pagata_match:
        result["progressivi"]["irpef_pagata"] = parse_importo(irpef_pagata_match.group(1))
    
    # === ESTRAZIONE TFR ===
    tfr_utile_match = re.search(r'Retribuzione utile T\.?F\.?R\.?\s+(\d+[.,]\d+)', text)
    if tfr_utile_match:
        result["tfr"]["retribuzione_utile"] = parse_importo(tfr_utile_match.group(1))
    
    tfr_quota_match = re.search(r'Quota anno\s+(\d+[.,]\d+)', text)
    if tfr_quota_match:
        result["tfr"]["quota_anno"] = parse_importo(tfr_quota_match.group(1))
    
    tfr_fondo_match = re.search(r'F\.?do 31/12\s+(\d+[.,]\d+)', text)
    if tfr_fondo_match:
        result["tfr"]["fondo_31_12"] = parse_importo(tfr_fondo_match.group(1))
    
    tfr_rival_match = re.search(r'Rivalutaz\.?\s+(\d+[.,]\d+)', text)
    if tfr_rival_match:
        result["tfr"]["rivalutazione"] = parse_importo(tfr_rival_match.group(1))
    
    # === ESTRAZIONE FERIE E PERMESSI ===
    # Ferie: Maturato X Goduto Y Saldo Z
    ferie_section = re.search(r'Ferie\s+Permessi.*?Maturato\s+([\d.,]+)\s+([\d.,]+).*?Goduto\s+([\d.,]+).*?Saldo\s+([-]?[\d.,]+)\s+([-]?[\d.,]+)', text, re.DOTALL)
    if ferie_section:
        result["ferie_permessi"] = {
            "ferie_maturate": parse_importo(ferie_section.group(1)),
            "permessi_maturati": parse_importo(ferie_section.group(2)),
            "ferie_godute": parse_importo(ferie_section.group(3)),
            "ferie_saldo": parse_importo(ferie_section.group(4)),
            "permessi_saldo": parse_importo(ferie_section.group(5)),
        }
    else:
        # Pattern semplificato
        ferie_maturato = re.search(r'Maturato\s+([\d.,]+)', text)
        ferie_goduto = re.search(r'Goduto\s+([\d.,]+)', text)
        ferie_saldo = re.search(r'Saldo\s+([-]?[\d.,]+)', text)
        
        if ferie_maturato:
            result["ferie_permessi"]["ferie_maturate"] = parse_importo(ferie_maturato.group(1))
        if ferie_goduto:
            result["ferie_permessi"]["ferie_godute"] = parse_importo(ferie_goduto.group(1))
        if ferie_saldo:
            result["ferie_permessi"]["ferie_saldo"] = parse_importo(ferie_saldo.group(1))
    
    return result


def parse_importo(value_str: str) -> float:
    """Converte una stringa importo in float"""
    if not value_str:
        return 0.0
    # Gestisce formato italiano (1.234,56) e internazionale (1,234.56)
    clean = value_str.strip().replace(' ', '')
    if ',' in clean and '.' in clean:
        # Formato italiano: 1.234,56
        if clean.index('.') < clean.index(','):
            clean = clean.replace('.', '').replace(',', '.')
        else:
            # Formato internazionale: 1,234.56
            clean = clean.replace(',', '')
    elif ',' in clean:
        # Solo virgola: 123,45 (italiano)
        clean = clean.replace(',', '.')
    try:
        return float(clean)
    except ValueError:
        return 0.0


def parse_busta_paga_from_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
    """Parse busta paga da bytes (per upload via API)"""
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    
    try:
        result = parse_busta_paga_zucchetti(tmp_path)
    finally:
        os.unlink(tmp_path)
    
    return result


def extract_summary(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """Estrae un riepilogo dai dati parsati"""
    return {
        "dipendente": parsed_data.get("dipendente", {}).get("nome_completo", "N/D"),
        "codice_fiscale": parsed_data.get("dipendente", {}).get("codice_fiscale", "N/D"),
        "periodo": f"{parsed_data.get('periodo', {}).get('mese_nome', '')} {parsed_data.get('periodo', {}).get('anno', '')}",
        "lordo": parsed_data.get("totali", {}).get("competenze", 0),
        "trattenute": parsed_data.get("totali", {}).get("trattenute", 0),
        "netto": parsed_data.get("totali", {}).get("netto", 0),
        "ore_lavorate": parsed_data.get("periodo", {}).get("ore_ordinarie", 0),
        "imponibile_inps": parsed_data.get("progressivi", {}).get("imponibile_inps", 0),
        "imponibile_irpef": parsed_data.get("progressivi", {}).get("imponibile_irpef", 0),
    }
