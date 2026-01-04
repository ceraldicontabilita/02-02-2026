import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

// Metodi pagamento
const METODI_PAGAMENTO = [
  { value: "contanti", label: "💵 Contanti", color: "#4caf50", termineAuto: "VISTA" },
  { value: "assegno", label: "📝 Assegno", color: "#ff9800", termineAuto: "VISTA" },
  { value: "bonifico", label: "🔄 Bonifico", color: "#2196f3", termineAuto: null },
  { value: "riba", label: "📋 Ri.Ba.", color: "#9c27b0", termineAuto: null },
  { value: "sepa", label: "🏦 SEPA", color: "#00bcd4", termineAuto: null },
  { value: "rid", label: "📥 RID", color: "#3f51b5", termineAuto: null },
  { value: "mav", label: "📄 MAV", color: "#795548", termineAuto: null },
  { value: "f24", label: "🏛️ F24", color: "#f44336", termineAuto: "VISTA" },
];

// Termini pagamento
const TERMINI_PAGAMENTO = [
  { value: "VISTA", label: "A Vista", days: 0 },
  { value: "30GG", label: "30 gg Data Fattura", days: 30 },
  { value: "30GGDFM", label: "30 gg Fine Mese", days: 30 },
  { value: "60GG", label: "60 gg Data Fattura", days: 60 },
  { value: "60GGDFM", label: "60 gg Fine Mese", days: 60 },
  { value: "90GG", label: "90 gg", days: 90 },
  { value: "120GG", label: "120 gg", days: 120 },
];

// Get automatic payment term based on method
const getTermineAutomatico = (metodo) => {
  const m = METODI_PAGAMENTO.find(mp => mp.value === metodo);
  return m?.termineAuto || null;
};

