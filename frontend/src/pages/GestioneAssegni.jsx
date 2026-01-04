import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const STATI_ASSEGNO = {
  vuoto: { label: "Vuoto", color: "#9e9e9e" },
  compilato: { label: "Compilato", color: "#2196f3" },
  emesso: { label: "Emesso", color: "#ff9800" },
  incassato: { label: "Incassato", color: "#4caf50" },
  annullato: { label: "Annullato", color: "#f44336" },
  scaduto: { label: "Scaduto", color: "#795548" }
};

export default function GestioneAssegni() {
  const [assegni, setAssegni] = useState([]);
  const [stats, setStats] = useState({ totale: 0, per_stato: {} });
  const [loading, setLoading] = useState(true);
  const [filterStato, setFilterStato] = useState('');
  const [search, setSearch] = useState('');
  
  // Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({ numero_primo: '', quantita: 10 });
  const [generating, setGenerating] = useState(false);
  
  // Edit modal
  const [selectedAssegno, setSelectedAssegno] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadData();
  }, [filterStato, search]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStato) params.append('stato', filterStato);
      if (search) params.append('search', search);

      const [assegniRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/assegni?${params}`),
        axios.get(`${API}/api/assegni/stats`)
      ]);

      setAssegni(assegniRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading assegni:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.numero_primo) {
      alert('Inserisci il numero del primo assegno');
      return;
    }

    setGenerating(true);
    try {
      await axios.post(`${API}/api/assegni/genera`, generateForm);
      setShowGenerate(false);
      setGenerateForm({ numero_primo: '', quantita: 10 });
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    } finally {
      setGenerating(false);
    }
  };

  const handleClearEmpty = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare tutti gli assegni vuoti?')) return;
    
    try {
      const res = await axios.delete(`${API}/api/assegni/clear-generated?stato=vuoto`);
      alert(res.data.message);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdateAssegno = async () => {
    if (!selectedAssegno) return;
    
    try {
      await axios.put(`${API}/api/assegni/${selectedAssegno.id}`, editForm);
      setSelectedAssegno(null);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEmetti = async (assegno) => {
    try {
      await axios.post(`${API}/api/assegni/${assegno.id}/emetti`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleIncassa = async (assegno) => {
    try {
      await axios.post(`${API}/api/assegni/${assegno.id}/incassa`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAnnulla = async (assegno) => {
    if (!window.confirm('Sei sicuro di voler annullare questo assegno?')) return;
    
    try {
      await axios.post(`${API}/api/assegni/${assegno.id}/annulla`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const openEditModal = (assegno) => {
    setSelectedAssegno(assegno);
    setEditForm({
      importo: assegno.importo || '',
      beneficiario: assegno.beneficiario || '',
      causale: assegno.causale || '',
      data_emissione: assegno.data_emissione || '',
      note: assegno.note || ''
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>📝 Gestione Assegni</h1>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Genera, collega e controlla i tuoi assegni in un'unica schermata
      </p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 15, marginBottom: 20 }}>
        <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Totale</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{stats.totale || 0}</div>
        </div>
        {Object.entries(STATI_ASSEGNO).map(([stato, { label, color }]) => (
          <div 
            key={stato}
            style={{ 
              background: `${color}20`, 
              padding: 15, 
              borderRadius: 8,
              borderLeft: `4px solid ${color}`,
              cursor: 'pointer'
            }}
            onClick={() => setFilterStato(filterStato === stato ? '' : stato)}
          >
            <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color }}>
              {stats.per_stato?.[stato]?.count || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Cerca per numero o beneficiario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', minWidth: 250 }}
        />
        <select 
          value={filterStato} 
          onChange={(e) => setFilterStato(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd' }}
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATI_ASSEGNO).map(([code, { label }]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowGenerate(true)}
            style={{
              padding: '8px 16px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            ➕ Genera Assegni
          </button>
          <button
            onClick={handleClearEmpty}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            🗑️ Svuota vuoti
          </button>
        </div>
      </div>

      {/* Assegni Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Numero</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Stato</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Beneficiario</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Importo</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Data Emissione</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Causale</th>
                <th style={{ padding: 12, textAlign: 'center' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {assegni.map((assegno, idx) => (
                <tr key={assegno.id} style={{ 
                  borderBottom: '1px solid #eee',
                  background: idx % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <td style={{ padding: 12, fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {assegno.numero}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 'bold',
                      background: STATI_ASSEGNO[assegno.stato]?.color || '#9e9e9e',
                      color: 'white'
                    }}>
                      {STATI_ASSEGNO[assegno.stato]?.label || assegno.stato}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{assegno.beneficiario || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(assegno.importo)}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center', fontSize: 12 }}>
                    {assegno.data_emissione ? new Date(assegno.data_emissione).toLocaleDateString('it-IT') : '-'}
                  </td>
                  <td style={{ padding: 12, fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {assegno.causale || '-'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                      <button
                        onClick={() => openEditModal(assegno)}
                        style={{ padding: '4px 8px', cursor: 'pointer' }}
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      {assegno.stato === 'compilato' && (
                        <button
                          onClick={() => handleEmetti(assegno)}
                          style={{ padding: '4px 8px', cursor: 'pointer', background: '#ff9800', color: 'white', border: 'none', borderRadius: 4 }}
                          title="Emetti"
                        >
                          📤
                        </button>
                      )}
                      {assegno.stato === 'emesso' && (
                        <button
                          onClick={() => handleIncassa(assegno)}
                          style={{ padding: '4px 8px', cursor: 'pointer', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4 }}
                          title="Segna incassato"
                        >
                          ✓
                        </button>
                      )}
                      {['vuoto', 'compilato', 'emesso'].includes(assegno.stato) && (
                        <button
                          onClick={() => handleAnnulla(assegno)}
                          style={{ padding: '4px 8px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: 4 }}
                          title="Annulla"
                        >
                          ✗
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assegni.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
              <p>Nessun assegno presente</p>
              <p style={{ fontSize: 12 }}>Genera i primi assegni per iniziare</p>
            </div>
          )}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowGenerate(false)}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 400,
            width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2>➕ Genera Assegni</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
              Inserisci il numero del primo assegno nel formato PREFISSO-NUMERO (es. 0208769182-11)
            </p>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Numero Primo Assegno
              </label>
              <input
                type="text"
                value={generateForm.numero_primo}
                onChange={(e) => setGenerateForm({ ...generateForm, numero_primo: e.target.value })}
                placeholder="0208769182-11"
                style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd', fontFamily: 'monospace' }}
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                Quantità
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={generateForm.quantita}
                onChange={(e) => setGenerateForm({ ...generateForm, quantita: parseInt(e.target.value) || 10 })}
                style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGenerate(false)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                {generating ? 'Generazione...' : 'Genera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedAssegno && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedAssegno(null)}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 500,
            width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2>✏️ Modifica Assegno</h2>
            <p style={{ fontFamily: 'monospace', fontSize: 18, marginBottom: 20 }}>
              {selectedAssegno.numero}
            </p>
            
            <div style={{ display: 'grid', gap: 15 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Importo (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.importo}
                  onChange={(e) => setEditForm({ ...editForm, importo: parseFloat(e.target.value) || '' })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Beneficiario</label>
                <input
                  type="text"
                  value={editForm.beneficiario}
                  onChange={(e) => setEditForm({ ...editForm, beneficiario: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Data Emissione</label>
                <input
                  type="date"
                  value={editForm.data_emissione}
                  onChange={(e) => setEditForm({ ...editForm, data_emissione: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Causale</label>
                <textarea
                  value={editForm.causale}
                  onChange={(e) => setEditForm({ ...editForm, causale: e.target.value })}
                  rows={2}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd', resize: 'vertical' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Note</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  rows={2}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd', resize: 'vertical' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setSelectedAssegno(null)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={handleUpdateAssegno}
                style={{ padding: '10px 20px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
