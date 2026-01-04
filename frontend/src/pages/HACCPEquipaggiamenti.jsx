import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function HACCPEquipaggiamenti() {
  const navigate = useNavigate();
  const [data, setData] = useState({ frigoriferi: [], congelatori: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEquip, setNewEquip] = useState({
    nome: '',
    tipo: 'frigorifero',
    temp_min: 0,
    temp_max: 4,
    posizione: '',
    note: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/haccp-completo/equipaggiamenti');
      setData(res.data);
    } catch (error) {
      console.error('Error loading equipaggiamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newEquip.nome) {
      alert('Il nome è obbligatorio');
      return;
    }
    try {
      await api.post('/api/haccp-completo/equipaggiamenti', newEquip);
      setShowForm(false);
      setNewEquip({
        nome: '',
        tipo: 'frigorifero',
        temp_min: 0,
        temp_max: 4,
        posizione: '',
        note: ''
      });
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo equipaggiamento?')) return;
    try {
      await api.delete(`/api/haccp-completo/equipaggiamenti/${id}`);
      loadData();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleTipoChange = (tipo) => {
    const defaults = tipo === 'frigorifero' 
      ? { temp_min: 0, temp_max: 4 }
      : { temp_min: -22, temp_max: -18 };
    setNewEquip({ ...newEquip, tipo, ...defaults });
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/haccp')} style={{ marginRight: 15, padding: '8px 12px' }}>
          ← Indietro
        </button>
        <h1 style={{ margin: 0 }}>🔧 Equipaggiamenti HACCP</h1>
      </div>

      <p style={{ color: '#666', marginBottom: 20 }}>
        Configura frigoriferi e congelatori per il monitoraggio delle temperature
      </p>

      {/* Add Button */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          ➕ Aggiungi Equipaggiamento
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : (
        <div style={{ display: 'grid', gap: 30 }}>
          {/* Frigoriferi */}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              🌡️ Frigoriferi
              <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>
                (range: 0°C - 4°C)
              </span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 15 }}>
              {data.frigoriferi?.map((eq, idx) => (
                <div key={eq.id || idx} style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #2196f3'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 10px 0' }}>{eq.nome}</h3>
                      <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                        Range: {eq.temp_min}°C - {eq.temp_max}°C
                      </p>
                      {eq.posizione && (
                        <p style={{ margin: '5px 0 0 0', color: '#999', fontSize: 12 }}>
                          📍 {eq.posizione}
                        </p>
                      )}
                    </div>
                    {eq.id && (
                      <button
                        onClick={() => handleDelete(eq.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f44336' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {data.frigoriferi?.length === 0 && (
                <div style={{ padding: 20, color: '#666', fontStyle: 'italic' }}>
                  Nessun frigorifero configurato
                </div>
              )}
            </div>
          </div>

          {/* Congelatori */}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              ❄️ Congelatori
              <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>
                (range: -22°C - -18°C)
              </span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 15 }}>
              {data.congelatori?.map((eq, idx) => (
                <div key={eq.id || idx} style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #00bcd4'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 10px 0' }}>{eq.nome}</h3>
                      <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                        Range: {eq.temp_min}°C - {eq.temp_max}°C
                      </p>
                      {eq.posizione && (
                        <p style={{ margin: '5px 0 0 0', color: '#999', fontSize: 12 }}>
                          📍 {eq.posizione}
                        </p>
                      )}
                    </div>
                    {eq.id && (
                      <button
                        onClick={() => handleDelete(eq.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f44336' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {data.congelatori?.length === 0 && (
                <div style={{ padding: 20, color: '#666', fontStyle: 'italic' }}>
                  Nessun congelatore configurato
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            maxWidth: 400,
            width: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>➕ Nuovo Equipaggiamento</h2>
            
            <div style={{ display: 'grid', gap: 15 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Nome *</label>
                <input
                  type="text"
                  value={newEquip.nome}
                  onChange={(e) => setNewEquip({ ...newEquip, nome: e.target.value })}
                  placeholder="Es. Frigo Bar, Cella Freezer..."
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Tipo</label>
                <select
                  value={newEquip.tipo}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                >
                  <option value="frigorifero">Frigorifero</option>
                  <option value="congelatore">Congelatore</option>
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Temp. Min (°C)</label>
                  <input
                    type="number"
                    value={newEquip.temp_min}
                    onChange={(e) => setNewEquip({ ...newEquip, temp_min: parseInt(e.target.value) })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Temp. Max (°C)</label>
                  <input
                    type="number"
                    value={newEquip.temp_max}
                    onChange={(e) => setNewEquip({ ...newEquip, temp_max: parseInt(e.target.value) })}
                    style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Posizione</label>
                <input
                  type="text"
                  value={newEquip.posizione}
                  onChange={(e) => setNewEquip({ ...newEquip, posizione: e.target.value })}
                  placeholder="Es. Cucina, Bar..."
                  style={{ padding: 10, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
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
