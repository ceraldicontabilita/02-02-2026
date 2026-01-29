# Application ERP/Accounting - PRD

## Stato: 29 Gennaio 2026

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | Odoo, Claude Sonnet, OpenAPI.it |

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

### API Cedolini Paginazione
- GET `/api/cedolini?limit=100&skip=0`
- GET `/api/cedolini/incompleti`
- POST `/api/cedolini/incompleti/{id}/completa`

### API Claude AI
- POST `/api/claude/chat`
- POST `/api/claude/analyze`
- POST `/api/claude/report`
- POST `/api/claude/categorize`

---

## Da Completare

### P1
- **911 cedolini incompleti**: Investigare il parser PDF per capire perché i campi non vengono popolati

### P2
- Test E2E automatizzati
- Indici MongoDB per performance
- Export Excel/CSV
- Multi-tenant

---

## Test
- Build: ✅ 7.21s
- Frontend: ✅ OK
