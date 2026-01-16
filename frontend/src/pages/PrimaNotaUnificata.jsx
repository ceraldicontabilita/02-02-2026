import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { formatEuro } from '../lib/utils';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { useParams } from 'react-router-dom';
import { ExportButton } from '../components/ExportButton';
import { PageInfoCard } from '../components/PageInfoCard';

/**
 * PRIMA NOTA UNIFICATA
 * 
 * Una sola pagina con filtri per:
 * - Cassa (corrispettivi, POS, versamenti, pagamenti fornitori)
 * - Banca
 * - Salari
 * - Tutti
 */

const FILTRI_TIPO = [
  { id: 'tutti', label: '📋 Tutti', color: '#3b82f6' },
  { id: 'cassa', label: '💰 Cassa', color: '#f59e0b' },
  { id: 'banca', label: '🏦 Banca', color: '#10b981' },
  { id: 'salari', label: '👤 Salari', color: '#8b5cf6' },
];

// Categorie per Prima Nota Cassa
const CATEGORIE_CASSA = {
  corrispettivi: { label: 'Corrispettivi', color: '#10b981', icon: '📈' },
  pos: { label: 'POS', color: '#3b82f6', icon: '💳' },
  versamento: { label: 'Versamento', color: '#8b5cf6', icon: '🏦' },
  pagamento_fornitore: { label: 'Pagamento fornitore', color: '#f59e0b', icon: '📄' },
  prelievo: { label: 'Prelievo', color: '#ef4444', icon: '💸' },
  altro: { label: 'Altro', color: '#6b7280', icon: '📝' }
};

