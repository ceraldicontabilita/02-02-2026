# Application ERP/Accounting - PRD

## Stato: 3 Febbraio 2026 - Aggiornato (Sessione 2)

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | Odoo, Claude Sonnet, OpenAPI.it, OpenAPI Company, pypdf, PayPal |
| Scheduler | APScheduler (HACCP, Email, Verbali) |

---

## Completato ✅

### Fix Critico: Filtro Anno Fatture - RISOLTO (3 Feb 2026)
**PROBLEMA**: L'utente aveva importato 88 fatture per il 2026, ma il sistema ne mostrava solo 35.

**CAUSA RADICE IDENTIFICATA**: Le fatture provvisorie (importate da Aruba) usano il campo `data_documento` invece di `invoice_date`. Il filtro per anno cercava solo in `invoice_date`, escludendo le 88 fatture provvisorie.

**SOLUZIONE APPLICATA**:
- Modificato `/app/app/routers/public_api.py` per includere sia `invoice_date` che `data_documento` nel filtro anno
- Modificato `/app/app/routers/invoices/invoices_main.py` con la stessa logica
- Aggiunto ordinamento intelligente che usa `data_effettiva = ifNull(invoice_date, data_documento)`
- Aggiornata anche la funzione `get_anni_disponibili` per estrarre anni da entrambi i campi

**RISULTATO**: La pagina Fatture Ricevute ora mostra correttamente 123 fatture per il 2026:
- 88 fatture provvisorie (da Aruba)
- 35 fatture complete (XML)

### Sistema Verifica Associazioni Assegni - NUOVO (3 Feb 2026)
Creati endpoint per analisi automatica delle associazioni assegno-fattura:
- `GET /api/assegni/verifica-associazioni` - Analizza tutte le associazioni
- `PUT /api/assegni/correggi-associazione/{id}` - Corregge manualmente
- Identifica: importi diversi, fornitori non corrispondenti, fatture mancanti
- **Nota**: L'utente preferisce che l'associazione sia automatica al caricamento estratti conto

### Cedolini Problematici - CORRETTI (3 Feb 2026)
- Creati endpoint `/api/cedolini/correggi-problematici` e `/api/cedolini/problematici`
- **128 cedolini corretti** su 130 trovati (2 con importi troppo bassi)
- Il sistema calcola automaticamente netto da lordo usando aliquote standard
- Cedolini con `netto=0` e `lordo>0` ora hanno valori corretti

### Refactoring Attendance.jsx - PARZIALE (3 Feb 2026)
- Estratte costanti in `/app/frontend/src/components/attendance/constants.js`
- Estratte funzioni helper in `/app/frontend/src/components/attendance/helpers.js`
- Ridotta duplicazione codice in `Attendance.jsx`
- **Nota**: Il refactoring completo (estrazione componenti TurniSection, TabSaldoFerie) è in backlog

### Integrazione UI API Automotive - COMPLETATA (4 Feb 2026)
Aggiunta interfaccia frontend nella sezione "Noleggio Auto" per aggiornare dati veicoli da targa.

**Funzionalità:**
- Bottone **"Aggiorna Dati Veicoli"** nella toolbar per aggiornamento massivo di tutti i veicoli
- Bottone **"Aggiorna da Targa"** nel dettaglio veicolo per aggiornamento singolo
- Sezione **"Dati da OpenAPI Automotive"** nella modale di modifica con:
  - Bottone "Cerca Dati" per preview dati
  - Visualizzazione marca, modello, anno, alimentazione, potenza, cilindrata
  - Bottone "Applica questi dati" per aggiornare il veicolo

**File modificati:**
- `/app/frontend/src/pages/NoleggioAuto.jsx` - Aggiunta integrazione OpenAPI

**Endpoint backend già esistenti:**
- `GET /api/openapi-automotive/info/{targa}` - Preview dati veicolo
- `POST /api/openapi-automotive/aggiorna-veicolo` - Aggiorna singolo veicolo
- `POST /api/openapi-automotive/aggiorna-bulk` - Aggiornamento massivo

