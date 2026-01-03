# Backend Routes Structure
# /app/backend/routes/__init__.py

"""
Modular routes for the ERP application.
Each module handles a specific functional area.
"""

# List of all route modules
ROUTE_MODULES = [
    'prima_nota_import',  # Import corrispettivi, POS, fatture, versamenti
    'haccp',              # Temperature, sanificazioni, scadenzario
    'invoices',           # Fatture ricevute e emesse
    'employees',          # Gestione dipendenti
    'suppliers',          # Fornitori
    'assegni',            # Gestione assegni
    'warehouse',          # Magazzino
    'accounting',         # Contabilità
    'auth',               # Autenticazione
]
