# Ragioneria Applicata - Principi Contabili per l'ERP

## Documento di Riferimento per la Logica Contabile dell'Applicazione

*Creato sulla base dello studio di 4 manuali di ragioneria:*
- Le Rilevazioni contabili, gli acquisti e le vendite (didattico universitario)
- Appunti di Ragioneria Generale e Applicata (2005/2006)
- Dalla contabilità al bilancio - Casi ed esercizi (Università di Torino)
- Manuale di Contabilità Rev. gennaio 2023 (Università di Padova)

---

## 1. IL METODO DELLA PARTITA DOPPIA

### Principio Fondamentale
Ogni operazione aziendale ha **due aspetti** che devono essere registrati simultaneamente:
- **Aspetto Finanziario (Originario)**: movimento di denaro, credito o debito
- **Aspetto Economico (Derivato)**: costo o ricavo generato

### Le Due Sezioni del Conto
Ogni conto ha due sezioni:
- **DARE (Sinistra)**: 
  - Aumenti di ATTIVITÀ (Cassa, Banca, Crediti)
  - Aumenti di COSTI
  - Diminuzioni di PASSIVITÀ
  - Diminuzioni di RICAVI
  
- **AVERE (Destra)**:
  - Aumenti di PASSIVITÀ (Debiti)
  - Aumenti di RICAVI
  - Diminuzioni di ATTIVITÀ
  - Diminuzioni di COSTI

### Equazione Fondamentale
```
TOTALE DARE = TOTALE AVERE (sempre)
```

---

## 2. I CONTI FINANZIARI: CASSA E BANCA

### CASSA (Denaro Contante)
La CASSA rappresenta il denaro fisico presente in azienda (nel cassetto, nel registratore).

| Operazione | Sezione | Esempio |
|------------|---------|---------|
| **ENTRATA** (denaro entra) | DARE | Incasso corrispettivo cliente |
| **USCITA** (denaro esce) | AVERE | Versamento in banca, pagamento fornitore |

### BANCA (C/C Bancario)
La BANCA rappresenta il saldo del conto corrente bancario.

| Operazione | Sezione | Esempio |
|------------|---------|---------|
| **ENTRATA** (soldi entrano sul c/c) | DARE | Bonifico cliente, versamento contanti, accredito POS |
| **USCITA** (soldi escono dal c/c) | AVERE | Bonifico a fornitore, pagamento F24, addebito |

---

## 3. IL VERSAMENTO: DA CASSA A BANCA

### Operazione Fondamentale
Quando si porta denaro contante dalla CASSA alla BANCA:

```
DARE: Banca c/c      (aumenta l'attivo bancario)
AVERE: Cassa         (diminuisce il contante)
```

### Registrazione in Prima Nota

**CASSA**: Il versamento è una **USCITA** (soldi escono dal cassetto → AVERE)
**BANCA**: Il versamento è una **ENTRATA** (soldi entrano sul c/c → DARE)

### Importante
- Il versamento **NON È UN COSTO** né un ricavo
- È un semplice **trasferimento tra due conti patrimoniali** (attivi)
- Il totale delle attività rimane invariato

---

## 4. LOGICA APPLICATIVA PER L'ERP

### PRIMA NOTA CASSA

| Tipo | Categoria | Sezione | Descrizione |
|------|-----------|---------|-------------|
| **ENTRATA** | Corrispettivi | DARE | Incasso giornaliero dal registratore telematico |
| **USCITA** | POS | AVERE | Incasso elettronico (soldi vanno direttamente in banca) |
| **USCITA** | Versamento | AVERE | Denaro contante portato in banca |

### PRIMA NOTA BANCA

La Prima Nota Banca deve **importare l'estratto conto bancario** per:
1. Verificare che i versamenti dalla cassa siano arrivati (riconciliazione)
2. Verificare gli accrediti POS
3. Verificare i pagamenti F24
4. Monitorare bonifici in entrata e uscita

