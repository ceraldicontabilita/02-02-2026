# ROADMAP – TechRecon Accounting System
## Piano di Sviluppo Futuro

---

## 🔴 P0 - Alta Priorità

### 1. Frontend Riconciliazione F24
**Status**: Backend esistente, frontend mancante  
**Descrizione**: Creare interfaccia utente per:
- Upload file F24 da commercialista
- Visualizzazione dati importati
- Gestione processo di riconciliazione con estratto conto
- Dashboard stato riconciliazione

**API esistenti**:
- `GET /api/f24-riconciliazione/dashboard`
- `POST /api/f24-riconciliazione/commercialista/upload`
- `GET /api/f24-riconciliazione/quietanze`
- `GET /api/f24-riconciliazione/alerts`

**File riferimento**: `/app/frontend/src/pages/RiconciliazioneF24.jsx`

---

## 🟡 P1 - Media Priorità

### 2. Notifiche Limiti Giustificativi
**Descrizione**: Sistema di alert quando dipendente raggiunge 90% del limite
- Notifica visiva nella dashboard
- Email opzionale
- Configurazione soglie personalizzabili

### 3. Report PDF Annuale Ferie/Permessi
**Descrizione**: Generazione report stampabile per ogni dipendente
- Riepilogo annuale ferie/ROL/ex-festività
- Dettaglio mensile
- Firma responsabile

### 4. Riconciliazione Email in Background
**Descrizione**: Trasformare scansione email in processo asincrono
- Task in background con Celery o similar
- Progress bar in UI
- Notifica completamento

---

## 🟠 P2 - Bassa Priorità

### 5. Refactoring Router Backend
**Descrizione**: Migliorare organizzazione codice
- Suddividere router grandi (>500 righe)
- Standardizzare naming convention
- Documentazione OpenAPI completa

### 6. Ottimizzazione Performance Fornitori
**Target**: `/api/suppliers` da ~5s a <1s
**Approccio**: 
- Caching più aggressivo
- Paginazione server-side
- Query projection limitata

### 7. Test Automatici E2E
**Descrizione**: Suite test Playwright
- Flussi critici (import fattura → riconciliazione)
- Test regressione
- CI/CD integration

---

## 🔵 Idee Future

### Integrazione Google Calendar
- Scadenze F24 in calendario
- Reminder automatici

### Dashboard Mobile
- App PWA responsive
- Notifiche push

### AI Assistant
- Chat per query contabili
- Suggerimenti automatici

---

*Ultimo aggiornamento: 22 Gennaio 2026*
