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

### PageLayout Wrapper (29 pagine)
AssistenteAI, Bilancio, CalendarioFiscale, Cedolini, CentriCosto, ChiusuraEsercizio, CodiciTributari, ContabilitaAvanzata, ControlloMensile, Corrispettivi, Dashboard, DocumentiDaRivedere, F24, Finanziaria, GestioneCespiti, HACCPRicezione, HACCPSanificazioni, HACCPScadenze, HACCPTemperature, IVA, Inventario, LiquidazioneIVA, Magazzino, Pianificazione, PrimaNotaSalari, SaldiFeriePermessi, TFR, ToDo, UtileObiettivo

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

### P0
- PageLayout su 44 pagine rimanenti
- 911 cedolini incompleti

### P1
- Test E2E
- Indici MongoDB

### P2
- Export Excel/CSV
- Multi-tenant

---

## Test
- Build: ✅ 7.21s
- Frontend: ✅ OK
