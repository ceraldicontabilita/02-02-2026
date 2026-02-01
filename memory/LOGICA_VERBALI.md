# LOGICA AUTOMAZIONE VERBALI - GUIDA OPERATIVA

## 📋 PRINCIPIO FONDAMENTALE

> **PRIMA COMPLETA, POI AGGIUNGI**

Ogni volta che il sistema scansiona la posta:
1. **PRIMA** cerca documenti per completare cose SOSPESE
2. **POI** aggiunge nuove cose trovate

---

## 🔄 FLUSSO COMPLETO DI UN VERBALE

```
┌─────────────────────────────────────────────────────────┐
│  1. VERBALE SUL PARABREZZA                              │
│     └── Vigile mette verbale su auto noleggio           │
├─────────────────────────────────────────────────────────┤
│  2. PAGAMENTO IMMEDIATO                                 │
│     └── Utente paga subito (PartenoPay/PayPal)          │
│     └── Riceve QUIETANZA via email                      │
├─────────────────────────────────────────────────────────┤
│  3. FATTURA RI-NOTIFICA (arriva DOPO)                   │
│     └── Noleggiatore (ALD/Leasys) emette fattura XML    │
│     └── Contiene: costi comunicazione ai vigili         │
│     └── Sistema associa automaticamente al verbale      │
├─────────────────────────────────────────────────────────┤
│  4. RICONCILIAZIONE ESTRATTO CONTO                      │
│     └── Estratto conto PayPal mensile                   │
│     └── Sistema riconcilia pagamento con movimento      │
│     └── Verbale diventa COMPLETAMENTE RICONCILIATO      │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 STATI VERBALE (AGGIORNATI)

| Stato | Significato | Cosa Manca |
|-------|-------------|------------|
| `da_scaricare` | Email trovata | PDF da scaricare |
| `salvato` | PDF scaricato | Identificazione targa/driver |
| `identificato` | Targa/driver trovati | Pagamento o fattura |
| `da_pagare` | Tutto identificato | Pagamento |
| `pagato_attesa_fattura` | Pagato, quietanza OK | Fattura ri-notifica |
| `pagato` | Pagato con fattura | Riconciliazione estratto conto |
| `riconciliato` | COMPLETO | ✅ Niente |

---

## 📎 DOCUMENTI DA ASSOCIARE A OGNI VERBALE

Per ogni verbale, il sistema deve raccogliere:

```
verbale_documento = {
    "pdf_verbale": "file PDF del verbale originale",
    "quietanza_pagamento": "ricevuta PayPal/PartenoPay",
    "fattura_rinotifica": "XML fattura da noleggiatore",
    "estratto_conto": "riga estratto conto PayPal riconciliata"
}
```

### Esempio Verbale A26110181643:

| Documento | Presente | Note |
|-----------|----------|------|
| PDF Verbale | ✅ | AvvisoDigitale_302000600008089874.pdf |
| Quietanza | ✅ | PartenoPay - Pagamento eseguito |
| Fattura ri-notifica | ❌ | IN ATTESA da ALD/Leasys |
| Estratto conto | ❌ | DA RICONCILIARE |

---

## 🔍 RICONCILIAZIONE PAGAMENTO

### Come funziona:

1. **PAGAMENTO CON PAYPAL**
   ```
   Email ricevuta: "PayPal - Pagamento effettuato"
   Allegato: ricevuta_paypal.pdf
   Importo: €XX.XX
   → Sistema salva quietanza nel verbale
   ```

2. **ESTRATTO CONTO PAYPAL (mensile)**
   ```
   File: estratto_conto_paypal_gennaio_2026.csv
   Riga: "30/01/2026 | Comune di Napoli | -€XX.XX"
   → Sistema cerca verbali pagati in quella data
   → Associa movimento a verbale
   → Stato diventa "riconciliato"
   ```

---

## 🖥️ API SCAN EMAIL

### Scan Recente (ultimi N giorni)
```bash
POST /api/verbali-riconciliazione/scan-email?days_back=30

# Cerca in TUTTE le cartelle:
# - INBOX
# - Cartelle dedicate (A25*, B25*, A26*, B26*, verbale*)
```

### Scan Storico (dal 2018)
```bash
POST /api/verbali-riconciliazione/scan-email-storico
```

### Stato Sospesi
```bash
GET /api/verbali-riconciliazione/pending-status

