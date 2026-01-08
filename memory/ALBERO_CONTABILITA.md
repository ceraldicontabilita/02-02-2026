# 🌳 ALBERO STRUTTURALE CONTABILITÀ ERP
# Mappa completa delle funzionalità da implementare
# VERSIONE 2.0 - 2026-01-08

================================================================================
## 📊 STRUTTURA AD ALBERO DEL SISTEMA CONTABILE
================================================================================

```
AZIENDA SEMPLICE ERP
│
├── 1. CONTABILITÀ GENERALE (LIBRO GIORNALE)
│   ├── 1.1 Registrazioni in Partita Doppia
│   │   ├── Scritture automatiche da fatture/corrispettivi
│   │   ├── Scritture manuali (prima nota libera)
│   │   └── Validazione quadratura DARE=AVERE
│   ├── 1.2 Piano dei Conti
│   │   ├── Conti patrimoniali (SP)
│   │   ├── Conti economici (CE)
│   │   └── Conti d'ordine
│   ├── 1.3 Mastrini
│   │   ├── Saldo per conto
│   │   ├── Movimenti dettagliati
│   │   └── Estratto conto per periodo
│   └── 1.4 Bilancio di Verifica
│       ├── Quadratura DARE/AVERE
│       └── Saldi per sezione
│
├── 2. CICLO ATTIVO (VENDITE)
│   ├── 2.1 Documenti di Vendita
│   │   ├── Preventivi/Offerte
│   │   ├── Ordini cliente
│   │   ├── DDT (Documenti di Trasporto)
│   │   ├── Fatture emesse
│   │   └── Corrispettivi (scontrini)
│   ├── 2.2 Incassi
│   │   ├── Registrazione incassi
│   │   ├── Riconciliazione bancaria
│   │   └── Gestione insoluti
│   ├── 2.3 Scadenzario Clienti
│   │   ├── Partite aperte
│   │   ├── Solleciti automatici
│   │   └── Aging crediti
│   └── 2.4 Note di Credito
│       ├── Resi
│       ├── Sconti
│       └── Abbuoni
│
├── 3. CICLO PASSIVO (ACQUISTI)
│   ├── 3.1 Documenti di Acquisto
│   │   ├── Richieste di acquisto (RDA)
│   │   ├── Ordini fornitore
│   │   ├── DDT fornitori
│   │   └── Fatture ricevute (XML)
│   ├── 3.2 Pagamenti
│   │   ├── Proposte di pagamento
│   │   ├── Bonifici/Assegni
│   │   └── Riconciliazione estratto conto
│   ├── 3.3 Scadenzario Fornitori
│   │   ├── Partite aperte
│   │   ├── Cash flow previsionale
│   │   └── Aging debiti
│   └── 3.4 Note di Credito
│       ├── Resi
│       ├── Sconti condizionati
│       └── Contestazioni
│
├── 4. GESTIONE IVA
│   ├── 4.1 Registri IVA
│   │   ├── Registro acquisti
│   │   ├── Registro vendite
│   │   └── Registro corrispettivi
│   ├── 4.2 Liquidazione Periodica
│   │   ├── Mensile/Trimestrale
│   │   ├── Generazione F24
│   │   └── LIPE (Comunicazione liquidazioni)
│   ├── 4.3 Dichiarazione Annuale
│   │   └── Pre-compilazione IVA annuale
│   └── 4.4 Casi Speciali
│       ├── Split Payment (PA)
│       ├── Reverse Charge
│       ├── Pro-rata
│       └── Fattura su corrispettivo (no duplicazione)
│
├── 5. CESPITI E AMMORTAMENTI
│   ├── 5.1 Anagrafica Cespiti
│   │   ├── Acquisizioni
│   │   ├── Categorie (coefficienti fiscali)
│   │   └── Ubicazione
│   ├── 5.2 Ammortamenti
│   │   ├── Calcolo quote (civilistico/fiscale)
│   │   ├── Piano ammortamento
│   │   └── Scritture automatiche
│   └── 5.3 Dismissioni
│       ├── Vendita (plus/minusvalenze)
│       ├── Eliminazione
│       └── Permuta
│
├── 6. PERSONALE E PAGHE
│   ├── 6.1 Anagrafica Dipendenti ✅
│   │   ├── Dati anagrafici
│   │   ├── Contratti ✅
│   │   └── Libretti sanitari ✅
│   ├── 6.2 Elaborazione Paghe
│   │   ├── Presenze/Assenze
│   │   ├── Cedolini
│   │   └── Scritture contabili
│   ├── 6.3 TFR
│   │   ├── Accantonamento annuale
│   │   ├── Rivalutazione ISTAT
│   │   └── Liquidazione
│   └── 6.4 Adempimenti
│       ├── F24 ritenute (mod. 1001, 1004)
│       ├── CU (Certificazione Unica)
│       └── Mod. 770
│
├── 7. ADEMPIMENTI FISCALI
│   ├── 7.1 F24 ✅
│   │   ├── Gestione modelli
│   │   ├── Scadenzario alert ✅
│   │   └── Riconciliazione pagamenti
│   ├── 7.2 Imposte
│   │   ├── IRES (calcolo, acconti, saldo)
│   │   ├── IRAP
│   │   └── Imposte anticipate/differite
│   └── 7.3 Dichiarazioni
│       ├── Mod. Redditi SC
│       ├── IRAP
│       └── Studi di settore / ISA
│
├── 8. CHIUSURA ESERCIZIO
│   ├── 8.1 Scritture di Assestamento
│   │   ├── Ratei e risconti
│   │   ├── Ammortamenti
│   │   ├── Accantonamenti
│   │   └── Svalutazioni
│   ├── 8.2 Rimanenze
│   │   ├── Inventario fisico
│   │   ├── Valutazione (FIFO, LIFO, medio)
│   │   └── Scritture variazione
│   ├── 8.3 Chiusura Conti
│   │   ├── Chiusura CE a Utile/Perdita
│   │   ├── Chiusura SP
│   │   └── Riapertura nuovo esercizio
│   └── 8.4 Bilancio
│       ├── Stato Patrimoniale
│       ├── Conto Economico
│       ├── Nota Integrativa
│       └── Rendiconto Finanziario (OIC 10)
│
├── 9. REPORTING E ANALISI
│   ├── 9.1 Bilanci Riclassificati
│   │   ├── SP a liquidità crescente
│   │   ├── CE a valore aggiunto
│   │   └── CE a margine di contribuzione
│   ├── 9.2 Indici di Bilancio
│   │   ├── Liquidità (current ratio, quick ratio)
│   │   ├── Solidità (leverage, indipendenza)
│   │   ├── Redditività (ROE, ROI, ROS)
│   │   └── Efficienza (rotazioni)
│   ├── 9.3 Budget e Forecast
│   │   ├── Budget economico
│   │   ├── Budget finanziario
│   │   └── Analisi scostamenti
│   └── 9.4 Controllo di Gestione
│       ├── Centri di costo ✅
│       ├── Margine per prodotto
│       └── Break-even analysis
│
└── 10. INTEGRAZIONI
    ├── 10.1 Magazzino ✅
    │   ├── Movimenti
    │   ├── Inventario
    │   └── Previsioni acquisti ✅
    ├── 10.2 Fatturazione Elettronica ✅
    │   ├── Import XML
    │   ├── Export XML
    │   └── SDI
    ├── 10.3 Banking
    │   ├── Import estratti conto ✅
    │   ├── Bonifici SEPA
    │   └── Riconciliazione ✅
    └── 10.4 HACCP ✅
        ├── Temperature
        ├── Sanificazioni
        └── Tracciabilità
```

