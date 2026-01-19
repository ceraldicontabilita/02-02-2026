import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api';
import { formatEuro } from '../lib/utils';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { ExportButton } from '../components/ExportButton';
import { PageInfoCard } from '../components/PageInfoCard';

/**
 * Formatta una data in formato italiano DD/MM/YY
 */
const formatDateIT = (dateStr) => {
  if (!dateStr) return '-';
  try {
    // Gestisce formati: YYYY-MM-DD, DD/MM/YYYY, etc.
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Prova formato DD/MM/YYYY
      const parts = dateStr.split(/[/-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
        } else {
          d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
        }
      }
    }
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/**
 * RICONCILIAZIONE UNIFICATA
 * 
 * Una sola pagina smart con:
 * - Dashboard riepilogo
 * - Tab: Banca | Assegni | F24 | Fatture Aruba | Stipendi
 * - Auto-matching intelligente
 * - Flussi a cascata automatici
 * - URL con tab: /riconciliazione/banca, /riconciliazione/assegni, etc.
 */

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard', color: '#3b82f6' },
  { id: 'banca', label: '🏦 Banca', color: '#10b981' },
  { id: 'assegni', label: '📝 Assegni', color: '#f59e0b' },
  { id: 'f24', label: '📄 F24', color: '#ef4444' },
  { id: 'aruba', label: '🧾 Fatture Aruba', color: '#8b5cf6' },
  { id: 'stipendi', label: '👤 Stipendi', color: '#06b6d4' },
];

