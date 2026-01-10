# 📋 LOGICHE APPLICAZIONE - Documento Completo per Revisione

**NOTA PER L'UTENTE:** Questo documento descrive la logica attuale di ogni pagina e flusso. Per favore correggi/integra dove necessario!

---

## ⚠️ REGOLE FONDAMENTALI PAGAMENTI (SACRE - NON VIOLARE MAI)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        REGOLA D'ORO DEI PAGAMENTI                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1. Se NON trovo in estratto conto → NON posso mettere "Bonifico"            │
│ 2. Se il fornitore ha metodo "Cassa" → devo rispettarlo                     │
│ 3. Solo se TROVO in estratto conto → posso mettere Bonifico/Assegno         │
│ 4. Se nessun match → lo stato resta "Importata" (non pagata)                │
│ 5. TUTTO DEVE ESSERE CASE-INSENSITIVE (ricerche, match, confronti)          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

# 📥 SEZIONE 1: PAGINE DI IMPORT

## 1.1 Import Estratto Conto Bancario (`/import-export` → Sezione Estratto Conto)

**File accettati:** CSV o XLSX formato banca
**Endpoint:** `POST /api/estratto-conto-movimenti/import`

### FLUSSO LOGICO:

```
UTENTE CARICA FILE CSV/XLSX
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: PARSING FILE                                                        │
│                                                                             │
│ Estrae per ogni riga:                                                       │
│ - Data contabile (DD/MM/YYYY)                                               │
│ - Data valuta                                                               │
│ - Importo (con virgola → punto decimale)                                    │
│ - Descrizione originale                                                     │
│ - Categoria                                                                 │
│ - Ragione sociale                                                           │
│                                                                             │
│ CALCOLA AUTOMATICAMENTE:                                                    │
│ - tipo = "entrata" se importo > 0, "uscita" se importo < 0                  │
│ - fornitore = estratto dalla descrizione (dopo "FAVORE")                    │
│ - numero_fattura = estratto dalla descrizione (pattern regex)               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: SALVATAGGIO                                                         │
│                                                                             │
│ Salva in: estratto_conto_movimenti                                          │
│                                                                             │
│ Controllo duplicati: data + importo + primi 50 char descrizione             │
│ Se duplicato → IGNORA (non inserisce)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: RICONCILIAZIONE AUTOMATICA (avviata automaticamente!)               │
│                                                                             │
│ Per OGNI movimento dell'estratto conto non ancora riconciliato:             │
│                                                                             │
│ 3.1 È COMMISSIONE BANCARIA?                                                 │
│     - Descrizione contiene "COMMISSIONI", "SPESE", "BOLLO", "CANONE"?       │
│     - Importo è €0.75, €1.00, €1.10, €1.50, €2.00, €2.50, €3.00?            │
│     → SÌ: marca come "commissione_ignorata", vai al prossimo                │
│                                                                             │
│ 3.2 È UNA USCITA (pagamento)?                                               │
│                                                                             │
│     A) CERCA PER NUMERO FATTURA + IMPORTO ESATTO (±0.05€):                  │
│        - Estrai numero fattura dalla descrizione                            │
│        - Cerca in invoices: numero + importo match                          │
│        → TROVATA 1 SOLA? → RICONCILIA:                                      │
│          fattura.pagato = true                                              │
│          fattura.in_banca = true                                            │
│          fattura.metodo_pagamento = "Bonifico" (o "Assegno N.XXX")          │
│          fattura.riconciliato_con_ec = movimento_id                         │
│                                                                             │
│     B) SE NON TROVATA PER NUMERO, CERCA SOLO PER IMPORTO ESATTO:            │
│        - Cerca tutte le fatture con importo_totale = movimento.importo      │
│        - Se nome fornitore nella descrizione → filtra per fornitore         │
│                                                                             │
│        → TROVATA 1 SOLA? → RICONCILIA (come sopra)                          │
│        → TROVATE MULTIPLE? → Crea OPERAZIONE DA CONFERMARE                  │
│          (utente dovrà scegliere manualmente quale fattura)                 │
│                                                                             │
│ 3.3 È PAGAMENTO F24?                                                        │
│     - Descrizione contiene "F24"?                                           │
│     - Cerca F24 con stesso importo                                          │
│     → TROVATO? f24.pagato = true, f24.in_banca = true                       │
│                                                                             │
│ 3.4 È ACCREDITO POS? (entrata)                                              │
│     - Descrizione contiene "POS", "NEXI", "SUMUP", "CARTE", "BANCOMAT"?     │
│     - LOGICA CALENDARIO:                                                    │
│       * Lunedì: cerca somma POS di Ven+Sab+Dom                              │
│       * Mar-Gio: cerca POS del giorno precedente                            │
│     → MATCH? marca POS in prima_nota_cassa come riconciliato                │
│                                                                             │
│ 3.5 È VERSAMENTO? (entrata)                                                 │
│     - Descrizione contiene "VERS", "VERSAMENTO", "CONTANTI"?                │
│     - Cerca versamento in prima_nota_cassa con stessa data e importo        │
│     → MATCH? marca versamento come riconciliato                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DOVE VENGONO SALVATI I DATI:
| Collection | Cosa viene salvato |
|------------|-------------------|
| `estratto_conto_movimenti` | Tutti i movimenti importati |
| `invoices` | Aggiornati: pagato, in_banca, metodo_pagamento |
| `operazioni_da_confermare` | Movimenti con match multipli |
| `f24_models` | Aggiornati: pagato, in_banca |
| `prima_nota_cassa` | Aggiornati: riconciliato, in_banca |

---

## 1.2 Import Fatture XML (`/import-export` → Sezione Fatture XML)

**File accettati:** XML singolo, XML multipli, ZIP con XML
**Endpoint:** `POST /api/fatture/upload`, `/api/fatture/upload-bulk`

### FLUSSO LOGICO:

```
UTENTE CARICA FILE XML / ZIP
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: ESTRAZIONE (se ZIP)                                                 │
│                                                                             │
│ - Estrae tutti i file .xml dal ZIP                                          │
│ - Gestisce anche ZIP annidati                                               │
│ - Ignora file __MACOSX                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: PARSING XML FatturaPA                                               │
│                                                                             │
│ Estrae:                                                                     │
│ - CedentePrestatore (fornitore): denominazione, P.IVA, indirizzo            │
│ - CessionarioCommittente (cliente): denominazione, P.IVA                    │
│ - DatiGeneraliDocumento: numero, data, tipo documento (TD01, TD04, etc.)    │
│ - DettaglioLinee: descrizione, prezzo, quantità, IVA                        │
│ - DatiPagamento: modalità, scadenza, IBAN                                   │
│ - Riepilogo: imponibile, imposta, totale                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: CONTROLLO DUPLICATI                                                 │
│                                                                             │
│ Chiave univoca: numero_fattura + P.IVA_fornitore + data + importo           │
│ Se esiste già → IGNORA (restituisce errore 409 o messaggio "duplicato")     │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: SALVATAGGIO FATTURA                                                 │
│                                                                             │
│ Salva in: invoices                                                          │
│                                                                             │
│ STATO INIZIALE OBBLIGATORIO:                                                │
│ - status = "imported"                                                       │
│ - pagato = false                                                            │
│ - paid = false                                                              │
│ - in_banca = false (o null)                                                 │
│ - metodo_pagamento = METODO_DEFAULT_FORNITORE (se esiste in suppliers)      │
│                       oppure NULL (se fornitore non ha default)             │
│                                                                             │
│ ⚠️ NON METTERE MAI "BONIFICO" AL MOMENTO DELL'IMPORT!                       │
│    Il bonifico si può mettere SOLO dopo riconciliazione con estratto conto  │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: AGGIORNAMENTO/CREAZIONE FORNITORE                                   │
│                                                                             │
│ Cerca fornitore per P.IVA:                                                  │
│ - Se esiste → aggiorna dati se necessario                                   │
│ - Se non esiste → crea nuovo fornitore con dati dalla fattura               │
│                                                                             │
│ IMPORTANTE: Il metodo_pagamento del fornitore NON viene modificato          │
│ automaticamente. Deve essere impostato manualmente dall'utente.             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### DOVE VENGONO SALVATI I DATI:
| Collection | Cosa viene salvato |
|------------|-------------------|
| `invoices` | Fattura completa con tutti i dati XML |
| `suppliers` | Fornitore (creato o aggiornato) |

