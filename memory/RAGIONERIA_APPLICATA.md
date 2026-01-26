# Ragioneria Applicata - Principi Contabili per l'ERP

## Documento di Riferimento per la Logica Contabile dell'Applicazione

*Creato sulla base dello studio di 4 manuali di ragioneria:*
- Le Rilevazioni contabili, gli acquisti e le vendite (didattico universitario)
- Appunti di Ragioneria Generale e Applicata (2005/2006)
- Dalla contabilità al bilancio - Casi ed esercizi (Università di Torino)
- Manuale di Contabilità Rev. gennaio 2023 (Università di Padova)

*Ultimo aggiornamento: 26 Gennaio 2026*

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

### Regola Base
**Totale DARE = Totale AVERE** (sempre bilanciato)

---

## 2. NATURA DEI CONTI FINANZIARI

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

**CASSA**: Il versamento è una **USCITA** (soldi che escono fisicamente dalla cassa → AVERE)
**BANCA**: Il versamento è una **ENTRATA** (soldi che entrano sul conto corrente → DARE)

### ⚠️ REGOLA SACRA
Un **VERSAMENTO** (dalla cassa alla banca) è:
- **USCITA dalla CASSA** (soldi che escono fisicamente dalla cassa)
- **ENTRATA in BANCA** (soldi che entrano sul conto corrente)

### Importante
- Il versamento **NON È UN COSTO** né un ricavo
- È un semplice **trasferimento tra due conti patrimoniali** (attivi)
- Il totale delle attività rimane invariato

---

## 4. OPERAZIONI TIPICHE DELLA PRIMA NOTA

### PRIMA NOTA CASSA

#### DARE (Entrate in Cassa)
- **Corrispettivi**: Incassi giornalieri da vendite al dettaglio (contanti)
- **Incassi cliente**: Pagamenti ricevuti in contanti da clienti
- **Prelievo da banca**: Ritiro contanti dal c/c
- **Finanziamento soci**: Apporto di capitale in contanti

#### AVERE (Uscite da Cassa)
- **Versamenti in banca**: Deposito contanti sul c/c → **SOLO USCITA DA CASSA**
- **Pagamenti fornitori**: Fatture pagate in contanti
- **POS (trasferimento)**: Incassi elettronici che escono dalla cassa contanti per andare sul conto bancario
- **Spese varie**: Piccole spese pagate in contanti

### PRIMA NOTA BANCA

#### DARE (Entrate in Banca)
- **Bonifici in entrata**: Incassi da clienti via bonifico
- **Accredito POS**: Accredito degli incassi elettronici
- **Versamenti da cassa**: Deposito contanti sul c/c

#### AVERE (Uscite da Banca)
- **Bonifici a fornitori**: Pagamenti fatture via bonifico
- **Assegni**: Pagamenti tramite assegno
- **F24**: Pagamento tributi/contributi
- **RiBa**: Ricevute bancarie
- **Stipendi**: Pagamento dipendenti

---

## 5. ARCHITETTURA PRIMA NOTA BANCA

### Flusso Dati Corrente
La **Prima Nota Banca** non è più una collection separata ma visualizza direttamente i movimenti importati dall'**estratto conto bancario**.

```
[File CSV Estratto Conto] 
    → Import via /api/estratto-conto-movimenti/import
    → Salvato in collection "estratto_conto_movimenti"
    → Visualizzato nella pagina Prima Nota → Sezione BANCA
```

### Collection Utilizzate
- `prima_nota_cassa`: Movimenti contanti (Corrispettivi, POS, Versamenti)
- `estratto_conto_movimenti`: Movimenti bancari dall'estratto conto (visualizzati come "Prima Nota Banca")
- `prima_nota_banca`: **DEPRECATA** - non più utilizzata attivamente

### Perché questa scelta?
1. **Evita duplicazioni**: L'estratto conto è l'unica fonte di verità per i movimenti bancari
2. **Semplifica il flusso**: L'utente importa l'estratto conto e vede subito i dati nella Prima Nota
3. **Rispetta la contabilità**: I movimenti bancari devono corrispondere all'estratto conto ufficiale