================================================================================
## 📋 ELENCO FUNZIONALITÀ DA IMPLEMENTARE
================================================================================

### PRIORITÀ 1 - FONDAMENTALI (Ciclo Contabile Completo)

1. **LIBRO GIORNALE AUTOMATICO**
   - Generazione automatica scritture da fatture acquisto
   - Generazione automatica scritture da corrispettivi
   - Interfaccia prima nota manuale
   - Validazione partita doppia
   - Stampa libro giornale per periodo

2. **MASTRINI E SCHEDE CONTABILI**
   - Visualizzazione saldo per conto
   - Estratto conto per periodo
   - Ricerca movimenti
   - Export PDF/Excel

3. **BILANCIO DI VERIFICA**
   - Quadratura DARE/AVERE automatica
   - Saldi per sezione (SP/CE)
   - Controllo anomalie
   - Confronto periodi

4. **SCADENZARIO CLIENTI/FORNITORI**
   - Partite aperte
   - Aging analysis (0-30, 31-60, 61-90, >90 gg)
   - Cash flow previsionale
   - Alert scadenze

5. **LIQUIDAZIONE IVA AUTOMATICA**
   - Calcolo mensile/trimestrale
   - Generazione scritture giroconto
   - Pre-compilazione F24 IVA
   - Gestione credito IVA

### PRIORITÀ 2 - CHIUSURA E BILANCIO

6. **WIZARD CHIUSURA ESERCIZIO**
   - Checklist operazioni
   - Scritture assestamento guidate
   - Calcolo ratei/risconti automatico
   - Generazione ammortamenti batch

