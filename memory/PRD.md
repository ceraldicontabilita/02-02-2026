# PRD – TechRecon Accounting System
## Product Requirements Document
### Ultimo aggiornamento: 24 Gennaio 2026 (Sessione 23 - Automazione Completa Fatture)

---

## 1. PANORAMICA DEL SISTEMA

### 1.1 Obiettivo
Sistema ERP contabile per aziende italiane con:
- Conformità normativa italiana (fatturazione elettronica, F24, IVA)
- Riduzione errore umano tramite validazione automatica
- Tracciabilità completa di ogni operazione
- Scalabilità senza introdurre incoerenze
- **COMPLETATO**: Architettura MongoDB-Only per persistenza dati (0 riferimenti filesystem)
- **COMPLETATO**: Ricerca Globale funzionante (fatture, fornitori, prodotti, dipendenti)
- Interfaccia mobile-first per inserimenti rapidi

### 1.2 Stack Tecnologico
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas (**UNICA fonte di persistenza dati**)
- **Integrazioni**: InvoiceTronic (SDI), PagoPA, Email IMAP

### 1.3 ⚠️ ARCHITETTURA MONGODB-ONLY (COMPLETATA)
**REGOLA FONDAMENTALE**: Nessun file o dato deve essere salvato sul filesystem locale.
- ✅ Tutti i PDF salvati come Base64 nel campo `pdf_data` in MongoDB
- ✅ Endpoint di download leggono da `pdf_data`, NON da `filepath`
- ✅ Endpoint di eliminazione operano SOLO sul database
- ✅ **0 riferimenti** a `filepath` o `os.path` nel codice (verificato 24/01/2026)

---

## 2. REGOLE FONDAMENTALI

### 2.1 ⚠️ REGOLA CRITICA PER AGENTE
**L'agente DEVE SEMPRE:**
1. Spiegare cosa farà PRIMA di modificare il codice
2. Chiedere conferma all'utente
3. Non procedere automaticamente senza approvazione
4. Aggiornare questo PRD ad ogni modifica significativa

### 2.2 🔢 FORMATI ITALIANI (SENZA ECCEZIONI)

**📅 Date: formato GG/MM/AAAA**
- ✅ Corretto: `25/01/2026`
- ❌ SBAGLIATO: `2026-01-25` (ISO), `01/25/2026` (USA)
- Usare SEMPRE: `formatDateIT()` da `/src/lib/utils.js`

**💶 Valuta: formato € 0.000,00**
- ✅ Corretto: `€ 1.234,56`
- ❌ SBAGLIATO: `€ 1234.56`, `1,234.56`
- Usare SEMPRE: `formatEuro()` da `/src/lib/utils.js`

### 2.3 🎨 REGOLA STILE UI

**TUTTE LE PAGINE DEVONO SEGUIRE LO STILE DELLA DASHBOARD**

| Elemento | Specifica |
|----------|-----------|
| Font | Inter, system-ui, -apple-system |
| Sfondo | `#f0f2f5` (grigio chiaro) o `white` |
| Border-radius | `12px` per card, `8px` per elementi piccoli |
| Header | Gradiente blu navy (`#1e3a5f` → `#2d5a87`) |
| Card statistiche | Sfondo pastello (blu, verde, arancione, viola) |
| Padding | `16px 24px` per header, `20px` per card |
| Box-shadow | `0 1px 3px rgba(0,0,0,0.1)` |

---

## 3. MODULI IMPLEMENTATI

### 3.1 ✅ Core Contabilità
- Prima Nota Cassa e Banca
- Piano dei Conti italiano (27 conti)
- 15 regole contabili predefinite
- Validazione partita doppia automatica

### 3.2 ✅ Ciclo Passivo
- Import fatture XML (SDI)
- Validatori P0 bloccanti
- Riconciliazione con estratto conto
- Scadenzario fornitori

### 3.3 ✅ Gestione Dipendenti
- Anagrafica con flag `in_carico`
- Sistema Giustificativi (26 codici standard)
- Tab Saldo Ferie in Attendance
- Cedolini e TFR
- Presenze (timbrature, assenze, ferie)
- **Alert Limiti Giustificativi** (notifiche al 90% del limite)

