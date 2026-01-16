# PRD - Azienda in Cloud ERP
## Schema Definitivo v2.6 - Aggiornato 16 Gennaio 2026

---

## 📋 ORIGINAL PROBLEM STATEMENT

Applicazione ERP per gestione contabilità bar/pasticceria con:
- Gestione contabilità (Prima Nota, Bilancio, F24)
- Gestione fatture (import XML, riconciliazione)
- Gestione magazzino e HACCP
- Gestione dipendenti e cedolini
- Dashboard analytics
- MongoDB Atlas come database

---

## ✅ LAVORI COMPLETATI (16 Gennaio 2026)

### FASE 1: Correzioni Backend Critiche

#### 1. ObjectId Serialization Fix
**Problema**: `insert_one()` aggiunge `_id` (ObjectId) al dizionario originale, causando errori di serializzazione JSON.

**Soluzione**: Usato `.copy()` prima di ogni `insert_one()` in tutti i file:
- `/app/app/routers/ciclo_passivo_integrato.py` (12 insert corretti)
- `/app/app/routers/accounting/centri_costo.py`
- `/app/app/routers/accounting/riconciliazione_automatica.py`

**File modificati**:
```python
# PRIMA (BUG)
await db["collection"].insert_one(documento)

# DOPO (CORRETTO)
await db["collection"].insert_one(documento.copy())
```

#### 2. Controlli Atomici Duplicati
**Problema**: Insert senza verifica esistenza causavano duplicati.

**Soluzione**: Aggiunto controllo `find_one` prima di ogni `insert_one` critico:
- `/app/app/routers/operazioni_da_confermare.py` (righe 210-240, 663-680)

```python
# Esempio controllo duplicati
existing = await db["prima_nota_cassa"].find_one({"fattura_id": fattura_id})
if existing:
    return {"success": True, "duplicato_evitato": True}
await db["prima_nota_cassa"].insert_one(movimento.copy())
```

#### 3. Validazione Entità Collegate
**Problema**: Possibile associare entità inesistenti (es. driver_id a veicolo senza verificare che il dipendente esista).

**Soluzione**: Aggiunto controllo esistenza prima di associazione:
- `/app/app/routers/noleggio.py` (PUT veicoli/{targa})

```python
if data.get("driver_id"):
    dipendente = await db["employees"].find_one({"id": data["driver_id"]})
    if not dipendente:
        raise HTTPException(status_code=400, detail="Dipendente non trovato")
```

#### 4. Correzione Nome Collection
**BUG TROVATO DAL TESTING AGENT**: `noleggio.py` usava `db["dipendenti"]` (inesistente) invece di `db["employees"]`.

**Soluzione**: Corretto in `get_drivers()` e `update_veicolo()`.

### FASE 2: Correzioni Frontend

#### 1. Bug "Vedi Fattura" in Prima Nota
- Prima: Link navigava a `/fatture-ricevute?search=ID` (non trovava nulla)
- Dopo: Link naviga a `/fatture-ricevute/:id` (dettaglio diretto)

#### 2. Rotta /dashboard mancante
- Aggiunta rotta esplicita `/dashboard` nel router

#### 3. Endpoint NotificheScadenze
- Corretto da `/api/scadenzario/prossime` a `/api/scadenze/prossime`

### FASE 3: Pulizia e Unificazione
- Eliminato file orfano `EstrattoContoImport.jsx`
- Eliminato file orfano `ImportExport.jsx`
- Unificata pagina Import in `/import-unificato` con 11 tipi documento

---

## 📊 PAGINE TESTATE E FUNZIONANTI (40+)

