import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const OPERATORI = ["VALERIO", "VINCENZO", "POCCI", "MARIO", "LUIGI"];

export default function HACCPTemperaturaCongelatori() {
  const navigate = useNavigate();
  const [data, setData] = useState({ records: [], congelatori: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [meseCorrente, setMeseCorrente] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadData();
  }, [meseCorrente]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/haccp-completo/temperature/congelatori?mese=${meseCorrente}`);
      setData(res.data);
    } catch (error) {
      console.error('Error loading temperatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneraMese = async () => {
    try {
      await api.post('/api/haccp-completo/temperature/congelatori/genera-mese', { mese: meseCorrente });
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAutocompila = async () => {
    try {
      await api.post('/api/haccp-completo/temperature/congelatori/autocompila-oggi');
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getDaysInMonth = () => {
    const [year, month] = meseCorrente.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const getRecordForDay = (day, congel) => {
    const dateStr = `${meseCorrente}-${String(day).padStart(2, '0')}`;
    return data.records?.find(r => r.data === dateStr && r.equipaggiamento === congel);
  };

  const getTempColor = (temp) => {
    if (temp === null || temp === undefined) return '#f5f5f5';
    if (temp >= -22 && temp <= -18) return '#e8f5e9';  // OK
    if (temp > -18 && temp <= -15) return '#fff3e0';   // Attenzione
    return '#ffebee';  // Fuori range
  };

  const daysInMonth = getDaysInMonth();
  const congelatori = data.congelatori || [];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/haccp')} style={{ marginRight: 15, padding: '8px 12px' }}>
          ← Indietro
        </button>
        <h1 style={{ margin: 0 }}>❄️ Temperature Congelatori</h1>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="month"
          value={meseCorrente}
          onChange={(e) => setMeseCorrente(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd' }}
        />
        <button
          onClick={handleGeneraMese}
          style={{ padding: '8px 16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          📅 Genera Mese
        </button>
        <button
          onClick={handleAutocompila}
          style={{ padding: '8px 16px', background: '#00bcd4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          ⚡ Autocompila Oggi
        </button>
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          {data.count} registrazioni
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 15, fontSize: 12 }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#e8f5e9', marginRight: 5 }}></span> OK (-22 a -18°C)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fff3e0', marginRight: 5 }}></span> Attenzione (-18 a -15°C)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ffebee', marginRight: 5 }}></span> Fuori range</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f5f5f5', marginRight: 5 }}></span> Non registrato</span>
      </div>

      {/* Temperature Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#e0f7fa' }}>
                <th style={{ padding: 8, border: '1px solid #ddd', position: 'sticky', left: 0, background: '#e0f7fa' }}>Congelatore</th>
                {[...Array(daysInMonth)].map((_, i) => (
                  <th key={i} style={{ padding: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 35 }}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {congelatori.map((congel, idx) => (
                <tr key={idx}>
                  <td style={{ 
                    padding: 8, 
                    border: '1px solid #ddd', 
                    fontWeight: 'bold',
                    position: 'sticky',
                    left: 0,
                    background: 'white'
                  }}>
                    {congel.nome}
                  </td>
                  {[...Array(daysInMonth)].map((_, dayIdx) => {
                    const record = getRecordForDay(dayIdx + 1, congel.nome);
                    const temp = record?.temperatura;
                    
                    return (
                      <td
                        key={dayIdx}
                        onClick={() => {
                          setEditingRecord({
                            data: `${meseCorrente}-${String(dayIdx + 1).padStart(2, '0')}`,
                            equipaggiamento: congel.nome
                          });
                          setEditForm({
                            temperatura: temp || '',
                            ora: record?.ora || '',
                            operatore: record?.operatore || '',
                            note: record?.note || ''
                          });
                        }}
                        style={{
                          padding: 4,
                          border: '1px solid #ddd',
                          background: getTempColor(temp),
                          textAlign: 'center',
                          cursor: 'pointer',
                          fontSize: 11
                        }}
                        title={record ? `${temp}°C - ${record.ora} - ${record.operatore}` : 'Clicca per registrare'}
                      >
                        {temp !== null && temp !== undefined ? `${temp}°` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setEditingRecord(null)}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 400,
            width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>❄️ Registra Temperatura Congelatore</h2>
            <p style={{ color: '#666' }}>
              {editingRecord.equipaggiamento} - {editingRecord.data}
            </p>
            
            <div style={{ display: 'grid', gap: 15 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.temperatura}
                  onChange={(e) => setEditForm({ ...editForm, temperatura: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  placeholder="Es. -20"
                />
                <small style={{ color: '#666' }}>Range ottimale: -22°C a -18°C</small>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Ora</label>
                <input
                  type="time"
                  value={editForm.ora}
                  onChange={(e) => setEditForm({ ...editForm, ora: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Operatore</label>
                <select
                  value={editForm.operatore}
                  onChange={(e) => setEditForm({ ...editForm, operatore: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                >
                  <option value="">Seleziona...</option>
                  {OPERATORI.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Note</label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setEditingRecord(null)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={async () => {
                  try {
                    const temp = parseFloat(editForm.temperatura);
                    const conforme = temp >= -22 && temp <= -18;
                    
                    // Use update endpoint or create
                    await api.post('/api/haccp-completo/temperature/congelatori', {
                      data: editingRecord.data,
                      equipaggiamento: editingRecord.equipaggiamento,
                      temperatura: temp,
                      ora: editForm.ora || new Date().toTimeString().slice(0, 5),
                      operatore: editForm.operatore,
                      conforme,
                      note: editForm.note
                    });
                    
                    setEditingRecord(null);
                    loadData();
                  } catch (error) {
                    alert('Errore: ' + (error.response?.data?.detail || error.message));
                  }
                }}
                style={{ padding: '10px 20px', background: '#00bcd4', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
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
