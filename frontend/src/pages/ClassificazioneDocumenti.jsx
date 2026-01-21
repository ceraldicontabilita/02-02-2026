import React, { useState, useEffect } from 'react';
import api from '../api';
import { FileText, Mail, CheckCircle, AlertCircle, Trash2, RefreshCw, Settings, Search, ArrowRight, Zap, Brain, FolderOpen } from 'lucide-react';

// Mapping categorie -> colori e icone
const CATEGORY_CONFIG = {
  verbali: { bg: '#fef3c7', text: '#92400e', icon: FileText, label: 'Verbali/Multe', section: 'Noleggio Auto' },
  dimissioni: { bg: '#dbeafe', text: '#1e40af', icon: FileText, label: 'Dimissioni', section: 'Anagrafica Dipendenti' },
  cartelle_esattoriali: { bg: '#fee2e2', text: '#dc2626', icon: AlertCircle, label: 'Cartelle Esattoriali', section: 'Commercialista' },
  inps_fonsi: { bg: '#f3e8ff', text: '#7c3aed', icon: FileText, label: 'Delibere FONSI', section: 'INPS Documenti' },
  inps_dilazioni: { bg: '#e0e7ff', text: '#4338ca', icon: FileText, label: 'Dilazioni INPS', section: 'INPS Documenti' },
  bonifici_stipendi: { bg: '#fce7f3', text: '#be185d', icon: FileText, label: 'Bonifici Stipendi', section: 'Prima Nota Salari' },
  f24: { bg: '#dcfce7', text: '#166534', icon: FileText, label: 'F24', section: 'Gestione F24' },
  buste_paga: { bg: '#cffafe', text: '#0891b2', icon: FileText, label: 'Buste Paga', section: 'Cedolini' },
  estratti_conto: { bg: '#f1f5f9', text: '#475569', icon: FileText, label: 'Estratti Conto', section: 'Banca' },
  fatture: { bg: '#ecfdf5', text: '#059669', icon: FileText, label: 'Fatture', section: 'Ciclo Passivo' },
};

// Mapping sezioni gestionale
const GESTIONALE_SECTIONS = {
  'Noleggio Auto': { path: '/noleggio-auto', color: '#f59e0b' },
  'Anagrafica Dipendenti': { path: '/dipendenti', color: '#3b82f6' },
  'Commercialista': { path: '/commercialista', color: '#ef4444' },
  'INPS Documenti': { path: '/documenti', color: '#8b5cf6' },
  'Prima Nota Salari': { path: '/prima-nota-salari', color: '#ec4899' },
  'Gestione F24': { path: '/f24', color: '#10b981' },
  'Cedolini': { path: '/cedolini', color: '#06b6d4' },
  'Banca': { path: '/riconciliazione', color: '#6366f1' },
  'Ciclo Passivo': { path: '/fatture-ricevute', color: '#22c55e' },
};

