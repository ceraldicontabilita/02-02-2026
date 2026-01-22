# REGOLE CONTABILI ITALIANE - Sistema ERP Azienda

## 1. STRUTTURA DEL DATABASE

### 1.1 Corrispettivi (collezione: `corrispettivi`)
**Cosa sono:** Scontrini e ricevute fiscali emessi per vendite al pubblico.

| Campo | Descrizione |
|-------|-------------|
| `totale` | Importo lordo (IVA inclusa) |
| `totale_imponibile` | Importo netto (base imponibile) |
| `totale_iva` | IVA calcolata |
| `data` | Data emissione scontrino |
| `partita_iva` | P.IVA dell'azienda (04523831214) |

**REGOLA FONDAMENTALE:** I corrispettivi sono l'UNICA fonte di RICAVI.

### 1.2 Fatture Ricevute (collezione: `invoices`)
**Cosa sono:** Fatture PASSIVE ricevute dai fornitori per acquisti.

| Campo | Descrizione |
|-------|-------------|
| `total_amount` | Importo totale fattura |
| `imponibile` | Base imponibile |
| `iva` | IVA della fattura |
| `supplier_name` | Nome fornitore |
| `supplier_vat` | P.IVA fornitore |
| `tipo_documento` | TD01, TD24, TD04, TD08, etc. |

**Tipi Documento:**
- `TD01`: Fattura ordinaria (acquisto)
- `TD24`: Fattura differita (acquisto)
- `TD02`: Acconto/anticipo su fattura
- `TD04`: Nota di credito (riduce i costi)
- `TD08`: Nota di credito semplificata (riduce i costi)
- `TD06`: Parcella
- `TD27`: Fattura per autoconsumo

**REGOLA FONDAMENTALE:** Tutte le fatture in questa collezione sono COSTI.

---

## 2. FATTURE EMESSE A CLIENTI

### 2.1 Cosa sono
Quando un cliente paga con scontrino e poi chiede fattura, viene emessa una **fattura differita** che fa riferimento allo scontrino originale.

### 2.2 REGOLA CRITICA ⚠️

> **Le fatture emesse a clienti NON sono ricavi aggiuntivi!**
> 
> L'importo della fattura è GIÀ CONTEGGIATO nei corrispettivi.
> Sommarle ai ricavi creerebbe un **DOPPIO CONTEGGIO**.

### 2.3 Trattamento Corretto

| Aspetto | Trattamento |
|---------|-------------|
| **Ricavi** | NON sommare - già nei corrispettivi |
| **IVA Debito** | NON sommare - già calcolata sui corrispettivi |
| **Archivio** | Conservare per obblighi fiscali e clienti |

### 2.4 Esempio Pratico

```
Cliente compra merce per €122 (€100 + €22 IVA)
1. Emesso scontrino fiscale -> Registrato in CORRISPETTIVI
2. Cliente chiede fattura -> Emessa fattura per €122
3. Fattura emessa NON va aggiunta ai ricavi (già in corrispettivi!)
```

---

## 3. CONTO ECONOMICO

### 3.1 Formula

```
RICAVI = Corrispettivi (totale_imponibile)

COSTI = Fatture Ricevute (imponibile) 
        - Note di Credito (TD04, TD08)

UTILE/PERDITA = RICAVI - COSTI

MARGINE % = (UTILE / RICAVI) × 100
```

### 3.2 Cosa NON includere

❌ Fatture emesse a clienti (già nei corrispettivi)
❌ IVA (va nel calcolo IVA separato)
❌ Movimenti di cassa/banca (sono flussi finanziari, non economici)

---

## 4. LIQUIDAZIONE IVA MENSILE

### 4.1 Formula

```
IVA A DEBITO = IVA da Corrispettivi (totale_iva)

IVA A CREDITO = IVA da Fatture Ricevute (iva)
               - IVA da Note di Credito

IVA DA VERSARE = IVA DEBITO - IVA CREDITO
```

### 4.2 Regole Temporali

- **Corrispettivi:** IVA del mese di emissione
- **Fatture Ricevute:** Detraibili nel mese di registrazione SDI
  - Deroga 15 giorni: fattura mese precedente registrata entro il 15
  - Deroga 12 giorni: fattura registrata entro 12 giorni dalla data operazione

### 4.3 IMPORTANTE ⚠️

> **NON calcolare l'IVA sulle fatture emesse a clienti!**
> 
> L'IVA è già stata versata con i corrispettivi.
> Aggiungerla creerebbe un **DOPPIO VERSAMENTO**.

---

## 5. STATO PATRIMONIALE

### 5.1 ATTIVO

| Voce | Fonte Dati |
|------|------------|
| Cassa | Saldo `prima_nota_cassa` |
| Banca | Saldo `prima_nota_banca` |
| Crediti vs Clienti | Fatture emesse non incassate (se presenti) |

### 5.2 PASSIVO

| Voce | Fonte Dati |
|------|------------|
| Debiti vs Fornitori | Fatture ricevute non pagate |
| Patrimonio Netto | Differenza per quadratura |

---

## 6. RIFERIMENTI NORMATIVI

- **DPR 633/72**: Disciplina IVA
- **Art. 21-bis DPR 633/72**: Fatturazione differita
- **Art. 22 DPR 633/72**: Corrispettivi e scontrini
- **Circolare AdE 1/E 2018**: Fatture elettroniche

---

## 7. CHECKLIST IMPLEMENTAZIONE

✅ Ricavi = SOLO corrispettivi (totale_imponibile)
✅ Costi = Fatture ricevute - Note credito
✅ IVA debito = SOLO da corrispettivi (totale_iva)
✅ IVA credito = Da fatture ricevute
✅ Fatture emesse = NON contare come ricavi aggiuntivi
✅ Fatture emesse = NON contare per IVA debito

---

*Documento aggiornato: 22 Gennaio 2026*
*Sistema: NON multi-utente*
*P.IVA Azienda: 04523831214*
