# Azienda in Cloud ERP - PRD

## Stato: 4 Febbraio 2026

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | OpenAPI.it (SDI, XBRL), pypdf, PayPal, Claude Sonnet |
| Scheduler | APScheduler (HACCP, Email, Verbali) |

---

## Correzioni Sessione 4 Febbraio 2026

### COMPLETATO ✅

1. **Menu Riorganizzato**
   - ✅ Attendance spostato in sezione Dipendenti (barra blu)
   - ✅ Saldi Ferie/ROL spostato in sezione Dipendenti  
   - ✅ Odoo rimosso dal menu e codice eliminato
   - ✅ AISP rimosso da OpenAPI Integrazioni

2. **Integrazione API Automotive** - Completata
   - ✅ Bottone "Aggiorna Dati Veicoli" nella toolbar Noleggio
   - ✅ Bottone "Aggiorna da Targa" nel dettaglio veicolo
   - ✅ Sezione OpenAPI nella modale di modifica

3. **Fix Endpoint e API**
   - ✅ Fatture Non Associate Noleggio - Formattazione dati corretta
   - ✅ DocumentiDaRivedere - Path API corretti (/api/ai-parser/da-rivedere)
   - ✅ PagoPA - Sostituito fetch con api per evitare problemi CORS
   - ✅ Saldi Ferie - Endpoint ora calcola dai dipendenti se non ci sono saldi salvati

4. **UI/UX**
   - ✅ IntegrazioniOpenAPI - Rimosso tab AISP, griglia a 2 colonne

---

## ANCORA DA FARE 🔄

### Pagine con Dati Non Reali (Richiedono dati nel DB)
- **Bilancio** - Filtro anno funziona, ma i dati potrebbero non essere completi
- **Motore Contabile** - UI da uniformare
- **Piano dei Conti** - Dati da popolare
- **Cespiti** - Navigazione e dati da completare
- **Finanziaria** - Verificare fonte dati
- **Chiusura Esercizio** - Endpoint funzionante, dati corretti
- **Verifica Coerenza** - Da verificare
- **Commercialista** - Da verificare

### UI Non Conforme
- **Classificazione Email** - Da uniformare
- **Correzione AI** - Da verificare
- **Regole Contabili** - Da aggiornare

### Funzionalità
- **Import Documenti** - Upload PDF massivo + memorizzazione

---

## Architettura

```
/app/
├── app/
│   ├── routers/           # Endpoint API
│   │   ├── invoices/      # Gestione fatture
│   │   ├── employees/     # Gestione dipendenti
│   │   ├── bank/          # Banca e assegni
│   │   └── accounting/    # Contabilità
│   ├── services/          # Business logic
│   ├── parsers/           # Parser documenti
│   └── database.py        # Connessione MongoDB
└── frontend/
    └── src/
        ├── pages/         # Pagine React
        ├── components/    # Componenti riutilizzabili
        │   ├── ui/        # Shadcn/UI components
        │   └── attendance/# Componenti attendance (refactored)
        └── lib/utils.js   # Utility condivise
```

---

## Note per Sviluppo Futuro

1. **Dati Reali**: Tutte le pagine devono mostrare SOLO dati dal database
2. **Filtri Anno**: Assicurarsi che ogni pagina rispetti il filtro anno selezionato
3. **Consistenza UI**: Usare PageLayout e stili condivisi da lib/utils.js
4. **API**: Usare sempre `api` (axios) invece di `fetch` per gestione automatica token e base URL
