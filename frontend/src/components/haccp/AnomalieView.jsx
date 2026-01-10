import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const AnomalieView = () => {
  const [anomalie, setAnomalie] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formAnomalia, setFormAnomalia] = useState({
    attrezzatura: '',
    descrizione: '',
    stato: 'in_disuso',
    data_rilevazione: new Date().toISOString().split('T')[0],
    responsabile: '',
    note: ''
  });

  const fetchAnomalie = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/haccp-v2/anomalie');
      setAnomalie(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error('Errore caricamento anomalie', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnomalie(); }, [fetchAnomalie]);

  const saveAnomalia = async () => {
    try {
      await api.post('/api/haccp-v2/anomalie', formAnomalia);
      setShowModal(false);
      setFormAnomalia({
        attrezzatura: '',
        descrizione: '',
        stato: 'in_disuso',
        data_rilevazione: new Date().toISOString().split('T')[0],
        responsabile: '',
        note: ''
      });
      fetchAnomalie();
    } catch (err) {
      alert('Errore salvataggio anomalia');
    }
  };

  const deleteAnomalia = async (id) => {
    if (!window.confirm('Eliminare questa anomalia?')) return;
    try {
      await api.delete(`/api/haccp-v2/anomalie/${id}`);
      fetchAnomalie();
    } catch (err) {
      alert('Errore eliminazione');
    }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            ⚠️ Registro Anomalie
          </h2>
          <p className="text-sm text-gray-500">Attrezzature in disuso o non conformi</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
            data-testid="nuova-anomalia-btn"
          >
            + Nuova Anomalia
          </button>
          <button onClick={fetchAnomalie} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm">🔄</button>
        </div>
      </div>

      {/* Lista Anomalie */}
      {anomalie.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-700 font-medium">Nessuna anomalia registrata</p>
          <p className="text-sm text-gray-500">Tutte le attrezzature sono conformi</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {anomalie.map(anomalia => (
            <div key={anomalia.id} className="bg-white border rounded-lg p-4 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    anomalia.stato === 'in_disuso' ? 'bg-gray-100 text-gray-700' :
                    anomalia.stato === 'non_conforme' ? 'bg-red-100 text-red-700' :
                    anomalia.stato === 'risolto' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {anomalia.stato?.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="font-bold">{anomalia.attrezzatura}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{anomalia.descrizione}</p>
                <div className="text-xs text-gray-400 mt-2">
                  📅 {anomalia.data_rilevazione} | 👤 {anomalia.responsabile || '-'}
                </div>
                {anomalia.note && <p className="text-xs text-gray-500 mt-1 italic">{anomalia.note}</p>}
              </div>
              <button 
                onClick={() => deleteAnomalia(anomalia.id)}
                className="text-red-500 hover:text-red-700 p-1"
                data-testid={`delete-anomalia-${anomalia.id}`}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuova Anomalia */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold">Nuova Anomalia</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Attrezzatura</label>
                <input 
                  type="text"
                  value={formAnomalia.attrezzatura}
                  onChange={e => setFormAnomalia({...formAnomalia, attrezzatura: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  placeholder="Nome attrezzatura"
                  data-testid="anomalia-attrezzatura-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descrizione</label>
                <textarea 
                  value={formAnomalia.descrizione}
                  onChange={e => setFormAnomalia({...formAnomalia, descrizione: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Descrizione del problema"
                  data-testid="anomalia-descrizione-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Stato</label>
                <select 
                  value={formAnomalia.stato}
                  onChange={e => setFormAnomalia({...formAnomalia, stato: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  data-testid="anomalia-stato-select"
                >
                  <option value="in_disuso">In Disuso</option>
                  <option value="non_conforme">Non Conforme</option>
                  <option value="in_riparazione">In Riparazione</option>
                  <option value="risolto">Risolto</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Data Rilevazione</label>
                  <input 
                    type="date"
                    value={formAnomalia.data_rilevazione}
                    onChange={e => setFormAnomalia({...formAnomalia, data_rilevazione: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                    data-testid="anomalia-data-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Responsabile</label>
                  <input 
                    type="text"
                    value={formAnomalia.responsabile}
                    onChange={e => setFormAnomalia({...formAnomalia, responsabile: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                    placeholder="Nome"
                    data-testid="anomalia-responsabile-input"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">Annulla</button>
              <button 
                onClick={saveAnomalia} 
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                data-testid="salva-anomalia-btn"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnomalieView;
