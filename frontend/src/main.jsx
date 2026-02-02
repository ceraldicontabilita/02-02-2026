import React, { Suspense, lazy, Component } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./styles.css";
import { AnnoProvider } from "./contexts/AnnoContext.jsx";
import { queryClient } from "./lib/queryClient.js";
import { ConfirmProvider } from "./components/ui/ConfirmDialog.jsx";

// Build timestamp: 2026-01-18T19:10:00 - Force cache invalidation

// Error Boundary per gestire errori React
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          background: '#fef2f2', 
          borderRadius: 12,
          margin: 20,
          border: '1px solid #fca5a5'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: 16 }}>⚠️ Si è verificato un errore</h2>
          <p style={{ color: '#7f1d1d', marginBottom: 20 }}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🔄 Ricarica Pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component for Suspense fallback
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    flexDirection: 'column',
    gap: 16
  }}>
    <div style={{
      width: 48,
      height: 48,
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <span style={{ color: '#64748b', fontSize: 14 }}>Caricamento...</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Lazy load all pages for code splitting
// === CORE ===
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const DashboardAnalytics = lazy(() => import("./pages/DashboardAnalytics.jsx"));
const InserimentoRapido = lazy(() => import("./pages/InserimentoRapido.jsx"));

// === FATTURE & ACQUISTI ===
const ArchivioFattureRicevute = lazy(() => import("./pages/ArchivioFattureRicevute.jsx"));
const Corrispettivi = lazy(() => import("./pages/Corrispettivi.jsx"));
// CicloPassivoIntegrato è stato unificato in ArchivioFattureRicevute
// const CicloPassivoIntegrato = lazy(() => import("./pages/CicloPassivoIntegrato.jsx"));
const Fornitori = lazy(() => import("./pages/Fornitori.jsx"));
const OrdiniFornitori = lazy(() => import("./pages/OrdiniFornitori.jsx"));
const PrevisioniAcquisti = lazy(() => import("./pages/PrevisioniAcquisti.jsx"));
const Visure = lazy(() => import("./pages/Visure.jsx"));

// === BANCA & PAGAMENTI ===
const PrimaNota = lazy(() => import("./pages/PrimaNota.jsx"));
const RiconciliazioneUnificata = lazy(() => import("./pages/RiconciliazioneUnificata.jsx"));
const RiconciliazionePaypal = lazy(() => import("./pages/RiconciliazionePaypal.jsx"));
const GestioneAssegni = lazy(() => import("./pages/GestioneAssegni.jsx"));
const ArchivioBonifici = lazy(() => import("./pages/ArchivioBonifici.jsx"));

// === DIPENDENTI ===
const GestioneDipendentiUnificata = lazy(() => import("./pages/GestioneDipendentiUnificata.jsx"));
const Cedolini = lazy(() => import("./pages/Cedolini.jsx"));
const CedoliniRiconciliazione = lazy(() => import("./pages/CedoliniRiconciliazione.jsx"));
const PrimaNotaSalari = lazy(() => import("./pages/PrimaNotaSalari.jsx"));
const TFR = lazy(() => import("./pages/TFR.jsx"));
const NoleggioAuto = lazy(() => import("./pages/NoleggioAuto.jsx"));
const DettaglioVerbale = lazy(() => import("./pages/DettaglioVerbale.jsx"));
const VerbaliRiconciliazione = lazy(() => import("./pages/VerbaliRiconciliazione.jsx"));

// === FISCO & TRIBUTI ===
const IVA = lazy(() => import("./pages/IVA.jsx"));
const LiquidazioneIVA = lazy(() => import("./pages/LiquidazioneIVA.jsx"));
const F24 = lazy(() => import("./pages/F24.jsx"));
const RiconciliazioneF24 = lazy(() => import("./pages/RiconciliazioneF24.jsx"));
const ContabilitaAvanzata = lazy(() => import("./pages/ContabilitaAvanzata.jsx"));
const Scadenze = lazy(() => import("./pages/Scadenze.jsx"));
const CodiciTributari = lazy(() => import("./pages/CodiciTributari.jsx"));

// === INTEGRAZIONI ===
const IntegrazioniOpenAPI = lazy(() => import("./pages/IntegrazioniOpenAPI.jsx"));
const OdooIntegration = lazy(() => import("./pages/OdooIntegration.jsx"));

// === TO-DO ===
const ToDo = lazy(() => import("./pages/ToDo.jsx"));

// === ATTENDANCE ===
const Attendance = lazy(() => import("./pages/Attendance.jsx"));

// === MAGAZZINO ===
const Magazzino = lazy(() => import("./pages/Magazzino.jsx"));
const Inventario = lazy(() => import("./pages/Inventario.jsx"));
const RicercaProdotti = lazy(() => import("./pages/RicercaProdotti.jsx"));
const DizionarioArticoli = lazy(() => import("./pages/DizionarioArticoli.jsx"));
const MagazzinoDoppiaVerita = lazy(() => import("./pages/MagazzinoDoppiaVerita.jsx"));

// === HACCP ===
const HACCPTemperature = lazy(() => import("./pages/HACCPTemperature.jsx"));
const HACCPSanificazioni = lazy(() => import("./pages/HACCPSanificazioni.jsx"));
const HACCPLotti = lazy(() => import("./pages/HACCPLotti.jsx"));
const HACCPRicezione = lazy(() => import("./pages/HACCPRicezione.jsx"));
const HACCPScadenze = lazy(() => import("./pages/HACCPScadenze.jsx"));
const RegistroLotti = lazy(() => import("./pages/RegistroLotti.jsx"));

// === CUCINA & PRODUZIONE ===
const Ricette = lazy(() => import("./pages/Ricette.jsx"));
const DizionarioProdotti = lazy(() => import("./pages/DizionarioProdotti.jsx"));
const CentriCosto = lazy(() => import("./pages/CentriCosto.jsx"));
const UtileObiettivo = lazy(() => import("./pages/UtileObiettivo.jsx"));
// LearningMachineDashboard RIMOSSA - funzionalità duplicate in CentriCosto, Magazzino, Ricette

// === CONTABILITÀ & BILANCIO ===
const Bilancio = lazy(() => import("./pages/Bilancio.jsx"));
const ControlloMensile = lazy(() => import("./pages/ControlloMensile.jsx"));
const PianoDeiConti = lazy(() => import("./pages/PianoDeiConti.jsx"));
const GestioneCespiti = lazy(() => import("./pages/GestioneCespiti.jsx"));
const Finanziaria = lazy(() => import("./pages/Finanziaria.jsx"));
const ChiusuraEsercizio = lazy(() => import("./pages/ChiusuraEsercizio.jsx"));
const MotoreContabile = lazy(() => import("./pages/MotoreContabile.jsx"));
const CalendarioFiscale = lazy(() => import("./pages/CalendarioFiscale.jsx"));

// === DIPENDENTI ===
const SaldiFeriePermessi = lazy(() => import("./pages/SaldiFeriePermessi.jsx"));

// === STRUMENTI ===
const Documenti = lazy(() => import("./pages/Documenti.jsx"));
const ImportDocumenti = lazy(() => import("./pages/ImportDocumenti.jsx"));
const RegoleCategorizzazione = lazy(() => import("./pages/RegoleCategorizzazione.jsx"));
const VerificaCoerenza = lazy(() => import("./pages/VerificaCoerenza.jsx"));
const Commercialista = lazy(() => import("./pages/Commercialista.jsx"));
const Pianificazione = lazy(() => import("./pages/Pianificazione.jsx"));
const EmailDownloadManager = lazy(() => import("./pages/EmailDownloadManager.jsx"));

// === ADMIN ===
const Admin = lazy(() => import("./pages/Admin.jsx"));
const GestioneRiservata = lazy(() => import("./pages/GestioneRiservata.jsx"));
const RegoleContabili = lazy(() => import("./pages/RegoleContabili.jsx"));

// === INTEGRAZIONI ===
const GestionePagoPA = lazy(() => import("./pages/GestionePagoPA.jsx"));
const GestioneInvoiceTronic = lazy(() => import("./pages/GestioneInvoiceTronic.jsx"));
const ClassificazioneDocumenti = lazy(() => import("./pages/ClassificazioneDocumenti.jsx"));

// === AI TOOLS ===
const DocumentiDaRivedere = lazy(() => import("./pages/DocumentiDaRivedere.jsx"));
const CorrezioneAI = lazy(() => import("./pages/CorrezioneAI.jsx"));
const AssistenteAI = lazy(() => import("./pages/AssistenteAI.jsx"));

// Wrapper component with Suspense
const LazyPage = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  // Gestione Riservata standalone
  {
    path: "/gestione-riservata",
    element: <LazyPage><GestioneRiservata /></LazyPage>
  },
  {
    path: "/",
    element: <App />,
    children: [
      // === CORE ===
      { index: true, element: <LazyPage><Dashboard /></LazyPage> },
      { path: "dashboard", element: <LazyPage><Dashboard /></LazyPage> },
      { path: "dashboard/:anno", element: <LazyPage><Dashboard /></LazyPage> },
      { path: "analytics", element: <LazyPage><DashboardAnalytics /></LazyPage> },
      { path: "analytics/:periodo", element: <LazyPage><DashboardAnalytics /></LazyPage> },
      { path: "rapido", element: <LazyPage><InserimentoRapido /></LazyPage> },
      
      // === FATTURE & ACQUISTI ===
      { path: "ciclo-passivo", element: <LazyPage><ArchivioFattureRicevute /></LazyPage> },
      { path: "fatture-ricevute", element: <LazyPage><ArchivioFattureRicevute /></LazyPage> },
      { path: "fatture-ricevute/:fornitore", element: <LazyPage><ArchivioFattureRicevute /></LazyPage> },
      { path: "fatture-ricevute/:fornitore/:fattura", element: <LazyPage><ArchivioFattureRicevute /></LazyPage> },
      { path: "archivio-fatture-ricevute", element: <LazyPage><ArchivioFattureRicevute /></LazyPage> },
      { path: "corrispettivi", element: <LazyPage><Corrispettivi /></LazyPage> },
      { path: "corrispettivi/:anno/:mese", element: <LazyPage><Corrispettivi /></LazyPage> },
      { path: "fornitori", element: <LazyPage><Fornitori /></LazyPage> },
      { path: "fornitori/:nome", element: <LazyPage><Fornitori /></LazyPage> },
      { path: "fornitori/:nome/:tab", element: <LazyPage><Fornitori /></LazyPage> },
      { path: "ordini-fornitori", element: <LazyPage><OrdiniFornitori /></LazyPage> },
      { path: "ordini-fornitori/:fornitore", element: <LazyPage><OrdiniFornitori /></LazyPage> },
      { path: "previsioni-acquisti", element: <LazyPage><PrevisioniAcquisti /></LazyPage> },
      { path: "previsioni-acquisti/:categoria", element: <LazyPage><PrevisioniAcquisti /></LazyPage> },
      
      // === BANCA & PAGAMENTI ===
      { path: "prima-nota", element: <LazyPage><PrimaNota /></LazyPage> },
      { path: "prima-nota/:tipo", element: <LazyPage><PrimaNota /></LazyPage> },
      { path: "prima-nota/:tipo/:anno/:mese", element: <LazyPage><PrimaNota /></LazyPage> },
      { path: "riconciliazione", element: <LazyPage><RiconciliazioneUnificata /></LazyPage> },
      { path: "riconciliazione/:tab", element: <LazyPage><RiconciliazioneUnificata /></LazyPage> },
      { path: "riconciliazione/:tab/:id", element: <LazyPage><RiconciliazioneUnificata /></LazyPage> },
      { path: "riconciliazione-intelligente", element: <Navigate to="/riconciliazione" replace /> },
      { path: "riconciliazione-paypal", element: <LazyPage><RiconciliazionePaypal /></LazyPage> },
      { path: "gestione-assegni", element: <LazyPage><GestioneAssegni /></LazyPage> },
      { path: "gestione-assegni/:stato", element: <LazyPage><GestioneAssegni /></LazyPage> },
      { path: "archivio-bonifici", element: <LazyPage><ArchivioBonifici /></LazyPage> },
      { path: "archivio-bonifici/:tab", element: <LazyPage><ArchivioBonifici /></LazyPage> },
      { path: "archivio-bonifici/:anno/:mese", element: <LazyPage><ArchivioBonifici /></LazyPage> },
      
      // === DIPENDENTI ===
      { path: "dipendenti", element: <LazyPage><GestioneDipendentiUnificata /></LazyPage> },
      { path: "dipendenti/:tab", element: <LazyPage><GestioneDipendentiUnificata /></LazyPage> },
      { path: "dipendenti/:tab/:subtab", element: <LazyPage><GestioneDipendentiUnificata /></LazyPage> },
      { path: "dipendenti/:nome/:tab", element: <LazyPage><GestioneDipendentiUnificata /></LazyPage> },
      { path: "cedolini", element: <LazyPage><CedoliniRiconciliazione /></LazyPage> },
      { path: "cedolini/:anno", element: <LazyPage><CedoliniRiconciliazione /></LazyPage> },
      { path: "cedolini/:anno/:mese", element: <LazyPage><CedoliniRiconciliazione /></LazyPage> },
      { path: "cedolini/:nome/:dettaglio", element: <LazyPage><CedoliniRiconciliazione /></LazyPage> },
      { path: "cedolini-calcolo", element: <LazyPage><Cedolini /></LazyPage> },
      { path: "cedolini-calcolo/:nome/:dettaglio", element: <LazyPage><Cedolini /></LazyPage> },
      { path: "prima-nota-salari", element: <LazyPage><PrimaNotaSalari /></LazyPage> },
      { path: "prima-nota-salari/:anno/:mese", element: <LazyPage><PrimaNotaSalari /></LazyPage> },
      { path: "tfr", element: <LazyPage><TFR /></LazyPage> },
      { path: "tfr/:tab", element: <LazyPage><TFR /></LazyPage> },
      { path: "tfr/:dipendente", element: <LazyPage><TFR /></LazyPage> },
      { path: "noleggio-auto", element: <LazyPage><NoleggioAuto /></LazyPage> },
      { path: "noleggio-auto/:targa", element: <LazyPage><NoleggioAuto /></LazyPage> },
      { path: "verbali-noleggio/:numeroVerbale", element: <LazyPage><DettaglioVerbale /></LazyPage> },
      { path: "verbali-noleggio/:prefisso/:numero", element: <LazyPage><DettaglioVerbale /></LazyPage> },
      { path: "verbali-riconciliazione", element: <LazyPage><VerbaliRiconciliazione /></LazyPage> },
      { path: "verbali-riconciliazione/:verbaleId", element: <LazyPage><VerbaliRiconciliazione /></LazyPage> },
      
      // === FISCO & TRIBUTI ===
      { path: "iva", element: <LazyPage><IVA /></LazyPage> },
      { path: "iva/:anno/:trimestre", element: <LazyPage><IVA /></LazyPage> },
      { path: "liquidazione-iva", element: <LazyPage><LiquidazioneIVA /></LazyPage> },
      { path: "liquidazione-iva/:anno/:mese", element: <LazyPage><LiquidazioneIVA /></LazyPage> },
      { path: "f24", element: <LazyPage><F24 /></LazyPage> },
      { path: "f24/:anno", element: <LazyPage><F24 /></LazyPage> },
      { path: "f24/:anno/:mese", element: <LazyPage><F24 /></LazyPage> },
      { path: "riconciliazione-f24", element: <LazyPage><RiconciliazioneF24 /></LazyPage> },
      { path: "riconciliazione-f24/:anno", element: <LazyPage><RiconciliazioneF24 /></LazyPage> },
      { path: "codici-tributari", element: <LazyPage><CodiciTributari /></LazyPage> },
      { path: "codici-tributari/:codice", element: <LazyPage><CodiciTributari /></LazyPage> },
      { path: "contabilita", element: <LazyPage><ContabilitaAvanzata /></LazyPage> },
      { path: "contabilita/:sezione", element: <LazyPage><ContabilitaAvanzata /></LazyPage> },
      { path: "scadenze", element: <LazyPage><Scadenze /></LazyPage> },
      { path: "scadenze/:anno", element: <LazyPage><Scadenze /></LazyPage> },
      { path: "scadenze/:anno/:mese", element: <LazyPage><Scadenze /></LazyPage> },
      
      // === TO-DO ===
      { path: "todo", element: <LazyPage><ToDo /></LazyPage> },
      { path: "todo/:stato", element: <LazyPage><ToDo /></LazyPage> },
      
      // === ATTENDANCE ===
      { path: "attendance", element: <LazyPage><Attendance /></LazyPage> },
      { path: "attendance/:dipendente", element: <LazyPage><Attendance /></LazyPage> },
      { path: "attendance/:dipendente/:mese", element: <LazyPage><Attendance /></LazyPage> },
      
      // === MAGAZZINO ===
      { path: "magazzino", element: <LazyPage><Magazzino /></LazyPage> },
      { path: "magazzino/:tab", element: <LazyPage><Magazzino /></LazyPage> },
      { path: "magazzino/:categoria", element: <LazyPage><Magazzino /></LazyPage> },
      { path: "inventario", element: <LazyPage><Inventario /></LazyPage> },
      { path: "inventario/:data", element: <LazyPage><Inventario /></LazyPage> },
      { path: "ricerca-prodotti", element: <LazyPage><RicercaProdotti /></LazyPage> },
      { path: "ricerca-prodotti/:query", element: <LazyPage><RicercaProdotti /></LazyPage> },
      { path: "dizionario-articoli", element: <LazyPage><DizionarioArticoli /></LazyPage> },
      { path: "dizionario-articoli/:articolo", element: <LazyPage><DizionarioArticoli /></LazyPage> },
      { path: "magazzino-dv", element: <LazyPage><MagazzinoDoppiaVerita /></LazyPage> },
      
      // === HACCP ===
      { path: "haccp-temperature", element: <LazyPage><HACCPTemperature /></LazyPage> },
      { path: "haccp-temperature/:data", element: <LazyPage><HACCPTemperature /></LazyPage> },
      { path: "haccp-sanificazioni", element: <LazyPage><HACCPSanificazioni /></LazyPage> },
      { path: "haccp-sanificazioni/:data", element: <LazyPage><HACCPSanificazioni /></LazyPage> },
      { path: "haccp-lotti", element: <LazyPage><HACCPLotti /></LazyPage> },
      { path: "haccp-lotti/:lotto", element: <LazyPage><HACCPLotti /></LazyPage> },
      { path: "haccp-ricezione", element: <LazyPage><HACCPRicezione /></LazyPage> },
      { path: "haccp-ricezione/:fornitore", element: <LazyPage><HACCPRicezione /></LazyPage> },
      { path: "haccp-scadenze", element: <LazyPage><HACCPScadenze /></LazyPage> },
      { path: "haccp-scadenze/:stato", element: <LazyPage><HACCPScadenze /></LazyPage> },
      { path: "registro-lotti", element: <LazyPage><RegistroLotti /></LazyPage> },
      { path: "registro-lotti/:lotto", element: <LazyPage><RegistroLotti /></LazyPage> },
      
      // === CUCINA & PRODUZIONE ===
      { path: "ricette", element: <LazyPage><Ricette /></LazyPage> },
      { path: "ricette/:nome", element: <LazyPage><Ricette /></LazyPage> },
      { path: "dizionario-prodotti", element: <LazyPage><DizionarioProdotti /></LazyPage> },
      { path: "dizionario-prodotti/:prodotto", element: <LazyPage><DizionarioProdotti /></LazyPage> },
      { path: "centri-costo", element: <LazyPage><CentriCosto /></LazyPage> },
      { path: "centri-costo/:centro", element: <LazyPage><CentriCosto /></LazyPage> },
      { path: "utile-obiettivo", element: <LazyPage><UtileObiettivo /></LazyPage> },
      { path: "utile-obiettivo/:anno", element: <LazyPage><UtileObiettivo /></LazyPage> },
      { path: "learning-machine", element: <Navigate to="/centri-costo" replace /> },
      
      // === CONTABILITÀ & BILANCIO ===
      { path: "bilancio", element: <LazyPage><Bilancio /></LazyPage> },
      { path: "bilancio/:tab", element: <LazyPage><Bilancio /></LazyPage> },
      { path: "bilancio/:anno", element: <LazyPage><Bilancio /></LazyPage> },
      { path: "controllo-mensile", element: <LazyPage><ControlloMensile /></LazyPage> },
      { path: "controllo-mensile/:anno/:mese", element: <LazyPage><ControlloMensile /></LazyPage> },
      { path: "piano-dei-conti", element: <LazyPage><PianoDeiConti /></LazyPage> },
      { path: "piano-dei-conti/:tab", element: <LazyPage><PianoDeiConti /></LazyPage> },
      { path: "piano-dei-conti/:conto", element: <LazyPage><PianoDeiConti /></LazyPage> },
      { path: "cespiti", element: <LazyPage><GestioneCespiti /></LazyPage> },
      { path: "cespiti/:tab", element: <LazyPage><GestioneCespiti /></LazyPage> },
      { path: "cespiti/:cespite", element: <LazyPage><GestioneCespiti /></LazyPage> },
      { path: "finanziaria", element: <LazyPage><Finanziaria /></LazyPage> },
      { path: "finanziaria/:anno", element: <LazyPage><Finanziaria /></LazyPage> },
      { path: "chiusura-esercizio", element: <LazyPage><ChiusuraEsercizio /></LazyPage> },
      { path: "chiusura-esercizio/:anno", element: <LazyPage><ChiusuraEsercizio /></LazyPage> },
      { path: "motore-contabile", element: <LazyPage><MotoreContabile /></LazyPage> },
      { path: "calendario-fiscale", element: <LazyPage><CalendarioFiscale /></LazyPage> },
      { path: "saldi-ferie-permessi", element: <LazyPage><SaldiFeriePermessi /></LazyPage> },
      
      // === STRUMENTI ===
      { path: "documenti", element: <LazyPage><Documenti /></LazyPage> },
      { path: "documenti/:tipo", element: <LazyPage><Documenti /></LazyPage> },
      { path: "documenti-email", element: <Navigate to="/classificazione-email?tab=documenti" replace /> },
      { path: "import-unificato", element: <LazyPage><ImportDocumenti /></LazyPage> },
      { path: "import-unificato/:tipo", element: <LazyPage><ImportDocumenti /></LazyPage> },
      { path: "import-export", element: <LazyPage><ImportDocumenti /></LazyPage> },
      { path: "import-documenti", element: <LazyPage><ImportDocumenti /></LazyPage> },
      { path: "regole-categorizzazione", element: <Navigate to="/classificazione-email?tab=regole" replace /> },
      { path: "verifica-coerenza", element: <LazyPage><VerificaCoerenza /></LazyPage> },
      { path: "verifica-coerenza/:tab", element: <LazyPage><VerificaCoerenza /></LazyPage> },
      { path: "verifica-coerenza/:entita", element: <LazyPage><VerificaCoerenza /></LazyPage> },
      { path: "commercialista", element: <LazyPage><Commercialista /></LazyPage> },
      { path: "commercialista/:anno/:mese", element: <LazyPage><Commercialista /></LazyPage> },
      { path: "pianificazione", element: <LazyPage><Pianificazione /></LazyPage> },
      { path: "pianificazione/:anno", element: <LazyPage><Pianificazione /></LazyPage> },
      { path: "email-download", element: <LazyPage><EmailDownloadManager /></LazyPage> },
      { path: "email-download/:casella", element: <LazyPage><EmailDownloadManager /></LazyPage> },
      
      // === ADMIN ===
      { path: "admin", element: <LazyPage><Admin /></LazyPage> },
      { path: "admin/:sezione", element: <LazyPage><Admin /></LazyPage> },
      { path: "regole-contabili", element: <LazyPage><RegoleContabili /></LazyPage> },
      { path: "regole-contabili/:regola", element: <LazyPage><RegoleContabili /></LazyPage> },
      
      // === INTEGRAZIONI ===
      { path: "integrazioni-openapi", element: <LazyPage><IntegrazioniOpenAPI /></LazyPage> },
      { path: "integrazioni-openapi/:tab", element: <LazyPage><IntegrazioniOpenAPI /></LazyPage> },
      { path: "odoo", element: <LazyPage><OdooIntegration /></LazyPage> },
      { path: "pagopa", element: <LazyPage><GestionePagoPA /></LazyPage> },
      { path: "pagopa/:pratica", element: <LazyPage><GestionePagoPA /></LazyPage> },
      { path: "invoicetronic", element: <LazyPage><GestioneInvoiceTronic /></LazyPage> },
      { path: "invoicetronic/:fattura", element: <LazyPage><GestioneInvoiceTronic /></LazyPage> },
      { path: "classificazione-email", element: <LazyPage><ClassificazioneDocumenti /></LazyPage> },
      { path: "classificazione-email/:tab", element: <LazyPage><ClassificazioneDocumenti /></LazyPage> },
      { path: "fornitori-learning", element: <Navigate to="/fornitori?tab=learning" replace /> },
      
      // === AI TOOLS ===
      { path: "ai-parser", element: <Navigate to="/import-documenti?tab=ai" replace /> },
      { path: "ai-parser/:tipo", element: <Navigate to="/import-documenti?tab=ai" replace /> },
      { path: "lettura-documenti", element: <Navigate to="/import-documenti?tab=ai" replace /> },
      { path: "da-rivedere", element: <LazyPage><DocumentiDaRivedere /></LazyPage> },
      { path: "da-rivedere/:stato", element: <LazyPage><DocumentiDaRivedere /></LazyPage> },
      { path: "correzione-ai", element: <LazyPage><CorrezioneAI /></LazyPage> },
      { path: "correzione-ai/:documento", element: <LazyPage><CorrezioneAI /></LazyPage> },
      { path: "assistente-ai", element: <LazyPage><AssistenteAI /></LazyPage> },
      { path: "claude", element: <LazyPage><AssistenteAI /></LazyPage> },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AnnoProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </AnnoProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
// Force update: Sun Jan 18 19:13:03 UTC 2026
