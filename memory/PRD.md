# PRD - Azienda in Cloud ERP

## Descrizione Progetto
Sistema ERP completo per Ceraldi Group S.R.L. con moduli per contabilità, fatturazione, magazzino e HACCP.

## Requisiti Principali Completati

### 1. Sistema HACCP Completo
- Temperature positive/negative
- Sanificazione e disinfestazione  
- Anomalie e chiusure
- Gestione lotti e materie prime
- Ricettario dinamico collegato a fatture XML
- Gestione non conformità
- Libro allergeni stampabile

### 2. Modulo Contabilità
- Prima nota con categorizzazione automatica
- Prima nota salari
- Piano dei conti e bilancio
- Gestione IVA e liquidazioni
- Riconciliazione bancaria
- Gestione bonifici con associazione salari

### 3. Gestione Documenti
- Import fatture XML
- Ciclo passivo integrato
- Archivio documenti email
- Export PDF/Excel

### 4. Magazzino
- Gestione prodotti e lotti
- Tracciabilità completa
- Dizionario articoli

---

## CHANGELOG - Gennaio 2026

### 10 Gennaio 2026 - Ricerca Web Ricette + Importazione Massiva

**Nuove Funzionalità Implementate:**

1. **Ricerca Web Ricette con AI (Claude Sonnet 4.5)**
   - Cerca ricette di dolci, rosticceria napoletana/siciliana, contorni e basi
   - Genera ricette complete con ingredienti, quantità e procedimento
   
2. **Normalizzazione Automatica a 1kg**
   - Tutte le ricette vengono normalizzate a 1kg dell'ingrediente base
   - TUTTI gli ingredienti moltiplicati per lo stesso fattore
   - Esempio: ricetta con 300g farina → fattore x3.33 → tutti ingredienti x3.33

3. **Importazione Massiva Completata**
   - **63 nuove ricette importate con AI**
   - Database totale: **158 ricette** (da 95 iniziali)
   - **122 ricette normalizzate a 1kg** (77.2%)

**Ricette Importate per Categoria:**

| Categoria | Nuove Ricette | Esempi |
|-----------|---------------|--------|
| Dolci | 23 | Millefoglie, Profiteroles, Sacher, Saint Honoré, Paris Brest, Torta della Nonna |
| Rosticceria Napoletana | 12 | Calzone fritto, Casatiello, Danubio, Graffa, Pizza fritta, Taralli, Montanara |
| Rosticceria Siciliana | 10 | Cartocciate, Iris, Sfincione, Panelle, Crispelle di riso, Cipolline |
| Contorni | 9 | Parmigiana melanzane, Caponata, Carciofi alla romana, Patate al forno |
| Basi | 9 | Besciamella, Crema diplomatica, Pasta brisée, Impasto pizza napoletana |

**File Creati/Modificati:**
- `/app/app/routers/haccp_v2/ricette_web_search.py` (NUOVO)
- `/app/app/routers/haccp_v2/__init__.py` (aggiornato)
- `/app/app/main.py` (aggiornato)
- `/app/frontend/src/pages/RicettarioDinamico.jsx` (aggiornato)

**API Endpoints:**
- `POST /api/haccp-v2/ricette-web/cerca` - Cerca ricetta con AI
- `POST /api/haccp-v2/ricette-web/importa` - Importa ricetta nel database
- `POST /api/haccp-v2/ricette-web/normalizza-esistenti` - Normalizza tutte le ricette
- `POST /api/haccp-v2/ricette-web/migliora` - Migliora ricetta con AI
- `GET /api/haccp-v2/ricette-web/suggerimenti` - Suggerimenti per categoria
- `GET /api/haccp-v2/ricette-web/statistiche-normalizzazione` - Stats normalizzazione

**Tecnologie:**
- Claude Sonnet 4.5 via Emergent LLM Key
- emergentintegrations library

---

## ROADMAP

### P0 - Completato ✅
- [x] Ricerca web ricette con normalizzazione 1kg
- [x] Importazione massiva ricette (63 nuove)

### P1 - Media Priorità
- [ ] Refactoring responsive dell'applicazione
- [ ] Responsive: Dashboard principale
- [ ] Responsive: ArchivioBonifici.jsx
- [ ] Responsive: Pagine HACCP

### P2 - Bassa Priorità
- [ ] Miglioramenti UX generali
- [ ] Ottimizzazione performance
- [ ] Test automatizzati

---

## Architettura Tecnica

### Backend
- FastAPI (Python)
- MongoDB
- emergentintegrations per AI

### Frontend
- React
- Stili JavaScript inline (no CSS esterno)
- Hook useResponsive per design adattivo

### Database Collections
- `ricette` - Ricettario con 158 ricette normalizzate
- `lotti_materie_prime` - Tracciabilità ingredienti
- `fatture_ricevute` - Fatture XML importate
- `prima_nota_salari` - Operazioni salari
- `archivio_bonifici` - Bonifici bancari
