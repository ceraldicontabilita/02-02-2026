"""
Parser per file XML Corrispettivi (DatiCorrispettivi)
Formato: COR10 - Registratore Telematico
"""
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Namespace XML per corrispettivi
NS = {'n1': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/corrispettivi/dati/v1.0'}


def parse_corrispettivi_xml(xml_content: str) -> Dict:
    """
    Parse XML Corrispettivi e estrae dati rilevanti
    
    Args:
        xml_content: Contenuto del file XML
        
    Returns:
        Dict con dati estratti:
        {
            'id_invio': str,
            'matricola': str,
            'data_rilevazione': datetime,
            'data_trasmissione': datetime,
            'pagato_contanti': float,
            'pagato_elettronico': float,
            'numero_documenti': int,
            'totale': float,
            'riepiloghi_iva': List[Dict]
        }
    """
    try:
        root = ET.fromstring(xml_content)
        
        # Estrai dati trasmissione
        trasmissione = root.find('n1:Trasmissione', NS)
        progressivo = trasmissione.find('n1:Progressivo', NS).text if trasmissione else None
        
        dispositivo = trasmissione.find('n1:Dispositivo', NS) if trasmissione else None
        matricola = dispositivo.find('n1:IdDispositivo', NS).text if dispositivo else None
        
        data_ora_trasmissione_str = trasmissione.find('n1:DataOraTrasmissione', NS).text if trasmissione else None
        data_trasmissione = parse_datetime(data_ora_trasmissione_str) if data_ora_trasmissione_str else None
        
        # Estrai data rilevazione
        data_ora_rilevazione_str = root.find('n1:DataOraRilevazione', NS).text
        data_rilevazione = parse_datetime(data_ora_rilevazione_str) if data_ora_rilevazione_str else None
        
        # Estrai dati RT
        dati_rt = root.find('n1:DatiRT', NS)
        
        # Estrai riepiloghi IVA
        riepiloghi_iva = []
        for riepilogo in dati_rt.findall('n1:Riepilogo', NS):
            iva_elem = riepilogo.find('n1:IVA', NS)
            natura_elem = riepilogo.find('n1:Natura', NS)
            
            riepilogo_data = {
                'aliquota_iva': float(iva_elem.find('n1:AliquotaIVA', NS).text) if iva_elem is not None and iva_elem.find('n1:AliquotaIVA', NS) is not None else None,
                'imposta': float(iva_elem.find('n1:Imposta', NS).text) if iva_elem is not None and iva_elem.find('n1:Imposta', NS) is not None else 0.0,
                'natura': natura_elem.text if natura_elem is not None else None,
                'ammontare': float(riepilogo.find('n1:Ammontare', NS).text) if riepilogo.find('n1:Ammontare', NS) is not None else 0.0,
                'importo_parziale': float(riepilogo.find('n1:ImportoParziale', NS).text) if riepilogo.find('n1:ImportoParziale', NS) is not None else 0.0
            }
            riepiloghi_iva.append(riepilogo_data)
        
        # Estrai totali
        totali = dati_rt.find('n1:Totali', NS)
        numero_doc = int(totali.find('n1:NumeroDocCommerciali', NS).text) if totali and totali.find('n1:NumeroDocCommerciali', NS) is not None else 0
        pagato_contanti = float(totali.find('n1:PagatoContanti', NS).text) if totali and totali.find('n1:PagatoContanti', NS) is not None else 0.0
        pagato_elettronico = float(totali.find('n1:PagatoElettronico', NS).text) if totali and totali.find('n1:PagatoElettronico', NS) is not None else 0.0
        
        totale = pagato_contanti + pagato_elettronico
        
        result = {
            'id_invio': progressivo,
            'matricola': matricola,
            'data_rilevazione': data_rilevazione,
            'data_trasmissione': data_trasmissione,
            'pagato_contanti': pagato_contanti,
            'pagato_elettronico': pagato_elettronico,
            'numero_documenti': numero_doc,
            'totale': totale,
            'riepiloghi_iva': riepiloghi_iva
        }
        
        logger.info(f"✅ Corrispettivi parsed: {matricola} - {data_rilevazione} - Tot: €{totale:.2f}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Errore parsing corrispettivi XML: {str(e)}")
        raise ValueError(f"Formato XML corrispettivi non valido: {str(e)}")


def parse_datetime(dt_str: str) -> datetime:
    """Parse datetime string da XML (formato ISO con timezone)"""
    try:
        # Rimuovi timezone per semplificare
        if '+' in dt_str:
            dt_str = dt_str.split('+')[0]
        elif 'Z' in dt_str:
            dt_str = dt_str.replace('Z', '')
        
        return datetime.fromisoformat(dt_str)
    except:
        # Fallback per altri formati
        return datetime.now()


def extract_corrispettivi_from_zip(zip_file_path: str) -> List[Dict]:
    """
    Estrae e parsa tutti i file XML corrispettivi da uno ZIP
    
    Args:
        zip_file_path: Path del file ZIP
        
    Returns:
        Lista di dict con dati corrispettivi estratti
    """
    import zipfile
    
    results = []
    
    try:
        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            for file_name in zip_ref.namelist():
                if file_name.lower().endswith('.xml'):
                    with zip_ref.open(file_name) as xml_file:
                        xml_content = xml_file.read().decode('utf-8')
                        
                        # Verifica se è un file corrispettivi
                        if 'DatiCorrispettivi' in xml_content:
                            try:
                                parsed = parse_corrispettivi_xml(xml_content)
                                results.append(parsed)
                            except Exception as e:
                                logger.warning(f"⚠️ Skip {file_name}: {str(e)}")
        
        logger.info(f"✅ Estratti {len(results)} corrispettivi da ZIP")
        return results
        
    except Exception as e:
        logger.error(f"❌ Errore lettura ZIP: {str(e)}")
        raise ValueError(f"Errore lettura file ZIP: {str(e)}")
