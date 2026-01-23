# CHECKLIST AUDIT ARCHITETTURA MONGODB-ONLY

**Data**: Dicembre 2025
**Obiettivo**: Tutti i dati (inclusi PDF) devono essere salvati SOLO su MongoDB Atlas come Base64.

---

## 📊 RIEPILOGO AUDIT

### ✅ FILE COMPLETAMENTE RIFATTORIZZATI (0 riferimenti filepath)

| File | Stato | Modifiche Applicate |
|------|-------|---------------------|
| `/app/app/services/cedolini_manager.py` | ✅ COMPLETATO | `filepath` → `pdf_data` (Base64) |
| `/app/app/services/email_monitor_service.py` | ✅ COMPLETATO | Usa `pdf_data` per elaborazione documenti |
| `/app/app/routers/documenti_module/crud.py` | ✅ COMPLETATO | Download/elimina solo da MongoDB |
| `/app/app/services/parser_f24.py` | ✅ COMPLETATO | Supporta sia `pdf_path` che `pdf_content` bytes |
| `/app/app/routers/f24/f24_main.py` | ✅ COMPLETATO | Upload/download usa `pdf_data`, eliminazione solo MongoDB |
| `/app/app/services/f24_parser.py` | ✅ COMPLETATO | Parser con supporto bytes |
| `/app/app/routers/quietanze_f24.py` | ✅ COMPLETATO | Download/elimina solo MongoDB |

### 🔶 FILE PARZIALMENTE RIFATTORIZZATI

| File | Riferimenti filepath | Note |
|------|---------------------|------|
| `/app/app/routers/documenti.py` | 19 | Endpoint principali OK, restano funzioni di migrazione legacy |
| `/app/app/routers/employees/employee_contracts.py` | 9 | Generazione contratti usa template locali (necessario), salva anche `file_data` in MongoDB |
| `/app/app/services/email_full_download.py` | 30 | Funzioni di migrazione/retrocompatibilità |
| `/app/app/services/email_document_downloader.py` | 3 | Funzioni di migrazione |

### ⚠️ FILE DA COMPLETARE

| File | Riferimenti | Priorità | Azione Richiesta |
|------|-------------|----------|------------------|
| `/app/app/services/email_full_download.py` | 30 | P1 | Rimuovere logiche filesystem legacy |
| `/app/app/routers/bonifici_module/jobs.py` | filesystem | P2 | Usare `pdf_data` |
| `/app/app/routers/employees/dipendenti.py` | filesystem | P2 | Report PDF in memoria |
| `/app/app/services/liquidazione_iva.py` | filesystem | P2 | Generare PDF in memoria |
| `/app/app/routers/documenti.py` | 19 (legacy) | P3 | Endpoint di migrazione - bassa priorità |

---

## 📄 PAGINE FRONTEND E LORO ENDPOINT

### SEZIONE: DOCUMENTI E FILE

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Documenti | `Documenti.jsx` | `/api/documenti/*` | ✅ OK |
| Documenti Non Associati | `DocumentiNonAssociati.jsx` | `/api/non-associati/*` | ✅ OK |
| Email Download | `EmailDownloadManager.jsx` | `/api/email-download/*` | ✅ OK |
| Classificazione Documenti | `ClassificazioneDocumenti.jsx` | `/api/documenti-intelligenti/*` | ⚠️ Verificare |
| Import Unificato | `ImportUnificato.jsx` | `/api/import/*` | ⚠️ Verificare |

### SEZIONE: CONTABILITÀ

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Prima Nota | `PrimaNota.jsx` | `/api/prima-nota/*` | ✅ OK |
| Prima Nota Salari | `PrimaNotaSalari.jsx` | `/api/prima-nota-salari/*` | ✅ OK |
| Prima Nota Unificata | `PrimaNotaUnificata.jsx` | `/api/prima-nota/*` | ✅ OK |
| Bilancio | `Bilancio.jsx` | `/api/bilancio/*` | ✅ OK |
| Piano dei Conti | `PianoDeiConti.jsx` | `/api/piano-conti/*` | ✅ OK |
| Centri Costo | `CentriCosto.jsx` | `/api/centri-costo/*` | ✅ OK |
| IVA | `IVA.jsx` | `/api/iva/*` | ✅ OK |
| Liquidazione IVA | `LiquidazioneIVA.jsx` | `/api/liquidazione-iva/*` | ⚠️ PDF locale |
| Chiusura Esercizio | `ChiusuraEsercizio.jsx` | `/api/chiusura-esercizio/*` | ✅ OK |
| Contabilità Avanzata | `ContabilitaAvanzata.jsx` | `/api/contabilita-avanzata/*` | ✅ OK |

