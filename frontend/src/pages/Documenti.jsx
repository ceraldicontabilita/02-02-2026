import React, { useState, useEffect, useCallback } from 'react';
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

export default function Documenti() {
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
  
  // Auto-ripara al mount
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
    if (confirm && !window.confirm('ATTENZIONE: Le email non classificate verranno ELIMINATE definitivamente. Continuare?')) {
      return;
    }
    
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
    <div className="space-y-6" data-testid="documenti-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-indigo-600" />
            Gestione Documenti Intelligente
          </h1>
          <p className="text-gray-500 mt-1">
            Classificazione automatica email e associazione al gestionale
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => { loadData(); loadStats(); }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Card info logica intelligente */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-indigo-900">Sistema di Classificazione Intelligente</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Questo sistema scansiona automaticamente le email e le classifica in base a {rules.length} regole predefinite.
              Ogni categoria viene associata alla sezione corretta del gestionale.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(GESTIONALE_SECTIONS).slice(0, 5).map(([name, config]) => (
                <span 
                  key={name}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: config.color + '20', color: config.color }}
                >
                  {name}
                </span>
              ))}
              <span className="text-xs text-indigo-600">+{Object.keys(GESTIONALE_SECTIONS).length - 5} altre</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'classificazione', label: 'Classificazione', icon: Brain },
            { id: 'documenti', label: 'Documenti', icon: FileText },
            { id: 'regole', label: 'Regole', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Classificazione */}
      {activeTab === 'classificazione' && (
        <div className="space-y-6">
          {/* Statistiche */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border rounded-xl p-4">
                <div className="text-3xl font-bold text-indigo-600">{stats.totale_classificati || 0}</div>
                <div className="text-sm text-gray-500">Documenti Classificati</div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-3xl font-bold text-green-600">{stats.processati || 0}</div>
                <div className="text-sm text-gray-500">Processati</div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-3xl font-bold text-amber-600">{stats.da_processare || 0}</div>
                <div className="text-sm text-gray-500">Da Processare</div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <div className="text-3xl font-bold text-purple-600">{stats.regole_attive || rules.length}</div>
                <div className="text-sm text-gray-500">Regole Attive</div>
              </div>
            </div>
          )}

          {/* Impostazioni scansione */}
          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Scansione Email
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Cartella</label>
                <select
                  value={scanSettings.cartella}
                  onChange={(e) => setScanSettings({...scanSettings, cartella: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="INBOX">INBOX</option>
                  <option value="[Gmail]/Tutti i messaggi">Tutti i messaggi</option>
                  <option value="[Gmail]/Posta in arrivo">Posta in arrivo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ultimi giorni</label>
                <input
                  type="number"
                  value={scanSettings.giorni}
                  onChange={(e) => setScanSettings({...scanSettings, giorni: parseInt(e.target.value) || 30})}
                  className="w-full border rounded-lg px-3 py-2"
                  min="1"
                  max="365"
                />
              </div>
              
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scanSettings.dry_run}
                    onChange={(e) => setScanSettings({...scanSettings, dry_run: e.target.checked})}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm">Solo anteprima</span>
                </label>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {scanning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {scanning ? 'Scansione...' : 'Scansiona Email'}
                </button>
              </div>
            </div>

            {/* Risultati scansione */}
            {scanResults && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-3">Risultati Scansione</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{scanResults.email_totali}</div>
                    <div className="text-xs text-gray-500">Email Totali</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{scanResults.email_classificate}</div>
                    <div className="text-xs text-gray-500">Classificate</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{scanResults.email_non_classificate}</div>
                    <div className="text-xs text-gray-500">Non Classificate</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{scanResults.documenti_salvati}</div>
                    <div className="text-xs text-gray-500">PDF Salvati</div>
                  </div>
                </div>

                {/* Per categoria */}
                {scanResults.per_categoria && Object.keys(scanResults.per_categoria).length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2">Per Categoria:</h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(scanResults.per_categoria).map(([cat, data]) => {
                        const config = getCategoryConfig(cat);
                        return (
                          <div 
                            key={cat}
                            className="px-3 py-2 rounded-lg flex items-center gap-2"
                            style={{ backgroundColor: config.bg, color: config.text }}
                          >
                            <span className="font-medium">{config.label}</span>
                            <span className="bg-white/50 px-2 py-0.5 rounded text-sm">{data.count}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-xs">{data.gestionale_section}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Azioni post-scansione */}
                {!scanSettings.dry_run && scanResults.documenti_salvati > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleProcess}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Processa Documenti
                    </button>
                    <button
                      onClick={handleAssociaTutti}
                      disabled={processing}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Associa al Gestionale
                    </button>
                  </div>
                )}

                {/* Cleanup */}
                {scanResults.email_non_classificate > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-red-700 font-medium">
                          {scanResults.email_non_classificate} email non classificate
                        </span>
                        <p className="text-sm text-red-600 mt-1">
                          Queste email non corrispondono a nessuna regola e possono essere eliminate.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCleanup(false)}
                          className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-100"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleCleanup(true)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
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
          {stats?.mapping_gestionale && (
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
