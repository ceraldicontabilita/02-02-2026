# PRD – TechRecon Accounting System
## Product Requirements Document (PRD)
## TechRecon Accounting System – Versione Super Articolata
### Ultimo aggiornamento: 20 Gennaio 2026

---

## 🔒 REGOLA FONDAMENTALE: PERSISTENZA DATI CRITICI

**I DATI CRITICI (VERBALI, BOLLI, RIPARAZIONI) DEVONO ESSERE SEMPRE PERSISTITI NEL DATABASE**

### Problema Risolto:
I dati estratti dalle fatture venivano calcolati "al volo" senza essere salvati, causando perdita di dati tra sessioni diverse.

### Soluzione Implementata:
- **Collection `costi_noleggio`**: Salva tutti i costi critici (verbali, bolli, riparazioni, costi_extra)
- **Collection `veicoli_noleggio`**: Salva i dati dei veicoli (targa, driver, fornitore, date noleggio)
- **Collection `audit_noleggio`**: Traccia tutte le modifiche per audit trail

### API per Gestione Dati:
- `POST /api/noleggio/migra-dati`: Migra tutti i dati dal 2018 al 2026
- `POST /api/noleggio/persisti-anno/{anno}`: Persiste dati di un anno specifico
- `GET /api/noleggio/costi-persistiti/{targa}`: Recupera costi persistiti per veicolo
- `GET /api/noleggio/statistiche-persistenza`: Statistiche integrità dati

### Sicurezza Dati:
1. **Hash univoco**: Ogni record ha un hash basato su (targa, tipo_costo, data, importo, numero_fattura)
2. **No duplicati**: I record con stesso hash non vengono re-inseriti
3. **Soft delete**: I record vengono marcati come `eliminato: true` invece di essere cancellati
4. **Audit trail**: Ogni modifica viene loggata con timestamp e utente

---

## 🔢 REGOLA FONDAMENTALE DI FORMATTAZIONE

**TUTTE LE DATE E VALUTE DEVONO ESSERE IN FORMATO ITALIANO**

### Date: formato GG/MM/AAAA
- Esempio corretto: `25/01/2026`
- Esempio SBAGLIATO: `01/25/2026` (americano), `2026-01-25` (ISO)
- Usare SEMPRE: `formatDateIT()` da `/src/lib/utils.js`

### Valuta: formato € 0.000,00
- Esempio corretto: `€ 1.234,56`
- Esempio SBAGLIATO: `€ 1234.56`, `1,234.56`
- Punto (.) per separatore migliaia
- Virgola (,) per decimali
- Usare SEMPRE: `formatEuro()` da `/src/lib/utils.js`

### File utility: `/app/frontend/src/lib/utils.js`
```javascript
import { formatDateIT, formatEuro, formatDateTimeIT } from '../lib/utils';
```

**APPLICARE IN TUTTE LE PAGINE, SENZA ECCEZIONI!**

---

## 🎨 REGOLA FONDAMENTALE DI STILE UI

**TUTTE LE PAGINE DEVONO SEGUIRE LO STILE DELLA DASHBOARD**

Ogni pagina attuale e futura DEVE rispettare questi criteri di uniformità:

1. **Font**: Stesso font-family della Dashboard (Inter, system-ui, -apple-system)
2. **Colori sfondo**: `#f0f2f5` (grigio chiaro) o `white` come nella Dashboard
3. **Border-radius**: Angoli smussati uniformi (`border-radius: 12px` per card, `8px` per elementi piccoli)
4. **Header**: Gradiente blu navy (`#1e3a5f` → `#2d5a87`) come nelle pagine consolidate
5. **Card statistiche**: Sfondo pastello con colori coerenti (blu, verde, arancione, viola)
6. **Padding/Margin**: Spaziature uniformi (`padding: 16px 24px` per header, `20px` per card)
7. **Box-shadow**: `0 1px 3px rgba(0,0,0,0.1)` per le card

**Pagina di riferimento**: `/dashboard`
**Altre pagine conformi**: `/noleggio-auto`, `/fatture-ricevute`, `/fornitori`

**NON CREARE mai pagine con stili diversi!**

---

## 📚 REGOLA FONDAMENTALE: AGGIORNAMENTO REGOLE CONTABILI

**OGNI VOLTA CHE SI IMPLEMENTA O MODIFICA UNA LOGICA DI BUSINESS, AGGIORNARE SEMPRE `/regole-contabili`**

La pagina **Regole Contabili** (`/app/frontend/src/pages/RegoleContabili.jsx`) è il **dizionario ufficiale** di tutte le logiche di business implementate nel sistema. È fondamentale mantenerla aggiornata per:

1. **Documentazione**: Permette agli sviluppatori futuri di capire la logica senza leggere il codice
2. **Trasparenza**: L'utente può consultare le regole per capire il comportamento del sistema
3. **Debugging**: Facilita l'identificazione di bug confrontando comportamento atteso vs effettivo
4. **Onboarding**: Nuovo personale può formarsi rapidamente sulle logiche di business

### Quando aggiornare:
- ✅ Nuova logica di business implementata
- ✅ Modifica a logica esistente
- ✅ Bug fix che cambia il comportamento atteso
- ✅ Nuovi casi d'uso scoperti (es. dati legacy)
- ✅ Nuovi mapping o trasformazioni dati

### Cosa documentare:
- Nome della regola
- Descrizione chiara del comportamento
- Campi coinvolti (con valori possibili)
- Casi particolari o eccezioni

---

## 📋 CHANGELOG RECENTE

### 20 Gennaio 2026 - Fix Noleggio Auto - Mostra Tutti gli Anni
- ✅ **Bug Fix Critico**: I dati erano filtrati per anno corrente (2026), nascondendo i verbali/costi del 2023-2025
- ✅ **Modifica Backend**: `scan_fatture_noleggio()` ora carica TUTTI gli anni quando `anno=None`
- ✅ **Modifica Frontend**: Rimossa dipendenza da `annoGlobale`, default a "Tutti gli anni"
- ✅ **Dati Ora Visibili**:
  - € 79.029,50 Canoni
  - € 215,00 Verbali (19 verbali)
  - € 2.544,74 Bollo
  - € 1.360,00 Riparazioni
  - € 84.717,24 Totale Generale

### 20 Gennaio 2026 - Scanner Email Completo (P0 COMPLETATO)
- ✅ **Scansione Completa Posta**: Nuovo servizio `email_scanner_completo.py` che scansiona TUTTA la casella email
- ✅ **Classificazione Automatica**: Cartelle classificate per tipo (verbali B/A/T/S, esattoriali 071/371, F24/DMRA)
- ✅ **218+ Documenti Scaricati**: 
  - 70+ verbali noleggio
  - 42 esattoriali
  - 23 F24/tributi
- ✅ **Sezione in Scadenze**: Aggiunta sezione "Documenti da Riconciliare" nella pagina `/scadenze`:
  - Verbali in attesa fattura (PDF arrivato, fattura non ancora)
  - Fatture in attesa verbale (fattura con verbale ma PDF non scaricato)
  - Cartelle esattoriali e F24
  - Pulsante "Riconcilia Automaticamente"
- ✅ **Nuova Collection**: `documenti_email` con tutti i documenti scaricati
- ✅ **API Endpoints**:
  - `GET /api/email-scanner/cartelle` - Lista cartelle per tipo
  - `POST /api/email-scanner/scansiona` - Avvia scansione
  - `POST /api/email-scanner/associa` - Associa documenti a verbali
  - `GET /api/email-scanner/statistiche` - Statistiche complete