---

## 1.3 Import Corrispettivi (`/import-export` → Sezione Corrispettivi)

**File accettati:** XLSX (registratore cassa), XML
**Endpoint:** `POST /api/prima-nota-auto/import-corrispettivi`, `/api/prima-nota-auto/import-corrispettivi-xml`

### FLUSSO LOGICO:

```
UTENTE CARICA FILE XLSX/XML
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARSING                                                                     │
│                                                                             │
│ Per XLSX cerca colonne:                                                     │
│ - "Data e ora rilevazione" → data                                           │
│ - "Imponibile vendite" → imponibile                                         │
│ - "Imposta vendite" → IVA                                                   │
│ - "Ammontare delle vendite" → totale (backup)                               │
│                                                                             │
│ Per XML cerca tag:                                                          │
│ - <DatiFatturaBodyDTE> → dati corrispettivo                                 │
│ - PagatoContanti + PagatoElettronico = TOTALE                               │
│                                                                             │
│ ⚠️ CALCOLO IMPORTO = LORDO (imponibile + imposta)                           │
│    NON usare solo l'ammontare vendite se disponibili imponibile+imposta     │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SALVATAGGIO                                                                 │
│                                                                             │
│ Salva in: prima_nota_cassa                                                  │
│                                                                             │
│ Record:                                                                     │
│ - tipo = "entrata" (entrano soldi in cassa)                                 │
│ - categoria = "Corrispettivi"                                               │
│ - importo = LORDO (imponibile + IVA)                                        │
│ - data = data rilevazione                                                   │
│ - descrizione = "Corrispettivi giornalieri"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.4 Import POS (`/import-export` → Sezione Incassi POS)

**File accettati:** XLSX
**Endpoint:** `POST /api/prima-nota-auto/import-pos`

### FLUSSO LOGICO:

```
UTENTE CARICA FILE XLSX
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARSING                                                                     │
│                                                                             │
│ Cerca colonne: DATA | CONTO | IMPORTO                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SALVATAGGIO                                                                 │
│                                                                             │
│ Salva in: prima_nota_cassa                                                  │
│                                                                             │
│ Record:                                                                     │
│ - tipo = "uscita" (escono dalla cassa verso la banca!)                      │
│ - categoria = "POS"                                                         │
│ - importo = valore POS                                                      │
│                                                                             │
│ ⚠️ È "uscita" perché il denaro elettronico non resta in cassa,              │
│    ma va verso il conto bancario (accredito nei giorni successivi)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**LOGICA RICONCILIAZIONE POS:**
```
Accredito POS in estratto conto:
- Martedì-Giovedì: accredito = incassi giorno precedente
- Lunedì: accredito = somma incassi Venerdì + Sabato + Domenica
```

