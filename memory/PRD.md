# ERP Azienda Semplice - PRD

## Refactoring Completato ✅

### Riepilogo Finale
| Router | Righe | Funzionalità |
|--------|-------|--------------|
| fatture_upload.py | 272 | Upload XML fatture |
| corrispettivi_router.py | 256 | Corrispettivi telematici |
| iva_calcolo.py | 214 | Calcoli IVA giornalieri/mensili/annuali |
| ordini_fornitori.py | 132 | CRUD ordini fornitori |
| products_catalog.py | 107 | Catalogo prodotti, prezzi |
| employees_payroll.py | 207 | Dipendenti e buste paga |
| f24_tributi.py | 213 | Modelli F24, alert scadenze |
| **TOTALE** | **1401** | Righe spostate |

### Prima del Refactoring
- public_api.py: **2665 righe**

### Dopo il Refactoring  
- public_api.py: ~1264 righe (legacy rimanente)
- 7 router modulari: 1401 righe

## Stack Tecnologico
- **Frontend**: React + Vite + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async)
- **Database**: MongoDB (azienda_erp_db)

## API Endpoints Refactored

| Prefix | Router | Endpoints |
|--------|--------|-----------|
| `/api/fatture` | fatture_upload | upload-xml, upload-xml-bulk, cleanup-duplicates |
| `/api/corrispettivi` | corrispettivi_router | list, upload-xml, totals, ricalcola-iva |
| `/api/iva` | iva_calcolo | daily, monthly, annual, today |
| `/api/ordini-fornitori` | ordini_fornitori | CRUD, stats |
| `/api/products` | products_catalog | catalog, search, categories, suppliers |
| `/api/employees` | employees_payroll | list, CRUD, payslips, upload-pdf |
| `/api/f24` | f24_tributi | list, CRUD, alerts, dashboard, codici |

## Test Verificati

- ✅ Dashboard: 1024 fatture, 236 fornitori, 23 dipendenti
- ✅ IVA: Credito €53K, Debito €84K
- ✅ Paghe: 23 dipendenti, €21,360 netto
- ✅ F24: Dashboard, alert funzionanti
- ✅ Ordini: 2 ordini
- ✅ Corrispettivi: 353 record, €929K

## Struttura File

```
/app/app/routers/
├── fatture_upload.py       # NEW
├── corrispettivi_router.py # NEW
├── iva_calcolo.py          # NEW
├── ordini_fornitori.py     # NEW
├── products_catalog.py     # NEW
├── employees_payroll.py    # NEW
├── f24_tributi.py          # NEW
├── prima_nota.py           # Esistente
├── prima_nota_automation.py # Esistente
├── haccp_completo.py       # Esistente
├── dipendenti.py           # Esistente
├── suppliers.py            # Esistente
├── assegni.py              # Esistente
├── public_api.py           # Legacy ridotto
└── public_api_BACKUP_*.py  # Backup
```

## Backlog Rimanente

### P3 - Bassa Priorità
- [ ] Rimuovere endpoint duplicati da public_api.py
- [ ] Estrarre nomi dipendenti dal parser payslip
- [ ] Email service