### 3.4 ✅ Learning Machine - Classificazione Automatica
Il sistema classifica **automaticamente** documenti leggendo:
- Nome fornitore
- Descrizione linee fattura
- Keywords specifiche per bar/pasticceria (ATECO 56.10.30)

**38 Centri di Costo** configurati con regole fiscali.

#### Endpoint Learning Machine
- `/api/learning-machine/centri-costo` - Lista centri di costo
- `/api/learning-machine/riclassifica-fatture?anno=X` - Riclassifica automatica
- `/api/learning-machine/processa-quietanza-f24` - Processa F24 e riconcilia
- `/api/learning-machine/costo-personale-completo/{anno}` - Costo personale
- `/api/learning-machine/riepilogo-centri-costo/{anno}` - Riepilogo fiscale

### 3.5 ✅ F24
- Import da commercialista
- Riconciliazione con estratto conto
- Gestione quietanze
- Codici tributari

### 3.6 ✅ Gestione Magazzino Avanzata
- **Carico automatico da XML**: Parsing linee fattura
- **26 categorie merceologiche**
- **Distinta base (Ricette)**: Calcolo ingredienti proporzionale

---

## 4. STATO TEST (24 Gennaio 2026)

### Test Backend Iteration 33: 23/23 PASSATI (100%)

| Endpoint | Stato |
|----------|-------|
| GET /api/documenti/statistiche | ✅ VERIFIED |
| GET /api/documenti/lista | ✅ VERIFIED |
| GET /api/documenti/categorie | ✅ VERIFIED |
| GET /api/f24-public/models | ✅ VERIFIED |
| GET /api/quietanze-f24 | ✅ VERIFIED |
| GET /api/ricerca-globale?q=srl | ✅ VERIFIED |
| GET /api/dipendenti | ✅ VERIFIED |
| GET /api/invoices | ✅ VERIFIED |
| GET /api/suppliers | ✅ VERIFIED |
| GET /api/warehouse/products | ✅ VERIFIED |
| GET /api/prima-nota/cassa | ✅ VERIFIED |
| GET /api/prima-nota/banca | ✅ VERIFIED |
| GET /api/cedolini/riepilogo-mensile/{anno}/{mese} | ✅ VERIFIED |

---

## 5. BACKLOG E PRIORITÀ

### 5.0 ✅ COMPLETATO (Sessione 23 - 24/01/2026) - Upload AI + Chat Intelligente + Refactoring

**Parsing AI Automatico su Upload Diretto:**
- Nuovo servizio `/app/app/services/upload_ai_processor.py` per processing automatico
- Nuovo router `/api/upload-ai/` con 7 endpoint per F24, cedolini e fatture PDF
- F24: parsing + deduplicazione basata su data/CF/importo + salvataggio in `f24_unificato`
- Cedolini: parsing + identificazione dipendente + aggiornamento automatico progressivi (ferie, permessi, TFR)
- Fatture PDF: parsing + archivio temporaneo in `fatture_pdf_archivio` in attesa dell'XML corrispondente

**Logica Fatture PDF:**
- Le fatture PDF vengono parsate e archiviate in `fatture_pdf_archivio`
- Quando arriva un XML corrispondente, il PDF viene associato automaticamente
- Matching per: P.IVA + numero fattura OPPURE P.IVA + data + importo (con tolleranza)
- Evita duplicati: le fatture XML restano la "fonte di verità"

**Deduplicazione F24 Unificato (P0 RISOLTO):**
- Eliminati 250 duplicati (75% di riduzione)
- Da 333 a 83 documenti unici
- Zero duplicati rimanenti verificato

**Chat Intelligente (Learning Machine):**
- Nuovo servizio `/app/app/services/chat_intelligence.py`
- Nuovo router `/api/chat/` per interrogazione dati in linguaggio naturale
- Supporta domande su: fatture, F24, cedolini, dipendenti, fornitori, estratti conto, bilancio
- Interpreta automaticamente la domanda ed estrae parametri (anno, mese, fornitore)
- Endpoint: `POST /api/chat/ask`, `GET /api/chat/stats`, `GET /api/chat/help`

**P1 Completato - Classificazione Fatture 100%:**
- Classificate le ultime 6 fatture non classificate
- Totale: 3753/3753 fatture classificate (100%)