---

## 1.5 Import Versamenti (`/import-export` → Sezione Versamenti)

**File accettati:** CSV formato banca
**Endpoint:** `POST /api/prima-nota-auto/import-versamenti`

### FLUSSO LOGICO:

```
UTENTE CARICA FILE CSV
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SALVATAGGIO                                                                 │
│                                                                             │
│ Salva in: prima_nota_cassa (SOLO QUI!)                                      │
│                                                                             │
│ Record:                                                                     │
│ - tipo = "uscita" (escono contanti dalla cassa)                             │
│ - categoria = "Versamento"                                                  │
│ - importo = valore versato                                                  │
│                                                                             │
│ ⚠️ NON SALVARE IN prima_nota_banca!                                         │
│    L'entrata corrispondente in banca arriverà dall'estratto conto           │
│    e verrà riconciliata automaticamente                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.6 Import F24 (`/import-export` → Sezione F24 Contributi)

**File accettati:** PDF singoli, multipli, ZIP
**Endpoint:** `POST /api/f24-public/upload`, `/api/f24-public/upload-bulk`

### FLUSSO LOGICO:

```
UTENTE CARICA PDF
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SALVATAGGIO                                                                 │
│                                                                             │
│ Salva in: f24_models                                                        │
│                                                                             │
│ Record:                                                                     │
│ - pdf_base64 = contenuto PDF codificato                                     │
│ - totale = importo (se estratto)                                            │
│ - periodo_riferimento = mese/anno                                           │
│ - pagato = false (iniziale)                                                 │
│ - riconciliato = false                                                      │
│                                                                             │
│ Diventa pagato=true quando:                                                 │
│ - Riconciliato con movimento in estratto conto                              │
│ - Oppure marcato manualmente dall'utente                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.7 Import Archivio Bonifici (`/import-export` → Sezione Archivio Bonifici)

