# Backend Architecture - Modular Structure

## Overview
Il backend è stato riorganizzato con un'architettura modulare per migliorare la manutenibilità e la scalabilità.

## Directory Structure

```
/app/app/
├── main.py                 # Entry point principale
├── config.py               # Configurazione applicazione
├── database.py             # Connessione MongoDB
├── scheduler.py            # Task scheduler HACCP
│
├── routers/                # API Endpoints (organizzati per modulo)
│   ├── f24/               # Modulo F24 e Riconciliazione
│   │   ├── __init__.py
│   │   ├── f24_main.py
│   │   ├── f24_riconciliazione.py
│   │   ├── f24_tributi.py
│   │   ├── f24_public.py
│   │   ├── quietanze.py
│   │   └── email_f24.py
│   │
│   ├── haccp/             # Modulo HACCP
│   │   ├── __init__.py
│   │   ├── haccp_main.py
│   │   ├── haccp_completo.py
│   │   ├── haccp_libro_unico.py
│   │   ├── haccp_technical_sheets.py
│   │   ├── haccp_sanifications.py
│   │   ├── haccp_report_pdf.py
│   │   └── haccp_auth.py
│   │
│   ├── accounting/        # Modulo Contabilità
│   │   ├── __init__.py
│   │   ├── accounting_main.py
│   │   ├── accounting_extended.py
│   │   ├── prima_nota.py
│   │   ├── prima_nota_automation.py
│   │   ├── prima_nota_salari.py
│   │   ├── piano_conti.py
│   │   ├── bilancio.py
│   │   ├── centri_costo.py
│   │   ├── contabilita_avanzata.py
│   │   ├── regole_categorizzazione.py
│   │   ├── iva_calcolo.py
│   │   └── liquidazione_iva.py
│   │
│   ├── bank/              # Modulo Banca
│   │   ├── __init__.py
│   │   ├── bank_main.py
│   │   ├── bank_reconciliation.py
│   │   ├── bank_statement_import.py
│   │   ├── bank_statement_parser.py
│   │   ├── estratto_conto.py
│   │   ├── archivio_bonifici.py
│   │   ├── assegni.py
│   │   └── pos_accredito.py
│   │
│   ├── warehouse/         # Modulo Magazzino
│   │   ├── __init__.py
│   │   ├── warehouse_main.py
│   │   ├── magazzino.py
│   │   ├── magazzino_products.py
│   │   ├── magazzino_doppia_verita.py
│   │   ├── products.py
│   │   ├── products_catalog.py
│   │   ├── lotti.py
│   │   ├── ricette.py
│   │   ├── tracciabilita.py
│   │   └── dizionario_articoli.py
│   │
│   ├── invoices/          # Modulo Fatturazione
│   │   ├── __init__.py
│   │   ├── invoices_main.py
│   │   ├── invoices_emesse.py
│   │   ├── invoices_export.py
│   │   ├── fatture_upload.py
│   │   └── corrispettivi.py
│   │
│   ├── employees/         # Modulo Dipendenti
│   │   ├── __init__.py
│   │   ├── dipendenti.py
│   │   ├── employees_payroll.py
│   │   ├── employee_contracts.py
│   │   ├── buste_paga.py
│   │   ├── shifts.py
│   │   └── staff.py
│   │
│   ├── reports/           # Modulo Report
│   │   ├── __init__.py
│   │   ├── report_pdf.py
│   │   ├── exports.py
│   │   ├── simple_exports.py
│   │   ├── analytics.py
│   │   └── dashboard.py
│   │
│   └── [altri router singoli]
│
├── services/              # Business Logic
│   ├── f24_commercialista_parser.py
│   ├── f24_parser.py
│   ├── libro_unico_parser.py
│   ├── liquidazione_iva.py
│   ├── email_service.py
│   └── ...
│
├── models/                # Pydantic Models
│   └── ...
│
├── repositories/          # Data Access Layer
│   └── ...
│
├── schemas/               # Request/Response Schemas
│   └── ...
│
├── utils/                 # Utility Functions
│   ├── logger.py
│   ├── pdf_utils.py
│   └── ...
│
├── constants/             # Costanti Applicazione
│   ├── __init__.py
│   ├── codici_tributo_f24.py
│   └── haccp_constants.py
│
├── middleware/            # Middleware
│   ├── auth.py
│   └── error_handler.py
│
└── exceptions/            # Custom Exceptions
    └── ...
```

## Moduli Principali

### F24 Module (`/routers/f24/`)
Gestione completa F24:
- Upload e parsing PDF F24 commercialista
- Riconciliazione F24 vs Quietanze
- Gestione tributi e codici
- Download email F24

### HACCP Module (`/routers/haccp/`)
Sistema HACCP completo:
- Registrazioni HACCP
- Libro unico
- Schede tecniche
- Sanificazioni
- Report PDF

### Accounting Module (`/routers/accounting/`)
Contabilità generale:
- Prima nota
- Piano dei conti
- Bilancio
- Centri di costo
- Liquidazione IVA

### Bank Module (`/routers/bank/`)
Gestione bancaria:
- Import estratti conto
- Riconciliazione bancaria
- Archivio bonifici
- POS e accrediti

### Warehouse Module (`/routers/warehouse/`)
Gestione magazzino:
- Prodotti e catalogo
- Lotti e tracciabilità
- Ricette e produzione
- Dizionario articoli

### Invoices Module (`/routers/invoices/`)
Fatturazione:
- Fatture emesse/ricevute
- Corrispettivi
- Export fatture

### Employees Module (`/routers/employees/`)
Gestione personale:
- Anagrafica dipendenti
- Buste paga
- Contratti
- Turni

### Reports Module (`/routers/reports/`)
Reportistica:
- Report PDF
- Esportazioni
- Analytics
- Dashboard

## Import Pattern

```python
# Import singolo modulo
from app.routers.f24 import f24_main

# Import router
from app.routers.f24.f24_main import router

# Import funzione specifica
from app.routers.f24.f24_riconciliazione import get_dashboard
```

## Aggiungere Nuovo Modulo

1. Creare directory in `/app/app/routers/nuovo_modulo/`
2. Creare `__init__.py` con exports
3. Creare i file router (es. `nuovo_main.py`)
4. Registrare in `main.py`

```python
# In main.py
from app.routers.nuovo_modulo import nuovo_main
app.include_router(nuovo_main.router, prefix="/api/nuovo", tags=["Nuovo Modulo"])
```