7. **GESTIONE CESPITI**
   - Anagrafica beni ammortizzabili
   - Piano ammortamento
   - Calcolo quote (civile/fiscale)
   - Dismissioni con plus/minusvalenze

8. **BILANCIO CIVILISTICO**
   - Stato Patrimoniale (schema art. 2424)
   - Conto Economico (schema art. 2425)
   - Comparazione esercizi
   - Export XBRL

9. **NOTA INTEGRATIVA**
   - Template con sezioni obbligatorie
   - Tabelle movimenti immobilizzazioni
   - Dettaglio voci significative
   - Criteri di valutazione

10. **RENDICONTO FINANZIARIO (OIC 10)**
    - Metodo indiretto
    - Flusso operativo/investimento/finanziamento
    - Riconciliazione disponibilità liquide

### PRIORITÀ 3 - PERSONALE E IMPOSTE

11. **ELABORAZIONE CEDOLINI BASE**
    - Da presenze a lordo
    - Calcolo ritenute
    - Contributi INPS
    - Scritture contabili automatiche

12. **GESTIONE TFR COMPLETA**
    - Accantonamento mensile/annuale
    - Rivalutazione ISTAT automatica
    - Anticipi
    - Liquidazione con calcolo ritenute

13. **CALCOLO IMPOSTE (IRES/IRAP)**
    - Determinazione imponibile
    - Variazioni fiscali
    - Acconti/saldo
    - Imposte anticipate/differite

14. **F24 UNIFICATO**
    - Generazione da liquidazioni
    - Compilazione multipla (IVA, ritenute, INPS)
    - Invio telematico (predisposizione)
    - Quietanzamento

### PRIORITÀ 4 - ANALISI E CONTROLLO

15. **INDICI DI BILANCIO**
    - ROE, ROI, ROS
    - Current ratio, Quick ratio
    - Leverage, Indipendenza finanziaria
    - Rotazione crediti/debiti/magazzino

16. **BILANCI RICLASSIFICATI**
    - SP a liquidità crescente
    - CE a valore aggiunto
    - CE a costo del venduto

17. **BUDGET ECONOMICO**
    - Previsione ricavi/costi
    - Confronto actual vs budget
    - Analisi scostamenti

18. **CONTROLLO DI GESTIONE**
    - Margine per centro di costo
    - Food cost per ricetta ✅
    - Break-even point
    - Margine di contribuzione

### PRIORITÀ 5 - AUTOMAZIONI AVANZATE

19. **FATTURAZIONE ATTIVA**
    - Emissione fatture elettroniche
    - Invio SDI
    - Conservazione sostitutiva

20. **SOLLECITI AUTOMATICI**
    - Template email sollecito
    - Escalation (1°, 2°, 3° sollecito)
    - Blocco fido

21. **RICONCILIAZIONE BANCARIA AVANZATA**
    - Matching automatico
    - Regole apprendimento
    - Gestione non riconciliati

22. **WORKFLOW APPROVAZIONI**
    - Approvazione pagamenti
    - Autorizzazione ordini
    - Firma digitale documenti

### PRIORITÀ 6 - COMPLIANCE E REPORTING

23. **DICHIARAZIONI FISCALI**
    - Pre-compilazione Mod. Redditi
    - IRAP
    - CU dipendenti

24. **COMUNICAZIONI PERIODICHE**
    - LIPE (liquidazioni IVA)
    - Esterometro
    - Intrastat

25. **AUDIT TRAIL**
    - Log modifiche
    - Versioning documenti
    - Report compliance

================================================================================
## 🔄 DIAGRAMMI DI FLUSSO PRINCIPALI
================================================================================

### FLUSSO 1: CICLO PASSIVO (Acquisti)

```
[Richiesta Acquisto] 
       ↓
[Ordine Fornitore] → [DDT Ricevuto] → [Carico Magazzino]
       ↓                                      ↓
[Fattura XML]  ←─────────────────────────────┘
       ↓
[Match 3 vie: Ordine-DDT-Fattura]
       ↓
   ◇ OK? ─No→ [Contestazione] → [Nota Credito]
       │Yes
       ↓
[Registrazione Contabile]
   ├── DARE: Acquisti merci
   ├── DARE: IVA credito
   └── AVERE: Debiti v/fornitori
       ↓
[Scadenzario Fornitori]
       ↓
[Proposta Pagamento]
       ↓
   ◇ Approvato? ─No→ [Modifica/Annulla]
       │Yes
       ↓
[Bonifico/Assegno]
       ↓
[Chiusura Partita]
```

### FLUSSO 2: CICLO ATTIVO (Vendite)