### 20 Gennaio 2026 - Sistema Classificazione Verbali Posta
- ✅ **Servizio Classificazione**: Creato `verbali_classificazione.py` per classificare verbali dalla posta
- ✅ **Logica Automatica**: Verbali classificati come aziendali/privati in base alla targa
- ✅ **Collection Nuove**: `verbali_attesa_fattura`, `verbali_privati`
- ✅ **API Endpoint**: 
  - `POST /classifica-verbali-posta` - Classifica tutti i verbali
  - `GET /verbali-attesa-fattura` - Verbali aziendali in attesa
  - `GET /verbali-privati` - Verbali non aziendali
  - `POST /riclassifica-verbale` - Riclassifica manualmente
- 🔶 **IN CORSO**: Classificazione batch dei 23 verbali dalla posta

### 20 Gennaio 2026 - Sistema Riconciliazione Email ↔ Gestionale
- ✅ **Indice Documenti**: Indicizzati 1637 fatture + 19 verbali con chiavi di ricerca
- ✅ **Pattern Matching**: Sistema per estrarre numeri fattura, verbali, targhe, importi, P.IVA
- ✅ **API Riconciliazione**: Endpoint completi per scansione posta e associazione PDF
- ✅ **Archivio PDF**: Collection per archiviare PDF scaricati dalla posta
- ✅ **Log Riconciliazioni**: Traccia di tutti i match trovati
- **Collections Nuove**: `indice_documenti`, `archivio_email`, `archivio_pdf`, `log_riconciliazione`

### 20 Gennaio 2026 - Restyling UI Prima Nota
- ✅ **Chiusure Giornaliere Compatte**: Sezione ripiegabile con `<details>` e 4 box su una riga
- ✅ **Input Ultra-Compatti**: Ridotti padding e font-size per massimizzare spazio
- ✅ **Coerenza con NoleggioAuto**: Stesso stile header e layout

### 20 Gennaio 2026 - Sistema Completo Verbali Noleggio
- ✅ **Scansione Fatture**: Endpoint `/api/verbali-noleggio/scansiona-fatture` scansiona tutte le fatture dal 2022 e estrae verbali
- ✅ **19 Verbali Trovati**: Estratti dalle fatture ALD, ARVAL, Leasys con associazioni complete
- ✅ **Pagina Dettaglio Verbale**: Nuova pagina `/verbali-noleggio/{numero}` con tutti i dettagli
- ✅ **Riconciliazione Automatica**: 18 verbali riconciliati automaticamente con estratto conto
- ✅ **Operazioni Sospese**: 1 verbale (A25111540620) marcato come sospeso da verificare
- ✅ **Collection Nuove**: `verbali_noleggio_completi`, `operazioni_sospese`
- 🔶 **MOCKED**: Download PDF da posta (richiede credenziali Gmail App Password)

### 20 Gennaio 2026 - Sistema Persistenza Dati Noleggio
- ✅ **Persistenza Dati Critici**: Creato sistema per salvare verbali, bolli, riparazioni nel database
- ✅ **Nuove Collections**: `costi_noleggio`, `veicoli_noleggio`, `audit_noleggio`
- ✅ **API Migrazione**: Endpoint per migrare dati esistenti dal 2018 al 2026
- ✅ **Hash Univoco**: Sistema anti-duplicati basato su hash del contenuto
- ✅ **Soft Delete**: I record vengono marcati come eliminati, non cancellati

### 20 Gennaio 2026 - Bug Fix Metodo Pagamento & Regole Contabili
- ✅ **Bug Fix Critico**: Corretto bug che impediva la modifica del metodo di pagamento per fatture legacy
- ✅ **Fallback Metodo Pagamento**: Aggiunta logica di fallback per determinare metodo effettivo da `metodo_pagamento` quando `prima_nota_*_id` sono null
- ✅ **Regole Contabili Aggiornate**: Aggiunta sezione "Determinazione Metodo Pagamento Effettivo" con mapping completo
- ✅ **PRD Aggiornato**: Aggiunta regola fondamentale per aggiornare sempre `/regole-contabili`

### 20 Gennaio 2026 - Formattazione Italiana & Bug Fix
- ✅ **Utility Formattazione**: Create funzioni `formattaDataItaliana()` e `formattaValutaItaliana()`
- ✅ **Bug Fix Noleggio**: Corretto parametro anno non passato all'API
- ✅ **Dizionario Metodi Pagamento**: Nuovo endpoint `GET /api/suppliers/dizionario-metodi-pagamento`
- ✅ **Regole di aggiornamento dizionario**: SI aggiorna da riconciliazione/estratto/fornitore - NO da Prima Nota/Ciclo Passivo
- ✅ **Estratto Fatture Fornitore**: Nuovo modale con filtri (anno, data, importo, tipo) e metodo pagamento per controllo cartaceo
- ✅ **4 Casi Flusso Pagamento**: Implementata logica completa con blocco post-riconciliazione e forzatura con autorizzazione
- ✅ **Verifica Incoerenze**: Endpoint per rilevare discrepanze tra fatture e estratto conto
- ✅ **Regole Contabili**: Aggiornata pagina `/regole-contabili` con tutte le logiche di business

### 19 Gennaio 2026 - UX Improvements & Bulk Operations
- ✅ **Rimossi tutti i `window.confirm()`**: Le azioni vengono eseguite direttamente senza dialog di conferma
- ✅ **UI Compattata**: Padding, font-size e margini ridotti in `/ordini-fornitori` e altre pagine
- ✅ **Nuovo endpoint**: `POST /api/fatture-ricevute/aggiorna-metodi-pagamento` - Aggiorna in massa i metodi di pagamento delle fatture basandosi sul metodo predefinito del fornitore
- ✅ **Eliminato `DettaglioFattura.jsx`**: Pagina duplicata rimossa, funzionalità già presente in ArchivioFattureRicevute
- ✅ **Ripristino scroll**: Implementato salvataggio/ripristino della posizione di scorrimento dopo operazioni di modifica
- ✅ **Admin**: Aggiunto pulsante "Aggiorna Metodi Pagamento" nella sezione Manutenzione

### 19 Gennaio 2026 - Prima Nota & Ciclo Passivo
- ✅ **POS Unificato**: I 3 campi POS (POS1, POS2, POS3) sono stati unificati in un singolo campo "Totale POS"
- ✅ **Sposta Movimenti Cassa↔Banca**: Nuovo endpoint `POST /api/prima-nota/sposta-movimento` e pulsanti nella tabella per spostare movimenti tra Prima Nota Cassa e Banca
- ✅ **Aggiornamento fattura collegata**: Quando un movimento viene spostato, viene aggiornato anche il metodo_pagamento della fattura associata
- ✅ **Logica Import XML rispetta scelta utente**: Se l'utente ha già impostato manualmente un metodo di pagamento (da email o spostamento), l'import XML lo rispetta invece di usare il default del fornitore
- ✅ **Flag `metodo_pagamento_modificato_manualmente`**: Traccia se il metodo è stato cambiato dall'utente

---

## 🚨 REGOLA FONDAMENTALE PER LO SVILUPPO

**QUANDO SI CORREGGE UN PROBLEMA, CORREGGERE SEMPRE TUTTO, NON SOLO I CASI PRINCIPALI.**

Questa regola è essenziale per evitare di ritornare continuamente sugli stessi argomenti. 
Ogni fix deve essere:
- **Completo**: Cercare TUTTI i punti dove esiste lo stesso problema
- **Consistente**: Applicare la stessa soluzione ovunque
- **Documentato**: Aggiornare questo PRD con le modifiche fatte

