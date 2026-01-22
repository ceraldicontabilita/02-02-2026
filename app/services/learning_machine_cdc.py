"""
Learning Machine - Classificazione Automatica Costi per Centro di Costo
Bar/Pasticceria ATECO 56.10.30

Questo modulo implementa la classificazione intelligente delle fatture
leggendo la DESCRIZIONE delle linee fattura per assegnare il centro di costo corretto.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import re
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# CENTRI DI COSTO - BAR/PASTICCERIA ATECO 56.10.30
# ============================================================================

CENTRI_COSTO = {
    # 1. MATERIE PRIME E MERCI
    "1.1_CAFFE_BEVANDE_CALDE": {
        "codice": "B6.1.1",
        "nome": "Caffè e bevande calde",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["caffè", "caffe", "coffee", "kimbo", "lavazza", "illy", "borbone", 
                    "cialde", "capsule", "tè", "the", "tisana", "orzo", "ginseng",
                    "cioccolata calda", "latte"]
    },
    "1.2_BEVANDE_FREDDE_ALCOLICI": {
        "codice": "B6.1.2",
        "nome": "Bevande fredde e alcolici",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["acqua minerale", "coca cola", "pepsi", "fanta", "sprite", 
                    "succo", "aranciata", "chinotto", "birra", "vino", "amaro",
                    "liquore", "grappa", "limoncello", "aperol", "campari", "spritz"]
    },
    "1.3_MATERIE_PRIME_PASTICCERIA": {
        "codice": "B6.1.3",
        "nome": "Materie prime pasticceria",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["farina", "zucchero", "uova", "burro", "lievito", "cacao",
                    "cioccolato", "vaniglia", "marmellata", "confettura", "crema",
                    "panna", "mascarpone", "ricotta", "mandorle", "nocciole",
                    "pistacchio", "canditi", "uvetta"]
    },
    "1.4_PRODOTTI_SEMIFINITI": {
        "codice": "B6.1.4",
        "nome": "Prodotti semifiniti pasticceria",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["base torta", "pan di spagna", "pasta frolla", "pasta sfoglia",
                    "crema pasticcera", "bagna", "glassa", "copertura"]
    },
    "1.5_GELATI_GRANITE": {
        "codice": "B6.1.5",
        "nome": "Gelati e granite",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["gelato", "granita", "sorbetto", "variegato", "cono", "coppetta"]
    },
    "1.6_PRODOTTI_CONFEZIONATI": {
        "codice": "B6.1.6",
        "nome": "Prodotti confezionati",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["snack", "patatine", "caramelle", "chewing gum", "cioccolatini",
                    "biscotti", "crackers", "grissini", "panino confezionato"]
    },
    
    # 2. UTENZE
    "2.1_ENERGIA_ELETTRICA": {
        "codice": "B7.2.1",
        "nome": "Energia elettrica",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["enel", "edison", "a2a", "eni gas e luce", "sorgenia", "hera",
                    "energia elettrica", "fornitura elettrica", "kwh"]
    },
    "2.2_GAS": {
        "codice": "B7.2.2",
        "nome": "Gas metano",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["gas metano", "fornitura gas", "smc", "eni gas", "italgas"]
    },
    "2.3_ACQUA": {
        "codice": "B7.2.3",
        "nome": "Acqua",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["acquedotto", "abc napoli", "acqua bene comune", "idrico", "fornitura acqua"]
    },
    "2.4_SMALTIMENTO_RIFIUTI": {
        "codice": "B7.2.4",
        "nome": "Smaltimento rifiuti",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["tari", "rifiuti", "smaltimento", "oli esausti", "raccolta differenziata"]
    },
    
    # 3. LOCAZIONE
    "3.1_AFFITTO_LOCALE": {
        "codice": "B8.3.1",
        "nome": "Affitto locale",
        "categoria_bilancio": "B8",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,  # Spesso esente
        "keywords": ["canone locazione", "affitto", "pigione", "locazione immobile"]
    },
    "3.2_CONDOMINIO": {
        "codice": "B8.3.2",
        "nome": "Spese condominiali",
        "categoria_bilancio": "B8",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,
        "keywords": ["condominio", "spese condominiali", "amministratore"]
    },
    
    # 4. PERSONALE (da cedolini + F24)
    "4.0_PERSONALE": {
        "codice": "B9",
        "nome": "Costo del personale",
        "categoria_bilancio": "B9",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 0.0,  # IRAP: cuneo fiscale
        "detraibilita_iva": None,  # Fuori campo
        "keywords": ["stipendio", "salario", "busta paga", "cedolino", "inps", "inail", "tfr"],
        "tributi_f24": ["1001", "1002", "1012", "1040", "1712", "1713", "DM10"]
    },
    
    # 5. MANUTENZIONE ATTREZZATURE
    "5.1_MANUTENZIONE_MACCHINA_CAFFE": {
        "codice": "B7.5.1",
        "nome": "Manutenzione macchina caffè",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["manutenzione macchina caffè", "assistenza macchina espresso", 
                    "riparazione macchina caffè", "revisione", "decalcificazione"]
    },
    "5.2_MANUTENZIONE_FORNI_FRIGO": {
        "codice": "B7.5.2",
        "nome": "Manutenzione forni e frigoriferi",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["manutenzione forno", "riparazione frigorifero", "vetrina refrigerata",
                    "cella frigorifera", "abbattitore", "congelatore"]
    },
    "5.3_PICCOLE_ATTREZZATURE": {
        "codice": "B7.5.3",
        "nome": "Piccole attrezzature",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["teglia", "stampo", "frusta", "spatola", "sac à poche", "tappetino",
                    "termometro", "bilancia", "dosatore"]
    },
    
    # 6. AUTO AZIENDALI
    "6.1_NOLEGGIO_AUTO": {
        "codice": "B8.6.1",
        "nome": "Noleggio auto",
        "categoria_bilancio": "B8",
        "deducibilita_ires": 0.20,  # 20% su max €3.615,20
        "deducibilita_ires_assegnata": 0.70,  # 70% se assegnata
        "deducibilita_irap": 0.20,
        "detraibilita_iva": 0.40,
        "limite_annuo": 3615.20,
        "keywords": ["noleggio auto", "arval", "leasys", "ald automotive", "leaseplan",
                    "alphabet", "locauto", "rent"]
    },
    "6.2_CARBURANTE": {
        "codice": "B7.6.2",
        "nome": "Carburante",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 0.20,
        "deducibilita_ires_assegnata": 0.70,
        "deducibilita_irap": 0.20,
        "detraibilita_iva": 0.40,
        "keywords": ["carburante", "benzina", "gasolio", "diesel", "esso", "q8", "ip",
                    "tamoil", "eni station", "total", "shell", "rifornimento"]
    },
    "6.3_ASSICURAZIONE_AUTO": {
        "codice": "B7.6.3",
        "nome": "Assicurazione auto",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 0.20,
        "deducibilita_irap": 0.20,
        "detraibilita_iva": 0.0,  # Esente
        "keywords": ["rca", "assicurazione auto", "polizza auto", "kasko"]
    },
    "6.4_MANUTENZIONE_AUTO": {
        "codice": "B7.6.4",
        "nome": "Manutenzione auto",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 0.20,
        "deducibilita_irap": 0.20,
        "detraibilita_iva": 0.40,
        "keywords": ["tagliando", "revisione auto", "cambio gomme", "pneumatici",
                    "riparazione auto", "officina", "carrozzeria"]
    },
    
    # 7. SERVIZI PROFESSIONALI
    "7.1_COMMERCIALISTA": {
        "codice": "B7.7.1",
        "nome": "Commercialista",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["commercialista", "studio commerciale", "consulenza fiscale",
                    "contabilità", "dichiarazione", "bilancio"]
    },
    "7.2_CONSULENTE_LAVORO": {
        "codice": "B7.7.2",
        "nome": "Consulente del lavoro",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["consulente lavoro", "paghe", "contributi", "elaborazione cedolini"]
    },
    "7.3_HACCP": {
        "codice": "B7.7.3",
        "nome": "Consulenza HACCP",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["haccp", "sicurezza alimentare", "igiene", "corso haccp",
                    "attestato alimentarista", "analisi microbiologiche"]
    },
    "7.4_MEDICO_COMPETENTE": {
        "codice": "B7.7.4",
        "nome": "Medico competente",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,  # Sanitarie esenti
        "keywords": ["medico competente", "sorveglianza sanitaria", "visita medica",
                    "idoneità lavorativa"]
    },
    
    # 8. IMPOSTE E TASSE
    "8.1_IVA_PERIODICA": {
        "codice": "B14.8.1",
        "nome": "IVA periodica",
        "categoria_bilancio": "B14",
        "deducibilita_ires": 0.0,  # L'IVA non è costo
        "deducibilita_irap": 0.0,
        "detraibilita_iva": None,
        "keywords": ["versamento iva", "liquidazione iva"],
        "tributi_f24": ["6001", "6002", "6003", "6004", "6005", "6006", 
                       "6007", "6008", "6009", "6010", "6011", "6012", "6099"]
    },
    "8.2_IMU": {
        "codice": "B14.8.2",
        "nome": "IMU",
        "categoria_bilancio": "B14",
        "deducibilita_ires": 0.5,  # 50% deducibile IRES dal 2023
        "deducibilita_irap": 0.0,
        "detraibilita_iva": None,
        "keywords": ["imu", "imposta municipale"],
        "tributi_f24": ["3918", "3930"]
    },
    "8.3_TARI": {
        "codice": "B14.8.3",
        "nome": "TARI",
        "categoria_bilancio": "B14",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": None,
        "keywords": ["tari", "tassa rifiuti"],
        "tributi_f24": ["3944"]
    },
    "8.4_DIRITTI_CCIAA": {
        "codice": "B14.8.4",
        "nome": "Diritti camerali",
        "categoria_bilancio": "B14",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": None,
        "keywords": ["camera commercio", "diritto annuale", "cciaa"]
    },
    "8.5_SIAE": {
        "codice": "B14.8.5",
        "nome": "SIAE",
        "categoria_bilancio": "B14",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["siae", "diritti autore", "musica ambiente"]
    },
    
    # 9. ASSICURAZIONI
    "9.1_RC_TERZI": {
        "codice": "B7.9.1",
        "nome": "RC verso terzi",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,  # Esente
        "keywords": ["responsabilità civile", "rc terzi", "polizza rc"]
    },
    "9.2_INCENDIO_FURTO": {
        "codice": "B7.9.2",
        "nome": "Assicurazione incendio e furto",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,
        "keywords": ["incendio", "furto", "polizza locale", "assicurazione attività"]
    },
    
    # 10. TELEFONIA
    "10.1_TELEFONIA": {
        "codice": "B7.10.1",
        "nome": "Telefonia e internet",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 0.80,
        "deducibilita_irap": 0.80,
        "detraibilita_iva": 0.50,
        "keywords": ["tim", "vodafone", "wind", "tre", "fastweb", "iliad",
                    "telefono", "cellulare", "internet", "fibra", "adsl"]
    },
    
    # 11. ONERI FINANZIARI
    "11.1_COMMISSIONI_POS": {
        "codice": "C17.11.1",
        "nome": "Commissioni POS",
        "categoria_bilancio": "C17",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,  # Esente
        "keywords": ["commissione pos", "nexi", "sumup", "satispay", "pagamento carta",
                    "transazione", "commissione carta"]
    },
    "11.2_SPESE_BANCARIE": {
        "codice": "C17.11.2",
        "nome": "Spese bancarie",
        "categoria_bilancio": "C17",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 0.0,
        "keywords": ["canone conto", "spese tenuta conto", "commissione bonifico",
                    "spese bancarie", "imposta bollo"]
    },
    "11.3_INTERESSI_MUTUO": {
        "codice": "C17.11.3",
        "nome": "Interessi passivi mutuo",
        "categoria_bilancio": "C17",
        "deducibilita_ires": None,  # Limite ROL 30%
        "deducibilita_irap": 1.0,
        "detraibilita_iva": None,
        "keywords": ["interessi passivi", "rata mutuo", "finanziamento", "prestito"],
        "limite_rol": 0.30
    },
    
    # 12. PULIZIA E IGIENE
    "12.1_PULIZIA_LOCALE": {
        "codice": "B7.12.1",
        "nome": "Pulizia locale",
        "categoria_bilancio": "B7",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["pulizia", "impresa pulizie", "sanificazione", "detergenti",
                    "detersivi", "prodotti pulizia"]
    },
    
    # 13. IMBALLAGGI
    "13.1_IMBALLAGGI": {
        "codice": "B6.13.1",
        "nome": "Imballaggi e confezioni",
        "categoria_bilancio": "B6",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": ["scatola", "vassoio", "sacchetto", "carta", "confezione regalo",
                    "nastro", "tovagliolo", "piattino", "bicchiere carta"]
    },
    
    # FALLBACK
    "99_ALTRI_COSTI": {
        "codice": "B14.99",
        "nome": "Altri costi non classificati",
        "categoria_bilancio": "B14",
        "deducibilita_ires": 1.0,
        "deducibilita_irap": 1.0,
        "detraibilita_iva": 1.0,
        "keywords": []
    }
}


# Mapping tributi F24 -> Centro di costo
TRIBUTI_F24_MAPPING = {
    # IVA mensile
    "6001": "8.1_IVA_PERIODICA", "6002": "8.1_IVA_PERIODICA", "6003": "8.1_IVA_PERIODICA",
    "6004": "8.1_IVA_PERIODICA", "6005": "8.1_IVA_PERIODICA", "6006": "8.1_IVA_PERIODICA",
    "6007": "8.1_IVA_PERIODICA", "6008": "8.1_IVA_PERIODICA", "6009": "8.1_IVA_PERIODICA",
    "6010": "8.1_IVA_PERIODICA", "6011": "8.1_IVA_PERIODICA", "6012": "8.1_IVA_PERIODICA",
    "6099": "8.1_IVA_PERIODICA",  # IVA annuale
    # Ritenute dipendenti
    "1001": "4.0_PERSONALE",  # Ritenute lavoro dipendente
    "1002": "4.0_PERSONALE",  # Ritenute lavoro dipendente TFR
    "1012": "4.0_PERSONALE",  # Ritenute su indennità
    "1040": "7.1_COMMERCIALISTA",  # Ritenute lavoro autonomo
    # INPS
    "DM10": "4.0_PERSONALE",  # INPS dipendenti
    # IMU
    "3918": "8.2_IMU",
    "3930": "8.2_IMU",
    # TARI
    "3944": "8.3_TARI",
}


def classifica_fattura_per_centro_costo(
    supplier_name: str,
    descrizione: str = "",
    linee_fattura: List[Dict] = None
) -> Tuple[str, Dict[str, Any], float]:
    """
    Classifica una fattura nel centro di costo corretto leggendo:
    1. Nome fornitore
    2. Descrizione generale
    3. Descrizione delle singole linee fattura
    
    Returns:
        Tuple[centro_costo_id, config_centro, confidence_score]
    """
    # Costruisci il testo da analizzare
    testo_completo = f"{supplier_name or ''} {descrizione or ''}"
    
    # Aggiungi descrizioni delle linee fattura
    if linee_fattura:
        for linea in linee_fattura:
            if isinstance(linea, dict):
                desc_linea = linea.get("descrizione", "") or linea.get("description", "")
                testo_completo += f" {desc_linea}"
    
    testo_lower = testo_completo.lower()
    
    # Score per ogni centro di costo
    scores = {}
    
    for cdc_id, config in CENTRI_COSTO.items():
        score = 0
        keywords = config.get("keywords", [])
        
        for keyword in keywords:
            if keyword.lower() in testo_lower:
                # Peso maggiore per match più specifici
                score += len(keyword)
        
        if score > 0:
            scores[cdc_id] = score
    
    # Trova il centro di costo con score più alto
    if scores:
        best_cdc = max(scores, key=scores.get)
        confidence = min(scores[best_cdc] / 50.0, 1.0)  # Normalizza 0-1
        return best_cdc, CENTRI_COSTO[best_cdc], confidence
    
    # Fallback: altri costi
    return "99_ALTRI_COSTI", CENTRI_COSTO["99_ALTRI_COSTI"], 0.1


def classifica_f24_per_tributo(codice_tributo: str) -> Tuple[str, Dict[str, Any]]:
    """
    Classifica un versamento F24 in base al codice tributo.
    
    Returns:
        Tuple[centro_costo_id, config_centro]
    """
    cdc_id = TRIBUTI_F24_MAPPING.get(codice_tributo, "8.1_IVA_PERIODICA")
    return cdc_id, CENTRI_COSTO.get(cdc_id, CENTRI_COSTO["99_ALTRI_COSTI"])


def calcola_importi_fiscali(
    imponibile: float,
    iva: float,
    centro_costo_config: Dict[str, Any],
    auto_assegnata: bool = False
) -> Dict[str, Any]:
    """
    Calcola gli importi deducibili e detraibili in base al centro di costo.
    
    Returns:
        Dict con importi deducibili IRES, IRAP e IVA detraibile
    """
    # Deducibilità IRES
    ded_ires = centro_costo_config.get("deducibilita_ires", 1.0)
    if auto_assegnata and "deducibilita_ires_assegnata" in centro_costo_config:
        ded_ires = centro_costo_config["deducibilita_ires_assegnata"]
    
    # Limite annuo per noleggio auto
    limite = centro_costo_config.get("limite_annuo")
    if limite:
        imponibile_limitato = min(imponibile, limite)
        imponibile_deducibile_ires = imponibile_limitato * ded_ires
        imponibile_indeducibile_ires = imponibile - imponibile_deducibile_ires
    else:
        imponibile_deducibile_ires = imponibile * ded_ires if ded_ires else 0
        imponibile_indeducibile_ires = imponibile * (1 - ded_ires) if ded_ires else imponibile
    
    # Deducibilità IRAP
    ded_irap = centro_costo_config.get("deducibilita_irap", 1.0)
    imponibile_deducibile_irap = imponibile * ded_irap if ded_irap else 0
    
    # Detraibilità IVA
    detr_iva = centro_costo_config.get("detraibilita_iva")
    if detr_iva is not None:
        iva_detraibile = iva * detr_iva
        iva_indetraibile = iva * (1 - detr_iva)
    else:
        iva_detraibile = 0
        iva_indetraibile = iva
    
    return {
        "imponibile_originale": round(imponibile, 2),
        "imponibile_deducibile_ires": round(imponibile_deducibile_ires, 2),
        "imponibile_indeducibile_ires": round(imponibile_indeducibile_ires, 2),
        "percentuale_deducibilita_ires": ded_ires,
        "imponibile_deducibile_irap": round(imponibile_deducibile_irap, 2),
        "percentuale_deducibilita_irap": ded_irap,
        "iva_originale": round(iva, 2),
        "iva_detraibile": round(iva_detraibile, 2),
        "iva_indetraibile": round(iva_indetraibile, 2),
        "percentuale_detraibilita_iva": detr_iva,
        "limite_annuo": limite
    }


def get_tutti_centri_costo() -> List[Dict[str, Any]]:
    """Restituisce l'elenco di tutti i centri di costo configurati."""
    return [
        {
            "id": cdc_id,
            "codice": config["codice"],
            "nome": config["nome"],
            "categoria_bilancio": config["categoria_bilancio"],
            "deducibilita_ires": config.get("deducibilita_ires"),
            "deducibilita_irap": config.get("deducibilita_irap"),
            "detraibilita_iva": config.get("detraibilita_iva")
        }
        for cdc_id, config in CENTRI_COSTO.items()
    ]
