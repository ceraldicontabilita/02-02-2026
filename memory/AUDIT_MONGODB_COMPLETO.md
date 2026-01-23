# AUDIT COMPLETO ARCHITETTURA MONGODB-ONLY

**Data**: Dicembre 2025
**Stato**: Refactoring completato - 63 riferimenti residui (deprecati o helper)

---

## 📊 RIEPILOGO AUDIT FINALE

### ✅ FILE PRINCIPALI RIFATTORIZZATI

| # | File | Riferimenti Prima → Dopo | Stato |
|---|------|--------------------------|-------|
| 1 | `services/cedolini_manager.py` | ~15 → 0 | ✅ COMPLETATO |
| 2 | `services/email_monitor_service.py` | ~10 → 0 | ✅ COMPLETATO |
| 3 | `routers/documenti_module/crud.py` | ~8 → 0 | ✅ COMPLETATO |
| 4 | `services/parser_f24.py` | ~5 → 2 (parametri) | ✅ COMPLETATO |
| 5 | `services/f24_parser.py` | ~5 → 4 (parametri) | ✅ COMPLETATO |
| 6 | `routers/f24/f24_main.py` | ~12 → 1 (commento) | ✅ COMPLETATO |
| 7 | `routers/f24/email_f24.py` | ~8 → 0 | ✅ COMPLETATO |
| 8 | `routers/f24/f24_riconciliazione.py` | ~15 → 0 | ✅ COMPLETATO |
| 9 | `routers/f24/quietanze.py` | ~8 → 0 | ✅ COMPLETATO |
| 10 | `routers/f24/f24_public.py` | ~5 → 2 (fallback) | ✅ COMPLETATO |
| 11 | `routers/quietanze_f24.py` | ~10 → 2 (query) | ✅ COMPLETATO |
| 12 | `routers/documenti_intelligenti.py` | ~15 → 0 | ✅ COMPLETATO |
| 13 | `routers/bonifici_module/jobs.py` | ~8 → 3 (batch) | ✅ COMPLETATO |
| 14 | `routers/employees/employee_contracts.py` | ~12 → 9 (template) | ✅ COMPLETATO |
| 15 | `routers/documenti.py` | ~24 → 6 | ✅ COMPLETATO |
| 16 | `services/email_full_download.py` | ~30 → 14 (deprecated) | ✅ COMPLETATO |

### 🔶 FILE CON RIFERIMENTI RESIDUI (Non critici)

| File | Riferimenti | Motivo |
|------|-------------|--------|
| `utils/logger.py` | 3 | Logging, non dati |
| `parsers/estratto_conto_*.py` | 3 ciascuno | Helper legacy con fallback |
| `services/email_downloader.py` | 3 | Deprecato |
| `services/email_document_downloader.py` | 3 | Deprecato |
| `api/routers/iva.py` | 3 | Report generation |
| `services/parser_f24_gemini.py` | 1 | AI fallback |

---

## 📄 MAPPATURA COMPLETA 67 PAGINE

### SEZIONE: DOCUMENTI (7 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 1 | Documenti | `Documenti.jsx` | `/api/documenti/*` | `documents_inbox` | ✅ |
| 2 | Documenti Non Associati | `DocumentiNonAssociati.jsx` | `/api/non-associati/*` | `documenti_non_associati` | ✅ |
| 3 | Email Download | `EmailDownloadManager.jsx` | `/api/email-download/*` | `documents_inbox` | ✅ |
| 4 | Classificazione | `ClassificazioneDocumenti.jsx` | `/api/documenti-intelligenti/*` | `documents_classified` | ✅ |
| 5 | Import Unificato | `ImportUnificato.jsx` | `/api/import/*` | `documents_inbox` | ✅ |
| 6 | Upload Manager | `UploadManager.jsx` | `/api/upload/*` | `documents_inbox` | ✅ |
| 7 | Commercialista | `Commercialista.jsx` | `/api/commercialista/*` | `documents_inbox` | ✅ |