### SEZIONE: FATTURE E FORNITORI

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Archivio Fatture | `ArchivioFattureRicevute.jsx` | `/api/invoices/*` | ✅ OK |
| Fornitori | `Fornitori.jsx` | `/api/suppliers/*` | ✅ OK |
| Ciclo Passivo | `CicloPassivoIntegrato.jsx` | `/api/ciclo-passivo/*` | ✅ OK |
| Scadenzario | `Scadenze.jsx` | `/api/scadenze/*` | ✅ OK |
| Ordini Fornitori | `OrdiniFornitori.jsx` | `/api/ordini-fornitori/*` | ✅ OK |
| Previsioni Acquisti | `PrevisioniAcquisti.jsx` | `/api/previsioni/*` | ✅ OK |

### SEZIONE: F24 E TRIBUTI

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| F24 | `F24.jsx` | `/api/f24/*` | ⚠️ Download da verificare |
| Riconciliazione F24 | `RiconciliazioneF24.jsx` | `/api/f24-riconciliazione/*` | ✅ OK |
| Codici Tributari | `CodiciTributari.jsx` | `/api/codici-tributari/*` | ✅ OK |

### SEZIONE: BANCA

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Riconciliazione | `Riconciliazione.jsx` | `/api/bank/reconciliation/*` | ✅ OK |
| Riconciliazione Unificata | `RiconciliazioneUnificata.jsx` | `/api/riconciliazione/*` | ✅ OK |
| Riconciliazione Intelligente | `RiconciliazioneIntelligente.jsx` | `/api/riconciliazione-intelligente/*` | ✅ OK |
| Archivio Bonifici | `ArchivioBonifici.jsx` | `/api/bonifici/*` | ⚠️ PDF da verificare |
| Gestione Assegni | `GestioneAssegni.jsx` | `/api/bank/assegni/*` | ✅ OK |

### SEZIONE: DIPENDENTI

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Gestione Dipendenti | `GestioneDipendentiUnificata.jsx` | `/api/dipendenti/*` | ⚠️ Report PDF |
| Cedolini | `Cedolini.jsx` | `/api/cedolini/*` | ✅ OK |
| Cedolini Riconciliazione | `CedoliniRiconciliazione.jsx` | `/api/cedolini-riconciliazione/*` | ✅ OK |
| TFR | `TFR.jsx` | `/api/tfr/*` | ⚠️ Verificare |
| Presenze | `Attendance.jsx` | `/api/attendance/*` | ✅ OK |

### SEZIONE: MAGAZZINO

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Magazzino | `Magazzino.jsx` | `/api/magazzino/*` | ✅ OK |
| Magazzino Doppia Verità | `MagazzinoDoppiaVerita.jsx` | `/api/magazzino-doppia-verita/*` | ✅ OK |
| Inventario | `Inventario.jsx` | `/api/inventario/*` | ✅ OK |
| Dizionario Prodotti | `DizionarioProdotti.jsx` | `/api/dizionario-prodotti/*` | ✅ OK |
| Dizionario Articoli | `DizionarioArticoli.jsx` | `/api/dizionario-articoli/*` | ✅ OK |
| Ricette | `Ricette.jsx` | `/api/ricette/*` | ✅ OK |
| Ricerca Prodotti | `RicercaProdotti.jsx` | `/api/warehouse/products/*` | ✅ OK |

### SEZIONE: HACCP

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| HACCP Lotti | `HACCPLotti.jsx` | `/api/haccp/lotti/*` | ✅ OK |
| HACCP Ricezione | `HACCPRicezione.jsx` | `/api/haccp/ricezione/*` | ✅ OK |
| HACCP Sanificazioni | `HACCPSanificazioni.jsx` | `/api/haccp/sanificazioni/*` | ✅ OK |
| HACCP Scadenze | `HACCPScadenze.jsx` | `/api/haccp/scadenze/*` | ✅ OK |
| HACCP Temperature | `HACCPTemperature.jsx` | `/api/haccp/temperature/*` | ✅ OK |
| Registro Lotti | `RegistroLotti.jsx` | `/api/lotti/*` | ✅ OK |

### SEZIONE: ALTRO

