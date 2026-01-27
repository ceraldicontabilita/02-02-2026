# Application ERP/Accounting - PRD

## Stato Aggiornato: 27 Gennaio 2026 - Sessione 2

---

## Problema Originale
Applicazione di contabilità per ristorante/azienda con molteplici richieste:
- Correzione dati giustificativi da PDF Libro Unico
- Bug parsing LIRE/EURO
- Logica progressiva per caricamenti buste paga
- Integrazione Odoo
- Implementazione contabilità italiana completa (cespiti, ammortamenti, bilanci CEE)
- Database detrazioni fiscali e calendario scadenze
- Frontend motore contabile
- Normalizzazione collezioni MongoDB

## Architettura Attuale

```
/app
├── backend/
│   └── .env                              # Credenziali MongoDB, Odoo, API keys
├── app/
│   ├── database.py                       # Connessione MongoDB e classe Collections
│   ├── db_collections.py                 # ✅ NORMALIZZATO: 300+ costanti
│   ├── routers/
│   │   ├── accounting_engine.py          # Motore partita doppia
│   │   ├── contabilita_italiana.py       # Cespiti, ammortamenti, bilanci CEE
│   │   ├── fiscalita_italiana.py         # ✅ Agevolazioni + Calendario scadenze
│   │   ├── odoo_integration.py           # Integrazione Odoo XML-RPC
│   │   ├── cedolini.py                   # ✅ Bug fix riepilogo mensile
│   │   └── employees/
│   │       └── giustificativi.py         # ✅ Saldi finali progressivi
│   └── parsers/
│       └── payslip_giustificativi_parser.py
├── frontend/
│   └── src/
│       ├── components/
│       │   └── PageLayout.jsx            # Layout standard
│       ├── pages/
│       │   ├── MotoreContabile.jsx       # ✅ Bilancio, SP, CE, Cespiti
│       │   ├── CalendarioFiscale.jsx     # ✅ NUOVO: Dashboard scadenze fiscali
│       │   ├── SaldiFeriePermessi.jsx    # ✅ NUOVO: Gestione ferie/ROL
│       │   ├── ImportUnificato.jsx       # ✅ Link a AI Parser
│       │   ├── AIParserPage.jsx          # ✅ Link a Import Unificato
│       │   └── Finanziaria.jsx           # ✅ Avviso anni senza dati
│       ├── App.jsx                       # ✅ Menu aggiornato
│       └── main.jsx                      # ✅ Routes aggiunte
└── test_reports/
    ├── iteration_2.json                  # 100% test passati
    └── iteration_3.json                  # 100% test passati
```

## Funzionalità Implementate (Sessione Corrente)

### 1. ✅ Normalizzazione Collezioni MongoDB
- File `db_collections.py` con 300+ costanti
- Documentazione collezioni deprecate
- Helper function `get_collection_by_entity()`

### 2. ✅ Bug Fix Cedolini (P0)
- Endpoint `/api/cedolini/riepilogo-mensile` corretto
- Fallback `$ifNull` per cedolini con solo campo `netto`
- Indicazione "dati_parziali" nella risposta

### 3. ✅ Sistema Fiscale Completo
- **13 agevolazioni fiscali** per SRL (crediti imposta, ACE, Patent Box)
- **74 scadenze fiscali** per anno (IVA, F24, IMU, dichiarazioni)
- Endpoint: `/api/fiscalita/agevolazioni`, `/api/fiscalita/calendario/{anno}`

### 4. ✅ Logica Foglio Dati Progressivo Giustificativi
- Collection `giustificativi_saldi_finali` per saldi separati
- Logica: usa sempre l'ultimo periodo letto come riferimento
- Endpoint: `/api/giustificativi/saldi-finali/{employee_id}`

### 5. ✅ Frontend Motore Contabile
- Nuova pagina `/motore-contabile` con 4 tab:
  - Bilancio di Verifica
  - Stato Patrimoniale (schema CEE)
  - Conto Economico
  - Registro Cespiti

