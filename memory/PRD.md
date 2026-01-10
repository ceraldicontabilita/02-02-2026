# PRD - Azienda in Cloud ERP

## Panoramica
Sistema ERP completo per **Ceraldi Group S.R.L.** - gestione contabilità, fatturazione, magazzino e HACCP per attività di ristorazione/bar.

**Stack Tecnologico:**
- Backend: FastAPI (Python) + MongoDB
- Frontend: React + Stili JavaScript inline
- AI: Claude Sonnet 4.5 via Emergent LLM Key

---

## Moduli Principali

### 1. Contabilità
- **Prima Nota Cassa/Banca** - Registrazione movimenti
- **Prima Nota Salari** - Gestione paghe dipendenti
- **Piano dei Conti** - Struttura contabile
- **Bilancio** - Stato patrimoniale e conto economico
- **IVA** - Calcolo, liquidazione, F24
- **Riconciliazione Bancaria** - Match automatico estratto conto ↔ fatture

### 2. Fatturazione
- **Ciclo Passivo** - Fatture fornitori (XML)
- **Archivio Fatture** - Storico documenti
- **Import XML** - Parsing fatture elettroniche Aruba

### 3. Magazzino
- **Gestione Prodotti** - Anagrafica articoli
- **Lotti** - Tracciabilità completa
- **Dizionario Articoli** - Mappatura codici

### 4. HACCP
- **Temperature** - Controllo celle positive/negative
- **Sanificazione** - Registro pulizie
- **Ricettario Dinamico** - Ricette con tracciabilità ingredienti
- **Non Conformità** - Gestione anomalie
- **Libro Allergeni** - Registro stampabile PDF
- **Etichette Lotto** - Stampa con allergeni

### 5. Gestione Email
- **Sync Aruba** - Download notifiche fatture
- **Parsing HTML** - Estrazione dati (fornitore, importo, data, numero)
- **Operazioni da Confermare** - Workflow approvazione

---

## Funzionalità Chiave Implementate

### Ricerca Web Ricette con AI
- Ricerca ricette online con Claude Sonnet 4.5
- Categorie: dolci, rosticceria napoletana, rosticceria siciliana, contorni, basi
- **Normalizzazione automatica a 1kg** dell'ingrediente base
- Formula: `fattore = 1000 / grammi_ingrediente_base`
- Tutti gli ingredienti moltiplicati per lo stesso fattore

### Riconciliazione Automatica Migliorata
Sistema a punteggio (score) con 3 criteri:
1. **Importo esatto** (±0.05€) → +10 punti
2. **Nome fornitore** nella descrizione → +5 punti
3. **Numero fattura** nella descrizione → +5 punti

Logica:
- Score ≥ 15 → Riconciliazione automatica sicura
- Score 10-14 → Riconcilia se unica fattura
- Score = 10 → Da confermare manualmente

### Associazione Bonifici ↔ Salari
- Dropdown suggerimenti in Archivio Bonifici
- Match per importo e periodo
- Collegamento a prima_nota_salari

---

## Schema Database (MongoDB)

### Collezioni Principali
```
invoices                    # Fatture ricevute (XML)
suppliers                   # Anagrafica fornitori
cash_movements              # Prima nota cassa
bank_movements              # Prima nota banca
prima_nota_salari           # Movimenti salari
estratto_conto_movimenti    # Estratto conto importato
operazioni_da_confermare    # Workflow approvazione
archivio_bonifici           # Bonifici emessi
ricette                     # Ricettario (158 ricette)
lotti_materie_prime         # Tracciabilità ingredienti
settings_assets             # Logo e asset aziendali
```

### Schema Ricette
```javascript
{
  id: String,
  nome: String,
  categoria: String,  // "dolci", "rosticceria_napoletana", etc.
  ingredienti: [{
    nome: String,
    quantita: Number,
    unita: String
  }],
  ingrediente_base: String,  // "farina", "mandorle", etc.
  normalizzata_1kg: Boolean,
  fattore_normalizzazione: Number,
  procedimento: String,
  fonte: String,  // "AI Generated - Claude Sonnet 4.5"
  created_at: DateTime
}
```

---

## API Endpoints Principali

