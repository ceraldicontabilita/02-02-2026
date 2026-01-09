# 🗂️ SCHEMA RELAZIONALE - AZIENDA SEMPLICE ERP
# Aggiornato: 2026-01-09
# ================================================================================
# QUESTO FILE È L'INDICE DELL'APPLICAZIONE
# Prima di modificare qualcosa, LEGGI qui per sapere:
# - Dove andare
# - Cosa tocca cosa
# - Quali collection DB usa ogni pagina
# ================================================================================

## 📊 STRUTTURA RAPIDA

```
FRONTEND (React)                    BACKEND (FastAPI)                  DATABASE (MongoDB)
────────────────                    ─────────────────                  ──────────────────
/pages/*.jsx          ──API──>      /routers/*.py         ──DB──>      Collections
```

---

# 🔷 MODULO CONTABILITÀ

## Dashboard.jsx
- **File**: `/app/frontend/src/pages/Dashboard.jsx`
- **API chiamate**:
  - `GET /api/health` → verifica connessione
  - `GET /api/dashboard/kpi/{anno}` → KPI principali
  - `GET /api/scadenze/prossime` → scadenze imminenti
  - `GET /api/haccp/notifiche/count` → anomalie HACCP
  - `GET /api/volume-reale/{anno}` → volume affari reale
- **Collections DB**: Aggregazione da multiple collections
- **Dipendenze**: AnnoContext (filtro globale)
- **Se modifico qui**: Aggiornare anche widget correlati

## Fatture.jsx
- **File**: `/app/frontend/src/pages/Fatture.jsx`
- **Router backend**: `/app/app/routers/invoices/fatture_upload.py`
- **API chiamate**:
  - `GET /api/fatture` → lista fatture
  - `POST /api/fatture/upload` → carica XML
  - `PUT /api/fatture/{id}` → modifica
  - `DELETE /api/fatture/{id}` → elimina
- **Collections DB**: `invoices`, `suppliers`
- **Relazioni**:
  - → `PrimaNota` (genera movimenti contabili)
  - → `Fornitori` (crea/aggiorna anagrafiche)
  - → `IVA` (calcolo liquidazione)
- **Se modifico Fatture**: Verificare PrimaNota, Fornitori

## PrimaNota.jsx / PrimaNotaBanca.jsx / PrimaNotaCassa.jsx
- **File**: `/app/frontend/src/pages/PrimaNota*.jsx`
- **Router backend**: `/app/app/routers/accounting/prima_nota.py`
- **API chiamate**:
  - `GET /api/prima-nota/banca` → movimenti banca
  - `GET /api/prima-nota/cassa` → movimenti cassa
  - `POST /api/prima-nota/banca` → nuovo movimento
  - `POST /api/prima-nota/cassa` → nuovo movimento
- **Collections DB**: `prima_nota_banca`, `prima_nota_cassa`, `prima_nota_salari`
- **Relazioni**:
  - ← `Fatture` (riceve movimenti automatici)
  - ← `Corrispettivi` (sync incassi)
  - → `Bilancio` (dati per bilancio)
  - → `EstrattoContoImport` (riconciliazione)
- **Se modifico PrimaNota**: Verificare Bilancio, Riconciliazione

## PianoDeiConti.jsx
- **File**: `/app/frontend/src/pages/PianoDeiConti.jsx`
- **Router backend**: `/app/app/routers/accounting/piano_conti.py`
- **Collections DB**: `piano_conti`, `movimenti_contabili`, `regole_categorizzazione`
- **Relazioni**:
  - → `Fatture` (categorizzazione automatica)
  - → `Bilancio` (struttura conti)

## Corrispettivi.jsx
- **File**: `/app/frontend/src/pages/Corrispettivi.jsx`
- **Router backend**: `/app/app/routers/invoices/corrispettivi.py`
- **Collections DB**: `corrispettivi`
- **Relazioni**:
  - → `PrimaNotaCassa` (sync automatico)
  - → `IVA` (calcolo liquidazione)

---

# 🔷 MODULO BANCA

