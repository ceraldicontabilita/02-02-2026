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
- **Fatture XML**: Upload di una fattura XML crea automaticamente un movimento in `prima_nota_banca` o `prima_nota_cassa` (a seconda del metodo di pagamento del fornitore)
- **Buste Paga**: Upload di un cedolino PDF crea/collega automaticamente un movimento in `prima_nota_salari` in attesa di riconciliazione con il pagamento bancario
- **File modificati**: 
  - `fatture_upload.py` (linee 631-659): chiamata a `registra_pagamento_fattura`
  - `employees_payroll.py` (linee 470-530): logica di creazione/collegamento `prima_nota_salari`
- **Cedolini esistenti collegati**: 283 movimenti `prima_nota_salari` ora hanno il `cedolino_id` associato

### UI Responsive Cedolini - COMPLETATO (31 Gen 2026)
- **Hook `useIsMobile`**: rileva viewport < 640px
- **Mobile**: Dropdown per selezione mese, card layout per cedolini, filtri su singola riga
- **Desktop**: Tab grid 14 colonne, tabella completa con colonne multiple
- **Modale dettaglio**: Su mobile mostra pulsanti "Scarica PDF" e "Visualizza" quando pdf_data esiste
- **File modificato**: `CedoliniRiconciliazione.jsx`

### PageLayout Wrapper (72 pagine su 73) - COMPLETATO
**Tutte le pagine** dell'applicazione hanno ora il componente `PageLayout` applicato per un'interfaccia utente coerente.

### Parser Multi-Template Cedolini - COMPLETATO (30 Gen 2026)
- **Parser avanzato** (`busta_paga_multi_template.py`) che gestisce 4 formati PDF diversi
- Supporto per PDF multi-pagina, acconti, tredicesime, bonus, TFR
- Riconoscimento mesi di SOSPENSIONE (SOS): lordo=0, netto negativo
- Ri-elaborazione di 791 cedolini (2018-2025) con tasso di successo del 100%

### Bug Fix Visualizzazione PDF Cedolini - COMPLETATO (30 Gen 2026)
- Risolto il bug che impediva la visualizzazione del PDF nel modale di dettaglio
- Aggiunto endpoint `GET /api/cedolini/{cedolino_id}` per recuperare i dati completi incluso `pdf_data`

---

## API Principali

### Cedolini
- `GET /api/cedolini?limit=100&skip=0&anno=2025&mese=5`
- `GET /api/cedolini/{cedolino_id}` - Dettaglio cedolino con pdf_data
- `GET /api/cedolini/{cedolino_id}/download` - Download PDF
- `POST /api/employees/paghe/upload-pdf` - Upload PDF buste paga (con automazione prima_nota_salari)

### Fatture
- `POST /api/fatture/upload-xml` - Upload fattura XML (con automazione prima_nota)
- `POST /api/fatture/upload-xml-bulk` - Upload massivo fatture XML

### Prima Nota
- `GET /api/prima-nota/cassa` - Movimenti cassa
- `GET /api/prima-nota/banca` - Movimenti banca
- `GET /api/prima-nota-salari` - Movimenti salari

---

## Da Completare

### P1 (Prossimo)
- **Verifica utente del flusso cedolini completo**: Test dell'intero processo upload PDF → parsing → visualizzazione → Prima Nota Salari

### P2 (Backlog)
- ~17 cedolini che ancora falliscono il parsing (PDF corrotti o template aggiuntivi)
- Test E2E automatizzati per automazioni
- Indici MongoDB per performance
- Export Excel/CSV
- Multi-tenant

---

## Test
- Build: ✅ 7.21s
- Frontend: ✅ OK
- Automazione Fatture XML: ✅ PASS
- Automazione Buste Paga: ✅ PASS
- UI Responsive Desktop: ✅ PASS
- UI Responsive Mobile: ✅ PASS
- Test Report: `/app/test_reports/iteration_10.json`
