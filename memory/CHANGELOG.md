# ERP Azienda Semplice - CHANGELOG

## [Session 2] - 2026-01-04

### Added
- **Import Estratto Conto Bancario**
  - `POST /api/bank-statement/import` - Import PDF/Excel/CSV con riconciliazione
  - `GET /api/bank-statement/stats` - Statistiche riconciliazione
  - `POST /api/portal/upload` con kind="estratto-conto"
  - `/app/app/routers/bank_statement_import.py` - Nuovo router
  - `/app/frontend/src/pages/Riconciliazione.jsx` - UI rinnovata

- **Sistema Severità HACCP 4 Livelli**
  - Logica severità: critica, alta, media, bassa
  - `GET /api/haccp-completo/notifiche/stats` - Stats per severità
  - Cards cliccabili per filtro in `/haccp/notifiche`
  - Legenda severità integrata

- **Barra di Ricerca Globale**
  - `GET /api/ricerca-globale?q=query&limit=10`
  - `/app/frontend/src/components/GlobalSearch.jsx`
  - Integrata in sidebar App.jsx
  - Shortcut Ctrl+K / Cmd+K
  - Ricerca in fatture, fornitori, prodotti, dipendenti

### Changed
- `/app/app/routers/haccp_completo.py` - Severità a 4 livelli invece di 2
- `/app/app/routers/public_api.py` - Aggiunto endpoint ricerca globale
- `/app/frontend/src/pages/HACCPNotifiche.jsx` - Cards severità cliccabili

### Test Report
- `/app/test_reports/iteration_8.json` - 13/13 test passati

---

## [Session 1] - 2026-01-04

### Added
- HACCP Analytics con grafici Recharts
- HACCP Notifiche con scheduler automatico
- Export PDF mensile/annuale HACCP
- CRUD Prima Nota (modifica/elimina movimenti)
- CRUD F24 (modifica/elimina/sovrascrivi)
- Invio report HACCP via email
- Refactoring GestioneDipendenti.jsx

### Fixed
- Bug ricerca prodotti (prezzo non mostrato)
