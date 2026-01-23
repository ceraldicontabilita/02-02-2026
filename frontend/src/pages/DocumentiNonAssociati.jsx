import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, CheckCircle, XCircle, ChevronRight, 
  Calendar, Building, User, Car, Euro, Folder, Plus
} from 'lucide-react';
import api from '../api';

const DocumentiNonAssociati = () => {
  const [documenti, setDocumenti] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [collezioniDisponibili, setCollezioniDisponibili] = useState([]);
  const [associazioneForm, setAssociazioneForm] = useState({
    collezione: '',
    creaNuovo: true,
    campi: {}
  });
  const [nuovaCollezione, setNuovaCollezione] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes, collRes] = await Promise.all([
        api.get('/api/documenti-non-associati/lista?limit=100'),
        api.get('/api/documenti-non-associati/statistiche'),
        api.get('/api/documenti-non-associati/collezioni-disponibili')
      ]);
      setDocumenti(docsRes.data.documenti || []);
      setStats(statsRes.data);
      setCollezioniDisponibili(collRes.data || []);
    } catch (err) {
      console.error('Errore caricamento:', err);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/documenti-non-associati/lista?search=${search}&limit=100`);
      setDocumenti(res.data.documenti || []);
    } catch (err) {
      console.error('Errore ricerca:', err);
    }
    setLoading(false);
  };

  const handleAssocia = async () => {
    if (!selectedDoc) return;
    
    try {
      const payload = {
        documento_id: selectedDoc.id,
        collezione_target: nuovaCollezione || associazioneForm.collezione,
        crea_nuovo: associazioneForm.creaNuovo,
        campi_associazione: associazioneForm.campi
      };
      
      await api.post('/api/documenti-non-associati/associa', payload);
      alert('Documento associato con successo!');
      setSelectedDoc(null);
      loadData();
    } catch (err) {
      alert('Errore: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Eliminare questo documento?')) return;
    
    try {
      await api.delete(`/api/documenti-non-associati/${docId}`);
      loadData();
    } catch (err) {
      alert('Errore eliminazione');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'fattura': return <FileText size={20} className="text-blue-500" />;
      case 'f24': return <Calendar size={20} className="text-red-500" />;
      case 'busta_paga': return <User size={20} className="text-green-500" />;
      case 'verbale': return <Car size={20} className="text-orange-500" />;
      case 'cartella': return <Building size={20} className="text-purple-500" />;
      default: return <Folder size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            📂 Documenti Non Associati
          </h1>
          <p className="text-gray-600">
            Gestisci i documenti scaricati dalle email che non sono ancora stati associati
          </p>
          
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.totale}</div>
                <div className="text-sm text-gray-600">Totali</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.associati}</div>
                <div className="text-sm text-gray-600">Associati</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.da_associare}</div>
                <div className="text-sm text-gray-600">Da Associare</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(stats.per_categoria || {}).length}
                </div>
                <div className="text-sm text-gray-600">Categorie</div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome file o oggetto email..."
              className="flex-1 border rounded-lg px-4 py-2"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Search size={20} /> Cerca
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: Document List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold">Documenti ({documenti.length})</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Caricamento...</div>
              ) : documenti.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Nessun documento</div>
              ) : (
                documenti.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedDoc?.id === doc.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getCategoryIcon(doc.category)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {doc.filename}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {doc.email_subject}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {doc.category || 'altro'}
                          </span>
                          {doc.proposta?.anno_suggerito && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Anno: {doc.proposta.anno_suggerito}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Detail & Association */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {selectedDoc ? (
              <div className="p-4">
                <h2 className="font-semibold mb-4">Dettaglio Documento</h2>
                
                {/* Document Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">File:</span></div>
                    <div className="font-medium truncate">{selectedDoc.filename}</div>
                    
                    <div><span className="text-gray-500">Categoria:</span></div>
                    <div className="font-medium">{selectedDoc.category || 'Non classificato'}</div>
                    
                    <div><span className="text-gray-500">Data email:</span></div>
                    <div className="font-medium">{selectedDoc.email_date?.split('T')[0] || 'N/D'}</div>
                    
                    <div><span className="text-gray-500">Dimensione:</span></div>
                    <div className="font-medium">{Math.round((selectedDoc.size_bytes || 0) / 1024)} KB</div>
                  </div>
                </div>

                {/* AI Suggestion */}
                {selectedDoc.proposta && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-blue-800 mb-2">💡 Proposta Intelligente</h3>
                    <div className="text-sm space-y-1">
                      {selectedDoc.proposta.tipo_suggerito && (
                        <div>
                          <span className="text-gray-600">Tipo suggerito:</span>{' '}
                          <span className="font-medium">{selectedDoc.proposta.tipo_suggerito}</span>
                        </div>
                      )}
                      {selectedDoc.proposta.anno_suggerito && (
                        <div>
                          <span className="text-gray-600">Anno:</span>{' '}
                          <span className="font-medium">{selectedDoc.proposta.anno_suggerito}</span>
                        </div>
                      )}
                      {selectedDoc.proposta.mese_suggerito && (
                        <div>
                          <span className="text-gray-600">Mese:</span>{' '}
                          <span className="font-medium">{selectedDoc.proposta.mese_suggerito}</span>
                        </div>
                      )}
                      {selectedDoc.proposta.entita_suggerita && (
                        <div>
                          <span className="text-gray-600">Entità:</span>{' '}
                          <span className="font-medium">{selectedDoc.proposta.entita_suggerita}</span>
                        </div>
                      )}
                      {selectedDoc.proposta.campi_proposti?.targa && (
                        <div>
                          <span className="text-gray-600">Targa:</span>{' '}
                          <span className="font-medium">{selectedDoc.proposta.campi_proposti.targa}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Association Form */}
                <div className="space-y-4">
                  <h3 className="font-medium">Associa a:</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Collezione</label>
                    <select
                      value={associazioneForm.collezione}
                      onChange={(e) => setAssociazioneForm({...associazioneForm, collezione: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">-- Seleziona --</option>
                      {collezioniDisponibili.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Oppure crea nuova collezione:
                    </label>
                    <input
                      type="text"
                      value={nuovaCollezione}
                      onChange={(e) => setNuovaCollezione(e.target.value)}
                      placeholder="nome_collezione"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Dynamic Fields based on suggestion */}
                  {selectedDoc.proposta?.tipo_suggerito === 'verbali' && (
                    <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                      <div className="text-sm font-medium text-orange-800">Campi Verbale</div>
                      <input
                        placeholder="Targa veicolo (es: AB123CD)"
                        value={associazioneForm.campi.targa || selectedDoc.proposta?.campi_proposti?.targa || ''}
                        onChange={(e) => setAssociazioneForm({
                          ...associazioneForm,
                          campi: {...associazioneForm.campi, targa: e.target.value}
                        })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Anno (es: 2024)"
                        type="number"
                        value={associazioneForm.campi.anno || selectedDoc.proposta?.anno_suggerito || ''}
                        onChange={(e) => setAssociazioneForm({
                          ...associazioneForm,
                          campi: {...associazioneForm.campi, anno: parseInt(e.target.value)}
                        })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Importo (es: 150.00)"
                        type="number"
                        step="0.01"
                        value={associazioneForm.campi.importo || ''}
                        onChange={(e) => setAssociazioneForm({
                          ...associazioneForm,
                          campi: {...associazioneForm.campi, importo: parseFloat(e.target.value)}
                        })}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  )}

                  {/* Custom Fields */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Campi personalizzati (JSON):
                    </label>
                    <textarea
                      placeholder='{"anno": 2024, "descrizione": "..."}'
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                      rows={3}
                      onChange={(e) => {
                        try {
                          const json = JSON.parse(e.target.value);
                          setAssociazioneForm({
                            ...associazioneForm,
                            campi: {...associazioneForm.campi, ...json}
                          });
                        } catch {}
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAssocia}
                      disabled={!associazioneForm.collezione && !nuovaCollezione}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle size={20} /> Associa
                    </button>
                    <button
                      onClick={() => handleDelete(selectedDoc.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <XCircle size={20} /> Elimina
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Seleziona un documento dalla lista per vedere i dettagli e associarlo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentiNonAssociati;
