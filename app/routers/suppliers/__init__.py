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

# Include tutti i sub-router (senza prefix - gli endpoint mantengono i loro path)
router.include_router(suppliers_metodi.router, tags=["Suppliers Metodi"])
router.include_router(suppliers_validazione.router, tags=["Suppliers Validazione"])
router.include_router(suppliers_iban.router, tags=["Suppliers IBAN"])
router.include_router(suppliers_import.router, tags=["Suppliers Import"])
router.include_router(suppliers_base.router, tags=["Suppliers Base"])
