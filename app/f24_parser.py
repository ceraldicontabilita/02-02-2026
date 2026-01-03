"""
F24 Tax Form Parser.

This module parses Italian F24 tax payment PDFs and extracts:
- Total payment amount
- Due date
- Tax codes (codici tributo)
- Classification (Erario vs Contributi INPS/INAIL)
- Company verification (Ceraldi Group filter)
"""

import io
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import pdfplumber

from utils.parsing import ExternalServiceError, ParsingError, normalize_amount
from codici_tributo_f24 import get_descrizione_tributo

logger = logging.getLogger(__name__)

# Tax codes for CONTRIBUTI classification (INPS/INAIL)
CODICI_CONTRIBUTI = [
    "1001", "DM10", "DASM", "VSPG",  # INPS
    "INAIL", "P101", "P102",  # INAIL
]

# All other categories are ERARIO
CATEGORIE_ERARIO = [
    "IRPEF", "IVA", "IRES", "IRAP", "IMU", "Addizionali", "Registro",
    "Cedolare Secca", "Forfettario", "Ritenute", "Sanzioni", "Interessi",
    "770", "Altri"
]



def extract_saldo_finale(text: str) -> Optional[float]:
    """
    Extract final balance from F24 text.

    Searches for:
    1. "SALDO" keyword followed by amount
    2. "TOTALE" at document end
    3. Last large number as fallback

    Args:
        text: Full F24 PDF text content

    Returns:
        Final balance amount or None if not found

    Examples:
        >>> extract_saldo_finale("SALDO: 1.234,56 €")
        1234.56
        >>> extract_saldo_finale("TOTALE € 500,00")
        500.0
    """
    try:
        # Pattern 1: "SALDO" followed by number
        match = re.search(r'SALDO[:\s]+€?\s*([\d.,]+)', text, re.IGNORECASE)
        if match:
            return normalize_amount(match.group(1))

        # Pattern 2: "TOTALE" at document end
        match = re.search(r'TOTALE[:\s]+€?\s*([\d.,]+)(?!.*TOTALE)', text, re.IGNORECASE | re.DOTALL)
        if match:
            return normalize_amount(match.group(1))

        # Pattern 3: Last large number (potentially the total)
        matches = re.findall(r'€?\s*([\d.]+,\d{2})', text)
        if matches:
            return normalize_amount(matches[-1])

        return None

    except (ValueError, AttributeError) as e:
        logger.warning(f"Error extracting saldo finale: {e}")
        return None

