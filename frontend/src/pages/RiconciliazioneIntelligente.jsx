/**
 * RiconciliazioneIntelligente.jsx
 * 
 * Dashboard per la gestione della Riconciliazione Intelligente.
 * Permette di:
 * - Confermare metodo pagamento (Cassa/Banca) per fatture importate
 * - Visualizzare e applicare spostamenti proposti (Cassa→Banca)
 * - Verificare match incerti
 * - Gestire operazioni sospese e anomalie
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  CheckCircle, AlertTriangle, Clock, XCircle, RefreshCw, 
  ArrowRight, Banknote, Wallet, Lock, Unlock, Info,
  ChevronDown, ChevronUp, FileText, Building2, Calendar,
  Euro, Search, Filter
} from 'lucide-react';
import { toast } from 'sonner';

// Stati e loro configurazione
const STATI_CONFIG = {
  in_attesa_conferma: { label: 'In Attesa Conferma', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confermata_cassa: { label: 'Confermata Cassa', color: 'bg-green-100 text-green-800', icon: Wallet },
  confermata_banca: { label: 'Confermata Banca', color: 'bg-blue-100 text-blue-800', icon: Banknote },
  sospesa_attesa_estratto: { label: 'Sospesa', color: 'bg-orange-100 text-orange-800', icon: Clock },
  da_verificare_spostamento: { label: 'Spostamento Proposto', color: 'bg-purple-100 text-purple-800', icon: ArrowRight },
  da_verificare_match_incerto: { label: 'Match Incerto', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  anomalia_non_in_estratto: { label: 'Anomalia', color: 'bg-red-100 text-red-800', icon: XCircle },
  riconciliata: { label: 'Riconciliata', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  lock_manuale: { label: 'Bloccata', color: 'bg-gray-100 text-gray-800', icon: Lock }
};

// Formatta data
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    if (dateStr.includes('/')) return dateStr;
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT');
  } catch {
    return dateStr;
  }
};

// Formatta importo
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Componente StatoBadge
const StatoBadge = ({ stato }) => {
  const config = STATI_CONFIG[stato] || { label: stato, color: 'bg-gray-100', icon: Info };
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Componente Card Fattura da Confermare
const FatturaCard = ({ fattura, onConferma, loading }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow" data-testid={`fattura-card-${fattura.id}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-semibold">{fattura.numero_documento || 'N/D'}</span>
            <span className="text-gray-500 text-sm">del {formatDate(fattura.data_documento)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>{fattura.fornitore_ragione_sociale || 'Fornitore N/D'}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Euro className="h-4 w-4 text-green-600" />
            <span className="font-medium text-lg">{formatCurrency(fattura.importo_totale)}</span>
          </div>
          {fattura.metodo_pagamento && (
            <div className="mt-2">
              <span className="text-sm text-gray-500">Metodo preimpostato: </span>
              <Badge variant="outline">{fattura.metodo_pagamento}</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => onConferma(fattura.id, 'cassa')}
            disabled={loading}
            data-testid={`btn-conferma-cassa-${fattura.id}`}
          >
            <Wallet className="h-4 w-4 mr-1" />
            CASSA
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onConferma(fattura.id, 'banca')}
            disabled={loading}
            data-testid={`btn-conferma-banca-${fattura.id}`}
          >
            <Banknote className="h-4 w-4 mr-1" />
            BANCA
          </Button>
        </div>
      </div>
    </div>
  );
};

// Componente Card Spostamento Proposto
const SpostamentoCard = ({ fattura, onApplica, onRifiuta, loading }) => {
  const match = fattura.match_estratto_proposto || {};

  return (
    <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50" data-testid={`spostamento-card-${fattura.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-purple-600" />
        <span className="font-semibold text-purple-800">Spostamento Proposto: CASSA → BANCA</span>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fattura */}
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500 mb-1">Fattura</div>
          <div className="font-semibold">{fattura.numero_documento}</div>
          <div className="text-gray-600">{fattura.fornitore_ragione_sociale}</div>
          <div className="text-lg font-medium text-green-600">{formatCurrency(fattura.importo_totale)}</div>
          <div className="text-sm text-gray-500">{formatDate(fattura.data_documento)}</div>
        </div>
        
        {/* Match Estratto */}
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-500 mb-1">Trovato in Estratto Conto</div>
          <div className="text-sm">{match.movimento_descrizione || 'N/D'}</div>
          <div className="text-lg font-medium text-blue-600">{formatCurrency(match.movimento_importo)}</div>
          <div className="text-sm text-gray-500">{formatDate(match.movimento_data)}</div>
          {match.differenza_importo > 0 && (
            <Badge variant="outline" className="mt-1 text-orange-600">
              Differenza: {formatCurrency(match.differenza_importo)}
            </Badge>
          )}
        </div>
      </div>
      
      {match.note && (
        <Alert className="mt-3">
          <Info className="h-4 w-4" />
          <AlertDescription>{match.note}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-2 mt-4">
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => onApplica(fattura.id, match.movimento_id)}
          disabled={loading}
          data-testid={`btn-applica-spostamento-${fattura.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Conferma Spostamento a BANCA
        </Button>
        <Button
          variant="outline"
          onClick={() => onRifiuta(fattura.id)}
          disabled={loading}
          data-testid={`btn-rifiuta-spostamento-${fattura.id}`}
        >
          <Lock className="h-4 w-4 mr-2" />
          Mantieni CASSA
        </Button>
      </div>
    </div>
  );
};

// Componente Card Anomalia
const AnomaliaCard = ({ fattura, onLock }) => {
  return (
    <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50" data-testid={`anomalia-card-${fattura.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="font-semibold text-red-800">Anomalia: Pagamento non trovato in estratto</span>
      </div>
      
      <div className="bg-white p-3 rounded border mb-3">
        <div className="font-semibold">{fattura.numero_documento}</div>
        <div className="text-gray-600">{fattura.fornitore_ragione_sociale}</div>
        <div className="text-lg font-medium">{formatCurrency(fattura.importo_totale)}</div>
        <div className="text-sm text-gray-500">{formatDate(fattura.data_documento)}</div>
        <Badge className="mt-2">{fattura.metodo_pagamento_confermato?.toUpperCase() || 'BANCA'}</Badge>
      </div>
      
      <Alert variant="destructive" className="mb-3">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Il pagamento è stato confermato come BANCA ma non è stato trovato nell'estratto conto.
          Possibili cause: bonifico non partito, era cassa, estratto incompleto.
        </AlertDescription>
      </Alert>
      
      <Button variant="outline" onClick={() => onLock(fattura.id)} data-testid={`btn-lock-anomalia-${fattura.id}`}>
        <Lock className="h-4 w-4 mr-2" />
        Blocca (ignora verifiche automatiche)
      </Button>
    </div>
  );
};

// Componente principale
export default function RiconciliazioneIntelligente() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('da-confermare');
  const [statoEstratto, setStatoEstratto] = useState(null);

  // Carica dashboard
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, estrattoRes] = await Promise.all([
        api.get('/api/riconciliazione-intelligente/dashboard'),
        api.get('/api/riconciliazione-intelligente/stato-estratto')
      ]);
      
      setDashboard(dashRes.data);
      setStatoEstratto(estrattoRes.data);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Conferma pagamento
  const handleConferma = async (fatturaId, metodo) => {
    try {
      setActionLoading(true);
      const res = await api.post('/api/riconciliazione-intelligente/conferma-pagamento', {
        fattura_id: fatturaId, 
        metodo
      });
      
      const data = res.data;
      
      if (data.success) {
        toast.success(`Pagamento confermato come ${metodo.toUpperCase()}`);
        
        if (data.warnings?.length > 0) {
          data.warnings.forEach(w => toast.warning(w));
        }
        
        if (data.stato_riconciliazione === 'da_verificare_spostamento') {
          toast.info('⚠️ Trovato in estratto conto! Verifica nella tab "Spostamenti Proposti"');
          setActiveTab('spostamenti');
        }
        
        await loadDashboard();
      } else {
        toast.error(data.detail || 'Errore conferma pagamento');
      }
    } catch (error) {
      console.error('Errore conferma:', error);
      toast.error('Errore di comunicazione');
    } finally {
      setActionLoading(false);
    }
  };

  // Applica spostamento
  const handleApplicaSpostamento = async (fatturaId, movimentoId) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/riconciliazione-intelligente/applica-spostamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fattura_id: fatturaId, 
          movimento_estratto_id: movimentoId,
          conferma: true
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success('Spostamento applicato: CASSA → BANCA');
        await loadDashboard();
      } else {
        toast.error(data.detail || 'Errore applicazione spostamento');
      }
    } catch (error) {
      console.error('Errore spostamento:', error);
      toast.error('Errore di comunicazione');
    } finally {
      setActionLoading(false);
    }
  };

  // Rifiuta spostamento (mantieni cassa)
  const handleRifiutaSpostamento = async (fatturaId) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/riconciliazione-intelligente/applica-spostamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fattura_id: fatturaId, 
          movimento_estratto_id: null,
          conferma: false
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success('Operazione bloccata come CASSA');
        await loadDashboard();
      } else {
        toast.error(data.detail || 'Errore');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore di comunicazione');
    } finally {
      setActionLoading(false);
    }
  };

  // Lock manuale
  const handleLock = async (fatturaId) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/riconciliazione-intelligente/lock-manuale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fattura_id: fatturaId, 
          motivo: 'Bloccata manualmente dall\'utente'
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success('Operazione bloccata');
        await loadDashboard();
      } else {
        toast.error(data.detail || 'Errore');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore di comunicazione');
    } finally {
      setActionLoading(false);
    }
  };

  // Ri-analizza
  const handleRianalizza = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/riconciliazione-intelligente/rianalizza`, {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(`Ri-analisi completata: ${data.analizzate} fatture analizzate`);
        if (data.spostamenti_proposti?.length > 0) {
          toast.info(`${data.spostamenti_proposti.length} spostamenti proposti!`);
        }
        if (data.riconciliate?.length > 0) {
          toast.success(`${data.riconciliate.length} fatture riconciliate automaticamente`);
        }
        await loadDashboard();
      } else {
        toast.error('Errore ri-analisi');
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error('Errore di comunicazione');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const conteggi = dashboard?.conteggi || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" data-testid="riconciliazione-intelligente-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Riconciliazione Intelligente</h1>
          <p className="text-gray-500 mt-1">
            Gestione conferme pagamento e riconciliazione automatica
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDashboard} data-testid="btn-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button onClick={handleRianalizza} disabled={actionLoading} data-testid="btn-rianalizza">
            <Search className="h-4 w-4 mr-2" />
            Ri-analizza Operazioni
          </Button>
        </div>
      </div>

      {/* Info Estratto Conto */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Banknote className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-900">Stato Estratto Conto</div>
                <div className="text-blue-700">
                  Ultimo movimento: <strong>{formatDate(statoEstratto?.ultima_data_movimento)}</strong>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-blue-700">
              <div>{statoEstratto?.totale_movimenti || 0} movimenti totali</div>
              <div>{statoEstratto?.movimenti_non_riconciliati || 0} da riconciliare</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contatori */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`cursor-pointer ${activeTab === 'da-confermare' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setActiveTab('da-confermare')}>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
            <div className="text-3xl font-bold text-yellow-600">
              {conteggi.in_attesa_conferma || 0}
            </div>
            <div className="text-sm text-gray-600">Da Confermare</div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer ${activeTab === 'spostamenti' ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => setActiveTab('spostamenti')}>
          <CardContent className="p-4 text-center">
            <ArrowRight className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <div className="text-3xl font-bold text-purple-600">
              {conteggi.da_verificare_spostamento || 0}
            </div>
            <div className="text-sm text-gray-600">Spostamenti</div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer ${activeTab === 'match-incerti' ? 'ring-2 ring-amber-500' : ''}`}
              onClick={() => setActiveTab('match-incerti')}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
            <div className="text-3xl font-bold text-amber-600">
              {conteggi.da_verificare_match_incerto || 0}
            </div>
            <div className="text-sm text-gray-600">Match Incerti</div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer ${activeTab === 'sospese' ? 'ring-2 ring-orange-500' : ''}`}
              onClick={() => setActiveTab('sospese')}>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-orange-600 mb-2" />
            <div className="text-3xl font-bold text-orange-600">
              {conteggi.sospesa_attesa_estratto || 0}
            </div>
            <div className="text-sm text-gray-600">Sospese</div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer ${activeTab === 'anomalie' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => setActiveTab('anomalie')}>
          <CardContent className="p-4 text-center">
            <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
            <div className="text-3xl font-bold text-red-600">
              {conteggi.anomalia_non_in_estratto || 0}
            </div>
            <div className="text-sm text-gray-600">Anomalie</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'da-confermare' && 'Fatture in Attesa Conferma Metodo'}
            {activeTab === 'spostamenti' && 'Spostamenti Proposti (Cassa → Banca)'}
            {activeTab === 'match-incerti' && 'Match Incerti da Verificare'}
            {activeTab === 'sospese' && 'Operazioni Sospese (Attesa Estratto)'}
            {activeTab === 'anomalie' && 'Anomalie (Banca non trovata in Estratto)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab Da Confermare */}
          {activeTab === 'da-confermare' && (
            <div className="space-y-4">
              {dashboard?.fatture_in_attesa_conferma?.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nessuna fattura in attesa di conferma metodo pagamento.
                  </AlertDescription>
                </Alert>
              ) : (
                dashboard?.fatture_in_attesa_conferma?.map(fattura => (
                  <FatturaCard
                    key={fattura.id}
                    fattura={fattura}
                    onConferma={handleConferma}
                    loading={actionLoading}
                  />
                ))
              )}
            </div>
          )}

          {/* Tab Spostamenti */}
          {activeTab === 'spostamenti' && (
            <div className="space-y-4">
              {dashboard?.spostamenti_proposti?.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nessuno spostamento proposto.
                  </AlertDescription>
                </Alert>
              ) : (
                dashboard?.spostamenti_proposti?.map(fattura => (
                  <SpostamentoCard
                    key={fattura.id}
                    fattura={fattura}
                    onApplica={handleApplicaSpostamento}
                    onRifiuta={handleRifiutaSpostamento}
                    loading={actionLoading}
                  />
                ))
              )}
            </div>
          )}

          {/* Tab Match Incerti */}
          {activeTab === 'match-incerti' && (
            <div className="space-y-4">
              {dashboard?.match_incerti?.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nessun match incerto da verificare.
                  </AlertDescription>
                </Alert>
              ) : (
                dashboard?.match_incerti?.map(fattura => (
                  <SpostamentoCard
                    key={fattura.id}
                    fattura={fattura}
                    onApplica={handleApplicaSpostamento}
                    onRifiuta={handleRifiutaSpostamento}
                    loading={actionLoading}
                  />
                ))
              )}
            </div>
          )}

          {/* Tab Sospese */}
          {activeTab === 'sospese' && (
            <div className="space-y-4">
              {dashboard?.sospese_attesa_estratto?.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nessuna operazione sospesa in attesa di estratto conto.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="bg-orange-50 border-orange-200">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Queste operazioni sono in attesa di un estratto conto aggiornato per completare la verifica.
                      Carica un nuovo estratto conto e clicca "Ri-analizza Operazioni".
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    {dashboard?.sospese_attesa_estratto?.map(fattura => (
                      <div key={fattura.id} className="border rounded p-3 bg-white flex justify-between items-center">
                        <div>
                          <span className="font-semibold">{fattura.numero_documento}</span>
                          <span className="text-gray-500 mx-2">-</span>
                          <span className="text-gray-600">{fattura.fornitore_ragione_sociale}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatCurrency(fattura.importo_totale)}</span>
                          <span className="text-sm text-gray-500">{formatDate(fattura.data_documento)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab Anomalie */}
          {activeTab === 'anomalie' && (
            <div className="space-y-4">
              {dashboard?.anomalie?.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nessuna anomalia rilevata.
                  </AlertDescription>
                </Alert>
              ) : (
                dashboard?.anomalie?.map(fattura => (
                  <AnomaliaCard
                    key={fattura.id}
                    fattura={fattura}
                    onLock={handleLock}
                  />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiche */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statistiche Riconciliazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">
                {conteggi.riconciliata || 0}
              </div>
              <div className="text-sm text-emerald-700">Riconciliate</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {conteggi.confermata_cassa || 0}
              </div>
              <div className="text-sm text-green-700">Confermate Cassa</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {conteggi.confermata_banca || 0}
              </div>
              <div className="text-sm text-blue-700">Confermate Banca</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {conteggi.lock_manuale || 0}
              </div>
              <div className="text-sm text-gray-700">Bloccate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
