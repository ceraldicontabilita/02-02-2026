# Regole Contabili - Sistema ERP TechRecon

## Principi Contabili Italiani Applicati

Ultimo aggiornamento: 27 Gennaio 2026

---

## 1. PARTITA DOPPIA

### 1.1 Principio Fondamentale
Ogni operazione contabile deve essere registrata in almeno due conti:
- **DARE** = Impieghi (utilizzo delle risorse)
- **AVERE** = Fonti (origine delle risorse)

La somma dei DARE deve **sempre** essere uguale alla somma degli AVERE.

### 1.2 Natura dei Conti

| Tipo Conto | Aumenta in | Diminuisce in |
|------------|-----------|---------------|
| Attività (beni, crediti) | DARE | AVERE |
| Passività (debiti) | AVERE | DARE |
| Patrimonio Netto | AVERE | DARE |
| Ricavi | AVERE | DARE |
| Costi | DARE | AVERE |

---

## 2. CICLO PASSIVO (Acquisti)

### 2.1 Registrazione Fattura Fornitore
```
DARE: Costi (60.x) - Importo imponibile
DARE: IVA a Credito (17.1) - Importo IVA
AVERE: Debiti v/Fornitori (40.1) - Totale fattura
```

### 2.2 Pagamento Fornitore
```
DARE: Debiti v/Fornitori (40.1) - Importo pagato
AVERE: Banca c/c (18.1) - Importo pagato
```

### 2.3 Metodi di Pagamento Fatture
- **Bonifico Bancario** (default): Conto 18.1 Banca c/c
- **Assegno**: Conto 18.2 Assegni da pagare
- **Contanti**: Conto 10.1 Cassa
- **RiBa**: Conto 18.3 Effetti passivi

---

## 2A. FLUSSO IMPORT FATTURE XML - REGOLE OBBLIGATORIE

### 2A.1 🚫 DIVIETI ASSOLUTI (NON VIOLARE MAI)

```
❌ MAI scrivere in prima_nota_cassa o prima_nota_banca durante l'import XML
   → La Prima Nota si scrive SOLO dopo conferma pagamento utente

❌ MAI impostare metodo_pagamento = "bonifico" automaticamente
   → Il metodo viene SOLO dall'anagrafica fornitore
   → Se fornitore nuovo: metodo = "da_configurare"

❌ MAI impostare pagato = true durante l'import
   → Una fattura appena importata NON È PAGATA

❌ MAI impostare riconciliato = true durante l'import
   → La riconciliazione avviene DOPO match con estratto conto

❌ MAI ignorare il metodo_pagamento dell'anagrafica fornitore
   → Il XML può dire "bonifico" ma il fornitore paga in contanti
   → VINCE SEMPRE l'anagrafica fornitore

❌ MAI caricare a magazzino se fornitore.esclude_magazzino = true
   → Alcuni fornitori (utenze, servizi) non hanno merci

❌ MAI sovrascrivere una fattura esistente senza controllo
   → Eccezione: bozze email (is_bozza_email = true)
```

### 2A.2 ✅ OBBLIGHI

```
✅ SEMPRE creare/aggiornare il fornitore in anagrafica
✅ SEMPRE creare la scadenza nello scadenziario_fornitori
✅ SEMPRE salvare le righe dettaglio in dettaglio_righe_fatture
✅ SEMPRE impostare stato = "in_attesa_conferma" inizialmente
✅ SEMPRE salvare il contenuto XML originale
✅ SEMPRE gestire i warnings (IBAN mancante, metodo da configurare)
✅ SEMPRE loggare le operazioni eseguite
```

### 2A.3 Flusso Corretto Import Fattura

```
1. Parse XML            → Estrai tutti i dati
2. Check duplicati      → Se esiste STOP
3. Gestione fornitore   → Crea/aggiorna in `fornitori`
4. Salva fattura        → Collection `invoices` con stato="in_attesa_conferma"
5. Crea scadenza        → Collection `scadenziario_fornitori`
6. Carico magazzino     → SOLO se fornitore.esclude_magazzino = false
7. ⛔ STOP              → NON SCRIVERE PRIMA NOTA
```

### 2A.4 Stati Iniziali OBBLIGATORI per Fattura Importata

```python
fattura = {
    "stato": "in_attesa_conferma",    # MAI "pagata" o "riconciliata"
    "pagato": False,
    "riconciliato": False,
    "data_pagamento": None,
    "stato_riconciliazione": "in_attesa_conferma",
    "metodo_pagamento": fornitore.get("metodo_pagamento", "da_configurare")
}
```

### 2A.5 Quando Scrivere in Prima Nota?

La Prima Nota si scrive **SOLO** quando:
- L'utente clicca "Conferma Pagamento"
- L'utente sceglie "Cassa" o "Banca"
- Viene chiamato l'endpoint `/api/fatture/paga`

### 2A.6 Mapping Collection MongoDB

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

### 2A.7 Checklist Verifica Post-Import

