# Application ERP/Accounting - PRD

## Stato: 30 Gennaio 2026

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

### PageLayout Wrapper (72 pagine su 73) - COMPLETATO
**Tutte le pagine** dell'applicazione hanno ora il componente `PageLayout` applicato per un'interfaccia utente coerente:
- Admin, ArchivioBonifici, ArchivioFattureRicevute, AssistenteAI, Attendance
- Bilancio, CalendarioFiscale, Cedolini, CedoliniRiconciliazione, CentriCosto
- ChiusuraEsercizio, CicloPassivoIntegrato, ClassificazioneDocumenti, CodiciTributari
- Commercialista, ContabilitaAvanzata, ControlloMensile, CorrezioneAI, Corrispettivi
- Dashboard, DashboardAnalytics, DettaglioVerbale, DizionarioArticoli, DizionarioProdotti
- Documenti, DocumentiDaRivedere, EmailDownloadManager, F24, Finanziaria
- Fornitori, GestioneAssegni, GestioneCespiti, GestioneDipendentiUnificata
- GestioneInvoiceTronic, GestionePagoPA, GestioneRiservata, HACCPRicezione
- HACCPSanificazioni, HACCPScadenze, HACCPTemperature, ImportDocumenti
- InserimentoRapido, IntegrazioniOpenAPI, Inventario, IVA, LiquidazioneIVA
- Magazzino, MagazzinoDoppiaVerita, MotoreContabile, NoleggioAuto, OdooIntegration
- OrdiniFornitori, PianoDeiConti, Pianificazione, PrevisioniAcquisti, PrimaNota
- PrimaNotaSalari, RegistroLotti, RegoleCategorizzazione, RegoleContabili
- RicercaProdotti, Ricette, Riconciliazione, RiconciliazioneF24, RiconciliazioneUnificata
- SaldiFeriePermessi, Scadenze, TFR, ToDo, UtileObiettivo, VerbaliRiconciliazione
- VerificaCoerenza
- **HACCPLotti**: Redirect a RegistroLotti (non richiede wrapper)

### Parser Multi-Template Cedolini - COMPLETATO (30 Gen 2026)
- **Parser avanzato** (`busta_paga_multi_template.py`) che gestisce 4 formati PDF diversi (CSC Napoli, Zucchetti Classic, Zucchetti New, Teamsystem)
- Supporto per PDF multi-pagina, acconti, tredicesime, bonus, TFR
- **Riconoscimento mesi di SOSPENSIONE** (SOS): lordo=0, netto negativo per trattenute
- Distinzione tra paga base teorica e lordo effettivo (TOTALE COMPETENZE)
- Ri-elaborazione di 791 cedolini (2018-2025) con tasso di successo del 100%
- **NOTA: Cedolini 2017 eliminati** (82 documenti) - formato non compatibile

### Bug Fix Visualizzazione PDF Cedolini - COMPLETATO (30 Gen 2026)
- Risolto il bug che impediva la visualizzazione del PDF nel modale di dettaglio
- Aggiunto endpoint `GET /api/cedolini/{cedolino_id}` per recuperare i dati completi incluso `pdf_data`
- Implementata UI con pulsanti "Scarica PDF" e "Apri in nuova scheda" compatibile con tutti i browser

### API Cedolini
- GET `/api/cedolini?limit=100&skip=0&anno=2025&mese=5`
- GET `/api/cedolini/{cedolino_id}` - Dettaglio cedolino con pdf_data
- GET `/api/cedolini/{cedolino_id}/download` - Download PDF
- GET `/api/cedolini/incompleti`
- POST `/api/cedolini/incompleti/{id}/completa`
- GET `/api/employees/cedolini/da-rivedere`
- GET `/api/employees/cedolini/statistiche-parsing`

### API Claude AI
- POST `/api/claude/chat`
- POST `/api/claude/analyze`
- POST `/api/claude/report`
- POST `/api/claude/categorize`

---

## Da Completare

### P1
- **Verifica utente del flusso cedolini**: Test dell'intero processo upload PDF → parsing → visualizzazione "Da Rivedere"

### P2
- ~17 cedolini che ancora falliscono il parsing (analisi PDF corrotti o template aggiuntivi)
- Test E2E automatizzati
- Indici MongoDB per performance
- Export Excel/CSV
- Multi-tenant

---

## Test
- Build: ✅ 7.21s
- Frontend: ✅ OK
