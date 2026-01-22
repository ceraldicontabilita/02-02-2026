# CONOSCENZA COMPLETA DEL SISTEMA ERP
## Azienda: Bar/Pasticceria (ATECO 56.10.30)
## Ultimo aggiornamento: 22 Gennaio 2026

---

## 1. STATISTICHE GENERALI

| Risorsa | Quantità |
|---------|----------|
| Pagine Frontend | 66 |
| Router Backend | 152 |
| Collezioni DB | 83 |
| Fatture | 3.753 |
| Corrispettivi | 1.060 giorni |
| Cedolini | 1.873 |
| F24 Commercialista | 46 |
| Quietanze F24 | 303 |
| Estratto Conto Movimenti | 4.261 |
| Ricette | 159 |
| Articoli Magazzino | 1.345 |
| Dipendenti Attivi | 24 |

---

## 2. DATABASE - COLLEZIONI PRINCIPALI

### 2.1 FATTURE (`invoices`)
- **Totale**: 3.753 documenti
- **Struttura**: id, invoice_number, invoice_date, tipo_documento, supplier_name, supplier_vat, total_amount, imponibile, iva, linee[], riepilogo_iva[]
- **Linee fattura**: numero_linea, descrizione, quantita, unita_misura, prezzo_unitario, prezzo_totale, aliquota_iva

**TOP 10 FORNITORI:**
| Fornitore | Fatture | P.IVA |
|-----------|---------|-------|
| Dolciaria Acquaviva S.p.A. | 206 | 01269431217 |
| SAIMA S.p.A. | 173 | 01992440618 |
| San Carlo Gruppo Alimentare S.P.A | 167 | 04172800155 |
| NATURISSIME SRL | 150 | 05157530634 |
| DF BALDASSARRE SRL | 124 | 05157530634 |
| LANGELLOTTI GROUP SRL | 110 | 07683401215 |
| SIRO S.R.L. UNIPERSONALE | 107 | 04104640612 |
| RONDINELLA MARKET S.R.L. | 102 | 04518411212 |
| Amazon Business EU S.a.r.l | 101 | 13397910962 |
| SUNRISE SRL | 96 | 09584831219 |

### 2.2 CORRISPETTIVI (`corrispettivi`)
- **Totale**: 1.060 documenti
- **Struttura**: data, anno, mese, totale_giornaliero, imponibile, iva, numero_scontrini

### 2.3 CEDOLINI (`cedolini`)
- **Totale**: 1.873 documenti
- **Struttura**: dipendente_id, dipendente_nome, mese, anno, lordo, netto, inps_dipendente, irpef, inps_azienda, inail, tfr, costo_azienda, ore_lavorate

**TOTALI COSTO PERSONALE:**
- INPS Azienda: €639,00
- IRPEF: €384,86
- TFR: €157,78
- INAIL: €42,60

### 2.4 F24 (`f24_commercialista`)
- **Totale**: 46 documenti
- **Stati**: da_pagare (34), pagato (9), eliminato (3)
- **Totale da pagare**: €90.710,17
- **Totale pagato**: €45.719,93

**CODICI TRIBUTO PIÙ USATI:**
| Codice | Descrizione | Occorrenze |
|--------|-------------|------------|
| 1040 | Ritenute su redditi lavoro dipendente | 11 |
| 1001 | IRPEF | 8 |
| 1990 | Interessi ravvedimento Add. Regionale | 8 |
| 8918 | Sanzione ravvedimento | 8 |
| 1704 | Imp. sostitutiva TFR rivalutazione | 6 |
| 1701 | Imp. sostitutiva TFR acconto | 5 |

### 2.5 QUIETANZE F24 (`quietanze_f24`)
- **Totale**: 303 documenti
- **Totale versato**: €288.318,86
- **Struttura**: dati_generali{data_pagamento, protocollo_telematico}, totali{totale_debito, saldo_delega}, sezione_erario[], sezione_inps[]

### 2.6 ESTRATTO CONTO (`estratto_conto_movimenti`)
- **Totale**: 4.261 movimenti
- **Anni**: 2020-2026
- **Entrate totali**: €1.311.120,77
- **Uscite totali**: €-1.334.343,39

**PER TIPO:**
| Tipo | Movimenti | Importo |
|------|-----------|---------|
| entrata | 2.255 | €1.311.120,77 |
| uscita | 1.698 | €-1.334.343,39 |
| carta_credito | 281 | €43.768,45 |

### 2.7 MAGAZZINO (`warehouse_stocks`)
- **Totale articoli**: 1.345
- **Categorie**: GENERAL (1.288), BEVERAGE (31), UTILITIES (13), Altri (11), Zuccheri (2)
- **Movimenti**: 14 registrati

### 2.8 RICETTE (`ricette`)
- **Totale**: 159 ricette
- **Categorie**: pasticceria, dolci, contorni, basi, bar
- **Struttura**: nome, porzioni, categoria, ingredienti[], procedimento, food_cost

---

## 3. CENTRI DI COSTO

| Codice | Nome | Tipo | Fatture | Imponibile |
|--------|------|------|---------|------------|
| CDC-99 | COSTI GENERALI / STRUTTURA | struttura | 2.366 | €963.790,64 |
| CDC-03 | LABORATORIO | operativo | 533 | €203.716,69 |
| CDC-01 | BAR / CAFFETTERIA | operativo | 149 | €155.637,30 |
| CDC-02 | PASTICCERIA | operativo | 176 | €36.132,32 |
| CDC-91 | AMMINISTRAZIONE | supporto | 36 | €18.015,83 |
| CDC-04 | ASPORTO / DELIVERY | operativo | 39 | €9.109,33 |
| CDC-92 | MARKETING | supporto | 4 | €789,23 |
| CDC-90 | PERSONALE | supporto | - | - |