```
□ Fattura salvata in `invoices` con stato "in_attesa_conferma"
□ Fornitore esiste in `fornitori`
□ Scadenza creata in `scadenziario_fornitori`
□ Righe salvate in `dettaglio_righe_fatture`
□ Se fornitore non escluso: movimenti in `warehouse_movements`
□ Se fornitore non escluso: lotti in `haccp_lotti`
□ ❌ NESSUN record in `prima_nota_cassa` collegato alla fattura
□ ❌ NESSUN record in `prima_nota_banca` collegato alla fattura
□ fattura.pagato == false
□ fattura.riconciliato == false
```

**Se trovi record in Prima Nota collegati a fatture appena importate, HAI SBAGLIATO.**

### 2A.8 File di Riferimento

- `/app/memory/ISTRUZIONI_FATTURE_AUTOMATICHE.md` - Istruzioni complete
- `/app/routers/fatture_module/import_xml.py` - Codice import
- `/app/routers/fatture_module/pagamento.py` - Codice pagamento
- `/app/services/riconciliazione_intelligente.py` - Logica riconciliazione

---

## 3. CICLO ATTIVO (Vendite)

### 3.1 Registrazione Fattura Emessa
```
DARE: Crediti v/Clienti (15.1) - Totale fattura
AVERE: Ricavi (70.x) - Importo imponibile
AVERE: IVA a Debito (25.1) - Importo IVA
```

### 3.2 Incasso Fattura
```
DARE: Banca c/c (18.1) - Importo incassato
AVERE: Crediti v/Clienti (15.1) - Importo incassato
```

### 3.3 Corrispettivi (Vendite al dettaglio)
```
DARE: Cassa (10.1) o POS (18.4) - Totale incasso
AVERE: Corrispettivi (70.1) - Imponibile
AVERE: IVA a Debito (25.1) - IVA
```

---

## 4. IVA (Imposta sul Valore Aggiunto)

### 4.1 Aliquote Vigenti
| Aliquota | Descrizione | Codice |
|----------|-------------|--------|
| 22% | Ordinaria | N1 |
| 10% | Ridotta (alimentari, turismo) | N2 |
| 5% | Super ridotta (alimenti essenziali) | N3 |
| 4% | Minima (beni prima necessità) | N4 |
| 0% | Esente/Non imponibile | N5 |

### 4.2 Liquidazione IVA Mensile
```
IVA a Debito (incassata) - IVA a Credito (pagata) = IVA da versare
```

Se IVA a Credito > IVA a Debito → Credito IVA (riportabile o rimborsabile)

### 4.3 Scadenze Versamento
- **Mensile**: Entro il 16 del mese successivo
- **Trimestrale**: Entro il 16 del secondo mese successivo al trimestre

---

## 5. BANCA E RICONCILIAZIONE

### 5.1 Principi di Riconciliazione
1. Ogni movimento bancario deve avere una **contropartita** identificata
2. L'estratto conto deve **quadrare** con il saldo contabile
3. Le partite aperte devono essere **chiuse** entro 60 giorni

### 5.2 Associazione Automatica
Il sistema applica queste regole in ordine di priorità:

1. **Match esatto per importo** (±€0.50)
2. **Match per numero documento** (fattura, F24)
3. **Match per beneficiario/fornitore noto** (learning)
4. **Match per combinazione** (somma movimenti = fattura)

### 5.3 Causali Bancarie Standard
| Causale | Descrizione | Conto Default |
|---------|-------------|---------------|
| BON | Bonifico in uscita | 40.1 Fornitori |
| BIN | Bonifico in entrata | 15.1 Clienti |
| POS | Incasso POS | 70.1 Corrispettivi |
| F24 | Pagamento tributi | 28.x Debiti tributari |
| STI | Stipendi | 44.1 Debiti v/dipendenti |

---

## 6. GESTIONE PERSONALE

### 6.1 Registrazione Cedolino
```
DARE: Costo del lavoro (64.x) - Lordo
AVERE: Debiti v/dipendenti (44.1) - Netto
AVERE: Debiti v/INPS (44.2) - Contributi
AVERE: Debiti v/IRPEF (44.3) - Ritenute
```

### 6.2 Pagamento Stipendio
```
DARE: Debiti v/dipendenti (44.1) - Netto
AVERE: Banca c/c (18.1) - Netto
```

### 6.3 Versamento F24 (contributi e ritenute)
```
DARE: Debiti v/INPS (44.2) - Contributi
DARE: Debiti v/IRPEF (44.3) - Ritenute
AVERE: Banca c/c (18.1) - Totale F24
```

---

## 7. CESPITI E AMMORTAMENTI

### 7.1 Acquisto Cespite
```
DARE: Immobilizzazioni (22.x) - Costo
DARE: IVA a Credito (17.1) - IVA
AVERE: Debiti v/Fornitori (40.1) - Totale
```

### 7.2 Ammortamento Annuo
```
DARE: Ammortamenti (66.x) - Quota annua
AVERE: Fondo Ammortamento (22.x.F) - Quota annua
```

