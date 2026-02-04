# Azienda in Cloud ERP - PRD

## Stato: 4 Febbraio 2026 (Aggiornato - Revisione Grafica)

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | OpenAPI.it (SDI, XBRL), pypdf, PayPal, Claude Sonnet |
| Scheduler | APScheduler (HACCP, Email, Verbali) |

---

## CHANGELOG - 4 Febbraio 2026

### Fix Critici Backend
- ✅ `aruba_automation.py`: `auto_insert_prima_nota = False` - Fatture non vanno più automaticamente in Prima Nota
- ✅ `document_data_saver.py`: `stato = "in_attesa_conferma"` - Stato iniziale corretto
- ✅ `email_service.py`: Fix import `ExternalServiceError`
- ✅ Unificato collection `suppliers` → `fornitori` (13 file)

### Fix Sicurezza Python (strptime/split)
- ✅ `accounting_engine.py`: Try/except su strptime per date
- ✅ `attendance.py`: 3 fix su strptime
- ✅ `scadenzario_fornitori.py`: 3 fix su strptime
- ✅ `fiscalita_italiana.py`: 2 fix su strptime
- ✅ `aruba_automation.py`: 3 fix su split stringa vuota

### Fix Error Handling Backend
- ✅ `adr.py`: except generico → except Exception as e
- ✅ `attendance.py`: 2 fix except
- ✅ `bonifici_stipendi.py`: 2 fix except
- ✅ `cedolini_riconciliazione.py`: 4 fix except
- ✅ `dimissioni.py`: 3 fix except
- ✅ `documenti.py`: 3 fix except

### Fix insert_one MongoDB
- ✅ `accounting_engine.py`: insert_one(doc.copy())
- ✅ `contabilita_italiana.py`: insert_one(doc.copy())
- ✅ `inserimento_rapido.py`: insert_one(doc.copy())
- ✅ `ai_parser.py`: insert_one(doc.copy())

### Fix Frontend JSX
- ✅ `CentriCosto.jsx`: res.data || []
- ✅ `Fornitori.jsx`: 2 fix res.data || []
- ✅ `Documenti.jsx`: JSON.parse con try/catch
- ✅ `App.jsx`: Rimosse 16 icone duplicate dalla sidebar
- ✅ `verbali_email_logic.py`: Fix escape sequence

### Centralizzazione Utilities
- ✅ `lib/utils.js`: Aggiunti MESI, MESI_SHORT, MESI_FULL
- ✅ `lib/utils.js`: Aggiunti formatDateShort, formatEuroShort, formatEuroStr
- ✅ `components/StatCard.jsx`: Componente condiviso creato

### Nuova Pagina Learning Machine
- ✅ `LearningMachine.jsx`: Creata pagina centralizzata (~1081 righe)
- ✅ `main.jsx`: Aggiunta route /learning-machine
- ✅ `Dashboard.jsx`: Link aggiornato a /learning-machine

### Correzioni Dati Database
- ✅ Dipendente CF `DLMVCN59E09F839T`: Nome corretto "D'ALMA VINCENZO"
- ✅ Moscato Emanuele: Rimossa data_fine_contratto errata
- ✅ Aggiunti giustificativi: Festività Lavorata (FESL), Festività Non Lavorata (FESNL)
- ✅ Eliminate 741 presenze (02/2026-12/2026)

### Documentazione
- ✅ `REGOLE_CONTABILI.md`: Aggiunte regole import fatture XML
- ✅ `ISTRUZIONI_FATTURE_AUTOMATICHE.md`: Documentazione completa

### Revisione Grafica Completa (4 Feb 2026)
- ✅ **Allineamento Design System**: Unificati i colori primari a `#1e3a5f` / `#2d5a87`
- ✅ **pageLayoutStyle.js**: Aggiornati colori da `#1a365d` a `#1e3a5f`
- ✅ **Fornitori.jsx**: Rimosso gradiente viola (`#667eea/#764ba2`) → blu primario
- ✅ **Dashboard.jsx**: Rimosso gradiente viola → blu primario
- ✅ **LearningMachine.jsx**: Rimosso gradiente viola → blu primario
- ✅ **GestioneAssegni.jsx**: Allineato ai colori primari
- ✅ **AssistenteAI.jsx**: Allineato ai colori primari
- ✅ **CentriCosto.jsx**: Allineato ai colori primari
- ✅ **UtileObiettivo.jsx**: Allineato ai colori primari
- ✅ **RiconciliazioneUnificata.jsx**: Allineato ai colori primari
- ✅ **Commercialista.jsx**: Allineato ai colori primari
- ✅ **PianoDeiConti.jsx**: Allineato ai colori primari
- ✅ **OrdiniFornitori.jsx**: Allineato ai colori primari
- ✅ **IntegrazioniOpenAPI.jsx**: Allineato ai colori primari

