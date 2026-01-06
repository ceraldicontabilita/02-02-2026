import { useState, useEffect, useCallback } from 'react';
import { Upload, Download, RefreshCw, Plus, Trash2, Search, Check, X, Edit2, Save, ArrowRight } from 'lucide-react';

const API = '';

export default function RegoleCategorizzazione() {
  const [regole, setRegole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('associazioni');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({ pattern: '', categoria: '', note: '' });
  const [editingRule, setEditingRule] = useState(null);
  const [editingCategoria, setEditingCategoria] = useState(null);

  const fetchRegole = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/regole/regole`);
      if (res.ok) {
        const data = await res.json();
        setRegole(data);
      }
    } catch (err) {
      console.error('Errore caricamento regole:', err);
      setMessage({ type: 'error', text: 'Errore nel caricamento delle regole' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRegole();
  }, [fetchRegole]);

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch(`${API}/api/regole/download-regole`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'regole_categorizzazione.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'File Excel scaricato!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nel download' });
    }
  };

  const handleUploadExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'Il file deve essere in formato Excel (.xlsx)' });
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/api/regole/upload-regole`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Caricate: ${data.regole_fornitori_caricate} fornitori, ${data.regole_descrizioni_caricate} descrizioni` });
        fetchRegole();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Errore nel caricamento' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nel caricamento del file' });
    }
    setUploading(false);
    event.target.value = '';
  };

  const handleAddRule = async () => {
    if (!newRule.pattern || !newRule.categoria) {
      setMessage({ type: 'error', text: 'Pattern e categoria sono obbligatori' });
      return;
    }
    try {
      const endpoint = 'fornitore'; // Default per nuove regole
      const res = await fetch(`${API}/api/regole/regole/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Regola aggiunta!` });
        setShowAddForm(false);
        setNewRule({ pattern: '', categoria: '', note: '' });
        fetchRegole();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiunta della regola' });
    }
  };

  const handleDeleteRule = async (tipo, pattern) => {
    if (!window.confirm(`Eliminare la regola "${pattern}"?`)) return;
    try {
      const res = await fetch(`${API}/api/regole/regole/${tipo}/${encodeURIComponent(pattern)}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Regola eliminata!' });
        fetchRegole();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nell\'eliminazione' });
    }
  };

  const handleSaveCategoria = async () => {
    if (!editingCategoria) return;
    try {
      const res = await fetch(`${API}/api/regole/categorie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategoria)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Categoria salvata!' });
        setEditingCategoria(null);
        fetchRegole();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio categoria' });
    }
  };

  const handleRicategorizza = async () => {
    if (!window.confirm('Ricategorizzare tutte le fatture con le nuove regole?')) return;
    setMessage({ type: 'info', text: 'Ricategorizzazione in corso...' });
    try {
      const res = await fetch(`${API}/api/contabilita/ricategorizza-fatture`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Ricategorizzate ${data.fatture_processate} fatture!` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore nella ricategorizzazione' });
    }
  };

  const filteredRules = (rules) => {
    if (!searchTerm) return rules || [];
    const term = searchTerm.toLowerCase();
    return (rules || []).filter(r => 
      r.pattern?.toLowerCase().includes(term) || 
      r.categoria?.toLowerCase().includes(term) ||
      r.note?.toLowerCase().includes(term)
    );
  };

  // Raggruppa regole per categoria
  const getAssociazioni = () => {
    const assoc = {};
    (regole?.regole_fornitori || []).forEach(r => {
      const cat = r.categoria || 'non_categorizzato';
      if (!assoc[cat]) assoc[cat] = { fornitori: [], descrizioni: [] };
      assoc[cat].fornitori.push(r.pattern);
    });
    (regole?.regole_descrizioni || []).forEach(r => {
      const cat = r.categoria || 'non_categorizzato';
      if (!assoc[cat]) assoc[cat] = { fornitori: [], descrizioni: [] };
      assoc[cat].descrizioni.push(r.pattern);
    });
    return assoc;
  };

  const getCategoryInfo = (catName) => {
    const cat = (regole?.categorie || []).find(c => c.categoria === catName);
    return cat || { conto: '-', deducibilita_ires: 100, deducibilita_irap: 100 };
  };

  const formatCategoryName = (name) => {
    return (name || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento regole...</div>
      </div>
    );
  }

  const associazioni = getAssociazioni();

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6" data-testid="regole-categorizzazione-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Regole di Categorizzazione</h1>
          <p className="text-slate-400">Associazioni Fornitore/Descrizione → Categoria Contabile</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 
            message.type === 'info' ? 'bg-blue-900/50 text-blue-300' :
            'bg-red-900/50 text-red-300'
          }`}>
            {message.type === 'success' && <Check className="w-5 h-5" />}
            {message.type === 'error' && <X className="w-5 h-5" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
          <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
            <Download className="w-4 h-4" /> Scarica Excel
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm">
            <Upload className="w-4 h-4" /> {uploading ? 'Caricamento...' : 'Carica Excel'}
            <input type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} className="hidden" disabled={uploading} />
          </label>
          <button onClick={handleRicategorizza} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" /> Applica alle Fatture
          </button>
          <div className="ml-auto flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-white outline-none w-40"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Regole Fornitori</p>
            <p className="text-2xl font-bold text-blue-400">{regole?.regole_fornitori?.length || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Regole Descrizioni</p>
            <p className="text-2xl font-bold text-green-400">{regole?.regole_descrizioni?.length || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Categorie</p>
            <p className="text-2xl font-bold text-purple-400">{regole?.categorie?.length || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Totale Regole</p>
            <p className="text-2xl font-bold text-orange-400">{regole?.totale_regole || 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['associazioni', 'fornitori', 'descrizioni', 'categorie'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab === 'associazioni' ? '📊 Mappa Associazioni' : 
               tab === 'fornitori' ? 'Regole Fornitori' : 
               tab === 'descrizioni' ? 'Regole Descrizioni' : 'Categorie & Deducibilità'}
            </button>
          ))}
        </div>

        {/* Tab: ASSOCIAZIONI (nuovo tab principale) */}
        {activeTab === 'associazioni' && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-700/30">
              <h3 className="text-white font-medium">Mappa Associazioni: Chi → Cosa → Categoria</h3>
              <p className="text-slate-400 text-sm mt-1">Vedi a colpo d&apos;occhio come sono associate le regole</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-700/50">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium w-1/4">Categoria Contabile</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Conto</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Fornitori Associati</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Parole Chiave</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium w-20">Ded. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {Object.entries(associazioni)
                    .filter(([cat]) => !searchTerm || cat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      associazioni[cat].fornitori.some(f => f.toLowerCase().includes(searchTerm.toLowerCase())) ||
                      associazioni[cat].descrizioni.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .sort((a, b) => (b[1].fornitori.length + b[1].descrizioni.length) - (a[1].fornitori.length + a[1].descrizioni.length))
                    .map(([categoria, data]) => {
                      const catInfo = getCategoryInfo(categoria);
                      const totalRules = data.fornitori.length + data.descrizioni.length;
                      return (
                        <tr key={categoria} className="hover:bg-slate-700/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs font-medium">
                                {formatCategoryName(categoria)}
                              </span>
                              <span className="text-slate-500 text-xs">({totalRules})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-slate-700 text-slate-200 rounded font-mono text-xs">
                              {catInfo.conto}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {data.fornitori.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {data.fornitori.slice(0, 5).map((f, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">
                                    {f}
                                  </span>
                                ))}
                                {data.fornitori.length > 5 && (
                                  <span className="text-slate-500 text-xs">+{data.fornitori.length - 5} altri</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {data.descrizioni.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {data.descrizioni.slice(0, 5).map((d, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-green-900/50 text-green-300 rounded text-xs">
                                    {d}
                                  </span>
                                ))}
                                {data.descrizioni.length > 5 && (
                                  <span className="text-slate-500 text-xs">+{data.descrizioni.length - 5}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={catInfo.deducibilita_ires < 100 ? 'text-orange-400' : 'text-green-400'}>
                              {catInfo.deducibilita_ires}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            {Object.keys(associazioni).length === 0 && (
              <div className="p-8 text-center text-slate-400">Nessuna associazione trovata</div>
            )}
          </div>
        )}

        {/* Tab: Fornitori */}
        {activeTab === 'fornitori' && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <span className="text-white font-medium">Regole per Nome Fornitore</span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                <Plus className="w-4 h-4" /> Aggiungi
              </button>
            </div>
            
            {showAddForm && (
              <div className="p-4 bg-slate-700/50 border-b border-slate-700 flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Nome Fornitore (contiene)</label>
                  <input
                    type="text"
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({...newRule, pattern: e.target.value})}
                    className="bg-slate-700 text-white px-3 py-2 rounded w-48"
                    placeholder="es. KIMBO"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Categoria</label>
                  <select
                    value={newRule.categoria}
                    onChange={(e) => setNewRule({...newRule, categoria: e.target.value})}
                    className="bg-slate-700 text-white px-3 py-2 rounded w-48"
                  >
                    <option value="">Seleziona...</option>
                    {regole?.categorie?.map((cat, i) => (
                      <option key={i} value={cat.categoria}>{formatCategoryName(cat.categoria)}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleAddRule} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1">
                  <Save className="w-4 h-4" /> Salva
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-600 text-white rounded">
                  Annulla
                </button>
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Se Fornitore contiene...</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium w-12"><ArrowRight className="w-4 h-4 mx-auto" /></th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Assegna Categoria</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Note</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium w-20">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredRules(regole?.regole_fornitori).map((regola, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded font-mono text-xs">
                        {regola.pattern}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <ArrowRight className="w-4 h-4 text-slate-500 mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                        {formatCategoryName(regola.categoria)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{regola.note || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteRule('fornitore', regola.pattern)}
                        className="p-1.5 hover:bg-red-900/50 rounded text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRules(regole?.regole_fornitori).length === 0 && (
              <div className="p-8 text-center text-slate-400">Nessuna regola fornitore</div>
            )}
          </div>
        )}

        {/* Tab: Descrizioni */}
        {activeTab === 'descrizioni' && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <span className="text-white font-medium">Regole per Parole Chiave nella Descrizione</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Se Descrizione contiene...</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium w-12"><ArrowRight className="w-4 h-4 mx-auto" /></th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Assegna Categoria</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Note</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium w-20">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredRules(regole?.regole_descrizioni).map((regola, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded font-mono text-xs">
                        {regola.pattern}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <ArrowRight className="w-4 h-4 text-slate-500 mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                        {formatCategoryName(regola.categoria)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{regola.note || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteRule('descrizione', regola.pattern)}
                        className="p-1.5 hover:bg-red-900/50 rounded text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRules(regole?.regole_descrizioni).length === 0 && (
              <div className="p-8 text-center text-slate-400">Nessuna regola descrizione</div>
            )}
          </div>
        )}

        {/* Tab: Categorie */}
        {activeTab === 'categorie' && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <span className="text-white font-medium">Categorie Contabili e Deducibilità Fiscale</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/50">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Categoria</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Codice Conto</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Ded. IRES %</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Ded. IRAP %</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium w-20">Modifica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredRules(regole?.categorie).map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-700/30">
                    {editingCategoria?.original === cat.categoria ? (
                      <>
                        <td className="py-2 px-4 text-white capitalize">{formatCategoryName(cat.categoria)}</td>
                        <td className="py-2 px-4">
                          <input 
                            type="text" 
                            value={editingCategoria.conto} 
                            onChange={(e) => setEditingCategoria({...editingCategoria, conto: e.target.value})} 
                            className="bg-slate-700 text-white px-2 py-1 rounded w-24 font-mono" 
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={editingCategoria.deducibilita_ires} 
                            onChange={(e) => setEditingCategoria({...editingCategoria, deducibilita_ires: parseFloat(e.target.value) || 0})} 
                            className="bg-slate-700 text-white px-2 py-1 rounded w-20 text-right" 
                          />
                        </td>
                        <td className="py-2 px-4 text-right">
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={editingCategoria.deducibilita_irap} 
                            onChange={(e) => setEditingCategoria({...editingCategoria, deducibilita_irap: parseFloat(e.target.value) || 0})} 
                            className="bg-slate-700 text-white px-2 py-1 rounded w-20 text-right" 
                          />
                        </td>
                        <td className="py-2 px-4 text-center flex gap-1 justify-center">
                          <button onClick={handleSaveCategoria} className="p-1.5 bg-green-600 hover:bg-green-700 rounded text-white">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingCategoria(null)} className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-white capitalize">{formatCategoryName(cat.categoria)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-slate-700 text-slate-200 rounded font-mono text-xs">{cat.conto}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cat.deducibilita_ires < 100 ? 'text-orange-400 font-medium' : 'text-green-400'}>
                            {cat.deducibilita_ires}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cat.deducibilita_irap < 100 ? 'text-orange-400 font-medium' : 'text-green-400'}>
                            {cat.deducibilita_irap}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setEditingCategoria({ ...cat, original: cat.categoria })}
                            className="p-1.5 hover:bg-blue-900/50 rounded text-blue-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Help */}
        <div className="mt-6 bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-white font-medium mb-2">Come funziona</h4>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• <strong className="text-white">Mappa Associazioni</strong>: Vedi tutte le regole raggruppate per categoria</li>
            <li>• <strong className="text-white">Regole Fornitori</strong>: Se il nome fornitore contiene &quot;X&quot; → assegna categoria Y</li>
            <li>• <strong className="text-white">Regole Descrizioni</strong>: Se la descrizione contiene &quot;X&quot; → assegna categoria Y</li>
            <li>• <strong className="text-white">Deducibilità</strong>: Percentuale deducibile ai fini IRES/IRAP</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
