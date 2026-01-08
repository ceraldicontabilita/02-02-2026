# PRD - Sistema Operazioni da Confermare con Riconciliazione Automatica

## Obiettivo
Automatizzare il flusso di registrazione fatture fornitori dalla ricezione email fino alla Prima Nota, con riconciliazione automatica dall'estratto conto bancario.

## Flusso Completo

### 1. Ricezione Email Aruba
- **Mittente**: `noreply@fatturazioneelettronica.aruba.it`
- **Subject**: "Hai ricevuto una nuova fattura elettronica"
- **Dati estratti**: Fornitore, Numero Fattura, Data Documento, Importo

### 2. Riconciliazione Automatica con Estratto Conto
Quando viene letta una fattura da email Aruba:

1. **Cerca nell'estratto conto** movimenti con:
   - Stesso importo (tolleranza ±0.50€)
   - Data vicina alla data fattura (±30 giorni)
   - Tipo "uscita"

2. **Se trova match**:
   - Analizza la descrizione del movimento bancario
   - Se contiene "ASSEGNO" → estrae il numero (es: `NUM: 0208770631`)
   - Se contiene "BONIFICO" → metodo = banca
   - Pre-compila `metodo_pagamento_proposto` e `numero_assegno`
   - Marca come `riconciliato_auto: true`

3. **Se NON trova match**:
   - Usa il metodo di pagamento dal dizionario fornitore
   - Marca come `riconciliato_auto: false`
   - L'utente dovrà inserire manualmente

### 3. Interfaccia "Operazioni da Confermare"
- **Filtro per anno fiscale** (2025, 2026, ecc.)
- Mostra badge "Riconciliato" se trovato match automatico
- Pulsanti: CASSA, BANCA, ASSEGNO (pre-selezionato se riconciliato)
- Se assegno riconciliato, numero già compilato

### 4. Conferma Operazione
Quando l'utente conferma:
- Inserisce in Prima Nota Cassa o Banca (con anno fiscale corretto)
- Se assegno → Inserisce anche in Gestione Assegni
- Aggiorna stato a "confermato"

### 5. Arrivo XML Fattura
Quando arriva l'XML della fattura:
1. Controlla se esiste già in Prima Nota (via `numero_fattura` + `fornitore`)
2. Se SÌ → NON duplicare, procedi solo con magazzino e altre operazioni
3. Se NO → Inserisci tutto normalmente

## Struttura Dati

### Collezione: `operazioni_da_confermare`
```json
{
  "id": "string",
  "fornitore": "string",
  "fornitore_id": "string|null",
  "numero_fattura": "string",
  "data_documento": "YYYY-MM-DD",
  "anno": 2025,
  "importo": 123.45,
  "metodo_pagamento_proposto": "cassa|banca|assegno",
  "metodo_pagamento_confermato": "cassa|banca|assegno|null",
  "numero_assegno": "string|null",
  "stato": "da_confermare|confermato",
  "riconciliato_auto": true|false,
  "estratto_conto_match": {
    "id": "movimento_id",
    "descrizione": "...",
    "data": "YYYY-MM-DD"
  },
  "fonte": "aruba_email",
  "created_at": "ISO datetime",
  "confirmed_at": "ISO datetime|null"
}
```

### Collezione: `estratto_conto`
```json
{
  "id": "string",
  "data": "YYYY-MM-DD",
  "descrizione": "PRELIEVO ASSEGNO - ... NUM: 0208770631",
  "importo": 123.45,
  "tipo": "entrata|uscita",
  "categoria": "string"
}
```

## API Endpoints

### GET /api/operazioni-da-confermare/lista
- Query params: `anno`, `stato`, `limit`
- Ritorna lista operazioni con statistiche

### POST /api/operazioni-da-confermare/sync-email
- Scarica email Aruba
- Esegue riconciliazione automatica
- Ritorna statistiche (nuove, riconciliate, non riconciliate)

### POST /api/operazioni-da-confermare/{id}/conferma
- Query params: `metodo`, `numero_assegno` (opzionale)
- Inserisce in Prima Nota

### GET /api/operazioni-da-confermare/check-fattura-esistente
- Query params: `fornitore`, `numero_fattura`
- Controlla se fattura già in Prima Nota (per evitare duplicati da XML)

## Regex per Estrazione Numero Assegno
```python
# Pattern: "NUM: 0208770631" o "ASSEGNO N. 12345"
import re
match = re.search(r'NUM:\s*(\d+)|ASSEGNO\s*N\.?\s*(\d+)', descrizione, re.IGNORECASE)
if match:
    numero_assegno = match.group(1) or match.group(2)
```

## Note Implementative
1. La riconciliazione avviene al momento del sync email (non in real-time)
2. L'estratto conto deve essere caricato prima per permettere la riconciliazione
3. Il match per importo ha tolleranza per gestire arrotondamenti
4. Le operazioni rimangono "da_confermare" fino a click utente
5. L'anno fiscale è determinato dalla data documento, non dalla data email
