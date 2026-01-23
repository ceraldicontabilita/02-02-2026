# PRD – TechRecon Accounting System
## Product Requirements Document
### Ultimo aggiornamento: Dicembre 2025 (Sessione 19 - Audit e Refactoring MongoDB-Only)

---

## 1. PANORAMICA DEL SISTEMA

### 1.1 Obiettivo
Sistema ERP contabile per aziende italiane con:
- Conformità normativa italiana (fatturazione elettronica, F24, IVA)
- Riduzione errore umano tramite validazione automatica
- Tracciabilità completa di ogni operazione
- Scalabilità senza introdurre incoerenze
- **NUOVO**: Interfaccia mobile-first per inserimenti rapidi
- **NUOVO**: Architettura MongoDB-Only per persistenza dati
- **NUOVO**: Ricerca Globale funzionante (fatture, fornitori, prodotti, dipendenti)

### 1.2 Stack Tecnologico
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas (**UNICA fonte di persistenza dati**)
- **Integrazioni**: InvoiceTronic (SDI), PagoPA, Email IMAP

### 1.3 ⚠️ ARCHITETTURA MONGODB-ONLY (CRITICO)
**REGOLA FONDAMENTALE**: Nessun file o dato deve essere salvato sul filesystem locale.
- Tutti i PDF devono essere salvati come Base64 nel campo `pdf_data` in MongoDB
- Gli endpoint di download devono leggere da `pdf_data`, NON da `filepath`
- Gli endpoint di eliminazione devono operare SOLO sul database
- I riferimenti `filepath` rimasti sono per endpoint di migrazione legacy

### 1.4 File Completamente Rifattorizzati (Sessione 19)
| File | Stato | Riferimenti |
|------|-------|-------------|
| `services/cedolini_manager.py` | ✅ MongoDB-only | 0 |
| `services/email_monitor_service.py` | ✅ MongoDB-only | 0 |
| `routers/documenti_module/crud.py` | ✅ MongoDB-only | 0 |
| `services/parser_f24.py` | ✅ Supporta bytes | 2 (parametri) |
| `services/f24_parser.py` | ✅ Supporta bytes | 4 (parametri) |
| `routers/f24/f24_main.py` | ✅ MongoDB-only | 1 (commento) |
| `routers/f24/email_f24.py` | ✅ MongoDB-only | 0 |
| `routers/f24/f24_riconciliazione.py` | ✅ MongoDB-only | 0 |
| `routers/f24/quietanze.py` | ✅ MongoDB-only | 0 |
| `routers/f24/f24_public.py` | ✅ MongoDB-only | 2 (fallback) |
| `routers/quietanze_f24.py` | ✅ MongoDB-only | 2 (query) |
| `routers/documenti_intelligenti.py` | ✅ MongoDB-only | 0 |
| `routers/bonifici_module/jobs.py` | ✅ MongoDB-only | 3 (batch) |
| `routers/employees/employee_contracts.py` | ✅ MongoDB-only | 9 (template) |
| `routers/documenti.py` | ✅ MongoDB-only | 6 (deprecated) |
| `services/email_full_download.py` | ✅ MongoDB-only | 14 (deprecated) |

**Totale riferimenti residui**: 63 (la maggior parte deprecati o parametri helper)

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

**Pagine di riferimento**: `/dashboard`, `/noleggio-auto`, `/fatture-ricevute`

### 2.4 📚 REGOLE DI RAGIONERIA (PARTITA DOPPIA)

**Principio Fondamentale**: DARE = AVERE (tolleranza ±0.01€)

| Operazione | DARE | AVERE |
|------------|------|-------|
| Incasso corrispettivo | Cassa | Ricavi vendite |
| Pagamento fornitore (bonifico) | Debiti fornitori | Banca |
| Pagamento fornitore (contanti) | Debiti fornitori | Cassa |
| Rimborso ricevuto | Banca/Cassa | Rimborsi attivi |
| Pagamento F24 | Debiti tributari | Banca |

**Prima Nota Cassa**: Corrispettivi XML, POS
**Prima Nota Banca**: Bonifici, Addebiti SEPA, F24, Stipendi, RID

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

### 3.4 ✅ Riconciliazione Intelligente
- Stati: `in_attesa_conferma`, `confermata_cassa`, `confermata_banca`, `riconciliata`
- Casi speciali: Assegni Multipli, Arrotondamenti, Pagamenti Anticipati
- Auto-riconciliazione F24