export default function RiconciliazioneUnificata() {
  const { anno } = useAnnoGlobale();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ottieni tab dall'URL (es. /riconciliazione/banca -> banca)
  const getTabFromPath = () => {
    const path = location.pathname;
    const match = path.match(/\/riconciliazione\/(\w+)/);
    if (match && TABS.find(t => t.id === match[1])) {
      return match[1];
    }
    return 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [processing, setProcessing] = useState(null);
  
  // Aggiorna URL quando cambia tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'dashboard') {
      navigate('/riconciliazione');
    } else {
      navigate(`/riconciliazione/${tabId}`);
    }
  };
  
  // Sincronizza tab con URL al mount e quando cambia URL
  useEffect(() => {
    const tab = getTabFromPath();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.pathname]);
  
  // Dati per ogni sezione
  const [stats, setStats] = useState({});
  const [movimentiBanca, setMovimentiBanca] = useState([]);
  const [assegni, setAssegni] = useState([]);
  const [f24Pendenti, setF24Pendenti] = useState([]);
  const [fattureAruba, setFattureAruba] = useState([]);
  const [stipendiPendenti, setStipendiPendenti] = useState([]);
  
  // Paginazione
  const [currentLimit, setCurrentLimit] = useState(25);
  const [hasMore, setHasMore] = useState(true);
  
  // Auto-refresh ogni 30 minuti
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  
  // Timer per auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh riconciliazione (ogni 30 min)');
      loadAllData();
      setLastRefresh(new Date());
    }, 30 * 60 * 1000); // 30 minuti
    
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, anno]);
  
  // Filtri avanzati
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dataFrom: '',
    dataTo: '',
    importoMin: '',
    importoMax: '',
    search: ''
  });
  
  // Auto-match stats
  const [autoMatchStats, setAutoMatchStats] = useState({ matched: 0, pending: 0 });

  // Applica filtri ai movimenti
  const applyFilters = (movimenti) => {
    return movimenti.filter(m => {
      // Usa data o data_emissione
      const dataMovimento = m.data || m.data_emissione;
      
      // Filtro data
      if (filters.dataFrom && dataMovimento < filters.dataFrom) return false;
      if (filters.dataTo && dataMovimento > filters.dataTo) return false;
      
      // Filtro importo
      const importo = Math.abs(parseFloat(m.importo) || 0);
      if (filters.importoMin && importo < parseFloat(filters.importoMin)) return false;
      if (filters.importoMax && importo > parseFloat(filters.importoMax)) return false;
      
      // Filtro ricerca testo
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const desc = (m.descrizione || '').toLowerCase();
        const tipo = (m.tipo || '').toLowerCase();
        if (!desc.includes(search) && !tipo.includes(search)) return false;
      }
      
      return true;
    });
  };

  // Movimenti filtrati
  const movimentiBancaFiltrati = applyFilters(movimentiBanca);
  const assegniFiltrati = applyFilters(assegni);
  const stipendiFiltrati = applyFilters(stipendiPendenti);
  
  // Stato per auto-riparazione
  const [autoRepairStatus, setAutoRepairStatus] = useState(null);
  const [autoRepairRunning, setAutoRepairRunning] = useState(false);

  /**
   * LOGICA INTELLIGENTE: Esegue auto-riparazione dei dati al caricamento.
   * Questa funzione implementa la logica di un commercialista esperto.
   */
  const eseguiAutoRiparazione = async () => {
    setAutoRepairRunning(true);
    try {
      const res = await api.post('/api/operazioni-da-confermare/auto-ricostruisci-dati');
      if (res.data.riconciliazioni_auto > 0 || res.data.f24_corretti > 0) {
        console.log('🔧 Auto-riparazione completata:', res.data);
        setAutoRepairStatus(res.data);
        // Ricarica dati dopo riparazione
        loadAllData();
      }
    } catch (error) {
      console.warn('Auto-riparazione non riuscita:', error);
    } finally {
      setAutoRepairRunning(false);
    }
  };

  // Auto-riparazione DISABILITATA per performance - eseguire manualmente
  // useEffect(() => {
  //   eseguiAutoRiparazione();
  // }, []);

  useEffect(() => {
    loadAllData();
  }, [anno]);

  const loadAllData = async (limit = 50) => {
    setLoading(true);
    try {
      // Carica dati primari velocemente (F24 caricato separatamente per non bloccare)
      const [bancaRes, arubaRes, stipendiRes] = await Promise.all([
        api.get(`/api/operazioni-da-confermare/smart/banca-veloce?limit=${limit}`).catch(() => ({ data: { movimenti: [], stats: {}, assegni: [] } })),
        api.get('/api/operazioni-da-confermare/aruba-pendenti').catch(() => ({ data: { operazioni: [] } })),
        api.get('/api/operazioni-da-confermare/smart/cerca-stipendi').catch(() => ({ data: { stipendi: [] } }))
      ]);

      const movimenti = bancaRes.data?.movimenti || [];
      const assegniDaApi = (bancaRes.data?.assegni || []).map(a => ({
        ...a,
        numero_assegno: a.numero_assegno || a.numero,
        data: a.data || a.data_emissione,
        descrizione: a.descrizione || a.causale || a.beneficiario || `Assegno ${a.numero || a.numero_assegno || ''}`
      }));
      
      setHasMore(movimenti.length >= limit);
      setCurrentLimit(limit);
      setStats(bancaRes.data?.stats || {});
      
      // Movimenti banca (escludi prelievi assegno)
      setMovimentiBanca(movimenti.filter(m => !m.descrizione?.toUpperCase()?.includes('PRELIEVO ASSEGNO')));
      
      // Assegni da riconciliare (già filtrati dal backend)
      setAssegni(assegniDaApi);
      
      const stipendi = stipendiRes.data?.stipendi || [];
      const aruba = arubaRes.data?.operazioni || [];
      
      setStipendiPendenti(stipendi);
      setFattureAruba(aruba);
      
      // Aggiorna stats iniziali (F24 caricato dopo)
      setStats({
        totale: movimenti.length,
        banca: movimenti.length,
        assegni: assegniDaApi.length,
        f24: 0,  // Caricato dopo
        aruba: aruba.length,
        stipendi: stipendi.length,
        fatture_da_pagare: bancaRes.data?.stats?.fatture_da_pagare || 0
      });
      
      // Auto-match stats
      setAutoMatchStats({
        matched: bancaRes.data?.stats?.riconciliati || 0,
        pending: bancaRes.data?.stats?.non_riconciliati || 0
      });
      
      setLoading(false);
      
      // Carica F24 in background (lento, ~35s) - non blocca UI
      api.get('/api/operazioni-da-confermare/smart/cerca-f24').then(f24Res => {
        const f24 = f24Res.data?.f24 || [];
        setF24Pendenti(f24);
        setStats(prev => ({ ...prev, f24: f24.length }));
      }).catch(() => {
        console.warn('F24 non caricati');
      });

    } catch (e) {
      console.error('Errore caricamento:', e);
      setLoading(false);
    }
  };

  // Carica altri movimenti
  const loadMore = async () => {
    const newLimit = currentLimit + 25;
    setLoadingMore(true);
    try {
      const bancaRes = await api.get(`/api/operazioni-da-confermare/smart/banca-veloce?limit=${newLimit}`);
      const movimenti = bancaRes.data?.movimenti || [];
      const assegniDaApi = (bancaRes.data?.assegni || []).map(a => ({
        ...a,
        numero_assegno: a.numero_assegno || a.numero,
        data: a.data || a.data_emissione,
        descrizione: a.descrizione || a.causale || a.beneficiario || `Assegno ${a.numero || a.numero_assegno || ''}`
      }));
      
      setHasMore(movimenti.length >= newLimit);
      setCurrentLimit(newLimit);
      
      setMovimentiBanca(movimenti.filter(m => !m.descrizione?.toUpperCase()?.includes('PRELIEVO ASSEGNO')));
      setAssegni(assegniDaApi);
      setStats(bancaRes.data?.stats || {});
    } catch (e) {
      console.error('Errore caricamento:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Auto-riconcilia tutti i movimenti con match esatto
  const handleAutoRiconcilia = async () => {
    setProcessing('auto');
    let matched = 0;
    
    try {
      // 1. Auto-conferma POS e commissioni
      const autoMovs = movimentiBanca.filter(m => m.associazione_automatica);
      for (const m of autoMovs) {
        try {
          await api.post('/api/operazioni-da-confermare/smart/riconcilia-manuale', {
            movimento_id: m.movimento_id,
            tipo: m.tipo,
            associazioni: m.suggerimenti?.slice(0, 1) || [],
            categoria: m.categoria
          });
          matched++;
        } catch (e) {
          console.error('Errore auto-riconcilia:', e);
        }
      }
      
      // 2. Auto-conferma assegni con match esatto
      const assegniExact = assegni.filter(m => 
        m.suggerimenti?.length > 0 &&
        Math.abs(Math.abs(m.importo) - Math.abs(m.suggerimenti[0]?.importo || 0)) < 0.01
      );
      for (const m of assegniExact) {
        try {
          await api.post('/api/operazioni-da-confermare/smart/riconcilia-manuale', {
            movimento_id: m.movimento_id,
            tipo: m.tipo,
            associazioni: m.suggerimenti?.slice(0, 1) || [],
            categoria: m.categoria
          });
          matched++;
        } catch (e) {
          console.error('Errore auto-riconcilia assegno:', e);
        }
      }
      
      setAutoMatchStats({ matched, pending: stats.totale - matched });
      alert(`✅ Auto-riconciliati ${matched} movimenti`);
      loadAllData();
      
    } catch (e) {
      alert('Errore: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  // Conferma singolo movimento
  const handleConferma = async (movimento, tipo, associazioni) => {
    setProcessing(movimento.movimento_id || movimento.id);
    try {
      await api.post('/api/operazioni-da-confermare/smart/riconcilia-manuale', {
        movimento_id: movimento.movimento_id,
        tipo: tipo || movimento.tipo,
        associazioni: associazioni || movimento.suggerimenti?.slice(0, 1) || [],
        categoria: movimento.categoria
      });
      loadAllData();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setProcessing(null);
    }
  };

  // Conferma fattura Aruba
  const handleConfermaAruba = async (op, metodo) => {
    setProcessing(op.id);
    try {
      await api.post('/api/operazioni-da-confermare/conferma-aruba', {
        operazione_id: op.id,
        metodo_pagamento: metodo
      });
      loadAllData();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setProcessing(null);
    }
  };

  // Ignora movimento
  const handleIgnora = async (movimento) => {
    setProcessing(movimento.movimento_id || movimento.id);
    try {
      await api.post('/api/operazioni-da-confermare/smart/ignora', { 
        movimento_id: movimento.movimento_id 
      });
      loadAllData();
    } catch (e) {
      console.error('Errore ignora:', e);
    } finally {
      setProcessing(null);
    }
  };

  // Incassa assegno (segna come incassato e crea movimento in Prima Nota Banca)
  const handleIncassaAssegno = async (assegno) => {
    setProcessing(assegno.id);
    try {
      // 1. Segna assegno come incassato
      await api.post(`/api/assegni/${assegno.id}/incassa`);
      
      // 2. Se vuoi anche creare movimento in Prima Nota Banca, decommentare:
      // await api.post('/api/prima-nota-banca/crea', {
      //   data: assegno.data || new Date().toISOString().split('T')[0],
      //   tipo: 'uscita',
      //   importo: Math.abs(assegno.importo),
      //   descrizione: `Assegno ${assegno.numero || ''} - ${assegno.beneficiario || ''}`,
      //   categoria: 'assegno'
      // });
      
      loadAllData();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setProcessing(null);
    }
  };

  // Assegna automaticamente metodi pagamento basandosi su estratto conto
  const handleAssegnaMetodiAuto = async () => {
    setProcessing('assegna-metodi');
    try {
      const res = await api.post('/api/riconciliazione-auto/assegna-metodi-aruba');
      const data = res.data;
      
      alert(`✅ Assegnazione completata!\n\n` +
        `📊 Risultati:\n` +
        `• Bonifico: ${data.assegnate_bonifico || 0}\n` +
        `• Assegno: ${data.assegnate_assegno || 0}\n` +
        `• Cassa: ${data.assegnate_cassa || 0}\n` +
        `• Sospese: ${data.lasciate_sospese || 0}\n` +
        `\n📅 Ultimo estratto conto: ${data.data_ultimo_estratto_conto || 'N/D'}`);
      
      loadAllData();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
        {/* Header con Gradiente anche durante il caricamento */}
        <div style={{ 
          marginBottom: 20, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '15px 20px',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
          borderRadius: 12,
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 'bold' }}>
              🔗 Riconciliazione Smart
            </h1>
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 13 }}>
              Associa movimenti bancari a fatture, F24, stipendi e assegni
            </p>
          </div>
        </div>
        <div style={{ padding: 40, textAlign: 'center', background: 'white', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ color: '#64748b' }}>Caricamento riconciliazione...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)', position: 'relative' }}>
      {/* Page Info Card */}
      <div style={{ position: 'absolute', top: 0, right: 20, zIndex: 100 }}>
        <PageInfoCard pageKey="riconciliazione" />
      </div>
      
      {/* Header con Gradiente */}
      <div style={{ 
        marginBottom: 20, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: 12,
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: 12,
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 'bold' }}>
            🔗 Riconciliazione Smart
          </h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 13 }}>
            Associa movimenti bancari a fatture, F24, stipendi e assegni
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Pulsante Auto-Riparazione */}
          <button
            onClick={eseguiAutoRiparazione}
            disabled={autoRepairRunning}
            data-testid="btn-auto-repair"
            style={{
              padding: '10px 16px',
              background: autoRepairRunning ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: autoRepairRunning ? 'wait' : 'pointer',
              boxShadow: '0 2px 4px rgba(102,126,234,0.3)'
            }}
          >
            {autoRepairRunning ? '⏳ Riparazione...' : '🔧 Auto-Ripara'}
          </button>
          {autoRepairStatus && autoRepairStatus.riconciliazioni_auto > 0 && (
            <span style={{ 
              padding: '6px 10px', 
              background: '#dcfce7', 
              color: '#16a34a', 
              borderRadius: 6, 
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center'
            }}>
              ✓ {autoRepairStatus.riconciliazioni_auto} riparazioni
            </span>
          )}
          
          {/* Pulsante Carica F24 */}
          <button
            onClick={async () => {
              setProcessing('f24');
              try {
                const res = await api.get('/api/operazioni-da-confermare/smart/cerca-f24');
                setF24Pendenti(res.data?.f24 || []);
                setStats(prev => ({ ...prev, f24: res.data?.f24?.length || 0 }));
              } catch (e) {
                console.error('Errore caricamento F24:', e);
              } finally {
                setProcessing(null);
              }
            }}
            disabled={processing === 'f24'}
            data-testid="btn-load-f24"
            style={{
              padding: '10px 16px',
              background: processing === 'f24' ? '#9ca3af' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: processing === 'f24' ? 'wait' : 'pointer'
            }}
          >
            {processing === 'f24' ? '⏳ Caricamento...' : '📋 Carica F24'}
          </button>
          
          <button
            onClick={handleAutoRiconcilia}
            disabled={processing}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {processing === 'auto' ? '⏳' : '⚡'} Auto-Riconcilia
          </button>
          <button
            onClick={loadAllData}
            disabled={processing}
            style={{
              padding: '10px 16px',
              background: 'rgba(255,255,255,0.9)',
              color: '#1e3a5f',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🔄 Aggiorna
          </button>
          
          {/* Indicatore Auto-Refresh */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            padding: '6px 12px',
            background: autoRefreshEnabled ? '#d1fae5' : '#fef3c7',
            borderRadius: 8,
            fontSize: 12
          }}>
            <span style={{ color: autoRefreshEnabled ? '#059669' : '#d97706' }}>
              {autoRefreshEnabled ? '🟢' : '🟡'} Auto: {autoRefreshEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              style={{
                padding: '2px 8px',
                background: 'rgba(0,0,0,0.1)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 10
              }}
            >
              {autoRefreshEnabled ? 'Disattiva' : 'Attiva'}
            </button>
            <span style={{ color: '#6b7280', fontSize: 10 }}>
              (30 min)
            </span>
          </div>
          
          {/* Bottone Filtri */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 16px',
              background: showFilters ? '#3b82f6' : '#f1f5f9',
              color: showFilters ? 'white' : '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            🔍 Filtri {showFilters ? '▲' : '▼'}
          </button>
          
          {/* Export movimenti banca */}
          <ExportButton
            data={movimentiBancaFiltrati}
            columns={[
              { key: 'data', label: 'Data' },
              { key: 'descrizione', label: 'Descrizione' },
              { key: 'importo', label: 'Importo' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'stato', label: 'Stato' }
            ]}
            filename="riconciliazione_movimenti"
            format="csv"
          />
        </div>
      </div>

      {/* Pannello Filtri Avanzati */}
      {showFilters && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>📅 Data Da</label>
            <input
              type="date"
              value={filters.dataFrom}
              onChange={(e) => setFilters({...filters, dataFrom: e.target.value})}
              style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>📅 Data A</label>
            <input
              type="date"
              value={filters.dataTo}
              onChange={(e) => setFilters({...filters, dataTo: e.target.value})}
              style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>💰 Importo Min (€)</label>
            <input
              type="number"
              placeholder="0"
              value={filters.importoMin}
              onChange={(e) => setFilters({...filters, importoMin: e.target.value})}
              style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>💰 Importo Max (€)</label>
            <input
              type="number"
              placeholder="999999"
              value={filters.importoMax}
              onChange={(e) => setFilters({...filters, importoMax: e.target.value})}
              style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>🔎 Cerca</label>
            <input
              type="text"
              placeholder="Descrizione, tipo..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              style={{ width: '100%', padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => setFilters({ dataFrom: '', dataTo: '', importoMin: '', importoMax: '', search: '' })}
              style={{
                padding: '8px 16px',
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              ✕ Reset
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 20, 
        flexWrap: 'wrap',
        background: 'white',
        padding: 8,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {TABS.map(tab => {
          const count = tab.id === 'dashboard' ? null : stats[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '12px 20px',
                background: activeTab === tab.id ? tab.color : '#f8fafc',
                color: activeTab === tab.id ? 'white' : '#374151',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {tab.label}
              {count !== null && (
                <span style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : tab.color,
                  color: activeTab === tab.id ? 'white' : 'white',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: 11
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {activeTab === 'dashboard' && (
          <DashboardTab stats={stats} autoMatchStats={autoMatchStats} />
        )}
        {activeTab === 'banca' && (
          <MovimentiTab 
            movimenti={movimentiBancaFiltrati} 
            onConferma={handleConferma}
            onIgnora={handleIgnora}
            processing={processing}
            title="Movimenti Bancari"
            emptyText="Tutti i movimenti sono stati riconciliati"
          />
        )}
        {activeTab === 'assegni' && (
          <MovimentiTab 
            movimenti={assegniFiltrati} 
            onConferma={handleIncassaAssegno}
            onIgnora={handleIgnora}
            processing={processing}
            title="Prelievi Assegno"
            emptyText="Nessun assegno da riconciliare"
            showFattura
          />
        )}
        {activeTab === 'f24' && (
          <F24Tab f24={f24Pendenti} processing={processing} />
        )}
        {activeTab === 'aruba' && (
          <ArubaTab 
            fatture={fattureAruba}
            onConferma={handleConfermaAruba}
            processing={processing}
            fornitori={[...new Set(fattureAruba.map(f => f.fornitore).filter(Boolean))]}
            onRefresh={loadAllData}
            onAssegnaMetodiAuto={handleAssegnaMetodiAuto}
          />
        )}
        {activeTab === 'stipendi' && (
          <MovimentiTab 
            movimenti={stipendiFiltrati} 
            onConferma={handleConferma}
            onIgnora={handleIgnora}
            processing={processing}
            title="Stipendi"
            emptyText="Nessuno stipendio da riconciliare"
          />
        )}
      </div>

      {/* Bottone Carica Altri */}
      {hasMore && ['banca', 'assegni', 'stipendi'].includes(activeTab) && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 28px',
              background: loadingMore ? '#94a3b8' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: loadingMore ? 'wait' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loadingMore ? '⏳ Caricamento...' : `📥 Carica altri (${currentLimit} caricati)`}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB COMPONENTS
// ============================================

function DashboardTab({ stats, autoMatchStats }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ 
        padding: 40, 
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
        borderRadius: 16, 
        color: 'white',
        maxWidth: 500,
        margin: '0 auto'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Riconciliazione</div>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>
          Seleziona una sezione dal menu per iniziare la riconciliazione
        </div>
        {autoMatchStats.matched > 0 && (
          <div style={{ 
            fontSize: 13, 
            marginTop: 16, 
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            display: 'inline-block'
          }}>
            ✅ {autoMatchStats.matched} elementi auto-riconciliati
          </div>
        )}
      </div>
      
      {/* Tips */}
      <div style={{ marginTop: 24, padding: 16, background: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d', maxWidth: 500, margin: '24px auto 0', textAlign: 'left' }}>
        <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 8 }}>💡 Suggerimenti</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#78350f', fontSize: 13 }}>
          <li>Usa &quot;Auto-Riconcilia&quot; per confermare automaticamente POS, commissioni e assegni con match esatto</li>
          <li>Le fatture Aruba richiedono conferma del metodo di pagamento (Cassa/Bonifico/Assegno)</li>
          <li>Gli F24 vengono matchati con le quietanze quando disponibili</li>
        </ul>
      </div>
    </div>
  );
}

function MovimentiTab({ movimenti, onConferma, onIgnora, processing, title, emptyText, showFattura }) {
  if (movimenti.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>✅</div>
        <div>{emptyText}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: 16, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title} ({movimenti.length})</h3>
      </div>
      <div style={{ maxHeight: 800, overflow: 'auto' }}>
        {movimenti.map((m, idx) => (
          <MovimentoCard 
            key={m.movimento_id || idx}
            movimento={m}
            onConferma={onConferma}
            onIgnora={onIgnora}
            processing={processing === m.movimento_id}
            showFattura={showFattura}
          />
        ))}
      </div>
    </div>
  );
}

function MovimentoCard({ movimento, onConferma, onIgnora, processing, showFattura }) {
  const suggerimento = movimento.suggerimenti?.[0];
  const hasMatch = movimento.associazione_automatica && suggerimento;
  
  // Estrai info extra dal movimento
  const ragioneSociale = movimento.ragione_sociale || movimento.fornitore || movimento.dipendente?.nome_completo || movimento.dipendente || movimento.nome_estratto;
  const numeroFattura = movimento.numero_fattura || movimento.fattura_collegata;
  const datiIncompleti = movimento.dati_incompleti || movimento.stato === 'vuoto';

  return (
    <div style={{ 
      padding: 16, 
      borderBottom: '1px solid #f1f5f9',
      opacity: processing ? 0.5 : 1,
      background: hasMatch ? '#f0fdf4' : datiIncompleti ? '#fef3c7' : 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: 10, 
          background: hasMatch ? '#dcfce7' : datiIncompleti ? '#fef3c7' : ragioneSociale ? '#e0f2fe' : '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20
        }}>
          {hasMatch ? '✅' : datiIncompleti ? '⚠️' : ragioneSociale ? '👤' : '📝'}
        </div>
        
        <div style={{ flex: 1 }}>
          {/* NOME DIPENDENTE/FORNITORE - In evidenza */}
          {ragioneSociale && (
            <div style={{ 
              fontWeight: 700, 
              fontSize: 15, 
              color: '#1e293b',
              marginBottom: 4
            }}>
              {ragioneSociale}
            </div>
          )}
          
          <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
            <span>{(movimento.data || movimento.data_emissione) ? formatDateIT(movimento.data || movimento.data_emissione) : 'Data N/D'}</span>
            <span>•</span>
            <span style={{ color: movimento.importo < 0 ? '#dc2626' : '#15803d', fontWeight: 700, fontSize: 15 }}>
              {movimento.importo ? formatEuro(Math.abs(movimento.importo)) : '€ 0,00'}
            </span>
            {movimento.periodo && (
              <>
                <span>•</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>Periodo: {movimento.periodo || movimento.mese_riferimento}</span>
              </>
            )}
            {datiIncompleti && (
              <span style={{ 
                fontSize: 10, 
                padding: '2px 6px', 
                background: '#fef3c7', 
                color: '#92400e',
                borderRadius: 4,
                fontWeight: 500
              }}>
                DATI INCOMPLETI
              </span>
            )}
          </div>
          
          {/* Descrizione */}
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {movimento.descrizione?.substring(0, 100) || movimento.descrizione_originale?.substring(0, 100) || '-'}
          </div>
          
          {/* Numero Fattura */}
          {numeroFattura && (
            <div style={{ 
              marginTop: 2, 
              fontSize: 11, 
              color: '#8b5cf6'
            }}>
              📄 Fattura: {numeroFattura}
            </div>
          )}
          
          {/* Info assegno se presente */}
          {movimento.numero_assegno && (
            <div style={{ 
              marginTop: 4, 
              fontSize: 11, 
              color: '#f59e0b',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center'
            }}>
              <span>📝 Assegno N. {movimento.numero_assegno}</span>
              <span>• Stato: {movimento.stato || 'N/D'}</span>
              {movimento.beneficiario && (
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>• 👤 {movimento.beneficiario}</span>
              )}
              {movimento.fornitore && !movimento.beneficiario && (
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>• 👤 {movimento.fornitore}</span>
              )}
            </div>
          )}
          
          {/* Confronto importi per assegni con fattura */}
          {movimento.numero_assegno && movimento.numero_fattura && (
            <div style={{ 
              marginTop: 6,
              padding: '6px 10px',
              background: '#fef3c7',
              borderRadius: 6,
              fontSize: 11,
              display: 'inline-flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center'
            }}>
              <span>💰 <b>Assegno:</b> {formatEuro(Math.abs(movimento.importo || 0))}</span>
              {movimento.importo_fattura !== undefined && (
                <>
                  <span>•</span>
                  <span>📄 <b>Fattura:</b> {formatEuro(Math.abs(movimento.importo_fattura || 0))}</span>
                  {Math.abs((movimento.importo || 0) - (movimento.importo_fattura || 0)) > 0.01 && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>
                        ⚠️ Diff: {formatEuro(Math.abs((movimento.importo || 0) - (movimento.importo_fattura || 0)))}
                      </span>
                    </>
                  )}
                </>
              )}
              {/* Info pagamento rateale */}
              {movimento.info_rate && movimento.info_rate.numero_rate > 1 && (
                <div style={{ 
                  width: '100%', 
                  marginTop: 4,
                  padding: '4px 8px',
                  background: '#dbeafe',
                  borderRadius: 4,
                  color: '#1e40af'
                }}>
                  📊 <b>Pagamento in {movimento.info_rate.numero_rate} rate</b>: 
                  Totale rate {formatEuro(movimento.info_rate.totale_rate)} 
                  {movimento.importo_fattura > 0 && (
                    <span> su fattura di {formatEuro(movimento.importo_fattura)}</span>
                  )}
                </div>
              )}
              {/* Nota TD24 */}
              {movimento.nota_td24 && (
                <div style={{ 
                  width: '100%', 
                  marginTop: 4,
                  padding: '4px 8px',
                  background: '#fce7f3',
                  borderRadius: 4,
                  color: '#9d174d'
                }}>
                  ℹ️ {movimento.nota_td24}
                </div>
              )}
            </div>
          )}
          
          {/* Info beneficiario per assegni senza numero */}
          {!movimento.numero_assegno && movimento.beneficiario && (
            <div style={{ 
              marginTop: 2, 
              fontSize: 11, 
              color: '#f59e0b'
            }}>
              👤 Beneficiario: {movimento.beneficiario}
            </div>
          )}
          
          {hasMatch && suggerimento && (
            <div style={{ 
              marginTop: 8, 
              padding: '6px 10px', 
              background: '#dcfce7', 
              borderRadius: 6,
              fontSize: 12,
              display: 'inline-block'
            }}>
              🔗 {suggerimento.fornitore || suggerimento.nome || suggerimento.dipendente || 'Match'}: {formatEuro(suggerimento.importo || 0)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onConferma(movimento)}
            disabled={processing}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            {processing ? '⏳' : '✓'} Conferma
          </button>
          <button
            onClick={() => onIgnora(movimento)}
            disabled={processing}
            style={{
              padding: '8px 12px',
              background: '#f1f5f9',
              color: '#64748b',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function F24Tab({ f24, onConfermaF24, processing }) {
  const [selezionati, setSelezionati] = useState(new Set());
  const [metodoBatch, setMetodoBatch] = useState('banca');
  const [salvandoBatch, setSalvandoBatch] = useState(false);
  
  // Filtra F24 con importo > 0
  const f24Validi = f24.filter(f => (f.importo_totale || f.importo || 0) > 0);
  
  if (f24Validi.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📄</div>
        <div>Nessun F24 pendente da pagare</div>
      </div>
    );
  }

  const totale = f24Validi.reduce((sum, f) => sum + (f.importo_totale || f.importo || 0), 0);
  const totaleSelezionati = f24Validi
    .filter(f => selezionati.has(f.id))
    .reduce((sum, f) => sum + (f.importo_totale || f.importo || 0), 0);

  const toggleSelezione = (id) => {
    setSelezionati(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleTutti = () => {
    if (selezionati.size === f24Validi.length) {
      setSelezionati(new Set());
    } else {
      setSelezionati(new Set(f24Validi.map(f => f.id)));
    }
  };

  const confermaBatch = async () => {
    if (selezionati.size === 0) {
      alert('Seleziona almeno un F24');
      return;
    }
    
    if (!window.confirm(`Confermare ${selezionati.size} F24 come ${metodoBatch.toUpperCase()}?`)) return;
    
    setSalvandoBatch(true);
    try {
      const operazioni = f24Validi
        .filter(f => selezionati.has(f.id))
        .map(f => ({
          operazione_id: f.id,
          metodo_pagamento: metodoBatch,
          tipo: 'f24'
        }));
      
      await api.post('/api/operazioni-da-confermare/conferma-batch', { operazioni });
      alert(`✅ Confermati ${selezionati.size} F24`);
      setSelezionati(new Set());
      // Ricarica dati
      window.location.reload();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSalvandoBatch(false);
    }
  };

  const confermaF24Singolo = async (f24Item, metodo) => {
    try {
      await api.post('/api/operazioni-da-confermare/conferma-batch', {
        operazioni: [{
          operazione_id: f24Item.id,
          metodo_pagamento: metodo,
          tipo: 'f24'
        }]
      });
      window.location.reload();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <div>
      <div style={{ padding: 16, background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#991b1b' }}>📄 F24 Pendenti ({f24Validi.length})</h3>
          <div style={{ fontWeight: 700, color: '#dc2626' }}>Totale: {formatEuro(totale)}</div>
        </div>
        
        {/* Azioni batch */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={toggleTutti}
            style={{ padding: '8px 12px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
          >
            {selezionati.size === f24Validi.length ? '☐ Deseleziona' : '☑ Seleziona tutti'}
          </button>
          
          {selezionati.size > 0 && (
            <>
              <span style={{ 
                padding: '8px 12px', 
                border: '1px solid #dc2626', 
                borderRadius: 6, 
                fontSize: 13, 
                background: '#fee2e2',
                fontWeight: 600,
                color: '#991b1b'
              }}>
                🏦 Pagamento Banca
              </span>
              
              <button 
                onClick={confermaBatch}
                disabled={salvandoBatch}
                style={{ 
                  padding: '8px 16px', 
                  background: '#dc2626', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                {salvandoBatch ? '⏳' : '✅'} Conferma {selezionati.size} ({formatEuro(totaleSelezionati)})
              </button>
            </>
          )}
        </div>
      </div>
      
      <div style={{ maxHeight: 800, overflow: 'auto' }}>
        {f24Validi.map((f, idx) => {
          const importo = f.importo_totale || f.importo || 0;
          const scadenzaStr = formatDateIT(f.data_scadenza);
          
          return (
            <div key={f.id || idx} style={{ 
              padding: 16, 
              borderBottom: '1px solid #f1f5f9',
              background: selezionati.has(f.id) ? '#fef2f2' : 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selezionati.has(f.id)}
                  onChange={() => toggleSelezione(f.id)}
                  style={{ marginTop: 4, width: 18, height: 18, cursor: 'pointer' }}
                />
                
                {/* Info F24 */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {f.contribuente || 'F24'}
                    {f.codici_tributo?.length > 0 && (
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                        Tributi: {f.codici_tributo.join(', ')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Periodo: {f.periodo || '-'} • Scadenza: {scadenzaStr}
                  </div>
                </div>
                
                {/* Importo e azioni */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#dc2626' }}>
                    {formatEuro(importo)}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => confermaF24Singolo(f, 'banca')}
                      style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                      title="Conferma pagamento F24 tramite Banca"
                    >
                      🏦 Paga con Banca
                    </button>
                    <button
                      onClick={() => {
                        if (f.pdf_url) {
                          window.open(f.pdf_url, '_blank');
                        } else if (f.file_path) {
                          window.open(`/api/files/download?path=${encodeURIComponent(f.file_path)}`, '_blank');
                        } else {
                          alert('PDF non disponibile. Carica il PDF F24 dalla sezione Import.');
                        }
                      }}
                      style={{ 
                        padding: '4px 8px', 
                        background: f.pdf_url || f.file_path ? '#6366f1' : '#94a3b8', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4, 
                        cursor: 'pointer', 
                        fontSize: 11 
                      }}
                      title={f.pdf_url || f.file_path ? "Visualizza PDF F24" : "PDF non disponibile"}
                    >
                      👁️ Vedi PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArubaTab({ fatture, onConferma, processing, fornitori = [], onRefresh, onAssegnaMetodiAuto }) {
  const [preferenze, setPreferenze] = useState({});
  const [filtroFornitore, setFiltroFornitore] = useState('');
  const [selezionate, setSelezionate] = useState(new Set());
  const [metodoBatch, setMetodoBatch] = useState('bonifico');
  const [salvandoBatch, setSalvandoBatch] = useState(false);

  // Carica preferenze per ogni fornitore
  useEffect(() => {
    const loadPreferenze = async () => {
      const newPref = {};
      for (const op of fatture) {
        if (op.fornitore && !preferenze[op.fornitore]) {
          try {
            const res = await api.get(`/api/operazioni-da-confermare/fornitore-preferenza/${encodeURIComponent(op.fornitore)}`);
            if (res.data?.found) {
              newPref[op.fornitore] = res.data.metodo_preferito;
            }
          } catch (e) {
            // Ignora errori
          }
        }
      }
      if (Object.keys(newPref).length > 0) {
        setPreferenze(prev => ({ ...prev, ...newPref }));
      }
    };
    if (fatture.length > 0) {
      loadPreferenze();
    }
  }, [fatture]);

  // Filtra fatture
  const fattureFiltrate = filtroFornitore 
    ? fatture.filter(f => f.fornitore?.toLowerCase().includes(filtroFornitore.toLowerCase()))
    : fatture;

  // Toggle selezione
  const toggleSelezione = (id) => {
    setSelezionate(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Seleziona/Deseleziona tutte
  const toggleTutte = () => {
    if (selezionate.size === fattureFiltrate.length) {
      setSelezionate(new Set());
    } else {
      setSelezionate(new Set(fattureFiltrate.map(f => f.id)));
    }
  };

  // Conferma batch
  const confermaBatch = async () => {
    if (selezionate.size === 0) {
      alert('Seleziona almeno una fattura');
      return;
    }

    setSalvandoBatch(true);
    try {
      const operazioni = Array.from(selezionate).map(id => ({
        operazione_id: id,
        metodo_pagamento: metodoBatch
      }));

      const res = await api.post('/api/operazioni-da-confermare/conferma-batch', { operazioni });
      
      if (res.data.successo > 0) {
        alert(`✅ ${res.data.successo} fatture confermate!`);
        setSelezionate(new Set());
        if (onRefresh) onRefresh();
      }
      
      if (res.data.errori > 0) {
        console.error('Errori batch:', res.data.dettagli);
      }
    } catch (e) {
      alert('Errore conferma batch: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSalvandoBatch(false);
    }
  };

  if (fatture.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>🧾</div>
        <div>Nessuna fattura Aruba da confermare</div>
        <div style={{ fontSize: 12, marginTop: 8 }}>Le fatture già inserite in Prima Nota vengono automaticamente saltate</div>
      </div>
    );
  }

  const totale = fattureFiltrate.reduce((sum, f) => sum + (f.importo || f.netto_pagare || 0), 0);
  const totaleSelezionate = Array.from(selezionate)
    .map(id => fattureFiltrate.find(f => f.id === id))
    .filter(Boolean)
    .reduce((sum, f) => sum + (f.importo || f.netto_pagare || 0), 0);

  return (
    <div>
      {/* Header con filtri e azioni batch */}
      <div style={{ padding: 16, background: '#f5f3ff', borderBottom: '1px solid #e9d5ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#7c3aed' }}>🧾 Fatture Aruba ({fattureFiltrate.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onAssegnaMetodiAuto}
              disabled={processing === 'assegna-metodi'}
              style={{
                padding: '6px 12px',
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500
              }}
              title="Assegna automaticamente metodi in base all'estratto conto"
            >
              {processing === 'assegna-metodi' ? '⏳ Elaborazione...' : '🔄 Assegna Metodi Auto'}
            </button>
            <div style={{ fontWeight: 700, color: '#7c3aed' }}>Totale: {formatEuro(totale)}</div>
          </div>
        </div>
        
        {/* Filtro fornitore */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={filtroFornitore}
            onChange={e => setFiltroFornitore(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
          >
            <option value="">Tutti i fornitori ({fatture.length})</option>
            {fornitori.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          
          {/* Azioni batch */}
          <button 
            onClick={toggleTutte}
            style={{ padding: '8px 12px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
          >
            {selezionate.size === fattureFiltrate.length ? '☐ Deseleziona' : '☑ Seleziona tutte'}
          </button>
          
          {selezionate.size > 0 && (
            <>
              <select 
                value={metodoBatch}
                onChange={e => setMetodoBatch(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #10b981', borderRadius: 6, fontSize: 13, background: '#d1fae5' }}
              >
                <option value="cassa">💰 Cassa</option>
                <option value="bonifico">🏦 Bonifico</option>
                <option value="carta_credito">💳 Carta/POS</option>
                <option value="assegno">📝 Assegno</option>
              </select>
              
              <button 
                onClick={confermaBatch}
                disabled={salvandoBatch}
                style={{ 
                  padding: '8px 16px', 
                  background: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                {salvandoBatch ? '⏳' : '✅'} Conferma {selezionate.size} ({formatEuro(totaleSelezionate)})
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Lista fatture */}
      <div style={{ maxHeight: 800, overflow: 'auto' }}>
        {fattureFiltrate.map((op, idx) => {
          const metodoPreferito = preferenze[op.fornitore] || op.metodo_pagamento_proposto;
          
          return (
            <div key={op.id || idx} style={{ 
              padding: 16, 
              borderBottom: '1px solid #f1f5f9',
              opacity: processing === op.id ? 0.5 : 1,
              background: selezionate.has(op.id) ? '#f0fdf4' : 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                {/* Checkbox selezione */}
                <input
                  type="checkbox"
                  checked={selezionate.has(op.id)}
                  onChange={() => toggleSelezione(op.id)}
                  style={{ 
                    width: 18, 
                    height: 18, 
                    marginTop: 2,
                    cursor: 'pointer',
                    accentColor: '#10b981'
                  }}
                />
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{op.fornitore || 'Fornitore N/A'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Fatt. {op.numero_fattura} • {op.data_documento ? formatDateIT(op.data_documento) : '-'}
                  </div>
                  {metodoPreferito && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: 8,
                      padding: '4px 10px',
                      background: preferenze[op.fornitore] ? '#dcfce7' : '#dbeafe',
                      color: preferenze[op.fornitore] ? '#166534' : '#1e40af',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {preferenze[op.fornitore] ? '🧠 Preferito' : '💡 Proposto'}: {metodoPreferito.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#059669' }}>
                    {formatEuro(op.importo || op.netto_pagare || 0)}
                  </div>
                </div>
              </div>
              
              {/* Bottoni metodo pagamento - evidenzia preferito */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => onConferma(op, 'cassa')}
                  disabled={processing === op.id}
                  style={metodoBtn(
                    metodoPreferito === 'cassa' ? '#dcfce7' : '#fef3c7', 
                    metodoPreferito === 'cassa' ? '#166534' : '#92400e',
                    metodoPreferito === 'cassa'
                  )}
                >
                  💰 Cassa {metodoPreferito === 'cassa' && '⭐'}
                </button>
                <button
                  onClick={() => onConferma(op, 'bonifico')}
                  disabled={processing === op.id}
                  style={metodoBtn(
                    metodoPreferito === 'bonifico' ? '#dcfce7' : '#dbeafe', 
                    metodoPreferito === 'bonifico' ? '#166534' : '#1e40af',
                    metodoPreferito === 'bonifico'
                  )}
                >
                  🏦 Bonifico {metodoPreferito === 'bonifico' && '⭐'}
                </button>
                <button
                  onClick={() => onConferma(op, 'carta_credito')}
                  disabled={processing === op.id}
                  style={metodoBtn(
                    metodoPreferito === 'carta_credito' ? '#dcfce7' : '#e0f2fe', 
                    metodoPreferito === 'carta_credito' ? '#166534' : '#0369a1',
                    metodoPreferito === 'carta_credito'
                  )}
                >
                  💳 Carta/POS {metodoPreferito === 'carta_credito' && '⭐'}
                </button>
                <button
                  onClick={() => onConferma(op, 'assegno')}
                  disabled={processing === op.id}
                  style={metodoBtn(
                    metodoPreferito === 'assegno' ? '#dcfce7' : '#f3e8ff', 
                    metodoPreferito === 'assegno' ? '#166534' : '#7c3aed',
                    metodoPreferito === 'assegno'
                  )}
                >
                  📝 Assegno {metodoPreferito === 'assegno' && '⭐'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const metodoBtn = (bg, color, isPreferred = false) => ({
  padding: '10px 16px',
  background: bg,
  color: color,
  border: isPreferred ? '2px solid #10b981' : 'none',
  borderRadius: 6,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
  boxShadow: isPreferred ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none'
});