### 6. ✅ Frontend Calendario Fiscale (NUOVO)
- Nuova pagina `/calendario-fiscale`:
  - KPI: Scadenze totali, Completate, Da completare, Prossime 7gg
  - Sezione "Scadenze Imminenti" con alert
  - Filtri per mese e stato
  - Tabella completa con azioni "Completa"
  - Codice colore per tipo scadenza (IVA, F24, IMU, etc.)

### 7. ✅ Frontend Saldi Ferie/Permessi (NUOVO)
- Nuova pagina `/saldi-ferie-permessi`:
  - KPI: Dipendenti, Con saldi, Senza saldi, Da Libro Unico
  - Tabella con colonne: Ferie, ROL, Ex-Fest, Permessi, Periodo
  - Pulsante "Dettagli" per storico progressivo
  - Modale "Modifica" per inserimento manuale saldi
  - Ricerca per nome dipendente

### 8. ✅ Link Bidirezionale Import
- ImportUnificato → AIParser (pulsante "Elabora con AI")
- AIParser → ImportUnificato (pulsante "Vai a Import Unificato")

### 9. ✅ Fix UX Finanziaria
- Avviso se nessun movimento per anno selezionato
- Suggerisce anno con più dati (2025)

## Menu Aggiornato

```
- Dashboard
- Inserimento Rapido
- Analytics
- Acquisti ▸
- Corrispettivi
- Banca & Pagamenti ▸
- Dipendenti ▸
- Fisco & Tributi ▸
- Magazzino ▸
- HACCP ▸
- Cucina ▸
- Contabilità ▸
    - Bilancio
    - Motore Contabile ⭐ NEW
    - Controllo Mensile
    - Piano dei Conti
    - Cespiti
    - Finanziaria
    - Chiusura Esercizio
    - Calendario Fiscale ⭐ NEW
- Scadenze
- To-Do
- Presenze
- Saldi Ferie/ROL ⭐ NEW
- Strumenti ▸
- Integrazioni ▸
```

## Backlog Prioritizzato

### P0 - Alta Priorità
- [x] ~~Normalizzazione collezioni MongoDB~~
- [x] ~~Bug fix cedolini~~
- [x] ~~Sistema fiscale~~
- [x] ~~Frontend motore contabile~~
- [x] ~~Frontend calendario fiscale~~
- [x] ~~Frontend saldi ferie/permessi~~

### P1 - Media Priorità
- [ ] Applicare PageLayout.jsx a pagine esistenti (Dashboard, GestioneAssegni, etc.)
- [ ] Export bilanci in formato XBRL
- [ ] Integrazione automatica F24 ↔ calendario scadenze

### P2 - Bassa Priorità
- [ ] Unificare completamente ImportUnificato + AIParser in una sola pagina
- [ ] Normalizzazione fisica collezioni MongoDB (rinomina effettiva)

## Integrazioni Attive

| Servizio | Stato | Note |
|----------|-------|------|
| MongoDB | ✅ | Collection normalizzate (costanti) |
| Odoo | ✅ | Piano conti + IVA importati |
| OpenAPI.it | ✅ | Sandbox mode |
| Claude Sonnet | ✅ | AI Parser via EMERGENT_LLM_KEY |

## Test Status
- Iteration 2 Backend: 100% (16/16 test passati)
- Iteration 3 Frontend: 100% (tutte le nuove pagine funzionanti)
- Report: `/app/test_reports/iteration_3.json`

## Note Tecniche Importanti

### MongoDB ObjectId
Sempre escludere `_id` nelle proiezioni:
```python
await db["collection"].find({}, {"_id": 0})
```

### Route Order in FastAPI
Le rotte specifiche PRIMA delle parametriche:
```python
@router.get("/calendario/scadenze-imminenti")  # PRIMA
@router.get("/calendario/{anno}")              # DOPO
```

### React API Calls
Usare sempre `api` da `../api`:
```javascript
import api from '../api';
const res = await api.get('/api/endpoint');
```

### Endpoint Dipendenti
L'endpoint è `/api/dipendenti` (non `/api/employees`):
```javascript
const res = await api.get('/api/dipendenti');
```

---
*Documento aggiornato il 27 Gennaio 2026 - Sessione 2*