### Gestione Assegni - Filtro Anno e Ordinamento - COMPLETATO (2 Feb 2026)
- Ordinamento assegni per numero decrescente (dal più recente al più vecchio)
- Filtro per anno selezionato (2024-2026)
- Backend: `GET /api/assegni?anno=2025`

### Assistente AI - Query Specifiche - COMPLETATO (2 Feb 2026)
- L'assistente ora risponde correttamente a domande specifiche come "Quante fatture mese gennaio 2026?"
- Recupera dati reali dal database MongoDB
- Supporta query su: fatture, corrispettivi, dipendenti per periodo
- Risposta esempio: "Nel mese di gennaio 2026 sono state registrate 35 fatture per €6.623,65"

### Fornitori - Aggiornamento Bulk OpenAPI - COMPLETATO (2 Feb 2026)
- Nuovo bottone "Aggiorna da OpenAPI" nella toolbar fornitori
- Aggiorna tutti i fornitori con P.IVA valida in un click
- Recupera: ragione sociale, indirizzo, PEC, SDI, ATECO

### OpenAPI Company - Visure Aziendali - COMPLETATO (2 Feb 2026)
Integrazione completa con l'API OpenAPI.com Company per recuperare dati aziendali.

**Funzionalità:**
- Ricerca aziende per Partita IVA (dati completi: sede, PEC, SDI, ATECO, fatturato, dipendenti)
- Pagina dedicata `/visure` con interfaccia intuitiva
- Bottone "Auto" nella modale fornitore per caricare dati automaticamente
- Salvataggio diretto in anagrafica fornitori

**Endpoint Backend:**
- `GET /api/openapi-imprese/status` - Verifica connessione API
- `GET /api/openapi-imprese/info/{piva}` - Info azienda (start/advanced/full)
- `GET /api/openapi-imprese/pec/{piva}` - PEC azienda
- `GET /api/openapi-imprese/sdi/{piva}` - Codice SDI
- `GET /api/openapi-imprese/cerca` - Ricerca per nome
- `POST /api/openapi-imprese/aggiorna-fornitore` - Aggiorna/crea fornitore
- `POST /api/openapi-imprese/aggiorna-bulk` - Aggiornamento massivo

**File:**
- `/app/app/services/openapi_company.py` - Client API
- `/app/app/routers/openapi_imprese.py` - Router endpoint
- `/app/frontend/src/pages/Visure.jsx` - Pagina frontend

**Token configurato:** `OPENAPI_COMPANY_TOKEN` in `.env`

### Logica Contratti Scaduti - COMPLETATO (2 Feb 2026)
Implementata la gestione automatica del ciclo di vita dei dipendenti con contratto scaduto.

**Funzionalità:**
- I dipendenti con `data_fine_contratto` mostrano "X" (Cessato) per i giorni successivi
- I dipendenti non appaiono più nella lista nei mesi successivi alla scadenza
- Lo stato "Cessato" non è modificabile (celle disabilitate)

**Funzioni Frontend:**
- `isDipendenteCessato(employee, dateStr)` - Verifica se cessato in una data
- `isDipendenteVisibileNelMese(employee, anno, mese)` - Filtra dipendenti per mese

**Testato con:** Emanuele Moscato (contratto 17/01/2026) - ✅ PASS

### Ore Settimanali per Dipendente - COMPLETATO (2 Feb 2026)
Aggiunta possibilità di modificare le ore settimanali nella sezione Turni.

**Funzionalità:**
- Sezione "Dettagli Contratto" visibile cliccando su un dipendente nei turni
- Mostra: Ore Settimanali, Tipo Contratto, Livello, Mansione
- Modifica inline cliccando su "✏️ modifica"
- Salvataggio immediato via `PUT /api/dipendenti/{id}`

### Riconciliazione PayPal - COMPLETATO (2 Feb 2026)
Implementata riconciliazione automatica tra pagamenti PayPal e fatture ricevute.

**Funzionalità:**
- Parsing estratti conto PayPal (CSV/PDF)
- Matching automatico pagamenti ↔ fatture per importo e fornitore
- Aggiornamento metodo pagamento a "PayPal"
- Creazione movimenti in Prima Nota Banca
- UI dedicata: `/riconciliazione-paypal`

