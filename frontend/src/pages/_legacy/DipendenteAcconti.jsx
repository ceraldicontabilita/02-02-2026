import React, { useState, useEffect } from 'react';
import api from '../api';

/**
 * Pagina standalone per Acconti Dipendenti
 * Con selezione dipendente e gestione acconti (TFR, Ferie, 13ima, 14ima, Prestiti)
 */
export default function DipendenteAcconti() {
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDip, setSelectedDip] = useState(null);
  const [accontiData, setAccontiData] = useState(null);
  const [loadingAcconti, setLoadingAcconti] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAcconto, setNewAcconto] = useState({
    tipo: 'tfr',
    importo: '',
    data: new Date().toISOString().split('T')[0],
    note: ''
  });

  const tipiAcconto = [
    { value: 'tfr', label: 'TFR', color: '#e91e63' },
    { value: 'ferie', label: 'Ferie', color: '#4caf50' },
    { value: 'tredicesima', label: '13ª Mensilità', color: '#ff9800' },
    { value: 'quattordicesima', label: '14ª Mensilità', color: '#9c27b0' },
    { value: 'prestito', label: 'Prestito', color: '#2196f3' }
  ];

  useEffect(() => {
    loadDipendenti();
  }, []);

  useEffect(() => {
    if (selectedDip) {
      loadAcconti(selectedDip.id);
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

  const loadAcconti = async (dipId) => {
    try {
      setLoadingAcconti(true);
      const res = await api.get(`/api/tfr/acconti/${dipId}`);
      setAccontiData(res.data);
    } catch (e) {
      setAccontiData({ tfr_saldo: 0, tfr_accantonato: 0, tfr_acconti: 0, ferie_acconti: 0, tredicesima_acconti: 0, quattordicesima_acconti: 0, prestiti_totale: 0, acconti: {} });
    } finally {
      setLoadingAcconti(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAcconto.importo || parseFloat(newAcconto.importo) <= 0) {
      alert('Inserisci un importo valido');
      return;
    }
    try {
      setSaving(true);
      await api.post('/api/tfr/acconti', {
        dipendente_id: selectedDip.id,
        tipo: newAcconto.tipo,
        importo: parseFloat(newAcconto.importo),
        data: newAcconto.data,
        note: newAcconto.note
      });
      setShowForm(false);
      setNewAcconto({ tipo: 'tfr', importo: '', data: new Date().toISOString().split('T')[0], note: '' });
      loadAcconti(selectedDip.id);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accontoId) => {
    if (!window.confirm('Eliminare questo acconto?')) return;
    try {
      await api.delete(`/api/tfr/acconti/${accontoId}`);
      loadAcconti(selectedDip.id);
    } catch (e) {
      alert('Errore: ' + e.message);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          💳 Acconti Dipendenti
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Gestione acconti TFR, Ferie, 13ima, 14ima, Prestiti
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
                  onClick={() => setSelectedDip(dip)}
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
                  <div style={{ fontSize: 12, color: '#64748b' }}>{dip.mansione || 'N/D'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio Acconti */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {!selectedDip ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
              <div>Seleziona un dipendente dalla lista</div>
            </div>
          ) : loadingAcconti ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Caricamento acconti...</div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 20px 0', fontSize: 18 }}>{selectedDip.nome_completo || selectedDip.nome}</h2>

              {/* Riepilogo Saldi */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                <SaldoCard label="TFR Saldo" value={accontiData?.tfr_saldo} color="#e91e63" subtitle={`Accantonato: ${formatCurrency(accontiData?.tfr_accantonato)}`} />
                <SaldoCard label="Ferie Anticip." value={accontiData?.ferie_acconti} color="#4caf50" />
                <SaldoCard label="13ª Anticip." value={accontiData?.tredicesima_acconti} color="#ff9800" />
                <SaldoCard label="14ª Anticip." value={accontiData?.quattordicesima_acconti} color="#9c27b0" />
                <SaldoCard label="Prestiti" value={accontiData?.prestiti_totale} color="#2196f3" />
              </div>

              {/* Pulsante Nuovo Acconto */}
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setShowForm(!showForm)}
                  style={{
                    padding: '10px 20px',
                    background: showForm ? '#757575' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  {showForm ? '✕ Annulla' : '+ Nuovo Acconto'}
                </button>
              </div>

              {/* Form Nuovo Acconto */}
              {showForm && (
                <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tipo Acconto</label>
                    <select value={newAcconto.tipo} onChange={(e) => setNewAcconto({ ...newAcconto, tipo: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
                      {tipiAcconto.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Importo €</label>
                    <input type="number" step="0.01" min="0.01" value={newAcconto.importo} onChange={(e) => setNewAcconto({ ...newAcconto, importo: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Data</label>
                    <input type="date" value={newAcconto.data} onChange={(e) => setNewAcconto({ ...newAcconto, data: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Note</label>
                    <input type="text" value={newAcconto.note} onChange={(e) => setNewAcconto({ ...newAcconto, note: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} placeholder="Opzionale" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#ccc' : '#2196f3', color: 'white', border: 'none', borderRadius: 6, cursor: saving ? 'wait' : 'pointer', fontWeight: 600 }}>
                      {saving ? '...' : '💾 Salva'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista Acconti per Tipo */}
              {tipiAcconto.map(tipo => {
                const accontiTipo = accontiData?.acconti?.[tipo.value] || [];
                if (accontiTipo.length === 0) return null;
                return (
                  <div key={tipo.value} style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: tipo.color, borderBottom: `2px solid ${tipo.color}`, paddingBottom: 4 }}>
                      {tipo.label} ({accontiTipo.length})
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: 8, textAlign: 'left' }}>Data</th>
                          <th style={{ padding: 8, textAlign: 'right' }}>Importo</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Note</th>
                          <th style={{ padding: 8, width: 50 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {accontiTipo.map((acc, idx) => (
                          <tr key={acc.id || idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: 8 }}>{new Date(acc.data).toLocaleDateString('it-IT')}</td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(acc.importo)}</td>
                            <td style={{ padding: 8, color: '#666' }}>{acc.note || '-'}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>
                              <button onClick={() => handleDelete(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f44336', fontSize: 14 }} title="Elimina">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {(!accontiData?.acconti || Object.values(accontiData.acconti).every(arr => arr.length === 0)) && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e', background: '#fafafa', borderRadius: 8 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <div>Nessun acconto registrato</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SaldoCard({ label, value, color, subtitle }) {
  const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
  return (
    <div style={{ background: `${color}15`, padding: 12, borderRadius: 8, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{formatCurrency(value)}</div>
      {subtitle && <div style={{ fontSize: 10, color, opacity: 0.8 }}>{subtitle}</div>}
    </div>
  );
}