## EstrattoContoImport.jsx
- **File**: `/app/frontend/src/pages/EstrattoContoImport.jsx`
- **Router backend**: `/app/app/routers/bank/bank_statement_import.py`, `estratto_conto.py`
- **Collections DB**: `estratto_conto_movimenti`, `bank_statements`
- **Relazioni**:
  - → `PrimaNotaBanca` (riconciliazione movimenti)
  - → `ArchivioBonifici` (match bonifici)

## ArchivioBonifici.jsx
- **File**: `/app/frontend/src/pages/ArchivioBonifici.jsx`
- **Router backend**: `/app/app/routers/bank/archivio_bonifici.py`
- **API chiamate**:
  - `GET /api/archivio-bonifici/transfers` → lista bonifici
  - `POST /api/archivio-bonifici/upload` → carica PDF
  - `POST /api/archivio-bonifici/riconcilia` → riconciliazione batch
  - `GET /api/archivio-bonifici/download-zip/{year}` → export ZIP
  - `PATCH /api/archivio-bonifici/transfers/{id}` → aggiorna note
- **Collections DB**: `bonifici_transfers`
- **Relazioni**:
  - → `EstrattoContoImport` (riconciliazione)
  - → `Cedolini` (associazione stipendi)

## Assegni.jsx / GestioneAssegni.jsx
- **File**: `/app/frontend/src/pages/Assegni.jsx`, `GestioneAssegni.jsx`
- **Router backend**: `/app/app/routers/bank/assegni.py`
- **Collections DB**: `assegni`
- **Relazioni**:
  - → `PrimaNotaBanca` (incasso assegni)
  - ← `Fatture` (pagamento con assegno)

---

# 🔷 MODULO F24/TRIBUTI

## F24.jsx / RiconciliazioneF24.jsx
- **File**: `/app/frontend/src/pages/F24.jsx`, `RiconciliazioneF24.jsx`
- **Router backend**: `/app/app/routers/f24/*.py`
- **Collections DB**: `f24_models`, `f24_commercialista`, `quietanze_f24`, `f24_allegati`, `f24_alerts`
- **Relazioni**:
  - ← `Documenti` (ricezione F24 da email)
  - → `PrimaNotaBanca` (pagamento F24)

## LiquidazioneIVA.jsx / IVA.jsx
- **File**: `/app/frontend/src/pages/LiquidazioneIVA.jsx`, `IVA.jsx`
- **Router backend**: `/app/app/routers/accounting/liquidazione_iva.py`, `iva_calcolo.py`
- **Collections DB**: Aggregazione da `invoices`, `corrispettivi`
- **Relazioni**:
  - ← `Fatture` (IVA acquisti)
  - ← `Corrispettivi` (IVA vendite)

---

# 🔷 MODULO DIPENDENTI/PAGHE

## GestioneDipendenti.jsx
- **File**: `/app/frontend/src/pages/GestioneDipendenti.jsx`
- **Router backend**: `/app/app/routers/employees/dipendenti.py`
- **Collections DB**: `employees`
- **Relazioni**:
  - → `Cedolini` (calcolo stipendi)
  - → `TFR` (accantonamento)
  - → `ArchivioBonifici` (stipendi)

## Cedolini.jsx
- **File**: `/app/frontend/src/pages/Cedolini.jsx`
- **Router backend**: `/app/app/routers/cedolini.py`
- **API chiamate**:
  - `POST /api/cedolini/stima` → calcolo cedolino (con paga_oraria, ore_domenicali, malattia)
  - `GET /api/cedolini/lista` → storico cedolini
- **Collections DB**: `cedolini`, `employees`
- **Relazioni**:
  - ← `GestioneDipendenti` (dati anagrafici)
  - → `PrimaNotaSalari` (registrazione costi)
  - → `ArchivioBonifici` (associazione pagamenti)

## GestioneCespiti.jsx (include TFR)
- **File**: `/app/frontend/src/pages/GestioneCespiti.jsx`
- **Router backend**: `/app/app/routers/cespiti.py`, `tfr.py`
- **API chiamate**:
  - `GET /api/cespiti` → lista cespiti
  - `POST /api/cespiti` → nuovo cespite
  - `PUT /api/cespiti/{id}` → modifica
  - `DELETE /api/cespiti/{id}` → elimina (solo senza ammortamenti)
  - `GET /api/tfr/riepilogo/{anno}` → TFR dipendenti
  - `POST /api/tfr/acconti` → gestione acconti
