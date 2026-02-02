# Application ERP/Accounting - PRD

## Stato: 2 Febbraio 2026 - Aggiornato

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | Odoo, Claude Sonnet, OpenAPI.it, pypdf, PayPal |
| Scheduler | APScheduler (HACCP, Email, Verbali) |

---

## Completato ✅

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

### P0 (In Attesa Input Utente)
- **Riconciliazione PayPal**: Endpoint pronto (`POST /api/verbali-riconciliazione/riconcilia-estratto-conto-paypal`), in attesa del CSV/PDF estratto conto

### P1 (Prossimo)
- UI Frontend per caricare estratto conto PayPal (pulsante + modale)
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
