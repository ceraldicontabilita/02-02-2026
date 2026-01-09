"""
HACCP V2 - Sistema completo HACCP per Ceraldi Group S.R.L.
Conforme a: Reg. CE 852/2004, D.Lgs. 193/2007, Codex Alimentarius

Moduli:
- Temperature Positive (Frigoriferi 1-12)
- Temperature Negative (Congelatori 1-12)
- Sanificazione (Attrezzature + Apparecchi)
- Disinfestazione
- Anomalie
- Chiusure e Festività
- Manuale HACCP
- Lotti di Produzione
- Materie Prime
- Ricette
- Non Conformità
"""
from .temperature_positive import router as temperature_positive_router
from .temperature_negative import router as temperature_negative_router
from .sanificazione import router as sanificazione_router
from .disinfestazione import router as disinfestazione_router
from .anomalie import router as anomalie_router
from .chiusure import router as chiusure_router
from .manuale_haccp import router as manuale_haccp_router
from .lotti import router as lotti_router
from .materie_prime import router as materie_prime_router
from .ricette import router as ricette_router
from .non_conformi import router as non_conformi_router
from .fornitori import router as fornitori_router

__all__ = [
    'temperature_positive_router',
    'temperature_negative_router',
    'sanificazione_router',
    'disinfestazione_router',
    'anomalie_router',
    'chiusure_router',
    'manuale_haccp_router',
    'lotti_router',
    'materie_prime_router',
    'ricette_router',
    'non_conformi_router',
    'fornitori_router'
]
