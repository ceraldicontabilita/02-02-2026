# ERP Azienda Semplice - PRD

## Refactoring Completato ✅

### Riepilogo Refactoring
| Router | Righe | Funzionalità |
|--------|-------|--------------|
| fatture_upload.py | 272 | Upload XML singolo/massivo, cleanup duplicati |
| corrispettivi_router.py | 256 | Upload XML, totali, ricalcolo IVA |
| iva_calcolo.py | 214 | Calcoli giornalieri, mensili, annuali |
| ordini_fornitori.py | 132 | CRUD ordini, statistiche |
| products_catalog.py | 107 | Catalogo, ricerca, storico prezzi |
| **TOTALE** | **981** | Righe spostate da public_api.py |

### File Backup
- `/app/app/routers/public_api_BACKUP_20260104_080718.py`

## Stack Tecnologico
- **Frontend**: React + Vite + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async)
- **Database**: MongoDB (azienda_erp_db)

## Test Verificati

### API Nuovi Router
- ✅ `/api/fatture/cleanup-duplicates` - 104 duplicati rimossi
- ✅ `/api/corrispettivi/totals` - €929K totale
- ✅ `/api/iva/annual/2025` - IVA Credito €53K, Debito €84K
- ✅ `/api/ordini-fornitori/stats/summary` - 2 ordini
- ✅ `/api/products/categories` - 18 categorie

### Frontend
- ✅ Dashboard funzionante
- ✅ Calcolo IVA funzionante
- ✅ Ordini Fornitori funzionante
- ✅ Corrispettivi funzionante

## Struttura Router

```
/app/app/routers/
├── fatture_upload.py       # NEW - Upload fatture XML
├── corrispettivi_router.py # NEW - Corrispettivi
├── iva_calcolo.py          # NEW - Calcoli IVA
├── ordini_fornitori.py     # NEW - Ordini fornitori
├── products_catalog.py     # NEW - Catalogo prodotti
├── prima_nota.py           # Prima nota + export
├── prima_nota_automation.py # Automazione
├── haccp_completo.py       # HACCP completo
├── dipendenti.py           # Dipendenti
├── suppliers.py            # Fornitori
├── assegni.py              # Assegni
├── public_api.py           # Legacy (~1700 righe rimaste)
└── public_api_BACKUP_*.py  # Backup originale
```

## Statistiche Dati

- Fatture: 1024
- Fornitori: 236
- Dipendenti: 23
- Corrispettivi: 353
- Ordini: 2
- Prima Nota Cassa: 662
- Prima Nota Banca: 469
- Assegni: 139

## Backlog

### P2 - Media Priorità
- [ ] Continuare refactoring public_api.py:
  - [ ] Employees/Payroll → employees_payroll.py
  - [ ] F24 → f24_tributi.py
  - [ ] Dashboard/Stats → dashboard_stats.py
- [ ] Estrarre nomi dipendenti dal parser payslip

### P3 - Bassa Priorità
- [ ] Email service
- [ ] HACCP moduli aggiuntivi