Esempi:
- Se correggo formato importi → cercare e correggere IN TUTTE le pagine
- Se rimuovo un banner → rimuoverlo da TUTTE le pagine dove appare
- Se miglioro un parser → verificare TUTTI i casi d'uso

---

## 1. Obiettivo del sistema

Costruire un sistema contabile che:
- sia conforme alla normativa italiana,
- riduca l'errore umano,
- renda ogni numero difendibile,
- cresca senza introdurre incoerenze.

---

## 2. Modello di controllo a cascata

1. Anagrafiche
2. Documenti
3. Regole decisionali
4. Prima Nota
5. Riconciliazione
6. Controlli trasversali

**Un errore a monte invalida i livelli successivi.**

---

## 2.1 FLUSSO RICONCILIAZIONE PAGAMENTI

Quando ci sono dati da riconciliare, il flusso è:

1. **`/fatture-ricevute` (Tab Scadenze)** → Dove vedi le fatture da pagare
   - Pulsante **"Paga"** → Pagamento manuale (Cassa o Banca) → Crea movimento in Prima Nota
   - Pulsante **"Riconcilia"** → Abbina con movimento bancario esistente

2. **`/riconciliazione`** → Centro di controllo unificato
   - Tab **Banca**: Movimenti bancari da abbinare
   - Tab **Stipendi**: Pagamenti salari da abbinare
   - Tab **F24**: Versamenti fiscali da abbinare

3. **`/prima-nota` (Cassa/Banca)** → Archivio finale
   - Movimenti confermati e riconciliati
   - Storico pagamenti

**Regola**: Se paghi MANUALMENTE da fatture-ricevute, il movimento viene creato automaticamente in Prima Nota.
Se il movimento esiste GIÀ in banca (estratto conto), usa "Riconcilia" per abbinarlo.

---

## 3. Validatori automatici

### P0 – Bloccanti ✅ IMPLEMENTATO

| Validatore | Endpoint | Status |
|------------|----------|--------|
| Fornitore senza metodo pagamento | `/api/invoices/import-xml` | ✅ Attivo |
| Metodo ≠ contanti senza IBAN | `/api/invoices/import-xml` | ✅ Attivo |
| Documento senza anagrafica valida | `/api/invoices/import-xml` | ✅ Attivo |
| Movimento contabile senza documento | In progress | ⚠️ Parziale |
| Salari post giugno 2018 pagati in contanti | `/api/cedolini-riconciliazione/.../registra-pagamento` | ✅ Attivo |

**Files implementazione:**
- `/app/app/routers/invoices/fatture_ricevute.py` (validatori fatture)
- `/app/app/routers/cedolini_riconciliazione.py` (validatore salari)

### P1 – Critici

- Differenza tra cedolino e bonifico
- Metodo pagamento misto
- Pagamenti parziali

### P2 – Informativi

- Dati anagrafici incompleti non critici
- IBAN multipli non consolidati

---

## 4. Ciclo Passivo ✅ IMPLEMENTATO

- ✅ Import XML
- ✅ Aggiornamento anagrafica fornitore
- ✅ Metodo pagamento da anagrafica
- ✅ Scrittura deterministica in prima nota
- ✅ Validatori P0 bloccanti durante import

---

## 5. Gestione Dipendenti e Salari ✅ IMPLEMENTATO

- ✅ Import cedolini (da Excel `paghe.xlsx`, `bonifici dip.xlsx`)
- ✅ Import bonifici
- ✅ Calcolo differenze
- ✅ Evidenziazione differenze
- ✅ Saldo differenze aggregato
- ✅ Validatore P0: blocco contanti post 06/2018

---

## 6. Prima Nota ✅ REFACTORED

- ✅ Cassa e Banca separate (logica personalizzata DARE/AVERE)
- ✅ Saldi per anno
- ✅ Riporto automatico
- ✅ Immutabilità delle scritture
- ✅ UI completamente ridisegnata (React + Zustand)

**Files:**
- `/app/frontend/src/pages/PrimaNota.jsx`
- `/app/frontend/src/pages/PrimaNotaSalari.jsx`
- `/app/frontend/src/stores/primaNotaStore.js`

---

## 7. Riconciliazione ✅ IMPLEMENTATO

- ✅ Bancaria (con auto-refresh ogni 30 minuti)
- ✅ Salari
- ✅ F24

Ogni riconciliazione chiude il ciclo documentale.

---

## 8. Matrice di rischio fiscale

| Livello | Rischio |
|---------|---------|
| Anagrafiche | Altissimo |
| Documenti | Alto |
| Regole | Altissimo |
| Prima Nota | Critico |
| Riconciliazione | Medio |

---

## 9. Test funzionali

### Test P0 ✅ IMPLEMENTATI

- ✅ Import fattura senza metodo pagamento → BLOCCO
- ✅ Import fattura bancaria senza IBAN → BLOCCO  
- ✅ Pagamento salari post 06/2018 in contanti → BLOCCO

### Test P1

- Cedolino ≠ bonifico → ALERT + saldo differenze

### Test P2

- IBAN multipli → LOG

---

## 10. Scalabilità

Si scala:
- aggiungendo fonti di input,
- non modificando la contabilità,
- rafforzando i controlli.

---

## 11. Stato Implementazione - Gennaio 2026

### ✅ Completato
- UI Prima Nota e Prima Nota Salari ridisegnate
- Validatori P0 bloccanti (fatture e salari)
- Fix bug conferma multipla fatture
- Fix visualizzazione F24 pendenti
- Fix import corrispettivi XML
- Fix import cedolini Excel
- Riconciliazione automatica con auto-refresh
- Endpoint bulk update fornitori (`/api/suppliers/update-all-incomplete`)
- Sync IBAN da fatture esistenti (`/api/suppliers/sync-iban`)
- Endpoint validazione P0 (`/api/suppliers/validazione-p0`)
- **Auto-conferma assegni con match esatto** (18 Gen 2026)
- **Import estratto conto con gestione duplicati** (18 Gen 2026)
- **Integrazione Parlant.io con Emcie** (18 Gen 2026)
- **Pagina F24: rimossi pulsanti Cassa/Assegno, solo pagamento Banca** (18 Gen 2026)
- **Pagina F24: aggiunto pulsante "Vedi PDF" sempre visibile** (18 Gen 2026)
- **Unificazione collection `fornitori` e `suppliers`** (18 Gen 2026) - 263 fornitori consolidati
- **Implementato servizio Supervisione Contabile** (18 Gen 2026)
- **Fix pagina Previsioni Acquisti** - funzionante (18 Gen 2026)
- **Pulizia dati massiva** (18 Gen 2026):
  - 83 fatture duplicate eliminate
  - 2 fatture vuote eliminate
  - 20 F24 vuoti eliminati
  - 171 assegni vuoti eliminati (Data N/D, €0)
  - 13 F24 con date errate corretti
  - 82 TD24 marcate non riconciliabili
- **Logica TD24** - fatture differite escluse dalla riconciliazione (18 Gen 2026)
- **Pagine Auto-Sufficienti** (18 Gen 2026) ⭐ NUOVO:
  - Gestione Assegni: auto-ricostruzione beneficiario e fatture associate
  - Riconciliazione Smart: auto-riconciliazione F24, correzione date, sync assegni
  - Fatture Ricevute: associazione fornitori, correzione importi, rimozione duplicati, TD24
  - **Dashboard Analytics**: verifica coerenza Prima Nota, correzione tipo movimenti
  - **F24**: correzione date errate, auto-riconciliazione con estratto conto
  - **Corrispettivi**: ricalcolo IVA scorporo 10%, rimozione duplicati
  - **Dashboard principale**: riparazione silente in background
  - **Prima Nota Salari**: rimozione righe vuote, correzione importi negativi

