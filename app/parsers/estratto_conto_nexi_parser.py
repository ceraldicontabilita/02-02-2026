"""
Parser per Estratti Conto Carta di Credito Nexi/Banco BPM
Estrae le transazioni dai PDF degli estratti conto Nexi.

Formato supportato:
- Estratti conto mensili Nexi con carta di credito Banco BPM
- Struttura: Data | Descrizione | Importo in Euro | Importo in altre valute | Cambio
"""
import fitz  # PyMuPDF
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from io import BytesIO

logger = logging.getLogger(__name__)


class EstrattoContoNexiParser:
    """Parser per estratti conto carta di credito Nexi/Banco BPM."""
    
    def __init__(self):
        self.transactions: List[Dict[str, Any]] = []
        self.metadata: Dict[str, Any] = {}
        
    def parse_pdf(self, pdf_content: bytes) -> Dict[str, Any]:
        """
        Parse un estratto conto Nexi da PDF.
        
        Args:
            pdf_content: Contenuto binario del file PDF
            
        Returns:
            Dizionario con metadata e lista transazioni
        """
        try:
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            
            doc.close()
            
            # Estrai metadata
            self._extract_metadata(full_text)
            
            # Estrai transazioni
            self._extract_transactions(full_text)
            
            return {
                "success": True,
                "tipo_documento": "estratto_conto_nexi",
                "metadata": self.metadata,
                "transazioni": self.transactions,
                "totale_transazioni": len(self.transactions),
                "totale_importo": sum(t.get("importo", 0) for t in self.transactions)
            }
            
        except Exception as e:
            logger.exception(f"Errore parsing estratto conto Nexi: {e}")
            return {
                "success": False,
                "error": str(e),
                "tipo_documento": "estratto_conto_nexi"
            }
    
    def _extract_metadata(self, text: str) -> None:
        """Estrae i metadata dall'estratto conto."""
        
        # Data estratto conto (es. "Milano, 31 Dicembre 2025")
        date_match = re.search(r'Milano,\s+(\d{1,2}\s+\w+\s+\d{4})', text)
        if date_match:
            self.metadata["data_estratto"] = date_match.group(1)
            # Converti in formato ISO
            try:
                mesi = {
                    "gennaio": "01", "febbraio": "02", "marzo": "03", "aprile": "04",
                    "maggio": "05", "giugno": "06", "luglio": "07", "agosto": "08",
                    "settembre": "09", "ottobre": "10", "novembre": "11", "dicembre": "12"
                }
                parts = date_match.group(1).lower().split()
                if len(parts) == 3:
                    giorno = parts[0].zfill(2)
                    mese = mesi.get(parts[1], "01")
                    anno = parts[2]
                    self.metadata["data_estratto_iso"] = f"{anno}-{mese}-{giorno}"
            except:
                pass
        
        # Numero carta (mascherato)
        card_match = re.search(r'\*{4}\s*\*{4}\s*\*{4}\s*(\d{4})', text)
        if card_match:
            self.metadata["numero_carta_ultime4"] = card_match.group(1)
            self.metadata["numero_carta_mascherato"] = f"**** **** **** {card_match.group(1)}"
        
        # Scadenza carta
        exp_match = re.search(r'SCADENZA\s+(\d{2}/\d{2})', text)
        if exp_match:
            self.metadata["scadenza_carta"] = exp_match.group(1)
        
        # Intestatario
        # Cerca "CERALDI GROUP S.R.L." o pattern simile prima dell'indirizzo
        intestatario_match = re.search(r'([A-Z\s\.]+(?:S\.R\.L\.?|S\.P\.A\.?|S\.N\.C\.?|S\.A\.S\.?))\s*\n', text)
        if intestatario_match:
            self.metadata["intestatario"] = intestatario_match.group(1).strip()
        
        # Totale spese del mese
        spese_match = re.search(r'QUESTO MESE HA SPESO[^\d]*(\d+[.,]\d{2})', text, re.IGNORECASE)
        if spese_match:
            self.metadata["totale_spese_mese"] = self._parse_amount(spese_match.group(1))
        
        # Totale addebito
        addebito_match = re.search(r'QUESTO MESE LE SARANNO ADDEBITATI[^\d]*(\d+[.,]\d{2})', text, re.IGNORECASE)
        if addebito_match:
            self.metadata["totale_addebito"] = self._parse_amount(addebito_match.group(1))
        
        # IBAN
        iban_match = re.search(r'(IT\d{2}[A-Z]\d{10}[A-Z0-9]{12})', text)
        if iban_match:
            self.metadata["iban"] = iban_match.group(1)
    
    def _extract_transactions(self, text: str) -> None:
        """Estrae le transazioni dall'estratto conto."""
        
        # Trova la sezione "DETTAGLIO DEI SUOI MOVIMENTI"
        dettaglio_start = text.find("DETTAGLIO DEI SUOI MOVIMENTI")
        if dettaglio_start == -1:
            # Prova varianti
            dettaglio_start = text.find("DETTAGLIO MOVIMENTI")
        
        if dettaglio_start == -1:
            logger.warning("Sezione dettaglio movimenti non trovata")
            return
        
        # Estrai solo la parte dopo l'inizio del dettaglio
        text_dettaglio = text[dettaglio_start:]
        
        # Pattern per le transazioni:
        # DD/MM/YY  Descrizione  Importo
        # Es: 01/12/25 Iba It Zx9925vv4 Luxembourg L 10,73
        
        # Trova tutte le righe che iniziano con una data
        lines = text_dettaglio.split('\n')
        
        current_transaction = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Pattern data: DD/MM/YY o DD/MM/YYYY
            date_pattern = r'^(\d{2}/\d{2}/\d{2,4})\s+'
            date_match = re.match(date_pattern, line)
            
            if date_match:
                # Nuova transazione
                if current_transaction:
                    self.transactions.append(current_transaction)
                
                data_str = date_match.group(1)
                rest = line[date_match.end():].strip()
                
                # Estrai importo dalla fine della riga
                # Può essere negativo (rimborsi) o positivo
                amount_pattern = r'(-?\s*\d+[.,]\d{2})\s*$'
                amount_match = re.search(amount_pattern, rest)
                
                if amount_match:
                    importo_str = amount_match.group(1)
                    descrizione = rest[:amount_match.start()].strip()
                    importo = self._parse_amount(importo_str)
                else:
                    # Potrebbe essere su più righe
                    descrizione = rest
                    importo = 0.0
                
                # Salta righe di totale
                if descrizione.upper().startswith("TOTALE"):
                    current_transaction = None
                    continue
                
                current_transaction = {
                    "data": self._parse_date(data_str),
                    "data_originale": data_str,
                    "descrizione": descrizione,
                    "importo": importo,
                    "tipo": "addebito" if importo >= 0 else "accredito",
                    "categoria": self._categorize_transaction(descrizione)
                }
            
            elif current_transaction and not line.startswith("TOTALE"):
                # Continuazione della descrizione precedente
                # Verifica se c'è un importo in questa riga
                amount_pattern = r'(-?\s*\d+[.,]\d{2})\s*$'
                amount_match = re.search(amount_pattern, line)
                
                if amount_match and current_transaction.get("importo", 0) == 0:
                    current_transaction["importo"] = self._parse_amount(amount_match.group(1))
                    current_transaction["tipo"] = "addebito" if current_transaction["importo"] >= 0 else "accredito"
                    extra_desc = line[:amount_match.start()].strip()
                    if extra_desc:
                        current_transaction["descrizione"] += " " + extra_desc
                elif not any(skip in line.upper() for skip in ["SERVIZIO CLIENTI", "BLOCCO CARTA", "INFORMAZIONI"]):
                    # Aggiungi alla descrizione se non è una riga di servizio
                    pass
        
        # Aggiungi l'ultima transazione
        if current_transaction:
            self.transactions.append(current_transaction)
        
        # Filtra transazioni valide (con importo)
        self.transactions = [t for t in self.transactions if t.get("importo", 0) != 0]
    
    def _parse_date(self, date_str: str) -> str:
        """Converte una data da DD/MM/YY a YYYY-MM-DD."""
        try:
            parts = date_str.split('/')
            if len(parts) == 3:
                day = parts[0].zfill(2)
                month = parts[1].zfill(2)
                year = parts[2]
                if len(year) == 2:
                    year = "20" + year if int(year) < 50 else "19" + year
                return f"{year}-{month}-{day}"
        except:
            pass
        return date_str
    
    def _parse_amount(self, amount_str: str) -> float:
        """Converte un importo stringa in float."""
        try:
            # Rimuovi spazi
            amount_str = amount_str.replace(' ', '')
            # Gestisci formato italiano (virgola decimale)
            amount_str = amount_str.replace('.', '').replace(',', '.')
            return float(amount_str)
        except:
            return 0.0
    
    def _categorize_transaction(self, descrizione: str) -> str:
        """Categorizza la transazione in base alla descrizione."""
        desc_upper = descrizione.upper()
        
        # Amazon
        if any(x in desc_upper for x in ["AMAZON", "AMZN", "AMZNBUSINESS"]):
            return "E-commerce Amazon"
        
        # PayPal / Servizi digitali
        if "PAYPAL" in desc_upper:
            if "SPOTIFY" in desc_upper:
                return "Abbonamento Spotify"
            elif "NETFLIX" in desc_upper:
                return "Abbonamento Netflix"
            return "PayPal"
        
        # Carburante
        if any(x in desc_upper for x in ["ESSO", "ENI", "Q8", "IP ", "SHELL", "TAMOIL", "TOTAL", "CARBURANTE", "BENZINA"]):
            return "Carburante"
        
        # Supermercati
        if any(x in desc_upper for x in ["COOP", "CONAD", "LIDL", "EUROSPIN", "MD ", "ALDI", "ESSELUNGA", "CARREFOUR"]):
            return "Supermercato"
        
        # Ristoranti
        if any(x in desc_upper for x in ["RISTORANTE", "PIZZERIA", "BAR ", "CAFFE", "MCDONALDS", "BURGER"]):
            return "Ristorazione"
        
        # Trasporti
        if any(x in desc_upper for x in ["TRENITALIA", "ITALO", "AUTOSTRADA", "TELEPASS"]):
            return "Trasporti"
        
        # Assicurazioni
        if any(x in desc_upper for x in ["ASSICURA", "UNIPOL", "GENERALI", "ALLIANZ", "AXA"]):
            return "Assicurazione"
        
        # Utenze
        if any(x in desc_upper for x in ["ENEL", "A2A", "EDISON", "TIM", "VODAFONE", "WIND", "FASTWEB"]):
            return "Utenze"
        
        # IBA (probabile bonifico internazionale)
        if "IBA IT" in desc_upper:
            return "Bonifico Internazionale"
        
        # Default
        return "Altro"


def parse_estratto_conto_nexi(pdf_content: bytes) -> Dict[str, Any]:
    """
    Funzione wrapper per il parsing di estratti conto Nexi.
    
    Args:
        pdf_content: Contenuto binario del file PDF
        
    Returns:
        Dizionario con metadata e lista transazioni
    """
    parser = EstrattoContoNexiParser()
    return parser.parse_pdf(pdf_content)


async def parse_estratto_conto_nexi_from_file(file_path: str) -> Dict[str, Any]:
    """
    Parse un estratto conto Nexi da un file.
    
    Args:
        file_path: Percorso del file PDF
        
    Returns:
        Dizionario con metadata e lista transazioni
    """
    with open(file_path, "rb") as f:
        return parse_estratto_conto_nexi(f.read())
