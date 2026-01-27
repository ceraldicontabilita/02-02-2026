# Application ERP/Accounting - PRD

## Stato Aggiornato: 27 Gennaio 2026 - Sessione 3 (Audit Completo)

---

## Problema Originale
Applicazione di contabilità per ristorante/azienda con richieste di:
- Audit completo delle pagine con verifica endpoint, collezioni e calcoli
- Correzione dati giustificativi da PDF Libro Unico
- Integrazione Odoo e implementazione contabilità italiana completa
- Database detrazioni fiscali e calendario scadenze con notifiche

## Audit Completo Eseguito

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

### Collezioni MongoDB Verificate

| Collezione | Documenti | Stato |
|------------|-----------|-------|
| invoices | 3,856 | ✅ |
| fornitori | 268 | ✅ |
| assegni | 210 | ✅ |
| employees | 37 | ✅ |
| cedolini | 916 | ✅ |
| corrispettivi | 1,051 | ✅ |
| prima_nota_cassa | 1,428 | ✅ |
| estratto_conto_movimenti | 4,261 | ✅ |
| warehouse_inventory | 5,372 | ✅ |
| calendario_fiscale | 74 | ✅ |
| agevolazioni_fiscali | 13 | ✅ |

## Nuove Funzionalità Implementate

### Sistema Notifiche Scadenze Fiscali ✅ NEW

**Endpoint:**
- `GET /api/fiscalita/notifiche-scadenze?anno=YYYY&giorni=N`
  - Restituisce scadenze imminenti con livelli di urgenza:
    - **Critica** (≤3 giorni)
    - **Alta** (4-7 giorni)
    - **Normale** (>7 giorni)

- `POST /api/fiscalita/notifiche-scadenze/invia?scadenza_id=X&tipo_notifica=Y`
  - Tipi: `dashboard` (notifica in-app), `email` (prepara email)

**Frontend:**
- Alert visivo rosso per scadenze critiche in CalendarioFiscale
- Pulsante "Notifica" per ogni scadenza urgente
- Toast notifications con sonner

## Architettura Attuale

```
/app
├── app/
│   ├── db_collections.py           # ✅ 300+ costanti normalizzate
│   ├── routers/
│   │   ├── fiscalita_italiana.py   # ✅ + Notifiche scadenze
│   │   ├── accounting_engine.py    # Partita doppia
│   │   ├── contabilita_italiana.py # Bilanci CEE
│   │   └── employees/
│   │       └── giustificativi.py   # Saldi finali progressivi
├── frontend/src/pages/
│   ├── CalendarioFiscale.jsx       # ✅ + Alert scadenze critiche
│   ├── SaldiFeriePermessi.jsx      # Gestione ferie/ROL
│   ├── MotoreContabile.jsx         # Bilancio, SP, CE, Cespiti
│   └── Dashboard.jsx               # KPI principali
└── test_reports/
    ├── iteration_4.json            # 100% test passati
    └── audit_pagine.md             # Report audit completo
```

## Test Status

- **Iteration 4**: 100% (14/14 backend, frontend OK)
- **Bug trovati**: 0 critici
- **Calcoli verificati**: Tutti corretti

## Backlog

### Completati ✅
- [x] Audit completo pagine
- [x] Sistema notifiche scadenze
- [x] Verifica calcoli matematici
- [x] Verifica collezioni MongoDB

### P1 - Media Priorità
- [ ] Integrazione email reale per notifiche (richiede SMTP)
- [ ] Applicare PageLayout a Dashboard, GestioneAssegni

### P2 - Bassa Priorità
- [ ] Unificare ImportUnificato + AIParser
- [ ] Rinomina fisica collezioni MongoDB

## Integrazioni

| Servizio | Stato |
|----------|-------|
| MongoDB Atlas | ✅ Connesso |
| Odoo | ✅ Piano conti importato |
| Claude Sonnet | ✅ AI Parser |

---
*Aggiornato: 27 Gennaio 2026 - Post Audit Completo*
