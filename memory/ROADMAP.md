# ROADMAP – TechRecon Accounting System
## Piano di Sviluppo Futuro

---

## ✅ Completato Recentemente

### Alert Limiti Giustificativi (22 Gen 2026)
- ✅ Endpoint `/api/giustificativi/alert-limiti`
- ✅ Widget Dashboard
- ✅ Soglia configurabile (80%, 90%, 100%)

---

## 🟡 P1 - Media Priorità

### 1. Report PDF Annuale Ferie/Permessi
**Descrizione**: Generazione report stampabile per ogni dipendente
- Riepilogo annuale ferie/ROL/ex-festività
- Dettaglio mensile
- Firma responsabile

### 2. Riconciliazione Email in Background
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
