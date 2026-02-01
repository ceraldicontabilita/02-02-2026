# LOGICA AUTOMAZIONE VERBALI - GUIDA OPERATIVA

## 📋 PRINCIPIO FONDAMENTALE

> **PRIMA COMPLETA, POI AGGIUNGI**

Ogni volta che il sistema scansiona la posta:
1. **PRIMA** cerca documenti per completare cose SOSPESE
2. **POI** aggiunge nuove cose trovate

Questo evita che verbali restino per sempre sospesi!

---

## 🔄 FLUSSO SCAN EMAIL

```
┌─────────────────────────────────────────────────────────┐
│                    SCAN EMAIL                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FASE 1: COMPLETA SOSPESI (PRIORITÀ ALTA)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 31 verbali attendono quietanza → Cerca PayPal,  │   │
│  │    bonifico, ricevuta con quei numeri verbale   │   │
│  │                                                 │   │
│  │ 52 verbali senza PDF → Cerca allegati PDF      │   │
│  │    con quei numeri verbale                     │   │
│  │                                                 │   │
│  │ 22 verbali senza driver → Cerca info targa     │   │
│  │    per associare al driver                     │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  FASE 2: AGGIUNGI NUOVI                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Cerca nuovi verbali                            │   │
│  │ Cerca nuove quietanze                          │   │
│  │ Cerca nuove fatture noleggiatori               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

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