---

## 6. REGOLA FONDAMENTALE PER I VERSAMENTI

### ❌ ERRORE DA EVITARE
**MAI** registrare lo stesso versamento sia in Cassa che in Banca al momento dell'import.
La corrispondenza in Banca arriverà dall'estratto conto durante la riconciliazione.

### Flusso Corretto per Import Versamenti
1. L'utente carica il CSV dei versamenti
2. Il sistema registra **SOLO** in `prima_nota_cassa` come uscita
3. La registrazione in `prima_nota_banca` avverrà **automaticamente** dalla riconciliazione con l'estratto conto

---

## 7. MAPPATURA IMPLEMENTATIVA

### Import Versamenti CSV → Prima Nota Cassa
```python
# Versamento = Uscita dalla Cassa
movimento_cassa = {
    "tipo": "uscita",        # SEMPRE uscita per i versamenti
    "categoria": "Versamento",
    "importo": importo,
    # ... altri campi
}
await db["prima_nota_cassa"].insert_one(movimento_cassa)
# NON INSERIRE IN prima_nota_banca!
```

### Import POS → Prima Nota Cassa
```python
# POS = Uscita dalla Cassa (va in banca)
movimento = {
    "tipo": "uscita",        # Escono dalla cassa contanti
    "categoria": "POS",
    "importo": totale_pos,
}
await db["prima_nota_cassa"].insert_one(movimento)
```

### Import Corrispettivi → Prima Nota Cassa
```python
# Corrispettivi = Entrata in Cassa
movimento = {
    "tipo": "entrata",       # DARE: entrano contanti
    "categoria": "Corrispettivi",
    "importo": totale,
}
await db["prima_nota_cassa"].insert_one(movimento)
```

---

## 8. RICONCILIAZIONE

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

## 9. TRATTAMENTO IVA

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

## 10. PAGAMENTO F24

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

## 11. CORRISPETTIVI E POS

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

## 12. PRINCIPI CONTABILI APPLICATI

### Competenza Economica
I costi e i ricavi sono rilevati nel periodo in cui si manifestano economicamente, indipendentemente dalla manifestazione finanziaria (pagamento/incasso).

### Prudenza
I ricavi sono rilevati solo se certi, i costi anche se probabili.

### Continuità Aziendale
I valori sono determinati assumendo che l'azienda continuerà la sua attività.

### Costanza nei Criteri di Valutazione
I criteri di valutazione non possono essere modificati da un esercizio all'altro senza giustificato motivo.

---

## 13. SCHEMA RIEPILOGATIVO

```
┌─────────────────────────────────────────────────────────────┐
│                     PRIMA NOTA CASSA                        │
├─────────────────────────────┬───────────────────────────────┤
│        DARE (Entrate)       │        AVERE (Uscite)         │
├─────────────────────────────┼───────────────────────────────┤
│ • Corrispettivi             │ • Versamenti in banca         │
│ • Incassi clienti contanti  │ • POS (trasferimento)         │
│ • Prelievi da banca         │ • Pagamenti fornitori contanti│
│ • Finanziamento soci        │ • Spese varie                 │
└─────────────────────────────┴───────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     PRIMA NOTA BANCA                        │
├─────────────────────────────┬───────────────────────────────┤
│        DARE (Entrate)       │        AVERE (Uscite)         │
├─────────────────────────────┼───────────────────────────────┤
│ • Bonifici in entrata       │ • Bonifici a fornitori        │
│ • Versamenti (da estratto)  │ • F24                         │
│ • Accredito POS (da estratto)│ • Assegni                    │
│                             │ • Stipendi                    │
└─────────────────────────────┴───────────────────────────────┘
```

---

## 14. LOGICA APPLICATIVA ERP

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

*Documento creato: Dicembre 2025*
*Ultima modifica: Gennaio 2026*
*Unificazione file: 26 Gennaio 2026*