```
[Ordine Cliente / Comanda]
       ↓
[Preparazione/Erogazione Servizio]
       ↓
   ◇ Corrispettivo o Fattura?
       │
   ┌───┴───┐
   ↓       ↓
[Scontrino]  [Fattura]
   │           │
   └─────┬─────┘
         ↓
[Registrazione Contabile]
   ├── DARE: Cassa/Crediti
   ├── AVERE: Ricavi
   └── AVERE: IVA debito
         ↓
[Incasso (se fattura)]
         ↓
[Riconciliazione Banca]
         ↓
[Chiusura Partita]
```

### FLUSSO 3: CHIUSURA MENSILE IVA

```
[Fine Mese]
       ↓
[Estrazione Registri IVA]
   ├── Registro Acquisti
   ├── Registro Vendite
   └── Registro Corrispettivi
       ↓
[Calcolo Liquidazione]
   IVA Debito - IVA Credito - Credito Precedente
       ↓
   ◇ Saldo > 0?
       │
   ┌───┴───┐
   ↓       ↓
[Da Versare]  [Credito]
   │           │
   ↓           └→ [Riporto mese successivo]
[Scrittura Giroconto IVA]
       ↓
[Generazione F24]
       ↓
[Pagamento entro 16 mese successivo]
       ↓
[Quietanza]
```

### FLUSSO 4: CHIUSURA ESERCIZIO

```
[31/12 - Fine Esercizio]
       ↓
[1. Verifica Completezza Registrazioni]
       ↓
[2. Scritture di Assestamento]
   ├── Ratei attivi/passivi
   ├── Risconti attivi/passivi
   ├── Ammortamenti
   ├── Svalutazione crediti
   └── Accantonamenti (TFR, rischi)
       ↓
[3. Inventario e Rimanenze]
       ↓
[4. Calcolo Imposte]
   ├── IRES (24%)
   └── IRAP (3.9%)
       ↓
[5. Bilancio di Verifica]
       ↓
[6. Chiusura Conti Economici → C.E.]
       ↓
[7. Determinazione Utile/Perdita]
       ↓
[8. Chiusura Stato Patrimoniale]
       ↓
[9. Redazione Bilancio]
   ├── Stato Patrimoniale
   ├── Conto Economico
   ├── Nota Integrativa
   └── Rendiconto Finanziario
       ↓
[10. Approvazione Assemblea]
       ↓
[11. Deposito Camera Commercio]
       ↓
[01/01 - Riapertura Conti]
```

================================================================================
## ✅ STATO ATTUALE IMPLEMENTAZIONE
================================================================================

| # | Funzionalità | Stato | Note |
|---|--------------|-------|------|
| - | Fatture XML acquisto | ✅ | 3376 fatture |
| - | Corrispettivi | ✅ | 1050 corrispettivi |
| - | Estratto conto import | ✅ | Riconciliazione automatica |
| - | F24 modelli | ✅ | 7 modelli |
| - | F24 alert scadenze | ✅ | 9 alert attivi |
| - | Dipendenti/Contratti | ✅ | 22 dipendenti |
| - | HACCP completo | ✅ | Temperature, sanificazioni |
| - | Magazzino | ✅ | 5338 articoli |
| - | Previsioni acquisti | ✅ | 3 metodologie |
| - | Centri di costo | ✅ | 8 centri |
| - | Ricette/Food cost | ✅ | 95 ricette |
| 1 | Libro giornale | ❌ | DA FARE |
| 2 | Mastrini | ❌ | DA FARE |
| 3 | Bilancio verifica | ❌ | DA FARE |
| 4 | Scadenzario | ❌ | Parziale |
| 5 | Liquidazione IVA | ⚠️ | Calcolo OK, F24 no |
| 6 | Wizard chiusura | ❌ | DA FARE |
| 7 | Cespiti | ❌ | DA FARE |
| 8 | Bilancio civilistico | ❌ | DA FARE |

================================================================================
## 📚 RIFERIMENTI NORMATIVI
================================================================================

- **Codice Civile**: artt. 2423-2435 bis (Bilancio d'esercizio)
- **OIC 11**: Finalità e postulati del bilancio
- **OIC 10**: Rendiconto finanziario
- **OIC 12**: Composizione e schemi del bilancio
- **OIC 13**: Rimanenze
- **OIC 16**: Immobilizzazioni materiali
- **OIC 19**: Debiti
- **OIC 24**: Immobilizzazioni immateriali
- **OIC 25**: Imposte sul reddito
- **OIC 31**: Fondi rischi e oneri, TFR
- **DPR 633/72**: IVA
- **DPR 917/86 (TUIR)**: Imposte sui redditi
- **DM 31/12/1988**: Coefficienti ammortamento

================================================================================