- **Collections DB**: `cespiti`, `dipendenti` (campo acconti)
- **Relazioni**:
  - → `Bilancio` (ammortamenti)
  - → `GestioneDipendenti` (TFR)

---

# 🔷 MODULO HACCP

## HACCPDashboardV2.jsx
- **File**: `/app/frontend/src/pages/HACCPDashboardV2.jsx`
- **Router backend**: `/app/app/routers/haccp_v2/*.py`
- **Collections DB**: 
  - `temperature_positive` (frigoriferi)
  - `temperature_negative` (congelatori)
  - `sanificazione_schede`
  - `disinfestazione`
  - `chiusure`
  - `anomalie_haccp`
  - `lotti_produzione`
  - `manuale_haccp`
- **Pagine correlate**:
  - `HACCPFrigoriferiV2.jsx` → temperature_positive
  - `HACCPCongelatoriV2.jsx` → temperature_negative
  - `HACCPSanificazioniV2.jsx` → sanificazione_schede

---

# 🔷 MODULO MAGAZZINO

## Magazzino.jsx
- **File**: `/app/frontend/src/pages/Magazzino.jsx`
- **Router backend**: `/app/app/routers/warehouse/*.py`
- **Collections DB**: `products`, `warehouse_movements`, `lotti`
- **Relazioni**:
  - ← `Fatture` (carico merce)
  - → `Ricette` (composizione prodotti)
  - → `HACCP Lotti` (tracciabilità)

## DizionarioArticoli.jsx
- **File**: `/app/frontend/src/pages/DizionarioArticoli.jsx`
- **Router backend**: `/app/app/routers/warehouse/dizionario_articoli.py`
- **Collections DB**: `dizionario_articoli`
- **Relazioni**:
  - → `Fatture` (categorizzazione prodotti)
  - → `Magazzino` (anagrafica prodotti)

---

# 🔷 MODULO DOCUMENTI/EMAIL

## Documenti.jsx
- **File**: `/app/frontend/src/pages/Documenti.jsx`
- **Router backend**: `/app/app/routers/documenti.py`
- **API chiamate**:
  - `GET /api/documenti` → lista documenti
  - `POST /api/documenti/scarica-da-email` → download MANUALE (no auto!)
  - `GET /api/documenti/task/{id}` → stato download
  - `GET /api/documenti/lock-status` → verifica lock
- **Collections DB**: `documenti`
- **Relazioni**:
  - → `F24` (smistamento F24)
  - → `Fatture` (smistamento fatture)
  - → `BustePaga` (smistamento cedolini)
- **⚠️ IMPORTANTE**: Download email è MANUALE, non automatico!

## OperazioniDaConfermare.jsx
- **File**: `/app/frontend/src/pages/OperazioniDaConfermare.jsx`
- **Router backend**: `/app/app/routers/operazioni_da_confermare.py`
- **API chiamate**:
  - `GET /api/operazioni-da-confermare/lista` → lista
  - `POST /api/operazioni-da-confermare/sync-email` → sync MANUALE
  - `POST /api/operazioni-da-confermare/{id}/conferma` → conferma con metodo pagamento
- **Collections DB**: `operazioni_da_confermare`
- **Relazioni**:
  - → `PrimaNotaCassa` (se metodo=cassa)
  - → `PrimaNotaBanca` (se metodo=banca)
  - → `Assegni` (se metodo=assegno)

---

# 🔷 MODULO FORNITORI

## Fornitori.jsx
- **File**: `/app/frontend/src/pages/Fornitori.jsx`
- **Router backend**: `/app/app/routers/suppliers.py`
- **Collections DB**: `suppliers`
- **Relazioni**:
  - ← `Fatture` (creazione automatica)
  - → `Scadenze` (scadenziario pagamenti)

## Scadenze.jsx / ScadenzarioFornitori.jsx
- **File**: `/app/frontend/src/pages/Scadenze.jsx`
- **Router backend**: `/app/app/routers/scadenze.py`, `scadenzario_fornitori.py`
- **Collections DB**: `scadenze`, aggregazione da `invoices`
- **Relazioni**:
  - ← `Fatture` (date scadenza)
  - → `Dashboard` (widget scadenze)

---

# 🔷 MODULO ADMIN/SISTEMA

