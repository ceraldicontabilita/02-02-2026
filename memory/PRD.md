# Azienda in Cloud ERP - PRD

## Stato: 4 Febbraio 2026

---

## Stack Tecnologico
| Layer | Tecnologie |
|-------|------------|
| Frontend | React 18.3, Vite, Tailwind, Shadcn/UI |
| Backend | FastAPI 0.110, Python, Pydantic 2.12 |
| Database | MongoDB Atlas |
| Integrazioni | OpenAPI.it (SDI, XBRL), pypdf, PayPal, Claude Sonnet |
| Scheduler | APScheduler (HACCP, Email, Verbali) |

---

## SCHEDULER ATTIVO

| Job | Frequenza | Descrizione |
|-----|-----------|-------------|
| `gmail_aruba_sync` | ogni 10 min | Sync fatture Gmail/Aruba |
| `verbali_email_scan` | ogni ora | Scan email per verbali/quietanze |
| `haccp_daily_routine` | 00:01 UTC | Auto-popolamento HACCP |

---

## LOGICA AUTOMAZIONE EMAIL

### PRINCIPIO: PRIMA COMPLETA, POI AGGIUNGI

**FASE 1 - Completa Sospesi:**
1. Cerca quietanze per verbali "DA_PAGARE"
2. Cerca PDF per verbali senza allegato
3. Cerca fatture per verbali "IDENTIFICATO"

**FASE 2 - Aggiungi Nuovi:**
1. Cerca nuovi verbali
2. Cerca nuove quietanze
3. Cerca nuove fatture noleggiatori

### ARRICCHIMENTO DATI
```
TARGA → VEICOLO → DRIVER → FATTURA → STATO → PRIMA NOTA
```

### STATI VERBALE
- `riconciliato`: ha fattura + pagamento + driver
- `pagato`: ha fattura + pagamento
- `fattura_ricevuta`: ha fattura
- `identificato`: ha driver o targa
- `da_identificare`: nessun dato

Dettagli: `/app/memory/LOGICA_EMAIL_AUTOMAZIONE.md`

---

## CORREZIONI 4 FEBBRAIO 2026

### Completato ✅
1. Menu riorganizzato (Attendance/Saldi in Dipendenti, Odoo rimosso)
2. API Automotive integrata in Noleggio
3. Fix endpoint (DaRivedere, PagoPA, Saldi Ferie, Noleggio)
4. Cedolini associati a dipendenti tramite fuzzy match
5. Logica salvataggio automatico in collection specifiche (invoices, cedolini, f24)

### Da Fare 🔄
- UI non conformi: Classificazione Email, Correzione AI, Motore Contabile
- Import Documenti: Upload PDF massivo
- Revisione grafica completa

---

## ARCHITETTURA

```
/app/
├── app/
│   ├── routers/           # Endpoint API
│   ├── services/
│   │   ├── email_document_downloader.py    # Download email
│   │   ├── ai_integration_service.py       # Parsing AI + salvataggio
│   │   ├── verbali_email_scanner.py        # Scanner verbali
│   │   └── email_monitor_service.py        # Monitor email
│   ├── scheduler.py       # Task periodici
│   └── database.py        # MongoDB
└── frontend/
    └── src/
        ├── pages/
        └── components/
```

---

## NOTE IMPORTANTI

1. **NIENTE DATI MOCK**: Solo dati reali da MongoDB
2. **FILTRO ANNO**: Rispettare sempre l'anno selezionato
3. **API AXIOS**: Usare `api` non `fetch` per gestione automatica token
4. **SCHEDULER**: Verificare status con `/api/verbali-riconciliazione/scheduler-status`