**P2 Completato - UI Correzione Dati AI:**
- Nuova pagina `/correzione-ai` per revisione documenti processati dall'AI
- Visualizzazione dati estratti, modifica manuale, assegnazione centro costo
- Filtri per tipo documento e ricerca

**Refactoring Sicuro:**
- Rimosso file obsoleto `PrimaNotaUnificata.jsx` (non referenziato)
- Pulizia cache Python e log vecchi
- Fix lint su nuovi file
- Verificato che tutti i file _v2 sono effettivamente utilizzati

**Integrazione con Upload XML:**
- Modificato `/app/app/routers/invoices/fatture_upload.py`
- Quando si carica un XML, il sistema cerca automaticamente PDF in archivio da associare

### 5.1 ✅ COMPLETATO (Sessione 22 - 24/01/2026) - Stabilizzazione + Parser AI

**Stabilizzazione:**
- Fix path duplicato `/api/centri-costo`
- Creato endpoint `/api/fornitori-learning/stats` per statistiche complete
- Completato widget Dashboard Learning Machine (fetch + JSX)
- Rimossi file obsoleti (FornitoriLearning.jsx, RiconciliazioneIntelligente.jsx)

**Parser AI Documenti (Claude Vision):**
- Estrazione automatica dati da Fatture PDF, F24, Buste Paga
- Aggiornamento automatico schede dipendenti da cedolino
- Integrazione automatica nel flusso download email
- Pagine UI: `/ai-parser`, `/da-rivedere`

**Stato Learning Machine:**
- Fornitori configurati: 214/322 (66.5%)
- Fatture classificate: 3309/3753 (88.2%)
- F24 classificati: 0/1 (0%)

### 5.1 ✅ COMPLETATO (Sessione 21 - 24/01/2026) - Learning Machine COMPLETA
- **Unificazione UI**: Tab "Learning Machine" in Fornitori, menu pulito senza duplicati
- **170 Fornitori configurati** con keywords e centri di costo
- **FATTURE: 1000/1000 classificate (100%)**
  - Riduzione "Altri costi" da ~780 a 0 (100% improvement)
  - Top centri: Materie prime (30%), Prodotti confezionati (16.4%), Bevande (10.4%)
- **F24: 43/43 classificati (100%)**
  - Mappatura codici tributo: IVA, IRES, IRAP, IMU, ritenute, INPS
  - Distribuzione: IRES (13), Commercialista (10), IVA (9), IRAP (4), Personale (3)
- **Endpoint Learning Machine**:
  - POST `/api/fornitori-learning/riclassifica-con-keywords`
  - POST `/api/fornitori-learning/classifica-f24`
  - GET `/api/fornitori-learning/f24-statistiche`
  - PUT `/api/fatture/{id}/classifica` (manuale)

### 5.2 ✅ COMPLETATO (Sessione 20 - 24/01/2026)
1. **Fix Associazione F24 - Campo Anno**
   - Modificato endpoint upload per estrarre automaticamente campo `anno`
   - Aggiunto endpoint `/api/f24-riconciliazione/fix-campo-anno` per correzione retroattiva
   - Aggiornato endpoint `/api/f24-public/models` per restituire `anno`, `data_versamento`
   - 43/46 F24 ora hanno il campo `anno` correttamente popolato

2. **Learning Machine per Fatture - COMPLETATA**
   - 3.643 fatture classificate automaticamente su 38 centri di costo
   - Riepilogo fiscale 2025: €524.867 imponibile, €452.701 deducibile IRES
   - Fix classificazione carburante: da 331 a **14 fatture** (solo fornitori reali)
   - Sistema fornitori noti per match prioritario su nome fornitore

**Distribuzione finale:**
   - Materie prime pasticceria: 936 (25.7%)
   - Altri costi non classificati: 914 (25.1%)
   - Prodotti confezionati: 698 (19.2%)
   - Noleggio auto: 228
   - Bevande: 221
   - Caffè: 198
   - Carburante: 14 ✅

3. **Sistema Fornitori Learning - COMPLETATO**
   - Backend `/api/fornitori-learning` con 7 endpoint
   - ~~Frontend `/fornitori-learning`~~ → **Integrato in `/fornitori?tab=learning`**
   - 44 fornitori configurati con ricerca web
   - 132 fatture riclassificate con keywords personalizzate
   - Endpoint suggerimenti automatici keywords dalle descrizioni fatture

