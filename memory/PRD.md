# Application ERP/Accounting - PRD

## Stato Aggiornato: 29 Gennaio 2026 - PageLayout Esteso

---

## Lavoro Completato

### PageLayout Applicato ✅ (8 pagine totali)

| Pagina | Stato | Descrizione |
|--------|-------|-------------|
| CalendarioFiscale | ✅ | Già presente |
| SaldiFeriePermessi | ✅ | Già presente |
| Finanziaria | ✅ | KPI cards, IVA, Prima Nota |
| Corrispettivi | ✅ | KPI, tabella hover |
| CentriCosto | ✅ | Sezioni raggruppate, CDC cards |
| **UtileObiettivo** | ✅ NEW | Progress bar, metriche, target |
| **Pianificazione** | ✅ NEW | Form eventi, lista eventi |
| **Magazzino** | ✅ NEW | Filtri, tabs, catalogo/manuale |

### API Claude ✅
- `/api/claude/chat` - Assistente contabile AI
- `/api/claude/analyze` - Analisi documenti
- `/api/claude/report` - Report narrativi
- `/api/claude/categorize` - Categorizzazione automatica

## Architettura UI

```jsx
// Componenti PageLayout
import { 
  PageLayout,      // Wrapper con header
  PageSection,     // Sezioni con titolo
  PageGrid,        // Grid responsive (cols: 2-4)
  PageLoading,     // Stato caricamento
  PageEmpty,       // Stato vuoto
  PageError        // Gestione errori
} from '../components/PageLayout';
```

## Test Status
- **Build**: ✅ Successo
- **8 pagine** con design coerente

## Pagine Rimanenti Senza PageLayout
- Dashboard (struttura troppo complessa)
- GestioneAssegni (usa già Shadcn)
- PrimaNota (molto complessa)
- GestioneCespiti (già usa Shadcn)

## Integrazioni
| Servizio | Stato |
|----------|-------|
| MongoDB Atlas | ✅ |
| Odoo | ✅ |
| Claude Sonnet | ✅ |

---
*Aggiornato: 29 Gennaio 2026*
