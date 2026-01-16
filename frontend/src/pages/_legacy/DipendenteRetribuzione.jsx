import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';

/**
 * Pagina Retribuzione Dipendenti
 * Gestione dati retributivi: paga base, contingenza, straordinari
 * + Storico buste paga/cedolini
 */
export default function DipendenteRetribuzione() {
  const { anno } = useAnnoGlobale();
  const [dipendenti, setDipendenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDip, setSelectedDip] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [cedolini, setCedolini] = useState([]);
  const [loadingCedolini, setLoadingCedolini] = useState(false);
  const [totaliCedolini, setTotaliCedolini] = useState({ lordo: 0, netto: 0, count: 0 });

  useEffect(() => {
    loadDipendenti();
  }, []);

  useEffect(() => {
    if (selectedDip) {
      loadCedolini(selectedDip.id);
    }
  }, [selectedDip, anno]);

  const loadDipendenti = async () => {
    try {
      const res = await api.get('/api/dipendenti');
      setDipendenti(res.data);
    } catch (e) {
      console.error('Errore caricamento dipendenti:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCedolini = async (dipId) => {
    setLoadingCedolini(true);
    try {
      const res = await api.get(`/api/cedolini/dipendente/${dipId}?anno=${anno}`);
      setCedolini(res.data.cedolini || []);
      setTotaliCedolini({
        lordo: res.data.totale_lordo || 0,
        netto: res.data.totale_netto || 0,
        count: res.data.totale_cedolini || 0
      });
    } catch (e) {
      console.error('Errore caricamento cedolini:', e);
      setCedolini([]);
      setTotaliCedolini({ lordo: 0, netto: 0, count: 0 });
    } finally {
      setLoadingCedolini(false);
    }
  };

  const handleSelect = (dip) => {
    setSelectedDip(dip);
    setFormData({
      paga_base: dip.paga_base || '',
      contingenza: dip.contingenza || '',
      superminimo: dip.superminimo || '',
      scatti_anzianita: dip.scatti_anzianita || '',
      straordinario_feriale: dip.straordinario_feriale || '',
      straordinario_festivo: dip.straordinario_festivo || '',
      indennita_turno: dip.indennita_turno || '',
      buoni_pasto: dip.buoni_pasto || '',
      ore_settimanali: dip.ore_settimanali || 40,
      livello: dip.livello || '',
    });
    setEditMode(false);
  };

  const handleSave = async () => {
    if (!selectedDip) return;
    try {
      await api.put(`/api/dipendenti/${selectedDip.id}`, formData);
      alert('✅ Dati retributivi salvati');
      setEditMode(false);
      loadDipendenti();
      setSelectedDip({ ...selectedDip, ...formData });
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  const formatEuro = (val) => {
    if (!val && val !== 0) return '€ 0,00';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getMeseNome = (mese) => {
    const mesi = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return mesi[mese] || '';
  };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', color: '#1a365d' }}>
          💰 Retribuzione Dipendenti
        </h1>
        <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 'clamp(12px, 3vw, 14px)' }}>
          Gestione paga base, contingenza e voci retributive - Anno {anno}
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
                  onClick={() => handleSelect(dip)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 6,
                    background: selectedDip?.id === dip.id ? '#dbeafe' : '#f8fafc',
                    border: selectedDip?.id === dip.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{dip.nome_completo || dip.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{dip.mansione || 'N/D'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio retribuzione */}
        <div>
          {!selectedDip ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 60, textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
              <div>Seleziona un dipendente dalla lista</div>
            </div>
          ) : (
            <>
              {/* Dati Retributivi */}
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>📋 Dati Retributivi - {selectedDip.nome_completo || selectedDip.nome}</h2>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    >
                      ✏️ Modifica
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditMode(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        Annulla
                      </button>
                      <button onClick={handleSave} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        💾 Salva
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <FieldBox label="Livello" value={formData.livello} field="livello" editMode={editMode} formData={formData} setFormData={setFormData} />
                  <FieldBox label="Ore Settimanali" value={formData.ore_settimanali} field="ore_settimanali" editMode={editMode} formData={formData} setFormData={setFormData} type="number" />
                  <FieldBox label="Paga Base (€/mese)" value={formData.paga_base} field="paga_base" editMode={editMode} formData={formData} setFormData={setFormData} type="number" isCurrency />
                  <FieldBox label="Contingenza (€)" value={formData.contingenza} field="contingenza" editMode={editMode} formData={formData} setFormData={setFormData} type="number" isCurrency />
                  <FieldBox label="Superminimo (€)" value={formData.superminimo} field="superminimo" editMode={editMode} formData={formData} setFormData={setFormData} type="number" isCurrency />
                  <FieldBox label="Scatti Anzianità (€)" value={formData.scatti_anzianita} field="scatti_anzianita" editMode={editMode} formData={formData} setFormData={setFormData} type="number" isCurrency />
                  <FieldBox label="Straord. Feriale (€/h)" value={formData.straordinario_feriale} field="straordinario_feriale" editMode={editMode} formData={formData} setFormData={setFormData} type="number" isCurrency />
                  <FieldBox label="Straord. Festivo (€/h)" value={formData.straordinario_festivo} field="straordinario_festivo" editMode={editMode} formData={formData} setFormData={setFormData} type="number" isCurrency />
                </div>
              </div>

              {/* Storico Buste Paga */}
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>📊 Storico Buste Paga {anno}</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ background: '#dbeafe', padding: '6px 12px', borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: '#1e40af' }}>Lordo: </span>
                      <span style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatEuro(totaliCedolini.lordo)}</span>
                    </div>
                    <div style={{ background: '#dcfce7', padding: '6px 12px', borderRadius: 6 }}>
                      <span style={{ fontSize: 11, color: '#166534' }}>Netto: </span>
                      <span style={{ fontWeight: 'bold', color: '#166534' }}>{formatEuro(totaliCedolini.netto)}</span>
                    </div>
                  </div>
                </div>

                {loadingCedolini ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Caricamento...</div>
                ) : cedolini.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <div>Nessuna busta paga trovata per {anno}</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Mese</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Ore</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Lordo</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>INPS</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>IRPEF</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Netto</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cedolini.map((ced, idx) => (
                          <tr key={ced.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              {getMeseNome(ced.mese)} {ced.anno}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {ced.ore_lavorate || '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e40af' }}>
                              {formatEuro(ced.lordo)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>
                              -{formatEuro(ced.inps_dipendente)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>
                              -{formatEuro(ced.irpef)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>
                              {formatEuro(ced.netto)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {ced.pagato ? (
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                                  ✅ Pagato
                                </span>
                              ) : (
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                                  ⏳ Da pagare
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldBox({ label, value, field, editMode, formData, setFormData, type = 'text', isCurrency }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      {editMode ? (
        <input
          type={type}
          value={formData[field] || ''}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
        />
      ) : (
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
          {isCurrency && value ? `€ ${parseFloat(value).toFixed(2)}` : value || '-'}
        </div>
      )}
    </div>
  );
}
