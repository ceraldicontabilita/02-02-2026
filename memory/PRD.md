# Application ERP/Accounting - PRD

## Stato: 29 Gennaio 2026

---

## Stack Tecnologico

| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI, Recharts |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas (Motor 3.3) |
| Integrazioni | Odoo, Claude Sonnet, OpenAPI.it |

---

## Completato ✅

### PageLayout (16 pagine)
AssistenteAI, Bilancio, CalendarioFiscale, CentriCosto, Corrispettivi, DocumentiDaRivedere, Finanziaria, IVA, Inventario, LiquidazioneIVA, Magazzino, Pianificazione, SaldiFeriePermessi, TFR, ToDo, UtileObiettivo

### API Cedolini con Paginazione
- GET `/api/cedolini?limit=100&skip=0` 
- GET `/api/cedolini/incompleti`
- POST `/api/cedolini/incompleti/{id}/completa`

### API Claude
- POST `/api/claude/chat`
- POST `/api/claude/analyze`
- POST `/api/claude/report`
- POST `/api/claude/categorize`

---

## Da Completare

### P0
- PageLayout su 57 pagine (strutture complesse richiedono modifiche manuali)
- Completare 911 cedolini incompleti

### P1
- Test E2E
- Indici MongoDB
- Documentazione API

### P2
- Export Excel/CSV
- Multi-tenant
- Notifiche push

---

## Test
- Build: ✅ 7.45s
- Frontend: ✅ 100%
- API: ✅ Paginazione OK
