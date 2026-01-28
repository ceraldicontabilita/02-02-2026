# Application ERP/Accounting - PRD

## Stato Aggiornato: 28 Gennaio 2026 - API Claude Implementata

---

## Problema Originale
Applicazione di contabilità per ristorante/azienda con richieste di audit, integrazioni e ottimizzazioni AI.

## Lavoro Completato in Questa Sessione

### API Claude - Assistente AI Contabile ✅ NUOVO

**Implementato:**
- **Backend**: `/api/claude/` con 4 endpoint:
  - `POST /chat` - Chat intelligente con contesto DB
  - `POST /analyze` - Analisi documenti (fattura, assegno, cedolino)
  - `POST /report` - Generazione report narrativi
  - `POST /categorize` - Categorizzazione automatica spese
  - `GET /status` - Stato API

- **Frontend**: Nuova pagina `/assistente-ai` con:
  - Chat interattiva con Claude Sonnet
  - 5 contesti selezionabili (Generale, Fatture, Bilancio, Dipendenti, Scadenze)
  - Quick questions preimpostate
  - Integrazione dati reali dal database

**Tecnologie:**
- `emergentintegrations` library con `EMERGENT_LLM_KEY`
- Modello: `claude-sonnet-4-5-20250929`
- Context injection dai dati MongoDB

### Pulizia Codice ✅
- Rimossi file obsoleti: `ImportUnificato.jsx`, `AIParserPage.jsx`
- Unificati in `ImportDocumenti.jsx`

### Test Funzionali ✅
- Eseguiti test reali sui calcoli (Dashboard, Corrispettivi, Prima Nota)
- Verificate relazioni dati (Assegni-Fatture, Dipendenti-Cedolini)
- Report: `/app/test_reports/iteration_6.json` - 96% successo

## Esclusioni (Richieste dall'Utente)
- ❌ Integrazione email reale per notifiche
- ❌ Esportazione bilancio XBRL

## Architettura Attuale

```
/app
├── app/routers/
│   ├── claude_api.py              # ✅ NUOVO - API Claude AI
│   ├── fiscalita_italiana.py      # Calendario + Notifiche
│   └── [altri router]
├── frontend/src/pages/
│   ├── AssistenteAI.jsx           # ✅ NUOVO - Chat Claude
│   ├── ImportDocumenti.jsx        # Import + AI Parser unificati
│   └── [altre pagine]
└── test_reports/
    ├── iteration_6.json           # Test funzionali backend
    └── audit_pagine.md
```

## API Claude - Endpoint

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/claude/status` | GET | Stato API e features |
| `/api/claude/chat` | POST | Chat con contesto DB |
| `/api/claude/analyze` | POST | Analisi singolo documento |
| `/api/claude/report` | POST | Genera report narrativo |
| `/api/claude/categorize` | POST | Categorizza transazione |

## Test Status

- **Iteration 6**: 96% backend (26/27 test, 1 skipped magazzino vuoto)
- **API Claude**: ✅ Testato con successo
- **Build Frontend**: ✅ Successo

## Backlog

### Completati ✅
- [x] Audit completo pagine
- [x] P1: Unificare Import + AI Parser
- [x] **API Claude per assistente contabile**
- [x] Pulizia file obsoleti
- [x] Test funzionali reali

### P2 - Media Priorità
- [ ] Estendere PageLayout ad altre pagine

### P3 - Backlog
- [ ] Migrazione fisica nomi collezioni MongoDB

## Integrazioni

| Servizio | Stato |
|----------|-------|
| MongoDB Atlas | ✅ Connesso |
| Odoo | ✅ Piano conti |
| **Claude Sonnet** | ✅ API Completa |
| OpenAPI.it | ✅ Sandbox |

---
*Aggiornato: 28 Gennaio 2026 - API Claude Implementata*
