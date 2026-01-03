"""
API Naming Standardization Guide
Guida per la standardizzazione dei nomi degli endpoint

CONVENZIONI ADOTTATE:
1. Usare inglese per tutti i path (es: /invoices, /employees)
2. Usare kebab-case per path multi-parola (es: /chart-of-accounts)
3. Usare snake_case per parametri query e variabili Python
4. Prefisso /api già presente nel router
5. Collection names: snake_case in inglese

STATO ATTUALE:
- server.py: 28,700+ righe (da modularizzare)
- Errori lint: 18 (variabili inutilizzate, non critici)
- Collection: 30+ (mix italiano/inglese)

ENDPOINT DA RINOMINARE (FUTURI):
"""

# Mapping italiano -> inglese per futura migrazione
NAMING_MIGRATION = {
    # Fatture
    "/invoices/emesse": "/invoices/issued",  # Fatture attive emesse
    "/fattura24": "/invoice24",
    
    # Prima Nota
    "/prima-nota": "/cash-journal",  # Prima Nota Cassa
    "/prima-nota-salari": "/payroll-journal",
    
    # HACCP
    "/haccp/sanificazioni": "/haccp/sanitations",  # già corretto
    "/haccp/disinfestazioni": "/haccp/pest-control",
    "/haccp/libro-unico": "/haccp/payroll-book",
    "/haccp/libretti-sanitari": "/haccp/health-cards",
    "/haccp/scadenzario": "/haccp/expiry-tracker",
    
    # Ricettario
    "/ricettario": "/recipes",
    
    # Assegni
    "/assegni": "/checks",
    
    # Gestione
    "/gestione-dipendenti": "/employee-management",
    "/gestione-assegni": "/check-management",
    
    # Contabilità
    "/categorie-analitiche": "/analytical-categories",
    "/categorizzazione-fatture": "/invoice-categorization",
    "/piano-dei-conti": "/chart-of-accounts",  # già corretto
    "/costi-previsionali": "/budget-costs",
    
    # Portale
    "/portale-dipendenti": "/employee-portal",  # già corretto
    "/permessi": "/leave-requests",
    
    # IVA
    "/iva": "/vat",
    
    # Magazzino
    "/comparatore": "/price-comparator",
    "/magazzino": "/warehouse",  # già corretto
    "/inventario": "/inventory",
    "/tracciabilita": "/traceability",  # già corretto
    
    # Riconciliazione
    "/riconciliazione-bancaria": "/bank-reconciliation",  # già corretto
    
    # F24
    "/codici-tributo": "/tax-codes",
    "/in-attesa-pagamento": "/pending-payment",
    "/da-confermare": "/pending-confirmation",
}

# Endpoint già corretti (inglese)
CORRECT_NAMING = [
    "/invoices",
    "/suppliers",
    "/warehouse",
    "/employees",
    "/documents",
    "/settings",
    "/dashboard",
    "/portal",
    "/auth",
    "/admin",
    "/bank-reconciliation",
    "/chart-of-accounts",
    "/traceability",
]

# Query parameters da standardizzare
QUERY_PARAMS_MIGRATION = {
    "month_year": "month_year",  # OK
    "dipendente_nome": "employee_name",
    "fornitore": "supplier",
    "importo": "amount",
    "data_inizio": "start_date",
    "data_fine": "end_date",
}

# MongoDB Collections - Current state (mix italiano/inglese)
COLLECTIONS_CURRENT = {
    # Inglese (OK)
    "invoices": "invoices",
    "cash_movements": "cash_movements",
    "staff": "staff",
    "suppliers": "suppliers",
    "temperatures": "temperatures",
    "employees": "employees",
    "warehouse": "warehouse",
    "sanifications": "sanifications",
    "documents": "documents",
    "recipes": "recipes",
    "bank_statements": "bank_statements",
    "invoice_metadata": "invoice_metadata",
    "carts": "carts",
    "product_mappings": "product_mappings",
    "product_catalog": "product_catalog",
    "price_history": "price_history",
    "chart_of_accounts": "chart_of_accounts",
    "system_settings": "system_settings",
    "employee_documents": "employee_documents",
    "cash_register_uploads": "cash_register_uploads",
    "haccp_config": "haccp_config",
    
    # Italiano (da migrare in futuro)
    "assegni": "checks",  # → checks
    "prima_nota_salari": "payroll_journal",  # → payroll_journal
    "libretti_sanitari": "health_cards",  # → health_cards
    "f24_documents": "f24_documents",  # OK (acronimo)
    "f24_details": "f24_details",  # OK (acronimo)
    
    # Duplicati potenziali da unificare
    "staff": "employees",  # staff e employees sono la stessa cosa?
    "payroll_salaries": "payroll_salaries",
    "payroll_payments": "payroll_payments",
    "payroll_attendance": "payroll_attendance",
}

# Funzioni con naming italiano da standardizzare
FUNCTIONS_TO_RENAME = {
    # Italiano → Inglese
    "save_employee_to_dictionary": "save_employee_to_dictionary",  # OK
    "get_employee_from_dictionary": "get_employee_from_dictionary",  # OK
    "save_supplier_payment_method": "save_supplier_payment_method",  # OK
    "get_supplier_payment_method": "get_supplier_payment_method",  # OK
    
    # Variabili comuni
    "codice_fiscale": "tax_code",
    "fornitore": "supplier",
    "dipendente": "employee",
    "importo": "amount",
    "fattura": "invoice",
}

# PRIORITÀ MODULARIZZAZIONE server.py
MODULARIZATION_PRIORITY = [
    ("haccp.py", "~40 endpoint HACCP temperature/sanificazioni/scadenzario"),
    ("invoices.py", "~25 endpoint fatture passive"),
    ("payroll.py", "~15 endpoint stipendi/presenze"),
    ("employees.py", "~10 endpoint gestione dipendenti"),
    ("warehouse.py", "~15 endpoint magazzino/inventario"),
    ("accounting.py", "~10 endpoint piano conti/categorie"),
]
