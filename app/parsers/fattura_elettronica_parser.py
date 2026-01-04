"""
Parser per Fatture Elettroniche Italiane (FatturaPA)
Supporta il formato XML FPR12 dell'Agenzia delle Entrate
"""
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

# Namespace per FatturaPA
NAMESPACES = {
    'p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
    'ds': 'http://www.w3.org/2000/09/xmldsig#'
}


def parse_fattura_xml(xml_content: str) -> Dict[str, Any]:
    """
    Parse una fattura elettronica XML italiana.
    
    Args:
        xml_content: Contenuto XML della fattura
        
    Returns:
        Dict con i dati della fattura estratti
    """
    try:
        # Rimuovi BOM se presente
        if xml_content.startswith('\ufeff'):
            xml_content = xml_content[1:]
        
        # Parse XML
        root = ET.fromstring(xml_content.encode('utf-8'))
        
        # Trova il namespace corretto
        ns = {}
        if root.tag.startswith('{'):
            namespace = root.tag.split('}')[0] + '}'
            ns['p'] = namespace[1:-1]
        
        # Estrai dati header
        header = root.find('.//FatturaElettronicaHeader', ns) or root.find('.//{%s}FatturaElettronicaHeader' % ns.get('p', ''))
        if header is None:
            # Prova senza namespace
            header = root.find('.//FatturaElettronicaHeader')
        
        # Estrai dati body
        body = root.find('.//FatturaElettronicaBody', ns) or root.find('.//{%s}FatturaElettronicaBody' % ns.get('p', ''))
        if body is None:
            body = root.find('.//FatturaElettronicaBody')
        
        # Funzione helper per trovare elementi
        def find_text(element, path, default=""):
            if element is None:
                return default
            # Prova con namespace
            el = element.find('.//' + path)
            if el is None:
                # Prova diverse varianti
                for prefix in ['', 'p:', '{http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2}']:
                    el = element.find('.//' + prefix + path)
                    if el is not None:
                        break
            return el.text if el is not None and el.text else default
        
        # Estrai dati fornitore (CedentePrestatore)
        fornitore = {
            "denominazione": find_text(header, "CedentePrestatore//Denominazione"),
            "partita_iva": find_text(header, "CedentePrestatore//IdCodice"),
            "codice_fiscale": find_text(header, "CedentePrestatore//CodiceFiscale"),
            "indirizzo": find_text(header, "CedentePrestatore//Sede//Indirizzo"),
            "cap": find_text(header, "CedentePrestatore//Sede//CAP"),
            "comune": find_text(header, "CedentePrestatore//Sede//Comune"),
            "provincia": find_text(header, "CedentePrestatore//Sede//Provincia"),
            "nazione": find_text(header, "CedentePrestatore//Sede//Nazione"),
            "telefono": find_text(header, "CedentePrestatore//Contatti//Telefono"),
            "email": find_text(header, "CedentePrestatore//Contatti//Email"),
        }
        
        # Estrai dati cliente (CessionarioCommittente)
        cliente = {
            "denominazione": find_text(header, "CessionarioCommittente//Denominazione"),
            "partita_iva": find_text(header, "CessionarioCommittente//IdCodice"),
            "codice_fiscale": find_text(header, "CessionarioCommittente//CodiceFiscale"),
            "indirizzo": find_text(header, "CessionarioCommittente//Sede//Indirizzo"),
            "cap": find_text(header, "CessionarioCommittente//Sede//CAP"),
            "comune": find_text(header, "CessionarioCommittente//Sede//Comune"),
            "provincia": find_text(header, "CessionarioCommittente//Sede//Provincia"),
        }
        
        # Estrai dati generali documento
        numero_fattura = find_text(body, "DatiGenerali//DatiGeneraliDocumento//Numero")
        data_fattura = find_text(body, "DatiGenerali//DatiGeneraliDocumento//Data")
        tipo_documento = find_text(body, "DatiGenerali//DatiGeneraliDocumento//TipoDocumento")
        divisa = find_text(body, "DatiGenerali//DatiGeneraliDocumento//Divisa", "EUR")
        importo_totale = find_text(body, "DatiGenerali//DatiGeneraliDocumento//ImportoTotaleDocumento", "0")
        
        # Estrai causali
        causali = []
        for causale_el in (body.findall('.//Causale') if body is not None else []):
            if causale_el.text:
                causali.append(causale_el.text)
        
        # Estrai linee dettaglio
        linee = []
        dettaglio_linee = body.findall('.//DettaglioLinee') if body is not None else []
        for linea in dettaglio_linee:
            linea_data = {
                "numero_linea": find_text(linea, "NumeroLinea"),
                "descrizione": find_text(linea, "Descrizione"),
                "quantita": find_text(linea, "Quantita", "1"),
                "unita_misura": find_text(linea, "UnitaMisura"),
                "prezzo_unitario": find_text(linea, "PrezzoUnitario", "0"),
                "prezzo_totale": find_text(linea, "PrezzoTotale", "0"),
                "aliquota_iva": find_text(linea, "AliquotaIVA", "0"),
                "natura": find_text(linea, "Natura"),
            }
            linee.append(linea_data)
        
        # Estrai riepilogo IVA
        riepilogo_iva = []
        dati_riepilogo = body.findall('.//DatiRiepilogo') if body is not None else []
        for riepilogo in dati_riepilogo:
            riepilogo_data = {
                "aliquota_iva": find_text(riepilogo, "AliquotaIVA", "0"),
                "natura": find_text(riepilogo, "Natura"),
                "imponibile": find_text(riepilogo, "ImponibileImporto", "0"),
                "imposta": find_text(riepilogo, "Imposta", "0"),
                "riferimento_normativo": find_text(riepilogo, "RiferimentoNormativo"),
            }
            riepilogo_iva.append(riepilogo_data)
        
        # Estrai dati pagamento
        pagamento = {
            "condizioni": find_text(body, "DatiPagamento//CondizioniPagamento"),
            "modalita": find_text(body, "DatiPagamento//DettaglioPagamento//ModalitaPagamento"),
            "data_scadenza": find_text(body, "DatiPagamento//DettaglioPagamento//DataScadenzaPagamento"),
            "importo": find_text(body, "DatiPagamento//DettaglioPagamento//ImportoPagamento", "0"),
            "istituto_finanziario": find_text(body, "DatiPagamento//DettaglioPagamento//IstitutoFinanziario"),
            "iban": find_text(body, "DatiPagamento//DettaglioPagamento//IBAN"),
        }
        
        # Calcola totali
        try:
            total_amount = float(importo_totale) if importo_totale else 0
        except ValueError:
            total_amount = 0
        
        # Calcola imponibile e IVA totali
        imponibile_totale = sum(float(r.get("imponibile", 0)) for r in riepilogo_iva)
        iva_totale = sum(float(r.get("imposta", 0)) for r in riepilogo_iva)
        
        # Mappa tipo documento
        tipo_doc_map = {
            "TD01": "Fattura",
            "TD02": "Acconto/Anticipo su fattura",
            "TD03": "Acconto/Anticipo su parcella",
            "TD04": "Nota di Credito",
            "TD05": "Nota di Debito",
            "TD06": "Parcella",
            "TD16": "Integrazione fattura reverse charge interno",
            "TD17": "Integrazione/autofattura per acquisto servizi dall'estero",
            "TD18": "Integrazione per acquisto di beni intracomunitari",
            "TD19": "Integrazione/autofattura per acquisto di beni ex art.17 c.2 DPR 633/72",
            "TD20": "Autofattura per regolarizzazione e integrazione delle fatture",
            "TD21": "Autofattura per splafonamento",
            "TD22": "Estrazione beni da Deposito IVA",
            "TD23": "Estrazione beni da Deposito IVA con versamento dell'IVA",
            "TD24": "Fattura differita di cui all'art.21, comma 4, lett. a)",
            "TD25": "Fattura differita di cui all'art.21, comma 4, terzo periodo lett. b)",
            "TD26": "Cessione di beni ammortizzabili e per passaggi interni",
            "TD27": "Fattura per autoconsumo o per cessioni gratuite senza rivalsa",
        }
        
        result = {
            "invoice_number": numero_fattura,
            "invoice_date": data_fattura,
            "tipo_documento": tipo_documento,
            "tipo_documento_desc": tipo_doc_map.get(tipo_documento, tipo_documento),
            "divisa": divisa,
            "total_amount": total_amount,
            "imponibile": imponibile_totale,
            "iva": iva_totale,
            "causali": causali,
            "fornitore": fornitore,
            "cliente": cliente,
            "linee": linee,
            "riepilogo_iva": riepilogo_iva,
            "pagamento": pagamento,
            "supplier_name": fornitore.get("denominazione", ""),
            "supplier_vat": fornitore.get("partita_iva", ""),
            "raw_xml_parsed": True
        }
        
        return result
        
    except ET.ParseError as e:
        logger.error(f"Errore parsing XML: {e}")
        return {"error": f"Errore parsing XML: {str(e)}", "raw_xml_parsed": False}
    except Exception as e:
        logger.error(f"Errore generico parsing fattura: {e}")
        return {"error": f"Errore parsing: {str(e)}", "raw_xml_parsed": False}


def parse_multiple_fatture(xml_contents: List[str]) -> List[Dict[str, Any]]:
    """
    Parse multiple fatture XML.
    
    Args:
        xml_contents: Lista di contenuti XML
        
    Returns:
        Lista di dict con i dati delle fatture
    """
    results = []
    for i, xml_content in enumerate(xml_contents):
        try:
            result = parse_fattura_xml(xml_content)
            result["file_index"] = i
            results.append(result)
        except Exception as e:
            results.append({
                "error": str(e),
                "file_index": i,
                "raw_xml_parsed": False
            })
    return results
