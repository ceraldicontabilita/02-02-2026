import React, { useState, useEffect } from 'react';
import api from '../api';

/**
 * Pagina Contratti Dipendenti
 * Gestione contratti di lavoro con selezione dipendente
 */
export default function DipendenteContratti() {
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDip, setSelectedDip] = useState(null);
  const [contratti, setContratti] = useState([]);
  const [loadingContratti, setLoadingContratti] = useState(false);
  const [contractTypes, setContractTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    tipo_contratto: '',
    data_inizio: '',
    data_fine: '',
    ore_settimanali: 40,
    livello: '',
    mansione: '',
    ccnl: '',
    note: ''
  });

  useEffect(() => {
    loadDipendenti();
    loadContractTypes();
  }, []);

  useEffect(() => {
    if (selectedDip) {
      loadContratti(selectedDip.id);
      setFormData({
        tipo_contratto: selectedDip.tipo_contratto || '',
        data_inizio: selectedDip.data_assunzione || '',
        data_fine: selectedDip.data_fine_contratto || '',
        ore_settimanali: selectedDip.ore_settimanali || 40,
        livello: selectedDip.livello || '',
        mansione: selectedDip.mansione || '',
        ccnl: selectedDip.ccnl || 'Turismo - Pubblici Esercizi',
        note: selectedDip.note_contratto || ''
      });
    }
  }, [selectedDip]);

  const loadDipendenti = async () => {
    try {
      const res = await api.get('/api/dipendenti');
      setDipendenti(res.data);
    } catch (e) {
      console.error('Errore:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadContractTypes = async () => {
    try {
      const res = await api.get('/api/contracts/types');
      setContractTypes(res.data);
    } catch (e) {
      setContractTypes([
        { code: 'tempo_indeterminato', name: 'Tempo Indeterminato' },
        { code: 'tempo_determinato', name: 'Tempo Determinato' },
        { code: 'apprendistato', name: 'Apprendistato' },
        { code: 'stagionale', name: 'Stagionale' },
        { code: 'intermittente', name: 'Intermittente' },
        { code: 'part_time', name: 'Part Time' }
      ]);
    }
  };

  const loadContratti = async (dipId) => {
    try {
      setLoadingContratti(true);
      const res = await api.get(`/api/contracts/dipendente/${dipId}`);
      setContratti(res.data || []);
    } catch (e) {
      setContratti([]);
    } finally {
      setLoadingContratti(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDip) return;
    try {
      setSaving(true);
      await api.put(`/api/dipendenti/${selectedDip.id}`, {
        tipo_contratto: formData.tipo_contratto,
        data_assunzione: formData.data_inizio,
        data_fine_contratto: formData.data_fine,
        ore_settimanali: formData.ore_settimanali,
        livello: formData.livello,
        mansione: formData.mansione,
        ccnl: formData.ccnl,
        note_contratto: formData.note
      });
      alert('✅ Contratto salvato');
      setEditMode(false);
      loadDipendenti();
      setSelectedDip({ ...selectedDip, ...formData });
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateContract = async (tipo) => {
    if (!selectedDip) return;
    try {
      const res = await api.post(`/api/contracts/generate/${selectedDip.id}`, {
        contract_type: tipo,
        additional_data: formData
      });
      if (res.data.success) {
        alert(`Contratto generato: ${res.data.contract.filename}`);
        window.open(`${api.defaults.baseURL}${res.data.contract.download_url}`, '_blank');
      }
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  const isScaduto = (data) => {
    if (!data) return false;
    return new Date(data) < new Date();
  };

  const isInScadenza = (data) => {
    if (!data) return false;
    const diff = (new Date(data) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          📄 Contratti Dipendenti
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Gestione contratti di lavoro e scadenze
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 350px) 1fr', gap: 20 }}>
        {/* Lista dipendenti */}
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#64748b' }}>Seleziona Dipendente</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Caricamento...</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {dipendenti.map(dip => (
                <div
                  key={dip.id}
                  onClick={() => { setSelectedDip(dip); setEditMode(false); }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 6,
                    background: selectedDip?.id === dip.id ? '#dbeafe' : '#f8fafc',
                    border: selectedDip?.id === dip.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{dip.nome_completo || dip.nome}</div>
                  <div style={{ fontSize: 11, display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ color: '#64748b' }}>{dip.tipo_contratto || 'N/D'}</span>
                    {isScaduto(dip.data_fine_contratto) && <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ SCADUTO</span>}
                    {isInScadenza(dip.data_fine_contratto) && <span style={{ color: '#f59e0b', fontWeight: 600 }}>⏰ In scadenza</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio Contratto */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {!selectedDip ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
              <div>Seleziona un dipendente dalla lista</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{selectedDip.nome_completo || selectedDip.nome}</h2>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    ✏️ Modifica
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditMode(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Annulla</button>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                      {saving ? '...' : '💾 Salva'}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <FieldBox label="Tipo Contratto" field="tipo_contratto" editMode={editMode} formData={formData} setFormData={setFormData} type="select" options={contractTypes.map(t => ({ value: t.code, label: t.name }))} />
                <FieldBox label="Data Inizio" field="data_inizio" editMode={editMode} formData={formData} setFormData={setFormData} type="date" />
                <FieldBox label="Data Fine" field="data_fine" editMode={editMode} formData={formData} setFormData={setFormData} type="date" />
                <FieldBox label="Ore Settimanali" field="ore_settimanali" editMode={editMode} formData={formData} setFormData={setFormData} type="number" />
                <FieldBox label="Livello" field="livello" editMode={editMode} formData={formData} setFormData={setFormData} />
                <FieldBox label="Mansione" field="mansione" editMode={editMode} formData={formData} setFormData={setFormData} />
                <FieldBox label="CCNL" field="ccnl" editMode={editMode} formData={formData} setFormData={setFormData} />
              </div>

              {/* Note */}
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Note</label>
                {editMode ? (
                  <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 6, minHeight: 80, fontSize: 14 }} />
                ) : (
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, minHeight: 60, color: formData.note ? '#1e293b' : '#94a3b8' }}>
                    {formData.note || 'Nessuna nota'}
                  </div>
                )}
              </div>

              {/* Genera Contratto */}
              {!editMode && (
                <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#64748b' }}>📝 Genera Documento</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleGenerateContract('assunzione')} style={{ padding: '8px 16px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      📄 Lettera Assunzione
                    </button>
                    <button onClick={() => handleGenerateContract('proroga')} style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      📄 Proroga
                    </button>
                    <button onClick={() => handleGenerateContract('trasformazione')} style={{ padding: '8px 16px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      📄 Trasformazione
                    </button>
                  </div>
                </div>
              )}

              {/* Storico Contratti */}
              {contratti.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#64748b' }}>📚 Storico Contratti</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>Periodo</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratti.map((c, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 10 }}>{c.tipo || c.contract_type}</td>
                          <td style={{ padding: 10 }}>{c.data_inizio} - {c.data_fine || 'Indeterminato'}</td>
                          <td style={{ padding: 10 }}>
                            {c.download_url && (
                              <a href={`${api.defaults.baseURL}${c.download_url}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>📥 Download</a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldBox({ label, field, editMode, formData, setFormData, type = 'text', options = [] }) {
  const value = formData[field] || '';
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      {editMode ? (
        type === 'select' ? (
          <select value={value} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}>
            <option value="">-- Seleziona --</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }} />
        )
      ) : (
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{value || '-'}</div>
      )}
    </div>
  );
}
