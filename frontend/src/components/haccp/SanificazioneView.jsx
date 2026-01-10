import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const MESI_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

const giorniNelMese = (mese, anno) => {
  return new Date(anno, mese, 0).getDate();
};

const SanificazioneView = () => {
  const [mese, setMese] = useState(new Date().getMonth() + 1);
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [scheda, setScheda] = useState(null);
  const [schedaApparecchi, setSchedaApparecchi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('attrezzature'); // 'attrezzature' | 'apparecchi'

  const numGiorni = giorniNelMese(mese, anno);

  const fetchScheda = useCallback(async () => {
    setLoading(true);
    try {
      const [attrRes, appRes] = await Promise.all([
        api.get(`/api/haccp-v2/sanificazione/scheda/${anno}/${mese}`),
        api.get(`/api/haccp-v2/sanificazione/apparecchi/${anno}`)
      ]);
      setScheda(attrRes.data);
      setSchedaApparecchi(appRes.data);
    } catch (err) {
      console.error('Errore caricamento scheda sanificazione', err);
    }
    setLoading(false);
  }, [anno, mese]);

  useEffect(() => { fetchScheda(); }, [fetchScheda]);

  const cambiaMese = (delta) => {
    let nuovoMese = mese + delta;
    let nuovoAnno = anno;
    if (nuovoMese < 1) { nuovoMese = 12; nuovoAnno--; }
    if (nuovoMese > 12) { nuovoMese = 1; nuovoAnno++; }
    setMese(nuovoMese);
    setAnno(nuovoAnno);
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

  const registrazioni = scheda?.registrazioni || {};
  const attrezzature = Object.keys(registrazioni);

  // Filtra sanificazioni apparecchi per il mese corrente
  const getSanificazioniMese = (tipo, numero) => {
    const key = String(numero);
    const sanifs = tipo === 'frigoriferi' 
      ? schedaApparecchi?.registrazioni_frigoriferi?.[key] || []
      : schedaApparecchi?.registrazioni_congelatori?.[key] || [];
    return sanifs.filter(s => s.mese === mese);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            ✨ Registro Sanificazione
          </h2>
          <p className="text-sm text-gray-500">Ceraldi Group S.R.L. - Operatore: {scheda?.operatore_responsabile || schedaApparecchi?.operatore}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cambiaMese(-1)} className="p-2 hover:bg-gray-100 rounded" data-testid="sanificazione-prev-month">◀</button>
          <span className="font-semibold min-w-[150px] text-center">{MESI_IT[mese-1]} {anno}</span>
          <button onClick={() => cambiaMese(1)} className="p-2 hover:bg-gray-100 rounded" data-testid="sanificazione-next-month">▶</button>
          <button 
            onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/haccp-v2/sanificazione/export-pdf/${anno}/${mese}`, '_blank')} 
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1"
            data-testid="sanificazione-pdf-btn"
          >
            🖨️ PDF
          </button>
          <button onClick={fetchScheda} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">🔄</button>
        </div>
      </div>

      {/* Toggle View */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setViewMode('attrezzature')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'attrezzature' ? 'bg-white shadow' : ''}`}
          data-testid="sanificazione-tab-attrezzature"
        >
          🔧 Attrezzature
        </button>
        <button 
          onClick={() => setViewMode('apparecchi')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'apparecchi' ? 'bg-white shadow' : ''}`}
          data-testid="sanificazione-tab-apparecchi"
        >
          🧊 Apparecchi Refrigeranti
        </button>
      </div>

      {viewMode === 'attrezzature' ? (
        /* Tabella Attrezzature */
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="p-2 text-left sticky left-0 bg-blue-600 min-w-[200px]">Attrezzatura</th>
                {Array.from({length: numGiorni}, (_, i) => (
                  <th key={i+1} className="p-1 w-8 text-center">{i+1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrezzature.map((attr, idx) => (
                <tr key={attr} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="p-2 font-medium sticky left-0 bg-inherit border-r">{attr}</td>
                  {Array.from({length: numGiorni}, (_, i) => {
                    const giorno = String(i+1);
                    const valore = registrazioni[attr]?.[giorno];
                    return (
                      <td key={i+1} className={`p-1 text-center ${valore === 'X' ? 'bg-green-100 text-green-700 font-bold' : ''}`}>
                        {valore || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Griglia Apparecchi Refrigeranti */
        <div className="space-y-4">
          {/* Frigoriferi */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-bold text-blue-700 mb-3">🧊 Frigoriferi - Sanificazioni {MESI_IT[mese-1]}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({length: 12}, (_, i) => {
                const sanifs = getSanificazioniMese('frigoriferi', i+1);
                const eseguite = sanifs.filter(s => s.eseguita).length;
                return (
                  <div key={i+1} className={`p-3 rounded-lg border ${eseguite > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-sm font-medium">Frigo N°{i+1}</div>
                    <div className="text-xs mt-1 text-gray-600">
                      {eseguite > 0 ? `${eseguite} sanificazioni` : 'Nessuna'}
                    </div>
                    {sanifs.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="text-xs text-green-600">{s.data}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Congelatori */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-bold text-purple-700 mb-3">❄️ Congelatori - Sanificazioni {MESI_IT[mese-1]}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Array.from({length: 12}, (_, i) => {
                const sanifs = getSanificazioniMese('congelatori', i+1);
                const eseguite = sanifs.filter(s => s.eseguita).length;
                return (
                  <div key={i+1} className={`p-3 rounded-lg border ${eseguite > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-sm font-medium">Cong. N°{i+1}</div>
                    <div className="text-xs mt-1 text-gray-600">
                      {eseguite > 0 ? `${eseguite} sanificazioni` : 'Nessuna'}
                    </div>
                    {sanifs.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="text-xs text-green-600">{s.data}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanificazioneView;
