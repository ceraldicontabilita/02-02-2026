# Azienda in Cloud ERP - Product Requirements Document

## Original Problem Statement
Ricreare un'applicazione ERP aziendale completa da un file zip fornito dall'utente, adattandola all'ambiente containerizzato.

## Core Requirements
- Dashboard con KPI in tempo reale
- Modulo Magazzino per gestione prodotti
- Modulo HACCP per temperature
- Modulo Prima Nota Cassa per movimenti contanti
- **Modulo Fatture**: Upload XML singolo/massivo con controllo duplicati atomico
- **Modulo Corrispettivi**: Upload XML singolo/massivo con estrazione pagamento elettronico
- **Modulo Paghe/Salari**: Upload PDF buste paga LUL Zucchetti

## What's Been Implemented

### 2025-01-04 - Fix Completo Parser e Limiti
- ✅ **RIMOSSO LIMITE 100**: Tutti gli endpoint ora restituiscono fino a 10000 record
- ✅ **Corrispettivi**: Parsing completo formato COR10 Agenzia Entrate
  - Estrazione `PagatoContanti` e `PagatoElettronico`
  - Gestione namespace `n1:`, `p:`, `ns3:`
  - Riepilogo IVA per aliquota
- ✅ **Fatture XML**: Parser robusto con gestione namespace multipli
- ✅ **PDF Buste Paga**: Parser LUL Zucchetti
  - Estrazione nome, codice fiscale, qualifica
  - Ore lavorate, periodo (mese/anno)
  - Salvataggio in collection `payslips` separata

### Statistiche Correnti
- **366 Corrispettivi** caricati
- **Totale**: €929,182.53
- **Contanti**: €363,029.55 (39%)
- **Elettronico**: €566,152.98 (61%)

## Architecture

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB (motor async driver)
- **Parsers**:
  - `/app/app/parsers/corrispettivi_parser.py` - COR10 Agenzia Entrate
  - `/app/app/parsers/fattura_elettronica_parser.py` - FatturaPA
  - `/app/app/parsers/payslip_parser.py` - LUL Zucchetti

### Database Collections
- `corrispettivi`: Dati giornalieri RT con pagamenti
- `invoices`: Fatture elettroniche
- `employees`: Anagrafica dipendenti
- `payslips`: Buste paga mensili

## Key API Endpoints (limit=10000 su tutti)

### Corrispettivi
- `GET /api/corrispettivi`
- `POST /api/corrispettivi/upload-xml`
- `POST /api/corrispettivi/upload-xml-bulk`

### Fatture
- `GET /api/invoices`
- `POST /api/fatture/upload-xml`
- `POST /api/fatture/upload-xml-bulk`

### Paghe
- `GET /api/employees`
- `GET /api/payslips`
- `POST /api/paghe/upload-pdf`

## P0 - Completati
- [x] Limite 100 rimosso da tutte le API
- [x] Corrispettivi con pagamento elettronico
- [x] Fatture XML funzionanti
- [x] PDF Buste paga con parsing nomi/qualifiche

## P1 - Prossimi
- [ ] Migliorare estrazione netto stipendio da PDF
- [ ] Integrazione Corrispettivi -> Prima Nota (contanti -> cassa, elettronico -> banca)
- [ ] Controllo mensile incrociato

## P2 - Backlog
- [ ] Export dati
- [ ] Report aggregati
- [ ] Dashboard grafici