### SEZIONE: CONTABILITÀ (12 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 8 | Prima Nota | `PrimaNota.jsx` | `/api/prima-nota/*` | `prima_nota` | ✅ |
| 9 | Prima Nota Salari | `PrimaNotaSalari.jsx` | `/api/prima-nota-salari/*` | `prima_nota_salari` | ✅ |
| 10 | Prima Nota Unificata | `PrimaNotaUnificata.jsx` | `/api/prima-nota/*` | `prima_nota` | ✅ |
| 11 | Bilancio | `Bilancio.jsx` | `/api/bilancio/*` | `bilancio` | ✅ |
| 12 | Piano dei Conti | `PianoDeiConti.jsx` | `/api/piano-conti/*` | `piano_conti` | ✅ |
| 13 | Centri Costo | `CentriCosto.jsx` | `/api/centri-costo/*` | `centri_costo` | ✅ |
| 14 | IVA | `IVA.jsx` | `/api/iva/*` | `iva_registri` | ✅ |
| 15 | Liquidazione IVA | `LiquidazioneIVA.jsx` | `/api/liquidazione-iva/*` | `liquidazione_iva` | ✅ |
| 16 | Chiusura Esercizio | `ChiusuraEsercizio.jsx` | `/api/chiusura-esercizio/*` | `chiusura_esercizio` | ✅ |
| 17 | Contabilità Avanzata | `ContabilitaAvanzata.jsx` | `/api/contabilita-avanzata/*` | Multiple | ✅ |
| 18 | Regole Contabili | `RegoleContabili.jsx` | `/api/regole-contabili/*` | `regole_contabili` | ✅ |
| 19 | Regole Categorizzazione | `RegoleCategorizzazione.jsx` | `/api/regole-categorizzazione/*` | `regole_categorizzazione` | ✅ |

### SEZIONE: FATTURE E FORNITORI (8 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 20 | Archivio Fatture | `ArchivioFattureRicevute.jsx` | `/api/invoices/*` | `invoices` | ✅ |
| 21 | Fornitori | `Fornitori.jsx` | `/api/suppliers/*` | `suppliers` | ✅ |
| 22 | Ciclo Passivo | `CicloPassivoIntegrato.jsx` | `/api/ciclo-passivo/*` | `invoices`, `suppliers` | ✅ |
| 23 | Scadenzario | `Scadenze.jsx` | `/api/scadenze/*` | `scadenze` | ✅ |
| 24 | Ordini Fornitori | `OrdiniFornitori.jsx` | `/api/ordini-fornitori/*` | `ordini_fornitori` | ✅ |
| 25 | Previsioni Acquisti | `PrevisioniAcquisti.jsx` | `/api/previsioni/*` | `previsioni` | ✅ |
| 26 | InvoiceTronic | `GestioneInvoiceTronic.jsx` | `/api/invoicetronic/*` | `invoices` | ✅ |
| 27 | PagoPA | `GestionePagoPA.jsx` | `/api/pagopa/*` | `pagopa` | ✅ |

### SEZIONE: F24 E TRIBUTI (4 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 28 | F24 | `F24.jsx` | `/api/f24/*` | `f24_commercialista` | ✅ |
| 29 | Riconciliazione F24 | `RiconciliazioneF24.jsx` | `/api/f24-riconciliazione/*` | `f24_commercialista`, `quietanze_f24` | ✅ |
| 30 | Codici Tributari | `CodiciTributari.jsx` | `/api/codici-tributari/*` | `codici_tributari` | ✅ |
| 31 | Quietanze F24 | (in F24.jsx) | `/api/quietanze-f24/*` | `quietanze_f24` | ✅ |

