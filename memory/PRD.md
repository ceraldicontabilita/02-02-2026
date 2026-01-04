# ERP Azienda Semplice - PRD

## Stack Tecnologico
- **Frontend**: React + Vite + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async)
- **Database**: MongoDB (azienda_erp_db)

## Refactoring Completato ✅

### Prima: public_api.py (2665 righe)
### Dopo: Router modulari

| Router | Linee | Funzionalità |
|--------|-------|--------------|
| fatture_upload.py | ~250 | Upload XML singolo/massivo, cleanup duplicati |
| corrispettivi_router.py | ~280 | Upload XML, totali, ricalcolo IVA |
| public_api.py | ~2600 | Endpoints legacy (da continuare refactoring) |

### Backup creato
- `/app/app/routers/public_api_BACKUP_20260104_080718.py`

## Test Risultati

### Backend
- ✅ Health check OK
- ✅ Fatture cleanup duplicati (104 rimossi)
- ✅ Corrispettivi totali API funzionante
- ✅ Tutti i moduli funzionanti

### Frontend  
- ✅ Dashboard con 1024 fatture, 236 fornitori, 23 dipendenti
- ✅ Corrispettivi 353 record, €929K totale
- ✅ Tutte le pagine funzionanti

## Statistiche Dati

- Fatture: 1024 (dopo cleanup)
- Fornitori: 236
- Dipendenti: 23
- Corrispettivi: 353
- Prima Nota Cassa: 662
- Prima Nota Banca: 469
- Assegni: 139

## File Router

```
/app/app/routers/
├── fatture_upload.py       # NEW - Upload fatture
├── corrispettivi_router.py # NEW - Corrispettivi
├── prima_nota.py           # Prima nota + export Excel
├── prima_nota_automation.py # Automazione
├── haccp_completo.py       # HACCP completo
├── dipendenti.py           # Dipendenti
├── suppliers.py            # Fornitori
├── assegni.py              # Assegni
├── public_api.py           # Legacy (da continuare)
└── public_api_BACKUP_*.py  # Backup
```

## Backlog Rimanente

### P1 - Alta Priorità
- [ ] Continuare refactoring public_api.py:
  - [ ] IVA calcolo → iva_calcolo.py
  - [ ] Employees/Payroll → employees_payroll.py
  - [ ] Ordini fornitori → ordini_fornitori.py
  - [ ] F24 → f24_tributi.py

### P2 - Media Priorità
- [ ] Estrarre nomi dipendenti dal parser payslip
- [ ] API mancanti

### P3 - Bassa Priorità
- [ ] Email service
- [ ] HACCP moduli aggiuntivi
