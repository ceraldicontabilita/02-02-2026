# Application ERP/Accounting - PRD

## Stato Aggiornato: 28 Gennaio 2026 - Sessione 4 (P1 Completato)

---

## Problema Originale
Applicazione di contabilità per ristorante/azienda con richieste di:
- Audit completo delle pagine con verifica endpoint, collezioni e calcoli
- Correzione dati giustificativi da PDF Libro Unico
- Integrazione Odoo e implementazione contabilità italiana completa
- Database detrazioni fiscali e calendario scadenze con notifiche

## Lavoro Completato in Questa Sessione

### P1: Unificazione Pagine Import ✅ COMPLETATO

**Problema**: Le pagine `/import-unificato` e `/ai-parser` erano separate, creando duplicazione di funzionalità.

**Soluzione**: Creata nuova pagina unificata `/import-documenti` con sistema a tabs:

| Tab | Funzionalità |
|-----|--------------|
| **Import Massivo** | Upload multiplo, drag & drop, estrazione ZIP, 13 tipi documento |
| **Lettura AI** | Parsing AI con Claude, visualizzatori per Fattura/F24/Busta Paga |

**File modificati**:
- `frontend/src/pages/ImportDocumenti.jsx` - NUOVO (combina ImportUnificato + AIParserPage)
- `frontend/src/main.jsx` - Aggiornate rotte e redirect
- `frontend/src/App.jsx` - Menu aggiornato

**Redirect configurati**:
- `/ai-parser` → `/import-documenti?tab=ai`
- `/import-unificato` → `/import-documenti`
- `/lettura-documenti` → `/import-documenti?tab=ai`

## Audit Precedente (Sessione 3)

### Pagine Verificate: 11/11 ✅

| Pagina | Endpoint | Collezioni | Calcoli |
|--------|----------|------------|---------|
| Dashboard | 11/11 ✅ | 5/5 ✅ | margine=ricavi-costi ✅ |
| GestioneAssegni | 4/4 ✅ | assegni (210) ✅ | - |
| GestioneDipendenti | 3/3 ✅ | employees (37) ✅ | - |
| ChiusuraEsercizio | 4/4 ✅ | - | bilancino ✅ |
| Finanziaria | 1/1 ✅ | - | balance=income-expenses ✅ |
| CalendarioFiscale | 2/2 ✅ | calendario_fiscale (74) ✅ | - |
| SaldiFeriePermessi | 2/2 ✅ | giustificativi_saldi_finali ✅ | - |
| Magazzino | 2/2 ✅ | warehouse_inventory (5372) ✅ | - |
| Corrispettivi | 1/1 ✅ | corrispettivi (1051) ✅ | totale=imp+iva ✅ |
| ArchivioFatture | 3/3 ✅ | invoices (3856) ✅ | statistiche ✅ |
| PrimaNota | 3/3 ✅ | prima_nota_cassa (1428) ✅ | saldo=ent-usc ✅ |

## Architettura Attuale

```
/app
├── app/
│   ├── db_collections.py           # Costanti collezioni MongoDB
│   ├── routers/
│   │   ├── fiscalita_italiana.py   # Calendario + Notifiche scadenze
│   │   ├── accounting_engine.py    # Partita doppia
│   │   └── contabilita_italiana.py # Bilanci CEE
├── frontend/src/pages/
│   ├── ImportDocumenti.jsx         # ✅ NUOVO - Import + AI Parser unificati
│   ├── CalendarioFiscale.jsx       # Scadenze fiscali con alert
│   ├── SaldiFeriePermessi.jsx      # Gestione ferie/ROL
│   ├── MotoreContabile.jsx         # Bilancio, SP, CE, Cespiti
│   └── Dashboard.jsx               # KPI principali
└── test_reports/
    ├── iteration_5.json            # 100% test passati (P1)
    ├── iteration_4.json            # 100% test passati (audit)
    └── audit_pagine.md             # Report audit completo
```

## Test Status

- **Iteration 5**: 100% frontend (7/7 features P1)
- **Iteration 4**: 100% (14/14 backend + frontend)
- **Bug trovati**: 0 critici
- **Calcoli verificati**: Tutti corretti

## Backlog

### Completati ✅
- [x] Audit completo pagine (Sessione 3)
- [x] Sistema notifiche scadenze (Sessione 3)
- [x] Verifica calcoli matematici (Sessione 3)
- [x] **P1: Unificare ImportUnificato + AIParser** (Sessione 4)

### P2 - Media Priorità
- [ ] Applicare PageLayout.jsx a Dashboard, GestioneAssegni, Corrispettivi
- [ ] Standardizzare UI con design system centralizzato

### P3 - Bassa Priorità
- [ ] Migrazione fisica nomi collezioni MongoDB (gestito via db_collections.py)
- [ ] Integrazione email reale per notifiche (richiede SMTP)

## Integrazioni

| Servizio | Stato |
|----------|-------|
| MongoDB Atlas | ✅ Connesso |
| Odoo | ✅ Piano conti importato |
| Claude Sonnet | ✅ AI Parser |

## Esclusioni
- ❌ Esportazione bilancio XBRL (richiesto dall'utente)
- ❌ Notifiche email (richiesto dall'utente)

---
*Aggiornato: 28 Gennaio 2026 - Task P1 Completato*
