import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Save, Trash2, RefreshCw, Lightbulb, 
  Building2, Tag, FileText, CheckCircle, AlertCircle, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function FornitoriLearning() {
  const [activeTab, setActiveTab] = useState('non-classificati');
  const [fornitoriNonClassificati, setFornitoriNonClassificati] = useState([]);
  const [fornitoriConfigurati, setFornitoriConfigurati] = useState([]);
  const [centriCosto, setCentriCosto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Form per nuovo fornitore
  const [selectedFornitore, setSelectedFornitore] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [centroCostoSuggerito, setCentroCostoSuggerito] = useState('');
  const [note, setNote] = useState('');
  const [keywordsSuggerite, setKeywordsSuggerite] = useState([]);

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    setLoading(true);
    try {
      const [nonClass, config, cdc] = await Promise.all([
        fetch(`${API_URL}/api/fornitori-learning/non-classificati?limit=100`).then(r => r.json()),
        fetch(`${API_URL}/api/fornitori-learning/lista`).then(r => r.json()),
        fetch(`${API_URL}/api/fornitori-learning/centri-costo-disponibili`).then(r => r.json())
      ]);
      
      setFornitoriNonClassificati(nonClass.fornitori || []);
      setFornitoriConfigurati(config.fornitori || []);
      setCentriCosto(cdc || []);
    } catch (error) {
      console.error('Errore caricamento:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
    }
    setLoading(false);
  };

  const selezionaFornitore = async (fornitore) => {
    setSelectedFornitore(fornitore);
    setKeywords('');
    setCentroCostoSuggerito('');
    setNote('');
    
    try {
      const res = await fetch(
        `${API_URL}/api/fornitori-learning/suggerisci-keywords/${encodeURIComponent(fornitore.fornitore_nome)}`
      );
      const data = await res.json();
      setKeywordsSuggerite(data.keywords_suggerite || []);
    } catch (error) {
      console.error('Errore suggerimenti:', error);
    }
  };

  const salvaFornitore = async () => {
    if (!selectedFornitore || !keywords.trim()) {
      setMessage({ type: 'error', text: 'Inserisci almeno una keyword' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/fornitori-learning/salva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornitore_nome: selectedFornitore.fornitore_nome,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
          centro_costo_suggerito: centroCostoSuggerito || null,
          note: note || null
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Fornitore salvato!' });
        setSelectedFornitore(null);
        setKeywords('');
        caricaDati();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    }
    setSaving(false);
  };

  const eliminaFornitore = async (fornitoreId) => {
    if (!window.confirm('Eliminare questa configurazione?')) return;
    
    try {
      await fetch(`${API_URL}/api/fornitori-learning/${fornitoreId}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Eliminato' });
      caricaDati();
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore eliminazione' });
    }
  };

  const riclassifica = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fornitori-learning/riclassifica-con-keywords`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Riclassificate ${data.totale_riclassificate} fatture!` });
        caricaDati();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore riclassificazione' });
    }
    setLoading(false);
  };

  const aggiungiKeywordSuggerita = (keyword) => {
    const current = keywords ? keywords.split(',').map(k => k.trim()) : [];
    if (!current.includes(keyword)) {
      setKeywords([...current, keyword].join(', '));
    }
  };

  // Stile Dashboard
  const cardStyle = {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  };

  const headerStyle = {
    margin: 0,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e3a5f'
  };

  const btnPrimary = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 13,
    boxShadow: '0 2px 4px rgba(102,126,234,0.3)'
  };

  const btnOutline = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 13
  };

  if (loading && fornitoriNonClassificati.length === 0) {
    return (
      <div style={cardStyle}>
        <h1 style={headerStyle}>Fornitori Learning</h1>
        <p style={{ color: '#6b7280', marginTop: 16 }}>⏳ Caricamento in corso...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={headerStyle}>Fornitori Learning</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0 0' }}>
              Configura keywords per classificare automaticamente i fornitori
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={caricaDati} style={btnOutline} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Aggiorna
            </button>
            <button onClick={riclassifica} style={btnPrimary} disabled={loading || fornitoriConfigurati.length === 0}>
              <CheckCircle size={16} />
              Riclassifica Fatture
            </button>
          </div>
        </div>
      </div>

      {/* Messaggio */}
      {message && (
        <div style={{
          ...cardStyle,
          padding: 12,
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {message.type === 'success' ? 
            <CheckCircle size={18} color="#16a34a" /> : 
            <AlertCircle size={18} color="#dc2626" />
          }
          <span style={{ color: message.type === 'success' ? '#166534' : '#991b1b', fontWeight: 500 }}>
            {message.text}
          </span>
          <button 
            onClick={() => setMessage(null)} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Statistiche */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(245,158,11,0.2)', padding: 12, borderRadius: 10 }}>
              <AlertCircle size={24} color="#d97706" />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: '#92400e' }}>
                {fornitoriNonClassificati.length}
              </p>
              <p style={{ fontSize: 13, color: '#a16207', margin: 0 }}>Da configurare</p>
            </div>
          </div>
        </div>
        
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(16,185,129,0.2)', padding: 12, borderRadius: 10 }}>
              <CheckCircle size={24} color="#059669" />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: '#065f46' }}>
                {fornitoriConfigurati.length}
              </p>
              <p style={{ fontSize: 13, color: '#047857', margin: 0 }}>Configurati</p>
            </div>
          </div>
        </div>
        
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(59,130,246,0.2)', padding: 12, borderRadius: 10 }}>
              <Tag size={24} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: '#1e40af' }}>
                {centriCosto.length}
              </p>
              <p style={{ fontSize: 13, color: '#1d4ed8', margin: 0 }}>Centri di Costo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
          <button
            onClick={() => setActiveTab('non-classificati')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'non-classificati' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeTab === 'non-classificati' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Da Configurare ({fornitoriNonClassificati.length})
          </button>
          <button
            onClick={() => setActiveTab('configurati')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'configurati' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeTab === 'configurati' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Configurati ({fornitoriConfigurati.length})
          </button>
        </div>

        {/* Tab Non Classificati */}
        {activeTab === 'non-classificati' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Lista fornitori */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a5f', marginBottom: 12 }}>
                Seleziona Fornitore
              </h3>
              <div style={{ maxHeight: 450, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                {fornitoriNonClassificati.map((f, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selezionaFornitore(f)}
                    style={{
                      padding: 12,
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selectedFornitore?.fornitore_nome === f.fornitore_nome ? '#eff6ff' : 'white',
                      borderLeft: selectedFornitore?.fornitore_nome === f.fornitore_nome ? '4px solid #3b82f6' : '4px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 14 }}>
                          {f.fornitore_nome}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>
                          {f.fatture_count} fatture • €{f.totale_fatture?.toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                        {f.esempio_descrizioni?.[0] && (
                          <p style={{ color: '#9ca3af', fontSize: 11, margin: '4px 0 0 0', fontStyle: 'italic' }}>
                            {f.esempio_descrizioni[0].substring(0, 60)}...
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} color="#9ca3af" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form configurazione */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e3a5f', marginBottom: 12 }}>
                {selectedFornitore ? 'Configura Keywords' : 'Seleziona un Fornitore'}
              </h3>
              
              {selectedFornitore ? (
                <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  {/* Fornitore selezionato */}
                  <div style={{ background: 'white', padding: 12, borderRadius: 6, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                    <p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>{selectedFornitore.fornitore_nome}</p>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0 0' }}>
                      {selectedFornitore.fatture_count} fatture • €{selectedFornitore.totale_fatture?.toLocaleString('it-IT')}
                    </p>
                  </div>

                  {/* Keywords suggerite */}
                  {keywordsSuggerite.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                        <Lightbulb size={16} color="#eab308" />
                        Suggerimenti (clicca per aggiungere)
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {keywordsSuggerite.slice(0, 10).map((kw, idx) => (
                          <span 
                            key={idx}
                            onClick={() => aggiungiKeywordSuggerita(kw)}
                            style={{
                              padding: '4px 10px',
                              background: '#e0e7ff',
                              color: '#4338ca',
                              borderRadius: 20,
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            + {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Keywords input */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      Keywords (separate da virgola)
                    </label>
                    <input 
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="es: caffè, cappuccino, espresso"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Centro di costo */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      Centro di Costo
                    </label>
                    <select 
                      value={centroCostoSuggerito}
                      onChange={(e) => setCentroCostoSuggerito(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 14,
                        background: 'white',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">-- Classificazione automatica --</option>
                      {centriCosto.map((cdc) => (
                        <option key={cdc.id} value={cdc.id}>
                          {cdc.codice} - {cdc.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Note */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      Note (opzionale)
                    </label>
                    <input 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Es: Fornitore principale caffè"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Pulsanti */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={salvaFornitore} disabled={saving} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                      <Save size={16} />
                      {saving ? 'Salvataggio...' : 'Salva Keywords'}
                    </button>
                    <button onClick={() => setSelectedFornitore(null)} style={btnOutline}>
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  background: '#f9fafb', 
                  padding: 40, 
                  borderRadius: 8, 
                  textAlign: 'center',
                  border: '2px dashed #d1d5db'
                }}>
                  <Building2 size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                  <p style={{ color: '#6b7280', margin: 0 }}>Seleziona un fornitore dalla lista</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Configurati */}
        {activeTab === 'configurati' && (
          <div>
            {fornitoriConfigurati.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Tag size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                <p style={{ color: '#6b7280' }}>Nessun fornitore configurato</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {fornitoriConfigurati.map((f, idx) => (
                  <div key={idx} style={{
                    padding: 16,
                    background: '#f9fafb',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 15 }}>
                          {f.fornitore_nome}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 8px 0' }}>
                          {f.fatture_count} fatture • €{f.totale_fatture?.toLocaleString('it-IT')}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {f.keywords?.map((kw, kidx) => (
                            <span key={kidx} style={{
                              padding: '3px 10px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 500
                            }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                        {f.centro_costo_suggerito && (
                          <p style={{ color: '#059669', fontSize: 12, margin: '8px 0 0 0', fontWeight: 500 }}>
                            → {f.centro_costo_suggerito}
                          </p>
                        )}
                        {f.note && (
                          <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0 0', fontStyle: 'italic' }}>
                            {f.note}
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={() => eliminaFornitore(f.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 8,
                          borderRadius: 6
                        }}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
