# Application ERP/Accounting - PRD

## Stato Aggiornato: 27 Gennaio 2026

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

## Architettura

```
/app
├── backend/
│   └── .env                         # Credenziali MongoDB, Odoo, API keys
├── app/
│   ├── database.py                   # Connessione MongoDB e classe Collections
│   ├── db_collections.py            # ✨ NORMALIZZATO: 300+ costanti per collezioni
│   ├── routers/
│   │   ├── accounting_engine.py     # Motore partita doppia base
│   │   ├── contabilita_italiana.py  # Cespiti, ammortamenti, bilanci CEE
│   │   ├── fiscalita_italiana.py    # ✨ Agevolazioni fiscali + Calendario scadenze
│   │   ├── odoo_integration.py      # Integrazione Odoo XML-RPC
│   │   └── employees/
│   │       └── giustificativi.py    # ✨ Saldi finali ferie/ROL progressivi
│   └── parsers/
│       └── payslip_giustificativi_parser.py  # Parser PDF Libro Unico
├── frontend/
│   └── src/
│       ├── components/
│       │   └── PageLayout.jsx       # Layout standard (da applicare)
│       ├── pages/
│       │   ├── MotoreContabile.jsx  # ✨ NUOVO: Bilancio, SP, CE, Cespiti
│       │   ├── ImportUnificato.jsx  # Link a AI Parser
│       │   ├── AIParserPage.jsx     # Link a Import Unificato
│       │   └── Finanziaria.jsx      # Avviso per anni senza dati
│       └── App.jsx                  # Menu aggiornato
└── test_reports/
    └── iteration_2.json             # 100% test passati
```

## Funzionalità Implementate (Sessione Corrente)

### 1. ✅ Normalizzazione Collezioni MongoDB
- File `/app/app/db_collections.py` con 300+ costanti
- Documentazione collezioni deprecate
- Helper function `get_collection_by_entity()`

### 2. ✅ Bug Fix Cedolini (P0)
- Endpoint `/api/cedolini/riepilogo-mensile` corretto
- Fallback `$ifNull` per cedolini con solo campo `netto`
- Indicazione "dati_parziali" nella risposta

### 3. ✅ Sistema Fiscale Completo
- **13 agevolazioni fiscali** per SRL (crediti imposta, ACE, Patent Box, etc.)
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
- Aggiunto al menu sotto "Contabilità"

### 6. ✅ Unificazione Pagine Import
- Link "Elabora con AI" in Import Unificato
- Link "Vai a Import Unificato" in AI Parser

### 7. ✅ Fix UX Finanziaria
- Avviso se nessun movimento per anno selezionato
- Suggerisce anno con più dati (2025)

## Backlog Prioritizzato

### P0 - Alta Priorità
- [ ] Applicare PageLayout.jsx a tutte le pagine (refactoring incrementale)
- [ ] Test integrazione con dati reali buste paga

### P1 - Media Priorità
- [ ] Frontend per saldi finali giustificativi
- [ ] Dashboard calendario scadenze fiscali
- [ ] Normalizzazione fisica collezioni MongoDB (rinomina)

### P2 - Bassa Priorità
- [ ] Unificare completamente ImportUnificato + AIParser
- [ ] Export bilanci in formato XBRL
- [ ] Integrazione F24 con calendario scadenze

## Integrazioni Attive

| Servizio | Stato | Note |
|----------|-------|------|
| MongoDB | ✅ | Collection normalizzate |
| Odoo | ✅ | Piano conti + IVA importati |
| OpenAPI.it | ✅ | Sandbox mode |
| Claude Sonnet | ✅ | AI Parser via EMERGENT_LLM_KEY |

## Test Status
- Backend: 100% (16/16 test passati)
- Frontend: 100% (tutte le pagine funzionanti)
- Report: `/app/test_reports/iteration_2.json`

## Note Tecniche Importanti

### MongoDB ObjectId
Sempre escludere `_id` nelle proiezioni:
```python
await db["collection"].find({}, {"_id": 0})
```

### Route Order in FastAPI
Le rotte parametriche devono venire DOPO le rotte specifiche:
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

---
*Documento aggiornato il 27 Gennaio 2026*
