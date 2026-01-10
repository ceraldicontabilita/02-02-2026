import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';

const SEZIONI_MANUALE = [
  { id: 1, titolo: "Dati Aziendali", icona: "🏢" },
  { id: 2, titolo: "Organigramma HACCP", icona: "👥" },
  { id: 3, titolo: "Descrizione Attività", icona: "📋" },
  { id: 4, titolo: "Layout Locali", icona: "🗺️" },
  { id: 5, titolo: "Diagramma di Flusso", icona: "🔄" },
  { id: 6, titolo: "Analisi dei Pericoli", icona: "⚠️" },
  { id: 7, titolo: "Punti Critici (CCP)", icona: "🎯" },
  { id: 8, titolo: "Limiti Critici", icona: "📏" },
  { id: 9, titolo: "Procedure di Monitoraggio", icona: "👁️" },
  { id: 10, titolo: "Azioni Correttive", icona: "🔧" },
  { id: 11, titolo: "Procedure di Verifica", icona: "✅" },
  { id: 12, titolo: "Documentazione", icona: "📁" },
  { id: 13, titolo: "Formazione Personale", icona: "🎓" },
  { id: 14, titolo: "Gestione Fornitori", icona: "🤝" },
  { id: 15, titolo: "Tracciabilità", icona: "🔍" },
  { id: 16, titolo: "Gestione Allergeni", icona: "🥜" },
  { id: 17, titolo: "Pulizia e Sanificazione", icona: "🧹" },
  { id: 18, titolo: "Controllo Infestanti", icona: "🐛" },
  { id: 19, titolo: "Gestione Rifiuti", icona: "🗑️" },
  { id: 20, titolo: "Manutenzione Attrezzature", icona: "🔩" },
  { id: 21, titolo: "Gestione Non Conformità", icona: "❌" }
];

const ManualeHACCPView = () => {
  const [manuale, setManuale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSezione, setSelectedSezione] = useState(null);

  const fetchManuale = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/haccp-v2/manuale-haccp');
      setManuale(res.data);
    } catch (err) {
      console.error('Errore caricamento manuale', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchManuale(); }, [fetchManuale]);

  const generaPDF = async (sezioneId = null) => {
    const url = sezioneId 
      ? `${process.env.REACT_APP_BACKEND_URL}/api/haccp-v2/manuale-haccp/export-pdf?sezione=${sezioneId}`
      : `${process.env.REACT_APP_BACKEND_URL}/api/haccp-v2/manuale-haccp/export-pdf`;
    window.open(url, '_blank');
  };

  const condividiWhatsApp = (sezioneId) => {
    const sezione = SEZIONI_MANUALE.find(s => s.id === sezioneId);
    const testo = encodeURIComponent(`Manuale HACCP - ${sezione?.titolo || 'Completo'}\nCeraldi Group S.R.L.`);
    window.open(`https://wa.me/?text=${testo}`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            📋 Manuale HACCP
          </h2>
          <p className="text-sm text-gray-500">Sistema di Autocontrollo Igienico-Sanitario</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => generaPDF()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
            data-testid="manuale-pdf-completo-btn"
          >
            🖨️ PDF Completo
          </button>
          <button onClick={fetchManuale} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm">🔄</button>
        </div>
      </div>

      {/* Info Azienda */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="font-bold text-indigo-800 mb-2">🏢 Ceraldi Group S.R.L.</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">P.IVA</span>
            <p className="font-medium">04523831214</p>
          </div>
          <div>
            <span className="text-gray-500">Indirizzo</span>
            <p className="font-medium">Piazza Carità 14, 80134 Napoli</p>
          </div>
          <div>
            <span className="text-gray-500">Attività</span>
            <p className="font-medium">Bar, Pasticceria, Gastronomia</p>
          </div>
          <div>
            <span className="text-gray-500">Responsabile HACCP</span>
            <p className="font-medium">{manuale?.responsabile_haccp || 'Vincenzo Ceraldi'}</p>
          </div>
        </div>
      </div>

      {/* Griglia Sezioni */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SEZIONI_MANUALE.map(sezione => (
          <div 
            key={sezione.id}
            className="bg-white border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedSezione(sezione)}
            data-testid={`sezione-manuale-${sezione.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{sezione.icona}</span>
                <div>
                  <span className="text-xs text-gray-400">Sezione {sezione.id}</span>
                  <h4 className="font-medium">{sezione.titolo}</h4>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); generaPDF(sezione.id); }}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500"
                  title="Scarica PDF"
                >
                  📄
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); condividiWhatsApp(sezione.id); }}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500"
                  title="Condividi WhatsApp"
                >
                  📱
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dettaglio Sezione */}
      {selectedSezione && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-indigo-50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedSezione.icona}</span>
                <div>
                  <span className="text-xs text-indigo-600">Sezione {selectedSezione.id}</span>
                  <h3 className="font-bold">{selectedSezione.titolo}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedSezione(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-600 mb-4">
                Contenuto della sezione "{selectedSezione.titolo}" del Manuale HACCP.
                Questa sezione descrive le procedure e i controlli relativi a questo aspetto
                del sistema di autocontrollo igienico-sanitario.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <h4 className="font-medium mb-2">Riferimenti Normativi</h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Reg. CE 852/2004 - Igiene dei prodotti alimentari</li>
                  <li>Reg. CE 853/2004 - Norme specifiche alimenti origine animale</li>
                  <li>D.Lgs. 193/2007 - Attuazione direttive CE</li>
                  <li>Codex Alimentarius - 7 Principi HACCP</li>
                </ul>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button 
                onClick={() => generaPDF(selectedSezione.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1"
              >
                🖨️ Scarica PDF
              </button>
              <button 
                onClick={() => condividiWhatsApp(selectedSezione.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1"
              >
                📱 WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualeHACCPView;
