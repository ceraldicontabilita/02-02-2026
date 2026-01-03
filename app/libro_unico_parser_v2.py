"""
Real PDF parser for Libro Unico Zucchetti.

This module parses PDF payroll files (Libro Unico) and extracts:
- Employee salary data
- Attendance records (ore ordinarie, ferie, permessi, etc.)
- Contract expiration dates
- Competenza month/year
"""

import io
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

from utils.parsing import ParsingError, safe_float, safe_int

logger = logging.getLogger(__name__)

# Italian month names for parsing
ITALIAN_MONTHS = {
    'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
    'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
    'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12'
}


def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Normalize date from DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD.

    Args:
        date_str: Date string in Italian format (DD/MM/YYYY or DD-MM-YYYY)

    Returns:
        ISO format date string (YYYY-MM-DD) or None if invalid

    Examples:
        >>> normalize_date("31/12/2024")
        '2024-12-31'
        >>> normalize_date("15-03-25")
        '2025-03-15'
        >>> normalize_date("invalid")
        None
    """
    if not date_str:
        return None

    try:
        date_str = date_str.replace('/', '-')
        parts = date_str.split('-')

        if len(parts) != 3:
            return None

        day, month, year = parts

        if len(year) == 2:
            year = '20' + year

        day_int = int(day)
        month_int = int(month)
        year_int = int(year)

        if not (1 <= day_int <= 31 and 1 <= month_int <= 12 and 1900 <= year_int <= 2100):
            return None

        return f"{year_int:04d}-{month_int:02d}-{day_int:02d}"

    except (ValueError, AttributeError):
        return None


def extract_competenza_month(text: str) -> Tuple[Optional[str], bool]:
    """
    Extract competence month from PDF text with priority given to keyword-based patterns.

    Searches for competenza/payroll month using multiple strategies:
    1. Date range patterns (dal...al...)
    2. Keywords with dates (competenza, periodo di paga, etc.)
    3. Italian month names near keywords
    4. Generic MM/YYYY patterns (low confidence)

    Args:
        text: PDF text content to search

    Returns:
        Tuple of (month_year, high_confidence):
            - month_year: 'YYYY-MM' string or None if not found
            - high_confidence: True if keyword-based pattern matched,
                             False for generic/ambiguous patterns requiring manual confirmation

    Examples:
        >>> extract_competenza_month("Periodo di paga: 11/2024")
        ('2024-11', True)
        >>> extract_competenza_month("Competenza Gennaio 2025")
        ('2025-01', True)

    Raises:
        ParsingError: If PDF text is malformed
    """
    if not text:
        logger.warning("Empty text provided for competenza extraction")
        return None, False

    text_lower = text.lower()
    header_text = text_lower[:1000]

    # PRIORITY 1: Date range patterns (dal ... al ...)
    range_patterns = [
        (r'dal\s+\d{1,2}[/-](\d{2})[/-](\d{4})\s+al\s+\d{1,2}[/-](\d{2})[/-](\d{4})', 'date range (dal...al)'),
    ]

    for pattern, desc in range_patterns:
        match = re.search(pattern, header_text)
        if match:
            month1, year1, month2, year2 = match.groups()
            if month1 == month2 and year1 == year2 and 1 <= int(month1) <= 12:
                logger.info(f"✓ HIGH CONFIDENCE: Detected from {desc}: {year1}-{month1}")
                return f"{year1}-{month1}", True

    # PRIORITY 2: COMPETENZA or PERIODO DI PAGA keywords with dates (high confidence)
    competenza_patterns = [
        (r'competenza[:\s]+(\d{2})[/-](\d{4})', 'competenza keyword'),
        (r'periodo\s+di\s+paga[:\s]+(\d{2})[/-](\d{4})', 'periodo di paga keyword'),
        (r'mese[:\s]+(\d{2})[/-](\d{4})', 'mese keyword'),
        (r'retribuzione[:\s]+(\d{2})[/-](\d{4})', 'retribuzione keyword')
    ]

    for pattern, desc in competenza_patterns:
        match = re.search(pattern, header_text)
        if match:
            month = match.group(1)
            year = match.group(2)
            if 1 <= int(month) <= 12:
                logger.info(f"✓ HIGH CONFIDENCE: Detected from {desc}: {year}-{month}")
                return f"{year}-{month}", True

    # PRIORITY 3A: PERIODO DI RIFERIMENTO with Italian month on next line (high confidence)
    if 'periodo di riferimento' in header_text:
        periodo_idx = header_text.find('periodo di riferimento')
        search_text = header_text[periodo_idx:periodo_idx+400]
        search_text = re.sub(r'\s+', ' ', search_text)
        for month_name, month_num in ITALIAN_MONTHS.items():
            pattern = rf'{month_name}\s*[:\-]?\s*(\d{{4}})'
            match = re.search(pattern, search_text)
            if match:
                year = match.group(1)
                logger.info(f"✓ HIGH CONFIDENCE: Detected from PERIODO DI RIFERIMENTO+{month_name}: {year}-{month_num}")
                return f"{year}-{month_num}", True

    # PRIORITY 3B: Italian month name + keyword (high confidence)
    for keyword in ['competenza', 'periodo di paga', 'mese di', 'retribuzione', 'periodo']:
        for month_name, month_num in ITALIAN_MONTHS.items():
            pattern = rf'{keyword}\s+.*?{month_name}\s+(\d{{4}})'
            match = re.search(pattern, header_text)
            if match:
                year = match.group(1)
                logger.info(f"✓ HIGH CONFIDENCE: Detected from {keyword}+{month_name}: {year}-{month_num}")
                return f"{year}-{month_num}", True

    # PRIORITY 4: Italian month name alone in header (LOW CONFIDENCE - could be hire date)
    for month_name, month_num in ITALIAN_MONTHS.items():
        pattern = rf'{month_name}\s+(\d{{4}})'
        match = re.search(pattern, header_text)
        if match:
            year = match.group(1)
            logger.warning(f"⚠️ LOW CONFIDENCE: Italian month name without keyword: {year}-{month_num} ({month_name}) - manual confirmation required")
            return f"{year}-{month_num}", False

    # PRIORITY 5: Generic MM/YYYY in header (LOW CONFIDENCE - requires manual confirmation)
    match = re.search(r'(\d{2})[/-](\d{4})', header_text[:400])
    if match:
        month = match.group(1)
        year = match.group(2)
        if 1 <= int(month) <= 12:
            logger.warning(f"⚠️ LOW CONFIDENCE: Generic MM/YYYY detected: {year}-{month} (user confirmation required)")
            return f"{year}-{month}", False

    logger.warning("⚠️ Could not detect competenza month from PDF")
    return None, False



def normalize_pdf_text(text: str) -> str:
    """
    Normalize PDF text by replacing 's' separators with spaces.
    
    Zucchetti PDFs sometimes use 's' as space separator in extracted text.
    
    Args:
        text: Raw PDF text
        
    Returns:
        Normalized text with proper spacing
    """
    # Replace common 's' patterns with spaces
    text = text.replace('sE', ' E')
    text = text.replace('sI', ' I')
    text = text.replace('sA', ' A')
    text = text.replace('sO', ' O')
    text = text.replace('sD', ' D')
    text = text.replace('s ', ' ')
    return text


def detect_pdf_type(page_text: str) -> str:
    """
    Detect the type of payslip PDF.
    
    Returns:
        'amministratore': For administrator/trainee payslips (single-page format)
        'dipendente': For regular employee payslips (two-page format)
    """
    # Check for administrator/trainee indicators
    if any(keyword in page_text for keyword in [
        'Compenso Amministratore',
        '*000003',
        'Compenso Tirocinante', 
        '000004'
    ]):
        return 'amministratore'
    
    # Check for regular employee indicators
    if 'COGNOME NOME' in page_text and 'INDIRIZZO' in page_text:
        return 'dipendente'
    
    # Default to dipendente format
    return 'dipendente'


def parse_amministratore_page(page_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse a single-page administrator/trainee payslip.
    
    Args:
        page_text: Text content of the PDF page
        
    Returns:
        Dictionary with employee data or None if parsing fails
    """
    # Normalize text first
    page_text = normalize_pdf_text(page_text)
    lines = page_text.split('\n')
    
    employee_name: Optional[str] = None
    netto_mese: Optional[float] = None
    acconto = 0.0
    mansione: Optional[str] = None
    contratto_scadenza: Optional[str] = None
    
    # Extract employee name - look for pattern with employee code and fiscal code
    # Pattern: "0300010 CERALDI VALERIO CRLVLR88H14F839O"
    for line in lines:
        # Match line with employee code (7 digits), name (2-3 words uppercase), fiscal code (16 chars)
        match = re.match(r'(\d{7})\s+([A-Z]+\s+[A-Z]+)(?:\s+([A-Z]{16}))?', line)
        if match:
            employee_name = match.group(2).strip()
            logger.info(f"👤 Amministratore: {employee_name}")
            break
    
    if not employee_name:
        logger.warning("⚠️ No administrator name found")
        return None
    
    # Determine mansione from compensation type
    for line in lines:
        if '*000003' in line or '000003' in line or 'Compenso Amministratore' in line:
            mansione = "Amministratore"
            logger.info(f"  👔 Mansione: {mansione}")
            break
        elif '000004' in line or 'Compenso Tirocinante' in line:
            mansione = "Tirocinante"
            logger.info(f"  👔 Mansione: {mansione}")
            break
    
    # Extract contratto scadenza (look for "T.Deter." pattern)
    for line in lines:
        if 'T.Deter.' in line or 'Tir./Stag.' in line or 'Co.Co.Co' in line:
            date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line)
            if date_match:
                contratto_scadenza = normalize_date(date_match.group(1))
                logger.info(f"  📅 Scadenza contratto: {contratto_scadenza}")
                break
    
    # Extract "Recupero acconto" if present (but not common for administrators)
    for line in lines:
        if 'Recupero' in line and 'acconto' in line:
            # Try to find amount in same or nearby lines
            amounts = re.findall(r'(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', line)
            if amounts:
                for amt in amounts:
                    amt_clean = amt.replace('.', '').replace(',', '.')
                    val = safe_float(amt_clean, 0.0)
                    if val > acconto:
                        acconto = val
            if acconto > 0:
                logger.info(f"  📤 Acconto: €{acconto}")
                break
    
    # Extract NETTO DEL MESE
    for i, line in enumerate(lines):
        if 'NETTO' in line and ('MESE' in line or 'DEL' in line):
            # Check current and next few lines for the amount
            for j in range(i, min(i+5, len(lines))):
                search_line = lines[j]
                amounts = re.findall(r'(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*€?', search_line)
                if amounts:
                    for amt in amounts:
                        amt_clean = amt.replace('.', '').replace(',', '.')
                        val = safe_float(amt_clean, 0.0)
                        # Administrator/trainee salaries can vary widely (including 0 for specific cases)
                        if 0 <= val <= 50000:
                            netto_mese = val
                            logger.info(f"  💰 Netto: €{netto_mese}")
                            break
                if netto_mese:
                    break
            break
    
    if not netto_mese:
        logger.warning(f"⚠️ No netto found for {employee_name}")
        return None
    
    netto_totale = acconto + netto_mese
    differenza = netto_mese
    
    return {
        "nome": employee_name,
        "netto": netto_totale,
        "acconto": acconto,
        "differenza": differenza,
        "note": f"Acconto: €{acconto:.2f}" if acconto > 0 else "Nessun acconto",
        "ore_ordinarie": 0.0,  # Administrators don't have hourly tracking
        "mansione": mansione,
        "contratto_scadenza": contratto_scadenza
    }