### SEZIONE: BANCA (7 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 32 | Riconciliazione | `Riconciliazione.jsx` | `/api/bank/reconciliation/*` | `estratto_conto_movimenti` | ✅ |
| 33 | Riconciliazione Unificata | `RiconciliazioneUnificata.jsx` | `/api/riconciliazione/*` | `riconciliazione` | ✅ |
| 34 | Riconciliazione Intelligente | `RiconciliazioneIntelligente.jsx` | `/api/riconciliazione-intelligente/*` | Multiple | ✅ |
| 35 | Archivio Bonifici | `ArchivioBonifici.jsx` | `/api/bonifici/*` | `bonifici_transfers` | ✅ |
| 36 | Gestione Assegni | `GestioneAssegni.jsx` | `/api/bank/assegni/*` | `assegni` | ✅ |
| 37 | Import Estratto Conto | `ImportEstrattoConto.jsx` | `/api/bank/import/*` | `estratto_conto_*` | ✅ |
| 38 | Saldi Banca | `SaldiBanca.jsx` | `/api/bank/saldi/*` | `saldi_banca` | ✅ |

### SEZIONE: DIPENDENTI (8 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 39 | Gestione Dipendenti | `GestioneDipendentiUnificata.jsx` | `/api/dipendenti/*` | `employees` | ✅ |
| 40 | Cedolini | `Cedolini.jsx` | `/api/cedolini/*` | `riepilogo_cedolini` | ✅ |
| 41 | Cedolini Riconciliazione | `CedoliniRiconciliazione.jsx` | `/api/cedolini-riconciliazione/*` | `riepilogo_cedolini` | ✅ |
| 42 | TFR | `TFR.jsx` | `/api/tfr/*` | `tfr` | ✅ |
| 43 | Presenze | `Attendance.jsx` | `/api/attendance/*` | `attendance` | ✅ |
| 44 | Contratti | `Contratti.jsx` | `/api/employees/contracts/*` | `employee_contracts` | ✅ |
| 45 | Bonifici Stipendi | `BonificiStipendi.jsx` | `/api/bonifici-stipendi/*` | `bonifici_stipendi` | ✅ |
| 46 | Anagrafica Dipendenti | `AnagraficaDipendenti.jsx` | `/api/dipendenti/anagrafica/*` | `employees` | ✅ |

### SEZIONE: MAGAZZINO (10 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 47 | Magazzino | `Magazzino.jsx` | `/api/magazzino/*` | `warehouse_products` | ✅ |
| 48 | Magazzino Doppia Verità | `MagazzinoDoppiaVerita.jsx` | `/api/magazzino-doppia-verita/*` | `warehouse_products` | ✅ |
| 49 | Inventario | `Inventario.jsx` | `/api/inventario/*` | `warehouse_inventory` | ✅ |
| 50 | Dizionario Prodotti | `DizionarioProdotti.jsx` | `/api/dizionario-prodotti/*` | `dizionario_prodotti` | ✅ |
| 51 | Dizionario Articoli | `DizionarioArticoli.jsx` | `/api/dizionario-articoli/*` | `dizionario_articoli` | ✅ |
| 52 | Ricette | `Ricette.jsx` | `/api/ricette/*` | `ricette` | ✅ |
| 53 | Ricerca Prodotti | `RicercaProdotti.jsx` | `/api/warehouse/products/*` | `warehouse_products` | ✅ |
| 54 | Movimenti Magazzino | `MovimentiMagazzino.jsx` | `/api/warehouse/movements/*` | `warehouse_movements` | ✅ |
| 55 | Lotti | `RegistroLotti.jsx` | `/api/lotti/*` | `lotti` | ✅ |
| 56 | Ordini | `Ordini.jsx` | `/api/orders/*` | `orders` | ✅ |

### SEZIONE: HACCP (5 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 57 | HACCP Lotti | `HACCPLotti.jsx` | `/api/haccp/lotti/*` | `haccp_lotti` | ✅ |
| 58 | HACCP Ricezione | `HACCPRicezione.jsx` | `/api/haccp/ricezione/*` | `haccp_ricezione` | ✅ |
| 59 | HACCP Sanificazioni | `HACCPSanificazioni.jsx` | `/api/haccp/sanificazioni/*` | `haccp_sanificazioni` | ✅ |
| 60 | HACCP Scadenze | `HACCPScadenze.jsx` | `/api/haccp/scadenze/*` | `haccp_scadenze` | ✅ |
| 61 | HACCP Temperature | `HACCPTemperature.jsx` | `/api/haccp/temperature/*` | `haccp_temperature` | ✅ |

