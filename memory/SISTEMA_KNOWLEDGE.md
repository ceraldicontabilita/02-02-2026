# CONOSCENZA COMPLETA DEL SISTEMA ERP
## Azienda: Bar/Pasticceria (ATECO 56.10.30)
## P.IVA: 04523831214
## Ultimo aggiornamento: 22 Gennaio 2026

---

## 1. STATISTICHE GENERALI

| Risorsa | Quantità |
|---------|----------|
| Pagine Frontend | 66 |
| Router Backend | 152 (96 registrati in main.py) |
| Collezioni DB | 83 |
| Fatture | 3.753 |
| Corrispettivi | 1.060 giorni |
| Cedolini | 1.873 |
| Dipendenti Attivi | 24 |
| F24 Commercialista | 46 (34 da pagare, 9 pagati, 3 eliminati) |
| Quietanze F24 | 303 |
| Estratto Conto Movimenti | 4.261 |
| Ricette | 159 |
| Articoli Magazzino | 1.345 |
| Fornitori | 820+ |

---

## 2. DATABASE - COLLEZIONI PRINCIPALI

### 2.1 FATTURE (`invoices`)
- **Totale**: 3.753 documenti
- **Anni**: 2017-2026
- **Struttura XML FatturaPA**: 
  - Header: CedentePrestatore (fornitore), CessionarioCommittente (azienda)
  - Body: DatiGeneraliDocumento, DatiBeniServizi (linee), DatiPagamento

**CAMPI PRINCIPALI:**
```
id, invoice_number, invoice_date, tipo_documento,
supplier_name, supplier_vat, supplier_address,
total_amount, imponibile, iva_totale,
linee[]: {descrizione, quantita, prezzo_unitario, prezzo_totale, aliquota_iva}
riepilogo_iva[]: {aliquota, imponibile, imposta}
centro_costo, imponibile_deducibile, iva_detraibile
```

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
- **Fonte**: Registratore di cassa telematico

### 2.3 CEDOLINI (`cedolini`)
- **Totale**: 1.873 documenti
- **Anni**: 2014-2026
- **Struttura**: dipendente_id, dipendente_nome, mese, anno, lordo, netto, inps_dipendente, irpef, inps_azienda, inail, tfr, costo_azienda, ore_lavorate

**RIEPILOGO ANNUALE:**
| Anno | Cedolini | Netto Totale |
|------|----------|--------------|
| 2025 | 344 | €41.549,77 |
| 2024 | 305 | €12.951,05 |
| 2023 | 281 | €56.653,55 |
| 2022 | 90 | €64.188,99 |
| 2021 | 148 | €70.286,34 |

### 2.4 F24 (`f24_commercialista`)
- **Totale**: 46 documenti
- **Da pagare**: 34 (€90.710,17)
- **Pagati**: 9 (€45.719,93)
- **Eliminati**: 3 (€18.670,32)

**CODICI TRIBUTO PIÙ USATI:**
| Codice | Descrizione | Occ. |
|--------|-------------|------|
| 1040 | Ritenute lavoro dipendente | 11 |
| 1001 | IRPEF | 8 |
| 1990 | Interessi ravvedimento Add. Reg. | 8 |
| 8918 | Sanzione ravvedimento | 8 |
| 1704 | Imp. sostitutiva TFR rivalutazione | 6 |
| 1701 | Imp. sostitutiva TFR acconto | 5 |

**CODICI RAVVEDIMENTO:**
- Sanzioni: 8904 (IVA), 8918, 8948
- Interessi: 1989 (IRPEF), 1990, 1991 (IVA)

### 2.5 QUIETANZE F24 (`quietanze_f24`)
- **Totale**: 303 documenti
- **Totale versato**: €288.318,86
- **Struttura**: dati_generali{data_pagamento, protocollo_telematico}, totali{totale_debito}, sezione_erario[], sezione_inps[]

