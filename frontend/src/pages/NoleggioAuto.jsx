import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

/**
 * Pagina Gestione Noleggio Auto
 * Stile: Identico a DipendenteAcconti.jsx
 * CATEGORIE: Canoni, Pedaggio, Verbali, Bollo, Costi Extra, Riparazioni
 */
export default function NoleggioAuto() {
  const [veicoli, setVeicoli] = useState([]);
  const [statistiche, setStatistiche] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedVeicolo, setSelectedVeicolo] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [anno, setAnno] = useState(new Date().getFullYear());
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

  // Categorie con colori
  const categorie = [
    { key: 'canoni', label: 'Canoni', color: '#4caf50' },
    { key: 'pedaggio', label: 'Pedaggio', color: '#2196f3' },
    { key: 'verbali', label: 'Verbali', color: '#f44336' },
    { key: 'bollo', label: 'Bollo', color: '#9c27b0' },
    { key: 'costi_extra', label: 'Costi Extra', color: '#ff9800' },
    { key: 'riparazioni', label: 'Riparazioni', color: '#795548' }
  ];

  const fetchVeicoli = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        api.get(`/api/noleggio/veicoli?anno=${anno}`),
        api.get('/api/noleggio/drivers')
      ]);
      setVeicoli(vRes.data.veicoli || []);
      setStatistiche(vRes.data.statistiche || {});
      setDrivers(dRes.data.drivers || []);
      
      // Aggiorna veicolo selezionato se esiste
      if (selectedVeicolo) {
        const updated = (vRes.data.veicoli || []).find(v => v.targa === selectedVeicolo.targa);
        if (updated) setSelectedVeicolo(updated);
      }
    } catch (err) {
      console.error('Errore caricamento veicoli:', err);
    } finally {
      setLoading(false);
    }
  }, [anno, selectedVeicolo?.targa]);

  useEffect(() => {
    fetchVeicoli();
  }, [anno]);

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

  const handleDelete = async () => {
    if (!selectedVeicolo) return;
    if (!window.confirm(`Eliminare il veicolo ${selectedVeicolo.targa}? Questa azione rimuoverà tutti i dati salvati.`)) return;
    try {
      await api.delete(`/api/noleggio/veicoli/${selectedVeicolo.targa}`);
      setSelectedVeicolo(null);
      fetchVeicoli();
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message));
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);

  // Anni disponibili
  const anniDisponibili = [2026, 2025, 2024, 2023, 2022];

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      {/* Header con filtro anno */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
            🚗 Gestione Noleggio Auto
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
            Flotta aziendale - Dati estratti automaticamente dalle fatture XML
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>Anno:</span>
          {anniDisponibili.map(a => (
            <button
              key={a}
              onClick={() => setAnno(a)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: anno === a ? '2px solid #3b82f6' : '1px solid #ddd',
                background: anno === a ? '#dbeafe' : 'white',
                fontWeight: anno === a ? 700 : 400,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Statistiche Globali */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        {categorie.map(cat => (
          <SaldoCard key={cat.key} label={cat.label} value={statistiche[`totale_${cat.key}`]} color={cat.color} />
        ))}
        <SaldoCard label="TOTALE" value={statistiche.totale_generale} color="#1a365d" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 20 }}>
        {/* Lista Veicoli */}
        <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#64748b' }}>
            Veicoli {anno} ({veicoli.length})
          </h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Caricamento...</div>
          ) : veicoli.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
              <div>Nessun veicolo trovato per {anno}</div>
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
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
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
                <div style={{ display: 'flex', gap: 8 }}>
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
                  <button
                    onClick={handleDelete}
                    style={{
                      padding: '8px 12px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Info Veicolo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
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
                      <input type="text" value={editData.marca} onChange={(e) => setEditData({ ...editData, marca: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} placeholder="Es: BMW, Fiat..." />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Modello</label>
                      <input type="text" value={editData.modello} onChange={(e) => setEditData({ ...editData, modello: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} placeholder="Es: X3, 500..." />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Driver</label>
                      <select value={editData.driver_id} onChange={(e) => { const driver = drivers.find(d => d.id === e.target.value); setEditData({ ...editData, driver_id: e.target.value, driver: driver?.nome_completo || '' }); }} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
                        <option value="">-- Seleziona --</option>
                        {drivers.map(d => (<option key={d.id} value={d.id}>{d.nome_completo}</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Contratto</label>
                      <input type="text" value={editData.contratto} onChange={(e) => setEditData({ ...editData, contratto: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} placeholder="N. contratto" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Inizio Noleggio</label>
                      <input type="date" value={editData.data_inizio} onChange={(e) => setEditData({ ...editData, data_inizio: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fine Noleggio</label>
                      <input type="date" value={editData.data_fine} onChange={(e) => setEditData({ ...editData, data_fine: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Note</label>
                    <input type="text" value={editData.note} onChange={(e) => setEditData({ ...editData, note: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd' }} placeholder="Note..." />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#ccc' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: saving ? 'wait' : 'pointer', fontWeight: 600 }}>
                      {saving ? '...' : '💾 Salva'}
                    </button>
                  </div>
                </form>
              )}

              {/* Riepilogo Costi Veicolo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
                {categorie.map(cat => (
                  <SaldoCard key={cat.key} label={cat.label} value={selectedVeicolo[`totale_${cat.key}`]} color={cat.color} small />
                ))}
                <SaldoCard label="TOTALE" value={selectedVeicolo.totale_generale} color="#1a365d" small />
              </div>

              {/* Tabelle Spese per Categoria */}
              {categorie.map(cat => {
                const spese = selectedVeicolo[cat.key] || [];
                if (spese.length === 0) return null;
                return (
                  <div key={cat.key} style={{ marginBottom: 20 }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: cat.color, borderBottom: `2px solid ${cat.color}`, paddingBottom: 6 }}>
                      {cat.label} ({spese.length} fatture)
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: 'white', border: '1px solid #e0e0e0', borderRadius: 6 }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ padding: 8, textAlign: 'left', width: 90 }}>Data</th>
                          <th style={{ padding: 8, textAlign: 'left', width: 120 }}>Fattura</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Voci</th>
                          <th style={{ padding: 8, textAlign: 'right', width: 90 }}>Imponibile</th>
                          <th style={{ padding: 8, textAlign: 'right', width: 70 }}>IVA</th>
                          <th style={{ padding: 8, textAlign: 'right', width: 90 }}>Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spese.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: s.imponibile < 0 ? '#fff3e0' : 'white' }}>
                            <td style={{ padding: 8 }}>{s.data ? new Date(s.data).toLocaleDateString('it-IT') : '-'}</td>
                            <td style={{ padding: 8, color: '#666', fontSize: 11 }}>{s.numero_fattura || '-'}</td>
                            <td style={{ padding: 8 }}>
                              {s.voci?.map((v, vi) => (
                                <div key={vi} style={{ fontSize: 11, color: '#555', borderBottom: vi < s.voci.length - 1 ? '1px dotted #ddd' : 'none', paddingBottom: 2, marginBottom: 2 }}>
                                  {v.descrizione?.slice(0, 80) || '-'}
                                  <span style={{ float: 'right', fontWeight: 500 }}>{formatCurrency(v.importo)}</span>
                                </div>
                              ))}
                            </td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: s.imponibile < 0 ? '#f57c00' : 'inherit' }}>
                              {formatCurrency(s.imponibile)}
                            </td>
                            <td style={{ padding: 8, textAlign: 'right', color: '#666' }}>
                              {formatCurrency(s.iva)}
                            </td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: s.totale < 0 ? '#f57c00' : '#1a365d' }}>
                              {formatCurrency(s.totale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: `${cat.color}15`, fontWeight: 700 }}>
                          <td colSpan={3} style={{ padding: 10, textAlign: 'right' }}>Totale {cat.label}:</td>
                          <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(spese.reduce((a, s) => a + (s.imponibile || 0), 0))}</td>
                          <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(spese.reduce((a, s) => a + (s.iva || 0), 0))}</td>
                          <td style={{ padding: 10, textAlign: 'right', color: cat.color }}>{formatCurrency(spese.reduce((a, s) => a + (s.totale || 0), 0))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}

              {/* Messaggio se non ci sono spese */}
              {categorie.every(cat => (selectedVeicolo[cat.key] || []).length === 0) && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9e9e9e', background: '#fafafa', borderRadius: 8 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                  <div>Nessuna spesa registrata per questo veicolo nel {anno}</div>
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
function SaldoCard({ label, value, color, small }) {
  const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
  return (
    <div style={{ background: `${color}15`, padding: small ? 8 : 12, borderRadius: 8, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: small ? 10 : 11, color, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: small ? 14 : 18, fontWeight: 700, color }}>{formatCurrency(value)}</div>
    </div>
  );
}