### 5.3 🟠 P1 - In Attesa
1. **Configurare altri fornitori**
   - 100 fornitori ancora in "Da Configurare"
   - Usare tab Fornitori Learning per aggiungere keywords

2. **UI Gestione Documenti Non Associati**
   - ~780 fatture in "Altri costi non classificati" (dopo riclassificazione)
   - Implementare "proposte intelligenti" basate su Learning Machine

### 5.3 🟡 P2 - Backlog
1. **Refactoring Router Monolitici**
   - `documenti.py` (2354 righe)
   - `dipendenti.py` (2104 righe)
   - `riconciliazione_intelligente.py` (2107 righe)

2. **UI Gestione Documenti**
   - Interfaccia per documenti non associati
   - "Proposte intelligenti" per associazione

### 5.4 🟠 Issue Pendenti
- ~450 documenti in `documents_inbox` da associare (nuovi: 572, processati: 292)
- 6 F24 senza PDF

---

## 6. API PRINCIPALI

### 6.1 Dipendenti e Presenze
```
GET  /api/attendance/dashboard-presenze
POST /api/attendance/timbratura
GET  /api/giustificativi/dipendente/{id}/giustificativi
POST /api/giustificativi/valida-giustificativo
```

### 6.2 Documenti
```
GET  /api/documenti/statistiche
GET  /api/documenti/lista
GET  /api/documenti/{id}/download
POST /api/documenti/upload
```

### 6.3 F24
```
GET  /api/f24-public/models
GET  /api/f24-riconciliazione/dashboard
POST /api/f24-riconciliazione/commercialista/upload
GET  /api/quietanze-f24
```

### 6.4 Ricerca Globale
```
GET  /api/ricerca-globale?q={query}
```

### 6.5 Upload AI (Parsing Automatico)
```
POST /api/upload-ai/upload-f24              # Upload F24 con parsing AI
POST /api/upload-ai/upload-cedolino         # Upload cedolino con aggiornamento progressivi
POST /api/upload-ai/upload-fattura-pdf      # Upload fattura PDF (archivio)
POST /api/upload-ai/upload-documento        # Upload generico auto-detect
POST /api/upload-ai/upload-batch            # Upload multiplo
GET  /api/upload-ai/archivio-pdf            # Lista PDF in attesa XML
POST /api/upload-ai/archivio-pdf/{id}/associa  # Associazione manuale PDF→XML
```

---

## 7. FILE DI RIFERIMENTO

### 7.1 Backend
```
/app/app/main.py                              # Entry point
/app/app/routers/documenti.py                 # Documenti (MongoDB-only)
/app/app/routers/upload_ai.py                 # Upload AI con parsing automatico (NUOVO)
/app/app/routers/f24/                         # Modulo F24 completo
/app/app/routers/prima_nota_module/           # Prima Nota modularizzato
/app/app/routers/suppliers_module/            # Fornitori modularizzato
/app/app/services/upload_ai_processor.py      # Servizio processing upload AI (NUOVO)
/app/app/services/ai_document_parser.py       # Parser AI documenti (Claude Vision)
/app/app/services/                            # Altri servizi business logic
```

### 7.2 Frontend
```
/app/frontend/src/main.jsx                    # Routing
/app/frontend/src/pages/Dashboard.jsx
/app/frontend/src/pages/Documenti.jsx
/app/frontend/src/lib/utils.js                # formatDateIT, formatEuro
```

### 7.3 Test Reports
```
/app/test_reports/iteration_33.json           # Ultimo test (100% passato)
/app/memory/AUDIT_MONGODB_COMPLETO.md         # Audit architettura
```

---

## 8. CLAUSOLA FINALE

Questo PRD è vincolante. Ogni sviluppo futuro deve:
- Rispettare i validatori
- Non introdurre eccezioni silenziose
- Mantenere la tracciabilità completa
- Seguire lo stile UI della Dashboard
- **Salvare dati SOLO in MongoDB** (no filesystem)

---

*Documento aggiornato il 24 Gennaio 2026 - Sessione 21*
