"""
Suppliers Module - Gestione Fornitori Modularizzata

Struttura:
- suppliers_base.py: CRUD base (list, get, update, delete, toggle)
- suppliers_import.py: Import da Excel e sincronizzazione fatture
- suppliers_iban.py: Ricerca IBAN web e validazioni
- suppliers_metodi.py: Metodi di pagamento e dizionario
- suppliers_validazione.py: Validazioni P0 e statistiche
"""

from fastapi import APIRouter
from . import suppliers_base, suppliers_import, suppliers_iban, suppliers_metodi, suppliers_validazione

# Router principale che combina tutti i sub-router
router = APIRouter()

# Include tutti i sub-router
router.include_router(suppliers_base.router)
router.include_router(suppliers_import.router)
router.include_router(suppliers_iban.router)
router.include_router(suppliers_metodi.router)
router.include_router(suppliers_validazione.router)
