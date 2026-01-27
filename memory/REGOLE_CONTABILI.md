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

### 2.4 Regola Automatica
**SE fattura.metodo_pagamento è vuoto → IMPOSTA "Bonifico"**

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
