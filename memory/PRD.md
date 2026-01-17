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

### 🔄 In Progress
- UI pulsante aggiornamento bulk fornitori in `Fornitori.jsx`
- Risoluzione 231 fornitori bancari senza IBAN

### 📋 Backlog
- Finalizzare importazione cedolini da PDF (OCR)
- Unificare collection `fornitori` e `suppliers`
- Dashboard Analytics
- Integrazione Google Calendar
- Report PDF via email

---

## 12. Clausola finale

Questo PRD è vincolante.

Ogni sviluppo futuro deve:
- rispettare i validatori,
- non introdurre eccezioni silenziose,
- mantenere la tracciabilità completa.