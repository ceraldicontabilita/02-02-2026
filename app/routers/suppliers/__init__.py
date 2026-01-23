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
from .base import router as base_router
from .iban import router as iban_router
from .import_export import router as import_router
from .validation import router as validation_router
from .bulk import router as bulk_router

# Router principale che aggrega tutti i sub-router
router = APIRouter()

# Include all sub-routers
router.include_router(validation_router)  # Static routes first
router.include_router(iban_router)
router.include_router(import_router)
router.include_router(bulk_router)
router.include_router(base_router)  # Dynamic routes last
