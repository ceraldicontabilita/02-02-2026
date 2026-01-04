"""
Parser per Buste Paga / LUL (Libro Unico del Lavoro)
Estrae i dati dei dipendenti dai PDF delle buste paga
"""
import pdfplumber
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import io

logger = logging.getLogger(__name__)


def parse_currency(value: str) -> float:
    """Converte stringa valuta italiana in float."""
    if not value:
        return 0.0
    # Rimuovi simboli e spazi
    value = value.replace('€', '').replace(' ', '').strip()
    # Converti formato italiano (1.234,56) in float
    value = value.replace('.', '').replace(',', '.')
    try:
        return float(value)
    except ValueError:
        return 0.0


def extract_payslips_from_pdf(pdf_content: bytes) -> List[Dict[str, Any]]:
    """
    Estrae le buste paga da un file PDF.
    
    Args:
        pdf_content: Contenuto binario del PDF
        
    Returns:
        Lista di dict con i dati delle buste paga
    """
    payslips = []
    
    try:
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n---PAGE_BREAK---\n"
            
            # Cerca pattern per identificare ogni busta paga
            # Pattern comune: codice fiscale seguito da dati dipendente
            cf_pattern = r'[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]'
            
            # Dividi per pagine o sezioni
            sections = full_text.split('---PAGE_BREAK---')
            
            for section in sections:
                if not section.strip():
                    continue
                    
                # Cerca codice fiscale
                cf_match = re.search(cf_pattern, section)
                if not cf_match:
                    continue
                
                codice_fiscale = cf_match.group()
                
                # Estrai nome dipendente (di solito prima del CF o dopo)
                nome = extract_nome(section, codice_fiscale)
                
                # Estrai altri dati
                payslip = {
                    "codice_fiscale": codice_fiscale,
                    "nome": nome,
                    "qualifica": extract_field(section, r'(?:CAMERIERE|BARISTA|CASSIERA|PASTICCIERE|OPERAIO|AIUTO\s+\w+|BANCONISTA)'),
                    "livello": extract_field(section, r"(\d['´']?\s*Livello(?:\s+Super)?|Livello\s+\d+(?:\s+Super)?)"),
                    "retribuzione_lorda": extract_amount(section, r'(?:Lordo|LORDO|Retribuzione\s+Lorda)[:\s]*([0-9.,]+)'),
                    "netto": extract_amount(section, r'(?:Netto|NETTO|Netto\s+in\s+busta)[:\s]*([0-9.,]+)'),
                    "ore_lavorate": extract_amount(section, r'(?:Ore\s+Lav|ORE)[:\s]*([0-9.,]+)'),
                    "giorni_lavorati": extract_field(section, r'(?:Giorni|GG)[:\s]*(\d+)'),
                    "periodo": extract_periodo(section),
                    "azienda": extract_azienda(section),
                    "data_assunzione": extract_date(section, r'(?:Assunzione|Data\s+Ass)[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})'),
                }
                
                # Solo aggiungi se abbiamo dati validi
                if nome or codice_fiscale:
                    payslips.append(payslip)
                    
    except Exception as e:
        logger.error(f"Errore parsing PDF buste paga: {e}")
        raise
    
    return payslips


def extract_nome(text: str, codice_fiscale: str) -> str:
    """Estrae il nome del dipendente."""
    # Cerca il nome prima o dopo il codice fiscale
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if codice_fiscale in line:
            # Prova la riga precedente
            if i > 0:
                prev_line = lines[i-1].strip()
                # Verifica se sembra un nome (maiuscolo, senza numeri)
                if prev_line and re.match(r'^[A-Z\s]+$', prev_line) and len(prev_line) > 3:
                    return prev_line
            # Prova la stessa riga
            parts = line.split(codice_fiscale)
            if parts[0].strip():
                return parts[0].strip()
    return ""


def extract_field(text: str, pattern: str) -> str:
    """Estrae un campo usando regex."""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return match.group(1) if match.groups() else match.group()
    return ""


def extract_amount(text: str, pattern: str) -> float:
    """Estrae un importo usando regex."""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        value = match.group(1) if match.groups() else match.group()
        return parse_currency(value)
    return 0.0


def extract_date(text: str, pattern: str) -> str:
    """Estrae una data usando regex."""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return match.group(1) if match.groups() else match.group()
    return ""


def extract_periodo(text: str) -> str:
    """Estrae il periodo di riferimento."""
    mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
    pattern = r'(' + '|'.join(mesi) + r')\s*(\d{4})'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return ""


def extract_azienda(text: str) -> str:
    """Estrae il nome dell'azienda."""
    # Cerca pattern comuni per nomi azienda
    patterns = [
        r'([A-Z][A-Z\s]+(?:S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?))',
        r'DATORE(?:\s+DI\s+LAVORO)?[:\s]*([A-Z][A-Z\s]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return ""


def create_employee_from_payslip(payslip: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un record dipendente da una busta paga.
    """
    return {
        "name": payslip.get("nome", ""),
        "codice_fiscale": payslip.get("codice_fiscale", ""),
        "role": payslip.get("qualifica", ""),
        "livello": payslip.get("livello", ""),
        "salary": payslip.get("retribuzione_lorda", 0),
        "netto": payslip.get("netto", 0),
        "ore_lavorate": payslip.get("ore_lavorate", 0),
        "giorni_lavorati": payslip.get("giorni_lavorati", ""),
        "contract_type": "dipendente",
        "hire_date": payslip.get("data_assunzione", ""),
        "azienda": payslip.get("azienda", ""),
        "periodo_riferimento": payslip.get("periodo", ""),
    }
