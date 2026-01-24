# PRD – TechRecon Accounting System
## Product Requirements Document
### Ultimo aggiornamento: 24 Gennaio 2026 (Sessione 20 - Verifica Post-Refactoring)

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

### 5.1 ✅ COMPLETATO (Sessione 20 - 24/01/2026)
- **Verifica post-refactoring**: Analizzato report test iteration_33
- **Conferma architettura MongoDB-Only**: 0 riferimenti filesystem
- **Servizi attivi**: Backend, Frontend, MongoDB tutti funzionanti

### 5.2 🟠 P1 - In Attesa
1. **Estendere Learning Machine**
   - Replicare parsing automatico per **fatture** (attualmente solo cedolini)
   - Replicare parsing automatico per **F24**
   - Migliorare associazione F24 (campo `anno` non popolato)

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

---

## 7. FILE DI RIFERIMENTO

### 7.1 Backend
```
/app/app/main.py                              # Entry point
/app/app/routers/documenti.py                 # Documenti (MongoDB-only)
/app/app/routers/f24/                         # Modulo F24 completo
/app/app/routers/prima_nota_module/           # Prima Nota modularizzato
/app/app/routers/suppliers_module/            # Fornitori modularizzato
/app/app/services/                            # Servizi business logic
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

*Documento aggiornato il 24 Gennaio 2026 - Sessione 20*
