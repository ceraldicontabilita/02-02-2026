import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  FileText, Upload, CheckCircle, AlertTriangle, Clock, 
  RefreshCw, Trash2, Eye, Download, AlertCircle, Search,
  ChevronDown, ChevronUp, Calendar, Euro, FileCheck
} from 'lucide-react';

const API_URL = '';

export default function RiconciliazioneF24() {
  const [dashboard, setDashboard] = useState(null);
  const [f24List, setF24List] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedF24, setSelectedF24] = useState(null);
  const [filterStatus, setFilterStatus] = useState('da_pagare');
  const [searchCodice, setSearchCodice] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error('Errore caricamento dashboard:', err);
    }
  }, []);

  const loadF24List = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/commercialista?status=${filterStatus}`);
      if (response.ok) {
        const data = await response.json();
        setF24List(data.f24_list || []);
      }
    } catch (err) {
      console.error('Errore caricamento F24:', err);
    }
  }, [filterStatus]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/alerts?status=pending`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Errore caricamento alerts:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadF24List(), loadAlerts()]);
      setLoading(false);
    };
    loadAll();
  }, [loadDashboard, loadF24List, loadAlerts]);

  const handleUploadF24 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/f24-riconciliazione/commercialista/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ F24 caricato con successo!\n\nImporto: €${data.totali?.saldo_netto?.toFixed(2) || 0}\n${data.has_ravvedimento ? '⚠️ Contiene ravvedimento' : ''}`);
        await Promise.all([loadDashboard(), loadF24List(), loadAlerts()]);
      } else {
        const error = await response.json();
        alert(`❌ Errore: ${error.detail || 'Errore upload'}`);
      }
    } catch (err) {
      alert(`❌ Errore: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfermaElimina = async (alertId) => {
    if (!window.confirm('Confermi l\'eliminazione di questo F24?')) return;

    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/alerts/${alertId}/conferma-elimina`, {
        method: 'POST'
      });
      if (response.ok) {
        await Promise.all([loadDashboard(), loadF24List(), loadAlerts()]);
      }
    } catch (err) {
      alert(`Errore: ${err.message}`);
    }
  };

  const handleIgnoraAlert = async (alertId) => {
    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/alerts/${alertId}/ignora`, {
        method: 'POST'
      });
      if (response.ok) {
        await loadAlerts();
      }
    } catch (err) {
      alert(`Errore: ${err.message}`);
    }
  };

  const handleSearchCodice = async () => {
    if (!searchCodice.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/verifica-codice/${searchCodice}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResult(data);
      }
    } catch (err) {
      console.error('Errore ricerca:', err);
    }
  };

  const loadF24Detail = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/f24-riconciliazione/commercialista/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedF24(data);
      }
    } catch (err) {
      console.error('Errore caricamento dettaglio:', err);
    }
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatEuro = (value) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'da_pagare': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'pagato': return 'bg-green-100 text-green-700 border-green-300';
      case 'eliminato': return 'bg-gray-100 text-gray-500 border-gray-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'da_pagare': return 'Da Pagare';
      case 'pagato': return 'Pagato';
      case 'eliminato': return 'Eliminato';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="riconciliazione-f24-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Riconciliazione F24</h1>
          <p className="text-gray-600 mt-1">
            Gestione F24 commercialista → Quietanza → Banca
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => Promise.all([loadDashboard(), loadF24List(), loadAlerts()])} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={handleUploadF24}
              disabled={uploading}
            />
            <Button disabled={uploading} asChild>
              <span>
                {uploading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Carica F24
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">F24 Da Pagare</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboard.f24_commercialista?.da_pagare || 0}</p>
                  <p className="text-sm text-gray-400">{formatEuro(dashboard.totale_da_pagare)}</p>
                </div>
                <Clock className="h-10 w-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">F24 Pagati</p>
                  <p className="text-2xl font-bold text-green-600">{dashboard.f24_commercialista?.pagato || 0}</p>
                  <p className="text-sm text-gray-400">Riconciliati</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Quietanze Caricate</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboard.quietanze_caricate || 0}</p>
                  <p className="text-sm text-gray-400">{formatEuro(dashboard.totale_pagato_quietanze)}</p>
                </div>
                <FileCheck className="h-10 w-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${dashboard.alerts_pendenti > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-gray-300'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Alert Pendenti</p>
                  <p className={`text-2xl font-bold ${dashboard.alerts_pendenti > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {dashboard.alerts_pendenti || 0}
                  </p>
                  <p className="text-sm text-gray-400">Da gestire</p>
                </div>
                <AlertTriangle className={`h-10 w-10 ${dashboard.alerts_pendenti > 0 ? 'text-red-200' : 'text-gray-200'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* F24 In Scadenza */}
      {dashboard?.f24_in_scadenza?.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              F24 in Scadenza (prossimi 7 giorni)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dashboard.f24_in_scadenza.map((f24, idx) => (
                <div key={idx} className="bg-white p-3 rounded border border-yellow-200 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{formatDate(f24.scadenza)}</p>
                    <p className="text-sm text-gray-500">ID: {f24.id?.slice(0, 8)}...</p>
                  </div>
                  <p className="font-bold text-yellow-700">{formatEuro(f24.importo)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alert da Gestire ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{alert.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Tipo: {alert.tipo} | {formatDate(alert.created_at)}
                        {alert.importo && ` | Importo: ${formatEuro(alert.importo)}`}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {alert.tipo.includes('eliminare') && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleConfermaElimina(alert.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Elimina F24
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleIgnoraAlert(alert.id)}
                      >
                        Ignora
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ricerca Codice Tributo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Verifica Codice Tributo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchCodice}
              onChange={(e) => setSearchCodice(e.target.value)}
              placeholder="Inserisci codice tributo (es. 1001, 6001)"
              className="flex-1 px-4 py-2 border rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && handleSearchCodice()}
            />
            <Button onClick={handleSearchCodice}>
              <Search className="h-4 w-4 mr-2" />
              Verifica
            </Button>
          </div>

          {searchResult && (
            <div className={`mt-4 p-4 rounded-lg ${searchResult.pagato ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border`}>
              <div className="flex items-center gap-2 mb-2">
                {searchResult.pagato ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-orange-600" />
                )}
                <span className="font-semibold">
                  Codice {searchResult.codice_tributo}: {searchResult.pagato ? 'PAGATO' : 'NON TROVATO / IN ATTESA'}
                </span>
              </div>
              
              {searchResult.pagamenti?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">Pagamenti trovati:</p>
                  {searchResult.pagamenti.map((p, idx) => (
                    <div key={idx} className="text-sm bg-white p-2 rounded mb-1">
                      {formatDate(p.data_pagamento)} - {p.descrizione} - {formatEuro(p.importo_debito)}
                    </div>
                  ))}
                </div>
              )}
              
              {searchResult.in_attesa?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">F24 in attesa di pagamento:</p>
                  {searchResult.in_attesa.map((f, idx) => (
                    <div key={idx} className="text-sm bg-white p-2 rounded mb-1">
                      Scadenza: {formatDate(f.scadenza)} - {formatEuro(f.importo)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista F24 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lista F24 Commercialista
            </CardTitle>
            <div className="flex gap-2">
              {['da_pagare', 'pagato', 'eliminato'].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                >
                  {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {f24List.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nessun F24 trovato con stato "{getStatusLabel(filterStatus)}"</p>
          ) : (
            <div className="space-y-3">
              {f24List.map((f24) => (
                <div key={f24.id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                    onClick={() => toggleSection(f24.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(f24.status)}`}>
                        {getStatusLabel(f24.status)}
                      </span>
                      <div>
                        <p className="font-medium">{f24.file_name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(f24.dati_generali?.data_versamento)} | 
                          CF: {f24.dati_generali?.codice_fiscale || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatEuro(f24.totali?.saldo_netto)}</p>
                        {f24.has_ravvedimento && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            Ravvedimento
                          </span>
                        )}
                      </div>
                      {expandedSections[f24.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                  
                  {expandedSections[f24.id] && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sezione Erario */}
                        {f24.sezione_erario?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Sezione ERARIO</h4>
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="text-left p-1">Codice</th>
                                  <th className="text-left p-1">Periodo</th>
                                  <th className="text-right p-1">Importo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {f24.sezione_erario.map((item, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="p-1">{item.codice_tributo}</td>
                                    <td className="p-1">{item.periodo_riferimento}</td>
                                    <td className="p-1 text-right">{formatEuro(item.importo_debito)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Sezione INPS */}
                        {f24.sezione_inps?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Sezione INPS</h4>
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="text-left p-1">Causale</th>
                                  <th className="text-left p-1">Periodo</th>
                                  <th className="text-right p-1">Importo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {f24.sezione_inps.map((item, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="p-1">{item.causale}</td>
                                    <td className="p-1">{item.periodo_riferimento}</td>
                                    <td className="p-1 text-right">{formatEuro(item.importo_debito)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Sezione Regioni */}
                        {f24.sezione_regioni?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Sezione REGIONI</h4>
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="text-left p-1">Codice</th>
                                  <th className="text-left p-1">Periodo</th>
                                  <th className="text-right p-1">Importo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {f24.sezione_regioni.map((item, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="p-1">{item.codice_tributo}</td>
                                    <td className="p-1">{item.periodo_riferimento}</td>
                                    <td className="p-1 text-right">{formatEuro(item.importo_debito)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {/* Tributi Locali */}
                        {f24.sezione_tributi_locali?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">Tributi Locali</h4>
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="text-left p-1">Codice</th>
                                  <th className="text-left p-1">Anno</th>
                                  <th className="text-right p-1">Importo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {f24.sezione_tributi_locali.map((item, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="p-1">{item.codice_tributo}</td>
                                    <td className="p-1">{item.periodo_riferimento}</td>
                                    <td className="p-1 text-right">{formatEuro(item.importo_debito)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      
                      {/* Totali */}
                      <div className="mt-4 p-3 bg-white rounded border">
                        <div className="flex justify-between text-sm">
                          <span>Totale Debito:</span>
                          <span className="font-medium">{formatEuro(f24.totali?.totale_debito)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Totale Credito:</span>
                          <span className="font-medium text-green-600">-{formatEuro(f24.totali?.totale_credito)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t mt-2 pt-2">
                          <span>Saldo Netto:</span>
                          <span>{formatEuro(f24.totali?.saldo_netto)}</span>
                        </div>
                      </div>
                      
                      {/* Info Riconciliazione */}
                      {f24.riconciliato && (
                        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                          <p className="text-sm text-green-700">
                            ✅ Riconciliato con quietanza il {formatDate(f24.data_riconciliazione)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note informative */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-gray-700 mb-2">ℹ️ Come funziona la riconciliazione</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal pl-5">
            <li><strong>Upload F24 Commercialista</strong>: Carica il PDF ricevuto dalla commercialista (stato: Da Pagare)</li>
            <li><strong>Carica Quietanza</strong>: Dopo il pagamento, carica la quietanza F24 dall'Agenzia delle Entrate</li>
            <li><strong>Riconciliazione automatica</strong>: Il sistema confronta i codici tributo e aggiorna lo stato a "Pagato"</li>
            <li><strong>Gestione Ravvedimenti</strong>: Se un F24 viene sostituito con ravvedimento, riceverai un alert per eliminare quello vecchio</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