### 3.5 ✅ Bilancio e Contabilità Economica (COMPLETO 22/01/2026)

#### REGOLE CONTABILI FONDAMENTALI
1. **Ricavi** = SOLO Corrispettivi (vendite al pubblico)
2. **Fatture emesse a clienti** = NON sono ricavi aggiuntivi (già nei corrispettivi)
3. **IVA debito** = SOLO da corrispettivi

#### Learning Machine - Classificazione Automatica per Centro di Costo
Il sistema classifica **automaticamente** ogni fattura leggendo:
- Nome fornitore
- Descrizione linee fattura
- Keywords specifiche per bar/pasticceria (ATECO 56.10.30)

**38 Centri di Costo** configurati con regole fiscali:
| Centro | Deducibilità IRES | IVA Detraibile |
|--------|-------------------|----------------|
| B6 - Materie prime (caffè, farina, ecc.) | 100% | 100% |
| B7 - Energia, Acqua | 100% | 100% |
| **B7 - Telefonia** | **80%** | **50%** |
| **B7 - Carburante auto** | **20%** | **40%** |
| **B8 - Noleggio auto** | **20% (max €3.615)** | **40%** |
| B9 - Personale | 100% | N/A |
| C17 - Oneri finanziari | 100% | Esente |

#### Endpoint Learning Machine CDC
- `/api/learning-machine/centri-costo` - Lista centri di costo
- `/api/learning-machine/riclassifica-fatture?anno=X` - Riclassifica automatica
- `/api/learning-machine/processa-quietanza-f24` - Processa F24 e riconcilia con banca
- `/api/learning-machine/costo-personale-completo/{anno}` - Costo personale da cedolini + F24
- `/api/learning-machine/riepilogo-centri-costo/{anno}` - Riepilogo con calcoli fiscali

📄 **Documentazione:** `/app/app/REGOLE_CONTABILI.md`

### 3.6 ✅ Gestione Magazzino Avanzata (AGGIORNATO 23/01/2026)

Sistema completo di gestione magazzino per bar/pasticceria integrato con il ciclo della Learning Machine:

#### Funzionalità
- **Carico automatico da XML**: Parsing linee fattura con estrazione quantità/unità
- **26 categorie merceologiche**: Caffè, Vini, Farine, Latticini, Cacao, ecc.
- **Classificazione intelligente**: Pattern matching con confidence score
- **Distinta base (Ricette)**: Calcolo ingredienti proporzionale alle porzioni
- **Scarico per produzione**: Genera lotti con tracciabilità completa
- **Collegamento CDC**: Ogni articolo collegato al centro di costo

#### Endpoint Magazzino Avanzato
- `POST /api/magazzino/carico-da-fattura/{id}` - Carico da singola fattura XML
- `POST /api/magazzino/carico-massivo?anno=X` - Carico batch tutte le fatture
- `POST /api/magazzino/scarico-produzione?ricetta_id=X&porzioni_prodotte=Y` - Scarico per lotto
- `GET /api/magazzino/giacenze` - Giacenze raggruppate per categoria con valore
- `GET /api/magazzino/movimenti` - Storico movimenti (carico/scarico)
- `GET /api/magazzino/lotti-produzione` - Registro lotti produzione
- `GET /api/magazzino/categorie-merceologiche` - Lista 26 categorie

#### Collezioni Database Magazzino (CONSOLIDATE 23/01/2026)
- `warehouse_inventory` - **COLLEZIONE PRINCIPALE** (5372 articoli) - Usata da tutti i router
- `warehouse_movements` - Movimenti magazzino (3670 movimenti)
- `acquisti_prodotti` - Log acquisti da fatture
- `warehouse_stocks` - **DEPRECATA** (dati non validi)
- `movimenti_magazzino` - Storico movimenti
- `lotti_produzione` - Registro lotti
- `acquisti_prodotti` - Log prodotti caricati

### 3.7 ✅ Classificazione Documenti
- Pagina unificata `/classificazione-email`
- 3 tab: Classificazione, Documenti, Regole
- Scansione email automatica
- Visualizzazione PDF integrata

### 3.8 ✅ F24
- Import da commercialista
- Riconciliazione con estratto conto
- Gestione quietanze
- Codici tributari

### 3.9 ✅ Noleggio Auto
- Gestione veicoli e contratti
- Verbali (multe)
- Bolli e riparazioni
- Riconciliazione fatture

---

## 4. COLLEZIONI DATABASE