| Tipo | Fonte | Sezione | Descrizione |
|------|-------|---------|-------------|
| **ENTRATA** | Estratto conto | DARE | Versamento contanti arrivato |
| **ENTRATA** | Estratto conto | DARE | Accredito POS |
| **ENTRATA** | Estratto conto | DARE | Bonifico da cliente |
| **USCITA** | Estratto conto | AVERE | Pagamento F24 |
| **USCITA** | Estratto conto | AVERE | Bonifico a fornitore |
| **USCITA** | Estratto conto | AVERE | Commissioni bancarie |

---

## 5. RICONCILIAZIONE

### Scopo
La riconciliazione serve a verificare che:
- I **versamenti** registrati in CASSA (uscita) corrispondano ai **versamenti** in BANCA (entrata)
- Gli **incassi POS** registrati in CASSA (uscita) corrispondano agli **accrediti POS** in BANCA (entrata)
- I **pagamenti F24** siano effettivamente addebitati sul c/c

### Criteri di Matching
1. **Per data**: stesso giorno o +/- 1-2 giorni lavorativi
2. **Per importo**: importo identico o differenza minima (commissioni)
3. **Per descrizione**: parole chiave (VERSAMENTO, POS, F24)

---

## 6. TRATTAMENTO IVA

### IVA sugli Acquisti (Credito)
```
DARE: Costo (es. Merce c/acquisti)
DARE: IVA ns credito
AVERE: Debiti v/fornitori (o Cassa/Banca se pagamento immediato)
```

### IVA sulle Vendite (Debito)
```
DARE: Crediti v/clienti (o Cassa/Banca se incasso immediato)
AVERE: Ricavi (es. Merce c/vendite)
AVERE: IVA ns debito
```

### Liquidazione IVA
```
IVA ns debito - IVA ns credito = IVA da versare (se positivo)
                               = IVA a credito (se negativo)
```

---

## 7. PAGAMENTO F24

### Registrazione
```
DARE: Debiti tributari (IVA, IRPEF, INPS, ecc.)
AVERE: Banca c/c
```

### In Prima Nota Banca
- Appare come **USCITA** (AVERE)
- Fonte: estratto conto bancario
- Categoria: "Pagamento F24" o codice tributo specifico

---

## 8. CORRISPETTIVI E POS

### Corrispettivi (vendita al dettaglio)
Il corrispettivo giornaliero dal registratore telematico include:
- Totale vendite
- Di cui: contanti + POS

### Registrazione
1. **Totale corrispettivo** → ENTRATA in CASSA (DARE)
2. **Quota POS** → USCITA dalla CASSA (AVERE) perché va direttamente in banca
3. **Saldo in cassa** = Corrispettivo - POS (denaro fisico rimasto)

### Verifica
- L'accredito POS in banca deve corrispondere alla quota POS del corrispettivo
- Il versamento in banca deve corrispondere al contante residuo

---

## 9. PRINCIPI CONTABILI APPLICATI

### Competenza Economica
I costi e i ricavi sono rilevati nel periodo in cui si manifestano economicamente, indipendentemente dalla manifestazione finanziaria (pagamento/incasso).

### Prudenza
I ricavi sono rilevati solo se certi, i costi anche se probabili.

### Continuità Aziendale
I valori sono determinati assumendo che l'azienda continuerà la sua attività.

### Costanza nei Criteri di Valutazione
I criteri di valutazione non possono essere modificati da un esercizio all'altro senza giustificato motivo.

---

## 10. RIEPILOGO LOGICA ERP

### Prima Nota CASSA (registro contante fisico)
```
ENTRATE (DARE):
- Corrispettivi giornalieri

USCITE (AVERE):
- POS (soldi già in banca)
- Versamenti in banca
- Pagamenti in contanti a fornitori
```

### Prima Nota BANCA (importa da estratto conto)
```
ENTRATE (DARE):
- Versamenti da cassa
- Accrediti POS
- Bonifici da clienti
- Interessi attivi

USCITE (AVERE):
- Pagamenti F24
- Bonifici a fornitori
- Commissioni bancarie
- Addebiti vari
```

### Riconciliazione
Confronta CASSA e BANCA per verificare:
- Versamenti ✓
- POS ✓
- F24 ✓

---

*Documento creato il 10/01/2026 - Basato su principi di ragioneria generale e applicata*