### 2.6 ESTRATTO CONTO (`estratto_conto_movimenti`)
- **Totale**: 4.261 movimenti
- **Periodo**: 2020-2026
- **Entrate**: €1.311.120,77
- **Uscite**: €-1.334.343,39

**PER TIPO:**
| Tipo | Movimenti | Importo |
|------|-----------|---------|
| entrata | 2.255 | €1.311.120,77 |
| uscita | 1.698 | €-1.334.343,39 |
| carta_credito | 281 | €43.768,45 |

**CAUSALI FREQUENTI:**
- GIROCONTO INTERNO: 1.069
- Provvigioni Nexi: 304
- Commissioni: 292
- POS BANCOMAT: 240
- I24 AGENZIA ENTRATE: 20 (pagamenti F24)

### 2.7 MAGAZZINO (`warehouse_stocks`)
- **Totale articoli**: 1.345
- **Valore stimato**: €69.674,70
- **Categorie**: GENERAL (1.288), BEVERAGE (31), UTILITIES (13)
- **Movimenti registrati**: 14

### 2.8 RICETTE (`ricette`)
- **Totale**: 159 ricette
- **Categorie**: pasticceria, dolci, contorni, basi, bar
- **Esempi**: Tiramisù (10 porz), Cheesecake (12 porz), Pasta frolla, Crema pasticcera

---

## 3. CENTRI DI COSTO

| Codice | Nome | Tipo | Fatture |
|--------|------|------|---------|
| CDC-01 | BAR / CAFFETTERIA | operativo | 149 |
| CDC-02 | PASTICCERIA | operativo | 176 |
| CDC-03 | LABORATORIO | operativo | 533 |
| CDC-04 | ASPORTO / DELIVERY | operativo | 39 |
| CDC-90 | PERSONALE | supporto | - |
| CDC-91 | AMMINISTRAZIONE | supporto | 36 |
| CDC-92 | MARKETING | supporto | 4 |
| CDC-99 | COSTI GENERALI | struttura | 2.366 |

**NON CLASSIFICATI**: 450 fatture (€112.053,15)

---

## 4. API PRINCIPALI (96 Router Registrati)

### Contabilità
| Endpoint | Funzione |
|----------|----------|
| `/api/bilancio/*` | Conto economico, stato patrimoniale |
| `/api/iva/*` | Calcoli IVA, liquidazione |
| `/api/invoices/*` | Fatture ricevute |
| `/api/corrispettivi/*` | Corrispettivi giornalieri |
| `/api/prima-nota/*` | Prima nota contabile |

### F24 e Tributi
| Endpoint | Funzione |
|----------|----------|
| `/api/f24/*` | Gestione F24 |
| `/api/f24-riconciliazione/*` | Riconciliazione F24 ↔ Banca |
| `/api/quietanze-f24/*` | Quietanze F24 |
| `/api/codici-tributari/*` | Database codici tributo |

### Banca
| Endpoint | Funzione |
|----------|----------|
| `/api/estratto-conto/*` | Estratto conto |
| `/api/bank/*` | Operazioni bancarie |
| `/api/operazioni-da-confermare/*` | Riconciliazione smart |
| `/api/assegni/*` | Gestione assegni |

### Personale
| Endpoint | Funzione |
|----------|----------|
| `/api/dipendenti/*` | Anagrafica dipendenti |
| `/api/cedolini/*` | Gestione cedolini |
| `/api/prima-nota-salari/*` | Prima nota salari |
| `/api/tfr/*` | Gestione TFR |

### Magazzino
| Endpoint | Funzione |
|----------|----------|
| `/api/magazzino/*` | Gestione magazzino |
| `/api/ricette/*` | Ricette e produzione |
| `/api/warehouse/*` | Warehouse stocks |
| `/api/lotti/*` | Tracciabilità lotti |

### Learning Machine
| Endpoint | Funzione |
|----------|----------|
| `/api/learning-machine/*` | Classificazione automatica, feedback |
| `/api/documenti-smart/*` | Classificazione email |

---

## 5. PAGINE FRONTEND (66 totali)

