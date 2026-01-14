import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

/**
 * Pagina Gestione Noleggio Auto
 * Stile: Identico a DipendenteAcconti.jsx
 * - Layout grid 2 colonne (lista veicoli + dettaglio)
 * - SaldoCard per statistiche con colori
 * - Tabelle per dettaglio spese
 */
export default function NoleggioAuto() {
  const [veicoli, setVeicoli] = useState([]);
  const [statistiche, setStatistiche] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVeicolo, setSelectedVeicolo] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    marca: '',
    modello: '',
    driver_id: '',
    driver: '',
    contratto: '',
    data_inizio: '',
    data_fine: '',
    note: ''
  });

  const categorie = [
    { key: 'canoni', label: 'Canoni', color: '#4caf50' },
    { key: 'verbali', label: 'Verbali/Multe', color: '#f44336' },
    { key: 'riparazioni', label: 'Riparazioni', color: '#ff9800' },
    { key: 'bollo', label: 'Bollo', color: '#9c27b0' },
    { key: 'altro', label: 'Altro', color: '#607d8b' }
  ];

  const fetchVeicoli = useCallback(async () => {
    setLoading(true);
    try {
      // Carica veicoli senza filtro anno (tutti gli anni 2022-2026)
      const [vRes, dRes] = await Promise.all([
        api.get('/api/noleggio/veicoli'),
        api.get('/api/noleggio/drivers')
      ]);
      setVeicoli(vRes.data.veicoli || []);
      setStatistiche(vRes.data.statistiche || {});
      setDrivers(dRes.data.drivers || []);
    } catch (err) {
      console.error('Errore caricamento veicoli:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVeicoli();
  }, [fetchVeicoli]);

  useEffect(() => {
    if (selectedVeicolo) {
      setEditData({
        marca: selectedVeicolo.marca || '',
        modello: selectedVeicolo.modello || '',
        driver_id: selectedVeicolo.driver_id || '',
        driver: selectedVeicolo.driver || '',
        contratto: selectedVeicolo.contratto || '',
        data_inizio: selectedVeicolo.data_inizio || '',
        data_fine: selectedVeicolo.data_fine || '',
        note: selectedVeicolo.note || ''
      });
    }
  }, [selectedVeicolo]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedVeicolo) return;
    try {
      setSaving(true);
      await api.put(`/api/noleggio/veicoli/${selectedVeicolo.targa}`, editData);
      setShowForm(false);
      fetchVeicoli();
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          🚗 Gestione Noleggio Auto
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Flotta aziendale - Dati estratti automaticamente dalle fatture XML (2022-2026)
        </p>
      </div>

      {/* Statistiche Globali */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <SaldoCard label="Totale Canoni" value={statistiche.totale_canoni} color="#4caf50" />
        <SaldoCard label="Verbali/Multe" value={statistiche.totale_verbali} color="#f44336" />
        <SaldoCard label="Riparazioni" value={statistiche.totale_riparazioni} color="#ff9800" />
        <SaldoCard label="Bollo" value={statistiche.totale_bollo} color="#9c27b0" />
        <SaldoCard label="TOTALE FLOTTA" value={statistiche.totale_generale} color="#1a365d" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 20 }}>
        {/* Lista Veicoli */}
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#64748b' }}>
            Veicoli ({veicoli.length})
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Caricamento...</div>
          ) : veicoli.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
              <div>Nessun veicolo trovato nelle fatture</div>
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {veicoli.map(v => (
                <div
                  key={v.targa}
                  onClick={() => setSelectedVeicolo(v)}
                  data-testid={`veicolo-${v.targa}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 6,
                    background: selectedVeicolo?.targa === v.targa ? '#dbeafe' : '#f8fafc',
                    border: selectedVeicolo?.targa === v.targa ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {v.marca ? `${v.marca} ` : ''}{v.modello || 'Modello non rilevato'}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>
                        {v.targa}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {v.driver || 'Non assegnato'} • {v.fornitore_noleggio?.split(' ')[0] || '-'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#1a365d', fontSize: 14 }}>
                        {formatCurrency(v.totale_generale)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio Veicolo */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {!selectedVeicolo ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
              <div>Seleziona un veicolo dalla lista</div>
            </div>
          ) : (
            <>
              {/* Header Veicolo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    {selectedVeicolo.marca ? `${selectedVeicolo.marca} ` : ''}{selectedVeicolo.modello || 'Modello non rilevato'}
                  </h2>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>
                    {selectedVeicolo.targa}
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  style={{
                    padding: '8px 16px',
                    background: showForm ? '#757575' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  {showForm ? '✕ Annulla' : '✏️ Modifica'}
                </button>
              </div>

              {/* Info Veicolo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>DRIVER</div>
                  <div style={{ fontSize: 14 }}>{selectedVeicolo.driver || 'Non assegnato'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>FORNITORE</div>
                  <div style={{ fontSize: 14 }}>{selectedVeicolo.fornitore_noleggio || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CONTRATTO</div>
                  <div style={{ fontSize: 14 }}>{selectedVeicolo.contratto || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PERIODO</div>
                  <div style={{ fontSize: 14 }}>
                    {selectedVeicolo.data_inizio ? new Date(selectedVeicolo.data_inizio).toLocaleDateString('it-IT') : '-'}
                    {selectedVeicolo.data_fine ? ` → ${new Date(selectedVeicolo.data_fine).toLocaleDateString('it-IT')}` : ''}
                  </div>
                </div>
              </div>

              {/* Form Modifica */}
              {showForm && (
                <form onSubmit={handleSave} style={{ background: '#eff6ff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Marca</label>
                      <input 
                        type="text" 
                        value={editData.marca} 
                        onChange={(e) => setEditData({ ...editData, marca: e.target.value })} 
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} 
                        placeholder="Es: BMW, Fiat..."
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Modello</label>
                      <input 
                        type="text" 
                        value={editData.modello} 
                        onChange={(e) => setEditData({ ...editData, modello: e.target.value })} 
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} 
                        placeholder="Es: X3, 500..."
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Driver</label>
                      <select 
                        value={editData.driver_id} 
                        onChange={(e) => {
                          const driver = drivers.find(d => d.id === e.target.value);
                          setEditData({ ...editData, driver_id: e.target.value, driver: driver?.nome_completo || '' });
                        }} 
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                      >
                        <option value="">-- Seleziona --</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.nome_completo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Contratto</label>
                      <input 
                        type="text" 
                        value={editData.contratto} 
                        onChange={(e) => setEditData({ ...editData, contratto: e.target.value })} 
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} 
                        placeholder="N. contratto"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Inizio Noleggio</label>
                      <input 
                        type="date" 
                        value={editData.data_inizio} 
                        onChange={(e) => setEditData({ ...editData, data_inizio: e.target.value })} 
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fine Noleggio</label>
                      <input 
                        type="date" 
                        value={editData.data_fine} 
                        onChange={(e) => setEditData({ ...editData, data_fine: e.target.value })} 
                        style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Note</label>
                    <input 
                      type="text" 
                      value={editData.note} 
                      onChange={(e) => setEditData({ ...editData, note: e.target.value })} 
                      style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} 
                      placeholder="Note..."
                    />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button 
                      type="submit" 
                      disabled={saving} 
                      style={{ padding: '10px 24px', background: saving ? '#ccc' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: saving ? 'wait' : 'pointer', fontWeight: 600 }}
                    >
                      {saving ? '...' : '💾 Salva'}
                    </button>
                  </div>
                </form>
              )}

              {/* Riepilogo Costi Veicolo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
                <SaldoCard label="Canoni" value={selectedVeicolo.totale_canoni} color="#4caf50" />
                <SaldoCard label="Verbali" value={selectedVeicolo.totale_verbali} color="#f44336" />
                <SaldoCard label="Riparazioni" value={selectedVeicolo.totale_riparazioni} color="#ff9800" />
                <SaldoCard label="Bollo" value={selectedVeicolo.totale_bollo} color="#9c27b0" />
                <SaldoCard label="TOTALE" value={selectedVeicolo.totale_generale} color="#1a365d" />
              </div>

              {/* Tabelle Spese per Categoria */}
              {categorie.map(cat => {
                const spese = selectedVeicolo[cat.key] || [];
                if (spese.length === 0) return null;
                return (
                  <div key={cat.key} style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: cat.color, borderBottom: `2px solid ${cat.color}`, paddingBottom: 4 }}>
                      {cat.label} ({spese.length})
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: 8, textAlign: 'left' }}>Data</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Fattura</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Descrizione</th>
                          <th style={{ padding: 8, textAlign: 'right' }}>Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spese.slice(0, 20).map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: 8 }}>{s.data ? new Date(s.data).toLocaleDateString('it-IT') : '-'}</td>
                            <td style={{ padding: 8, color: '#666' }}>{s.numero_fattura || '-'}</td>
                            <td style={{ padding: 8, color: '#666', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.descrizione?.slice(0, 60) || '-'}
                            </td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.importo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {spese.length > 20 && (
                      <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 4 }}>
                        ...e altri {spese.length - 20} movimenti
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Messaggio se non ci sono spese */}
              {categorie.every(cat => (selectedVeicolo[cat.key] || []).length === 0) && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e', background: '#fafafa', borderRadius: 8 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <div>Nessuna spesa registrata per questo veicolo</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component SaldoCard - Stile identico a DipendenteAcconti
 */
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
