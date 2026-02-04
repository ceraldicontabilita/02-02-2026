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

## Sessione 4 Febbraio 2026 - Correzioni Multiple

### COMPLETATO ✅

1. **Menu Riorganizzato**
   - Attendance spostato in Dipendenti
   - Saldi Ferie/ROL spostato in Dipendenti
   - Odoo rimosso dal menu e dal codice
   - AISP rimosso da OpenAPI Integrazioni

2. **Integrazione API Automotive** - Completata
   - Bottone "Aggiorna Dati Veicoli" nella toolbar Noleggio
   - Bottone "Aggiorna da Targa" nel dettaglio veicolo
   - Sezione OpenAPI nella modale di modifica

3. **Fix Fatture Non Associate Noleggio**
   - Endpoint corretto per formattare i dati correttamente

### IN CORSO 🔄

4. **Pagine con Dati Errati**
   - Bilancio: dati non filtrati per anno
   - Motore Contabile: UI non conforme
   - Piano dei Conti: dati mancanti
   - Cespiti: navigazione assente
   - Finanziaria: dati non reali
   - Chiusura Esercizio: dati non reali
   - Verifica Coerenza: dati errati
   - Commercialista: tutti i tab errati

5. **UI Non Conforme**
   - Classificazione Email: UI non coerente
   - Correzione AI: UI errata
   - Regole Contabili: non aggiornata

6. **Funzionalità Mancanti**
   - Import Documenti: upload PDF massivo + memorizzazione
   - Da Rivedere: 404 su processa email
   - PagoPA: pagina non funzionante

---

## Architettura

```
/app/
├── app/
│   ├── routers/           # Endpoint API
│   ├── services/          # Business logic
│   ├── parsers/           # Parser documenti
│   └── database.py        # Connessione MongoDB
└── frontend/
    └── src/
        ├── pages/         # Pagine React
        ├── components/    # Componenti riutilizzabili
        └── lib/utils.js   # Utility condivise
```

---

## Note Critiche

1. **Dati Reali**: Tutte le pagine devono mostrare SOLO dati dal database. Non usare dati mock.
2. **Filtri Anno**: Assicurarsi che ogni pagina rispetti il filtro anno selezionato.
3. **Consistenza UI**: Usare PageLayout e stili condivisi per uniformità.