def extract_f24_metadata(text: str) -> Dict[str, Optional[str]]:
    """
    Extract metadata from F24 text.

    Extracts:
    - Codice fiscale (tax ID)
    - Payment date (YYYY-MM-DD format)
    - Transaction ID (CRO/TRN)

    Args:
        text: Full F24 PDF text content

    Returns:
        Dictionary with metadata fields (values may be None)

    Examples:
        >>> metadata = extract_f24_metadata(pdf_text)
        >>> metadata['codice_fiscale']
        'IT12345678901'
        >>> metadata['data_pagamento']
        '2024-11-15'
    """
    metadata: Dict[str, Optional[str]] = {
        'codice_fiscale': None,
        'data_pagamento': None,
        'identificativo_operazione': None
    }

    try:
        # Extract Codice Fiscale (pattern IT + numbers)
        cf_match = re.search(r'(?:CF|C\.F\.|CODICE FISCALE)[:\s]+([A-Z0-9]{11,16})', text, re.IGNORECASE)
        if cf_match:
            metadata['codice_fiscale'] = cf_match.group(1)

        # Extract Payment Date (various formats)
        date_match = re.search(r'(?:DATA|PAGAMENTO|SCADENZA)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text, re.IGNORECASE)
        if date_match:
            date_str = date_match.group(1)
            # Convert to YYYY-MM-DD
            try:
                separator = '/' if '/' in date_str else '-'
                parts = date_str.split(separator)

                if len(parts) == 3:
                    day, month, year = parts
                    if len(year) == 2:
                        year = '20' + year
                    metadata['data_pagamento'] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            except (ValueError, IndexError) as e:
                logger.warning(f"Error parsing date: {e}")

        # Extract Transaction ID (CRO, TRN, etc.)
        id_match = re.search(r'(?:CRO|TRN|ID)[:\s]+([A-Z0-9]{10,20})', text, re.IGNORECASE)
        if id_match:
            metadata['identificativo_operazione'] = id_match.group(1)

        return metadata

    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        return metadata


def parse_f24_pdf(pdf_bytes: bytes, sender_email: Optional[str] = None) -> Dict[str, Any]:
    """
    Parse F24 PDF and extract all relevant data.

    Validates document is for Ceraldi Group, classifies type (Erario/Contributi),
    and extracts payment details including amounts, tax codes, and due dates.

    Args:
        pdf_bytes: PDF content as bytes
        sender_email: Email sender for automatic classification (optional)

    Returns:
        Dictionary containing:
            - success (bool): True if parsing succeeded
            - tipo (str): 'erario' or 'contributi'
            - importo_totale (float): Total payment amount
            - scadenza (str | None): Due date in YYYY-MM-DD format
            - codici_tributo (List[Dict]): Tax codes with amounts and descriptions
            - anno_riferimento (str | None): Reference year
            - has_ceraldi (bool): True if document is for Ceraldi Group
            - raw_text (str): First 500 chars for debugging
            - error (str): Error message if success=False

    Raises:
        ParsingError: If PDF is malformed or unreadable
        ExternalServiceError: If Google Document AI fails (when integrated)

    Examples:
        >>> with open('f24.pdf', 'rb') as f:
        ...     result = parse_f24_pdf(f.read(), 'rosaria.marotta@email.it')
        >>> result['success']
        True
        >>> result['tipo']
        'erario'
        >>> result['importo_totale']
        2450.75
    """
    if not pdf_bytes:
        raise ParsingError("Empty PDF bytes provided for F24 parsing")

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text

            if not full_text:
                return {
                    'success': False,
                    'error': 'PDF vuoto o non leggibile'
                }

            # Note: Ceraldi Group validation removed to allow processing of all F24 documents
            full_text_upper = full_text.upper()
            has_ceraldi = any(keyword in full_text_upper for keyword in [
                'CERALDI GROUP',
                'CERALDI GROUP SRL',
                'CERALDIGROUP',
                'CERALDI'
            ])

            # Extract data
            importo = extract_importo_totale(full_text)
            scadenza = extract_scadenza(full_text)
            codici_tributo = extract_codici_tributo(full_text)
            anno_riferimento = extract_anno_riferimento(full_text)

            # Classify based on SENDER EMAIL (priority) or tax codes
            if sender_email:
                tipo = classify_by_sender(sender_email)
            else:
                tipo = classify_f24_type(codici_tributo)

            logger.info(f"✅ F24 parsed successfully: tipo={tipo}, importo=€{importo}, scadenza={scadenza}")

            return {
                'success': True,
                'tipo': tipo,
                'importo_totale': importo,
                'scadenza': scadenza,
                'codici_tributo': codici_tributo,
                'anno_riferimento': anno_riferimento,
                'has_ceraldi': has_ceraldi,
                'raw_text': full_text[:500]
            }

    except Exception as e:
        logger.error(f"❌ F24 parsing error: {e}")
        raise ParsingError(f"Failed to parse F24 PDF: {str(e)}") from e


def classify_by_sender(sender_email: str) -> str:
    """
    Classify F24 based on sender email.

    Rules:
    - CONTRIBUTI: grazia.studioferrantini@email.it, f.ferrantini@email.it
    - ERARIO: rosaria.marotta@email.it
    - Default: erario

    Args:
        sender_email: Email address of sender

    Returns:
        'contributi' or 'erario'

    Examples:
        >>> classify_by_sender('grazia.studioferrantini@email.it')
        'contributi'
        >>> classify_by_sender('rosaria.marotta@email.it')
        'erario'
    """
    sender_lower = sender_email.lower()

    # CONTRIBUTI senders
    if any(email in sender_lower for email in ['grazia.studioferrantini', 'f.ferrantini']):
        return 'contributi'

    # ERARIO senders
    if 'rosaria.marotta' in sender_lower:
        return 'erario'

    return 'erario'


def extract_importo_totale(text: str) -> float:
    """
    Extract total amount from F24 text.

    Searches for common F24 amount patterns and returns the highest value found
    (usually the total).

    Args:
        text: Full F24 PDF text content

    Returns:
        Total amount as float (0.0 if not found)

    Examples:
        >>> extract_importo_totale("TOTALE € 1.234,56")
        1234.56
        >>> extract_importo_totale("SALDO EUR 500,00")
        500.0
    """
    patterns = [
        r'TOTALE\s*[A-Z]*\s*(?:€|EUR)?\s*(\d+[.,]\d{2})',
        r'(?:SALDO|IMPORTO)\s*(?:€|EUR)?\s*(\d+[.,]\d{2})',
        r'(?:€|EUR)\s*(\d+[.,]\d{2})',
        r'(\d+),\s*(\d{2})\s*(?:€|EUR)',
        r'(\d{1,3}(?:\.\d{3})*,\d{2})',
    ]

    importi_trovati: List[float] = []

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                if len(match) == 2:
                    importo_str = f"{match[0]}.{match[1]}"
                else:
                    importo_str = match[0]
            else:
                importo_str = match

            importo = normalize_amount(importo_str)
            if 0 < importo < 1000000:  # Sanity check
                importi_trovati.append(importo)

    return max(importi_trovati) if importi_trovati else 0.0


def extract_scadenza(text: str) -> Optional[str]:
    """
    Extract due date from F24 text.

    Searches for Italian date patterns near keywords like "SCADENZA", "entro".
    Returns date in YYYY-MM-DD format.

    Args:
        text: Full F24 PDF text content

    Returns:
        Due date in YYYY-MM-DD format or None

    Examples:
        >>> extract_scadenza("SCADENZA 15/11/2024")
        '2024-11-15'
        >>> extract_scadenza("entro il 30-12-2024")
        '2024-12-30'
    """
    patterns = [
        r'SCADENZA[:\s]*(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
        r'entro\s+(?:il\s+)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
        r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
        r'(\d{2})[-/](\d{4})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) == 2:  # MM/YYYY format
                month, year = groups
                day = "28" if month == "02" else "30"
                return f"{year}-{month.zfill(2)}-{day}"
            elif len(groups) == 3:  # DD/MM/YYYY format
                day, month, year = groups
                try:
                    date_obj = datetime.strptime(f"{year}-{month.zfill(2)}-{day.zfill(2)}", "%Y-%m-%d")
                    return date_obj.strftime("%Y-%m-%d")
                except (ValueError, AttributeError):
                    continue

    return None


def extract_codici_tributo(text: str) -> List[Dict[str, Any]]:
    """
    Extract tax codes (codici tributo) from F24 text.

    Searches for Italian tax code patterns and matches with descriptions
    from codici_tributo_f24.py registry.

    Args:
        text: Full F24 PDF text content

    Returns:
        List of tax code dictionaries with:
            - codice (str): Tax code
            - importo (float): Amount
            - descrizione (str): Description from registry

    Examples:
        >>> codes = extract_codici_tributo(pdf_text)
        >>> codes[0]
        {'codice': '1001', 'importo': 0.0, 'descrizione': 'IRPEF sostituti d\'imposta'}
    """
    codici: List[Dict[str, Any]] = []

    patterns = [
        r'(?:cod\.?|codice)\s*[:=]?\s*([A-Z0-9]{4})',
        r'\b([0-9]{4})\b',
        r'\b([A-Z]{4})\b',
    ]

    codici_trovati: set = set()
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            codice = match.upper()
            if codice and codice not in codici_trovati:
                codici_trovati.add(codice)
                descrizione = get_descrizione_tributo(codice)
                codici.append({
                    'codice': codice,
                    'importo': 0.0,
                    'descrizione': descrizione
                })

    return codici


def extract_anno_riferimento(text: str) -> Optional[str]:
    """
    Extract reference year from F24 text.

    Searches for year patterns near keywords like "ANNO", "RIFERIMENTO", "PERIODO".

    Args:
        text: Full F24 PDF text content

    Returns:
        Four-digit year string or None

    Examples:
        >>> extract_anno_riferimento("ANNO DI RIFERIMENTO: 2024")
        '2024'
        >>> extract_anno_riferimento("Periodo: 2023")
        '2023'
    """
    patterns = [
        r'(?:anno|riferimento|periodo)\s*[:=]?\s*(\d{4})',
        r'\b(20\d{2})\b'
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            year = match.group(1)
            year_int = int(year)
            if 2020 <= year_int <= 2030:  # Reasonable range
                return year

    return None


def classify_f24_type(codici_tributo: List[Dict[str, Any]]) -> str:
    """
    Classify F24 type based on tax codes.

    Args:
        codici_tributo: List of tax code dictionaries

    Returns:
        'contributi' if INPS/INAIL codes found, else 'erario'

    Examples:
        >>> codes = [{'codice': '1001', 'importo': 1000}]
        >>> classify_f24_type(codes)
        'contributi'
        >>> codes = [{'codice': '4001', 'importo': 500}]
        >>> classify_f24_type(codes)
        'erario'
    """
    for codice_data in codici_tributo:
        codice = codice_data['codice']
        if codice in CODICI_CONTRIBUTI:
            return 'contributi'

    return 'erario'


def is_iva_f24(codici_tributo: List[Dict[str, Any]]) -> bool:
    """
    Check if F24 contains only IVA tax codes (6001-6019, 6099).
    
    Used to filter F24 documents in IVA management section,
    excluding IRPEF, IRES, IRAP, IMU, Contributi, and other non-IVA codes.
    
    Args:
        codici_tributo: List of tax code dictionaries with 'codice' field
    
    Returns:
        True if at least one IVA code found and no non-IVA codes, False otherwise
    
    Examples:
        >>> codes = [{'codice': '6007', 'importo': 1000}]
        >>> is_iva_f24(codes)
        True
        >>> codes = [{'codice': '6007'}, {'codice': '4001'}]
        >>> is_iva_f24(codes)
        False
        >>> codes = [{'codice': '1001', 'importo': 500}]
        >>> is_iva_f24(codes)
        False
    """
    if not codici_tributo:
        return False
    
    # Define IVA tax codes: 6001-6019 and 6099
    iva_codes = {str(code) for code in range(6001, 6020)}
    iva_codes.add('6099')
    
    has_iva = False
    for codice_data in codici_tributo:
        codice = str(codice_data.get('codice', '')).strip()
        if codice in iva_codes:
            has_iva = True
        elif codice:  # Non-IVA code found
            return False
    
    return has_iva