export default function ClassificazioneDocumenti() {
  const [activeTab, setActiveTab] = useState('classificazione');
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState([]);
  const [scanResults, setScanResults] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Impostazioni scansione
  const [scanSettings, setScanSettings] = useState({
    cartella: 'INBOX',
    giorni: 30,
    delete_unmatched: false,
    dry_run: true
  });
  
  useEffect(() => {
    loadData();
    loadStats();
    loadRules();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/documenti-smart/documents?limit=100');
      setDocuments(res.data.documents || []);
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/api/documenti-smart/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  };

  const loadRules = async () => {
    try {
      const res = await api.get('/api/documenti-smart/rules');
      setRules(res.data || []);
    } catch (error) {
      console.error('Errore caricamento regole:', error);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResults(null);
    try {
      const res = await api.post('/api/documenti-smart/scan', scanSettings);
      setScanResults(res.data);
      if (!scanSettings.dry_run) {
        loadData();
        loadStats();
      }
    } catch (error) {
      console.error('Errore scansione:', error);
      alert('Errore durante la scansione: ' + (error.response?.data?.detail || error.message));
    } finally {
      setScanning(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/api/documenti-smart/process');
      alert(`Processati ${res.data.documenti_processati} documenti\nAssociazioni: ${res.data.associazioni?.length || 0}`);
      loadData();
      loadStats();
    } catch (error) {
      console.error('Errore processamento:', error);
      alert('Errore durante il processamento');
    } finally {
      setProcessing(false);
    }
  };

  const handleAssociaTutti = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/api/documenti-smart/associa-tutti');
      alert(`Associazioni completate!\n\nDimissioni: ${res.data.associazioni?.dimissioni || 0}\nCartelle: ${res.data.associazioni?.cartelle_esattoriali || 0}\nVerbali: ${res.data.associazioni?.verbali || 0}\nBonifici: ${res.data.associazioni?.bonifici || 0}`);
      loadData();
      loadStats();
    } catch (error) {
      console.error('Errore associazione:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCleanup = async (confirm = false) => {
    setLoading(true);
    try {
      const res = await api.delete(`/api/documenti-smart/cleanup-unmatched?cartella=${scanSettings.cartella}&giorni=${scanSettings.giorni}&confirm=${confirm}`);
      alert(confirm 
        ? `Eliminate ${res.data.eliminati} email non rilevanti` 
        : `Preview: ${res.data.email_da_eliminare} email verrebbero eliminate`
      );
    } catch (error) {
      console.error('Errore cleanup:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryConfig = (category) => {
    return CATEGORY_CONFIG[category] || { 
      bg: '#f1f5f9', text: '#475569', icon: FileText, label: category, section: 'Altro' 
    };
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }} data-testid="classificazione-documenti-page">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: 12,
        color: 'white',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>🧠 Classificazione Intelligente Email</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
            Scansiona email, classifica automaticamente e associa al gestionale
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { loadData(); loadStats(); }}
            disabled={loading}
            style={{ 
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.95)',
              color: '#1e3a5f',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1
            }}
            data-testid="refresh-btn"
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div style={{ 
        background: '#eff6ff', 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 20,
        borderLeft: '4px solid #6366f1'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Zap style={{ width: 20, height: 20, color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ margin: 0, fontWeight: 600, color: '#312e81' }}>Sistema di Classificazione Intelligente</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#4338ca' }}>
              Scansiona le email e le classifica in base a {rules.length} regole predefinite.
              Ogni categoria viene associata alla sezione corretta del gestionale.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {Object.entries(GESTIONALE_SECTIONS).slice(0, 5).map(([name, config]) => (
                <span 
                  key={name}
                  style={{ 
                    fontSize: 11, 
                    padding: '4px 10px', 
                    borderRadius: 12,
                    background: config.color + '20', 
                    color: config.color,
                    fontWeight: 500
                  }}
                >
                  {name}
                </span>
              ))}
              <span style={{ fontSize: 11, color: '#6366f1', padding: '4px 0' }}>+{Object.keys(GESTIONALE_SECTIONS).length - 5} altre</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      {stats && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          padding: 16, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
          marginBottom: 20 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #6366f1' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>📊 Classificati</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#6366f1' }}>{stats.totale_classificati || 0}</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #22c55e' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>✅ Processati</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#22c55e' }}>{stats.processati || 0}</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #f59e0b' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>⏳ Da Processare</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f59e0b' }}>{stats.da_processare || 0}</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #ef4444' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>❌ Errori</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>{stats.errori || 0}</div>
            </div>
            <div style={{ 
              background: '#1e3a5f', 
              borderRadius: 8, 
              padding: '10px 12px', 
              color: 'white'
            }}>
              <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4 }}>📧 Email Scansite</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{stats.email_scansionate || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', paddingBottom: 8, marginBottom: 20 }}>
        {[
          { id: 'classificazione', label: 'Classificazione', icon: '🧠' },
          { id: 'documenti', label: 'Documenti', icon: '📄' },
          { id: 'regole', label: 'Regole', icon: '⚙️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? '#1e3a5f' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Classificazione */}
      {activeTab === 'classificazione' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Scansione Email */}
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 20, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              📧 Scansione Email
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Cartella</label>
                <select
                  value={scanSettings.cartella}
                  onChange={(e) => setScanSettings({...scanSettings, cartella: e.target.value})}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px' }}
                  data-testid="select-cartella"
                >
                  <option value="INBOX">INBOX</option>
                  <option value="[Gmail]/Tutti i messaggi">Tutti i messaggi</option>
                  <option value="[Gmail]/Posta in arrivo">Posta in arrivo</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Ultimi giorni</label>
                <input
                  type="number"
                  value={scanSettings.giorni}
                  onChange={(e) => setScanSettings({...scanSettings, giorni: parseInt(e.target.value) || 30})}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px' }}
                  min="1"
                  max="365"
                  data-testid="input-giorni"
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scanSettings.dry_run}
                    onChange={(e) => setScanSettings({...scanSettings, dry_run: e.target.checked})}
                    style={{ width: 16, height: 16 }}
                    data-testid="checkbox-dryrun"
                  />
                  <span style={{ fontSize: 14 }}>Solo anteprima</span>
                </label>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  data-testid="btn-scan"
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    background: scanning ? '#9ca3af' : '#4f46e5', 
                    color: 'white', 
                    border: 'none',
                    borderRadius: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8,
                    cursor: scanning ? 'not-allowed' : 'pointer'
                  }}
                >
                  {scanning ? (
                    <RefreshCw style={{ width: 16, height: 16 }} />
                  ) : (
                    <Search style={{ width: 16, height: 16 }} />
                  )}
                  {scanning ? 'Scansione...' : 'Scansiona Email'}
                </button>
              </div>
            </div>

            {/* Risultati scansione */}
            {scanResults && (
              <div style={{ marginTop: 24, borderTop: '1px solid #e5e7eb', paddingTop: 16 }} data-testid="scan-results">
                <h4 style={{ fontWeight: 500, marginBottom: 12 }}>Risultati Scansione</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{scanResults.email_totali}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Email Totali</div>
                  </div>
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#16a34a' }}>{scanResults.email_classificate}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Classificate</div>
                  </div>
                  <div style={{ background: '#fffbeb', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#d97706' }}>{scanResults.email_non_classificate}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Non Classificate</div>
                  </div>
                  <div style={{ background: '#eff6ff', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#2563eb' }}>{scanResults.documenti_salvati}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>PDF Salvati</div>
                  </div>
                </div>

                {/* Per categoria */}
                {scanResults.per_categoria && Object.keys(scanResults.per_categoria).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h5 style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Per Categoria:</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(scanResults.per_categoria).map(([cat, data]) => {
                        const config = getCategoryConfig(cat);
                        return (
                          <div 
                            key={cat}
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: 8, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8,
                              backgroundColor: config.bg, 
                              color: config.text 
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{config.label}</span>
                            <span style={{ 
                              background: 'rgba(255,255,255,0.5)', 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              fontSize: 14 
                            }}>{data.count}</span>
                            <ArrowRight style={{ width: 12, height: 12 }} />
                            <span style={{ fontSize: 12 }}>{data.gestionale_section}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Azioni post-scansione */}
                {!scanSettings.dry_run && scanResults.documenti_salvati > 0 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleProcess}
                      disabled={processing}
                      data-testid="btn-process"
                      style={{ 
                        padding: '8px 16px', 
                        background: processing ? '#9ca3af' : '#16a34a', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: 8, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8,
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <CheckCircle style={{ width: 16, height: 16 }} />
                      Processa Documenti
                    </button>
                    <button
                      onClick={handleAssociaTutti}
                      disabled={processing}
                      data-testid="btn-associa"
                      style={{ 
                        padding: '8px 16px', 
                        background: processing ? '#9ca3af' : '#9333ea', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: 8, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8,
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <ArrowRight style={{ width: 16, height: 16 }} />
                      Associa al Gestionale
                    </button>
                  </div>
                )}

                {/* Cleanup */}
                {scanResults.email_non_classificate > 0 && (
                  <div style={{ 
                    marginTop: 16, 
                    padding: 12, 
                    background: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    borderRadius: 8 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ color: '#b91c1c', fontWeight: 500 }}>
                          {scanResults.email_non_classificate} email non classificate
                        </span>
                        <p style={{ fontSize: 14, color: '#dc2626', margin: '4px 0 0 0' }}>
                          Queste email non corrispondono a nessuna regola e possono essere eliminate.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleCleanup(false)}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: 14, 
                            border: '1px solid #fca5a5', 
                            color: '#b91c1c', 
                            background: 'transparent',
                            borderRadius: 8,
                            cursor: 'pointer'
                          }}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleCleanup(true)}
                          data-testid="btn-cleanup"
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: 14, 
                            background: '#dc2626', 
                            color: 'white', 
                            border: 'none',
                            borderRadius: 8, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 4,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mapping Gestionale */}
          {stats?.mapping_gestionale && Object.keys(stats.mapping_gestionale).length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                Mapping Sezioni Gestionale
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(stats.mapping_gestionale).map(([section, data]) => {
                  const sectionConfig = GESTIONALE_SECTIONS[section];
                  return (
                    <a
                      key={section}
                      href={sectionConfig?.path || '#'}
                      className="border rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{section}</div>
                        <div className="text-sm text-gray-500">{data.categoria}</div>
                      </div>
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: sectionConfig?.color || '#6366f1' }}
                      >
                        {data.documenti}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Documenti */}
      {activeTab === 'documenti' && (
        <div className="bg-white border rounded-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Documenti Classificati</h3>
            <span className="text-sm text-gray-500">{documents.length} documenti</span>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Caricamento...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nessun documento classificato. Esegui una scansione per iniziare.
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {documents.map((doc, idx) => {
                const config = getCategoryConfig(doc.tipo);
                const IconComponent = config.icon;
                return (
                  <div key={doc._id || idx} className="p-4 hover:bg-gray-50 flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: config.bg }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: config.text }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.filename}</div>
                      <div className="text-sm text-gray-500 truncate">{doc.subject}</div>
                    </div>
                    
                    <div className="text-right">
                      <div 
                        className="text-xs px-2 py-1 rounded-full inline-block"
                        style={{ backgroundColor: config.bg, color: config.text }}
                      >
                        {config.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {doc.processed ? '✓ Processato' : '○ Da processare'}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {config.section}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Regole */}
      {activeTab === 'regole' && (
        <div className="bg-white border rounded-xl">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Regole di Classificazione</h3>
            <p className="text-sm text-gray-500 mt-1">
              Queste regole determinano come le email vengono classificate e associate al gestionale.
            </p>
          </div>
          
          <div className="divide-y">
            {rules.map((rule, idx) => {
              const config = getCategoryConfig(rule.category);
              return (
                <div key={idx} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 rounded text-sm font-medium"
                        style={{ backgroundColor: config.bg, color: config.text }}
                      >
                        {rule.name}
                      </span>
                      <span className="text-xs text-gray-400">Priorità: {rule.priority}</span>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {rule.gestionale_section}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Keywords:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.keywords.slice(0, 3).map((kw, i) => (
                          <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{kw}</span>
                        ))}
                        {rule.keywords.length > 3 && (
                          <span className="text-xs text-gray-400">+{rule.keywords.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Collection:</span>
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {rule.collection}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Azione:</span>
                      <span className="ml-2 text-xs">{rule.action}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
