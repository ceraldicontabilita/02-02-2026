# Application ERP/Accounting - PRD

## Stato Aggiornato: 29 Gennaio 2026 - PageLayout Applicato

---

## Lavoro Completato in Questa Sessione

### PageLayout Applicato ✅

Esteso il componente `PageLayout.jsx` a 5 pagine per standardizzare l'UI:

| Pagina | Stato | Note |
|--------|-------|------|
| CalendarioFiscale | ✅ | Già presente |
| SaldiFeriePermessi | ✅ | Già presente |
| **Finanziaria** | ✅ AGGIORNATA | KPI cards, sezioni IVA, tabelle |
| **Corrispettivi** | ✅ AGGIORNATA | KPI cards, tabella con hover |
| **CentriCosto** | ✅ AGGIORNATA | Grouped sections, CDC cards |

### API Claude (Sessione precedente) ✅

- **Backend**: `/api/claude/` con 4 endpoint (chat, analyze, report, categorize)
- **Frontend**: `/assistente-ai` con chat interattiva

## Architettura UI Standardizzata

```jsx
// Componenti PageLayout disponibili:
import { 
  PageLayout,      // Wrapper principale con header
  PageSection,     // Sezioni con titolo
  PageGrid,        // Grid responsive
  PageLoading,     // Stato caricamento
  PageEmpty,       // Stato vuoto
  PageError        // Gestione errori
} from '../components/PageLayout';
```

## Esclusioni (Richieste dall'Utente)
- ❌ Integrazione email reale per notifiche
- ❌ Esportazione bilancio XBRL

## Pagine Principali - Stato UI

| Pagina | PageLayout | Note |
|--------|------------|------|
| Dashboard | ❌ | Struttura complessa, skip |
| GestioneAssegni | ❌ | Già usa Shadcn |
| Finanziaria | ✅ | Aggiornata |
| Corrispettivi | ✅ | Aggiornata |
| CentriCosto | ✅ | Aggiornata |
| CalendarioFiscale | ✅ | Già presente |
| SaldiFeriePermessi | ✅ | Già presente |
| PrimaNota | ❌ | Troppo complessa |
| GestioneCespiti | ❌ | Già usa Shadcn |

## Test Status

- **Build**: ✅ Successo
- **Screenshots**: Verificate 3 pagine aggiornate
- **Regressioni**: Nessuna

## Backlog

### Completati ✅
- [x] Audit completo pagine
- [x] P1: Unificare Import + AI Parser
- [x] API Claude per assistente contabile
- [x] **P2: Applicare PageLayout (5 pagine)**

### Opzionale
- [ ] Estendere PageLayout a Dashboard (richiede refactoring significativo)
- [ ] Storico conversazioni Claude in MongoDB

## Integrazioni

| Servizio | Stato |
|----------|-------|
| MongoDB Atlas | ✅ |
| Odoo | ✅ |
| Claude Sonnet | ✅ |
| OpenAPI.it | ✅ |

---
*Aggiornato: 29 Gennaio 2026 - PageLayout completato su 5 pagine*