### 4.1 Principali
| Collection | Descrizione |
|------------|-------------|
| `employees` | Anagrafica dipendenti (include `in_carico`) |
| `giustificativi` | Definizione 26 codici giustificativi |
| `giustificativi_dipendente` | Saldi giustificativi per dipendente |
| `presenze_mensili` | Presenze e timbrature |
| `invoices` | Fatture ricevute |
| `suppliers` | Anagrafica fornitori |
| `prima_nota_cassa` | Movimenti cassa |
| `prima_nota_banca` | Movimenti banca |
| `estratto_conto_movimenti` | Movimenti da estratto conto |
| `f24` / `f24_models` | F24 e modelli |
| `cedolini` | Buste paga |
| `documenti_email` | Documenti classificati da email |
| `verbali_noleggio` | Verbali multe noleggio |

### 4.2 Riconciliazione
| Collection | Descrizione |
|------------|-------------|
| `assegni` | Gestione assegni |
| `pagamenti_anticipati` | Pagamenti prima della fattura |
| `abbuoni_arrotondamenti` | Differenze arrotondamento |
| `operazioni_sospese` | Operazioni da verificare |

---

## 5. API PRINCIPALI

### 5.1 Dipendenti e Presenze
```
GET  /api/attendance/dashboard-presenze
POST /api/attendance/timbratura
GET  /api/giustificativi/dipendente/{id}/giustificativi
POST /api/giustificativi/valida-giustificativo
GET  /api/giustificativi/alert-limiti          # Alert limiti (soglia 90%)
GET  /api/giustificativi/riepilogo-limiti      # Riepilogo per dashboard
```

### 5.2 Riconciliazione
```
GET  /api/riconciliazione-intelligente/dashboard
POST /api/riconciliazione-intelligente/conferma-pagamento
POST /api/riconciliazione-intelligente/assegni-multipli
POST /api/riconciliazione-intelligente/riconcilia-con-arrotondamento
```

### 5.3 Classificazione Documenti
```
POST /api/documenti-smart/scan
GET  /api/documenti-smart/documents
GET  /api/documenti-smart/rules
GET  /api/documenti-smart/documenti/{id}/pdf
```

### 5.4 F24
```
GET  /api/f24-riconciliazione/dashboard
POST /api/f24-riconciliazione/commercialista/upload
GET  /api/f24-riconciliazione/quietanze
```

### 5.5 Bilancio e IVA
```
GET  /api/bilancio/conto-economico?anno={anno}&mese={mese}
GET  /api/bilancio/stato-patrimoniale?anno={anno}
GET  /api/bilancio/confronto-annuale?anno_corrente={anno}&anno_precedente={anno}
GET  /api/bilancio/riepilogo?anno={anno}
GET  /api/bilancio/export-pdf?anno={anno}
GET  /api/bilancio/export/pdf/confronto?anno_corrente={anno}&anno_precedente={anno}
GET  /api/liquidazione-iva/calcola/{anno}/{mese}?credito_precedente={value}
GET  /api/liquidazione-iva/confronto/{anno}/{mese}?iva_debito_commercialista={val}&iva_credito_commercialista={val}
GET  /api/liquidazione-iva/riepilogo-annuale/{anno}
GET  /api/liquidazione-iva/export/pdf/{anno}/{mese}
```

---

## 6. INSERIMENTO RAPIDO MOBILE (NUOVO 23/01/2026)

### 6.1 Pagina `/rapido` - Interfaccia Mobile-First
Schede grandi tocco-friendly per inserimento dati da smartphone:

| Funzione | Descrizione | Endpoint |
|----------|-------------|----------|
| **Corrispettivi** | Incassi giornalieri | `POST /api/rapido/corrispettivo` |
| **Versamenti Banca** | Trasferimenti cassa→banca | `POST /api/rapido/versamento-banca` |
| **Apporto Soci** | Versamenti capitale | `POST /api/rapido/apporto-soci` |
| **Fatture Ricevute** | Lista fatture da pagare con bottoni Cassa/Banca | `GET /api/invoices` + `PATCH` |
| **Acconti Dipendenti** | Anticipi stipendio | `POST /api/rapido/acconto-dipendente` |
| **Presenze** | Registrazione presente/ferie/malattia/permesso | `POST /api/rapido/presenza` |

### 6.2 Caratteristiche UI
- Form a pagina intera (no popup)
- Input grandi con padding 14px
- Bottoni colorati per azioni rapide
- Navigazione semplice "Torna al menu"
- Griglia 2 colonne responsive