**File accettati:** PDF o ZIP
**Endpoint:** `POST /api/archivio-bonifici/jobs`

### FLUSSO LOGICO:

```
UTENTE CARICA PDF/ZIP
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARSING OCR                                                                 │
│                                                                             │
│ Estrae:                                                                     │
│ - Data bonifico                                                             │
│ - Importo                                                                   │
│ - Beneficiario                                                              │
│ - Causale                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SALVATAGGIO                                                                 │
│                                                                             │
│ Salva in: bank_transfers                                                    │
│                                                                             │
│ ⚠️ QUESTO È SOLO UN ARCHIVIO DI CONSULTAZIONE!                              │
│    Non viene usato per riconciliazione automatica.                          │
│    Serve per verifiche manuali e storico.                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 📊 SEZIONE 2: PAGINE DI VISUALIZZAZIONE

## 2.1 Pagina Fatture (`/fatture`)

**Scopo:** Visualizzazione e gestione fatture XML importate

### COSA MOSTRA:
- Lista fatture filtrabili per anno, fornitore, numero, importo, stato
- Dettaglio fattura con linee, pagamento, fornitore
- Stato: Importata / Pagata
- Metodo pagamento (dropdown modificabile)
- Flag "In Banca" se riconciliata

### AZIONI DISPONIBILI:
1. **Cambia metodo pagamento** (dropdown)
   - ⚠️ Se selezioni "Bonifico" → il sistema dovrebbe verificare che la fattura sia in_banca=true!
   
2. **Segna come Pagata** (pulsante)
   - ⚠️ Prima di pagare: verificare che metodo sia coerente!
   - Se metodo = "Cassa" → OK, segna pagata
   - Se metodo = "Bonifico" e in_banca=false → ERRORE LOGICO!

3. **Elimina** (solo fatture manuali, non XML)

### LOGICA VISUALIZZAZIONE:
```
Per ogni fattura mostra:
- Data, Numero, Tipo documento
- Fornitore (denominazione + P.IVA)
- Importo totale
- Metodo pagamento (dal campo metodo_pagamento, o default fornitore)
- Stato: 
  - "✓ Pagata" se pagato=true
  - "Importata" se status="imported"
  - "✓ In Banca" se in_banca=true
