# CHANGELOG – TechRecon Accounting System
## Storico Modifiche

---

## 22 Gennaio 2026 - Sessione 11 (Logica Contabile DEFINITIVA)

### ✅ Documentazione Regole Contabili
- Creato `/app/app/REGOLE_CONTABILI.md` con documentazione completa
- Aggiunta intestazione dettagliata in `bilancio.py` e `liquidazione_iva.py`

### ✅ REGOLA CRITICA IMPLEMENTATA ⚠️
**Le fatture emesse a clienti NON sono ricavi aggiuntivi!**
- Quando un cliente chiede fattura dopo lo scontrino, l'importo è GIÀ nei corrispettivi
- NON sommare le fatture emesse ai ricavi (doppio conteggio!)
- NON calcolare IVA sulle fatture emesse (già versata con corrispettivi!)

### ✅ Struttura Database Documentata
- `corrispettivi`: UNICA fonte di RICAVI (vendite al pubblico)
- `invoices`: TUTTE fatture RICEVUTE (COSTI)
- Sistema NON multi-utente
- P.IVA azienda: 04523831214

### ✅ Calcoli Verificati 2025
| Voce | Valore |
|------|--------|
| Ricavi (Corrispettivi) | €857,515.42 |
| Costi (Fatture - NC) | €496,180.07 |
| **UTILE** | **€361,335.35** (42.1%) |
| IVA Vendite | €85,715.39 |
| IVA Acquisti | €82,202.56 |
| IVA Netta | €3,512.83 |

---

## 22 Gennaio 2026 - Sessione 10

### ✅ Sistema Notifiche Limiti Giustificativi
- Nuovo endpoint `GET /api/giustificativi/alert-limiti` per monitorare dipendenti vicini al limite
- Nuovo endpoint `GET /api/giustificativi/riepilogo-limiti` per dashboard
- Widget `AlertGiustificativiWidget` nella Dashboard
- Soglia configurabile (default 80%, warning a 90%, critical a 100%)
- Visualizza: dipendente, tipo giustificativo, ore usate/limite, percentuale

### ✅ Selezione Rapida Presenze
- Toolbar con pulsanti colorati per ogni stato (P, A, F, PE, M, R, SW, T)
- Click su stato → poi click multiplo su celle per applicare
- Cursore cambia a crosshair in modalità selezione
- Toast di conferma attivazione/disattivazione

### ✅ Generazione PDF per Consulente Lavoro
- Endpoint `POST /api/attendance/genera-pdf-consulente`
- PDF landscape A4 con:
  - Tabella presenze mensili per dipendente
  - Totali per tipo (P, F, M, PE)
  - Sezione protocolli certificati malattia
  - Acconti mensili (se presenti)
  - Legenda

### ✅ Sistema Certificati Medici
- Endpoint `POST /api/inps/scansiona-certificati-medici` - Scansiona email INPS
- Estrazione automatica: protocollo, codice fiscale, date malattia
- Associazione automatica dipendente tramite codice fiscale
- Salvataggio PDF allegato
- Aggiornamento automatico note presenze con protocollo

### ✅ Documentazione
- Ricostruito PRD.md da zero (~200 righe)
- Creato CHANGELOG.md separato
- Creato ROADMAP.md per backlog
- Creato README.md completo (~900 righe) con:
  - Architettura e diagrammi
  - Regole di business
  - Logica contabile (partita doppia)
  - Standard UI/UX
  - API Reference completa
  - Database schema
  - Flussi operativi
  - Guida sviluppo

---

## 22 Gennaio 2026 - Sessione 9

### ✅ Unificazione Pagine Documenti
- Unificate `/documenti`, `/regole-categorizzazione`, `/classificazione-email` in `ClassificazioneDocumenti.jsx`
- Navigazione a tab (Classificazione, Documenti, Regole)
- Aggiunto pulsante "Vedi PDF" con endpoint `/api/documenti-smart/documenti/{id}/pdf`
- Rotte legacy reindirizzano alla nuova pagina

### ✅ Fix Tab Giustificativi
- Ottimizzato endpoint da N+1 query a 2 aggregazioni MongoDB
- Tempo risposta: da timeout a ~0.7s

### ✅ Sistema Giustificativi Completo
- 26 codici standard italiani (FER, ROL, EXF, MAL, etc.)
- Validazione limiti annuali/mensili
- Tab "Giustificativi" in Gestione Dipendenti
- Tab "Saldo Ferie" in Attendance

### ✅ Riconciliazione Intelligente Fase 3
- Caso 36: Gestione Assegni Multipli
- Caso 37: Arrotondamenti Automatici (tolleranza €1-5)
- Caso 38: Pagamento Anticipato

### ✅ Flag "In Carico" Dipendenti
- Campo `in_carico: boolean` in anagrafica
- Toggle switch in UI
- Filtro automatico nelle presenze

---

## 21 Gennaio 2026 - Sessione 8

### ✅ Motore Contabile (Partita Doppia)
- Piano dei Conti italiano (27 conti)
- 15 regole contabili predefinite
- Validazione DARE = AVERE
- Persistenza scritture

### ✅ Sistema Attendance (Presenze)
- Timbrature (entrata, uscita, pause)
- Ferie, permessi, malattia
- Dashboard presenze giornaliere
- Approvazione richieste

### ✅ Riconciliazione Intelligente (Casi 19-35)
- Pagamento parziale
- Note di credito
- Bonifico cumulativo
- Sconto cassa

---

## 20 Gennaio 2026 - Sessioni 5-7

### ✅ Riconciliazione Intelligente Base
- Stati: `in_attesa_conferma`, `confermata_cassa`, `confermata_banca`, `riconciliata`
- Dashboard operazioni
- Lock manuale

### ✅ Classificazione Email Intelligente
- 10 regole predefinite
- Associazione automatica ai moduli
- Scansione IMAP

### ✅ Document AI
- OCR + LLM (Claude Sonnet 4.5)
- Estrazione dati da PDF
- Supporto F24, buste paga, fatture

### ✅ Performance
- Ottimizzazione `/api/suppliers`: da 5s a 0.07s (cache)
- Ottimizzazione `/api/fatture-ricevute/archivio`: da 29s a 2.6s
- Ottimizzazione `/api/f24-public/models`: ~0.25s

### ✅ UI/UX
- Uniformazione header gradiente blu navy
- Pagine auto-sufficienti (self-healing)
- Pulsanti manutenzione in Admin

---

## 19 Gennaio 2026 - Sessioni 1-4

### ✅ Sistema Completo Verbali Noleggio
- Scansione fatture noleggiatori
- 19 verbali estratti
- Riconciliazione automatica

### ✅ Scanner Email Completo
- 218+ documenti scaricati
- Classificazione automatica cartelle

### ✅ Bonifici Stipendi
- 736 bonifici estratti da email
- 522 associati a dipendenti

### ✅ Pulizia Dati
- 83 fatture duplicate eliminate
- 171 assegni vuoti eliminati
- 82 TD24 marcate non riconciliabili

---

## 18 Gennaio 2026

### ✅ Auto-conferma Assegni
- Match esatto importo = auto-conferma

### ✅ Unificazione Collection Fornitori
- 263 fornitori consolidati

### ✅ Logica TD24
- Fatture differite escluse da riconciliazione

### ✅ Correzione Numeri Assegni
- 205 numeri corretti (da CRA a NUM reale)

---

*Ultimo aggiornamento: 22 Gennaio 2026*