## Admin.jsx
- **File**: `/app/frontend/src/pages/Admin.jsx`
- **Router backend**: `/app/app/routers/admin.py`
- **API chiamate**:
  - `GET /api/admin/stats` → statistiche sistema
  - `POST /api/admin/trigger-import` → trigger import email
  - `DELETE /api/admin/reset/{collection}` → reset dati
- **Collections DB**: Tutte (per statistiche)

## VerificaCoerenza (Widget Dashboard)
- **File**: `/app/frontend/src/components/WidgetVerificaCoerenza.jsx`
- **Router backend**: `/app/app/routers/verifica_coerenza.py`
- **Collections DB**: Aggregazione da multiple
- **Verifica**: 
  - Fatture senza prima nota
  - Prima nota senza fattura
  - Movimenti non riconciliati

---

# 🔷 CONTEXT GLOBALI

## AnnoContext
- **File**: `/app/frontend/src/contexts/AnnoContext.jsx`
- **Componente**: `<AnnoSelector />`
- **Usato da**: TUTTE le pagine con dati annuali
- **Hook**: `useAnnoGlobale()`
- **Effetto**: Filtra dati per anno in tutte le pagine

---

# 🔷 ENDPOINTS DI SISTEMA

## Health & Lock
- `GET /api/health` → stato sistema + timestamp
- `GET /api/ping` → keep-alive leggero
- `GET /api/system/lock-status` → stato operazioni email in corso

---

# 📋 MAPPA COLLECTIONS MONGODB

```
COLLECTION                      USATA DA                                    RELAZIONI
─────────────────────────────────────────────────────────────────────────────────────────
invoices                        Fatture, PrimaNota, IVA, Bilancio           → suppliers, prima_nota
suppliers                       Fornitori, Fatture                          ← invoices
prima_nota_banca                PrimaNotaBanca, Bilancio                    ← invoices, estratto_conto
prima_nota_cassa                PrimaNotaCassa, Bilancio                    ← corrispettivi
prima_nota_salari               Cedolini                                    ← employees
corrispettivi                   Corrispettivi, IVA                          → prima_nota_cassa
employees                       Dipendenti, Cedolini, TFR                   → cedolini
cespiti                         Cespiti                                     → bilancio
assegni                         Assegni, GestioneAssegni                    → prima_nota_banca
bonifici_transfers              ArchivioBonifici                            → estratto_conto
estratto_conto_movimenti        EstrattoContoImport                         → prima_nota_banca
f24_commercialista              F24, RiconciliazioneF24                     → quietanze_f24
quietanze_f24                   F24                                         ← f24_commercialista
documenti                       Documenti                                   → fatture, f24
operazioni_da_confermare        OperazioniDaConfermare                      → prima_nota
temperature_positive            HACCPFrigoriferiV2                          -
temperature_negative            HACCPCongelatoriV2                          -
sanificazione_schede            HACCPSanificazioniV2                        -
products                        Magazzino, DizionarioArticoli               → lotti
piano_conti                     PianoDeiConti                               → movimenti_contabili
regole_categorizzazione         RegoleCategorizzazione                      → invoices
```

---

# 🚨 REGOLE IMPORTANTI

1. **DOWNLOAD EMAIL**: Mai automatico! Solo con pulsante manuale
2. **LOCK EMAIL**: Se `email_locked=true`, bloccare altre operazioni email
3. **ANNO GLOBALE**: Tutte le pagine devono usare `useAnnoGlobale()`
4. **ObjectId MongoDB**: MAI restituire `_id` nelle API, usare `{"_id": 0}`
5. **Prima di modificare**: Controllare le RELAZIONI in questo file

---

# 📝 TEMPLATE PER NUOVE PAGINE

```
## NuovaPagina.jsx
- **File**: `/app/frontend/src/pages/NuovaPagina.jsx`
- **Router backend**: `/app/app/routers/nuova_pagina.py`
- **API chiamate**:
  - `GET /api/nuova-pagina` → lista
  - `POST /api/nuova-pagina` → crea
- **Collections DB**: `nuova_collection`
- **Relazioni**:
  - ← Da dove riceve dati
  - → Dove invia dati
- **Se modifico qui**: Cosa altro devo controllare
```