```

---

## 2.2 Pagina Prima Nota (`/prima-nota`)

**Scopo:** Visualizzazione movimenti cassa e banca

### SEZIONE CASSA (prima_nota_cassa):
- **ENTRATE (DARE):**
  - Corrispettivi (vendite giornaliere)
  - Incassi cliente in contanti
  
- **USCITE (AVERE):**
  - POS (trasferimento verso banca)
  - Versamenti (deposito contanti su c/c)
  - Pagamenti fornitore in contanti

### SEZIONE BANCA:
- ⚠️ ORA È SOLA LETTURA!
- Mostra i movimenti da `estratto_conto_movimenti`
- Non permette modifiche dirette
- L'utente importa l'estratto conto, non inserisce movimenti manualmente

---

## 2.3 Pagina Operazioni da Confermare (`/operazioni-da-confermare`)

**Scopo:** Gestione match dubbi dalla riconciliazione automatica

### COSA MOSTRA:
- Movimenti dell'estratto conto che hanno più fatture candidate
- Per ogni movimento:
  - Data, Descrizione completa, Importo
  - Tipo match (Multi = multiple fatture)
  - Dropdown con fatture candidate (data, numero, fornitore, importo)

### AZIONI DISPONIBILI:
1. **Conferma** - Seleziona fattura dal dropdown e conferma
   - Fattura → pagato=true, in_banca=true, metodo="Bonifico"
   - Movimento EC → riconciliato=true
   
2. **Ignora** - Scarta il movimento (non è associato a nessuna fattura)

3. **Scarta Commissioni** - Elimina tutte le commissioni bancarie dalla lista

4. **Riconcilia Auto** - Riesegue la riconciliazione automatica

### FILTRI:
- Checkbox "Mostra commissioni" (default: nascoste)
- Dropdown tipo match

---

## 2.4 Pagina Fornitori (`/fornitori`)

**Scopo:** Anagrafica fornitori

### CAMPI IMPORTANTI:
- Denominazione
- P.IVA
- Indirizzo, CAP, Comune, Provincia
- **metodo_pagamento** - FONDAMENTALE!
  - "Cassa" → fatture pagate in contanti
  - "Bonifico" → fatture pagate via banca
  - "Assegno" → fatture pagate con assegno
  - "Misto" → varia

### LOGICA:
```
Quando importo una fattura XML:
1. Cerco fornitore per P.IVA
2. Se esiste e ha metodo_pagamento definito:
   → La fattura eredita quel metodo come default
3. Se non esiste o non ha metodo:
   → La fattura ha metodo_pagamento = NULL
```

---

## 2.5 Pagina Riconciliazione (`/riconciliazione`)

**Scopo:** Dashboard e controllo riconciliazione

### COSA MOSTRA:
- Statistiche: % movimenti riconciliati
- Contatori: riconciliati, da confermare, non trovati
- Lista movimenti recenti

### AZIONI:
- **Esegui Riconciliazione** - Avvia/Riavvia il processo
- **Reset Riconciliazione** - Pulisce tutti i dati di riconciliazione

---

# 🔄 SEZIONE 3: PROCESSO COMPLETO

## 3.1 Flusso Completo Ideale

```
STEP 1: IMPORT FATTURE XML
    │
    │  Risultato: Fatture in stato "imported", pagato=false
    │
    ▼
STEP 2: IMPORT CORRISPETTIVI + POS + VERSAMENTI
    │
    │  Risultato: Prima Nota Cassa popolata
    │
    ▼
STEP 3: IMPORT ESTRATTO CONTO BANCARIO
    │
    │  Risultato: 
    │  - Movimenti salvati in estratto_conto_movimenti
    │  - Riconciliazione automatica avviata
    │
    ├─────────────────────────────────────────────────────────────┐
    │                                                             │
    ▼                                                             ▼
MATCH SICURI                                              MATCH DUBBI
    │                                                             │
    │  Fattura:                                                   │  Salvati in:
    │  - pagato = true                                            │  operazioni_da_confermare
    │  - in_banca = true                                          │
    │  - metodo_pagamento = "Bonifico"                            │
    │                                                             │
    ▼                                                             ▼