### HACCP - Ricette Web Search
```
POST /api/haccp-v2/ricette-web/cerca
POST /api/haccp-v2/ricette-web/importa
POST /api/haccp-v2/ricette-web/normalizza-esistenti
POST /api/haccp-v2/ricette-web/migliora
GET  /api/haccp-v2/ricette-web/suggerimenti
GET  /api/haccp-v2/ricette-web/statistiche-normalizzazione
```

### Riconciliazione
```
POST /api/riconciliazione-auto/riconcilia-estratto-conto
GET  /api/riconciliazione-auto/stats-riconciliazione
GET  /api/riconciliazione-auto/operazioni-dubbi
POST /api/riconciliazione-auto/conferma-operazione/{id}
```

### Operazioni da Confermare
```
GET  /api/operazioni-da-confermare/lista
POST /api/operazioni-da-confermare/sync-email
POST /api/operazioni-da-confermare/{id}/conferma
```

### Settings
```
GET  /api/settings/logo
POST /api/settings/logo
```

---

## Architettura File

```
/app
├── app/
│   ├── main.py                          # Entry point FastAPI
│   ├── database.py                      # Connessione MongoDB
│   ├── routers/
│   │   ├── accounting/
│   │   │   └── riconciliazione_automatica.py  # Match triplo
│   │   ├── haccp_v2/
│   │   │   ├── ricette_web_search.py    # AI search + normalizzazione
│   │   │   ├── ricettario_dinamico.py   # Gestione ricette
│   │   │   ├── libro_allergeni.py       # PDF allergeni
│   │   │   └── ...
│   │   ├── operazioni_da_confermare.py  # Workflow email
│   │   ├── settings.py                  # Logo e config
│   │   └── ...
│   └── services/
│       ├── aruba_invoice_parser.py      # Parsing email Aruba
│       └── ...
├── frontend/
│   └── src/
│       ├── App.jsx                      # Layout principale
│       ├── pages/
│       │   ├── RicettarioDinamico.jsx   # UI ricettario + search AI
│       │   ├── OperazioniDaConfermare.jsx
│       │   ├── Dashboard.jsx
│       │   └── ...
│       ├── hooks/
│       │   └── useResponsive.js         # Hook responsive
│       └── public/
│           └── logo-ceraldi.png         # Logo bianco
└── memory/
    ├── PRD.md                           # Questo file
    ├── CHANGELOG.md                     # Storico modifiche
    └── ROADMAP.md                       # Task futuri
```

---

## Integrazioni Esterne

| Servizio | Uso | Chiave |
|----------|-----|--------|
| Claude Sonnet 4.5 | Ricerca ricette AI | EMERGENT_LLM_KEY |
| MongoDB | Database | MONGO_URL |
| Aruba Email | Notifiche fatture | EMAIL_ADDRESS, EMAIL_PASSWORD |

---

## Filtro Anno Globale (Implementato 2025-01-10)

Sistema di filtro anno centralizzato per l'intera applicazione.

### Architettura
- **Contesto**: `/app/frontend/src/contexts/AnnoContext.jsx`
- **Hook**: `useAnnoGlobale()` restituisce `{ anno, setAnno }`
- **Selettore**: `<AnnoSelector />` posizionato nella sidebar
- **Persistenza**: localStorage (`annoGlobale`)

### Pagine Convertite
- Dashboard, Archivio Fatture Ricevute, Controllo Mensile
- Ciclo Passivo Integrato, Gestione Riservata
- HACCPCompleto, HACCPCongelatoriV2, HACCPFrigoriferiV2
- HACCPSanificazioniV2, HACCPNonConformita, HACCPSanificazione, HACCPTemperature
- Corrispettivi, IVA, LiquidazioneIVA, Fatture, ContabilitaAvanzata, HACCPAnalytics

### Comportamento
- L'anno selezionato nella sidebar filtra tutti i dati dell'app
- Le pagine mostrano `"ANNO (globale)"` per indicare che il valore è read-only
- La navigazione tra mesi è limitata all'anno corrente selezionato

---

## Vincoli Tecnici

1. **Stili inline obbligatori** - No CSS esterno, solo `style={{...}}`
2. **MongoDB ObjectId** - Sempre escludere `_id` nelle risposte
3. **Normalizzazione 1kg** - Tutte le ricette devono avere ingrediente base = 1000g
4. **Match riconciliazione** - Triplo criterio (importo + fornitore + numero fattura)
5. **Filtro Anno** - Usare sempre `useAnnoGlobale()` per l'anno, non `useState` locale