- **Correzione Numeri Assegni** (18 Gen 2026):
  - 205 numeri assegno corretti: da CRA (42740212301901) a NUM reale (0208767699)
  - Endpoint `/api/assegni/correggi-numeri` per correzione massiva
  - Pattern regex aggiornato per estrarre NUM invece di CRA

- **Associazione Beneficiari Assegni** (18 Gen 2026):
  - 47 beneficiari associati automaticamente su 55 assegni senza beneficiario
  - Endpoint `/api/assegni/associa-beneficiari-robusto` per ricerca intelligente fatture
  - Algoritmo cerca fatture con importo simile (±15€) nella collection `invoices`

- **Logica Analytics Corretta** (18 Gen 2026):
  - **Fatturato = SOLO corrispettivi** (fatture emesse Ceraldi Group sono figurative)
  - Entrate = movimenti Prima Nota tipo "entrata"
  - Card esplicativa aggiornata con spiegazione logica

### 🔄 In Progress
- Risoluzione 182 fornitori bancari senza IBAN (ridotti da 223)
- Logica supervisione Cassa → Banca (backend pronto, da testare)
- Auto-riconciliazione F24 con estratto conto (backend pronto, da testare)

### ✅ Recentemente Completato (18 Gen 2026)
- **Unificazione pagine Import**: Rimosso tab "Import XML" da Fatture Ricevute, centralizzato tutto in `/import-unificato`
- **Import Unificato potenziato**: Tutti i tipi supportano ZIP massivo (.zip aggiunto a tutte le estensioni)
- **Feedback integrazione**: Import fatture XML ora mostra dettagli di Magazzino, Prima Nota, Scadenziario e Riconciliazione
- **PAGINE AUTO-SUFFICIENTI**: Implementato pattern "self-healing pages" con:
  - Card informativa "Logica Intelligente Attiva" visibile in ogni pagina
  - Endpoint di auto-riparazione chiamati al caricamento pagina
  - Feedback visivo dei risultati dell'ultima verifica automatica

### 📋 Backlog
- Finalizzare importazione cedolini da PDF (OCR)
- Dashboard Analytics
- Integrazione Google Calendar
- Report PDF via email
- Risolvere timeout chat Parlant.io (P0 BLOCCATO)

---

## 12. LOGICA DI SUPERVISIONE INTELLIGENTE ⭐ CRITICO

### Principi Fondamentali (Aggiunto 18 Gennaio 2026)

Il sistema deve agire come un **consulente contabile professionale**, con supervisione attiva sui dati dell'utente.

### Regola 1: Spostamento Automatico Cassa → Banca

**SCENARIO**: L'utente inserisce per errore una fattura in Prima Nota Cassa, ma l'estratto conto bancario mostra che l'operazione è stata pagata tramite banca.

**AZIONE RICHIESTA**:
1. Durante l'import dell'estratto conto O durante i controlli periodici
2. Verificare se esistono fatture in Prima Nota Cassa che corrispondono a movimenti bancari
3. Se trovato match:
   - **Spostare automaticamente** la fattura da Prima Nota Cassa a Prima Nota Banca
   - **Eliminare** la voce dalla Prima Nota Cassa
   - **Mostrare ALERT** all'utente con dettagli dello spostamento:
     - Fattura: [numero]
     - Fornitore: [nome]
     - Importo: [€]
     - Motivo: "Trovato pagamento in estratto conto bancario"

**IMPLEMENTAZIONE**: `/app/app/services/supervisione_contabile.py` (da creare)

### Regola 2: Auto-conferma Assegni

**SCENARIO**: Assegno con importo **esattamente uguale** alla fattura associata.

**AZIONE**: Auto-conferma automatica, non mostrare in lista operazioni da confermare.

**ECCEZIONE**: Se c'è differenza anche di pochi centesimi → Mostra in lista per conferma manuale, visualizzando:
- Importo assegno
- Importo fattura originale
- Differenza
- Nome fornitore

### Regola 3: Import Estratto Conto senza Errori Duplicati

**SCENARIO**: L'utente ricarica lo stesso file estratto conto.

**AZIONE**: 
- NON mostrare errore "file duplicato"
- Aggiornare silenziosamente i record esistenti
- Aggiungere solo i nuovi movimenti
- Permettere sempre il caricamento

### Regola 4: Visibilità Fornitori nella Riconciliazione

**SCENARIO**: Pagina riconciliazione assegni mostra "?" invece del fornitore.

**AZIONE**: Mostrare sempre:
- Nome fornitore/beneficiario
- Importo assegno
- Importo fattura originale (se disponibile)
- Differenza (se presente)

### Regola 5: Fatture TD24 Riepilogative

**COS'È TD24**: Fattura elettronica differita (art. 21, comma 4, DPR 633/72) che riepiloga più operazioni (es. DDT). Può avere imponibile zero perché è solo documentale.

**AZIONE**:
- NON associare fatture TD24 con imponibile zero ai pagamenti
- Mostrare nota informativa: "Fattura TD24 riepilogativa - solo documentale"
- Verificare sempre il campo `<TipoDocumento>` nell'XML

### Regola 6: Pagamenti Rateali

**SCENARIO**: Una fattura viene pagata in più rate (es. 3 assegni per la stessa fattura).

**AZIONE**:
- Rilevare automaticamente quando più assegni sono collegati alla stessa fattura
- Mostrare: "📊 Pagamento in X rate: Totale rate €Y su fattura di €Z"
- Permettere conferma manuale di ogni rata
- Non auto-confermare se c'è differenza tra totale rate e importo fattura

### Regola 7: Pulizia Dati Incompleti

**SCENARIO**: Assegni con €0,00, "Data N/D", o stato "vuoto".

**AZIONE**:
- Escludere automaticamente dalla lista di riconciliazione
- Non mostrare assegni senza importo o data valida
- Log per amministratore dei record esclusi

### Regola 8: F24 Solo Pagamento Banca (18 Gen 2026)

**SCENARIO**: Gli F24 si pagano SOLO tramite banca (telematico o F24 web).

**AZIONE IMPLEMENTATA**:
- Rimosse opzioni "Assegno" e "Cassa" dalla pagina F24
- Visibile solo "🏦 Pagamento Banca"
- Pulsante "Vedi PDF" sempre visibile (grigio se PDF non disponibile)
- Auto-riconciliazione F24 quando trovato in estratto conto

**ENDPOINT API**:
- `POST /api/operazioni-da-confermare/supervisione/auto-riconcilia-f24`
- `GET /api/operazioni-da-confermare/supervisione/alert`

---

## 12b. Endpoint Supervisione Contabile (18 Gen 2026)

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/operazioni-da-confermare/supervisione/esegui` | POST | Esegue tutti i controlli di supervisione |
| `/api/operazioni-da-confermare/supervisione/alert` | GET | Recupera alert ultimi 24h |
| `/api/operazioni-da-confermare/supervisione/auto-riconcilia-f24` | POST | Auto-riconcilia F24 con estratto conto |
| `/api/suppliers/unifica-collection` | POST | Unifica fornitori e suppliers |
| `/api/suppliers/verifica-unificazione` | GET | Verifica stato unificazione |

**File implementazione**: `/app/app/services/supervisione_contabile.py`

---

## 13. Logica Prima Nota (NUOVA - Gennaio 2026)

### Regole Fondamentali

**IBAN NON VINCOLANTI**: Gli IBAN non bloccano la contabilità.

**BANCA**:
1. Guardare i movimenti in **Estratto Conto**
2. Se trova corrispondenza con fattura → **Prima Nota Banca**
3. Se non trova corrispondenza → **"Da Riconciliare"**

**CASSA**:
1. Guardare il **metodo di pagamento** del fornitore
2. Sempre stato **"Da Riconciliare"** con scelta preassegnata

**Accrediti POS**: Vanno in Prima Nota Banca (sono movimenti bancari)

### Flusso Operativo
```
Fattura Ricevuta
       │
       ▼
