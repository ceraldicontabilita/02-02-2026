import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const MESI_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
                "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

const DisinfestazioneView = () => {
  const [mese, setMese] = useState(new Date().getMonth() + 1);
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [scheda, setScheda] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchScheda = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/haccp-v2/disinfestazione/scheda-annuale/${anno}`);
      setScheda(res.data);
    } catch (err) {
      console.error('Errore caricamento scheda disinfestazione', err);
    }
    setLoading(false);
  }, [anno]);

  useEffect(() => { fetchScheda(); }, [fetchScheda]);

  const cambiaMese = (delta) => {
    let nuovoMese = mese + delta;
    let nuovoAnno = anno;
    if (nuovoMese < 1) { nuovoMese = 12; nuovoAnno--; }
    if (nuovoMese > 12) { nuovoMese = 1; nuovoAnno++; }
    setMese(nuovoMese);
    setAnno(nuovoAnno);
  };

  const getInterventoMese = () => {
    if (!scheda) return null;
    return scheda.interventi_mensili?.[String(mese)];
  };

  const getMonitoraggioMese = (apparecchio) => {
    if (!scheda) return null;
    const mon = scheda.monitoraggio_apparecchi?.[apparecchio];
    if (!mon) return null;
    return mon[String(mese)];
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"></div></div>;

  const monitoraggio = scheda?.monitoraggio_apparecchi || {};
  const intervento = getInterventoMese();

  const frigoriferi = Object.keys(monitoraggio)
    .filter(nome => nome.includes("Frigorifero"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });

  const congelatori = Object.keys(monitoraggio)
    .filter(nome => nome.includes("Congelatore"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            🐛 Registro Disinfestazione
          </h2>
          <p className="text-sm text-gray-500">Ceraldi Group S.R.L. - Monitoraggio Pest Control</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => cambiaMese(-1)} className="p-2 hover:bg-gray-100 rounded" data-testid="disinfestazione-prev-month">◀</button>
          <span className="font-semibold min-w-[150px] text-center">{MESI_IT[mese-1]} {anno}</span>
          <button onClick={() => cambiaMese(1)} className="p-2 hover:bg-gray-100 rounded" data-testid="disinfestazione-next-month">▶</button>
          <button 
            onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/haccp-v2/disinfestazione/export-pdf/${anno}`, '_blank')} 
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1"
            data-testid="disinfestazione-pdf-btn"
          >
            🖨️ PDF
          </button>
          <button onClick={fetchScheda} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm">🔄</button>
        </div>
      </div>

      {/* Ditta Disinfestazione */}
      {scheda?.ditta && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r">
          <h3 className="font-bold text-orange-800">🏢 Ditta Incaricata</h3>
          <p className="font-semibold">{scheda.ditta.ragione_sociale}</p>
          <p className="text-sm text-gray-600">P.IVA: {scheda.ditta.partita_iva} | {scheda.ditta.indirizzo}</p>
          <p className="text-sm text-gray-600">PEC: {scheda.ditta.pec}</p>
        </div>
      )}

      {/* Intervento del Mese */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-3">📅 Intervento {MESI_IT[mese-1]} {anno}</h3>
        {intervento ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-500">Giorno</span>
              <p className="font-bold text-lg">{intervento.giorno || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Esito</span>
              <p className={`font-medium ${intervento.esito?.includes('OK') ? 'text-green-600' : 'text-orange-600'}`}>
                {intervento.esito || '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Tipo</span>
              <p className="text-sm">{intervento.tipo || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Note</span>
              <p className="text-sm">{intervento.note || '-'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Nessun intervento registrato per questo mese</p>
        )}
      </div>

      {/* Monitoraggio Frigoriferi */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
          🧊 Monitoraggio Frigoriferi ({frigoriferi.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {frigoriferi.map(nome => {
            const stato = getMonitoraggioMese(nome);
            const isOk = stato?.esito === 'OK';
            return (
              <div key={nome} className={`p-3 rounded-lg border ${isOk ? 'bg-green-50 border-green-200' : stato ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-sm font-medium truncate">{nome}</div>
                <div className={`text-xs mt-1 ${isOk ? 'text-green-600' : stato ? 'text-red-600' : 'text-gray-400'}`}>
                  {stato?.esito || 'N/D'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monitoraggio Congelatori */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
          ❄️ Monitoraggio Congelatori ({congelatori.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {congelatori.map(nome => {
            const stato = getMonitoraggioMese(nome);
            const isOk = stato?.esito === 'OK';
            return (
              <div key={nome} className={`p-3 rounded-lg border ${isOk ? 'bg-green-50 border-green-200' : stato ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-sm font-medium truncate">{nome}</div>
                <div className={`text-xs mt-1 ${isOk ? 'text-green-600' : stato ? 'text-red-600' : 'text-gray-400'}`}>
                  {stato?.esito || 'N/D'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DisinfestazioneView;
