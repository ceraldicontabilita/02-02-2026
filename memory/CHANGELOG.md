# CHANGELOG – TechRecon Accounting System
## Storico Modifiche

---

## 22 Gennaio 2026 - Sessione 12 (Learning Machine & Gestione Magazzino)

### ✅ Learning Machine - Classificazione Automatica Costi (CDC)
Implementato sistema completo di classificazione automatica delle fatture per centro di costo:

**Servizio `/app/app/services/learning_machine_cdc.py`:**
- 38 centri di costo configurati per bar/pasticceria (ATECO 56.10.30)
- Pattern matching intelligente su fornitore e descrizione linee fattura
- Calcolo automatico deducibilità IRES/IRAP e detraibilità IVA

**Router `/app/app/routers/learning_machine_cdc.py`:**
- `GET /api/learning-machine/centri-costo` - Lista centri di costo
- `POST /api/learning-machine/riclassifica-fatture?anno=X` - Riclassifica automatica tutte le fatture
- `POST /api/learning-machine/processa-quietanza-f24` - Processa F24 con riconciliazione banca
- `GET /api/learning-machine/costo-personale-completo/{anno}` - Costo personale da cedolini + F24
- `GET /api/learning-machine/riepilogo-centri-costo/{anno}` - Riepilogo con calcoli fiscali

### ✅ Gestione Magazzino Avanzata
Implementato sistema completo per bar/pasticceria:

**Servizio `/app/app/services/magazzino_categorie.py`:**
- 26 categorie merceologiche specifiche (Caffè, Vini, Farine, Latticini, ecc.)
- Parsing intelligente linee fattura XML
- Estrazione automatica quantità e unità di misura
- Classificazione prodotti con confidence score
- Calcolo scarichi ricetta proporzionali alle porzioni

**Router `/app/app/routers/magazzino_avanzato.py`:**
- `POST /api/magazzino/carico-da-fattura/{id}` - Carico automatico da XML fattura
- `POST /api/magazzino/carico-massivo?anno=X` - Carico batch tutte le fatture
- `POST /api/magazzino/scarico-produzione` - Scarico per lotto produzione
- `GET /api/magazzino/giacenze` - Giacenze raggruppate per categoria
- `GET /api/magazzino/movimenti` - Storico movimenti
- `GET /api/magazzino/lotti-produzione` - Registro lotti
- `GET /api/magazzino/categorie-merceologiche` - Lista categorie

### ✅ Bug Fix
- Fix TypeError in `calcola_scarico_ricetta`: gestione quantità come stringa/numero

### ✅ Test E2E Eseguiti
- ✅ Carico magazzino da fattura XML (14 linee processate)
- ✅ Scarico produzione con calcolo ingredienti proporzionale
- ✅ Registrazione movimenti e lotti
- ✅ Riepilogo centri di costo (24 centri, €524.867 imponibile)

---

## 22 Gennaio 2026 - Sessione 11 (Conto Economico COMPLETO)

### ✅ Conto Economico Dettagliato (Art. 2425 c.c.)
Implementato endpoint `/api/bilancio/conto-economico-dettagliato` con:

**Classificazione automatica costi per natura:**
- B6 - Materie prime e merci (riconosciute automaticamente)
- B7 - Servizi (energia, acqua, telefonia, consulenze, manutenzioni, assicurazioni)
- B7 - Auto aziendali (carburante, manutenzione)
- B8 - Godimento beni terzi (affitti, noleggio auto, leasing)
- B9 - Costo del personale (dai cedolini: stipendi, INPS, TFR)
- C17 - Oneri finanziari (commissioni bancarie, interessi mutui)

**Regole fiscali implementate:**
| Voce | Deducibilità | IVA |
|------|--------------|-----|
| Telefonia | 80% | 50% |
| Noleggio auto | 20% su max €3.615/anno | 40% |
| Carburante | 20% | 40% |
| Interessi mutui | Limite ROL 30% | - |

**Calcolo automatico:**
- Costi indeducibili (telefonia 20%, noleggio 80%, carburante 80%)
- Reddito fiscale stimato

### ✅ Servizio Classificazione Costi
Creato `/app/app/services/classificazione_costi.py`:
- Pattern matching per riconoscimento fornitori
- Funzione `classifica_fornitore()` per assegnazione automatica categoria
- Funzione `calcola_deducibilita()` per regole fiscali

### ✅ Documentazione Completa
Aggiornato `/app/app/REGOLE_CONTABILI.md` con tutte le voci del piano dei conti

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
