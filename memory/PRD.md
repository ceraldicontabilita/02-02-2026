# PRD – TechRecon Accounting System
## Product Requirements Document (PRD)
## TechRecon Accounting System – Versione Super Articolata
### Ultimo aggiornamento: 17 Gennaio 2026

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
6. **Refactoring vecchi parser** - Deprecare parser regex obsoleti (payslip, f24) in favore di Document AI

### 🟠 P2 - Bassa Priorità:
7. **Refactoring backend** - Modularizzare file grandi

---

## 31. Clausola finale

Questo PRD è vincolante.

Ogni sviluppo futuro deve:
- rispettare i validatori,
- non introdurre eccezioni silenziose,
- mantenere la tracciabilità completa.

---
