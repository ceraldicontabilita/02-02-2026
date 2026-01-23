# PRD – TechRecon Accounting System
## Product Requirements Document
### Ultimo aggiornamento: 23 Gennaio 2026 (Sessione 14)

---

## 1. PANORAMICA DEL SISTEMA

### 1.1 Obiettivo
Sistema ERP contabile per aziende italiane con:
- Conformità normativa italiana (fatturazione elettronica, F24, IVA)
- Riduzione errore umano tramite validazione automatica
- Tracciabilità completa di ogni operazione
- Scalabilità senza introdurre incoerenze

### 1.2 Stack Tecnologico
- **Frontend**: React + Vite + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Integrazioni**: InvoiceTronic (SDI), PagoPA, Email IMAP

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

## 6. VALIDATORI AUTOMATICI

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
1. **Pulizia UI Duplicata**: Eliminare `LearningMachineDashboard.jsx` ridondante e verificare navigazione
2. **Test E2E Feedback Loop**: Testare il flusso "Correggi" in `ClassificazioneDocumenti.jsx` → API feedback → salvataggio
3. **Refactoring Backend**: Suddividere file grandi (suppliers.py 95KB, operazioni_da_confermare.py 90KB, documenti.py 88KB)
4. Report PDF annuale ferie/permessi per dipendente

### 7.3 🟠 P2 - Bassa Priorità
5. UI Feedback Loop per correzione classificazioni automatiche
6. Automazione completa certificati medici
7. Riconciliazione email in background (asincrona)
8. Test automatici E2E con Playwright

---

## 8. FILE DI RIFERIMENTO

### 8.1 Backend
```
/app/app/main.py                              # Entry point
/app/app/routers/attendance.py                # Presenze
/app/app/routers/employees/giustificativi.py  # Giustificativi
/app/app/routers/employees/dipendenti.py      # Anagrafica
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

*Documento generato il 22 Gennaio 2026*
