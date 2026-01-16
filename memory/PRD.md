# PRD - Azienda in Cloud ERP
## Schema Definitivo v2.5 - Aggiornato 16 Gennaio 2026

---

## 📋 ORIGINAL PROBLEM STATEMENT

L'utente richiede un'applicazione ERP completa per la gestione aziendale di un bar/pasticceria che include:
- Gestione contabilità (Prima Nota, Bilancio, F24)
- Gestione fatture (import XML, riconciliazione)
- Gestione magazzino e HACCP
- Gestione dipendenti e cedolini
- Dashboard analytics
- Integrazione con estratti conto bancari

---

## ✅ LAVORI COMPLETATI (16 Gennaio 2026)

### Correzioni Bug
1. **Bug "Vedi Fattura" in Prima Nota** - CORRETTO
   - Prima: Link navigava a `/fatture-ricevute?search=ID` (non trovava nulla)
   - Dopo: Link naviga a `/fatture-ricevute/:id` (dettaglio diretto)
   - File modificati: `PrimaNotaUnificata.jsx` lines 705-724
   - Aggiunto ricerca per ID in `/api/fatture-ricevute/archivio`

2. **Endpoint NotificheScadenze** - CORRETTO
   - Prima: Chiamava `/api/scadenzario/prossime` (404)
   - Dopo: Chiama `/api/scadenze/prossime` (funzionante)
   - File modificato: `NotificheScadenze.jsx` line 50

3. **Rotta /dashboard mancante** - CORRETTO
   - Aggiunta rotta esplicita `/dashboard` nel router
   - File modificato: `main.jsx` line 183

4. **Bug Centri di Costo ObjectId** - CORRETTO
   - Errore serializzazione `ObjectId` dopo `insert_many`
   - Usato `copy()` per evitare mutazione
   - File modificato: `accounting/centri_costo.py` line 130

### Pulizia File
- ❌ Eliminato: `EstrattoContoImport.jsx` (orfano)
- ❌ Eliminato: `ImportExport.jsx` (sostituito)

### Unificazione Pagine
- **Import Unificato**: Unificata la pagina `/import-unificato` con tutte le funzionalità di Import/Export
  - Drag & Drop con riconoscimento automatico tipo
  - Supporto ZIP e ZIP annidati
  - Upload in background
  - 11 tipi di documento supportati
  - Download template Excel

---

## 📊 PAGINE TESTATE E FUNZIONANTI (30+)

| Pagina | Rotta | Status | Note |
|--------|-------|--------|------|
| Dashboard | `/` e `/dashboard` | ✅ | Cards statistiche, dati real-time |
| Analytics | `/analytics` | ✅ | Grafici fatturato, cash flow |
| Prima Nota Banca | `/prima-nota/banca` | ✅ | Link "Vedi Fattura" corretto |
| Prima Nota Cassa | `/prima-nota/cassa` | ✅ | |
| Dettaglio Fattura | `/fatture-ricevute/:id` | ✅ | Navigazione da Prima Nota |
| Magazzino | `/magazzino` | ✅ | 500 prodotti, filtri |
| HACCP Temperature | `/haccp-temperature` | ✅ | Frigoriferi/Congelatori |
| HACCP Sanificazioni | `/haccp-sanificazioni` | ✅ | |
| HACCP Scadenze | `/haccp-scadenze` | ✅ | |
| HACCP Lotti | `/haccp-lotti` | ✅ | Tracciabilità |
| Riconciliazione | `/riconciliazione` | ✅ | 145 operazioni, tabs |
| Scadenze | `/scadenze` | ✅ | 17 scadenze, IVA |
| Fornitori | `/fornitori` | ✅ | 253 fornitori |
| Dipendenti | `/dipendenti` | ✅ | 27 dipendenti |
| Cedolini | `/cedolini` | ✅ | |
| Corrispettivi | `/corrispettivi` | ✅ | 3 corrispettivi |
| F24 | `/f24` | ✅ | 48 F24 |
| Bilancio | `/bilancio` | ✅ | Stato patrimoniale |
| Import Unificato | `/import-unificato` | ✅ | 11 tipi documento |
| Centri di Costo | `/centri-costo` | ✅ | 8 CDC |
| Cespiti & TFR | `/cespiti` | ✅ | 2 cespiti |
| Ricette | `/ricette` | ✅ | 154 ricette |
| Piano dei Conti | `/piano-dei-conti` | ✅ | 10 conti |
| Controllo Mensile | `/controllo-mensile` | ✅ | |
| Ordini Fornitori | `/ordini-fornitori` | ✅ | |

---

## 🔴 BUG ANCORA DA VERIFICARE/CORREGGERE

1. **Performance Riconciliazione Aruba** (P1)
   - La pagina `/riconciliazione/aruba` può essere lenta con molte fatture
   - Soluzione: Ottimizzare query, aggiungere paginazione

2. **Tracciabilità pagina standalone** (P2)
   - Rotta `/tracciabilita` restituisce 404
   - Backend esiste (`warehouse/tracciabilita.py`)
   - Necessita creazione pagina frontend o redirect a `/haccp-lotti`

---

## 📁 ARCHITETTURA FILE

```
/app
├── app/
│   ├── routers/
│   │   ├── accounting/centri_costo.py  # FIX ObjectId
│   │   ├── invoices/fatture_ricevute.py  # FIX ricerca ID
│   │   └── operazioni_da_confermare.py
│   └── services/
│       └── riconciliazione_smart.py
└── frontend/
    └── src/
        ├── main.jsx  # FIX rotta /dashboard
        ├── components/
        │   └── NotificheScadenze.jsx  # FIX endpoint
        └── pages/
            ├── PrimaNotaUnificata.jsx  # FIX link Vedi Fattura
            └── ImportUnificato.jsx  # REWRITTEN
```

---

## 🔮 TASK FUTURI (Backlog)

### P1 - Alta Priorità
- [ ] Integrazione Google Calendar per scadenze
- [ ] Ottimizzazione performance Riconciliazione Aruba

### P2 - Media Priorità
- [ ] Dashboard Analytics con drill-down
- [ ] Report PDF automatici via email
- [ ] Pagina Tracciabilità standalone

### P3 - Bassa Priorità
- [ ] Parsing parallelo file import
- [ ] Notifiche push browser

---

## 📊 DATABASE SCHEMA (Collections Principali)

| Collection | Descrizione |
|------------|-------------|
| `prima_nota_cassa` | Movimenti contabili cassa |
| `prima_nota_banca` | Movimenti contabili banca |
| `invoices` | Fatture ricevute |
| `estratto_conto_movimenti` | Movimenti bancari importati |
| `suppliers` | Anagrafica fornitori |
| `employees` | Anagrafica dipendenti |
| `warehouse_products` | Prodotti magazzino |
| `centri_costo` | Centri di costo |
| `scadenze` | Scadenze fiscali |
| `f24_models` | Modelli F24 |

---

## 🔧 TECH STACK

- **Frontend**: React 18, Vite, TailwindCSS, Recharts, Shadcn/UI
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB Atlas
- **Librerie**: PyMuPDF, APScheduler, pandas, xlsxwriter, weasyprint

---

## 📝 NOTE TECNICHE

1. **ObjectId MongoDB**: Sempre escludere `_id` nelle proiezioni o convertire a stringa
2. **Hot Reload**: Abilitato per frontend e backend
3. **API Prefix**: Tutti gli endpoint backend devono iniziare con `/api/`
4. **Collection Names**: Usare sempre `prima_nota_cassa`/`prima_nota_banca` (non `cash_movements`/`bank_movements`)