┌──────────────────┐
│ Check Estratto   │
│ Conto Bancario   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Match?  │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  SI        NO
    │         │
    ▼         ▼
Prima Nota  Da Riconciliare
  Banca     (preassegnato)
```

---

## 15. Importazione Estratti Conto PDF (NUOVO - 17 Gen 2026)

### Funzionalità Implementate ✅

**Parser Universale per Estratti Conto Bancari**
- Supporta: BANCO BPM, BNL, Nexi
- Estrazione automatica: data, descrizione, entrate, uscite
- Filtro automatico dati errati (riassunto scalare, saldi)

**Endpoint API:**
- `POST /api/bank-statement-bulk/parse-bulk` - Parse multipli PDF con anteprima
- `POST /api/bank-statement-bulk/parse-single` - Parse singolo PDF
- `GET /api/bank-statement-bulk/preview/{id}` - Recupera anteprima
- `POST /api/bank-statement-bulk/commit/{id}` - Salva transazioni nel DB
- `POST /api/bank-statement-bulk/import-direct` - Parse e import in un passo

**Frontend (ImportUnificato.jsx):**
- Tipo documento "Estratto Conto PDF" con badge PREVIEW
- Drag & drop per upload massivo
- Modale anteprima con tabella transazioni
- Pulsanti conferma/annulla importazione

**File Implementazione:**
- `/app/app/services/universal_bank_statement_parser.py` - Parser universale
- `/app/app/routers/bank/bank_statement_bulk_import.py` - Router API
- `/app/frontend/src/pages/ImportUnificato.jsx` - Interfaccia utente

---

## 16. Correzioni Riconciliazione (17 Gen 2026)

### Bug Fix Applicati ✅

**Formato Date Italiano (DD/MM/YY)**
- Aggiunta funzione `formatDateIT()` nel frontend
- Applicata a tutte le visualizzazioni date nella pagina di riconciliazione

**F24 - Importo Totale**
- Corretto endpoint `/api/operazioni-da-confermare/smart/cerca-f24`
- Ora usa `totale_debito` o `saldo_finale` invece di sommare i tributi

**Stipendi - Cedolini Validi**
- Corretto endpoint per cercare TUTTI i cedolini non pagati
- Filtrato solo cedolini con `netto > 0`
- Mapping campi: `dipendente_nome`, `netto_in_busta`, `periodo`

**Assegni - Beneficiario**
- Aggiunto mapping campo `beneficiario` nel frontend
- Visibile nella card dell'assegno nella pagina di riconciliazione
- Aggiunto handler `handleIncassaAssegno` per chiamare `/api/assegni/{id}/incassa`

**NOTE IMPORTANTI:**
- Parser "Estratto Conto PDF" è SOLO per estratti conto bancari
- Per le buste paga usare il tipo "💰 Buste Paga"
- POS da estratto conto va in Prima Nota Banca, MAI in Cassa

---

## 17. Integrazione Dati da Email (18 Gen 2026) ⭐ NUOVO

### Bonifici Stipendi
**Endpoint**: `/api/bonifici-stipendi/`
- `POST /scarica-da-email` - Scarica bonifici da email "Info Bonifico YouBusiness Web"
- `POST /associa-dipendenti` - Associa bonifici ai dipendenti nel DB
- `POST /riconcilia-con-estratto-conto` - Valida bonifici con estratto conto (DEFINITIVO)
- `GET /bonifici` - Lista bonifici
- `GET /stats` - Statistiche

**Logica a Due Stadi**:
1. **PROVVISORIO**: Bonifico letto da email → stato "email_ricevuta"
2. **DEFINITIVO**: Match con estratto conto → stato "riconciliato"

**Statistiche attuali (18 Gen 2026)**:
- 736 bonifici totali estratti
- 522 (71%) associati a dipendenti
- 167 (23%) riconciliati con estratto conto

### Verbali Noleggio
**Endpoint**: `/api/verbali-noleggio/`
- `GET /cartelle-verbali` - Lista cartelle email con verbali
- `POST /scarica-da-email` - Scarica PDF verbali dalle email
- `POST /associa-fatture` - Associa verbali a fatture noleggio
- `GET /verbali` - Lista verbali
- `GET /pdf/{numero_verbale}` - Ottiene PDF in base64

**Pattern verbale**: `Bxxxxxxxxxx` (es. B23123049750)

**Statistiche attuali (18 Gen 2026)**:
- 22 verbali scaricati (tutti con PDF)
- 1 associato a fatture (gli altri sono 2024-2025, fatture non ancora importate)

---

## 18. Integrazioni Terze Parti (18 Gen 2026) ⭐ NUOVO

### InvoiceTronic - Fatturazione Elettronica SDI
**Endpoint**: `/api/invoicetronic/`
- `GET /status` - Verifica connessione
- `GET /fatture-ricevute` - Lista fatture passive da SDI

**Configurazione**:
- API Key: in backend/.env (`INVOICETRONIC_API_KEY`)
- Codice Destinatario: `7hd37x0`
- Ambiente: Sandbox (produzione richiede azioni manuali su AdE)

### PagoPA
**Endpoint**: `/api/pagopa/`
- `POST /auto-associa` - Associa ricevute PagoPA a movimenti bancari via CBILL

---

## 19. Assegni - Situazione Attuale (18 Gen 2026)

**Statistiche**:
- 214 assegni totali
- 195 pagati, 19 confermati
- 8 senza beneficiario (importi senza fatture corrispondenti nel DB)

**Assegni non associabili** (importi non presenti nelle fatture):
- €1.663,26 x 3 (possibile leasing/affitto)
- €855,98, €1.028,82, €1.272,58, €1.421,77, €1.504,16

---

## 20. Sistema Classificazione Email Intelligente ✅ IMPLEMENTATO (18 Gen 2026)

**Backend Router**: `/api/documenti-smart/`

**Funzionalità**:
- ✅ Scansione email con classificazione automatica
- ✅ 10 regole predefinite per categorie (verbali, dimissioni, cartelle esattoriali, INPS, F24, ecc.)
- ✅ Associazione automatica ai moduli del gestionale
- ✅ Eliminazione email non rilevanti
- ✅ Test-classify endpoint per verificare classificazione

**Endpoint principali**:
- `POST /scan` - Scansiona e classifica email
- `POST /process` - Processa documenti classificati
- `POST /associa-tutti` - Associa documenti alle sezioni gestionale
- `GET /categories` - Lista mapping categorie
- `GET /rules` - Lista regole di classificazione
- `DELETE /cleanup-unmatched` - Elimina email non classificate

**Files**:
- `/app/app/services/email_classifier_service.py` (Servizio classificazione)
- `/app/app/routers/documenti_intelligenti.py` (Router API)

**Mapping Email → Gestionale**:
| Categoria | Sezione Gestionale | Collection MongoDB |
|-----------|-------------------|-------------------|
| verbali | Noleggio Auto | verbali_noleggio |
| dimissioni | Anagrafica Dipendenti | dimissioni |
| cartelle_esattoriali | Commercialista | adr_definizione_agevolata |
| inps_fonsi | INPS Documenti | delibere_fonsi |
| bonifici_stipendi | Prima Nota Salari | bonifici_stipendi |
| f24 | Gestione F24 | f24 |
| buste_paga | Cedolini | cedolini_pdf |

---

## 21. Router Dimissioni ✅ IMPLEMENTATO (18 Gen 2026)

**Backend Router**: `/api/dimissioni/`

**Funzionalità**:
- ✅ Ricerca email "Notifica richiesta recesso rapporto di lavoro"
- ✅ Estrazione codice fiscale da subject/allegati
- ✅ Estrazione data dimissioni
- ✅ Associazione automatica a dipendente in anagrafica

**Endpoint**:
- `POST /cerca-email-dimissioni` - Cerca e estrae dati dimissioni
- `POST /associa-dimissioni-dipendenti` - Aggiorna anagrafica dipendenti

**File**: `/app/app/routers/dimissioni.py`

---

## 22. Logica Assegni Multipli ✅ IMPLEMENTATO (18 Gen 2026)

**Backend Router**: `/api/assegni/`

**Funzionalità**:
- ✅ Cerca combinazioni di assegni senza beneficiario che sommati matchano fatture
- ✅ Preview delle possibili combinazioni prima dell'associazione
- ✅ Associazione automatica con tracciabilità (campo `pagamento_combinato`)

**Endpoint**:
- `GET /preview-combinazioni` - Preview combinazioni senza modifiche
- `POST /cerca-combinazioni-assegni` - Esegue l'associazione

**Risultati test**:
- 8 assegni senza beneficiario analizzati
- 2 match trovati:
  - 3 assegni da €1.663,26 → Fattura €4.989,80 (EG TAPPEZZERIA)
  - 2 assegni (€1.028,82 + €1.421,77) → Fattura €2.450,00 (Mor.Feo Casoria)
- 5 assegni associati, 3 rimasti non associabili

**File**: `/app/app/routers/bank/assegni.py`

---

## 23. Importazione Fatture XML Noleggio ✅ IMPLEMENTATO (18 Gen 2026)

**Script**: `/app/scripts/import_fatture_xml_noleggio.py`

**Risultati importazione**:
- 111 fatture XML processate
- 5 targhe veicoli: GG262JA, GX037HJ, GE911SC, GW980EP, GG782PN
- 30 verbali importati
- 46 bolli importati
- 2 riparazioni importate
- 4 veicoli aggiornati nel sistema noleggio

**Fornitori identificati**: ARVAL, ALD Automotive, Leasys, LeasePlan

**Collection DB**: `fatture_noleggio_xml`

---

## 24. Ottimizzazione Dashboard ✅ (18 Gen 2026)

**Problema risolto**: Dashboard lento con "Caricamento in corso..."

**Fix applicati**:
1. Disabilitata auto-riparazione automatica (eseguire manualmente)
2. Caricamento grafici secondari in background (non bloccante)
3. Timeout 3s per check status Parlant
4. Caricamento progressivo: dati primari → dati secondari

---

## 25. Router INPS Documenti ✅ GIÀ IMPLEMENTATO

**Router**: `/api/inps/`

**Endpoint disponibili**:
- `POST /cerca-delibere-fonsi` - Cerca email Delibere FONSI
- `POST /cerca-dilazioni` - Cerca email dilazioni INPS
- `GET /stats` - Statistiche documenti INPS

**Status**: Funzionante (0 email trovate nella casella)

---

## 26. Router ADR ✅ GIÀ IMPLEMENTATO

**Router**: `/api/adr/`

**Endpoint disponibili**:
- `POST /cerca-cartelle-email` - Cerca cartelle esattoriali
- `GET /soggetti` - Lista soggetti con cartelle
- `GET /stats` - Statistiche ADR

**Status**: Funzionante (0 email trovate nella casella)

---

## 27. Pulsanti Attivazione Manuale ✅ IMPLEMENTATO (18 Gennaio 2026)

**Problema risolto**: Le pagine Dashboard, Riconciliazione e Gestione Assegni eseguivano procedure pesanti automaticamente al caricamento, causando lentezza.

**Fix applicati**:

### Dashboard.jsx ✅
- Pulsante "🔧 Auto-Ripara Dati" (gradiente viola)
- Feedback visivo durante l'esecuzione
- Auto-riparazione disabilitata al caricamento

### RiconciliazioneUnificata.jsx ✅
- Pulsante "🔧 Auto-Ripara" (gradiente viola)
- Pulsante "📋 Carica F24" (arancione) - carica F24 in background (~35s)
- F24 non caricati automaticamente per performance

### GestioneAssegni.jsx ✅
- Pulsante "🔗 Combinazioni" (gradiente viola) - **NUOVO**
  - Chiama endpoint `POST /api/assegni/cerca-combinazioni-assegni`
  - Cerca combinazioni di assegni la cui somma = importo fattura
  - Mostra risultati dettagliati con assegni e fatture matchate
- Pulsante "Auto-Associa" (blu) - associazione singola 1:1
- Pulsante "🔄 Sync da E/C" (arancione) - sincronizza da estratto conto

**Endpoint Backend**:
- `POST /api/assegni/cerca-combinazioni-assegni` - Logica avanzata combinazioni
- `GET /api/assegni/preview-combinazioni` - Anteprima senza modifiche

---

## 28. Clausola finale

Questo PRD è vincolante.

Ogni sviluppo futuro deve:
- rispettare i validatori,
- non introdurre eccezioni silenziose,
- mantenere la tracciabilità completa.

---

## Ultimo aggiornamento: 18 Gennaio 2026
---

## 28. Document AI - Sistema Estrazione Documenti ✅ IMPLEMENTATO (18 Gennaio 2026)

### Funzionalità implementata:
Sistema completo di estrazione dati da documenti usando OCR + LLM (Claude Sonnet 4.5).

### Tipi documento supportati:
| Tipo | Collection Gestionale | Esempio |
|------|----------------------|---------|
| F24 | `f24_models` | Versamenti fiscali |
| BUSTA_PAGA | `cedolini` | Cedolini dipendenti |
| BONIFICO | `archivio_bonifici` | Ricevute bonifico |
| ESTRATTO_CONTO | `estratto_conto_movimenti` | Movimenti bancari |
| VERBALE | `verbali_noleggio` | Multe stradali |
| CARTELLA_ESATTORIALE | `adr_definizione_agevolata` | Cartelle AdER |
| DELIBERA_INPS | `delibere_fonsi` | Comunicazioni INPS |
| FATTURA | `invoices` | Fatture commerciali |

### API Endpoints:
- `POST /api/document-ai/extract` - Estrae dati da file caricato
- `POST /api/document-ai/extract-base64` - Estrae da base64
- `GET /api/document-ai/document-types` - Tipi supportati
- `GET /api/document-ai/extracted-documents` - Lista documenti estratti
- `POST /api/document-ai/process-all-classified` - Processa email classificate
- `POST /api/document-ai/reprocess-and-save` - Riprocessa tutto

### Files:
- `/app/app/services/document_ai_extractor.py` - OCR + LLM extraction
- `/app/app/services/document_data_saver.py` - Salvataggio in gestionale
- `/app/app/routers/document_ai.py` - API endpoints

### Costi:
- OCR (PyMuPDF + pytesseract): €0
- LLM (Claude Sonnet 4.5): ~€0.01-0.03/documento

---

## 29. Modifiche UI (18 Gennaio 2026)

### Completate:
1. ✅ **Rimosso bottone "Stampa Etichetta Lotto"** da fatture-ricevute
2. ✅ **Rimosso Riepilogo Riconciliazione** dalla pagina /riconciliazione
3. ✅ **Aggiunto Categorie CBILL** in PagoPA (INPS, AdER, TARI, COSAP)
4. ✅ **Aggiunto bottone Visualizza PDF** nella pagina Documenti
5. ✅ **Aggiunto Tab "AI Estratti"** nella pagina Documenti con upload

6. ✅ **Aggiunto pulsante "Processa Allegati Email"** nella tab AI per processare automaticamente i PDF classificati (18 Gen 2026)

---

## 30. Task Pendenti e Backlog

### 🔴 P0 - Alta Priorità:
1. **Chat Parlant.io** - Non funziona (timeout), da risolvere o sostituire
2. **Performance query F24** - Endpoint `/api/operazioni-da-confermare/smart/cerca-f24` impiega ~35s

### 🟡 P1 - Media Priorità:
3. ~~**Processamento automatico email con AI**~~ ✅ COMPLETATO - Pulsante "Processa Allegati Email" aggiunto
4. **UI InvoiceTronic** - Completare integrazione SDI
5. **3 assegni non associati** - UI per associazione manuale
6. ~~**Refactoring vecchi parser**~~ ✅ PARZIALMENTE COMPLETATO (19 Gen 2026)
   - Parser f24 e payslip ora usano Document AI come prima scelta
   - Parser regex mantenuti come fallback
   - `fatturapa_parser.py` spostato in `deprecated/`

### 🟠 P2 - Bassa Priorità:
7. **Refactoring backend** - Modularizzare file grandi

---

## 31. Changelog Sessione 19 Gen 2026

### ✅ Completati:
1. **Chat Parlant.io** - Riattivata (era solo un problema di avvio del servizio, creato supervisord)
2. **Query F24** - Verificata veloce (~0.3s, già ottimizzata)
3. **UI Assegni Non Associati** - Creata sezione dedicata per associazione manuale con 3 assegni
4. **Refactoring Parser** - Document AI ora è prima scelta per F24 e cedolini

### 🔄 Modifiche ai file:
- `/app/app/services/cedolini_manager.py` - Document AI come prima scelta
- `/app/app/routers/accounting/accounting_f24.py` - Document AI come prima scelta
- `/app/frontend/src/pages/GestioneAssegni.jsx` - Nuova sezione assegni non associati
- `/app/app/parsers/__init__.py` - Aggiornato per deprecazione
- `/etc/supervisor/conf.d/parlant.conf` - Nuovo servizio per chat AI

---

## 32. Changelog Sessione 19 Gen 2026 (Seconda Parte)

### ✅ Completati:
1. **Modal Collega Fatture migliorato**:
   - Draggable (trascinabile)
   - Mostra importo assegno in evidenza
   - Esclude fornitori pagati in contanti
   - Mostra differenza tra importo assegno e fatture selezionate

2. **Performance: Logiche Intelligenti spostate in Admin**:
   - Rimossa auto-riparazione automatica da tutte le pagine
   - Creata nuova tab "🔧 Manutenzione" in Admin
   - 6 pulsanti per manutenzione singola + "Esegui Tutte"
   - Pagine interessate: F24, Corrispettivi, Fatture Ricevute, Assegni, Analytics, Salari

3. **PDF Carnet Assegni** (sessione precedente):
   - Aggiunta intestazione azienda
   - Colonne Data Fattura e N. Fattura corrette
   - Stile professionale allineato a Prima Nota Commercialista

### 🔄 File Modificati:
- `/app/frontend/src/pages/GestioneAssegni.jsx` - Modal draggable, filtro contanti
- `/app/frontend/src/pages/Admin.jsx` - Nuova tab Manutenzione
- `/app/frontend/src/pages/F24.jsx` - Rimossa auto-riparazione
- `/app/frontend/src/pages/Corrispettivi.jsx` - Rimossa auto-riparazione
- `/app/frontend/src/pages/ArchivioFattureRicevute.jsx` - Rimossa auto-riparazione
- `/app/frontend/src/pages/DashboardAnalytics.jsx` - Rimossa auto-riparazione
- `/app/frontend/src/components/prima-nota/PrimaNotaSalariTab.jsx` - Rimossa auto-riparazione

---

## 33. Changelog Sessione 19 Gen 2026 (Terza Parte)

### ✅ Completati:
1. **Fatture non associate con pulsante Visualizza** - Aggiunto in Noleggio Auto
2. **Parser Noleggio migliorato**:
   - Aggiunto "riaddebito tassa automobilistica regionale" come bollo
   - Aggiunto numero verbale completo (es: 20250017442)
   - Keywords migliorate per Leasys
3. **Tab Stipendi Riconciliazione** - Nome dipendente ora visibile in evidenza
4. **Banner Logica Intelligente** - Rimossi da TUTTE le pagine
5. **Pagina Documenti AI** - Filtro tipo, descrizioni leggibili, controllo duplicati

### 🔄 File Modificati:
- `/app/app/routers/noleggio.py` - Parser bollo e verbali migliorato
- `/app/frontend/src/pages/NoleggioAuto.jsx` - Pulsante visualizza fatture
- `/app/frontend/src/pages/RiconciliazioneUnificata.jsx` - Nome dipendente visibile
- `/app/frontend/src/pages/Documenti.jsx` - Filtri e descrizioni migliorate

---

## 34. Changelog Sessione 19 Gen 2026 (Quarta Parte)

### ✅ Completati:
1. **Rimossa colonna "Metodo Pag." duplicata** dalla tab Archivio Fatture Ricevute
   - La colonna era ridondante poiché lo stato è già visibile nella colonna "Stato"
   - Il menu di pagamento ora è integrato nel pulsante "Paga ▼" / "Pagata ▼"
   
2. **Implementato cambio metodo pagamento per fatture già pagate**:
   - Nuovo endpoint: `POST /api/fatture-ricevute/cambia-metodo-pagamento`
   - Permette di spostare un pagamento da Prima Nota Cassa a Prima Nota Banca (e viceversa)
   - Mantiene la data del documento originale
   - Aggiorna automaticamente i riferimenti nella fattura
   
3. **Menu dropdown unificato per pagamenti nell'Archivio**:
   - Pulsante "💳 Paga ▼" per fatture non pagate
   - Pulsante "✓ Pagata ▼" per fatture già pagate
   - Opzioni: "Paga con Cassa", "Paga con Banca", "Sposta in Cassa", "Sposta in Banca"

### 🔄 File Modificati:
- `/app/frontend/src/pages/ArchivioFattureRicevute.jsx` - Rimossa colonna duplicata, nuovo menu dropdown
- `/app/app/routers/invoices/fatture_ricevute.py` - Nuovo endpoint cambio metodo pagamento

---

## 35. Changelog Sessione 19 Gen 2026 (Quinta Parte)

### ✅ Completati:
1. **Rimossa colonna "Metodo Pag." duplicata** dalla tab Archivio Fatture Ricevute
2. **Rimossa colonna "Stato" duplicata** dalla tab Archivio - lo stato è già visibile nei pulsanti
3. **Implementato cambio metodo pagamento diretto** (senza pulsante "Sposta"):
   - Pulsanti 💵 (Cassa) e 🏦 (Banca) - cliccando si sposta direttamente il pagamento
   - Il pulsante attivo mostra ✓ ed è evidenziato (verde per Cassa, blu per Banca)
   - Lo spostamento avviene senza conferma aggiuntiva
   - Usa l'ID della prima nota per determinare se il pagamento è in cassa o banca
4. **Ottimizzazione Performance Critiche**:
   - Endpoint `/api/fatture-ricevute/archivio`: da 29s a ~1s
   - Rimosso campo `xml_content` e `linee` dalla projection per velocizzare
   - Ottimizzata la logica di filtro per anno (range query invece di regex)

### 🔄 File Modificati:
- `/app/frontend/src/pages/ArchivioFattureRicevute.jsx` - UI semplificata, colonne ridotte
- `/app/app/routers/invoices/fatture_ricevute.py` - Ottimizzazione query

### ⚠️ Da Ottimizzare in Futuro:
- Endpoint `/api/suppliers` ancora lento (~5s) - richiede ottimizzazione aggregazione

---

## 36. Clausola finale

Questo PRD è vincolante.

Ogni sviluppo futuro deve:
- rispettare i validatori,
- non introdurre eccezioni silenziose,
- mantenere la tracciabilità completa.

---

## 37. Changelog Sessione 19 Gen 2026 (Performance Fix)

### ✅ Completati:

1. **Ottimizzazione Performance API /api/suppliers**:
   - Tempo ridotto da ~5.3s a ~0.07s (con cache)
   - Implementato caching con TTL 5 minuti
   - Query semplificata: prima carica da collection suppliers, poi arricchisce con stats fatture

2. **Ottimizzazione Performance API /api/f24-public/models**:
   - Tempo ridotto a ~0.25s
   - Query con proiezione limitata (esclusi campi pesanti)
   - Limite 100 documenti per performance

3. **Refactoring Dashboard**:
   - Card "Bilancio Istantaneo" più compatta (4 colonne su 1 riga)
   - Card "Calcolo Imposte" più compatta (4 colonne su 1 riga)
   - Aggiunto nuovo widget "Scadenze F24" con lista compatta
   - Font ridotti e padding ottimizzato

4. **Rimozione Tab Scadenze**:
   - Rimossa da /fatture-ricevute (centralizzata in Dashboard)
   - TABS ora contiene solo: archivio, riconciliazione, storico

5. **Nuovo Endpoint Pubblico Scadenze F24**:
   - `GET /api/f24-public/scadenze-prossime` (senza autenticazione)
   - Combina dati da collections f24 e f24_models
   - Ordina per giorni mancanti alla scadenza

### 🔄 File Modificati:
- `/app/app/routers/suppliers.py` - Ottimizzazione endpoint list_suppliers
- `/app/app/routers/f24/f24_public.py` - Ottimizzato list_f24_models, aggiunto scadenze-prossime
- `/app/app/routers/f24/f24_main.py` - Rimosso endpoint duplicato scadenze-prossime
- `/app/frontend/src/pages/Dashboard.jsx` - Card compatte, widget Scadenze F24
- `/app/frontend/src/pages/ArchivioFattureRicevute.jsx` - Tab Scadenze già rimossa

### Performance Verificate (Test Report iteration_19):
| Endpoint | Prima | Dopo |
|----------|-------|------|
| /api/suppliers | ~5.3s | ~0.07s (cache) |
| /api/f24-public/models | timeout | ~0.25s |
| /api/fatture-ricevute/archivio | ~29s | ~2.6s |

---

## 38. Changelog Sessione 19 Gen 2026 (Uniformazione Grafica)

### ✅ Pagine Uniformate con Header Gradiente Blu:

| Pagina | File | Stato |
|--------|------|-------|
| Noleggio Auto | NoleggioAuto.jsx | ✅ Riferimento |
| Corrispettivi | Corrispettivi.jsx | ✅ Già uniforme |
| Fornitori | Fornitori.jsx | ✅ Aggiornato |
| F24 | F24.jsx | ✅ Aggiornato |
| Cedolini | CedoliniRiconciliazione.jsx | ✅ Aggiornato |
| Riconciliazione | RiconciliazioneUnificata.jsx | ✅ Aggiornato |
| Riconciliazione (simple) | Riconciliazione.jsx | ✅ Aggiornato |
| Cedolini Calcolo | Cedolini.jsx | ✅ Aggiornato |

### Stile Applicato:
- **Header**: `linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)`
- **Border-radius**: 12px
- **Padding**: 15px 20px
- **Titolo**: bianco, font-weight bold, size 18-22px
- **Sottotitolo**: bianco, opacity 0.9, size 13px
- **Pulsanti secondari**: bianco con testo blu scuro
- **Pulsanti primari**: verde (#10b981)

---

## 39. Changelog Sessione 19 Gen 2026 (Refactoring noleggio.py)

### ✅ Refactoring Completato

**Struttura precedente**: 1 file monolitico di 1085 righe
**Struttura nuova**: Modulo strutturato con 4 file

```
/app/app/services/noleggio/
├── __init__.py     # Export pubblici
├── constants.py    # Costanti e configurazioni fornitori
├── parsers.py      # Funzioni di parsing (targhe, verbali, categorie)
└── processors.py   # Business logic (scan fatture, processa fattura)