---

## SCHEDULER ATTIVO

| Job | Frequenza | Descrizione |
|-----|-----------|-------------|
| `gmail_aruba_sync` | ogni 10 min | Sync fatture Gmail/Aruba |
| `verbali_email_scan` | ogni ora | Scan email per verbali/quietanze |
| `haccp_daily_routine` | 00:01 UTC | Auto-popolamento HACCP |

---

## REGOLE IMPORT FATTURE (CRITICHE)

### DIVIETI ASSOLUTI
- ❌ MAI scrivere in `prima_nota_cassa/banca` durante import XML
- ❌ MAI impostare `pagato=true` durante import
- ❌ MAI impostare `metodo_pagamento="bonifico"` automaticamente
- ❌ MAI caricare magazzino se `esclude_magazzino=true`

### OBBLIGHI
- ✅ SEMPRE `stato="in_attesa_conferma"` per fatture importate
- ✅ SEMPRE creare scadenza in `scadenziario_fornitori`
- ✅ SEMPRE salvare righe in `dettaglio_righe_fatture`
- ✅ Prima Nota SOLO dopo conferma utente

---

## PAGINE PRINCIPALI

### Ciclo Passivo
- `/fatture-ricevute` - Archivio fatture
- `/fornitori` - Anagrafica fornitori
- `/prima-nota` - Prima Nota Unificata

### Dipendenti
- `/dipendenti` - Gestione dipendenti
- `/attendance` - Presenze
- `/cedolini` - Buste paga
- `/saldi-ferie-permessi` - Saldi ferie/ROL

### Learning Machine
- `/learning-machine` - Dashboard centralizzata
  - Tab Fornitori & Keywords
  - Tab Pattern Assegni
  - Tab Classificazione Documenti

### Strumenti
- `/import-documenti` - Import documenti
- `/verifica-coerenza` - Controlli incrociati
- `/correzione-ai` - Correzione dati AI

---

## PROSSIMI TASK (Backlog)

### P1 - Alta Priorità
- [ ] Migliorare associazione automatica Assegno-Fattura
- [ ] Completare refactoring Attendance.jsx
- [ ] Upload massivo PDF in Import Documenti

### P2 - Media Priorità
- [ ] Correggere 2 cedolini con netto=0
- [ ] Report riconciliazione PayPal
- [ ] Indici MongoDB per performance

### P3 - Bassa Priorità
- [ ] Pulizia codice Learning da Fornitori.jsx (~600 righe)
- [ ] Pulizia codice Learning da GestioneAssegni.jsx (~200 righe)
- [ ] Revisione grafica completa

---

## FILE DI RIFERIMENTO

### Backend
- `/app/routers/fatture_module/import_xml.py` - Import fatture XML
- `/app/routers/fatture_module/pagamento.py` - Pagamento fatture
- `/app/services/aruba_automation.py` - Automazione Aruba
- `/app/routers/attendance.py` - API presenze

### Frontend
- `/frontend/src/App.jsx` - Navigazione principale
- `/frontend/src/pages/LearningMachine.jsx` - Learning Machine centralizzato
- `/frontend/src/lib/utils.js` - Utilities condivise
- `/frontend/src/components/StatCard.jsx` - Componente statistiche

### Documentazione
- `/memory/REGOLE_CONTABILI.md` - Regole contabili
- `/memory/ISTRUZIONI_FATTURE_AUTOMATICHE.md` - Istruzioni fatture
- `/memory/LOGICA_EMAIL_AUTOMAZIONE.md` - Logica email

---

**Ultimo aggiornamento:** 4 Febbraio 2026
