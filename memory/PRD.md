# Application ERP/Accounting - PRD

## Stato Aggiornato: 29 Gennaio 2026

---

## Stack Tecnologico

### Frontend
| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| React | 18.3.1 | Framework UI |
| React Router | 6.26.2 | Routing |
| Axios | 1.7.9 | HTTP Client |
| Vite | - | Build tool |
| Tailwind CSS | - | Styling |
| Shadcn/UI | - | Componenti UI |
| Lucide React | 0.562.0 | Icone |
| Recharts | - | Grafici |
| jsPDF | 4.0.0 | Export PDF |

### Backend
| Tecnologia | Versione | Utilizzo |
|------------|----------|----------|
| FastAPI | 0.110.1 | Framework API |
| Python | 3.x | Linguaggio |
| Motor | 3.3.1 | MongoDB async driver |
| PyMongo | 4.5.0 | MongoDB sync driver |
| Pydantic | 2.12.3 | Validazione dati |
| Uvicorn | 0.25.0 | ASGI Server |

### Database & Integrazioni
| Servizio | Stato | Note |
|----------|-------|------|
| MongoDB Atlas | ✅ | Database principale |
| Odoo | ✅ | ERP integration (XML-RPC) |
| Claude Sonnet | ✅ | AI assistente (Emergent LLM Key) |
| OpenAPI.it | ✅ | Fatturazione elettronica (sandbox) |

---

## Lavoro Completato

### PageLayout Wrapper ✅ (16 pagine)
CalendarioFiscale, SaldiFeriePermessi, Finanziaria, Corrispettivi, CentriCosto, UtileObiettivo, Pianificazione, Magazzino, IVA, TFR, Bilancio, DocumentiDaRivedere, LiquidazioneIVA, ToDo, AssistenteAI, Inventario

### Paginazione Cedolini ✅
- Endpoint `/api/cedolini` con paginazione (limit, skip)
- Endpoint `/api/cedolini/incompleti` per identificare dati mancanti
- Endpoint `/api/cedolini/incompleti/{id}/completa` per completare record

### API Claude ✅
- `/api/claude/chat` - Assistente AI
- `/api/claude/analyze` - Analisi documenti  
- `/api/claude/report` - Report narrativi
- `/api/claude/categorize` - Categorizzazione

---

## Cose da Completare

### P0 - Alta Priorità
1. **PageLayout su 57 pagine rimanenti** - Le pagine hanno l'import ma non il wrapper effettivo
2. **Completare dati cedolini** - 911 cedolini hanno solo campo `netto` (da PDF import)

### P1 - Media Priorità
1. **Test E2E completi** - Testare tutti i flussi principali
2. **Ottimizzazione query MongoDB** - Indici su campi frequenti
3. **Documentazione API** - Swagger/OpenAPI completa

### P2 - Backlog
1. **Normalizzazione collezioni MongoDB** - Nomi collezioni uniformi
2. **Export dati avanzato** - Excel, CSV per tutte le sezioni
3. **Multi-tenant** - Supporto più aziende
4. **Notifiche push** - Alert scadenze fiscali
5. **Mobile responsive** - Ottimizzazione mobile completa

---

## Struttura Applicazione

```
/app
├── frontend/           # React + Vite
│   └── src/
│       ├── pages/      # 73 pagine
│       ├── components/ # Componenti riutilizzabili
│       └── lib/        # Utility
├── backend/            # FastAPI
│   ├── app/
│   │   ├── routers/    # API endpoints
│   │   ├── parsers/    # Parser documenti
│   │   └── main.py     # App principale
│   └── services/       # Business logic
└── memory/             # Documentazione
```

---

## Test Status
- **Build Frontend**: ✅ 7.92s
- **Build Backend**: ✅ 
- **Test Frontend**: ✅ 100% (iteration_8.json)
- **API Cedolini**: ✅ Paginazione funzionante

---
*Ultimo aggiornamento: 29 Gennaio 2026*
