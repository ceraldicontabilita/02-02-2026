import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Search, Plus, Save, Trash2, RefreshCw, Lightbulb, 
  Building2, Tag, FileText, Euro, CheckCircle, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FornitoriLearning() {
  const [activeTab, setActiveTab] = useState('non-classificati');
  const [fornitoriNonClassificati, setFornitoriNonClassificati] = useState([]);
  const [fornitoriConfigurati, setFornitoriConfigurati] = useState([]);
  const [centriCosto, setCentriCosto] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Form per nuovo fornitore
  const [selectedFornitore, setSelectedFornitore] = useState(null);
  const [keywords, setKeywords] = useState('');
  const [centroCostoSuggerito, setCentroCostoSuggerito] = useState('');
  const [note, setNote] = useState('');
  const [keywordsSuggerite, setKeywordsSuggerite] = useState([]);

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    setLoading(true);
    try {
      const [nonClass, config, cdc] = await Promise.all([
        fetch(`${API_URL}/api/fornitori-learning/non-classificati?limit=100`).then(r => r.json()),
        fetch(`${API_URL}/api/fornitori-learning/lista`).then(r => r.json()),
        fetch(`${API_URL}/api/fornitori-learning/centri-costo-disponibili`).then(r => r.json())
      ]);
      
      setFornitoriNonClassificati(nonClass.fornitori || []);
      setFornitoriConfigurati(config.fornitori || []);
      setCentriCosto(cdc || []);
    } catch (error) {
      console.error('Errore caricamento:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
    }
    setLoading(false);
  };

  const selezionaFornitore = async (fornitore) => {
    setSelectedFornitore(fornitore);
    setKeywords('');
    setCentroCostoSuggerito('');
    setNote('');
    
    // Carica suggerimenti keywords
    try {
      const res = await fetch(
        `${API_URL}/api/fornitori-learning/suggerisci-keywords/${encodeURIComponent(fornitore.fornitore_nome)}`
      );
      const data = await res.json();
      setKeywordsSuggerite(data.keywords_suggerite || []);
    } catch (error) {
      console.error('Errore suggerimenti:', error);
    }
  };

  const salvaFornitore = async () => {
    if (!selectedFornitore || !keywords.trim()) {
      setMessage({ type: 'error', text: 'Inserisci almeno una keyword' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/fornitori-learning/salva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fornitore_nome: selectedFornitore.fornitore_nome,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
          centro_costo_suggerito: centroCostoSuggerito || null,
          note: note || null
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Fornitore salvato con successo!' });
        setSelectedFornitore(null);
        setKeywords('');
        caricaDati();
      } else {
        setMessage({ type: 'error', text: data.message || 'Errore nel salvataggio' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    }
    setSaving(false);
  };

  const eliminaFornitore = async (fornitoreId) => {
    if (!window.confirm('Eliminare questa configurazione?')) return;
    
    try {
      await fetch(`${API_URL}/api/fornitori-learning/${fornitoreId}`, {
        method: 'DELETE'
      });
      setMessage({ type: 'success', text: 'Fornitore eliminato' });
      caricaDati();
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore eliminazione' });
    }
  };

  const riclassifica = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fornitori-learning/riclassifica-con-keywords`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Riclassificate ${data.totale_riclassificate} fatture!` 
        });
        caricaDati();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore riclassificazione' });
    }
    setLoading(false);
  };

  const aggiungiKeywordSuggerita = (keyword) => {
    const current = keywords ? keywords.split(',').map(k => k.trim()) : [];
    if (!current.includes(keyword)) {
      setKeywords([...current, keyword].join(', '));
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornitori Learning</h1>
          <p className="text-gray-500">Configura le keywords per classificare automaticamente i fornitori</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={caricaDati} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button onClick={riclassifica} disabled={loading || fornitoriConfigurati.length === 0}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Riclassifica Fatture
          </Button>
        </div>
      </div>

      {/* Messaggio */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">&times;</button>
        </div>
      )}

      {/* Statistiche */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fornitoriNonClassificati.length}</p>
                <p className="text-sm text-gray-500">Da configurare</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fornitoriConfigurati.length}</p>
                <p className="text-sm text-gray-500">Configurati</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{centriCosto.length}</p>
                <p className="text-sm text-gray-500">Centri di Costo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="non-classificati">
            Da Configurare ({fornitoriNonClassificati.length})
          </TabsTrigger>
          <TabsTrigger value="configurati">
            Configurati ({fornitoriConfigurati.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Non Classificati */}
        <TabsContent value="non-classificati" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Lista fornitori */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fornitori da Configurare</CardTitle>
                <CardDescription>
                  Seleziona un fornitore per aggiungere le keywords
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {fornitoriNonClassificati.map((f, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selezionaFornitore(f)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedFornitore?.fornitore_nome === f.fornitore_nome ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{f.fornitore_nome}</p>
                        <p className="text-sm text-gray-500">
                          {f.fatture_count} fatture • €{f.totale_fatture?.toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                        {f.esempio_descrizioni?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            Es: {f.esempio_descrizioni[0]}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{f.fatture_count}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Form configurazione */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedFornitore ? 'Configura Keywords' : 'Seleziona un Fornitore'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFornitore ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Fornitore</label>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <p className="font-medium">{selectedFornitore.fornitore_nome}</p>
                        <p className="text-sm text-gray-500">
                          {selectedFornitore.fatture_count} fatture • €{selectedFornitore.totale_fatture?.toLocaleString('it-IT')}
                        </p>
                      </div>
                    </div>

                    {/* Keywords suggerite */}
                    {keywordsSuggerite.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          <Lightbulb className="w-4 h-4 inline mr-1 text-yellow-500" />
                          Keywords Suggerite (clicca per aggiungere)
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {keywordsSuggerite.map((kw, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary"
                              className="cursor-pointer hover:bg-blue-100"
                              onClick={() => aggiungiKeywordSuggerita(kw)}
                            >
                              + {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Keywords (separate da virgola)
                      </label>
                      <Input 
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="es: caffè, cappuccino, espresso"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Inserisci parole chiave che identificano questo fornitore
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Centro di Costo (opzionale)
                      </label>
                      <select 
                        value={centroCostoSuggerito}
                        onChange={(e) => setCentroCostoSuggerito(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="">-- Classificazione automatica --</option>
                        {centriCosto.map((cdc) => (
                          <option key={cdc.id} value={cdc.id}>
                            {cdc.codice} - {cdc.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Note</label>
                      <Input 
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Note opzionali..."
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={salvaFornitore} disabled={saving} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Salvataggio...' : 'Salva Keywords'}
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedFornitore(null)}>
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Seleziona un fornitore dalla lista per configurare le keywords</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Configurati */}
        <TabsContent value="configurati">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fornitori Configurati</CardTitle>
              <CardDescription>
                Keywords già salvate per la classificazione automatica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fornitoriConfigurati.map((f, idx) => (
                  <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{f.fornitore_nome}</p>
                        <p className="text-sm text-gray-500 mb-2">
                          {f.fatture_count} fatture • €{f.totale_fatture?.toLocaleString('it-IT')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {f.keywords?.map((kw, kidx) => (
                            <Badge key={kidx} variant="secondary">{kw}</Badge>
                          ))}
                        </div>
                        {f.centro_costo_suggerito && (
                          <p className="text-xs text-blue-600 mt-2">
                            → {f.centro_costo_suggerito}
                          </p>
                        )}
                        {f.note && (
                          <p className="text-xs text-gray-400 mt-1">Note: {f.note}</p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => eliminaFornitore(f.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                {fornitoriConfigurati.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun fornitore configurato</p>
                    <p className="text-sm">Vai su "Da Configurare" per aggiungere le keywords</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
