# 🧾 ISTRUZIONI FATTURE AUTOMATICHE

## ⚠️ QUESTO DOCUMENTO È OBBLIGATORIO - L'AGENTE DEVE SEGUIRLO ALLA LETTERA

**Data ultimo aggiornamento:** 4 Febbraio 2026

---

## 📋 INDICE

1. [Flusso Completo Import Fattura](#1-flusso-completo-import-fattura)
2. [Step-by-Step Dettagliato](#2-step-by-step-dettagliato)
3. [Regole Business INVIOLABILI](#3-regole-business-inviolabili)
4. [Mapping Collection MongoDB](#4-mapping-collection-mongodb)
5. [Checklist Verifica](#5-checklist-verifica)
6. [Errori Comuni da Evitare](#6-errori-comuni-da-evitare)

---

# 1. FLUSSO COMPLETO IMPORT FATTURA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUSSO IMPORT FATTURA XML - OBBLIGATORIO                │
└─────────────────────────────────────────────────────────────────────────────┘

UTENTE CARICA XML
       │
       ▼
┌──────────────────────────────────────┐
│ STEP 1: PARSING XML FatturaPA        │
│ - Estrai tutti i dati dal XML        │
│ - Valida struttura                   │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ STEP 2: CONTROLLO DUPLICATI          │
│ - Chiave: P.IVA + numero_fattura     │
│ - Se esiste: STOP (non reimportare)  │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ STEP 3: GESTIONE FORNITORE           │
│ - Cerca per P.IVA                    │
│ - Se non esiste: CREA NUOVO          │
│ - Leggi metodo_pagamento da anagrafica│
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ STEP 4: SALVA FATTURA                │
│ - Collection: invoices               │
│ - stato: "in_attesa_conferma"        │
│ - pagato: false                      │
│ - riconciliato: false                │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ STEP 5: CREA SCADENZA                │
│ - Collection: scadenziario_fornitori │
│ - Calcola data_scadenza              │
│ - Stato: "aperto"                    │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ STEP 6: CARICO MAGAZZINO             │
│ - Solo se fornitore NON escluso      │
│ - Collection: warehouse_movements    │
│ - Collection: haccp_lotti            │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ ⚠️ STOP - NON SCRIVERE PRIMA NOTA ⚠️│
│ La Prima Nota si scrive SOLO dopo    │
│ che l'utente CONFERMA il pagamento   │
└──────────────────────────────────────┘
```

---

# 2. STEP-BY-STEP DETTAGLIATO

## 2.1 STEP 1: Parsing XML

**File responsabile:** `/app/app/parsers/fattura_elettronica_parser.py`

**Dati da estrarre OBBLIGATORI:**

| Campo | XPath | Note |
|-------|-------|------|
| P.IVA Fornitore | `//CedentePrestatore//IdFiscaleIVA/IdCodice` | Sempre uppercase |
| Ragione Sociale | `//CedentePrestatore//Denominazione` | |
| Numero Fattura | `//DatiGeneraliDocumento/Numero` | |
| Data Fattura | `//DatiGeneraliDocumento/Data` | Formato YYYY-MM-DD |
| Tipo Documento | `//DatiGeneraliDocumento/TipoDocumento` | TD01, TD04, etc. |
| Totale | `//DatiGeneraliDocumento/ImportoTotaleDocumento` | Decimale |
| Imponibile | `//DatiRiepilogo/ImponibileImporta` | Somma tutte le righe |
| IVA | `//DatiRiepilogo/Imposta` | Somma tutte le righe |
| Righe Dettaglio | `//DettaglioLinee/*` | Array completo |
| Modalità Pagamento | `//DatiPagamento/DettaglioPagamento/ModalitaPagamento` | MP01-MP23 |
| Data Scadenza | `//DatiPagamento/DettaglioPagamento/DataScadenzaPagamento` | Se presente |
| IBAN | `//DatiPagamento/DettaglioPagamento/IBAN` | Se presente |

---

## 2.2 STEP 2: Controllo Duplicati

```python
# LOGICA CONTROLLO DUPLICATI
async def check_duplicato(db, partita_iva: str, numero_documento: str):
    """
    Verifica se la fattura esiste già.
    
    CHIAVE UNIVOCA: partita_iva + numero_documento
    
    Returns:
        - None se non esiste
        - Il documento esistente se esiste
    """
    return await db.invoices.find_one({
        "fornitore_partita_iva": partita_iva.upper().strip(),
        "numero_documento": numero_documento.strip()
    })
```

**⚠️ SE DUPLICATO:** 
- NON reimportare
- Ritorna messaggio "Fattura già presente"
- ECCEZIONE: se `source == "email"` o `is_bozza_email == True` → sovrascrivere

---

## 2.3 STEP 3: Gestione Fornitore

```python
# LOGICA GESTIONE FORNITORE
async def get_or_create_fornitore(db, parsed_data):
    """
    1. Cerca fornitore per P.IVA
    2. Se esiste: usa i suoi dati (metodo_pagamento, iban, esclude_magazzino)
    3. Se non esiste: CREA NUOVO con dati dalla fattura
    """
    partita_iva = parsed_data["supplier_vat"].upper().strip()
    
    # Cerca esistente
    fornitore = await db.fornitori.find_one({"partita_iva": partita_iva})
    
    if fornitore:
        return {
            "id": fornitore["id"],
            "ragione_sociale": fornitore.get("ragione_sociale"),
            "metodo_pagamento": fornitore.get("metodo_pagamento", "da_configurare"),
            "iban": fornitore.get("iban"),
            "esclude_magazzino": fornitore.get("esclude_magazzino", False),
            "nuovo": False
        }
    
    # Crea nuovo
    nuovo_id = str(uuid.uuid4())
    nuovo_fornitore = {
        "id": nuovo_id,
        "partita_iva": partita_iva,
        "codice_fiscale": partita_iva,
        "ragione_sociale": parsed_data.get("supplier_name", ""),
        "denominazione": parsed_data.get("supplier_name", ""),
        "indirizzo": parsed_data.get("fornitore", {}).get("indirizzo", ""),
        "cap": parsed_data.get("fornitore", {}).get("cap", ""),
        "comune": parsed_data.get("fornitore", {}).get("comune", ""),
        "provincia": parsed_data.get("fornitore", {}).get("provincia", ""),
        "nazione": "IT",
        "metodo_pagamento": "da_configurare",  # ⚠️ MAI impostare automaticamente
        "iban": None,
        "esclude_magazzino": False,
        "attivo": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.fornitori.insert_one(nuovo_fornitore.copy())
    
    return {**nuovo_fornitore, "nuovo": True}
```

---

## 2.4 STEP 4: Salvataggio Fattura

**Collection:** `invoices`

**Campi OBBLIGATORI:**

```python
fattura = {
    # Identificativi
    "id": str(uuid.uuid4()),
    "tipo": "passiva",
    "numero_documento": parsed["invoice_number"],
    "data_documento": parsed["invoice_date"],  # YYYY-MM-DD
    "tipo_documento": parsed["tipo_documento"],  # TD01, TD04, etc.
    
    # Importi
    "importo_totale": parsed["total_amount"],
    "imponibile": parsed["imponibile"],
    "iva": parsed["iva"],
    
    # Fornitore
    "fornitore_id": fornitore_result["id"],
    "fornitore_partita_iva": partita_iva,
    "fornitore_ragione_sociale": fornitore_result["ragione_sociale"],
    "fornitore_nuovo": fornitore_result["nuovo"],
    
    # Metodo pagamento - SOLO da anagrafica fornitore!
    "metodo_pagamento": fornitore_result["metodo_pagamento"],
    
    # ⚠️ STATI INIZIALI OBBLIGATORI ⚠️
    "provvisorio": True,
    "riconciliato": False,
    "pagato": False,
    "data_pagamento": None,
    "stato": "in_attesa_conferma",  # MAI "pagata" o "riconciliata"!
    "stato_riconciliazione": "in_attesa_conferma",
    
    # Flags
    "integrazione_completata": False,
    "is_bozza_email": False,
    
    # Metadata
    "filename": filename,
    "xml_content": xml_content,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat()
}
```

---

## 2.5 STEP 5: Creazione Scadenza

**Collection:** `scadenziario_fornitori`

```python
# CALCOLO DATA SCADENZA
def calcola_data_scadenza(data_fattura: str, pagamento: dict, metodo_fornitore: str):
    """
    1. Se presente data_scadenza nel XML → usa quella
    2. Altrimenti: data_fattura + giorni_default per metodo
    """
    
    # Giorni default per metodo
    GIORNI_DEFAULT = {
        "contanti": 0,
        "cassa": 0,
        "bonifico": 30,
        "banca": 30,
        "assegno": 0,
        "rid": 30,
        "riba": 60,
        "sepa": 30,
        "da_configurare": 30
    }
    
    # Se presente nel XML
    if pagamento.get("data_scadenza"):
        return pagamento["data_scadenza"]
    
    # Calcola
    data_base = datetime.strptime(data_fattura, "%Y-%m-%d")
    giorni = GIORNI_DEFAULT.get(metodo_fornitore.lower(), 30)
    data_scadenza = data_base + timedelta(days=giorni)
    
    return data_scadenza.strftime("%Y-%m-%d")


# DOCUMENTO SCADENZA
scadenza = {
    "id": str(uuid.uuid4()),
    "tipo": "fattura_passiva",
    
    # Riferimenti
    "fattura_id": fattura_id,
    "numero_fattura": numero_documento,
    "data_fattura": data_documento,
    
    # Fornitore
    "fornitore_id": fornitore["id"],
    "fornitore_piva": fornitore["partita_iva"],
    "fornitore_nome": fornitore["ragione_sociale"],
    
    # Importi
    "importo_totale": importo_totale,
    "importo_pagato": 0,
    "importo_residuo": importo_totale,
    
    # Scadenza
    "data_scadenza": data_scadenza_calcolata,
    
    # ⚠️ STATI INIZIALI ⚠️
    "stato": "aperto",
    "pagato": False,
    "riconciliato": False,
    
    "created_at": datetime.now(timezone.utc).isoformat()
}
```

---

## 2.6 STEP 6: Carico Magazzino (Opzionale)

**⚠️ ESEGUI SOLO SE:** `fornitore.esclude_magazzino == False`

**Collections coinvolte:**
- `warehouse_movements` - Movimenti di carico
- `haccp_lotti` - Lotti con tracciabilità

```python
# Per ogni riga della fattura
for linea in parsed["linee"]:
    # Crea movimento magazzino
    movimento = {
        "id": str(uuid.uuid4()),
        "tipo": "carico",
        "prodotto_descrizione": linea["descrizione"],
        "quantita": linea["quantita"],
        "prezzo_unitario": linea["prezzo_unitario"],
        "fattura_id": fattura_id,
        "fornitore_id": fornitore["id"],
        "data_movimento": data_fattura,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Crea lotto HACCP
    lotto = {
        "id": str(uuid.uuid4()),
        "lotto_interno": genera_id_lotto(),
        "prodotto": linea["descrizione"],
        "fornitore": fornitore["ragione_sociale"],
        "fattura_id": fattura_id,
        "data_carico": data_fattura,
        "quantita_iniziale": linea["quantita"],
        "quantita_disponibile": linea["quantita"],
        "stato": "disponibile",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
```

---

# 3. REGOLE BUSINESS INVIOLABILI

## 🚫 DIVIETI ASSOLUTI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         REGOLE D'ORO - NON VIOLARE MAI                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ 1. ❌ MAI scrivere in Prima Nota durante l'import fattura                   │
│    → La Prima Nota si scrive SOLO dopo conferma pagamento utente            │
│                                                                              │
│ 2. ❌ MAI impostare metodo_pagamento = "bonifico" automaticamente           │
│    → Il metodo viene SOLO dall'anagrafica fornitore                         │
│    → Se fornitore nuovo: metodo = "da_configurare"                          │
│                                                                              │
│ 3. ❌ MAI impostare pagato = true durante l'import                          │
│    → Una fattura appena importata NON È PAGATA                              │
│                                                                              │
│ 4. ❌ MAI impostare riconciliato = true durante l'import                    │
│    → La riconciliazione avviene DOPO match con estratto conto               │
│                                                                              │
│ 5. ❌ MAI ignorare il metodo_pagamento dell'anagrafica fornitore            │
│    → Il XML può dire "bonifico" ma il fornitore paga in contanti            │
│    → VINCE SEMPRE l'anagrafica fornitore                                    │
│                                                                              │
│ 6. ❌ MAI caricare a magazzino se fornitore.esclude_magazzino = true        │
│    → Alcuni fornitori (utenze, servizi) non hanno merci                     │
│                                                                              │
│ 7. ❌ MAI sovrascrivere una fattura esistente senza controllo               │
│    → Eccezione: bozze email (is_bozza_email = true)                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ OBBLIGHI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              OBBLIGHI                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ 1. ✅ SEMPRE creare/aggiornare il fornitore in anagrafica                   │
│                                                                              │
│ 2. ✅ SEMPRE creare la scadenza nello scadenziario                          │
│                                                                              │
│ 3. ✅ SEMPRE salvare le righe dettaglio in dettaglio_righe_fatture          │
│                                                                              │
│ 4. ✅ SEMPRE impostare stato = "in_attesa_conferma" inizialmente            │
│                                                                              │
│ 5. ✅ SEMPRE salvare il contenuto XML originale                             │
│                                                                              │
│ 6. ✅ SEMPRE gestire i warnings (IBAN mancante, metodo da configurare)      │
│                                                                              │
│ 7. ✅ SEMPRE loggare le operazioni eseguite                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. MAPPING COLLECTION MONGODB

| Collection | Cosa contiene | Quando si scrive |
|------------|---------------|------------------|
| `invoices` | Fatture complete | Import XML |
| `fornitori` | Anagrafica fornitori | Import XML (se nuovo) |
| `scadenziario_fornitori` | Scadenze pagamento | Import XML |
| `dettaglio_righe_fatture` | Righe fattura | Import XML |
| `warehouse_movements` | Movimenti magazzino | Import XML (se non escluso) |
| `haccp_lotti` | Lotti tracciabilità | Import XML (se non escluso) |
| `prima_nota_cassa` | Movimenti cassa | ⚠️ SOLO dopo conferma pagamento |
| `prima_nota_banca` | Movimenti banca | ⚠️ SOLO dopo conferma pagamento |
| `estratto_conto_movimenti` | Estratto conto | Import CSV/XLSX separato |
| `riconciliazioni` | Log riconciliazioni | Dopo riconciliazione |

---

# 5. CHECKLIST VERIFICA

Dopo ogni import fattura, verifica:

```
□ Fattura salvata in `invoices` con stato "in_attesa_conferma"
□ Fornitore esiste in `fornitori`
□ Scadenza creata in `scadenziario_fornitori`
□ Righe salvate in `dettaglio_righe_fatture`
□ Se fornitore non escluso: movimenti in `warehouse_movements`
□ Se fornitore non escluso: lotti in `haccp_lotti`
□ ❌ NESSUN record in `prima_nota_cassa`
□ ❌ NESSUN record in `prima_nota_banca`
□ fattura.pagato == false
□ fattura.riconciliato == false
```

---

# 6. ERRORI COMUNI DA EVITARE

## ❌ ERRORE 1: Scrivere in Prima Nota durante import

```python
# ❌ SBAGLIATO - NON FARE MAI
await genera_scrittura_prima_nota(db, fattura_id, fattura, fornitore)

# ✅ CORRETTO - La prima nota si genera SOLO su conferma utente
risultato_integrazione["prima_nota"] = {
    "status": "in_attesa_conferma",
    "message": "Scrittura Prima Nota in attesa di conferma"
}
```

## ❌ ERRORE 2: Impostare bonifico automaticamente

```python
# ❌ SBAGLIATO
metodo_pagamento = "bonifico"  # Mai hardcodato!

# ✅ CORRETTO
metodo_pagamento = fornitore.get("metodo_pagamento", "da_configurare")
```

## ❌ ERRORE 3: Ignorare esclude_magazzino

```python
# ❌ SBAGLIATO
await processa_carico_magazzino(db, fattura_id, ...)  # Sempre

# ✅ CORRETTO
if not fornitore.get("esclude_magazzino", False):
    await processa_carico_magazzino(db, fattura_id, ...)
```

## ❌ ERRORE 4: Stati iniziali sbagliati

```python
# ❌ SBAGLIATO
fattura = {
    "stato": "importata",
    "pagato": True,  # ERRORE!
    "in_banca": True  # ERRORE!
}

# ✅ CORRETTO
fattura = {
    "stato": "in_attesa_conferma",
    "pagato": False,
    "in_banca": False,
    "riconciliato": False
}
```

---

# 📌 RIEPILOGO FINALE

```
IMPORT FATTURA XML:
1. Parse XML ✓
2. Check duplicati ✓
3. Crea/aggiorna fornitore ✓
4. Salva fattura (stato: in_attesa_conferma) ✓
5. Crea scadenza ✓
6. Carico magazzino (se non escluso) ✓
7. ❌ NON scrivere Prima Nota ❌

CONFERMA PAGAMENTO (endpoint separato):
1. Utente sceglie: Cassa o Banca
2. Sistema verifica estratto conto
3. Se match: riconcilia
4. Se no match: proponi azioni
5. ✅ ORA scrivi Prima Nota ✅
```

---

**Ultimo aggiornamento:** 4 Febbraio 2026
**Responsabile:** Sistema ERP Azienda in Cloud
