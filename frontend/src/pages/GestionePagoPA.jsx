import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  FileText, RefreshCw, Search, CheckCircle2, AlertCircle, 
  Upload, Link2, Download, Eye, Calendar
} from 'lucide-react';
import { toast } from '../components/ui/sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export default function GestionePagoPA() {
  const [ricevute, setRicevute] = useState([]);
  const [movimentiBanca, setMovimentiBanca] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoAssociaLoading, setAutoAssociaLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [statoFiltro, setStatoFiltro] = useState('tutti');

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/pagopa/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Errore fetch stats:', error);
    }
  }, []);

  const fetchRicevute = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pagopa/ricevute`);
      if (response.ok) {
        const data = await response.json();
        setRicevute(data);
      }
    } catch (error) {
      console.error('Errore fetch ricevute:', error);
      toast.error('Errore nel caricamento ricevute');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMovimentiBanca = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/bank/movements?tipo=pagopa&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setMovimentiBanca(data);
      }
    } catch (error) {
      console.error('Errore fetch movimenti:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRicevute();
    fetchMovimentiBanca();
  }, [fetchStats, fetchRicevute, fetchMovimentiBanca]);

  const handleAutoAssocia = async () => {
    setAutoAssociaLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pagopa/auto-associa`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Associati ${data.associazioni_effettuate || 0} ricevute`);
        fetchStats();
        fetchRicevute();
      } else {
        toast.error('Errore nell\'associazione automatica');
      }
    } catch (error) {
      console.error('Errore auto-associa:', error);
      toast.error('Errore nell\'associazione automatica');
    } finally {
      setAutoAssociaLoading(false);
    }
  };

  const ricevuteFiltrate = ricevute.filter(r => {
    if (filtro) {
      const search = filtro.toLowerCase();
      if (!r.codice_cbill?.toLowerCase().includes(search) &&
          !r.beneficiario?.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (statoFiltro === 'associati' && !r.movimento_banca_id) return false;
    if (statoFiltro === 'non_associati' && r.movimento_banca_id) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" data-testid="gestione-pagopa">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione PagoPA</h1>
          <p className="text-gray-600">Associa ricevute PagoPA ai movimenti bancari</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => { fetchStats(); fetchRicevute(); }}
            disabled={loading}
            data-testid="refresh-pagopa-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button 
            onClick={handleAutoAssocia}
            disabled={autoAssociaLoading}
            data-testid="auto-associa-pagopa-btn"
          >
            <Link2 className={`h-4 w-4 mr-2 ${autoAssociaLoading ? 'animate-spin' : ''}`} />
            Auto-Associa
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ricevute Totali</p>
                  <p className="text-2xl font-bold" data-testid="stats-totali">{stats.totale_ricevute || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Associate</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stats-associate">{stats.associate || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Da Associare</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="stats-da-associare">{stats.da_associare || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Importo Totale</p>
                  <p className="text-2xl font-bold" data-testid="stats-importo">
                    €{(stats.importo_totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Download className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Come funziona:</strong> Il sistema cerca nei movimenti bancari il codice CBILL (bollettino) 
          presente nella ricevuta PagoPA e li associa automaticamente. Puoi anche associare manualmente 
          cliccando su una ricevuta non associata.
        </AlertDescription>
      </Alert>

      {/* Filtri */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per codice CBILL o beneficiario..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10"
                  data-testid="search-pagopa-input"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statoFiltro === 'tutti' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatoFiltro('tutti')}
              >
                Tutti
              </Button>
              <Button
                variant={statoFiltro === 'associati' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatoFiltro('associati')}
              >
                Associati
              </Button>
              <Button
                variant={statoFiltro === 'non_associati' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatoFiltro('non_associati')}
              >
                Da Associare
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Ricevute */}
      <Card>
        <CardHeader>
          <CardTitle>Ricevute PagoPA</CardTitle>
          <CardDescription>
            {ricevuteFiltrate.length} ricevute {filtro && `(filtrate per "${filtro}")`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : ricevuteFiltrate.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nessuna ricevuta PagoPA trovata</p>
              <p className="text-sm mt-2">
                Carica le ricevute PDF dalla sezione Documenti o importa da email
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Codice CBILL</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Beneficiario</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Importo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Stato</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {ricevuteFiltrate.map((ricevuta, idx) => (
                    <tr key={ricevuta._id || idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {ricevuta.data_pagamento || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">
                        {ricevuta.codice_cbill || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {ricevuta.beneficiario || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        €{(ricevuta.importo || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ricevuta.movimento_banca_id ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Associata
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Da Associare
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" data-testid={`view-ricevuta-${idx}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ricevuta.pdf_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={ricevuta.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