---

## 7. DOWNLOAD EMAIL E ALLEGATI (NUOVO 23/01/2026)

### 7.1 Sistema Download Completo
Scarica TUTTI i PDF dalla posta elettronica e li salva nel database:

```
POST /api/email-download/start-full-download?days_back=365  # Avvia download
GET  /api/email-download/status                              # Stato download
GET  /api/email-download/statistiche                         # Statistiche per categoria
GET  /api/email-download/documenti-non-associati            # PDF da associare
POST /api/email-download/auto-associa                        # Auto-associazione intelligente
POST /api/email-download/associa-documento                   # Associazione manuale
```

### 7.2 Categorizzazione Automatica
| Categoria | Pattern | Collezione |
|-----------|---------|------------|
| F24 | f24, tribut, agenzia entrate | `f24_email_attachments` |
| Fattura | fattur, invoice, imponibile | `fatture_email_attachments` |
| Busta Paga | cedolino, libro unico, stipendio | `cedolini_email_attachments` |
| Estratto Conto | estratto, movimenti, saldo | `estratti_email_attachments` |
| Quietanza | quietanza, ricevuta pagamento | `quietanze_email_attachments` |
| Bonifico | bonifico, cro, trn | `bonifici_email_attachments` |
| Verbale | verbale, multa, sanzione | `verbali_email_attachments` |
| Certificato Medico | certificato medico, inps malattia | `certificati_email_attachments` |
| Altro | (non classificato) | `documenti_non_associati` |

### 7.3 Risultati Download (23/01/2026)
- **652 PDF** scaricati totali
- **202 PDF** auto-associati a documenti esistenti
- Deduplicazione tramite hash MD5

---

## 8. VALIDATORI AUTOMATICI

### 6.1 P0 – Bloccanti
| Validatore | Endpoint | Status |
|------------|----------|--------|
| Fornitore senza metodo pagamento | `/api/invoices/import-xml` | ✅ Attivo |
| Metodo ≠ contanti senza IBAN | `/api/invoices/import-xml` | ✅ Attivo |
| Salari post giugno 2018 in contanti | `/api/cedolini` | ✅ Attivo |
| Giustificativo oltre limite | `/api/giustificativi/valida-giustificativo` | ✅ Attivo |

---

## 7. BACKLOG E PRIORITÀ

### 7.1 🔴 P0 - Alta Priorità

✅ **COMPLETATO (Dicembre 2025 - Sessione 19)**: Architettura MongoDB-Only
- **File completamente rifattorizzati** (0 riferimenti `filepath`):
  - `/app/app/services/cedolini_manager.py` - usa `pdf_data` Base64
  - `/app/app/services/email_monitor_service.py` - usa `pdf_data` per elaborazione
  - `/app/app/routers/documenti_module/crud.py` - download/elimina solo da MongoDB
  - `/app/app/routers/employees/employee_contracts.py` - salva `file_data` in MongoDB
- **Endpoint principali aggiornati**:
  - `GET /documenti/{id}/download` - legge da `pdf_data`, 404 se mancante
  - `POST /documento/{id}/cambia-categoria` - solo update MongoDB
  - `DELETE /documento/{id}` - solo delete da MongoDB
  - `POST /upload-documenti` - salva in MongoDB come Base64
- **Parser aggiornato**: `services/parser_f24.py` ora supporta `pdf_content` bytes
- **Test passati**: 20/20 (100%) - File test: `/app/backend/tests/test_documenti_mongodb_only.py`

✅ **RISOLTO (23/01/2026 - Sessione 18)**: Associazione PDF F24 dal Filesystem
- Script di associazione intelligente che abbina F24 per nome file
- **40/46 F24** ora hanno il PDF associato (87%)
- Funzione `smart_f24_association()` con pattern matching fuzzy

✅ **RISOLTO (23/01/2026)**: Bug Endpoint `/api/f24-riconciliazione/movimenti-f24-banca`
- L'endpoint leggeva dalla collezione vuota `movimenti_f24_banca` invece che da `estratto_conto_movimenti`
- Corretto per cercare pattern F24 (I24 AGENZIA, AGENZIA ENTRATE, ecc.) nella collezione corretta
- Ora trova 136 movimenti F24 (€196.073,15 totali)