**NON CLASSIFICATI**: 450 fatture, €112.053,15

---

## 4. CODICI TRIBUTO F24

### 4.1 Codici Principali
| Codice | Descrizione |
|--------|-------------|
| 1001 | IRPEF |
| 1040 | Ritenute lavoro dipendente |
| 1631 | Credito d'imposta locazioni |
| 1701 | Imposta sostitutiva TFR acconto |
| 1704 | Imposta sostitutiva TFR rivalutazione |
| 2001 | IRES saldo |
| 2002 | IRES acconto prima rata |
| 6006 | IVA mese giugno |
| 6007 | IVA mese luglio |
| 6009 | IVA mese settembre |
| 6010 | IVA mese ottobre |

### 4.2 Codici Ravvedimento
| Codice | Descrizione |
|--------|-------------|
| 8904 | Sanzione IVA |
| 8918 | Sanzione ravvedimento |
| 8948 | Sanzione |
| 1989 | Interessi IRPEF |
| 1990 | Interessi Add. Regionale |
| 1991 | Interessi IVA |

---

## 5. PAGINE FRONTEND PRINCIPALI

### Dashboard e Generale
- `/dashboard` - Dashboard principale
- `/analytics` - Analytics avanzate
- `/bilancio` - Conto Economico
- `/stato-patrimoniale` - Stato Patrimoniale

### Fatturazione
- `/fatture-ricevute` - Ciclo passivo
- `/fatture-emesse` - Ciclo attivo
- `/fornitori` - Anagrafica fornitori

### F24 e Tributi
- `/f24` - Gestione F24
- `/riconciliazione-f24` - Riconciliazione F24 ↔ Quietanze
- `/quietanze-f24` - Quietanze F24

### Banca
- `/riconciliazione` - Riconciliazione Smart (Banca ↔ Fatture/F24/Stipendi)
- `/riconciliazione-intelligente` - Riconciliazione Intelligente
- `/estratto-conto` - Estratto conto

### Personale
- `/dipendenti` - Anagrafica dipendenti
- `/cedolini` - Gestione cedolini
- `/prima-nota-salari` - Prima nota salari

### Magazzino
- `/magazzino` - Gestione magazzino
- `/ricette` - Ricette e food cost
- `/dizionario-prodotti` - Dizionario prodotti

### Learning Machine
- `/learning-machine` - Dashboard Learning Machine (CDC + Magazzino + Produzione)
- `/classificazione-email` - Classificazione documenti email

---

## 6. ROUTER BACKEND PRINCIPALI

### Contabilità
- `/api/bilancio/*` - Conto economico, stato patrimoniale
- `/api/iva/*` - Calcoli IVA, liquidazione
- `/api/invoices/*` - Fatture ricevute

### F24
- `/api/f24/*` - F24 tributi
- `/api/f24-riconciliazione/*` - Riconciliazione F24 ↔ Banca
- `/api/quietanze-f24/*` - Quietanze F24

### Learning Machine
- `/api/learning-machine/*` - Classificazione automatica, feedback, CDC
- `/api/magazzino/*` - Gestione magazzino avanzata

### Banca
- `/api/estratto-conto/*` - Estratto conto
- `/api/operazioni-da-confermare/*` - Riconciliazione smart

---

## 7. RELAZIONI PRINCIPALI

```
invoices (fatture)
    ├── supplier_id → suppliers
    ├── linee[] → acquisti_prodotti → warehouse_stocks
    ├── centro_costo → centri_costo
    └── movimento_id → estratto_conto_movimenti

f24_commercialista
    ├── quietanza_id → quietanze_f24
    └── movimento_banca_id → estratto_conto_movimenti

cedolini
    ├── dipendente_id → anagrafica_dipendenti
    └── bonifico_id → bonifici_stipendi → estratto_conto_movimenti

ricette
    └── ingredienti[] → warehouse_stocks

warehouse_stocks
    ├── fattura_id → invoices
    └── categoria → categorie_merceologiche
```

---

## 8. SERVIZI CHIAVE

### Parser
- `parser_f24.py` - Parsing F24 PDF con riconoscimento codici tributo
- `parser_xml_fattura.py` - Parsing fatture XML FatturaPA
- `email_document_downloader.py` - Download allegati email

### Classificazione
- `learning_machine_cdc.py` - Classificazione automatica centri di costo
- `riconciliazione_smart.py` - Riconciliazione intelligente banca

### Magazzino
- `magazzino_categorie.py` - Classificazione prodotti, scarico ricette

---

## 9. PATTERN RICONOSCIMENTO BANCA

| Pattern | Tipo | Esempio |
|---------|------|---------|
| I24 AGENZIA ENTRATE | F24 | Pagamento tributi |
| STIP*, SALARIO, NETTO | Stipendio | Bonifico stipendio |
| ASSEGNO N. | Assegno | Pagamento assegno |
| BONIFICO*, BONIF | Bonifico | Bonifico generico |
| POS*, CARTA | POS | Incasso POS |
| COMM*, SPESE | Commissioni | Commissioni bancarie |

---

*Documento generato automaticamente - 22 Gennaio 2026*