export default function PrimaNotaUnificata() {
  const { anno } = useAnnoGlobale();
  const { tipo: tipoParam } = useParams();
  const [loading, setLoading] = useState(true);
  const [movimenti, setMovimenti] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState(tipoParam || 'cassa');
  const [filtroMese, setFiltroMese] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form nuovo movimento
  const [newMov, setNewMov] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'uscita',
    importo: '',
    descrizione: '',
    categoria: 'corrispettivi',
    fornitore: ''
  });

  useEffect(() => {
    if (tipoParam) setFiltroTipo(tipoParam);
  }, [tipoParam]);

  useEffect(() => {
    loadMovimenti();
  }, [anno]);

  const loadMovimenti = async () => {
    setLoading(true);
    try {
      // Carica tutti i movimenti dalle varie collezioni
      const [cassaRes, bancaRes, salariRes] = await Promise.all([
        api.get(`/api/prima-nota/cassa?anno=${anno}`).catch(() => ({ data: [] })),
        api.get(`/api/prima-nota/banca?anno=${anno}`).catch(() => ({ data: [] })),
        api.get(`/api/prima-nota/salari?anno=${anno}`).catch(() => ({ data: [] }))
      ]);

      // Normalizza e combina
      const cassa = (Array.isArray(cassaRes.data) ? cassaRes.data : cassaRes.data?.movimenti || []).map(m => ({ ...m, _source: 'cassa' }));
      const banca = (Array.isArray(bancaRes.data) ? bancaRes.data : bancaRes.data?.movimenti || []).map(m => ({ ...m, _source: 'banca' }));
      const salari = (Array.isArray(salariRes.data) ? salariRes.data : salariRes.data?.movimenti || []).map(m => ({ ...m, _source: 'salari' }));

      const all = [...cassa, ...banca, ...salari].sort((a, b) => 
        new Date(b.data || b.data_pagamento) - new Date(a.data || a.data_pagamento)
      );
      
      setMovimenti(all);
    } catch (e) {
      console.error('Errore:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtra movimenti
  const movimentiFiltrati = useMemo(() => {
    return movimenti.filter(m => {
      // Filtro tipo
      if (filtroTipo !== 'tutti' && m._source !== filtroTipo) return false;
      
      // Filtro mese
      if (filtroMese) {
        const mese = new Date(m.data || m.data_pagamento).getMonth() + 1;
        if (mese !== parseInt(filtroMese)) return false;
      }
      
      // Ricerca testo
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const desc = (m.descrizione || m.causale || '').toLowerCase();
        const forn = (m.fornitore || m.beneficiario || '').toLowerCase();
        if (!desc.includes(searchLower) && !forn.includes(searchLower)) return false;
      }
      
      return true;
    });
  }, [movimenti, filtroTipo, filtroMese, search]);

  // Calcola saldo progressivo
  const movimentiConSaldo = useMemo(() => {
    // Ordina per data crescente per calcolare il saldo
    const sorted = [...movimentiFiltrati].sort((a, b) => 
      new Date(a.data || a.data_pagamento) - new Date(b.data || b.data_pagamento)
    );
    
    let saldo = 0;
    const withSaldo = sorted.map(m => {
      const importo = Math.abs(m.importo || 0);
      const isEntrata = m.tipo === 'entrata' || (m.importo || 0) > 0;
      saldo += isEntrata ? importo : -importo;
      return { ...m, _saldo: saldo };
    });
    
    // Riordina per data decrescente per la visualizzazione
    return withSaldo.sort((a, b) => 
      new Date(b.data || b.data_pagamento) - new Date(a.data || a.data_pagamento)
    );
  }, [movimentiFiltrati]);

  // Calcola totali
  const totali = useMemo(() => {
    const entrate = movimentiFiltrati.filter(m => m.tipo === 'entrata' || (m.importo || 0) > 0);
    const uscite = movimentiFiltrati.filter(m => m.tipo === 'uscita' || (m.importo || 0) < 0);
    
    return {
      entrate: entrate.reduce((sum, m) => sum + Math.abs(m.importo || 0), 0),
      uscite: uscite.reduce((sum, m) => sum + Math.abs(m.importo || 0), 0),
      saldo: entrate.reduce((sum, m) => sum + Math.abs(m.importo || 0), 0) - uscite.reduce((sum, m) => sum + Math.abs(m.importo || 0), 0)
    };
  }, [movimentiFiltrati]);

  // Statistiche per categoria (solo cassa)
  const statsCassa = useMemo(() => {
    const cassaMov = movimenti.filter(m => m._source === 'cassa');
    
    const corrispettivi = cassaMov.filter(m => 
      (m.categoria || '').toLowerCase() === 'corrispettivi' || 
      (m.descrizione || '').toLowerCase().includes('corrispettivo')
    ).reduce((sum, m) => sum + Math.abs(m.importo || 0), 0);
    
    const pos = cassaMov.filter(m => 
      (m.categoria || '').toLowerCase() === 'pos' || 
      (m.descrizione || '').toLowerCase().includes('pos')
    ).reduce((sum, m) => sum + Math.abs(m.importo || 0), 0);
    
    const versamenti = cassaMov.filter(m => 
      (m.categoria || '').toLowerCase() === 'versamento' || 
      (m.descrizione || '').toLowerCase().includes('versamento')
    ).reduce((sum, m) => sum + Math.abs(m.importo || 0), 0);
    
    const pagamentiFornitori = cassaMov.filter(m => 
      (m.categoria || '').toLowerCase().includes('fornitore') || 
      (m.descrizione || '').toLowerCase().includes('pagamento fattura')
    ).reduce((sum, m) => sum + Math.abs(m.importo || 0), 0);
    
    return { corrispettivi, pos, versamenti, pagamentiFornitori };
  }, [movimenti]);

  // Aggiungi nuovo movimento
  const handleAddMovimento = async () => {
    if (!newMov.importo || !newMov.descrizione) {
      return alert('Compila importo e descrizione');
    }
    
    setSaving(true);
    try {
      const sourceTipo = filtroTipo === 'tutti' ? 'cassa' : filtroTipo;
      const endpoint = sourceTipo === 'cassa' 
        ? '/api/prima-nota/cassa' 
        : sourceTipo === 'salari'
          ? '/api/prima-nota/salari'
          : '/api/prima-nota/banca';
      
      await api.post(endpoint, {
        data: newMov.data,
        tipo: newMov.tipo,
        importo: parseFloat(newMov.importo),
        descrizione: newMov.descrizione,
        fornitore: newMov.fornitore,
        categoria: newMov.categoria
      });
      
      setShowForm(false);
      setNewMov({
        data: new Date().toISOString().split('T')[0],
        tipo: 'uscita',
        importo: '',
        descrizione: '',
        categoria: 'corrispettivi',
        fornitore: ''
      });
      loadMovimenti();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  // Elimina movimento
  const handleDelete = async (mov) => {
    if (!window.confirm('Eliminare questo movimento?')) return;
    
    try {
      const endpoint = mov._source === 'cassa' 
        ? `/api/prima-nota/cassa/${mov.id}` 
        : mov._source === 'salari'
          ? `/api/prima-nota/salari/${mov.id}`
          : `/api/prima-nota/banca/${mov.id}`;
      
      await api.delete(endpoint);
      loadMovimenti();
    } catch (e) {
      alert('Errore eliminazione: ' + (e.response?.data?.detail || e.message));
    }
  };

  // Formatta categoria per visualizzazione
  const getCategoriaInfo = (m) => {
    const cat = (m.categoria || 'altro').toLowerCase();
    const desc = (m.descrizione || '').toLowerCase();
    
    if (cat === 'corrispettivi' || desc.includes('corrispettivo')) return CATEGORIE_CASSA.corrispettivi;
    if (cat === 'pos' || desc.includes('pos')) return CATEGORIE_CASSA.pos;
    if (cat === 'versamento' || desc.includes('versamento')) return CATEGORIE_CASSA.versamento;
    if (cat.includes('fornitore') || desc.includes('pagamento fattura')) return CATEGORIE_CASSA.pagamento_fornitore;
    if (cat === 'prelievo' || desc.includes('prelievo')) return CATEGORIE_CASSA.prelievo;
    
    return CATEGORIE_CASSA.altro;
  };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      {/* Page Info Card - in alto a destra */}
      <div style={{ position: 'absolute', top: 70, right: 20, zIndex: 100 }}>
        <PageInfoCard pageKey={filtroTipo === 'cassa' ? 'prima-nota-cassa' : filtroTipo === 'banca' ? 'prima-nota-banca' : filtroTipo === 'salari' ? 'prima-nota-salari' : 'prima-nota-banca'} />
      </div>
      
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', color: '#1e293b' }}>
            📒 Prima Nota {filtroTipo !== 'tutti' && `- ${FILTRI_TIPO.find(f => f.id === filtroTipo)?.label.replace(/📋|💰|🏦|👤/g, '').trim()}`}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Anno {anno}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {showForm ? '✕ Chiudi' : '+ Nuovo Movimento'}
          </button>
          
          {/* Export Button */}
          <ExportButton
            data={movimentiFiltrati}
            columns={[
              { key: 'data', label: 'Data' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'descrizione', label: 'Descrizione' },
              { key: 'importo', label: 'Importo' },
              { key: 'categoria', label: 'Categoria' },
              { key: 'fornitore', label: 'Fornitore' }
            ]}
            filename={`prima_nota_${filtroTipo}_${anno}`}
            format="csv"
            variant="default"
          />
        </div>
      </div>

      {/* Card Statistiche Cassa (visibili solo quando filtro = cassa) */}
      {(filtroTipo === 'cassa' || filtroTipo === 'tutti') && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: 12, 
          marginBottom: 20 
        }}>
          <StatCard 
            icon="📈" 
            label="Corrispettivi" 
            value={formatEuro(statsCassa.corrispettivi)} 
            color="#10b981" 
            bgColor="#d1fae5"
          />
          <StatCard 
            icon="💳" 
            label="POS" 
            value={formatEuro(statsCassa.pos)} 
            color="#3b82f6" 
            bgColor="#dbeafe"
          />
          <StatCard 
            icon="🏦" 
            label="Versamenti" 
            value={formatEuro(statsCassa.versamenti)} 
            color="#8b5cf6" 
            bgColor="#ede9fe"
          />
          <StatCard 
            icon="📄" 
            label="Pagam. Fornitori" 
            value={formatEuro(statsCassa.pagamentiFornitori)} 
            color="#f59e0b" 
            bgColor="#fef3c7"
          />
        </div>
      )}

      {/* Form nuovo movimento */}
      {showForm && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          padding: 20, 
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #3b82f6'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>➕ Nuovo Movimento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Data</label>
              <input 
                type="date" 
                value={newMov.data} 
                onChange={e => setNewMov(p => ({ ...p, data: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select 
                value={newMov.tipo} 
                onChange={e => setNewMov(p => ({ ...p, tipo: e.target.value }))}
                style={inputStyle}
              >
                <option value="entrata">Entrata (DARE)</option>
                <option value="uscita">Uscita (AVERE)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select 
                value={newMov.categoria} 
                onChange={e => setNewMov(p => ({ ...p, categoria: e.target.value }))}
                style={inputStyle}
              >
                {Object.entries(CATEGORIE_CASSA).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Importo €</label>
              <input 
                type="number" 
                step="0.01"
                value={newMov.importo} 
                onChange={e => setNewMov(p => ({ ...p, importo: e.target.value }))}
                style={inputStyle}
                placeholder="0.00"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Descrizione</label>
              <input 
                type="text" 
                value={newMov.descrizione} 
                onChange={e => setNewMov(p => ({ ...p, descrizione: e.target.value }))}
                style={inputStyle}
                placeholder="Descrizione movimento..."
              />
            </div>
            <div>
              <label style={labelStyle}>Fornitore/Beneficiario</label>
              <input 
                type="text" 
                value={newMov.fornitore} 
                onChange={e => setNewMov(p => ({ ...p, fornitore: e.target.value }))}
                style={inputStyle}
                placeholder="Opzionale"
              />
            </div>
          </div>
          <button 
            onClick={handleAddMovimento}
            disabled={saving}
            style={{
              marginTop: 16,
              padding: '12px 24px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {saving ? '⏳' : '💾'} Salva Movimento
          </button>
        </div>
      )}

      {/* Filtri */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center'
      }}>
        {/* Filtro tipo */}
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTRI_TIPO.map(f => (
            <button
              key={f.id}
              onClick={() => setFiltroTipo(f.id)}
              style={{
                padding: '8px 14px',
                background: filtroTipo === f.id ? f.color : '#f1f5f9',
                color: filtroTipo === f.id ? 'white' : '#64748b',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        {/* Filtro mese */}
        <select
          value={filtroMese}
          onChange={e => setFiltroMese(e.target.value)}
          style={{ ...inputStyle, width: 'auto', padding: '8px 12px' }}
        >
          <option value="">Tutti i mesi</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][i]}
            </option>
          ))}
        </select>
        
        {/* Ricerca */}
        <input
          type="text"
          placeholder="🔍 Cerca..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200, padding: '8px 12px' }}
        />
        
        <button
          onClick={loadMovimenti}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          🔄
        </button>
      </div>

      {/* Riepilogo totali */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 16, 
        marginBottom: 20 
      }}>
        <div style={{ padding: 16, background: '#dcfce7', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#166534' }}>Entrate (DARE)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d' }}>{formatEuro(totali.entrate)}</div>
        </div>
        <div style={{ padding: 16, background: '#fee2e2', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#991b1b' }}>Uscite (AVERE)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{formatEuro(totali.uscite)}</div>
        </div>
        <div style={{ padding: 16, background: totali.saldo >= 0 ? '#dbeafe' : '#fef3c7', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: totali.saldo >= 0 ? '#1e40af' : '#92400e' }}>Saldo</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: totali.saldo >= 0 ? '#2563eb' : '#d97706' }}>{formatEuro(totali.saldo)}</div>
        </div>
      </div>

      {/* Tabella movimenti */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <span style={{ fontWeight: 600 }}>{movimentiFiltrati.length} movimenti</span>
        </div>
        
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            ⏳ Caricamento...
          </div>
        ) : movimentiFiltrati.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>📋</div>
            <div>Nessun movimento trovato</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <th style={thStyle}>Data</th>
                  <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>T</th>
                  <th style={thStyle}>Cat.</th>
                  <th style={thStyle}>Descrizione</th>
                  <th style={{ ...thStyle, textAlign: 'right', color: '#15803d' }}>DARE</th>
                  <th style={{ ...thStyle, textAlign: 'right', color: '#dc2626' }}>AVERE</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Saldo</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Fattura</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {movimentiConSaldo.map((m, idx) => {
                  const isEntrata = m.tipo === 'entrata' || (m.importo || 0) > 0;
                  const importo = Math.abs(m.importo || 0);
                  const catInfo = getCategoriaInfo(m);
                  const sourceColors = { cassa: '#f59e0b', banca: '#10b981', salari: '#8b5cf6' };
                  
                  return (
                    <tr key={m.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        {new Date(m.data || m.data_pagamento).toLocaleDateString('it-IT')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: isEntrata ? '#dcfce7' : '#fee2e2',
                          color: isEntrata ? '#15803d' : '#dc2626',
                          fontSize: 14
                        }}>
                          {isEntrata ? '↑' : '↓'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: catInfo.color + '20',
                          color: catInfo.color
                        }}>
                          {catInfo.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div>{m.descrizione || m.causale || '-'}</div>
                        {(m.fornitore || m.beneficiario) && (
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{m.fornitore || m.beneficiario}</div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                        {isEntrata ? formatEuro(importo) : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                        {!isEntrata ? formatEuro(importo) : '-'}
                      </td>
                      <td style={{ 
                        ...tdStyle, 
                        textAlign: 'right', 
                        fontWeight: 600,
                        color: m._saldo >= 0 ? '#2563eb' : '#d97706'
                      }}>
                        {formatEuro(m._saldo)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {m.fattura_id ? (
                          <a 
                            href={`/fatture-ricevute/${m.fattura_id}`}
                            style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 12 }}
                          >
                            📄 Vedi
                          </a>
                        ) : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => alert('Modifica in sviluppo')}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14
                          }}
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Card Statistiche
function StatCard({ icon, label, value, color, bgColor }) {
  return (
    <div style={{
      padding: '16px 20px',
      background: bgColor,
      borderRadius: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: color, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 };
const inputStyle = { 
  width: '100%', 
  padding: '10px 12px', 
  border: '1px solid #e5e7eb', 
  borderRadius: 6, 
  fontSize: 13,
  boxSizing: 'border-box'
};
const thStyle = { padding: '12px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' };
const tdStyle = { padding: '10px' };