✅ **RISOLTO (23/01/2026)**: Consolidamento F24 
- Collezioni `f24`, `f24_models` DEPRECATE → ora usano tutte `f24_commercialista`
- Router `email_f24`, `f24_gestione_avanzata`, `f24_tributi`, `accounting_f24` DISABILITATI
- Creato file centralizzato `/app/app/db_collections.py` con nomi collezioni e query pattern
- Aggiunto endpoint `/api/f24/upload-pdf` con parsing automatico

✅ **RISOLTO (23/01/2026)**: Consolidamento Magazzino
- Collezione `warehouse_stocks` DEPRECATA → ora usano tutte `warehouse_inventory`
- Router `magazzino_avanzato.py` aggiornato per usare nuovo schema

### 7.2 🟡 P1 - Media Priorità
✅ **RISOLTO (23/01/2026 - Sessione 18)**: Bug Rendering PDF nel Modal Frontend
- Migliorato viewer PDF con bottoni fallback (Scarica, Apri in nuova tab)
- URL costruito correttamente con `window.location.origin`
- Iframe con stile migliorato e bordo visibile

✅ **RISOLTO (23/01/2026)**: Pulizia UI Duplicata
- Eliminata `LearningMachineDashboard.jsx` - funzionalità duplicate in CentriCosto, Magazzino, Ricette
- Route `/learning-machine` ora redirect a `/centri-costo`

✅ **RISOLTO (23/01/2026)**: Bug Report PDF Ferie/Permessi per Tutti i Dipendenti
- L'endpoint `/api/dipendenti/report-ferie-permessi-tutti` restituiva errore 404
- **Causa**: Ordine rotte FastAPI errato - la rotta dinamica `/{dipendente_id}` intercettava la rotta statica
- **Fix**: Spostata la rotta statica PRIMA di quella dinamica in `dipendenti.py`
- Ora genera correttamente un PDF con il riepilogo ferie/permessi per tutti i 34 dipendenti

✅ **RISOLTO (23/01/2026)**: Pulizia Codice Duplicato `suppliers.py`
- Rimosso endpoint `/import-excel` duplicato (righe 2087-2167) - era definito 2 volte
- File ridotto da 2429 a 2346 righe
- Route `/learning-machine` ora redirect a `/centri-costo`

✅ **RISOLTO (23/01/2026)**: Test E2E Feedback Loop
- Endpoint `/api/learning-machine/feedback` funzionante
- Feedback salvato in collezione `learning_feedback`
- Documento aggiornato con categoria corretta
- Keywords apprese per future classificazioni

### 7.3 🟢 P2 - Bassa Priorità
✅ **RISOLTO (23/01/2026)**: Unificazione Dipendenti
- Collezione UNICA: `employees` (34 dipendenti)
- `anagrafica_dipendenti` → rinominata `_deprecated_anagrafica_dipendenti` (backup)
- Router `bonifici_stipendi.py` aggiornato per usare solo `employees`
- `db_collections.py` aggiornato con documentazione

🔄 **IN CORSO**: Incoerenza Dati per Learning Machine
- Collezione `documenti_classificati` vuota - da popolare per abilitare feedback loop

### 7.4 🔵 P3 - Backlog
1. ✅ **COMPLETATO (23/01/2026)**: Refactoring `suppliers.py` → modulo `suppliers_module/`
   - File monolitico di 2346 righe suddiviso in 7 file modulari (2013 righe totali, -14%)
   - Struttura: `base.py`, `bulk.py`, `common.py`, `iban.py`, `import_export.py`, `validation.py`
   - Tutti gli endpoint funzionanti e testati
2. ✅ **COMPLETATO (23/01/2026)**: Pulizia inconsistenze cedolini
   - Migrato campo `netto_mese` → `netto` nella collezione `payslips` (170 documenti)
   - Collezione `cedolini` già standardizzata
3. ✅ **RISOLTO (23/01/2026)**: Report PDF annuale ferie/permessi per TUTTI i dipendenti
4. ✅ **COMPLETATO (23/01/2026)**: Refactoring `prima_nota.py` → modulo `prima_nota_module/`
   - File monolitico di 2843 righe suddiviso in 8 file modulari (1971 righe totali, -30.7%)
   - Struttura: `common.py`, `cassa.py`, `banca.py`, `salari.py`, `stats.py`, `sync.py`, `manutenzione.py`
   - File deprecated eliminato
