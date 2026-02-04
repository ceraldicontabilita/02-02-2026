# CHANGELOG - 4 Febbraio 2026

## Fix Implementati

### P1 - Alta Priorità

#### 1. Auto-associazione Assegni Migliorata ✅
**File:** `/app/routers/bank/assegni.py`
- Algoritmo con 4 fasi di matching:
  1. **Match esatto** (tolleranza 0.5€) - confidenza 100%
  2. **Match learning** (pattern storici) - confidenza 85%
  3. **Match multiplo** (N assegni = 1 fattura) - confidenza 80%
  4. **Match fuzzy** (nome fornitore simile) - confidenza 60%
- Usa `SequenceMatcher` per similarità stringhe
- Normalizza nomi fornitori (rimuove SRL, SPA, etc.)
- Traccia `match_type` e `match_confidenza` per ogni associazione

### Backend Python

#### 2. Fix Sicurezza strptime/split ✅
- `accounting_engine.py`: try/except su strptime
- `attendance.py`: 3 fix su strptime
- `scadenzario_fornitori.py`: 3 fix su strptime
- `fiscalita_italiana.py`: 2 fix su strptime
- `aruba_automation.py`: 3 fix su split stringa vuota

#### 3. Unificazione Collection Fornitori ✅
- 13 file modificati: `suppliers` → `fornitori`

#### 4. Fix Error Handling ✅
- 6 file con except generico → except Exception as e + logging

#### 5. Fix insert_one MongoDB ✅
- 4 file: insert_one(doc) → insert_one(doc.copy())

### Frontend React

#### 6. Fix Accesso Non Sicuro res.data ✅
- `CentriCosto.jsx`: res.data || []
- `Fornitori.jsx`: 2 fix res.data || []
- `Documenti.jsx`: JSON.parse con try/catch

#### 7. Icone Duplicate Sidebar ✅
- `App.jsx`: Rimosse 16 emoji duplicate dai label

#### 8. Learning Machine Centralizzata ✅
- Creata `/pages/LearningMachine.jsx` (~1081 righe)
- Route `/learning-machine` aggiunta
- Link Dashboard aggiornato

#### 9. Utilities Centralizzate ✅
- `lib/utils.js`:
  - MESI, MESI_SHORT, MESI_FULL
  - formatDateShort, formatEuroShort, formatEuroStr
  - THEME (design system)
  - SHADOWS, BORDER_RADIUS

#### 10. Componente StatCard ✅
- Creato `components/StatCard.jsx`

### Database

#### 11. Correzioni Dati ✅
- Dipendente D'ALMA VINCENZO: nome corretto
- Moscato Emanuele: rimossa data cessazione
- Giustificativi FESL/FESNL aggiunti
- 741 presenze eliminate (02-12/2026)

#### 12. Indici MongoDB ✅
- Script aggiornato con indici per:
  - assegni (numero, importo, stato, beneficiario)
  - presenze (dipendente_id, data, stato)
  - turni (anno/mese, dipendente_id)
  - regole_categorizzazione (pattern, categoria)
  - invoices (supplier_name, invoice_number, total_amount, status)

### Documentazione

#### 13. File Creati/Aggiornati ✅
- `/memory/PRD.md` - Aggiornato
- `/memory/REGOLE_CONTABILI.md` - Regole import fatture
- `/memory/REGOLE_CONTABILI_COMPLETE.md` - Piano dei conti completo
- `/memory/CHANGELOG.md` - Questo file

---

## Prossimi Task (Backlog)

### P1 - Alta Priorità
- [ ] Completare refactoring Attendance.jsx (estrarre componenti)

### P2 - Media Priorità
- [ ] Upload massivo PDF con retry
- [ ] Correggere 2 cedolini con netto=0

### P3 - Bassa Priorità
- [ ] Pulizia codice Learning da Fornitori.jsx (~600 righe)
- [ ] Pulizia codice Learning da GestioneAssegni.jsx (~200 righe)
- [ ] Revisione grafica completa (unificare stili)

---

**Data:** 4 Febbraio 2026