**Endpoint:**
- `POST /api/fatture-ricevute/riconcilia-paypal` - Esegue riconciliazione
- `GET /api/fatture-ricevute/lista-paypal` - Lista fatture PayPal

**Risultati:**
- 23 fatture riconciliate
- €3.492,02 totale pagamenti PayPal
- 8 servizi senza fattura (Spotify, Adobe, etc.)

### Presenze Default "Presente" - COMPLETATO (2 Feb 2026)
Aggiunto bottone "Tutti Presenti" nella pagina Attendance.

**Funzionalità:**
- Un click imposta tutti i giorni lavorativi come "Presente"
- Salta automaticamente weekend
- Salta giorni con stato già assegnato
- Nuovi stati: "Chiuso" (CH), "Riposo Settimanale" (RS)
- Rimosso: Smart Working
- Endpoint: `POST /api/attendance/imposta-tutti-presenti`

### Gestione Turni per Mansione - COMPLETATO (2 Feb 2026)
Nuovo tab "Gestione Turni" nella pagina Presenze.

**Funzionalità:**
- Lista mansioni: Camerieri, Cucina, Bar, Cassa, Pulizie
- Assegnazione dipendenti a mansioni
- Visualizzazione dettagli contratto (ore settimanali, tipo contratto)
- Modal "Aggiungi Dipendenti" per assegnazione rapida

**Endpoint:**
- `GET /api/attendance/turni` - Lista turni per mese
- `POST /api/attendance/turni/assegna` - Assegna dipendente
- `DELETE /api/attendance/turni/rimuovi` - Rimuovi dal turno

### Import PayPal in Import Documenti - COMPLETATO (2 Feb 2026)
Aggiunto tipo documento "Estratto PayPal" nella pagina Import Documenti.

**Funzionalità:**
- Upload CSV o PDF di estratti conto PayPal
- Riconciliazione automatica con fatture
- Endpoint: `POST /api/fatture-ricevute/import-paypal`

### Scheduler Email Verbali - COMPLETATO (1 Feb 2026)
Lo scan automatico delle email per verbali è ora schedulato:

- **Frequenza**: Ogni ora (intervallo configurabile)
- **Logica prioritaria**:
  1. FASE 1: Cerca documenti per completare verbali SOSPESI (quietanze, PDF)
  2. FASE 2: Aggiunge nuovi verbali trovati nelle email

**Endpoint per controllo:**
- `GET /api/verbali-riconciliazione/scheduler-status` - Mostra stato scheduler e prossima esecuzione
- `POST /api/verbali-riconciliazione/scan-email` - Trigger manuale scan

**File modificati:**
- `/app/app/scheduler.py` - Aggiunto job `verbali_email_scan`
- `/app/app/main.py` - Avvio scheduler all'avvio dell'app

### Normalizzazione Endpoint Notifications - COMPLETATO (1 Feb 2026)
L'endpoint `/api/notifications` era protetto da autenticazione non attiva. Ora funziona:

- `GET /api/notifications` - Lista tutte le notifiche
- `GET /api/notifications/unread-count` - Conteggio non lette
- `POST /api/notifications/mark-all-read` - Segna tutte come lette
- `DELETE /api/notifications/{id}` - Elimina notifica

### Automazione Verbali da Fatture XML - COMPLETATO (1 Feb 2026)
Quando una fattura XML di un noleggiatore (ALD, Leasys, Arval, etc.) viene caricata:

1. **Estrae automaticamente** numero verbale e targa dalla descrizione
2. **Trova il veicolo** associato alla targa
3. **Trova il driver** associato al veicolo
4. **Crea record verbale** con tutti i dati collegati
5. **Crea voce costo dipendente** per addebitare al driver