| Pagina | Rotta | Status |
|--------|-------|--------|
| Dashboard | `/`, `/dashboard` | ✅ |
| Analytics | `/analytics` | ✅ |
| Prima Nota Banca/Cassa | `/prima-nota/banca`, `/prima-nota/cassa` | ✅ |
| Dettaglio Fattura | `/fatture-ricevute/:id` | ✅ |
| Magazzino | `/magazzino` | ✅ |
| HACCP (4 pagine) | `/haccp-*` | ✅ |
| Riconciliazione | `/riconciliazione` | ✅ |
| Scadenze | `/scadenze` | ✅ |
| Fornitori | `/fornitori` | ✅ |
| Dipendenti | `/dipendenti` | ✅ |
| Cedolini | `/cedolini` | ✅ |
| Corrispettivi | `/corrispettivi` | ✅ |
| F24 | `/f24` | ✅ |
| Bilancio | `/bilancio` | ✅ |
| Import Unificato | `/import-unificato` | ✅ |
| Centri di Costo | `/centri-costo` | ✅ |
| Cespiti & TFR | `/cespiti` | ✅ |
| Ricette | `/ricette` | ✅ |
| Piano dei Conti | `/piano-dei-conti` | ✅ |
| Controllo Mensile | `/controllo-mensile` | ✅ |
| Ordini Fornitori | `/ordini-fornitori` | ✅ |
| Archivio Bonifici | `/archivio-bonifici` | ✅ |
| Gestione Assegni | `/gestione-assegni` | ✅ |
| Calcolo IVA | `/iva` | ✅ |
| Liquidazione IVA | `/liquidazione-iva` | ✅ |
| Inventario | `/inventario` | ✅ |
| Ciclo Passivo | `/ciclo-passivo` | ✅ |
| Finanziaria | `/finanziaria` | ✅ |
| Documenti Email | `/documenti` | ✅ |
| Verifica Coerenza | `/verifica-coerenza` | ✅ |
| Area Commercialista | `/commercialista` | ✅ |
| Noleggio Auto | `/noleggio-auto` | ✅ |
| HACCP Ricezione | `/haccp-ricezione` | ✅ |
| Riconciliazione F24 | `/riconciliazione-f24` | ✅ |

---

## 🔧 ARCHITETTURA CORREZIONI

```
/app/app/routers/
├── ciclo_passivo_integrato.py  # 12 insert_one con .copy()
├── operazioni_da_confermare.py  # Controlli duplicati
├── noleggio.py                  # Validazione driver + fix collection
├── accounting/
│   ├── centri_costo.py         # .copy() per insert
│   ├── prima_nota_automation.py # {"_id": 0} nelle query
│   └── riconciliazione_automatica.py # {"_id": 0} nelle query
└── invoices/
    ├── invoices_main.py         # {"_id": 0} nelle query
    └── fatture_ricevute.py      # Ricerca per ID
```

---

## 📊 DATABASE SCHEMA (Collections)

| Collection | Descrizione | Note |
|------------|-------------|------|
| `invoices` | Fatture ricevute | NON `fatture` |
| `employees` | Dipendenti | NON `dipendenti` |
| `prima_nota_cassa` | Movimenti cassa | NON `cash_movements` |
| `prima_nota_banca` | Movimenti banca | NON `bank_movements` |
| `veicoli_noleggio` | Veicoli flotta | |
| `centri_costo` | Centri di costo | |
| `warehouse_stocks` | Magazzino prodotti | |

---

## 📋 TEST REPORTS

| Iterazione | Data | Risultato | Note |
|------------|------|-----------|------|
| 9 | 16/01/2026 | 22/22 ✅ | Riconciliazione Smart |
| 10 | 16/01/2026 | 8/8 ✅ | Import Unificato |
| 11 | 16/01/2026 | 10/10 ✅ | Pagine principali |
| 12 | 16/01/2026 | 16/16 ✅ | ObjectId + Cascata |

---

## 🔮 TASK FUTURI (Backlog)

### P1 - Alta Priorità
- [ ] Performance Riconciliazione Aruba (query lente)
- [ ] Pagina TFR (attualmente placeholder)

### P2 - Media Priorità
- [ ] Dashboard Analytics con drill-down
- [ ] Report PDF automatici via email
- [ ] Integrazione Google Calendar

### P3 - Bassa Priorità
- [ ] Parsing parallelo file import
- [ ] Pagina Tracciabilità standalone

---

## 🔧 TECH STACK

- **Frontend**: React 18, Vite, TailwindCSS, Recharts, Shadcn/UI
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB Atlas
- **Test**: pytest, Playwright