### 7.3 Aliquote Ammortamento Standard
| Categoria | Aliquota |
|-----------|----------|
| Fabbricati | 3% |
| Impianti | 10-15% |
| Attrezzature | 15-25% |
| Automezzi | 20-25% |
| Mobili/Arredi | 12% |
| Elettronica | 20% |

---

## 8. BILANCIO

### 8.1 Stato Patrimoniale
Rappresenta la **situazione** dell'azienda a una data specifica.

**Attivo** = **Passivo + Patrimonio Netto**

| Attivo | Passivo |
|--------|---------|
| Immobilizzazioni | Debiti a lungo termine |
| Magazzino | Debiti a breve termine |
| Crediti | TFR |
| Disponibilità liquide | Fondi rischi |
| | **Patrimonio Netto** |
| | Capitale sociale |
| | Riserve |
| | Utile/Perdita esercizio |

### 8.2 Conto Economico
Rappresenta il **risultato** dell'esercizio.

**Ricavi - Costi = Utile/Perdita**

### 8.3 Chiusura Esercizio
1. Verifica quadratura
2. Scritture di assestamento
3. Rilevazione ratei e risconti
4. Calcolo imposte
5. Determinazione utile/perdita
6. Chiusura conti economici
7. Riapertura nuovo esercizio

---

## 9. VERBALI E NOLEGGIO

### 9.1 Gestione Verbali (Multe)
```
DARE: Oneri diversi (67.x) - Importo verbale
AVERE: Debiti v/Enti (40.5) - Importo verbale
```

### 9.2 Associazione Verbali
1. Estrai **targa** dal verbale
2. Cerca targa in **veicoli_noleggio**
3. Associa **driver** dal veicolo
4. Se non trovato, segna come "da associare manualmente"

### 9.3 Noleggio Auto
Le fatture di noleggio contengono spesso:
- Canone mensile
- Verbali/multe addebitate
- Pedaggi autostradali
- Servizi accessori

---

## 10. LEARNING MACHINE

### 10.1 Apprendimento Pattern
Il sistema apprende automaticamente da:
- Associazioni manuali confermate
- Pattern ricorrenti (stesso fornitore, importo simile)
- Feedback utente su associazioni errate

### 10.2 Regole Apprese
Memorizzate nella collection `assegni_learning`:
- **fornitore_normalizzato**: Nome normalizzato
- **importo_min/max/medio**: Range importi
- **keywords**: Parole chiave associate
- **count_assegni**: Numero associazioni

### 10.3 Applicazione Pattern
Quando arriva un nuovo movimento:
1. Cerca match esatto per importo
2. Se non trovato, cerca nei pattern appresi
3. Se confidenza > 80%, proponi associazione
4. Se confidenza < 80%, segna per revisione manuale

---

## 11. FILTRI PER ANNO

### 11.1 Regola Fondamentale
**Tutti i report finanziari devono filtrare per l'anno selezionato nella sidebar.**

Pagine interessate:
- Bilancio (Stato Patrimoniale, Conto Economico)
- IVA (Liquidazioni, Registri)
- Corrispettivi
- Versamenti POS
- Prima Nota
- F24

### 11.2 Implementazione
```javascript
// Sincronizza con anno globale
const { anno: annoGlobale } = useAnnoGlobale();

useEffect(() => {
  if (annoGlobale && annoGlobale !== annoLocale) {
    setAnnoLocale(annoGlobale);
    loadData(annoGlobale);
  }
}, [annoGlobale]);
```

---

## 12. ENDPOINT API STANDARD

### 12.1 Pattern REST
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | /api/{risorsa} | Lista risorse |
| GET | /api/{risorsa}/{id} | Dettaglio risorsa |
| POST | /api/{risorsa} | Crea risorsa |
| PUT | /api/{risorsa}/{id} | Aggiorna risorsa |
| DELETE | /api/{risorsa}/{id} | Elimina risorsa |

### 12.2 Endpoint Manutenzione
| Endpoint | Descrizione |
|----------|-------------|
| POST /api/manutenzione/ricostruisci-assegni | Ricostruisce associazioni assegni |
| POST /api/manutenzione/ricostruisci-f24 | Ricostruisce F24 e riconciliazioni |
| POST /api/manutenzione/ricostruisci-fatture | Corregge fatture e metodi pagamento |
| POST /api/manutenzione/ricostruisci-corrispettivi | Ricalcola IVA corrispettivi |
| POST /api/manutenzione/ricostruisci-salari | Associa dipendenti a cedolini |
| GET /api/manutenzione/stato-collezioni | Statistiche database |

---

## Riferimenti

- Codice Civile, art. 2423-2435 (Bilancio)
- D.P.R. 633/1972 (IVA)
- D.P.R. 917/1986 (TUIR - Imposte dirette)
- OIC - Principi Contabili Nazionali
- Fatturazione Elettronica - Specifiche SDI
