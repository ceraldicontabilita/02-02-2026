# TechRecon Accounting System
## Sistema ERP Contabile per Aziende Italiane

---

# 📖 INDICE

1. [Panoramica](#1-panoramica)
2. [Architettura](#2-architettura)
3. [Struttura Progetto](#3-struttura-progetto)
4. [Regole di Business](#4-regole-di-business)
5. [Logica Contabile](#5-logica-contabile)
6. [Sistema Giustificativi](#6-sistema-giustificativi)
7. [Riconciliazione Intelligente](#7-riconciliazione-intelligente)
8. [Frontend - Standard UI/UX](#8-frontend---standard-uiux)
9. [API Reference](#9-api-reference)
10. [Database Schema](#10-database-schema)
11. [Flussi Operativi](#11-flussi-operativi)
12. [Guida Sviluppo](#12-guida-sviluppo)
13. [Troubleshooting](#13-troubleshooting)

---

# 1. PANORAMICA

## 1.1 Cos'è TechRecon
Sistema ERP completo per la gestione contabile di aziende italiane, con focus su:
- **Fatturazione elettronica** (import/export XML SDI)
- **Prima Nota** (Cassa e Banca)
- **Gestione F24** e tributi
- **Dipendenti** (presenze, ferie, cedolini)
- **Riconciliazione** automatica con estratto conto
- **Noleggio auto** (verbali, bolli, riparazioni)

## 1.2 Obiettivi
1. **Conformità normativa italiana** - Rispetto di tutte le normative fiscali
2. **Riduzione errori** - Validazione automatica e controlli incrociati
3. **Tracciabilità** - Ogni operazione è registrata e auditabile
4. **Efficienza** - Automazione dei processi ripetitivi

## 1.3 Stack Tecnologico

| Layer | Tecnologia |
|-------|------------|
| Frontend | React 18 + Vite + TailwindCSS |
| UI Components | Shadcn/UI |
| State Management | React Query + Zustand |
| Backend | FastAPI (Python 3.11+) |
| Database | MongoDB Atlas |
| Email | IMAP (Gmail) |
| Fatturazione | InvoiceTronic (SDI) |
| Pagamenti | PagoPA |

---

# 2. ARCHITETTURA

## 2.1 Diagramma Generale

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Dashboard │ │Fatture   │ │Dipendenti│ │Prima Nota│  ...       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                       │
│  /api/invoices  /api/employees  /api/prima-nota  /api/f24  ...  │
└───────┬────────────┬────────────┬────────────┬──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │Riconciliazione│ │Classificazione│ │Document AI  │             │
│  │Intelligente   │ │Email         │ │(OCR+LLM)    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└───────┬────────────────────────────────────────┬────────────────┘
        │                                        │
        ▼                                        ▼
┌───────────────────┐                  ┌───────────────────┐
│   MongoDB Atlas   │                  │  External APIs    │
│   - invoices      │                  │  - InvoiceTronic  │
│   - employees     │                  │  - PagoPA         │
│   - prima_nota_*  │                  │  - Gmail IMAP     │
│   - f24           │                  └───────────────────┘
│   - ...           │
└───────────────────┘
```

## 2.2 Flusso Dati Principale

```
Fattura XML (SDI)
       │
       ▼
┌──────────────────┐
│ Import & Validazione │──► Validatori P0 (bloccanti)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Anagrafica Fornitore │──► Aggiornamento automatico
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Scadenzario      │──► Data scadenza calcolata
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Riconciliazione  │──► Match con estratto conto
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Prima Nota       │──► Scrittura contabile
└──────────────────┘
```

---

# 3. STRUTTURA PROGETTO

## 3.1 Backend (`/app/app/`)

```
/app/app/
├── main.py                    # Entry point FastAPI
├── config.py                  # Configurazioni
├── database.py                # Connessione MongoDB
│
├── routers/                   # API Endpoints
│   ├── auth.py               # Autenticazione
│   ├── suppliers.py          # Fornitori
│   ├── attendance.py         # Presenze
│   │
│   ├── accounting/           # Modulo Contabilità
│   │   ├── prima_nota.py
│   │   ├── piano_conti.py
│   │   ├── bilancio.py
│   │   └── iva_calcolo.py
│   │
│   ├── employees/            # Modulo Dipendenti
│   │   ├── dipendenti.py
│   │   ├── giustificativi.py
│   │   └── buste_paga.py
│   │
│   ├── f24/                  # Modulo F24
│   │   ├── f24_main.py
│   │   ├── f24_riconciliazione.py
│   │   └── quietanze.py
│   │
│   ├── invoices/             # Modulo Fatture
│   │   ├── fatture_ricevute.py
│   │   ├── corrispettivi.py
│   │   └── invoices_export.py
│   │
│   └── bank/                 # Modulo Banca
│       ├── estratto_conto.py
│       ├── assegni.py
│       └── archivio_bonifici.py
│
├── services/                  # Business Logic
│   ├── riconciliazione_intelligente.py
│   ├── email_classifier_service.py
│   ├── document_ai_extractor.py
│   └── accounting_engine.py
│
├── models/                    # Pydantic Models
│   ├── employee.py
│   ├── invoice.py
│   └── f24.py
│
└── utils/                     # Utilities
    ├── logger.py
    └── date_utils.py
```

## 3.2 Frontend (`/app/frontend/src/`)

```
/app/frontend/src/
├── main.jsx                   # Entry point + Router
├── App.jsx                    # Layout principale
├── api.js                     # Axios instance
├── styles.css                 # Global styles
│
├── pages/                     # Pagine principali
│   ├── Dashboard.jsx
│   ├── Attendance.jsx
│   ├── GestioneDipendentiUnificata.jsx
│   ├── ArchivioFattureRicevute.jsx
│   ├── PrimaNota.jsx
│   ├── F24.jsx
│   ├── RiconciliazioneF24.jsx
│   ├── ClassificazioneDocumenti.jsx
│   ├── NoleggioAuto.jsx
│   ├── CedoliniRiconciliazione.jsx
│   └── ...
│
├── components/                # Componenti riutilizzabili
│   └── ui/                   # Shadcn components
│       ├── button.jsx
│       ├── card.jsx
│       ├── dialog.jsx
│       ├── table.jsx
│       └── ...
│
├── lib/                       # Utilities
│   └── utils.js              # formatDateIT, formatEuro
│
├── contexts/                  # React Contexts
│   └── AnnoContext.jsx       # Contesto anno globale
│
└── stores/                    # Zustand stores
    └── primaNotaStore.js
```

---

# 4. REGOLE DI BUSINESS

## 4.1 ⚠️ Regola Critica per Agente AI

```
L'agente DEVE SEMPRE:
1. Spiegare cosa farà PRIMA di modificare il codice
2. Chiedere conferma all'utente
3. Non procedere automaticamente senza approvazione
4. Aggiornare il PRD ad ogni modifica significativa
```

## 4.2 Formati Italiani (OBBLIGATORI)

### Date: formato GG/MM/AAAA
```javascript
// ✅ CORRETTO
formatDateIT(date)  // → "25/01/2026"

// ❌ SBAGLIATO
date.toISOString()           // → "2026-01-25T..."
date.toLocaleDateString()    // Dipende dal locale
```

### Valuta: formato € 0.000,00
```javascript
// ✅ CORRETTO
formatEuro(1234.56)  // → "€ 1.234,56"

// ❌ SBAGLIATO
`€ ${amount}`        // → "€ 1234.56"
amount.toFixed(2)    // → "1234.56"
```

### File utility: `/app/frontend/src/lib/utils.js`
```javascript
export function formatDateIT(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

export function formatEuro(amount) {
  if (amount === null || amount === undefined) return '€ 0,00';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}
```

## 4.3 Validatori Automatici

### P0 - Bloccanti (impediscono l'operazione)

| Validatore | Quando | Azione |
|------------|--------|--------|
| Fornitore senza metodo pagamento | Import XML | Blocco + richiesta completamento |
| Metodo bancario senza IBAN | Import XML | Blocco + richiesta IBAN |
| Salari in contanti post 06/2018 | Registrazione pagamento | Blocco + errore |
| Giustificativo oltre limite | Inserimento assenza | Blocco + avviso limite |
| Partita doppia sbilanciata | Scrittura contabile | Blocco + errore |

### P1 - Critici (warning ma non bloccano)

| Validatore | Quando | Azione |
|------------|--------|--------|
| Differenza cedolino/bonifico | Riconciliazione | Alert + evidenziazione |
| Fattura duplicata | Import | Warning + skip |
| Data competenza futura | Scrittura | Warning |

## 4.4 Regola Correzione Completa

```
QUANDO SI CORREGGE UN PROBLEMA, CORREGGERE SEMPRE TUTTO, NON SOLO I CASI PRINCIPALI.

Ogni fix deve essere:
- COMPLETO: Cercare TUTTI i punti dove esiste lo stesso problema
- CONSISTENTE: Applicare la stessa soluzione ovunque
- DOCUMENTATO: Aggiornare PRD/CHANGELOG con le modifiche
```

---

# 5. LOGICA CONTABILE

## 5.1 Principio Partita Doppia

```
DARE = AVERE (sempre, tolleranza ±0.01€)

Ogni operazione contabile deve essere registrata in DUE conti:
- Uno in DARE (addebito)
- Uno in AVERE (accredito)
```

## 5.2 Regole DARE/AVERE

| Tipo Conto | Aumenta in | Diminuisce in |
|------------|------------|---------------|
| ATTIVO (Cassa, Banca, Crediti) | DARE | AVERE |
| PASSIVO (Debiti, Capitale) | AVERE | DARE |
| COSTO (Acquisti, Spese) | DARE | AVERE |
| RICAVO (Vendite, Prestazioni) | AVERE | DARE |

## 5.3 Operazioni Comuni

| Operazione | Conto DARE | Conto AVERE |
|------------|------------|-------------|
| Incasso corrispettivo | Cassa | Ricavi vendite |
| Incasso POS | Cassa POS | Ricavi vendite |
| Pagamento fornitore (bonifico) | Debiti fornitori | Banca |
| Pagamento fornitore (contanti) | Debiti fornitori | Cassa |
| Rimborso ricevuto | Banca/Cassa | Rimborsi attivi |
| Pagamento F24 | Debiti tributari | Banca |
| Pagamento stipendio | Debiti dipendenti | Banca |

## 5.4 Prima Nota Cassa vs Banca

| Prima Nota CASSA | Prima Nota BANCA |
|------------------|------------------|
| ✅ Corrispettivi XML | ✅ Bonifici |
| ✅ POS (incassi carte) | ✅ Addebiti SEPA |
| ❌ Bonifici | ✅ F24 |
| ❌ F24 | ✅ Stipendi |
| ❌ Stipendi | ✅ RID |

## 5.5 Piano dei Conti Italiano

```
1.x.x - ATTIVO
  1.1.x - Cassa e Banca
    1.1.1 - Cassa contanti
    1.1.2 - Banca c/c
    1.1.3 - Cassa POS
  1.2.x - Crediti
    1.2.1 - Crediti v/clienti
    1.2.2 - Crediti v/erario

3.x.x - PASSIVO
  3.1.x - Debiti
    3.1.1 - Debiti v/fornitori
    3.1.2 - Debiti v/erario
    3.1.3 - Debiti v/dipendenti

6.x.x - COSTI
  6.1.x - Acquisti
  6.2.x - Servizi
  6.3.x - Personale

7.x.x - RICAVI
  7.1.x - Vendite
  7.2.x - Prestazioni
```

---

# 6. SISTEMA GIUSTIFICATIVI

## 6.1 Codici Standard Italiani (26 codici)

| Codice | Descrizione | Limite Annuo | Categoria |
|--------|-------------|--------------|-----------|
| FER | Ferie | 208h (26gg) | Ferie |
| ROL | Riduzione Orario Lavoro | 72h | Permessi |
| EXF | Ex Festività | 32h (4gg) | Permessi |
| MAL | Malattia | - | Malattia |
| MALF | Malattia Figlio | - | Malattia |
| INF | Infortunio | - | Infortunio |
| L104 | Permesso L.104 | 36h/mese | Permessi |
| DON | Donazione Sangue | - | Permessi |
| STUD | Permesso Studio | 150h | Permessi |
| CP | Congedo Parentale | - | Congedi |
| CMAT | Congedo Maternità | - | Congedi |
| CPAT | Congedo Paternità | 80h (10gg) | Congedi |
| SMART | Smart Working | - | Lavoro |
| ... | | | |

## 6.2 Logica Validazione

```python
# Backend: /app/app/routers/employees/giustificativi.py

async def valida_giustificativo(employee_id, codice, ore_richieste, anno):
    # 1. Recupera definizione giustificativo
    giustificativo = await db.giustificativi.find_one({"codice": codice})
    
    # 2. Recupera ore già utilizzate nell'anno
    ore_usate = await calcola_ore_usate(employee_id, codice, anno)
    
    # 3. Verifica limite
    limite = giustificativo.get("limite_annuo_ore")
    if limite and (ore_usate + ore_richieste) > limite:
        return {
            "valido": False,
            "errore": f"Limite annuo superato: {ore_usate + ore_richieste}/{limite}h"
        }
    
    return {"valido": True}
```

## 6.3 Frontend - Tab Giustificativi

```jsx
// In GestioneDipendentiUnificata.jsx

const TabGiustificativi = ({ employeeId }) => {
  const [giustificativi, setGiustificativi] = useState([]);
  
  useEffect(() => {
    // Endpoint ottimizzato con aggregazione MongoDB
    api.get(`/api/giustificativi/dipendente/${employeeId}/giustificativi`)
      .then(res => setGiustificativi(res.data));
  }, [employeeId]);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {giustificativi.map(g => (
        <Card key={g.codice}>
          <CardHeader>{g.descrizione}</CardHeader>
          <CardContent>
            <div>Maturate: {g.ore_maturate}h</div>
            <div>Godute: {g.ore_godute}h</div>
            <div>Residue: {g.ore_residue}h</div>
            <Progress value={(g.ore_godute / g.ore_maturate) * 100} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

---

# 7. RICONCILIAZIONE INTELLIGENTE

## 7.1 Stati del Flusso

```
┌─────────────────────┐
│ in_attesa_conferma  │ ← Fattura importata, attende scelta metodo
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ CASSA   │ │ BANCA   │
└────┬────┘ └────┬────┘
     │           │
     ▼           ▼
┌─────────────────────┐
│ Verifica Estratto   │ ← Cerca match in estratto conto
└──────────┬──────────┘
           │
     ┌─────┼─────┬─────────┐
     ▼     ▼     ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌─────────────┐
│ Match │ │ Match │ │ Non   │ │ Spostamento │
│ Esatto│ │ Incerto│ │Trovato│ │ Suggerito   │
└───┬───┘ └───┬───┘ └───┬───┘ └──────┬──────┘
    │         │         │            │
    ▼         ▼         ▼            ▼
┌─────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────────┐
│RICONCIL.│ │DA_VERIFICARE│ │ ANOMALIA │ │DA_VERIFICARE │
│         │ │_MATCH_INCERTO│ │_NON_IN_EC│ │_SPOSTAMENTO  │
└─────────┘ └─────────────┘ └──────────┘ └──────────────┘
```

## 7.2 Casi Speciali Implementati

### Caso 36: Assegni Multipli
```
Fattura: €2.450,00
Pagamento: 2 assegni (€1.028,82 + €1.421,77) = €2.450,59
Tolleranza: €5,00
Risultato: ✅ Riconciliato (differenza €0,59 < tolleranza)
```

### Caso 37: Arrotondamenti
```
Fattura: €999,99
Bonifico: €1.000,00
Differenza: €0,01
Risultato: ✅ Riconciliato + Abbuono attivo registrato
```

### Caso 38: Pagamento Anticipato
```
1. Registra pagamento anticipato (fornitore + importo)
2. Quando arriva fattura, cerca match automatico
3. Collega pagamento a fattura
```

## 7.3 API Riconciliazione

```python
# POST /api/riconciliazione-intelligente/conferma-pagamento
{
  "fattura_id": "...",
  "metodo": "banca",  # o "cassa"
  "data_pagamento": "2026-01-25"
}

# POST /api/riconciliazione-intelligente/assegni-multipli
{
  "fattura_id": "...",
  "assegni": [
    {"numero": "123456", "importo": 1028.82, "data": "2026-01-20"},
    {"numero": "123457", "importo": 1421.77, "data": "2026-01-20"}
  ],
  "tolleranza": 5.00
}

# POST /api/riconciliazione-intelligente/riconcilia-con-arrotondamento
{
  "fattura_id": "...",
  "movimento_id": "...",
  "tolleranza": 1.00
}
```

---

# 8. FRONTEND - STANDARD UI/UX

## 8.1 Colori e Stili Base

```css
/* Palette principale */
:root {
  --primary-navy: #1e3a5f;
  --primary-navy-light: #2d5a87;
  --background: #f0f2f5;
  --card-bg: white;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  
  /* Card statistiche */
  --stat-blue: #dbeafe;
  --stat-green: #dcfce7;
  --stat-orange: #ffedd5;
  --stat-purple: #f3e8ff;
  --stat-red: #fee2e2;
}

/* Border radius */
--radius-card: 12px;
--radius-button: 8px;
--radius-input: 6px;

/* Shadows */
--shadow-card: 0 1px 3px rgba(0,0,0,0.1);
--shadow-hover: 0 4px 6px rgba(0,0,0,0.1);
```

## 8.2 Header Standard

```jsx
// Header con gradiente blu navy
const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    padding: '16px 24px',
    borderRadius: '12px',
    color: 'white',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: 4 }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>}
  </div>
);
```

## 8.3 Card Statistiche

```jsx
// Card statistica con sfondo pastello
const StatCard = ({ title, value, subtitle, color = 'blue', icon: Icon }) => {
  const colors = {
    blue: { bg: '#dbeafe', text: '#1e40af' },
    green: { bg: '#dcfce7', text: '#166534' },
    orange: { bg: '#ffedd5', text: '#c2410c' },
    purple: { bg: '#f3e8ff', text: '#7c3aed' },
    red: { bg: '#fee2e2', text: '#dc2626' }
  };
  
  const c = colors[color];
  
  return (
    <div style={{
      background: c.bg,
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: c.text, fontSize: '0.875rem', opacity: 0.8 }}>
            {title}
          </p>
          <p style={{ color: c.text, fontSize: '1.875rem', fontWeight: 700 }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ color: c.text, fontSize: '0.75rem', opacity: 0.7 }}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && <Icon size={32} style={{ color: c.text, opacity: 0.5 }} />}
      </div>
    </div>
  );
};
```

## 8.4 Tabelle

```jsx
// Tabella standard con Shadcn
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const DataTable = ({ columns, data }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  }}>
    <Table>
      <TableHeader>
        <TableRow style={{ background: '#f8fafc' }}>
          {columns.map(col => (
            <TableHead key={col.key} style={{ fontWeight: 600 }}>
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i} style={{ '&:hover': { background: '#f8fafc' } }}>
            {columns.map(col => (
              <TableCell key={col.key}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
```

## 8.5 Pulsanti

```jsx
// Pulsanti standard
const Button = ({ variant = 'primary', children, ...props }) => {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      color: 'white',
    },
    secondary: {
      background: '#f1f5f9',
      color: '#475569',
    },
    success: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      color: 'white',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
    }
  };
  
  return (
    <button
      style={{
        ...styles[variant],
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      {...props}
    >
      {children}
    </button>
  );
};
```

## 8.6 Tab Navigation

```jsx
// Tab con stile consistente
const TabNavigation = ({ tabs, activeTab, onTabChange }) => (
  <div style={{
    display: 'flex',
    gap: '4px',
    background: '#f1f5f9',
    padding: '4px',
    borderRadius: '10px',
    marginBottom: '24px'
  }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          fontWeight: 500,
          cursor: 'pointer',
          background: activeTab === tab.id ? 'white' : 'transparent',
          color: activeTab === tab.id ? '#1e3a5f' : '#64748b',
          boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        {tab.icon && <tab.icon size={16} style={{ marginRight: 8 }} />}
        {tab.label}
      </button>
    ))}
  </div>
);
```

## 8.7 Layout Pagina Standard

```jsx
// Template pagina standard
const StandardPage = ({ title, subtitle, tabs, children }) => (
  <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
    {/* Header */}
    <PageHeader title={title} subtitle={subtitle} />
    
    {/* Tabs (opzionale) */}
    {tabs && <TabNavigation tabs={tabs} />}
    
    {/* Contenuto */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {children}
    </div>
  </div>
);
```

---

# 9. API REFERENCE

## 9.1 Autenticazione
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

## 9.2 Dipendenti
```
GET    /api/dipendenti                      # Lista dipendenti
POST   /api/dipendenti                      # Crea dipendente
GET    /api/dipendenti/{id}                 # Dettaglio
PUT    /api/dipendenti/{id}                 # Aggiorna
DELETE /api/dipendenti/{id}                 # Elimina
PUT    /api/dipendenti/{id}/in-carico       # Toggle in_carico
```

## 9.3 Presenze (Attendance)
```
GET  /api/attendance/dashboard-presenze     # Dashboard giornaliera
POST /api/attendance/timbratura             # Registra timbratura
GET  /api/attendance/dipendenti-in-carico   # Lista dipendenti attivi
POST /api/attendance/richiesta-assenza      # Richiesta ferie/permesso
PUT  /api/attendance/richiesta-assenza/{id}/approva
PUT  /api/attendance/richiesta-assenza/{id}/rifiuta
GET  /api/attendance/ore-lavorate/{id}      # Ore mensili dipendente
GET  /api/attendance/saldo-ferie/{id}       # Saldo ferie/permessi
```

## 9.4 Giustificativi
```
GET  /api/giustificativi/giustificativi                    # Lista codici
POST /api/giustificativi/init-giustificativi               # Inizializza
GET  /api/giustificativi/dipendente/{id}/giustificativi    # Saldi dipendente
POST /api/giustificativi/valida-giustificativo             # Valida inserimento
GET  /api/giustificativi/dipendente/{id}/saldo-ferie       # Saldo ferie
```

## 9.5 Fatture
```
GET    /api/fatture-ricevute/archivio       # Archivio fatture
POST   /api/invoices/import-xml             # Import XML
GET    /api/fatture-ricevute/{id}           # Dettaglio
PUT    /api/fatture-ricevute/{id}           # Aggiorna
DELETE /api/fatture-ricevute/{id}           # Elimina
POST   /api/fatture-ricevute/paga           # Registra pagamento
```

## 9.6 Prima Nota
```
GET  /api/prima-nota/cassa                  # Movimenti cassa
GET  /api/prima-nota/banca                  # Movimenti banca
POST /api/prima-nota/cassa                  # Nuovo movimento cassa
POST /api/prima-nota/banca                  # Nuovo movimento banca
POST /api/prima-nota/sposta-movimento       # Sposta cassa↔banca
```

## 9.7 F24
```
GET  /api/f24-riconciliazione/dashboard          # Dashboard
POST /api/f24-riconciliazione/commercialista/upload  # Upload file
GET  /api/f24-riconciliazione/commercialista     # Lista F24
GET  /api/f24-riconciliazione/quietanze          # Quietanze
GET  /api/f24-riconciliazione/alerts             # Alert pendenti
POST /api/f24-riconciliazione/riconcilia/{id}    # Riconcilia
```

## 9.8 Riconciliazione Intelligente
```
GET  /api/riconciliazione-intelligente/dashboard
POST /api/riconciliazione-intelligente/conferma-pagamento
POST /api/riconciliazione-intelligente/applica-spostamento
POST /api/riconciliazione-intelligente/assegni-multipli
POST /api/riconciliazione-intelligente/riconcilia-con-arrotondamento
POST /api/riconciliazione-intelligente/pagamento-anticipato
GET  /api/riconciliazione-intelligente/pagamenti-anticipati
```

## 9.9 Classificazione Documenti
```
POST /api/documenti-smart/scan              # Scansiona email
GET  /api/documenti-smart/documents         # Lista documenti
GET  /api/documenti-smart/rules             # Regole classificazione
GET  /api/documenti-smart/stats             # Statistiche
GET  /api/documenti-smart/documenti/{id}/pdf # Visualizza PDF
POST /api/documenti-smart/process           # Processa documenti
```

---

# 10. DATABASE SCHEMA

## 10.1 Collection Principali

### employees
```json
{
  "_id": ObjectId,
  "nome": "Mario",
  "cognome": "Rossi",
  "codice_fiscale": "RSSMRA80A01H501Z",
  "email": "mario.rossi@email.com",
  "telefono": "3331234567",
  "data_assunzione": ISODate,
  "data_cessazione": null,
  "in_carico": true,  // Flag per filtrare nelle presenze
  "contratto": {
    "tipo": "indeterminato",
    "ore_settimanali": 40,
    "livello": "3"
  },
  "created_at": ISODate,
  "updated_at": ISODate
}
```

### giustificativi
```json
{
  "_id": ObjectId,
  "codice": "FER",
  "descrizione": "Ferie",
  "categoria": "ferie",
  "limite_annuo_ore": 208,
  "limite_mensile_ore": null,
  "retribuito": true,
  "richiede_documentazione": false
}
```

### giustificativi_dipendente
```json
{
  "_id": ObjectId,
  "employee_id": ObjectId,
  "codice": "FER",
  "anno": 2026,
  "ore_maturate": 208,
  "ore_godute": 40,
  "ore_residue": 168,
  "riporto_anno_precedente": 16
}
```

### presenze_mensili
```json
{
  "_id": ObjectId,
  "employee_id": ObjectId,
  "anno": 2026,
  "mese": 1,
  "giorni": [
    {
      "giorno": 1,
      "stato": "presente",
      "ore_lavorate": 8,
      "timbrature": [
        { "tipo": "entrata", "ora": "08:30" },
        { "tipo": "uscita", "ora": "17:30" }
      ]
    },
    {
      "giorno": 2,
      "stato": "ferie",
      "giustificativo": "FER",
      "ore": 8
    }
  ],
  "totale_ore_lavorate": 160,
  "totale_straordinari": 5
}
```

### invoices
```json
{
  "_id": ObjectId,
  "numero": "FT-2026-001",
  "data": ISODate,
  "fornitore_id": ObjectId,
  "fornitore_nome": "Fornitore SRL",
  "fornitore_piva": "IT12345678901",
  "imponibile": 1000.00,
  "iva": 220.00,
  "totale": 1220.00,
  "stato": "da_pagare",  // da_pagare, pagata, riconciliata
  "metodo_pagamento": "bonifico",
  "data_scadenza": ISODate,
  "prima_nota_banca_id": ObjectId,
  "xml_filename": "IT123...xml",
  "tipo_documento": "TD01"
}
```

### prima_nota_cassa / prima_nota_banca
```json
{
  "_id": ObjectId,
  "data": ISODate,
  "descrizione": "Pagamento fattura FT-2026-001",
  "dare": 1220.00,
  "avere": 0,
  "conto": "3.1.1",  // Debiti v/fornitori
  "contropartita": "1.1.2",  // Banca
  "documento_id": ObjectId,
  "documento_tipo": "fattura",
  "anno": 2026,
  "mese": 1,
  "riconciliato": true,
  "estratto_conto_id": ObjectId
}
```

### f24
```json
{
  "_id": ObjectId,
  "periodo": "01/2026",
  "data_scadenza": ISODate,
  "data_pagamento": ISODate,
  "stato": "pagato",  // da_pagare, pagato, riconciliato
  "tributi": [
    { "codice": "1001", "importo": 500.00, "descrizione": "IRPEF" },
    { "codice": "1012", "importo": 200.00, "descrizione": "Add. Regionale" }
  ],
  "totale_debito": 700.00,
  "quietanza_id": ObjectId,
  "prima_nota_id": ObjectId
}
```

### documenti_email
```json
{
  "_id": ObjectId,
  "email_id": "message-id",
  "subject": "Verbale B12345",
  "from": "verbali@aci.it",
  "date": ISODate,
  "categoria": "verbali",
  "sottocategoria": "multa",
  "allegati": [
    {
      "filename": "verbale.pdf",
      "content_type": "application/pdf",
      "size": 125000,
      "gridfs_id": ObjectId
    }
  ],
  "processato": true,
  "associato_a": {
    "collection": "verbali_noleggio",
    "document_id": ObjectId
  }
}
```

---

# 11. FLUSSI OPERATIVI

## 11.1 Import Fattura XML

```
1. Upload file XML
        │
        ▼
2. Parsing e validazione
   - Verifica struttura XML
   - Estrazione dati fattura
        │
        ▼
3. Validatori P0
   - Fornitore esiste? → Se no, crea anagrafica
   - Metodo pagamento impostato? → Se no, richiedi
   - IBAN presente (se bonifico)? → Se no, richiedi
        │
        ▼
4. Salvataggio
   - Collection: invoices
   - Stato: in_attesa_conferma
        │
        ▼
5. Scadenzario
   - Calcolo data scadenza
   - Aggiornamento widget dashboard
        │
        ▼
6. Riconciliazione
   - Cerca match in estratto conto
   - Se trovato → proponi riconciliazione
```

## 11.2 Pagamento Fattura

```
1. Utente seleziona fattura da pagare
        │
        ▼
2. Scelta metodo: Cassa o Banca
        │
   ┌────┴────┐
   ▼         ▼
CASSA      BANCA
   │         │
   ▼         ▼
3a. Scrittura    3b. Cerca match
    Prima Nota       in Estratto Conto
    Cassa                 │
                    ┌─────┴─────┐
                    ▼           ▼
               TROVATO     NON TROVATO
                    │           │
                    ▼           ▼
              Riconcilia    Crea movimento
              automatico    Prima Nota Banca
                    │           │
                    └─────┬─────┘
                          │
                          ▼
4. Aggiornamento fattura
   - stato: pagata/riconciliata
   - prima_nota_id: riferimento
        │
        ▼
5. Scrittura contabile (partita doppia)
   DARE: Debiti v/fornitori
   AVERE: Cassa o Banca
```

## 11.3 Gestione Presenze

```
1. Dipendente timbra (entrata)
        │
        ▼
2. Sistema registra timbratura
   - Collection: presenze_mensili
   - Aggiorna giorno corrente
        │
        ▼
3. Durante la giornata
   - Pause registrate
   - Uscita anticipata (se richiesta)
        │
        ▼
4. Timbratura uscita
        │
        ▼
5. Calcolo ore lavorate
   - Ore ordinarie
   - Straordinari (se > 8h)
        │
        ▼
6. Fine mese: Riepilogo
   - Totale ore lavorate
   - Totale ferie/permessi
   - Aggiornamento saldi giustificativi
```

## 11.4 Richiesta Ferie/Permesso

```
1. Dipendente crea richiesta
   - Tipo giustificativo (FER, ROL, etc.)
   - Date (da → a)
   - Ore totali
        │
        ▼
2. Validazione automatica
   - Verifica limite residuo
   - Se oltre limite → BLOCCO
        │
        ▼
3. Richiesta in stato "pending"
   - Notifica a responsabile
        │
        ▼
4. Responsabile approva/rifiuta
        │
   ┌────┴────┐
   ▼         ▼
APPROVATA  RIFIUTATA
   │         │
   ▼         │
5a. Aggiorna │
    calendario│
    presenze │
   │         │
   ▼         │
5b. Scala   │
    saldo    │
    giustif. │
   │         │
   └────┬────┘
        │
        ▼
6. Notifica a dipendente
```

---

# 12. GUIDA SVILUPPO

## 12.1 Setup Ambiente

```bash
# Backend
cd /app/app
pip install -r requirements.txt

# Frontend
cd /app/frontend
yarn install

# Avvio servizi (via supervisor)
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

## 12.2 Variabili Ambiente

### Backend (`/app/backend/.env`)
```env
MONGO_URL=mongodb+srv://...
DB_NAME=techrecon
SECRET_KEY=...
IMAP_HOST=imap.gmail.com
IMAP_USER=...
IMAP_PASSWORD=...
```

### Frontend (`/app/frontend/.env`)
```env
REACT_APP_BACKEND_URL=https://...
```

## 12.3 Convenzioni Codice

### Python (Backend)
```python
# Router
from fastapi import APIRouter, HTTPException, Depends
from app.database import Database

router = APIRouter()

@router.get("/items")
async def list_items():
    db = Database.get_db()
    # Sempre escludere _id dalla response
    items = await db.items.find({}, {"_id": 0}).to_list(100)
    return items

# Gestione ObjectId
from bson import ObjectId

@router.get("/items/{id}")
async def get_item(id: str):
    db = Database.get_db()
    item = await db.items.find_one(
        {"_id": ObjectId(id)},
        {"_id": 0}  # Escludi _id
    )
    if not item:
        raise HTTPException(404, "Item non trovato")
    return item
```

### React (Frontend)
```jsx
// Importazioni standard
import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatDateIT, formatEuro } from '../lib/utils';

// Component naming: PascalCase
export default function MyComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const res = await api.get('/api/items');
      setData(res.data);
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Date sempre formattate
  return (
    <div>
      {data.map(item => (
        <div key={item.id}>
          <span>{formatDateIT(item.data)}</span>
          <span>{formatEuro(item.importo)}</span>
        </div>
      ))}
    </div>
  );
}
```

## 12.4 Test API con cURL

```bash
# Variabile base URL
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# GET semplice
curl -s "$API_URL/api/dipendenti" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2))"

# POST con body JSON
curl -X POST "$API_URL/api/attendance/timbratura" \
  -H "Content-Type: application/json" \
  -d '{"employee_id": "123", "tipo": "entrata"}'

# Upload file
curl -X POST "$API_URL/api/invoices/import-xml" \
  -F "file=@fattura.xml"
```

---

# 13. TROUBLESHOOTING

## 13.1 Problemi Comuni

### Backend non parte
```bash
# Controlla log
tail -n 100 /var/log/supervisor/backend.err.log

# Cause comuni:
# - Import mancante → pip install ...
# - Errore sintassi → controlla file modificato
# - Porta già in uso → sudo supervisorctl restart backend
```

### Frontend non carica
```bash
# Controlla log
tail -n 100 /var/log/supervisor/frontend.err.log

# Cause comuni:
# - Errore compilazione → controlla console browser
# - API non raggiungibile → verifica REACT_APP_BACKEND_URL
```

### MongoDB ObjectId in response
```python
# SBAGLIATO - causa errore serializzazione JSON
return {"_id": doc["_id"], ...}

# CORRETTO - escludi _id
doc = await db.collection.find_one({"...": "..."}, {"_id": 0})
return doc

# Se serve l'ID, converti a stringa
return {"id": str(doc["_id"]), ...}
```

### Date in formato sbagliato
```javascript
// SBAGLIATO
<span>{item.data}</span>  // Mostra ISO: 2026-01-25T...

// CORRETTO
import { formatDateIT } from '../lib/utils';
<span>{formatDateIT(item.data)}</span>  // Mostra: 25/01/2026
```

## 13.2 Performance

### Query MongoDB lente
```python
# SBAGLIATO - N+1 query
for item in items:
    detail = await db.details.find_one({"item_id": item["_id"]})

# CORRETTO - Aggregazione
pipeline = [
    {"$lookup": {
        "from": "details",
        "localField": "_id",
        "foreignField": "item_id",
        "as": "details"
    }}
]
result = await db.items.aggregate(pipeline).to_list(None)
```

### Frontend lento
```jsx
// SBAGLIATO - Re-render continui
useEffect(() => {
  // Chiamata ad ogni render
  loadData();
});

// CORRETTO - Dipendenze specifiche
useEffect(() => {
  loadData();
}, [selectedId]);  // Solo quando cambia selectedId
```

---

# 14. CONTATTI E RISORSE

## File di Riferimento
- PRD: `/app/memory/PRD.md`
- Changelog: `/app/memory/CHANGELOG.md`
- Roadmap: `/app/memory/ROADMAP.md`
- Architettura: `/app/memory/ARCHITECTURE.md`

## Struttura Test Reports
- `/app/test_reports/iteration_{n}.json`

---

*Documento generato il 22 Gennaio 2026*
*Versione: 1.0*