# Mostra:
# - Verbali in attesa quietanza
# - Verbali in attesa fattura
# - Verbali da riconciliare con estratto conto
```

---

## 📁 STRUTTURA DATABASE

### Collection: verbali_noleggio
```javascript
{
  "numero_verbale": "A26110181643",
  "targa": "HB411GV",
  "driver": "Vincenzo Ceraldi",
  "driver_id": "231591db-...",
  "veicolo_id": "39d7dd2c-...",
  
  "stato": "pagato_attesa_fattura",
  
  "documenti": {
    "pdf_verbale": true,
    "quietanza_pagamento": true,
    "fattura_rinotifica": false,
    "estratto_conto_riconciliato": false
  },
  
  "pagamento": {
    "metodo": "PartenoPay/PagoPA",
    "data": "2026-01-30",
    "importo": 10.00,
    "ricevuta_email": true,
    "riconciliato_estratto_conto": false
  },
  
  "in_attesa": ["fattura_rinotifica", "riconciliazione_estratto_conto"],
  
  "fattura_id": null,  // Verrà popolato quando arriva XML
  "movimento_paypal_id": null  // Verrà popolato con riconciliazione
}
```

---

## ✅ CHECKLIST RICONCILIAZIONE VERBALE

- [ ] PDF verbale presente
- [ ] Targa identificata
- [ ] Driver associato
- [ ] Veicolo associato
- [ ] Pagamento effettuato
- [ ] Quietanza salvata (PayPal/PartenoPay)
- [ ] Fattura ri-notifica ricevuta (XML)
- [ ] Estratto conto PayPal riconciliato

**Quando TUTTI i checkbox sono ✅ → Stato = "riconciliato"**

---

## 📊 STATI VERBALE

| Stato | Significato | Cosa Manca |
|-------|-------------|------------|
| `DA_SCARICARE` | Email trovata | PDF da scaricare |
| `SALVATO` | PDF scaricato | Identificazione |
| `IDENTIFICATO` | Targa/driver trovati | Fattura ri-notifica |
| `FATTURA_RICEVUTA` | Fattura arrivata | Pagamento/quietanza |
| `DA_PAGARE` | Tutto completo | Solo quietanza |
| `PAGATO` | Quietanza trovata | Solo riconciliazione |
| `RICONCILIATO` | Tutto collegato | ✅ Completo |

---

## 📧 COSA CERCARE NELLE EMAIL

### Email VERBALE
- **Subject**: "verbale", "multa", "contravvenzione", "notifica"
- **Allegato**: PDF con nome tipo `verbale_*.pdf`
- **Corpo**: Numero verbale (pattern: `B23120067780`)

### Email QUIETANZA
- **Subject**: "quietanza", "pagamento", "ricevuta", "PayPal"
- **Allegato**: PDF con nome tipo `quietanza_*.pdf`, `ricevuta_*.pdf`
- **Corpo**: Riferimento a numero verbale

### Email FATTURA NOLEGGIATORE
- **Mittente**: ALD, Leasys, Arval, Alphabet, etc.
- **Allegato**: XML fattura elettronica
- **Subject**: "ri-notifica", "addebito verbale"

---

## 🔗 ASSOCIAZIONE AUTOMATICA

```
EMAIL CON VERBALE
       ↓
Estrai TARGA dal PDF/testo (es: GE911SC)
       ↓
Cerca in veicoli_noleggio → Trova veicolo
       ↓
Dal veicolo trova DRIVER → CERALDI VALERIO
       ↓
Crea record in verbali_noleggio
       ↓
Crea voce costo in costi_dipendenti
```

---

## 🖥️ API DISPONIBILI

### Stato Sospesi
```
GET /api/verbali-riconciliazione/pending-status

Risposta:
{
  "da_completare": {
    "senza_quietanza": 31,
    "senza_pdf": 52,
    "senza_driver": 22
  }
}
```

### Verbali per Dipendente
```
GET /api/verbali-riconciliazione/per-dipendente/{driver_id}

Risposta:
{
  "totale_verbali": 30,
  "totale_importo": 325.00,
  "da_pagare": { "count": 30, "importo": 325.00 },
  "pagati": { "count": 0, "importo": 0 },
  "verbali": [...]
}
```

### Visualizza PDF Verbale
```
GET /api/verbali-riconciliazione/{numero_verbale}/pdf
→ Restituisce il PDF inline
```

### Registra Quietanza
```
POST /api/verbali-riconciliazione/registra-quietanza/{numero_verbale}
Body: { "metodo": "PayPal", "data_pagamento": "2026-02-01" }
→ Aggiorna stato a "pagato"
```

### Automazione Completa
```
POST /api/verbali-riconciliazione/automazione-completa
→ Associa tutti i verbali esistenti a driver/veicoli
```

---

## 📅 STORICO

- Scansionare email **dal 2018 in poi**
- Processare in ordine cronologico
- Mantenere traccia ultima email processata
- NON riprocessare email già elaborate

---

## 💡 ESEMPIO PRATICO

**Giorno 1:**
- Arriva email con verbale `T26020100001` per targa `GE911SC`
- Sistema crea verbale, associa a CERALDI VALERIO
- Stato: `DA_PAGARE` (manca quietanza)

**Giorno 2:**
- Sistema scansiona email
- FASE 1: Cerca quietanza per `T26020100001` → Non trovata
- FASE 2: Trova nuovo verbale `T26020100002`

**Giorno 3:**
- Sistema scansiona email  
- FASE 1: Cerca quietanza per `T26020100001` → **TROVATA!**
- Aggiorna verbale → Stato: `PAGATO`
- FASE 2: Nessun nuovo verbale

---

## ✅ CHECKLIST SCAN EMAIL

- [ ] Carica lista verbali sospesi dal DB
- [ ] Per ogni verbale senza quietanza → cerca email quietanza
- [ ] Per ogni verbale senza PDF → cerca email con PDF allegato
- [ ] Cerca nuovi verbali nelle email non processate
- [ ] Cerca nuove quietanze e associa a verbali esistenti
- [ ] Aggiorna stati nel database
- [ ] Logga tutte le operazioni