**Flusso implementato:**
```
Vigile → Verbale su auto noleggio
         ↓
Noleggiatore → Richiesta info targa → Comunica "Ceraldi Group"
         ↓
Noleggiatore → Emette fattura XML ri-notifica
         ↓
SISTEMA AUTOMATICO:
  ├── Estrae: numero verbale, targa, data, importo
  ├── Trova: veicolo → driver → contratto
  ├── Crea: record verbale collegato
  └── Crea: voce costo dipendente
```

**File creato:** `/app/app/services/verbali_automation.py`
**File modificato:** `/app/app/routers/invoices/fatture_upload.py`

### Automazione Prima Nota - COMPLETATO (31 Gen 2026)
- **Fatture XML**: Upload crea automaticamente movimento in Prima Nota Banca/Cassa
- **Buste Paga**: Upload crea/collega movimento in Prima Nota Salari

### UI Responsive Cedolini - COMPLETATO (31 Gen 2026)
- Mobile: Dropdown mesi + card layout
- Desktop: Tab grid + tabella

### Pagina Prima Nota Salari - COMPLETATO (31 Gen 2026)
- 688 records visualizzati
- Totali corretti (€169.950 buste, €207.246 bonifici)

---

## API Principali

### Verbali
- `POST /api/verbali-riconciliazione/automazione-completa` - Esegue associazione completa su tutti i verbali
- `POST /api/verbali-riconciliazione/crea-prima-nota-verbale/{numero}` - Crea scrittura Prima Nota per verbale
- `GET /api/verbali-riconciliazione/per-driver/{driver_id}` - Lista verbali per driver
- `GET /api/verbali-riconciliazione/per-veicolo/{targa}` - Lista verbali per targa

### Fatture (con automazione verbali)
- `POST /api/fatture/upload-xml` - Upload fattura XML (se noleggiatore → estrae verbali automaticamente)

### Cedolini
- `GET /api/cedolini?anno=2025&mese=5`
- `POST /api/employees/paghe/upload-pdf` - Upload con automazione Prima Nota Salari

---

## Collections MongoDB

### verbali_noleggio
```javascript
{
  numero_verbale: "T26020100001",
  targa: "GE911SC",
  data_verbale: "2026-01-15",
  veicolo_id: "auto_ge911sc",
  driver: "CERALDI VALERIO",
  driver_id: "d92c4d97-...",
  fattura_id: "...",
  importo_rinotifica: 40.0,
  stato: "identificato" // da_scaricare|salvato|fattura_ricevuta|pagato|riconciliato|identificato
}
```

### costi_dipendenti
```javascript
{
  dipendente_id: "d92c4d97-...",
  dipendente_nome: "CERALDI VALERIO",
  tipo: "verbale",
  categoria: "Verbali/Multe",
  importo: 40.0,
  verbale_id: "T26020100001",
  targa: "GE911SC"
}
```

---

## Da Completare

### P1 (Prossimo)
- **Report Riconciliazioni PayPal**: Creare report/export nella pagina `/riconciliazione-paypal`
- **Test Upload PayPal**: Testare l'upload di nuovi estratti conto via UI
- **Assistente AI via WhatsApp/Telegram**: Integrazione chat per comandi rapidi (richiesta utente)
- Dashboard verbali per dipendente con totali

### P2 (Backlog)
- ~17 cedolini che falliscono il parsing
- Test E2E automatizzati
- Export Excel/CSV verbali per dipendente
- Ottimizzazione indici MongoDB

---

## Scheduler Automatici
| Job | Frequenza | Descrizione |
|-----|-----------|-------------|
| `haccp_daily_routine` | 00:01 UTC | Auto-popolamento schede HACCP + controllo anomalie |
| `gmail_aruba_sync` | Ogni 10 min | Sync fatture da Gmail/Aruba |
| `verbali_email_scan` | Ogni ora | Scan email per verbali e quietanze |

---

## Test
- Build: ✅ OK
- Automazione Fatture XML: ✅ PASS
- Automazione Verbali: ✅ PASS (testato con fattura ALD)
- Associazione Driver: ✅ PASS
- Costo Dipendente: ✅ PASS
- UI Responsive: ✅ PASS
- Scheduler Verbali: ✅ PASS
- Endpoint Notifications: ✅ PASS