### Core
- `/dashboard` - Dashboard principale
- `/analytics` - Analytics avanzate
- `/bilancio` - Conto Economico
- `/stato-patrimoniale` - Stato Patrimoniale
- `/learning-machine` - Learning Machine Dashboard

### Fatturazione
- `/fatture-ricevute` - Ciclo passivo (3.753 fatture)
- `/fatture-emesse` - Ciclo attivo
- `/fornitori` - Anagrafica fornitori (820+)
- `/corrispettivi` - Corrispettivi (1.060 giorni)

### F24
- `/f24` - Gestione F24 (46)
- `/riconciliazione-f24` - Riconciliazione F24 ↔ Quietanze
- `/quietanze-f24` - Quietanze F24 (303)

### Banca
- `/riconciliazione` - Riconciliazione Smart
- `/riconciliazione-intelligente` - Riconciliazione AI
- `/estratto-conto` - Estratto conto (4.261 mov)

### Personale
- `/dipendenti` - Anagrafica (24 attivi)
- `/cedolini` - Cedolini (1.873)
- `/prima-nota-salari` - Prima nota salari

### Magazzino
- `/magazzino` - Gestione magazzino (1.345 articoli)
- `/ricette` - Ricette (159)
- `/dizionario-prodotti` - Dizionario prodotti

### Documenti
- `/classificazione-email` - Classificazione documenti
- `/documenti` - Gestione documenti

---

## 6. PARSER E SERVIZI

### Parser Fatture XML (`invoice_xml_parser.py`)
Estrae da FatturaPA:
- CedentePrestatore → supplier (name, vat, address)
- DatiGeneraliDocumento → invoice (date, number, total)
- DettaglioLinee → products (description, qty, price, vat)
- DatiPagamento → payment (method, due_date)

### Parser F24 (`parser_f24.py`)
Estrae da PDF F24:
- Dati generali (data scadenza, contribuente)
- Sezione Erario (codici tributo IRPEF, IVA, IRES)
- Sezione INPS (contributi)
- Sezione Regioni (addizionali)
- Confronto quietanze per ravvedimento

### Riconciliazione Smart (`riconciliazione_smart.py`)
Pattern riconosciuti:
- `I24 AGENZIA ENTRATE` → F24
- `STIP*, SALARIO` → Stipendi
- `ASSEGNO N.` → Assegni
- `BONIFICO*` → Bonifici

---

## 7. RELAZIONI DATABASE

```
invoices ─┬─► suppliers (supplier_vat)
          ├─► warehouse_stocks (linee → carico magazzino)
          ├─► centri_costo (centro_costo)
          └─► estratto_conto_movimenti (riconciliazione)

f24_commercialista ─┬─► quietanze_f24 (riconciliazione codici tributo)
                    └─► estratto_conto_movimenti (I24 AGENZIA ENTRATE)

cedolini ─┬─► anagrafica_dipendenti (dipendente_id)
          └─► bonifici_stipendi (riconciliazione)

ricette ──► warehouse_stocks (ingredienti → scarico produzione)
```

---

## 8. FLUSSI AUTOMATIZZATI

### 1. Import Fatture XML
```
Email/Upload → Parser XML → invoices → 
  → Classificazione CDC → centro_costo
  → Carico Magazzino → warehouse_stocks
```

### 2. Riconciliazione F24
```
F24 Commercialista → Confronto Quietanze →
  → Match codici tributo → stato: pagato
  → Collegamento banca (I24 AGENZIA ENTRATE)
```

### 3. Riconciliazione Banca
```
Estratto Conto → Pattern Matching →
  → Fatture (bonifici fornitori)
  → F24 (I24 AGENZIA)
  → Stipendi (STIP*)
  → Assegni (ASSEGNO N.)
```

### 4. Scarico Produzione
```
Ricetta → Calcolo ingredienti (porzioni) →
  → Verifica giacenze → Scarico magazzino
  → Lotto produzione
```

---

*Sistema ERP Completo - Memoria Aggiornata 22/01/2026*