COMPLETATO                                                STEP 4: CONFERMA MANUALE
                                                              │
                                                              │  Utente seleziona fattura corretta
                                                              │
                                                              ▼
                                                          COMPLETATO
```

---

# ❌ SEZIONE 4: ERRORI DA NON COMMETTERE

## 4.1 Errori sui Pagamenti

| Errore | Conseguenza | Soluzione |
|--------|-------------|-----------|
| Mettere "Bonifico" senza corrispondenza in EC | Dati incoerenti, fattura risulta pagata ma non c'è traccia bancaria | Usare endpoint bonifica |
| Ignorare metodo fornitore | Fornitore pagato sempre in cassa risulta pagato con bonifico | Rispettare sempre il metodo |
| Segnare pagata fattura senza metodo | Ambiguità su come è stata pagata | Richiedere metodo prima di pagare |

## 4.2 Errori sui Duplicati

| Errore | Conseguenza | Soluzione |
|--------|-------------|-----------|
| Non controllare duplicati EC | Stessi movimenti importati più volte | Controllo data+importo+descrizione |
| Non controllare duplicati fatture | Stessa fattura presente più volte | Controllo numero+piva+data+importo |

## 4.3 Errori sulla Riconciliazione

| Errore | Conseguenza | Soluzione |
|--------|-------------|-----------|
| Match per importo "simile" | Associazioni errate | Match SOLO per importo ESATTO (±0.05€) |
| Case-sensitive search | Mancati match | TUTTO case-insensitive |
| Ignorare numero assegno | Perdita tracciabilità | Estrarre e salvare numero assegno |

---

# 📁 SEZIONE 5: DATABASE

## 5.1 Collections Principali

| Collection | Descrizione | Campi Chiave |
|------------|-------------|--------------|
| `invoices` | Fatture XML | id, invoice_number, supplier_name, supplier_vat, total_amount, status, pagato, metodo_pagamento, in_banca |
| `suppliers` | Fornitori | vat_number, name, metodo_pagamento |
| `estratto_conto_movimenti` | Movimenti banca | data, importo, descrizione_originale, tipo, riconciliato |
| `prima_nota_cassa` | Movimenti cassa | data, importo, categoria, tipo, riconciliato |
| `operazioni_da_confermare` | Match dubbi | movimento_ec_id, fatture_candidate, stato |
| `f24_models` | Modelli F24 | totale, periodo, pagato, pdf_base64 |
| `bank_transfers` | Archivio bonifici | data, importo, beneficiario, causale |

## 5.2 Campi Critici Fatture

| Campo | Tipo | Descrizione | Valori Validi |
|-------|------|-------------|---------------|
| `status` | string | Stato fattura | "imported", "paid", "deleted" |
| `pagato` | boolean | Flag pagamento | true, false |
| `metodo_pagamento` | string | Come pagata | "Cassa", "Bonifico", "Assegno N.XXX", "Misto", "Carta", null |
| `in_banca` | boolean | Riconciliata con EC | true, false, null |
| `riconciliato_con_ec` | string | ID movimento EC | uuid o null |
| `riconciliato_automaticamente` | boolean | Match automatico | true, false |

---

# ✅ SEZIONE 6: REGOLE CASE-INSENSITIVE

**TUTTE le ricerche e confronti devono essere case-insensitive:**

```javascript
// MongoDB queries
{"metodo_pagamento": {"$regex": "^bonifico$", "$options": "i"}}
{"supplier_name": {"$regex": fornitore, "$options": "i"}}
{"descrizione": {"$regex": keyword, "$options": "i"}}

// Python comparisons
if metodo.lower() in ["bonifico", "banca", "sepa"]:
if "assegno" in metodo.lower():
```

---

*Documento creato per revisione utente - Gennaio 2026*
*Per favore correggi/integra dove necessario!*
