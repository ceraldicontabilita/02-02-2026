# ROADMAP – TechRecon Accounting System
## Piano di Sviluppo Futuro

*Ultimo aggiornamento: 26 Gennaio 2026*

---

## ✅ Completato Recentemente

### Sessione 26 Gennaio 2026 (Parte 4)
- ✅ **Fix Associazione Verbali-Driver**: Da 1.9% a 57.7% verbali collegati
- ✅ **UI Associazione Manuale Targa-Driver**: Modal per collegamento manuale
- ✅ **Colonna Driver in VerbaliRiconciliazione**: Visualizzazione driver associato
- ✅ **Design System TypeScript**: `/src/design/ceraldiDesignSystem.ts`

### Sessione 26 Gennaio 2026 (Parte 3)
- ✅ **Fix Tab Mesi Cedolini**: Layout corretto, mesi abbreviati
- ✅ **Fix Dettaglio Cedolino**: Apertura modale funzionante
- ✅ **Fix Vista Fattura**: safe_float() per formattazione numeri
- ✅ **Auto-Riparazione Globale**: Endpoint per collegamento dati automatico
- ✅ **Pulizia Duplicati Cedolini**: 1677 duplicati rimossi

### Sessione 26 Gennaio 2026 (Parte 2)
- ✅ **Rimossa funzione "Bonifico"**: Eliminato endpoint pericoloso
- ✅ **Download Email con Parole Chiave da DB**: Keywords configurabili
- ✅ **Fix CorrezioneAI**: Errore process.env risolto
- ✅ **URL Descrittivi Base**: Helper e route per cedolini

### Sessione 24 Gennaio 2026
- ✅ **Chat Intelligente**: Sostituita Parlant con nuovo sistema
- ✅ **Ordinamento Prima Nota Cassa**: Corrispettivi prima di POS
- ✅ **Sistema Schede Tecniche**: Backend completo
- ✅ **Fix Visualizzazione PDF/Immagini**: Multi-formato supportato

### Alert Limiti Giustificativi (22 Gen 2026)
- ✅ Endpoint `/api/giustificativi/alert-limiti`
- ✅ Widget Dashboard
- ✅ Soglia configurabile (80%, 90%, 100%)

---

## 🔴 P0 - Alta Priorità (Prossimi)

### 1. Associazione Verbali Rimanenti
**Descrizione**: Collegare i 22 verbali ancora senza driver (42.3%)
- Alcune targhe potrebbero non essere nei veicoli
- Possibile aggiunta campo "targa" nel profilo dipendente
- Interfaccia per associazione massiva

---

## 🟡 P1 - Media Priorità

### 2. Estendere URL Descrittivi
**Descrizione**: Applicare URL "parlanti" a tutte le pagine
- Fornitori: `/fornitori/nome-fornitore`
- Fatture: `/fatture-ricevute/fornitore/numero-fattura`
- Verbali: `/verbali/numero-verbale`
- Dipendenti: `/dipendenti/nome-cognome`

### 3. UI Schede Tecniche
**Descrizione**: Tab nella pagina fornitore per visualizzare schede tecniche
- Lista schede associate al fornitore
- Visualizzazione PDF integrata
- Collegamento prodotti

### 4. Report PDF Annuale Ferie/Permessi
**Descrizione**: Generazione report stampabile per ogni dipendente
- Riepilogo annuale ferie/ROL/ex-festività
- Dettaglio mensile
- Firma responsabile

### 5. Processo Batch Email Fatture
**Descrizione**: Evitare timeout su processa-fatture-email
- Task in background
- Progress bar in UI
- Notifica completamento

---

## 🟠 P2 - Bassa Priorità

### 6. Completare Dati Cedolini
**Descrizione**: Investigare campi vuoti (NETTO)
- Verificare processo importazione
- Correggere parsing CSV/PDF

### 7. Refactoring Router Backend
**Descrizione**: Migliorare organizzazione codice
- Suddividere router grandi (>500 righe)
- Standardizzare naming convention
- Documentazione OpenAPI completa

### 8. Dashboard Salute Dati
**Descrizione**: Visualizzazione real-time coerenza dati
- Percentuale associazioni per entità
- Alert automatici per anomalie
- Storico miglioramenti

### 9. Test Automatici E2E
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

### AI Assistant Avanzato
- Analisi predittiva
- Suggerimenti automatici basati su pattern

---

## 📊 Statistiche Coerenza Dati

| Entità | Collegati | Totale | % |
|--------|-----------|--------|---|
| Fatture → Fornitori | 3605 | 3791 | 95.1% |
| Cedolini → Dipendenti | 184 | 197 | 93.4% |
| Verbali → Driver | 30 | 52 | 57.7% |
| Payslips → Employee | 305 | 480 | 63.5% |
