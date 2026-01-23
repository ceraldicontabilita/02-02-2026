"""
Suppliers module - Gestione Fornitori.
Modulo suddiviso per funzionalità:
- base: CRUD e operazioni principali
- iban: Ricerca e gestione IBAN
- import_export: Import Excel
- validation: Validazione e dizionario metodi pagamento
- bulk: Operazioni massive
"""
from fastapi import APIRouter
from .validation import router as validation_router
from .iban import router as iban_router
from .import_export import router as import_router
from .bulk import router as bulk_router
from .base import router as base_router

# Router principale che aggrega tutti i sub-router
router = APIRouter()

# Include all sub-routers
# IMPORTANTE: Le rotte statiche devono essere incluse PRIMA delle rotte dinamiche /{id}
router.include_router(validation_router)  # /payment-methods, /payment-terms, /validazione-p0, /dizionario-*
router.include_router(iban_router)        # /ricerca-iban-web, /sync-iban
router.include_router(import_router)      # /upload-excel, /import-excel
router.include_router(bulk_router)        # /aggiorna-tutti-bulk, /aggiorna-metodi-bulk, etc.
router.include_router(base_router)        # CRUD base, routes dinamiche /{supplier_id} alla fine
