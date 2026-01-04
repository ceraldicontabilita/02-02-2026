import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const OPERATORI = ["VALERIO", "VINCENZO", "POCCI", "MARIO", "LUIGI"];

export default function TemperatureFrigoriferi() {
  const navigate = useNavigate();
  const [data, setData] = useState({ records: [], frigoriferi: [], count: 0 });
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
      const res = await api.get(`/api/haccp-completo/temperature/frigoriferi?mese=${meseCorrente}`);
      setData(res.data);
    } catch (error) {
      console.error('Error loading temperatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneraMese = async () => {
    try {
      await api.post('/api/haccp-completo/temperature/frigoriferi/genera-mese', { mese: meseCorrente });
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAutocompila = async () => {
    try {
      await api.post('/api/haccp-completo/temperature/frigoriferi/autocompila-oggi');
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSvuotaMese = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare tutti i record di ${meseCorrente}?`)) return;
    try {
      await api.delete(`/api/haccp-completo/temperature/frigoriferi/mese/${meseCorrente}`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveRecord = async () => {
    if (!editingRecord) return;
    try {
      const temp = parseFloat(editForm.temperatura);
      const conforme = temp >= 0 && temp <= 4;
      
      await api.post('/api/haccp-completo/temperature/frigoriferi', {
        data: editingRecord.data,
        equipaggiamento: editingRecord.equipaggiamento,
        temperatura: temp,
        ora: editForm.ora || new Date().toTimeString().slice(0, 5),
        operatore: editForm.operatore,
        note: editForm.note,
        azione_correttiva: !conforme ? editForm.azione_correttiva : ''
      });
      
      setEditingRecord(null);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Organizza dati per visualizzazione calendario
  const getDaysInMonth = () => {
    const [year, month] = meseCorrente.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const getRecordForDay = (day, frigo) => {
    const dateStr = `${meseCorrente}-${String(day).padStart(2, '0')}`;
    return data.records?.find(r => r.data === dateStr && r.equipaggiamento === frigo);
  };

  const getTempColor = (temp) => {
    if (temp === null || temp === undefined) return '#f5f5f5';
    if (temp >= 0 && temp <= 4) return '#e8f5e9';  // OK
    if (temp > 4 && temp <= 7) return '#fff3e0';   // Attenzione
    return '#ffebee';  // Fuori range
  };

  const daysInMonth = getDaysInMonth();
  const frigoriferi = data.frigoriferi || [];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/haccp')} style={{ marginRight: 15, padding: '8px 12px' }}>
          ← Indietro
        </button>
        <h1 style={{ margin: 0 }}>🌡️ Temperature Frigoriferi</h1>
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
          style={{ padding: '8px 16px', background: '#2196f3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          ⚡ Autocompila Oggi
        </button>
        <button
          onClick={handleSvuotaMese}
          style={{ padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          🗑️ Svuota Mese
        </button>
        <span style={{ marginLeft: 'auto', color: '#666' }}>
          {data.count} registrazioni
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 15, fontSize: 12 }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#e8f5e9', marginRight: 5 }}></span> OK (0-4°C)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fff3e0', marginRight: 5 }}></span> Attenzione (4-7°C)</span>
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
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 8, border: '1px solid #ddd', position: 'sticky', left: 0, background: '#f5f5f5' }}>Frigo</th>
                {[...Array(daysInMonth)].map((_, i) => (
                  <th key={i} style={{ padding: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 35 }}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {frigoriferi.map((frigo, idx) => (
                <tr key={idx}>
                  <td style={{ 
                    padding: 8, 
                    border: '1px solid #ddd', 
                    fontWeight: 'bold',
                    position: 'sticky',
                    left: 0,
                    background: 'white'
                  }}>
                    {frigo.nome}
                  </td>
                  {[...Array(daysInMonth)].map((_, dayIdx) => {
                    const record = getRecordForDay(dayIdx + 1, frigo.nome);
                    const temp = record?.temperatura;
                    
                    return (
                      <td
                        key={dayIdx}
                        onClick={() => {
                          setEditingRecord({
                            data: `${meseCorrente}-${String(dayIdx + 1).padStart(2, '0')}`,
                            equipaggiamento: frigo.nome
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
            <h2 style={{ marginTop: 0 }}>Registra Temperatura</h2>
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
                  placeholder="Es. 3.5"
                />
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
                onClick={handleSaveRecord}
                style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
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
