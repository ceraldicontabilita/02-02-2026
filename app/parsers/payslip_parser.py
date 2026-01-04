"""
Parser per Buste Paga / LUL (Libro Unico del Lavoro)
Formato Zucchetti - Estrae: nome, codice fiscale, qualifica, netto, ore lavorate, contributi INPS
"""
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Importa pdfplumber
try:
    import pdfplumber
except ImportError:
    pdfplumber = None
    logger.warning("pdfplumber non installato - funzionalità PDF disabilitata")


def extract_payslips_from_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Estrae i dati delle buste paga da un PDF LUL Zucchetti.
    
    Args:
        pdf_path: Percorso del file PDF
        
    Returns:
        Lista di dict con i dati di ogni busta paga
    """
    if pdfplumber is None:
        return [{"error": "pdfplumber non installato"}]
    
    payslips = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            pages_text = []
            
            # Estrai testo da tutte le pagine
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                pages_text.append(page_text)
                full_text += page_text + "\n\n--- PAGE BREAK ---\n\n"
            
            # Dividi per dipendente - cerca pattern di intestazione
            # Pattern: numero matricola + nome cognome
            employee_sections = split_by_employee(full_text)
            
            for section in employee_sections:
                payslip = parse_employee_section(section)
                if payslip and payslip.get("codice_fiscale"):
                    payslips.append(payslip)
            
            # Se non ha trovato sezioni, prova parsing alternativo
            if not payslips:
                payslips = parse_full_text_fallback(full_text)
                
    except Exception as e:
        logger.error(f"Errore parsing PDF: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return [{"error": str(e)}]
    
    return payslips


def split_by_employee(text: str) -> List[str]:
    """Divide il testo in sezioni per dipendente."""
    sections = []
    
    # Pattern per identificare inizio di nuova busta paga
    # Cerca: matricola (7 cifre) seguita da nome
    patterns = [
        r'(\d{7}\s+[A-Z][A-Z\s]+\n)',  # 0000051 TAIANO LUIGI
        r'(COGNOME\s+NOME)',  # Intestazione generica
        r'(Cedolino\s+del)',  # Altro formato
    ]
    
    # Usa pattern più specifico per LUL Zucchetti
    # Cerca sezioni che iniziano con matricola
    matches = list(re.finditer(r'\b(\d{7})\s+([A-Z][A-Z]+\s+[A-Z][A-Z]+)', text))
    
    if matches:
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section = text[start:end]
            sections.append(section)
    else:
        # Fallback: divide per "PAGE BREAK" e cerca dati in ogni pagina
        pages = text.split("--- PAGE BREAK ---")
        for page in pages:
            if page.strip():
                sections.append(page)
    
    return sections


def parse_employee_section(section: str) -> Optional[Dict[str, Any]]:
    """Parsa una sezione di testo per estrarre i dati di un dipendente."""
    result = {
        "nome": "",
        "cognome": "",
        "nome_completo": "",
        "matricola": "",
        "codice_fiscale": "",
        "qualifica": "",
        "livello": "",
        "periodo": "",
        "mese": "",
        "anno": "",
        "ore_ordinarie": 0.0,
        "ore_straordinarie": 0.0,
        "ore_totali": 0.0,
        "retribuzione_lorda": 0.0,
        "retribuzione_netta": 0.0,
        "contributi_inps": 0.0,
        "irpef": 0.0,
        "tfr": 0.0,
    }
    
    lines = section.split('\n')
    
    # === MATRICOLA E NOME ===
    # Pattern: 0000051 TAIANO LUIGI
    matricola_match = re.search(r'\b(\d{7})\s+([A-Z][A-Z]+)\s+([A-Z][A-Z]+)', section)
    if matricola_match:
        result["matricola"] = matricola_match.group(1)
        result["cognome"] = matricola_match.group(2).strip()
        result["nome"] = matricola_match.group(3).strip()
        result["nome_completo"] = f"{result['cognome']} {result['nome']}"
    
    # === CODICE FISCALE ===
    # Pattern: 16 caratteri alfanumerici
    cf_match = re.search(r'\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b', section)
    if cf_match:
        result["codice_fiscale"] = cf_match.group(1)
    
    # === QUALIFICA ===
    # Cerca dopo "Qualifica" o in posizione tipica
    qualifica_patterns = [
        r'(?:Qualifica|QUALIFICA)[:\s]+([A-Z][A-Za-z\s]+)',
        r'\b(CAMERIERE|BARISTA|CASSIERA|CUOCO|AIUTO CUOCO|AIUTO BARISTA|LAVAPIATTI|PIZZAIOLO|RESPONSABILE|AMMINISTRATORE)\b',
    ]
    for pattern in qualifica_patterns:
        qual_match = re.search(pattern, section, re.IGNORECASE)
        if qual_match:
            result["qualifica"] = qual_match.group(1).strip().upper()
            break
    
    # === LIVELLO ===
    livello_match = re.search(r'(?:Livello|LIV\.?)[:\s]+(\d[°]?\s*[A-Za-z]*|\d+)', section, re.IGNORECASE)
    if livello_match:
        result["livello"] = livello_match.group(1).strip()
    
    # === PERIODO DI RIFERIMENTO ===
    # Pattern: Novembre 2025, 11/2025, etc.
    mesi = {
        'gennaio': '01', 'febbraio': '02', 'marzo': '03', 'aprile': '04',
        'maggio': '05', 'giugno': '06', 'luglio': '07', 'agosto': '08',
        'settembre': '09', 'ottobre': '10', 'novembre': '11', 'dicembre': '12'
    }
    
    for mese_nome, mese_num in mesi.items():
        if mese_nome.lower() in section.lower():
            result["mese"] = mese_num
            result["periodo"] = mese_nome.capitalize()
            # Cerca anno vicino
            anno_match = re.search(rf'{mese_nome}\s*(\d{{4}})', section, re.IGNORECASE)
            if anno_match:
                result["anno"] = anno_match.group(1)
                result["periodo"] = f"{mese_nome.capitalize()} {anno_match.group(1)}"
            break
    
    if not result["anno"]:
        anno_match = re.search(r'\b(202[0-9])\b', section)
        if anno_match:
            result["anno"] = anno_match.group(1)
    
    # === ORE LAVORATE ===
    # Pattern: Ore ordinarie, Ore straordinarie
    ore_ord_match = re.search(r'(?:ore\s*ordinarie|ORE\s*ORD\.?)[:\s]*(\d+[,.]?\d*)', section, re.IGNORECASE)
    if ore_ord_match:
        result["ore_ordinarie"] = parse_number(ore_ord_match.group(1))
    
    ore_str_match = re.search(r'(?:ore\s*straordinarie|ORE\s*STR\.?)[:\s]*(\d+[,.]?\d*)', section, re.IGNORECASE)
    if ore_str_match:
        result["ore_straordinarie"] = parse_number(ore_str_match.group(1))
    
    # Pattern alternativo: cerca "hm" (ore/minuti) - es. 166,40 hm
    hm_match = re.search(r'(\d+[,.]?\d*)\s*hm', section, re.IGNORECASE)
    if hm_match and result["ore_ordinarie"] == 0:
        result["ore_ordinarie"] = parse_number(hm_match.group(1))
    
    result["ore_totali"] = result["ore_ordinarie"] + result["ore_straordinarie"]
    
    # === RETRIBUZIONE NETTA ===
    # Pattern: NETTO DEL MESE, Netto a pagare, etc.
    netto_patterns = [
        r'(?:NETTO\s*DEL\s*MESE|Netto\s*a\s*pagare|NETTO)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})',
        r'(?:NETTO)[:\s]*(\d+[.,]\d{2})',
        r'(\d{1,3}(?:\.\d{3})*,\d{2})\s*€?\s*(?:NETTO|netto)',
    ]
    for pattern in netto_patterns:
        netto_match = re.search(pattern, section, re.IGNORECASE)
        if netto_match:
            result["retribuzione_netta"] = parse_number(netto_match.group(1))
            if result["retribuzione_netta"] > 0:
                break
    
    # === RETRIBUZIONE LORDA ===
    lordo_match = re.search(r'(?:LORDO|Imponibile)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})', section, re.IGNORECASE)
    if lordo_match:
        result["retribuzione_lorda"] = parse_number(lordo_match.group(1))
    
    # === CONTRIBUTI INPS ===
    # Pattern: Imp. INPS, Contributi INPS, C/INPS
    inps_patterns = [
        r'(?:Imp\.?\s*INPS|Contributi\s*INPS|C/INPS)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})',
        r'INPS[:\s]*(\d+[.,]\d{2})',
    ]
    for pattern in inps_patterns:
        inps_match = re.search(pattern, section, re.IGNORECASE)
        if inps_match:
            result["contributi_inps"] = parse_number(inps_match.group(1))
            if result["contributi_inps"] > 0:
                break
    
    # === IRPEF ===
    irpef_match = re.search(r'(?:IRPEF|Imp\.?\s*IRPEF)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})', section, re.IGNORECASE)
    if irpef_match:
        result["irpef"] = parse_number(irpef_match.group(1))
    
    # === TFR ===
    tfr_match = re.search(r'(?:TFR|T\.F\.R\.)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})', section, re.IGNORECASE)
    if tfr_match:
        result["tfr"] = parse_number(tfr_match.group(1))
    
    return result if result["codice_fiscale"] else None


def parse_full_text_fallback(text: str) -> List[Dict[str, Any]]:
    """Parsing di fallback che cerca tutti i codici fiscali e dati associati."""
    payslips = []
    
    # Trova tutti i codici fiscali
    cf_pattern = r'\b([A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z])\b'
    cf_matches = list(re.finditer(cf_pattern, text))
    
    for cf_match in cf_matches:
        cf = cf_match.group(1)
        
        # Evita duplicati
        if any(p.get("codice_fiscale") == cf for p in payslips):
            continue
        
        # Cerca contesto intorno al CF (500 caratteri prima e dopo)
        start = max(0, cf_match.start() - 500)
        end = min(len(text), cf_match.end() + 2000)
        context = text[start:end]
        
        # Cerca nome associato
        # Pattern: matricola + nome prima del CF
        nome_match = re.search(r'(\d{7})\s+([A-Z][A-Z]+)\s+([A-Z][A-Z]+)', context)
        nome_completo = ""
        matricola = ""
        if nome_match:
            matricola = nome_match.group(1)
            nome_completo = f"{nome_match.group(2)} {nome_match.group(3)}"
        
        # Cerca qualifica
        qualifica = ""
        qual_match = re.search(r'\b(CAMERIERE|BARISTA|CASSIERA|CUOCO|AIUTO\s*CUOCO|AIUTO\s*BARISTA|LAVAPIATTI|PIZZAIOLO)\b', context, re.IGNORECASE)
        if qual_match:
            qualifica = qual_match.group(1).upper()
        
        # Cerca periodo
        periodo = ""
        mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 
                'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
        for mese in mesi:
            if mese in context.lower():
                anno_match = re.search(rf'{mese}\s*(\d{{4}})', context, re.IGNORECASE)
                if anno_match:
                    periodo = f"{mese.capitalize()} {anno_match.group(1)}"
                else:
                    periodo = mese.capitalize()
                break
        
        # Cerca netto
        netto = 0.0
        netto_match = re.search(r'(?:NETTO\s*DEL\s*MESE|NETTO)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})', context, re.IGNORECASE)
        if netto_match:
            netto = parse_number(netto_match.group(1))
        
        # Cerca ore
        ore = 0.0
        ore_match = re.search(r'(\d+[,.]?\d*)\s*hm', context, re.IGNORECASE)
        if ore_match:
            ore = parse_number(ore_match.group(1))
        
        # Cerca INPS
        inps = 0.0
        inps_match = re.search(r'(?:Imp\.?\s*INPS)[:\s]*[€]?\s*(\d{1,3}(?:[.,]\d{3})*[,.]?\d{0,2})', context, re.IGNORECASE)
        if inps_match:
            inps = parse_number(inps_match.group(1))
        
        payslips.append({
            "nome": nome_completo.split()[-1] if nome_completo else "",
            "cognome": nome_completo.split()[0] if nome_completo else "",
            "nome_completo": nome_completo,
            "matricola": matricola,
            "codice_fiscale": cf,
            "qualifica": qualifica,
            "periodo": periodo,
            "ore_ordinarie": ore,
            "ore_totali": ore,
            "retribuzione_netta": netto,
            "contributi_inps": inps,
        })
    
    return payslips


def parse_number(s: str) -> float:
    """Converte stringa numerica italiana in float."""
    if not s:
        return 0.0
    try:
        # Rimuovi spazi e simboli valuta
        s = s.strip().replace('€', '').replace(' ', '')
        # Formato italiano: 1.234,56 -> 1234.56
        if ',' in s and '.' in s:
            # 1.234,56 -> rimuovi punti (migliaia), sostituisci virgola con punto
            s = s.replace('.', '').replace(',', '.')
        elif ',' in s:
            # 1234,56 -> sostituisci virgola con punto
            s = s.replace(',', '.')
        return float(s)
    except ValueError:
        return 0.0


def create_employee_from_payslip(payslip: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un record dipendente da una busta paga.
    Usato per popolare l'anagrafica dipendenti.
    """
    import uuid
    
    # Costruisci nome completo se non presente
    nome_completo = payslip.get("nome_completo", "")
    if not nome_completo:
        cognome = payslip.get("cognome", "")
        nome = payslip.get("nome", "")
        nome_completo = f"{cognome} {nome}".strip()
    
    return {
        "id": str(uuid.uuid4()),
        "nome_completo": nome_completo,
        "nome": payslip.get("nome", ""),
        "cognome": payslip.get("cognome", ""),
        "matricola": payslip.get("matricola", ""),
        "codice_fiscale": payslip.get("codice_fiscale", ""),
        "qualifica": payslip.get("qualifica", ""),
        "livello": payslip.get("livello", ""),
        "data_assunzione": "",
        "tipo_contratto": "Tempo Indeterminato",
        "ore_settimanali": 40,
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
        "source": "pdf_import",
    }