5. ✅ **COMPLETATO (23/01/2026)**: Refactoring `fatture_ricevute.py` → modulo `fatture_module/`
   - File monolitico di 2469 righe suddiviso in 6 file modulari (1275 righe totali, **-48.4%**)
   - Struttura: `common.py`, `helpers.py`, `import_xml.py`, `crud.py`, `pagamento.py`
   - File deprecated eliminato
6. ✅ **COMPLETATO (23/01/2026)**: Test automatici con pytest
   - Creata suite di 47 test per i moduli refactorizzati
   - Test files: `test_prima_nota.py`, `test_fatture_ricevute.py`, `test_suppliers_dipendenti.py`, `test_core.py`
   - Coverage: Prima Nota (13 test), Fatture Ricevute (14 test), Suppliers/Dipendenti (11 test), Core (9 test)
   - Tutti i test passano
7. ✅ **COMPLETATO (23/01/2026)**: Refactoring `archivio_bonifici.py` → modulo `bonifici_module/`
   - File monolitico di 2438 righe suddiviso in 6 file modulari (1205 righe totali, **-50.6%**)
   - Struttura: `common.py`, `pdf_parser.py`, `jobs.py`, `transfers.py`, `riconciliazione.py`
8. ✅ **COMPLETATO (23/01/2026)**: Refactoring `operazioni_da_confermare.py` → modulo `operazioni_module/`
   - File monolitico di 2378 righe suddiviso in 5 file modulari (790 righe totali, **-66.8%**)
   - Struttura: `common.py`, `base.py`, `smart.py`, `carta.py`
9. **CANDIDATI FUTURI REFACTORING** (file >2000 righe):
   - `documenti.py` (2354 righe)
   - `riconciliazione_intelligente.py` (2107 righe - servizio)
   - `dipendenti.py` (2104 righe)

### 7.5 🟠 Issue Pendenti
- ~450 documenti in `documents_inbox` ancora da associare manualmente (nuovo: 242, processato: 221)
- 6 F24 senza PDF (file non presenti sul filesystem)
- UI Feedback Loop per correzione classificazioni automatiche

---

## 8. FILE DI RIFERIMENTO

### 8.1 Backend
```
/app/app/main.py                              # Entry point
/app/app/routers/attendance.py                # Presenze
/app/app/routers/employees/giustificativi.py  # Giustificativi
/app/app/routers/employees/dipendenti.py      # Anagrafica
/app/app/routers/suppliers_module/            # Fornitori modularizzato
    ├── __init__.py                           # Router aggregato
    ├── base.py                               # CRUD base (722 righe)
    ├── bulk.py                               # Operazioni massive (389 righe)
    ├── common.py                             # Costanti condivise (48 righe)
    ├── iban.py                               # Gestione IBAN (338 righe)
    ├── import_export.py                      # Import Excel (236 righe)
    └── validation.py                         # Validazione P0 (200 righe)
/app/app/routers/prima_nota_module/           # NUOVO: Prima Nota modularizzato
    ├── __init__.py                           # Router aggregato (109 righe)
    ├── common.py                             # Costanti e utility (82 righe)
    ├── cassa.py                              # CRUD Prima Nota Cassa (277 righe)
    ├── banca.py                              # CRUD Prima Nota Banca (207 righe)
    ├── salari.py                             # Prima Nota Salari (139 righe)
    ├── stats.py                              # Statistiche e Export (184 righe)
    ├── sync.py                               # Sync corrispettivi/fatture (488 righe)
    └── manutenzione.py                       # Fix e cleanup (485 righe)
/app/app/routers/riconciliazione_intelligente_api.py
/app/app/routers/documenti_intelligenti.py    # Classificazione email
/app/app/routers/f24/f24_riconciliazione.py   # F24
```

### 8.2 Frontend
```
/app/frontend/src/main.jsx                    # Routing
/app/frontend/src/pages/Dashboard.jsx
/app/frontend/src/pages/Attendance.jsx
/app/frontend/src/pages/GestioneDipendentiUnificata.jsx
/app/frontend/src/pages/ClassificazioneDocumenti.jsx
/app/frontend/src/pages/RiconciliazioneF24.jsx
/app/frontend/src/lib/utils.js                # formatDateIT, formatEuro
```

---

## 9. CLAUSOLA FINALE

Questo PRD è vincolante. Ogni sviluppo futuro deve:
- Rispettare i validatori
- Non introdurre eccezioni silenziose
- Mantenere la tracciabilità completa
- Seguire lo stile UI della Dashboard

---

*Documento generato il 23 Gennaio 2026*