export default function Fornitori() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ denominazione: '', partita_iva: '', metodo_pagamento: 'bonifico', termini_pagamento: '30GG' });
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMetodo, setBulkMetodo] = useState('');
  const [bulkTermine, setBulkTermine] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [search, filterMethod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterMethod) params.append('metodo_pagamento', filterMethod);
      const res = await api.get(`/api/suppliers?${params}`);
      setSuppliers(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start inline editing
  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setEditData({
      metodo_pagamento: supplier.metodo_pagamento || 'bonifico',
      termini_pagamento: supplier.termini_pagamento || '30GG',
      email: supplier.email || '',
      telefono: supplier.telefono || ''
    });
  };

  // Handle method change with auto-term
  const handleMetodoChange = (metodo) => {
    const termineAuto = getTermineAutomatico(metodo);
    setEditData(prev => ({
      ...prev,
      metodo_pagamento: metodo,
      termini_pagamento: termineAuto || prev.termini_pagamento
    }));
  };

  // Save inline edit
  const saveEdit = async (supplierId) => {
    setSaving(true);
    try {
      await api.put(`/api/suppliers/${supplierId}`, editData);
      setEditingId(null);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Create new supplier
  const handleCreate = async () => {
    if (!newSupplier.denominazione) {
      alert('Denominazione obbligatoria');
      return;
    }
    try {
      // Auto-set termine based on metodo
      const termineAuto = getTermineAutomatico(newSupplier.metodo_pagamento);
      const data = {
        ...newSupplier,
        termini_pagamento: termineAuto || newSupplier.termini_pagamento
      };
      await api.post('/api/suppliers', data);
      setShowNewForm(false);
      setNewSupplier({ denominazione: '', partita_iva: '', metodo_pagamento: 'bonifico', termini_pagamento: '30GG' });
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Bulk update
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      alert('Seleziona almeno un fornitore');
      return;
    }
    if (!bulkMetodo && !bulkTermine) {
      alert('Seleziona metodo o termine da applicare');
      return;
    }

    setSaving(true);
    try {
      for (const id of selectedIds) {
        const updateData = {};
        if (bulkMetodo) {
          updateData.metodo_pagamento = bulkMetodo;
          const termineAuto = getTermineAutomatico(bulkMetodo);
          if (termineAuto) updateData.termini_pagamento = termineAuto;
        }
        if (bulkTermine && !getTermineAutomatico(bulkMetodo)) {
          updateData.termini_pagamento = bulkTermine;
        }
        await api.put(`/api/suppliers/${id}`, updateData);
      }
      setSelectedIds([]);
      setBulkMode(false);
      setBulkMetodo('');
      setBulkTermine('');
      loadData();
      alert(`Aggiornati ${selectedIds.length} fornitori`);
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map(s => s.id));
    }
  };

  // Delete supplier
  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo fornitore?')) return;
    try {
      await api.delete(`/api/suppliers/${id}`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Quick set 30gg for selected
  const quickSet30gg = async () => {
    if (selectedIds.length === 0) {
      alert('Seleziona almeno un fornitore');
      return;
    }
    setSaving(true);
    try {
      for (const id of selectedIds) {
        await api.put(`/api/suppliers/${id}`, {
          metodo_pagamento: 'bonifico',
          termini_pagamento: '30GG'
        });
      }
      setSelectedIds([]);
      loadData();
      alert(`${selectedIds.length} fornitori impostati a Bonifico 30gg`);
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Get method badge
  const getMetodoBadge = (metodo) => {
    const m = METODI_PAGAMENTO.find(mp => mp.value === metodo);
    if (!m) return <span style={{ color: '#999' }}>-</span>;
    return (
      <span style={{
        background: m.color,
        color: 'white',
        padding: '3px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 'bold'
      }}>
        {m.label}
      </span>
    );
  };

  // Get termine label
  const getTermineLabel = (termine) => {
    const t = TERMINI_PAGAMENTO.find(tp => tp.value === termine);
    return t?.label || termine || '-';
  };

  // Stats
  const stats = {
    totale: suppliers.length,
    contanti: suppliers.filter(s => s.metodo_pagamento === 'contanti').length,
    bonifico: suppliers.filter(s => s.metodo_pagamento === 'bonifico').length,
    assegno: suppliers.filter(s => s.metodo_pagamento === 'assegno').length,
    trentaGg: suppliers.filter(s => s.termini_pagamento === '30GG' || s.termini_pagamento === '30GGDFM').length,
  };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <h1 style={{ marginBottom: 10, fontSize: 'clamp(20px, 5vw, 28px)' }}>📦 Gestione Fornitori</h1>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2196f3' }}>{stats.totale}</div>
          <div style={{ fontSize: 11, color: '#666' }}>Totale</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4caf50' }}>{stats.contanti}</div>
          <div style={{ fontSize: 11, color: '#666' }}>Contanti</div>
        </div>
        <div style={{ background: '#fff3e0', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff9800' }}>{stats.assegno}</div>
          <div style={{ fontSize: 11, color: '#666' }}>Assegno</div>
        </div>
        <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#2196f3' }}>{stats.bonifico}</div>
          <div style={{ fontSize: 11, color: '#666' }}>Bonifico</div>
        </div>
        <div style={{ background: '#f3e5f5', padding: 12, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#9c27b0' }}>{stats.trentaGg}</div>
          <div style={{ fontSize: 11, color: '#666' }}>30 Giorni</div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Cerca fornitore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', minWidth: 200, flex: '1 1 200px' }}
        />
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}
        >
          <option value="">Tutti i metodi</option>
          {METODI_PAGAMENTO.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        
        <button
          onClick={() => setShowNewForm(true)}
          style={{ padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          ➕ Nuovo
        </button>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          style={{ 
            padding: '8px 16px', 
            background: bulkMode ? '#ff9800' : '#9e9e9e', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer' 
          }}
        >
          {bulkMode ? '✓ Modifica Multipla' : '☐ Modifica Multipla'}
        </button>
      </div>

      {/* Bulk Actions */}
      {bulkMode && (
        <div style={{ 
          background: '#fff3e0', 
          padding: 15, 
          borderRadius: 8, 
          marginBottom: 15,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 'bold' }}>📋 Selezionati: {selectedIds.length}</span>
          <button onClick={selectAll} style={{ padding: '6px 12px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {selectedIds.length === suppliers.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
          </button>
          <select
            value={bulkMetodo}
            onChange={(e) => {
              setBulkMetodo(e.target.value);
              const termineAuto = getTermineAutomatico(e.target.value);
              if (termineAuto) setBulkTermine(termineAuto);
            }}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd' }}
          >
            <option value="">Metodo...</option>
            {METODI_PAGAMENTO.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={bulkTermine}
            onChange={(e) => setBulkTermine(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd' }}
            disabled={getTermineAutomatico(bulkMetodo)}
          >
            <option value="">Termine...</option>
            {TERMINI_PAGAMENTO.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button 
            onClick={handleBulkUpdate} 
            disabled={saving}
            style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {saving ? '⏳' : '✓'} Applica
          </button>
          <button 
            onClick={quickSet30gg} 
            disabled={saving}
            style={{ padding: '6px 12px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            🔄 Imposta 30gg
          </button>
        </div>
      )}

      {/* Info Box */}
      <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 13 }}>
        <strong>💡 Regole automatiche:</strong> Contanti/Assegno/F24 → Termine "A Vista" | Bonifico → Seleziona termine (30/60/90 gg)
      </div>

      {/* Suppliers Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800, background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                {bulkMode && <th style={{ padding: 10, width: 40 }}>☐</th>}
                <th style={{ padding: 10, textAlign: 'left' }}>Fornitore</th>
                <th style={{ padding: 10, textAlign: 'left' }}>P.IVA</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Metodo Pag.</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Termine</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup, idx) => (
                <tr key={sup.id} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  {bulkMode && (
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sup.id)}
                        onChange={() => toggleSelect(sup.id)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  <td style={{ padding: 10 }}>
                    <strong>{sup.denominazione || sup.ragione_sociale || 'N/A'}</strong>
                    {sup.indirizzo && <div style={{ fontSize: 11, color: '#666' }}>📍 {sup.indirizzo}</div>}
                  </td>
                  <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 12 }}>
                    {sup.partita_iva || '-'}
                  </td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    {editingId === sup.id ? (
                      <select
                        value={editData.metodo_pagamento}
                        onChange={(e) => handleMetodoChange(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                      >
                        {METODI_PAGAMENTO.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    ) : (
                      getMetodoBadge(sup.metodo_pagamento)
                    )}
                  </td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    {editingId === sup.id ? (
                      <select
                        value={editData.termini_pagamento}
                        onChange={(e) => setEditData({ ...editData, termini_pagamento: e.target.value })}
                        disabled={getTermineAutomatico(editData.metodo_pagamento)}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          border: '1px solid #ddd', 
                          fontSize: 12,
                          background: getTermineAutomatico(editData.metodo_pagamento) ? '#f5f5f5' : 'white'
                        }}
                      >
                        {TERMINI_PAGAMENTO.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        background: sup.termini_pagamento === 'VISTA' ? '#e8f5e9' : '#e3f2fd',
                        color: sup.termini_pagamento === 'VISTA' ? '#4caf50' : '#2196f3'
                      }}>
                        {getTermineLabel(sup.termini_pagamento)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    {editingId === sup.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(sup.id)}
                          disabled={saving}
                          style={{ padding: '4px 10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 5 }}
                        >
                          {saving ? '⏳' : '✓'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{ padding: '4px 10px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(sup)}
                          style={{ padding: '4px 10px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', marginRight: 5 }}
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(sup.id)}
                          style={{ padding: '4px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          title="Elimina"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {suppliers.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#666', background: 'white' }}>
              Nessun fornitore trovato
            </div>
          )}
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={() => setShowNewForm(false)}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 24, maxWidth: 500, width: '100%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>➕ Nuovo Fornitore</h2>
            
            <div style={{ display: 'grid', gap: 15 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: 12 }}>Denominazione *</label>
                <input
                  type="text"
                  value={newSupplier.denominazione}
                  onChange={(e) => setNewSupplier({ ...newSupplier, denominazione: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: 12 }}>Partita IVA</label>
                <input
                  type="text"
                  value={newSupplier.partita_iva}
                  onChange={(e) => setNewSupplier({ ...newSupplier, partita_iva: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #ddd', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: 12 }}>Metodo Pagamento</label>
                  <select
                    value={newSupplier.metodo_pagamento}
                    onChange={(e) => {
                      const metodo = e.target.value;
                      const termineAuto = getTermineAutomatico(metodo);
                      setNewSupplier({ 
                        ...newSupplier, 
                        metodo_pagamento: metodo,
                        termini_pagamento: termineAuto || newSupplier.termini_pagamento
                      });
                    }}
                    style={{ padding: 10, width: '100%', borderRadius: 6, border: '1px solid #ddd' }}
                  >
                    {METODI_PAGAMENTO.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', fontSize: 12 }}>Termine Pagamento</label>
                  <select
                    value={newSupplier.termini_pagamento}
                    onChange={(e) => setNewSupplier({ ...newSupplier, termini_pagamento: e.target.value })}
                    disabled={getTermineAutomatico(newSupplier.metodo_pagamento)}
                    style={{ 
                      padding: 10, width: '100%', borderRadius: 6, border: '1px solid #ddd',
                      background: getTermineAutomatico(newSupplier.metodo_pagamento) ? '#f5f5f5' : 'white'
                    }}
                  >
                    {TERMINI_PAGAMENTO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {getTermineAutomatico(newSupplier.metodo_pagamento) && (
                    <div style={{ fontSize: 11, color: '#ff9800', marginTop: 5 }}>
                      ⚡ Termine impostato automaticamente
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewForm(false)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                ➕ Crea Fornitore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
