# ROADMAP - Azienda in Cloud ERP

## Legenda Priorità
- 🔴 **P0** - Critico / In corso
- 🟡 **P1** - Alta priorità
- 🟢 **P2** - Media priorità
- ⚪ **P3** - Backlog

---

## ✅ Completato

### Gennaio 2026
- [x] 🔴 Validatori P0 bloccanti (fatture e salari)
- [x] 🔴 Refactoring UI Prima Nota e Prima Nota Salari
- [x] 🔴 Fix bug conferma multipla fatture
- [x] 🔴 Fix visualizzazione F24 pendenti
- [x] 🔴 Fix import corrispettivi XML
- [x] 🔴 Fix import cedolini Excel
- [x] 🔴 Riconciliazione automatica con auto-refresh
- [x] 🔴 Endpoint bulk update fornitori (backend)
- [x] 🔴 Sync IBAN da fatture esistenti
- [x] 🔴 Endpoint validazione P0 fornitori
- [x] 🔴 Ricerca web ricette con AI (Claude Sonnet 4.5)
- [x] 🔴 Normalizzazione automatica ricette a 1kg
- [x] 🔴 Importazione massiva ricette (158 totali)
- [x] 🔴 Miglioramento riconciliazione (match triplo)
- [x] 🔴 Fix logo aziendale (bianco + database)

### Dicembre 2025
- [x] Modulo HACCP completo
- [x] Associazione bonifici ↔ salari
- [x] Gestione allergeni + libro stampabile
- [x] Sistema email Aruba
- [x] Hook useResponsive.js

---

## 🔴 P0 - In Corso / Prossimi

### UI Aggiornamento Bulk Fornitori
**Stato**: IN CORSO
- [ ] Aggiungere pulsante "Aggiorna Tutti i Dati" in `Fornitori.jsx`
- [ ] Collegare al endpoint `/api/suppliers/update-all-incomplete`
- [ ] Implementare indicatore di caricamento
- [ ] Notifica toast con risultato (X aggiornati, Y falliti)

### Risoluzione 231 Fornitori senza IBAN
**Stato**: BLOCCATO su UI bulk update
- [ ] Completare UI bulk update
- [ ] Eseguire aggiornamento massivo
- [ ] Verificare risultati con `/api/suppliers/validazione-p0`
- [ ] Lista fornitori per inserimento manuale IBAN

---

## 🟡 P1 - Alta Priorità

### Verifica Funzionamento Validatori P0
- [ ] Test import fattura fornitore senza metodo pagamento
- [ ] Test import fattura bancaria senza IBAN
- [ ] Test pagamento stipendio in contanti post 06/2018
- [ ] Documentare messaggi di errore

### Investigare Errori 404 Generici
- [ ] Identificare pagine/azioni che causano 404
- [ ] Aggiungere logging dettagliato
- [ ] Correggere endpoint mancanti

---

## 🟡 P1 - Alta Priorità

### Miglioramenti Ricettario
- [ ] Calcolo automatico food cost da prezzi fatture XML
- [ ] Suggerimenti ingredienti da magazzino
- [ ] Export ricette in PDF
- [ ] Filtro per allergeni

### Riconciliazione Avanzata
- [ ] Dashboard statistiche riconciliazione
- [ ] Alert per fatture non riconciliate > 30 giorni
- [ ] Report mensile automatico

### Operazioni da Confermare
- [ ] Notifiche push/email per nuove operazioni
- [ ] Bulk confirm per operazioni simili
- [ ] Storico conferme con audit trail

---

## 🟢 P2 - Media Priorità

### Performance
- [ ] Paginazione lazy load per liste lunghe
- [ ] Cache lato client per dati statici
- [ ] Ottimizzazione query MongoDB (indici)

### UX/UI
- [ ] Dark mode toggle
- [ ] Shortcuts tastiera
- [ ] Tour guidato per nuovi utenti

### Reportistica
- [ ] Export Excel per tutte le sezioni
- [ ] Dashboard KPI personalizzabile
- [ ] Grafici interattivi

---

## ⚪ P3 - Backlog / Futuro

### Integrazioni
- [ ] Collegamento con commercialista (export dati)
- [ ] API pubblica per integrazioni terze
- [ ] Webhook per eventi

### Mobile
- [ ] PWA con offline support
- [ ] App nativa (React Native)
- [ ] Notifiche push mobile

### AI Avanzato
- [ ] Previsioni acquisti basate su storico
- [ ] Suggerimenti automatici riconciliazione
- [ ] Analisi anomalie spese

### Multi-Azienda
- [ ] Supporto più sedi/punti vendita
- [ ] Consolidamento bilanci
- [ ] Permessi per ruolo

---

## Note per Sviluppo

### Vincoli da Rispettare
1. **Stili inline** - No CSS esterno
2. **MongoDB** - Escludere sempre `_id`
3. **Responsive** - Usare `useResponsive.js`
4. **API prefix** - Sempre `/api/`

### File di Riferimento
- Hook responsive: `/app/frontend/src/hooks/useResponsive.js`
- Esempio responsive: `/app/frontend/src/pages/LibroAllergeni.jsx`
- Riconciliazione: `/app/app/routers/accounting/riconciliazione_automatica.py`
- Ricette AI: `/app/app/routers/haccp_v2/ricette_web_search.py`

### Credenziali Test
- MongoDB: già configurato in `.env`
- Email Aruba: `ceraldigroupsrl@gmail.com`
- LLM: `EMERGENT_LLM_KEY` in `.env`
