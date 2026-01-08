import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Building2, 
  Users, 
  Calendar, 
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  FileText,
  Plus
} from 'lucide-react';

// Simple Label component
const Label = ({ children, className = '' }) => (
  <label className={`text-sm font-medium leading-none ${className}`}>{children}</label>
);

export default function GestioneCespiti() {
  const { anno } = useAnnoGlobale();
  const [activeTab, setActiveTab] = useState('cespiti');
  const [loading, setLoading] = useState(false);
  
  // Cespiti state
  const [cespiti, setCespiti] = useState([]);
  const [riepilogoCespiti, setRiepilogoCespiti] = useState(null);
  const [categorie, setCategorie] = useState([]);
  const [showNuovoCespite, setShowNuovoCespite] = useState(false);
  const [nuovoCespite, setNuovoCespite] = useState({
    descrizione: '',
    categoria: '',
    data_acquisto: '',
    valore_acquisto: '',
    fornitore: '',
    numero_fattura: ''
  });
  
  // TFR state
  const [riepilogoTFR, setRiepilogoTFR] = useState(null);
  
  // Scadenzario state
  const [scadenzario, setScadenzario] = useState(null);
  const [urgenti, setUrgenti] = useState(null);

  useEffect(() => {
    if (activeTab === 'cespiti') {
      loadCespiti();
      loadCategorie();
    } else if (activeTab === 'tfr') {
      loadTFR();
    } else if (activeTab === 'scadenzario') {
      loadScadenzario();
    }
  }, [activeTab, anno]);

  const loadCespiti = async () => {
    try {
      setLoading(true);
      const [cespitiRes, riepilogoRes] = await Promise.all([
        api.get('/api/cespiti/?attivi=true'),
        api.get('/api/cespiti/riepilogo')
      ]);
      setCespiti(cespitiRes.data);
      setRiepilogoCespiti(riepilogoRes.data);
    } catch (error) {
      console.error('Error loading cespiti:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorie = async () => {
    try {
      const res = await api.get('/api/cespiti/categorie');
      setCategorie(res.data.categorie);
    } catch (error) {
      console.error('Error loading categorie:', error);
    }
  };

  const loadTFR = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/tfr/riepilogo-aziendale?anno=${anno}`);
      setRiepilogoTFR(res.data);
    } catch (error) {
      console.error('Error loading TFR:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScadenzario = async () => {
    try {
      setLoading(true);
      const [scadRes, urgRes] = await Promise.all([
        api.get(`/api/scadenzario-fornitori/?anno=${anno}`),
        api.get('/api/scadenzario-fornitori/urgenti')
      ]);
      setScadenzario(scadRes.data);
      setUrgenti(urgRes.data);
    } catch (error) {
      console.error('Error loading scadenzario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreaCespite = async () => {
    if (!nuovoCespite.descrizione || !nuovoCespite.categoria || !nuovoCespite.valore_acquisto) {
      alert('Compila tutti i campi obbligatori');
      return;
    }
    try {
      await api.post('/api/cespiti/', {
        ...nuovoCespite,
        valore_acquisto: parseFloat(nuovoCespite.valore_acquisto)
      });
      setShowNuovoCespite(false);
      setNuovoCespite({
        descrizione: '',
        categoria: '',
        data_acquisto: '',
        valore_acquisto: '',
        fornitore: '',
        numero_fattura: ''
      });
      loadCespiti();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCalcolaAmmortamenti = async () => {
    if (!window.confirm(`Calcolare e registrare ammortamenti per l'anno ${anno}?`)) return;
    try {
      const res = await api.post(`/api/cespiti/registra/${anno}`);
      alert(res.data.messaggio);
      loadCespiti();
    } catch (error) {
      alert('Errore: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatEuro = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="gestione-cespiti-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-600" />
            Gestione Cespiti e TFR
          </h1>
          <p className="text-slate-500 mt-1">
            Beni ammortizzabili, TFR e scadenzario fornitori
          </p>
        </div>
        <div className="text-lg font-semibold text-slate-600">
          Anno {anno}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="cespiti" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Cespiti
          </TabsTrigger>
          <TabsTrigger value="tfr" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            TFR
          </TabsTrigger>
          <TabsTrigger value="scadenzario" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Scadenzario
          </TabsTrigger>
        </TabsList>

        {/* TAB CESPITI */}
        <TabsContent value="cespiti" className="space-y-6">
          {/* Riepilogo */}
          {riepilogoCespiti && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-blue-600">Cespiti Attivi</p>
                  <p className="text-2xl font-bold text-blue-800">{riepilogoCespiti.totali.num_cespiti}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-green-600">Valore Acquisto</p>
                  <p className="text-2xl font-bold text-green-800">{formatEuro(riepilogoCespiti.totali.valore_acquisto)}</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-amber-600">Fondo Amm.to</p>
                  <p className="text-2xl font-bold text-amber-800">{formatEuro(riepilogoCespiti.totali.fondo_ammortamento)}</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-purple-600">Valore Netto</p>
                  <p className="text-2xl font-bold text-purple-800">{formatEuro(riepilogoCespiti.totali.valore_netto_contabile)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Azioni */}
          <div className="flex gap-4">
            <Button onClick={() => setShowNuovoCespite(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nuovo Cespite
            </Button>
            <Button onClick={handleCalcolaAmmortamenti} variant="outline" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calcola Ammortamenti {anno}
            </Button>
          </div>

          {/* Form Nuovo Cespite */}
          {showNuovoCespite && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle>Nuovo Cespite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Descrizione *</Label>
                    <Input 
                      value={nuovoCespite.descrizione}
                      onChange={(e) => setNuovoCespite({...nuovoCespite, descrizione: e.target.value})}
                      placeholder="Es: Forno professionale"
                    />
                  </div>
                  <div>
                    <Label>Categoria *</Label>
                    <Select 
                      value={nuovoCespite.categoria}
                      onValueChange={(v) => setNuovoCespite({...nuovoCespite, categoria: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categorie.map(c => (
                          <SelectItem key={c.codice} value={c.codice}>
                            {c.descrizione} ({c.coefficiente}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data Acquisto *</Label>
                    <Input 
                      type="date"
                      value={nuovoCespite.data_acquisto}
                      onChange={(e) => setNuovoCespite({...nuovoCespite, data_acquisto: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Valore Acquisto *</Label>
                    <Input 
                      type="number"
                      value={nuovoCespite.valore_acquisto}
                      onChange={(e) => setNuovoCespite({...nuovoCespite, valore_acquisto: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Fornitore</Label>
                    <Input 
                      value={nuovoCespite.fornitore}
                      onChange={(e) => setNuovoCespite({...nuovoCespite, fornitore: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>N. Fattura</Label>
                    <Input 
                      value={nuovoCespite.numero_fattura}
                      onChange={(e) => setNuovoCespite({...nuovoCespite, numero_fattura: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreaCespite}>Salva Cespite</Button>
                  <Button variant="outline" onClick={() => setShowNuovoCespite(false)}>Annulla</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista Cespiti */}
          <Card>
            <CardHeader>
              <CardTitle>Lista Cespiti</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Caricamento...</div>
              ) : cespiti.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Nessun cespite registrato</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Descrizione</th>
                        <th className="px-4 py-2 text-left">Categoria</th>
                        <th className="px-4 py-2 text-center">Coeff.</th>
                        <th className="px-4 py-2 text-right">Valore Acq.</th>
                        <th className="px-4 py-2 text-right">Fondo Amm.</th>
                        <th className="px-4 py-2 text-right">Val. Residuo</th>
                        <th className="px-4 py-2 text-center">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cespiti.map((c, idx) => (
                        <tr key={c.id || idx} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{c.descrizione}</td>
                          <td className="px-4 py-3 text-slate-600">{c.categoria_descrizione || c.categoria}</td>
                          <td className="px-4 py-3 text-center">{c.coefficiente_ammortamento}%</td>
                          <td className="px-4 py-3 text-right">{formatEuro(c.valore_acquisto)}</td>
                          <td className="px-4 py-3 text-right text-amber-600">{formatEuro(c.fondo_ammortamento)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatEuro(c.valore_residuo)}</td>
                          <td className="px-4 py-3 text-center">
                            {c.ammortamento_completato ? (
                              <span className="text-green-600">✓ Completato</span>
                            ) : (
                              <span className="text-blue-600">In corso</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB TFR */}
        <TabsContent value="tfr" className="space-y-6">
          {riepilogoTFR && (
            <>
              {/* Riepilogo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-indigo-50 border-indigo-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-indigo-600">Fondo TFR Totale</p>
                    <p className="text-3xl font-bold text-indigo-800">{formatEuro(riepilogoTFR.totale_fondo_tfr)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-green-600">Accantonato {anno}</p>
                    <p className="text-2xl font-bold text-green-800">{formatEuro(riepilogoTFR.accantonamenti_anno.totale_accantonato)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-red-600">Liquidato {anno}</p>
                    <p className="text-2xl font-bold text-red-800">{formatEuro(riepilogoTFR.liquidazioni_anno.totale_netto)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Dettaglio per dipendente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    TFR per Dipendente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riepilogoTFR.dettaglio_dipendenti.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">Nessun TFR accantonato</div>
                  ) : (
                    <div className="space-y-2">
                      {riepilogoTFR.dettaglio_dipendenti.map((d, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <span className="font-medium">{d.nome}</span>
                          <span className="text-lg font-bold text-indigo-700">{formatEuro(d.tfr_accantonato)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB SCADENZARIO */}
        <TabsContent value="scadenzario" className="space-y-6">
          {/* Urgenti */}
          {urgenti && urgenti.num_urgenti > 0 && (
            <Card className="border-2 border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Fatture Urgenti ({urgenti.num_urgenti})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-red-600">Scadute</p>
                    <p className="text-xl font-bold text-red-800">{urgenti.num_scadute}</p>
                    <p className="text-lg font-semibold">{formatEuro(urgenti.totale_scaduto)}</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-sm text-amber-600">In Scadenza</p>
                    <p className="text-xl font-bold text-amber-800">{urgenti.num_urgenti - urgenti.num_scadute}</p>
                    <p className="text-lg font-semibold">{formatEuro(urgenti.totale_urgente - urgenti.totale_scaduto)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Riepilogo Scadenzario */}
          {scadenzario && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-slate-600">Totale Fatture</p>
                    <p className="text-2xl font-bold">{scadenzario.riepilogo.totale_fatture}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-blue-600">Da Pagare</p>
                    <p className="text-2xl font-bold text-blue-800">{formatEuro(scadenzario.riepilogo.totale_da_pagare)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-red-600">Scaduto</p>
                    <p className="text-2xl font-bold text-red-800">{formatEuro(scadenzario.riepilogo.totale_scaduto)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-amber-600">Prossimi 7gg</p>
                    <p className="text-2xl font-bold text-amber-800">{scadenzario.riepilogo.num_prossimi_7gg}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Fornitori */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Fornitori per Debito</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scadenzario.per_fornitore.slice(0, 10).map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <span className="font-medium">{f.fornitore}</span>
                          <span className="text-sm text-slate-500 ml-2">({f.num_fatture} fatture)</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{formatEuro(f.totale)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
