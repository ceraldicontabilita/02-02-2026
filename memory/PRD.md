# Application ERP/Accounting - PRD

## Stato: 31 Gennaio 2026

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | Odoo, Claude Sonnet, OpenAPI.it, pypdf |

---

## Completato ✅

### Automazione Prima Nota - COMPLETATO (31 Gen 2026)
- **Fatture XML**: Upload di una fattura XML crea automaticamente un movimento in `prima_nota_banca` o `prima_nota_cassa`
- **Buste Paga**: Upload di un cedolino PDF crea/collega automaticamente un movimento in `prima_nota_salari`
- **File modificati**: 
  - `fatture_upload.py` (linee 631-659): chiamata a `registra_pagamento_fattura`
  - `employees_payroll.py` (linee 470-530): logica di creazione/collegamento `prima_nota_salari`
- **Cedolini esistenti collegati**: 283 movimenti `prima_nota_salari` ora hanno il `cedolino_id` associato

### UI Responsive Cedolini - COMPLETATO (31 Gen 2026)
- **Hook `useIsMobile`**: rileva viewport < 640px
- **Mobile**: Dropdown per selezione mese, card layout per cedolini, filtri su singola riga
- **Desktop**: Tab grid 14 colonne, tabella completa con colonne multiple
- **Modale dettaglio**: Su mobile mostra pulsanti "Scarica PDF" e "Visualizza"
- **File modificato**: `CedoliniRiconciliazione.jsx`

### Pagina Prima Nota Salari - COMPLETATO (31 Gen 2026)
- **Fix routing API**: Ri-montato modulo `prima_nota_salari` su `/api/prima-nota-salari`
- **688 records** visualizzati correttamente
- **Totali calcolati**: €169.950,26 buste, €207.246,79 bonifici
- **File modificati**: `main.py`, `primaNotaStore.js`

### PageLayout Wrapper (72 pagine su 73) - COMPLETATO
Tutte le pagine dell'applicazione hanno il componente `PageLayout` applicato.

### Parser Multi-Template Cedolini - COMPLETATO (30 Gen 2026)
- Parser avanzato che gestisce 4 formati PDF diversi
- Ri-elaborazione di 791 cedolini (2018-2025)

---

## API Principali

### Cedolini
- `GET /api/cedolini?limit=100&skip=0&anno=2025&mese=5`
- `GET /api/cedolini/{cedolino_id}` - Dettaglio cedolino con pdf_data
- `POST /api/employees/paghe/upload-pdf` - Upload PDF buste paga (con automazione)

### Fatture
- `POST /api/fatture/upload-xml` - Upload fattura XML (con automazione prima_nota)
- `POST /api/fatture/upload-xml-bulk` - Upload massivo fatture XML

### Prima Nota
- `GET /api/prima-nota/cassa` - Movimenti cassa
- `GET /api/prima-nota/banca` - Movimenti banca
- `GET /api/prima-nota-salari/salari` - Movimenti salari (688 records)
- `GET /api/prima-nota-salari/dipendenti-lista` - Lista dipendenti (21)

---

## Da Completare

### P1 (Prossimo)
- Verifica utente del flusso completo upload cedolino → Prima Nota Salari

### P2 (Backlog)
- ~17 cedolini che ancora falliscono il parsing
- Test E2E automatizzati
- Indici MongoDB per performance
- Export Excel/CSV

---

## Test
- Build: ✅ 7.21s
- Frontend: ✅ OK
- Automazione Fatture XML: ✅ PASS
- Automazione Buste Paga: ✅ PASS
- UI Responsive Desktop: ✅ PASS
- UI Responsive Mobile: ✅ PASS
- Prima Nota Salari: ✅ PASS (688 records, totali corretti)
- Test Report: `/app/test_reports/iteration_10.json`