| Pagina | File Frontend | Endpoint Backend | Stato MongoDB |
|--------|--------------|------------------|---------------|
| Dashboard | `Dashboard.jsx` | `/api/dashboard/*` | ✅ OK |
| Dashboard Analytics | `DashboardAnalytics.jsx` | `/api/analytics/*` | ✅ OK |
| Admin | `Admin.jsx` | `/api/admin/*` | ✅ OK |
| ToDo | `ToDo.jsx` | `/api/todo/*` | ✅ OK |
| Inserimento Rapido | `InserimentoRapido.jsx` | `/api/inserimento-rapido/*` | ✅ OK |
| Commercialista | `Commercialista.jsx` | `/api/commercialista/*` | ⚠️ Verificare |
| Finanziaria | `Finanziaria.jsx` | `/api/finanziaria/*` | ✅ OK |
| Noleggio Auto | `NoleggioAuto.jsx` | `/api/noleggio/*` | ✅ OK |
| Pianificazione | `Pianificazione.jsx` | `/api/pianificazione/*` | ✅ OK |
| Verbali Riconciliazione | `VerbaliRiconciliazione.jsx` | `/api/verbali/*` | ✅ OK |
| Verifica Coerenza | `VerificaCoerenza.jsx` | `/api/verifica-coerenza/*` | ✅ OK |
| Controllo Mensile | `ControlloMensile.jsx` | `/api/controllo/*` | ✅ OK |
| Utile Obiettivo | `UtileObiettivo.jsx` | `/api/utile-obiettivo/*` | ✅ OK |
| Regole Contabili | `RegoleContabili.jsx` | `/api/regole-contabili/*` | ✅ OK |
| Regole Categorizzazione | `RegoleCategorizzazione.jsx` | `/api/regole-categorizzazione/*` | ✅ OK |
| Gestione Cespiti | `GestioneCespiti.jsx` | `/api/cespiti/*` | ✅ OK |
| Corrispettivi | `Corrispettivi.jsx` | `/api/corrispettivi/*` | ✅ OK |
| InvoiceTronic | `GestioneInvoiceTronic.jsx` | `/api/invoicetronic/*` | ✅ OK |
| PagoPA | `GestionePagoPA.jsx` | `/api/pagopa/*` | ✅ OK |
| Gestione Riservata | `GestioneRiservata.jsx` | `/api/gestione-riservata/*` | ✅ OK |

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

## 📦 COLLEZIONI MONGODB PRINCIPALI

| Collezione | Usata da | Stato |
|------------|----------|-------|
| `invoices` | Fatture, Riconciliazione | ✅ OK |
| `suppliers` | Fornitori, Ciclo Passivo | ✅ OK |
| `employees` | Dipendenti, Cedolini | ✅ OK |
| `warehouse_products` | Magazzino, Inventario | ✅ OK |
| `warehouse_inventory` | Giacenze | ✅ OK |
| `warehouse_movements` | Movimenti | ✅ OK |
| `f24_commercialista` | F24 | ✅ OK - usa `pdf_data` |
| `cedolini_email_attachments` | Cedolini Email | ✅ OK - usa `pdf_data` |
| `documents_inbox` | Documenti | ✅ OK - usa `pdf_data` |
| `documenti_non_associati` | Associazione | ✅ OK - usa `pdf_data` |
| `prima_nota` | Prima Nota | ✅ OK |
| `prima_nota_salari` | Salari | ✅ OK |
| `estratto_conto_movimenti` | Banca | ✅ OK |
| `estratto_conto_nexi` | Nexi | ✅ OK |
| `estratto_conto_bnl` | BNL | ✅ OK |
| `riepilogo_cedolini` | Cedolini | ✅ OK |
| `quietanze_f24` | Quietanze | ⚠️ Verificare |
| `employee_contracts` | Contratti | ✅ OK - usa `file_data` |

---

## 🎯 AZIONI PRIORITARIE

### P0 - Critiche (Da completare subito)
- [x] `cedolini_manager.py` - Completato
- [x] `email_monitor_service.py` - Completato
- [x] `documenti_module/crud.py` - Completato
- [x] Endpoint download documenti - Completato
- [x] Parser F24 con supporto bytes - Completato

### P1 - Alta Priorità
- [ ] `f24_main.py` - Endpoint download F24 con `pdf_data`
- [ ] `quietanze.py` / `quietanze_f24.py` - Download quietanze
- [ ] `email_full_download.py` - Rimuovere logiche filesystem legacy
- [ ] `liquidazione_iva.py` - Generare PDF in memoria

### P2 - Media Priorità
- [ ] `dipendenti.py` - Report PDF in memoria
- [ ] `bonifici_module/jobs.py` - PDF bonifici
- [ ] `tfr.py` - Verificare generazione report
- [ ] `employees_payroll.py` - Verificare

### P3 - Bassa Priorità (Funzioni di migrazione)
- [ ] Endpoint `/reimporta-da-filesystem` - Deprecare
- [ ] Funzioni sync legacy in `documenti.py`

---

## 📋 NOTE TECNICHE

### Formato salvataggio PDF
```python
import base64

# Salvataggio
pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
await collection.insert_one({"pdf_data": pdf_base64, ...})

# Lettura
doc = await collection.find_one({"id": doc_id})
pdf_bytes = base64.b64decode(doc["pdf_data"])
```

### Pattern endpoint download MongoDB-only
```python
@router.get("/download/{doc_id}")
async def download_documento(doc_id: str):
    doc = await db["collection"].find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    pdf_data = doc.get("pdf_data")
    if not pdf_data:
        raise HTTPException(status_code=404, detail="PDF non disponibile in MongoDB")
    
    content = base64.b64decode(pdf_data)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.get("filename", "documento.pdf")}"'}
    )
```

---

*Documento generato automaticamente - Dicembre 2025*
