# ERP Azienda Semplice - PRD

## Descrizione Progetto
Applicazione ERP completa per la gestione aziendale con moduli per fatture, fornitori, prima nota, assegni, dipendenti, HACCP e altro.

## Stack Tecnologico
- **Frontend**: React + Vite + Shadcn UI
- **Backend**: FastAPI + Motor (MongoDB async)
- **Database**: MongoDB

## Moduli Implementati

### 1. Fatture & XML
- Upload massivo fatture XML (FatturaPA)
- Parsing automatico dati fattura
- Gestione duplicati con chiave univoca
- Export dati

### 2. Fornitori
- Anagrafica completa fornitori
- Import Excel fornitori
- Metodi di pagamento configurabili per fornitore
- Statistiche e scadenze

### 3. Prima Nota (NUOVO)
- Prima Nota Cassa e Banca separate
- Registrazione automatica pagamenti da fatture
- **Automazione Avanzata**:
  - Import fatture Excel → Prima Nota Cassa (pagamenti contanti)
  - Import estratto conto CSV → Estrazione assegni automatica
  - Elaborazione fatture per fornitore → Cassa/Banca automatico
  - Associazione assegni a fatture per importo
- Visualizzazione assegni collegati nella tabella banca

### 4. Gestione Assegni
- Generazione assegni progressivi
- Stati: vuoto, compilato, emesso, incassato, annullato
- Collegamento assegni a fatture
- Import da estratto conto bancario

### 5. Paghe / Salari
- Upload PDF buste paga (LUL Zucchetti)
- Parser multi-pagina
- Estrazione netto, lordo, ore, contributi

### 6. HACCP
- Dashboard HACCP
- Temperature frigo/congelatori
- Sanificazioni
- Equipaggiamenti
- Scadenzario alimenti

### 7. Dipendenti
- Anagrafica dipendenti
- Portale dipendenti
- Gestione contratti

### 8. Corrispettivi
- Upload XML corrispettivi giornalieri
- Calcolo IVA progressivo

### 9. F24 / Tributi
- Gestione scadenze F24
- Alert scadenze

### 10. Magazzino
- Catalogo prodotti auto-popolato da fatture
- Comparatore prezzi tra fornitori

## API Endpoints Principali

### Prima Nota Automation (NUOVO)
```
POST /api/prima-nota-auto/import-cassa-from-excel
POST /api/prima-nota-auto/import-assegni-from-estratto-conto
POST /api/prima-nota-auto/move-invoices-by-supplier-payment
POST /api/prima-nota-auto/match-assegni-to-invoices
GET  /api/prima-nota-auto/stats
```

### Prima Nota Base
```
GET  /api/prima-nota/cassa
POST /api/prima-nota/cassa
GET  /api/prima-nota/banca
POST /api/prima-nota/banca
GET  /api/prima-nota/stats
```

### Fatture
```
POST /api/fatture/upload-xml
POST /api/fatture/upload-xml-bulk
GET  /api/invoices
```

### Fornitori
```
GET  /api/suppliers
POST /api/suppliers/upload-excel
PUT  /api/suppliers/{id}
```

### Assegni
```
GET  /api/assegni
POST /api/assegni/genera
PUT  /api/assegni/{id}
```

## Collections MongoDB

### invoices
```json
{
  "id": "uuid",
  "invoice_key": "numero_piva_data",
  "numero_fattura": "string",
  "data_fattura": "YYYY-MM-DD",
  "cedente_piva": "string",
  "cedente_denominazione": "string",
  "importo_totale": "float",
  "metodo_pagamento": "string",
  "pagato": "boolean",
  "prima_nota_cassa_id": "string",
  "prima_nota_banca_id": "string"
}
```

### suppliers
```json
{
  "id": "uuid",
  "partita_iva": "string",
  "denominazione": "string",
  "metodo_pagamento": "contanti|bonifico|assegno|...",
  "termini_pagamento": "30GG|60GG|...",
  "giorni_pagamento": "int"
}
```

### prima_nota_cassa / prima_nota_banca
```json
{
  "id": "uuid",
  "data": "YYYY-MM-DD",
  "tipo": "entrata|uscita",
  "importo": "float",
  "descrizione": "string",
  "categoria": "string",
  "riferimento": "numero fattura",
  "fornitore_piva": "string",
  "fattura_id": "string",
  "assegno_collegato": "string (solo banca)"
}
```

### assegni
```json
{
  "id": "uuid",
  "numero": "string",
  "stato": "vuoto|compilato|emesso|incassato|annullato",
  "importo": "float",
  "beneficiario": "string",
  "data_emissione": "string",
  "fattura_collegata": "string",
  "fornitore_piva": "string"
}
```

## Completato nella Sessione Corrente (4 Gennaio 2026)

### Automazione Prima Nota
1. ✅ Creato nuovo router `/app/app/routers/prima_nota_automation.py`
2. ✅ Import fatture Excel → Prima Nota Cassa (634 fatture importate)
3. ✅ Import estratto conto CSV → Assegni (134 assegni estratti)
4. ✅ Elaborazione fatture per fornitore (495 fatture → 26 cassa, 469 banca)
5. ✅ Associazione assegni a fatture per importo (106 associazioni)
6. ✅ UI pannello automazione nel frontend PrimaNota.jsx
7. ✅ Colonna assegni nella tabella Prima Nota Banca

## Backlog

### P1 - Alta Priorità
- [ ] Refactoring completo public_api.py (spostare logica nei router modulari)
- [ ] UI configurazione HACCP
- [ ] Completamento moduli Gestione Dipendenti

### P2 - Media Priorità
- [ ] Frontend alert F24
- [ ] Bug prezzo ricerca prodotti
- [ ] Export Prima Nota Excel

### P3 - Bassa Priorità
- [ ] Email service (richiede SMTP)
- [ ] Generazione contratti dipendenti

## File Principali Modificati
- `/app/app/routers/prima_nota_automation.py` (NUOVO)
- `/app/app/main.py` (registrato nuovo router)
- `/app/frontend/src/pages/PrimaNota.jsx` (pannello automazione)

## Note Tecniche
- Hot reload attivo per frontend e backend
- Usare `api.js` per tutte le chiamate API frontend
- MongoDB: sempre escludere `_id` nelle risposte
- Supervisor per gestione servizi
