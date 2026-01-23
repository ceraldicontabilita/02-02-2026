"""
F24 Module - Costanti e utility condivise.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Directories
UPLOAD_DIR = "/app/uploads/f24_commercialista"
UPLOAD_DIR_QUIETANZE = "/app/uploads/quietanze_f24"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR_QUIETANZE, exist_ok=True)

# Collections
COLL_F24_COMMERCIALISTA = "f24_commercialista"
COLL_QUIETANZE = "quietanze_f24"
COLL_F24_ALERTS = "f24_riconciliazione_alerts"

# Codici ravvedimento F24
CODICI_RAVVEDIMENTO = ["8901", "8902", "8903", "8904", "8906", "8907", "8908", "8911", "8912", "8913", "8916", "8918"]

# Tabella codici tributo
TRIBUTI_INFO = {
    "1001": {"descrizione": "IRPEF - Ritenute lavoro dipendente", "sezione": "erario"},
    "1012": {"descrizione": "IRPEF - Interessi pagamento dilazionato", "sezione": "erario"},
    "1040": {"descrizione": "IRPEF - Ritenute lavoro autonomo", "sezione": "erario"},
    "1712": {"descrizione": "Acconto imposta sostitutiva TFR", "sezione": "erario"},
    "1713": {"descrizione": "Saldo imposta sostitutiva TFR", "sezione": "erario"},
    "1989": {"descrizione": "Interessi su ravvedimento", "sezione": "erario"},
    "1990": {"descrizione": "Sanzioni ravvedimento operoso", "sezione": "erario"},
    "1991": {"descrizione": "Interessi ravvedimento operoso", "sezione": "erario"},
    "3844": {"descrizione": "Addizionale comunale IRPEF - Saldo", "sezione": "regioni"},
    "3847": {"descrizione": "Addizionale comunale IRPEF - Acconto", "sezione": "regioni"},
    "3848": {"descrizione": "Addizionale comunale IRPEF - Saldo", "sezione": "regioni"},
    "3850": {"descrizione": "Diritto camerale annuale", "sezione": "regioni"},
    "6099": {"descrizione": "IVA annuale", "sezione": "erario"},
    "6494": {"descrizione": "Studi di settore - Maggiorazione", "sezione": "erario"},
    "6001": {"descrizione": "IVA - Versamento mensile gennaio", "sezione": "erario"},
    "6002": {"descrizione": "IVA - Versamento mensile febbraio", "sezione": "erario"},
    "6003": {"descrizione": "IVA - Versamento mensile marzo", "sezione": "erario"},
    "6004": {"descrizione": "IVA - Versamento mensile aprile", "sezione": "erario"},
    "6005": {"descrizione": "IVA - Versamento mensile maggio", "sezione": "erario"},
    "6006": {"descrizione": "IVA - Versamento mensile giugno", "sezione": "erario"},
    "6007": {"descrizione": "IVA - Versamento mensile luglio", "sezione": "erario"},
    "6008": {"descrizione": "IVA - Versamento mensile agosto", "sezione": "erario"},
    "6009": {"descrizione": "IVA - Versamento mensile settembre", "sezione": "erario"},
    "6010": {"descrizione": "IVA - Versamento mensile ottobre", "sezione": "erario"},
    "6011": {"descrizione": "IVA - Versamento mensile novembre", "sezione": "erario"},
    "6012": {"descrizione": "IVA - Versamento mensile dicembre", "sezione": "erario"},
    "6031": {"descrizione": "IVA - Versamento trimestrale 1°", "sezione": "erario"},
    "6032": {"descrizione": "IVA - Versamento trimestrale 2°", "sezione": "erario"},
    "6033": {"descrizione": "IVA - Versamento trimestrale 3°", "sezione": "erario"},
    "6034": {"descrizione": "IVA - Versamento trimestrale 4°", "sezione": "erario"},
}
