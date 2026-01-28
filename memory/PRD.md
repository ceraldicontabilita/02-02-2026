# Application ERP/Accounting - PRD

## Stato Aggiornato: 28 Gennaio 2026 - Sessione 4 (Pulizia Completata)

---

## Problema Originale
Applicazione di contabilità per ristorante/azienda con richieste di:
- Audit completo delle pagine con verifica endpoint, collezioni e calcoli
- Correzione dati giustificativi da PDF Libro Unico
- Integrazione Odoo e implementazione contabilità italiana completa
- Database detrazioni fiscali e calendario scadenze con notifiche

## Lavoro Completato in Questa Sessione

### P1: Unificazione Pagine Import ✅ COMPLETATO

**Problema**: Le pagine `/import-unificato` e `/ai-parser` erano separate.

**Soluzione**: Creata pagina unificata `/import-documenti` con tabs:
- **Tab Import Massivo**: Upload multiplo, drag & drop, 13 tipi documento
- **Tab Lettura AI**: Parsing con Claude AI

**File eliminati**:
- ❌ `ImportUnificato.jsx` - RIMOSSO
- ❌ `AIParserPage.jsx` - RIMOSSO

**File creato**:
- ✅ `ImportDocumenti.jsx` - Combina entrambe le funzionalità

### P2: PageLayout (Parziale)

**Stato**: Due pagine già usano PageLayout:
- `CalendarioFiscale.jsx`
- `SaldiFeriePermessi.jsx`

**Note**: Le pagine principali (Dashboard, GestioneAssegni, Corrispettivi) hanno strutture complesse. Un refactoring completo richiederebbe test estensivi per evitare regressioni.

## Esclusioni (Richieste dall'Utente)
- ❌ Integrazione email reale per notifiche
- ❌ Esportazione bilancio XBRL

## Audit Precedente (Sessione 3)

### Pagine Verificate: 11/11 ✅

| Pagina | Endpoint | Collezioni | Calcoli |
|--------|----------|------------|---------|
| Dashboard | 11/11 ✅ | 5/5 ✅ | margine=ricavi-costi ✅ |
| GestioneAssegni | 4/4 ✅ | assegni (210) ✅ | - |
| GestioneDipendenti | 3/3 ✅ | employees (37) ✅ | - |
| ChiusuraEsercizio | 4/4 ✅ | - | bilancino ✅ |
| Finanziaria | 1/1 ✅ | - | balance ✅ |
| CalendarioFiscale | 2/2 ✅ | calendario_fiscale (74) ✅ | - |
| SaldiFeriePermessi | 2/2 ✅ | giustificativi_saldi_finali ✅ | - |
| Magazzino | 2/2 ✅ | warehouse_inventory (5372) ✅ | - |
| Corrispettivi | 1/1 ✅ | corrispettivi (1051) ✅ | totale ✅ |
| ArchivioFatture | 3/3 ✅ | invoices (3856) ✅ | statistiche ✅ |
| PrimaNota | 3/3 ✅ | prima_nota_cassa (1428) ✅ | saldo ✅ |

## Architettura Attuale

```
/app
├── frontend/src/pages/
│   ├── ImportDocumenti.jsx         # ✅ Import + AI Parser unificati
│   ├── CalendarioFiscale.jsx       # Usa PageLayout
│   ├── SaldiFeriePermessi.jsx      # Usa PageLayout
│   ├── Dashboard.jsx               # KPI principali
│   └── [altre pagine]
├── app/routers/
│   ├── fiscalita_italiana.py       # Calendario + Notifiche
│   └── [altri router]
└── test_reports/
    ├── iteration_5.json            # 100% test P1
    └── audit_pagine.md
```

## Test Status

- **Iteration 5**: 100% frontend (P1 unificazione import)
- **Iteration 4**: 100% backend + frontend (audit)
- **Build**: ✅ Successo

## Backlog

### Completati ✅
- [x] Audit completo pagine
- [x] Sistema notifiche scadenze in-app
- [x] P1: Unificare Import + AI Parser
- [x] Pulizia file obsoleti

### P2 - Bassa Priorità
- [ ] Estendere PageLayout ad altre pagine (richiede test approfonditi)

### P3 - Backlog
- [ ] Migrazione fisica collezioni MongoDB

## Integrazioni

| Servizio | Stato |
|----------|-------|
| MongoDB Atlas | ✅ Connesso |
| Odoo | ✅ Piano conti |
| Claude Sonnet | ✅ AI Parser |

---
*Aggiornato: 28 Gennaio 2026*
