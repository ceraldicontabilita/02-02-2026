import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const MESI_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

const giorniNelMese = (mese, anno) => new Date(anno, mese, 0).getDate();

const TemperaturePositiveView = () => {
  const [mese, setMese] = useState(new Date().getMonth() + 1);
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [schede, setSchede] = useState([]);
  const [selectedFrigorifero, setSelectedFrigorifero] = useState(1);
  const [loading, setLoading] = useState(true);

  const numGiorni = giorniNelMese(mese, anno);

  const fetchSchede = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/haccp-v2/temperature-positive/schede/${anno}`);
      setSchede(res.data || []);
    } catch (err) {
      console.error('Errore caricamento schede temperature positive', err);
    }
    setLoading(false);
  }, [anno]);

  useEffect(() => { fetchSchede(); }, [fetchSchede]);

  const cambiaMese = (delta) => {
    let nuovoMese = mese + delta;
    let nuovoAnno = anno;
    if (nuovoMese < 1) { nuovoMese = 12; nuovoAnno--; }
    if (nuovoMese > 12) { nuovoMese = 1; nuovoAnno++; }
    setMese(nuovoMese);
    setAnno(nuovoAnno);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>;

  const schedaSelezionata = schede.find(s => s.frigorifero_numero === selectedFrigorifero) || {};
  const tempMese = schedaSelezionata.temperature?.[String(mese)] || {};

  // Calcola statistiche
  const temps = Object.values(tempMese).map(t => typeof t === 'object' ? t.temp : t).filter(t => typeof t === 'number');
  const media = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '-';
  const min = temps.length > 0 ? Math.min(...temps).toFixed(1) : '-';
  const max = temps.length > 0 ? Math.max(...temps).toFixed(1) : '-';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            🌡️ Temperature Positive (Frigoriferi)
          </h2>
          <p className="text-sm text-gray-500">Range: 0°C / +4°C | {schedaSelezionata.azienda || 'Ceraldi Group S.R.L.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cambiaMese(-1)} className="p-2 hover:bg-gray-100 rounded" data-testid="temp-pos-prev-month">◀</button>
          <span className="font-semibold min-w-[150px] text-center">{MESI_IT[mese-1]} {anno}</span>
          <button onClick={() => cambiaMese(1)} className="p-2 hover:bg-gray-100 rounded" data-testid="temp-pos-next-month">▶</button>
          <button onClick={fetchSchede} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">🔄</button>
        </div>
      </div>

      {/* Selector Frigorifero */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({length: 12}, (_, i) => (
          <button
            key={i+1}
            onClick={() => setSelectedFrigorifero(i+1)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
              selectedFrigorifero === i+1 
                ? 'bg-orange-600 text-white border-orange-600' 
                : 'bg-white hover:bg-gray-50 border-gray-200'
            }`}
            data-testid={`frigorifero-btn-${i+1}`}
          >
            Frigo {i+1}
          </button>
        ))}
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">{media}°C</div>
          <div className="text-sm text-gray-500">Media</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{min}°C</div>
          <div className="text-sm text-gray-500">Min</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{max}°C</div>
          <div className="text-sm text-gray-500">Max</div>
        </div>
      </div>

      {/* Tabella Temperature */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-600 text-white">
              <th className="p-2 text-left">Giorno</th>
              <th className="p-2 text-center">Temperatura</th>
              <th className="p-2 text-center">Operatore</th>
              <th className="p-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: numGiorni}, (_, i) => {
              const giorno = String(i+1);
              const record = tempMese[giorno];
              const temp = typeof record === 'object' ? record?.temp : record;
              const operatore = typeof record === 'object' ? record?.operatore : '';
              const note = typeof record === 'object' ? (record?.motivo || record?.note) : '';
              const isAllarme = temp !== null && temp !== undefined && (temp > 4 || temp < 0);
              const isChiuso = typeof record === 'object' && (record?.is_chiuso || record?.is_manutenzione || record?.is_non_usato);
              
              return (
                <tr key={i+1} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="p-2 font-medium">{i+1}</td>
                  <td className={`p-2 text-center font-medium ${isChiuso ? 'text-gray-400' : isAllarme ? 'bg-red-100 text-red-700' : temp !== null && temp !== undefined ? 'text-orange-700' : 'text-gray-300'}`}>
                    {isChiuso ? '—' : (temp !== null && temp !== undefined ? `${temp}°C` : '-')}
                  </td>
                  <td className="p-2 text-center text-xs text-gray-600">{operatore || '-'}</td>
                  <td className="p-2 text-xs text-gray-500">{note || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TemperaturePositiveView;