### SEZIONE: ALTRO (6 pagine)
| # | Pagina | File Frontend | Endpoint Backend | Collezione | Stato MongoDB |
|---|--------|--------------|------------------|------------|---------------|
| 62 | Dashboard | `Dashboard.jsx` | `/api/dashboard/*` | Multiple | ✅ |
| 63 | Dashboard Analytics | `DashboardAnalytics.jsx` | `/api/analytics/*` | Multiple | ✅ |
| 64 | Admin | `Admin.jsx` | `/api/admin/*` | `admin` | ✅ |
| 65 | ToDo | `ToDo.jsx` | `/api/todo/*` | `todo` | ✅ |
| 66 | Inserimento Rapido | `InserimentoRapido.jsx` | `/api/inserimento-rapido/*` | Multiple | ✅ |
| 67 | Settings | `Settings.jsx` | `/api/settings/*` | `settings` | ✅ |

---

## 🔍 RICERCA GLOBALE

| Componente | Endpoint | Stato |
|------------|----------|-------|
| `GlobalSearch.jsx` | `/api/ricerca-globale` | ✅ FUNZIONANTE |

### Collezioni cercate:
- ✅ `invoices` (fatture)
- ✅ `suppliers` (fornitori)
- ✅ `warehouse_products` (prodotti)
- ✅ `employees` (dipendenti)

---

## 📦 COLLEZIONI MONGODB CON PDF_DATA

| Collezione | Campo PDF | Note |
|------------|-----------|------|
| `documents_inbox` | `pdf_data` | Documenti generici |
| `documenti_non_associati` | `pdf_data` | Documenti da associare |
| `f24_commercialista` | `pdf_data` | F24 da commercialista |
| `f24_documents` | `pdf_data` | F24 importati |
| `f24_models` | `pdf_data` | Modelli F24 |
| `quietanze_f24` | `pdf_data` | Quietanze pagamento |
| `riepilogo_cedolini` | `pdf_data` | Cedolini dipendenti |
| `cedolini_email_attachments` | `pdf_data` | Cedolini da email |
| `employee_contracts` | `file_data` | Contratti generati |
| `bonifici_transfers` | `pdf_data` | Distinte bonifici |
| `documents_classified` | `pdf_data` | Documenti classificati AI |
| `estratto_conto_nexi` | `pdf_data` | Estratti Nexi |
| `estratto_conto_bnl` | `pdf_data` | Estratti BNL |

---

## 📋 PATTERN DI CODICE

### Upload/Salvataggio PDF (MongoDB-only)
```python
import base64

# Lettura e codifica
content = await file.read()
pdf_base64 = base64.b64encode(content).decode('utf-8')

# Salvataggio
doc = {
    "id": str(uuid.uuid4()),
    "filename": file.filename,
    "pdf_data": pdf_base64,  # Architettura MongoDB-only
    ...
}
await db["collection"].insert_one(doc.copy())
```

### Download PDF (MongoDB-only)
```python
import base64
from fastapi.responses import Response

doc = await db["collection"].find_one({"id": doc_id}, {"_id": 0})
if not doc or not doc.get("pdf_data"):
    raise HTTPException(404, "PDF non disponibile in MongoDB")

content = base64.b64decode(doc["pdf_data"])
return Response(
    content=content,
    media_type="application/pdf",
    headers={"Content-Disposition": f'attachment; filename="{doc["filename"]}"'}
)
```

### Parsing PDF con bytes (MongoDB-only)
```python
# Parser che supportano bytes
from app.services.parser_f24 import parse_f24_commercialista
from app.services.f24_parser import parse_quietanza_f24

# Usa pdf_content (bytes) invece di pdf_path
parsed = parse_f24_commercialista(pdf_content=pdf_bytes)
parsed = parse_quietanza_f24(pdf_content=pdf_bytes)
```

---

*Documento generato automaticamente - Dicembre 2025*
*Totale pagine: 67 | File rifattorizzati: 14 | Collezioni con pdf_data: 13*