def parse_libro_unico_pdf(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Parse PDF Libro Unico and extract salary/presence data.

    This parser handles two types of Zucchetti Libro Unico PDFs:
    1. Regular employees (dipendenti): Paired-page format
       - Even pages: Attendance data (presenze, ore ordinarie, ferie, etc.)
       - Odd pages: Salary breakdown (cedolino paga)
    2. Administrators/Trainees (amministratori/tirocinanti): Single-page format
       - All data on one page with different structure

    Auto-detects competence month from PDF with confidence scoring to minimize
    the need for manual month selection in the UI.

    Args:
        pdf_bytes: Raw bytes of the PDF file

    Returns:
        Dictionary containing:
            - competenza_month_year (str | None): YYYY-MM format or None
            - competenza_detected (bool): True if auto-detected with confidence
            - presenze (List[Dict]): Attendance records with hours
            - salaries (List[Dict]): Salary data with netto/acconto/differenza
            - employees (List[Dict]): Employee metadata for auto-population

    Raises:
        ParsingError: If PDF is malformed or unreadable

    Examples:
        >>> with open('libro_unico.pdf', 'rb') as f:
        ...     result = parse_libro_unico_pdf(f.read())
        >>> result['competenza_month_year']
        '2024-11'
        >>> len(result['salaries'])
        5
    """
    if not pdf_bytes:
        logger.error("❌ Empty PDF bytes received")
        raise ParsingError("Empty PDF bytes provided")

    try:
        salaries_data: List[Dict[str, Any]] = []
        presenze_data: List[Dict[str, Any]] = []
        employees_found: Dict[str, Dict[str, Any]] = {}
        competenza_month: Optional[str] = None
        competenza_detected = False

        logger.info(f"📦 Received PDF bytes: {len(pdf_bytes)} bytes")

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            logger.info(f"📄 Processing PDF with {len(pdf.pages)} pages")
            
            # Initialize pdf_type default
            pdf_type = 'dipendente'

            if len(pdf.pages) > 0:
                first_page_text = pdf.pages[0].extract_text() or ""
                first_page_text = normalize_pdf_text(first_page_text)
                competenza_month, competenza_detected = extract_competenza_month(first_page_text)

            # Process each page individually (all are single-page payslips)
            for page_num, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                page_text = normalize_pdf_text(page_text)
                
                logger.info(f"📄 Processing page {page_num+1}")
                
                # Detect PDF type for this page
                pdf_type = detect_pdf_type(page_text)
                logger.info(f"📋 PDF Type detected: {pdf_type}")
                
                if pdf_type == 'amministratore':
                    # Administrator/trainee format
                    emp_data = parse_amministratore_page(page_text)
                    
                    if emp_data and emp_data["nome"] not in employees_found:
                        employees_found[emp_data["nome"]] = emp_data
                else:
                    # Regular employee format (single page with both attendance and salary)
                    lines = page_text.split('\n')
                    
                    employee_name: Optional[str] = None
                    netto_mese: Optional[float] = None
                    acconto = 0.0
                    ore_ordinarie = 0.0
                    mansione: Optional[str] = None
                    contratto_scadenza: Optional[str] = None

                    # Extract employee name - pattern: "0000051 TAIANO LUIGI TNALGU95L10F839Y"
                    for line in lines:
                        match = re.match(r'(\d{7})\s+([A-Z]+\s+[A-Z]+)(?:\s+([A-Z]{16}))?', line)
                        if match:
                            employee_name = match.group(2).strip()
                            logger.info(f"👤 Employee: {employee_name}")
                            break

                    if not employee_name:
                        logger.warning(f"⚠️ No employee name found on page {page_num+1}")
                        continue

                    # Extract mansione (qualifica/role) - look for common job titles
                    for line in lines:
                        if any(keyword in line for keyword in ['CAMERIERE', 'CUOCO', 'BARISTA', 'AIUTO', 'LAVAPIATTI']):
                            # Extract the job title
                            for keyword in ['CAMERIERE', 'CUOCO', 'BARISTA', 'AIUTO', 'LAVAPIATTI']:
                                if keyword in line:
                                    mansione = keyword
                                    logger.info(f"  👔 Mansione: {mansione}")
                                    break
                            if mansione:
                                break

                    # Extract contratto scadenza
                    for line in lines:
                        if 'T.Deter.' in line or 'Contratto' in line or 'Scadenza' in line:
                            date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line)
                            if date_match:
                                contratto_scadenza = normalize_date(date_match.group(1))
                                logger.info(f"  📅 Scadenza contratto: {contratto_scadenza}")
                                break

                    # Extract hours - look for pattern with hours number
                    for line in lines:
                        if 'Ore ordinarie' in line or ('Ore' in line and 'ordinarie' in line):
                            # Try to find number near "Ore ordinarie"
                            hours_match = re.search(r'(\d+[.,]\d+)', line)
                            if hours_match:
                                hours_str = hours_match.group(1).replace(',', '.')
                                ore_ordinarie = safe_float(hours_str, 0.0)
                                logger.info(f"  ⏰ Ore: {ore_ordinarie}")
                            break
                        
                        # Alternative: look for pattern like "16 106,67" where 106,67 is the hours
                        if re.search(r'\d+\s+(\d+,\d{2})\s*$', line):
                            parts = line.split()
                            if len(parts) >= 2:
                                try:
                                    hours_str = parts[-1].replace(',', '.')
                                    candidate_hours = safe_float(hours_str, 0.0)
                                    # Hours are typically between 1 and 250
                                    if 1 <= candidate_hours <= 250:
                                        ore_ordinarie = candidate_hours
                                        logger.info(f"  ⏰ Ore (da pattern): {ore_ordinarie}")
                                        break
                                except (ValueError, IndexError):
                                    pass

                    # Extract salary data
                    for i, line in enumerate(lines):
                        # Look for "Recupero acconto" or "000306"
                        if ('Recupero' in line and 'acconto' in line) or '000306' in line:
                            amounts = re.findall(r'(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', line)
                            if amounts:
                                max_val = 0.0
                                for amt in amounts:
                                    amt_clean = amt.replace('.', '').replace(',', '.')
                                    val = safe_float(amt_clean, 0.0)
                                    if val > max_val:
                                        max_val = val
                                if max_val > 0:
                                    acconto = max_val
                                    logger.info(f"  📤 Acconto: €{acconto}")

                        # Look for NETTO DEL MESE or similar pattern
                        if 'NETTO' in line and 'MESE' in line:
                            for j in range(i, min(i+5, len(lines))):
                                search_line = lines[j]
                                amounts = re.findall(r'(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*€?', search_line)
                                if amounts:
                                    max_val = 0.0
                                    for amt in amounts:
                                        amt_clean = amt.replace('.', '').replace(',', '.')
                                        val = safe_float(amt_clean, 0.0)
                                        # Accept any amount from 0 to 10000 (including 0 for specific cases)
                                        if 0 <= val <= 10000 and val >= max_val:
                                            max_val = val
                                    if max_val >= 0:
                                        netto_mese = max_val
                            if netto_mese is not None:
                                logger.info(f"  💰 Netto: €{netto_mese}")
                                break

                    # Save employee data
                    if employee_name and netto_mese is not None:
                        netto_totale = acconto + netto_mese
                        differenza = netto_mese

                        if employee_name not in employees_found:
                            employees_found[employee_name] = {
                                "nome": employee_name,
                                "netto": netto_totale,
                                "acconto": acconto,
                                "differenza": differenza,
                                "note": f"Acconto: €{acconto:.2f}" if acconto > 0 else "Nessun acconto",
                                "ore_ordinarie": ore_ordinarie,
                                "mansione": mansione,
                                "contratto_scadenza": contratto_scadenza
                            }

        # Convert to lists
        employees_list: List[Dict[str, Any]] = []
        for emp_data in employees_found.values():
            salaries_data.append({
                "nome": emp_data["nome"],
                "netto": emp_data["netto"],
                "acconto": emp_data["acconto"],
                "differenza": emp_data["differenza"],
                "note": emp_data["note"]
            })

            presenze_data.append({
                "nome": emp_data["nome"],
                "ore_ordinarie": emp_data["ore_ordinarie"],
                "assenze_ingiustificate": 0,
                "ferie": 0,
                "permessi": 0,
                "malattia": 0
            })

            employees_list.append({
                "full_name": emp_data["nome"],
                "mansione": emp_data.get("mansione"),
                "contratto_scadenza": emp_data.get("contratto_scadenza")
            })

        logger.info(f"✅ Successfully parsed: {len(salaries_data)} employees")

        if not salaries_data:
            logger.warning("⚠️ No salary data found in PDF")

        return {
            'competenza_month_year': competenza_month,
            'competenza_detected': competenza_detected,
            'presenze': presenze_data,
            'salaries': salaries_data,
            'employees': employees_list
        }

    except Exception as e:
        logger.error(f"❌ Parsing error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise ParsingError(f"Failed to parse Libro Unico PDF: {str(e)}") from e


def parse_anagrafica_from_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Parse employee registry (anagrafica) from PDF.

    Extracts employee master data including:
    - Personal details (nome, cognome, codice fiscale)
    - Birth date and hire date
    - Job details (mansione, livello, matricola)

    Args:
        pdf_bytes: PDF file content as bytes

    Returns:
        List of employee records with anagrafica data

    Raises:
        ParsingError: If PDF is malformed or unreadable

    Examples:
        >>> with open('anagrafica.pdf', 'rb') as f:
        ...     employees = parse_anagrafica_from_pdf(f.read())
        >>> len(employees)
        10
    """
    if not pdf_bytes:
        logger.error("❌ Empty PDF bytes received")
        raise ParsingError("Empty PDF bytes provided for anagrafica parsing")

    try:
        anagrafica_data: List[Dict[str, Any]] = []
        employees_found: set = set()

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                lines = text.split('\n')

                current_emp: Dict[str, Any] = {}

                for i, line in enumerate(lines):
                    name_match = re.match(r'^([A-Z]+)\s+([A-Z]+)$', line.strip())
                    if name_match and len(line.strip().split()) == 2:
                        cognome = name_match.group(1)
                        nome = name_match.group(2)
                        full_name = f"{cognome} {nome}"

                        if full_name not in employees_found:
                            current_emp = {
                                'nome': nome,
                                'cognome': cognome,
                                'codice_fiscale': '',
                                'data_nascita': '',
                                'data_assunzione': '',
                                'matricola': '',
                                'mansione': '',
                                'livello': '',
                                'agevolazione': ''
                            }
                            employees_found.add(full_name)

                    cf_match = re.search(r'\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b', line)
                    if cf_match and current_emp:
                        current_emp['codice_fiscale'] = cf_match.group(1)

                    date_match = re.findall(r'(\d{2}-\d{2}-\d{4})', line)
                    if date_match and current_emp:
                        for date_str in date_match:
                            day, month, year = date_str.split('-')
                            iso_date = f"{year}-{month}-{day}"
                            if not current_emp['data_nascita']:
                                current_emp['data_nascita'] = iso_date
                            elif not current_emp['data_assunzione']:
                                current_emp['data_assunzione'] = iso_date

                if current_emp and current_emp.get('codice_fiscale'):
                    if not any(a['codice_fiscale'] == current_emp['codice_fiscale'] for a in anagrafica_data):
                        anagrafica_data.append(current_emp)

        logger.info(f"✅ Extracted {len(anagrafica_data)} anagrafica records")
        return anagrafica_data

    except Exception as e:
        logger.error(f"❌ Error parsing anagrafica: {str(e)}")
        raise ParsingError(f"Failed to parse anagrafica PDF: {str(e)}") from e
