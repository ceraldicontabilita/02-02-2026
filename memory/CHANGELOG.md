# CHANGELOG - Azienda in Cloud ERP

## Gennaio 2026

### 10 Gennaio 2026

#### 🎨 Fix Logo Aziendale
- **Problema**: File `logo-ceraldi.png` corrotto (conteneva HTML)
- **Soluzione**: 
  - Ripristinato da `logo_ceraldi.png` valido
  - Convertito in **bianco** per visibilità su sidebar scura
  - Salvato nel database MongoDB (`settings_assets`)
- **Nuovi endpoint**:
  - `GET /api/settings/logo` - Recupera logo
  - `POST /api/settings/logo` - Upload nuovo logo

#### 🔍 Riconciliazione Automatica Migliorata
- **File modificato**: `/app/app/routers/accounting/riconciliazione_automatica.py`
- **Nuovo sistema a punteggio (score)**:
  - Importo esatto (±0.05€) → +10 punti
  - Nome fornitore in descrizione → +5 punti
  - Numero fattura in descrizione → +5 punti
- **Funzioni aggiunte**:
  - `match_fornitore_descrizione()` - Confronto intelligente nomi
  - `match_numero_fattura_descrizione()` - Estrazione numeri fattura
- **Logica**:
  - Score ≥ 15 → Match sicuro automatico
  - Score 10-14 → Match se unica fattura
  - Score = 10 → Operazione da confermare

#### 🍰 Ricerca Web Ricette + Normalizzazione 1kg
- **Nuovo file**: `/app/app/routers/haccp_v2/ricette_web_search.py`
- **Funzionalità**:
  - Ricerca ricette con Claude Sonnet 4.5
  - Normalizzazione automatica a 1kg ingrediente base
  - Categorie: dolci, rosticceria napoletana/siciliana, contorni, basi
- **Importazione massiva completata**:
  - 63 nuove ricette importate con AI
  - Database totale: **158 ricette**
  - 122 normalizzate a 1kg (77.2%)
- **Ricette aggiunte per categoria**:
  | Categoria | Nuove | Esempi |
  |-----------|-------|--------|
  | Dolci | 23 | Millefoglie, Profiteroles, Sacher, Saint Honoré |
  | Rosticceria Napoletana | 12 | Calzone fritto, Casatiello, Danubio, Graffa |
  | Rosticceria Siciliana | 10 | Cartocciate, Iris, Sfincione, Panelle |
  | Contorni | 9 | Parmigiana, Caponata, Carciofi alla romana |
  | Basi | 9 | Besciamella, Crema diplomatica, Pasta brisée |

---

## Dicembre 2025 - Gennaio 2026 (Sessioni Precedenti)

### Modulo HACCP Completo
- Temperature positive/negative con soglie allarme
- Sanificazione e disinfestazione
- Ricettario dinamico collegato a fatture XML
- Gestione non conformità
- Libro allergeni stampabile PDF
- Etichette lotto con evidenziazione allergeni

### Associazione Bonifici ↔ Salari
- Dropdown suggerimenti compatibili in Archivio Bonifici
- Endpoint `/api/archivio-bonifici/operazioni-salari-compatibili`
- Endpoint `/api/archivio-bonifici/associa-salario`

### Gestione Allergeni
- Backend libro allergeni (`/api/haccp-v2/libro-allergeni/`)
- Lista allergeni UE standard
- Stampa PDF registro allergeni
- Integrazione in EtichettaLotto.jsx

### Sistema Email Aruba
- Download notifiche fatture via IMAP
- Parsing HTML per estrazione dati
- Workflow operazioni da confermare
- Riconciliazione automatica con estratto conto

### Refactoring UI
- Conversione pagine a stili inline
- Hook `useResponsive.js` per design adattivo
- Pagina `LibroAllergeni.jsx` responsive (esempio)

---

## Note Tecniche

### Normalizzazione Ricette
```
Formula: fattore = 1000 / grammi_ingrediente_base

Esempio:
- Ricetta con 300g farina → fattore = 3.33
- Tutti gli ingredienti × 3.33
- Risultato: farina = 1000g, altri proporzionati
```

### Match Riconciliazione
```python
# Calcolo score
score = 0
if importo_match: score += 10
if fornitore_in_descrizione: score += 5
if numero_fattura_in_descrizione: score += 5

# Decisione
if score >= 15: riconcilia_automatico()
elif score >= 10 and fattura_unica: riconcilia_automatico()
else: crea_operazione_da_confermare()
```