/app/app/routers/noleggio.py  # Solo endpoint API (ridotto a ~380 righe)
```

### File Creati:
- `/app/app/services/noleggio/__init__.py` - Export pubblici modulo
- `/app/app/services/noleggio/constants.py` - Costanti FORNITORI_NOLEGGIO, TARGA_PATTERN
- `/app/app/services/noleggio/parsers.py` - Funzioni estrai_*, categorizza_spesa
- `/app/app/services/noleggio/processors.py` - processa_fattura_noleggio, scan_fatture_noleggio

### File Modificati:
- `/app/app/routers/noleggio.py` - Ridotto a soli endpoint API
- `/app/app/routers/ciclo_passivo_integrato.py` - Aggiornato import
- `/app/app/main.py` - Corretto prefix router a `/api/noleggio`

### Performance:
- Endpoint `/api/noleggio/veicoli` ottimizzato: **da 10s a 0.5s**
- Aggiunta proiezione MongoDB per escludere campi pesanti
- Default anno corrente per evitare scan completo

---

## 40. Changelog Sessione 19 Gen 2026 (Ottimizzazione Imposte + Refactoring)

### ✅ Ottimizzazione API Calcolo Imposte

**Prima**: Timeout >60 secondi  
**Dopo**: ~0.36 secondi

**Modifiche**:
- Rimosso caricamento completo fatture con `.to_list()`
- Implementato aggregazione MongoDB per calcolo totali
- Aggiunta proiezione per escludere campi pesanti
- Default anno corrente se non specificato

**File modificato**: `/app/app/services/calcolo_imposte.py`

---

### ✅ Refactoring Moduli

#### 1. Modulo Suppliers (`/app/app/services/suppliers/`)
```
├── __init__.py     # Export pubblici
├── constants.py    # Collections, metodi pagamento, termini
├── validators.py   # valida_fornitore, clean_mongo_doc
├── iban_service.py # ricerca_iban_web, estrai_iban_da_fatture
└── sync_service.py # sincronizza_da_fatture, aggiorna_da_invoices
```

#### 2. Modulo Ciclo Passivo (`/app/app/services/ciclo_passivo/`)
```
├── __init__.py        # Export pubblici
├── constants.py       # Collections, metodi pag, conti contabili
├── helpers.py         # estrai_codice_lotto, detect_centro_costo
├── magazzino.py       # processa_carico_magazzino, genera_id_lotto
├── prima_nota.py      # genera_scrittura_prima_nota
├── scadenziario.py    # crea_scadenza_pagamento
└── riconciliazione.py # cerca_match_bancario, esegui_riconciliazione
```

### Performance Verificate:
| Endpoint | Prima | Dopo |
|----------|-------|------|
| /api/contabilita/calcolo-imposte | >60s | 0.36s |
| /api/noleggio/veicoli | 10s | 0.5s |
| /api/suppliers | 5.3s | 0.07s (cache) |

---
