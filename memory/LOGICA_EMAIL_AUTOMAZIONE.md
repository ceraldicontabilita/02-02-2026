# LOGICA AUTOMAZIONE EMAIL - Azienda in Cloud ERP

## PRINCIPIO FONDAMENTALE
**PRIMA COMPLETA, POI AGGIUNGI**

---

## SCHEDULER ATTIVO
- **Gmail/Aruba Sync**: ogni 10 minuti
- **Scan Verbali Email**: ogni ora
- **HACCP Auto-popolamento**: alle 00:01 UTC ogni giorno

---

## LOGICA DI PRIORITÀ SCAN EMAIL

### FASE 1 - COMPLETA LE COSE SOSPESE

1. **Cerca quietanze per verbali "DA_PAGARE"**
   - Query: `verbali_noleggio` con `stato: "da_pagare"` e `quietanza_ricevuta: false`
   - Pattern email: "quietanza", "pagamento effettuato", "ricevuta", "paypal"
   - Azione: Aggiorna verbale con `quietanza_ricevuta: true`, `metodo_pagamento`, `data_pagamento`

2. **Cerca PDF verbale per record senza PDF**
   - Query: `verbali_noleggio` con `pdf_data: null`
   - Pattern allegati: file .pdf con nome contenente numero verbale
   - Azione: Salva PDF in `pdf_data` (base64)

3. **Cerca fatture per verbali "IDENTIFICATO"**
   - Query: `verbali_noleggio` con `stato: "identificato"`
   - Pattern: fatture da ALD, ARVAL, LEASYS, LEASEPLAN con riferimento verbale
   - Azione: Collega `fattura_id`, aggiorna stato a "fattura_ricevuta"

### FASE 2 - AGGIUNGI NUOVE COSE

1. **Cerca nuovi verbali**
   - Pattern email: "verbale", "multa", "contravvenzione", "infrazione"
   - Pattern numero: `[A-Z]\d{10,12}` (es: B25111540620)
   - Salva in: `verbali_noleggio`

2. **Cerca nuove quietanze**
   - Pattern: "quietanza", "pagamento", conferme PayPal
   - Estrai: numero verbale, importo, data pagamento
   - Salva in: `quietanze_verbali`

3. **Cerca nuove fatture noleggiatori**
   - Fornitori: ALD, ARVAL, LEASYS, LEASEPLAN
   - Estrai dalla riga descrizione: targa, numero verbale
   - Salva in: `invoices` con flag `tipo: "noleggio"`

---

## LOGICA ARRICCHIMENTO DATI VERBALE

### 1. TROVA TARGA
```
SE numero_verbale trovato:
  1. Cerca in verbali_noleggio_completi per targa associata
  2. Se non trovata, estrai dalla descrizione (pattern: XX000XX)
```

### 2. TROVA VEICOLO (da targa)
```
SE targa trovata:
  1. Cerca in veicoli_noleggio (collection veicoli)
  2. Ottieni: marca, modello, contratto, codice_cliente, driver_id
```

### 3. TROVA DRIVER (da veicolo o fattura)
```
SE veicolo trovato E driver_id presente:
  1. Cerca in employees per id
  2. Ottieni: nome_completo, email
ALTRIMENTI:
  1. Usa driver_nome dal veicolo
```

### 4. TROVA DATI FATTURA
```
SE targa presente:
  1. Cerca fatture noleggiatori con targa nelle linee
  2. Ottieni: fornitore, fornitore_piva, numero_fattura, importo
```

---

## LOGICA DETERMINAZIONE STATO

```
SE ha fattura E ha pagamento E ha driver:
  stato = "riconciliato"
ALTRIMENTI SE ha fattura E ha pagamento:
  stato = "pagato"
ALTRIMENTI SE ha fattura:
  stato = "fattura_ricevuta"
ALTRIMENTI SE ha driver O ha targa:
  stato = "identificato"
ALTRIMENTI:
  stato = "da_identificare"
```

---

## CREAZIONE PRIMA NOTA (Automatica)

Quando un verbale passa a stato "pagato" o "riconciliato":

```javascript
{
  "tipo": "verbale_noleggio",
  "causale": `Verbale ${numero_verbale} - ${targa}`,
  "importo": importo_verbale,
  "data": data_pagamento,
  "metodo_pagamento": metodo_pagamento,
  "fornitore": fornitore,
  "fornitore_piva": fornitore_piva,
  "driver": driver_nome,
  "centro_costo": "AUTO_AZIENDALI",
  "conto_dare": "610.10", // Multe e sanzioni
  "conto_avere": metodo_pagamento === "PayPal" ? "180.20" : "180.10", // Cassa o Banca
  "verbale_id": verbale_id
}
```

---

## COLLECTIONS COINVOLTE

| Collection | Descrizione |
|------------|-------------|
| `verbali_noleggio` | Verbali/multe veicoli |
| `verbali_noleggio_completi` | Verbali con tutti i dati |
| `quietanze_verbali` | Prove di pagamento |
| `veicoli_noleggio` | Anagrafica veicoli |
| `invoices` | Fatture (incluse noleggiatori) |
| `employees` | Dipendenti/driver |
| `prima_nota_cassa` | Movimenti cassa |
| `prima_nota_banca` | Movimenti banca |

---

## FILE DI RIFERIMENTO

- `/app/app/scheduler.py` - Scheduler principale
- `/app/app/services/verbali_email_scanner.py` - Scanner verbali
- `/app/app/services/email_monitor_service.py` - Monitor email generale
- `/app/app/services/email_document_downloader.py` - Download allegati
- `/app/app/routers/noleggio.py` - API noleggio
- `/app/app/routers/bank/estratto_conto.py` - Riconciliazione automatica
