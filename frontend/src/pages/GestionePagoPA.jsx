import React, { useState, useEffect, useCallback } from 'react';
import { formatEuro, formatDateIT } from '../lib/utils';
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
import api from '../api';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

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
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }} data-testid="gestione-pagopa">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: 12,
        color: 'white',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>💳 Gestione PagoPA</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
            Associa ricevute PagoPA ai movimenti bancari
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={() => { fetchStats(); fetchRicevute(); }}
            disabled={loading}
            style={{ 
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.95)',
              color: '#1e3a5f',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1
            }}
            data-testid="refresh-pagopa-btn"
          >
            🔄 Aggiorna
          </button>
          <button 
            onClick={handleAutoAssocia}
            disabled={autoAssociaLoading}
            style={{ 
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: autoAssociaLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: autoAssociaLoading ? 0.6 : 1
            }}
            data-testid="auto-associa-pagopa-btn"
          >
            🔗 Auto-Associa
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          padding: 16, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
          marginBottom: 20 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #3b82f6' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>📄 Ricevute Totali</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#3b82f6' }} data-testid="stats-totali">{stats.totale_ricevute || 0}</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #22c55e' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>✅ Associate</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#22c55e' }} data-testid="stats-associate">{stats.associate || 0}</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: 8, 
              padding: '10px 12px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
              borderLeft: '3px solid #f97316' 
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>⏳ Da Associare</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f97316' }} data-testid="stats-da-associare">{stats.da_associare || 0}</div>
            </div>
            <div style={{ 
              background: '#1e3a5f', 
              borderRadius: 8, 
              padding: '10px 12px', 
              color: 'white'
            }}>
              <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4 }}>💰 Importo Totale</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }} data-testid="stats-importo">
                {formatEuro((stats.importo_totale || 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div style={{ 
        padding: 12, 
        background: '#eff6ff', 
        borderRadius: 8, 
        borderLeft: '4px solid #3b82f6',
        fontSize: 13,
        color: '#1e40af',
        marginBottom: 20
      }}>
        <strong>ℹ️ Come funziona:</strong> Il sistema cerca nei movimenti bancari il codice CBILL (bollettino) 
        presente nella ricevuta PagoPA e li associa automaticamente. Puoi anche associare manualmente 
        cliccando su una ricevuta non associata.
      </div>
      {/* Categorie Pagamenti CBILL */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        marginBottom: 20
      }}>
        <div style={{ 
          padding: '16px 20px', 
          background: '#f8fafc', 
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
            📋 Tipologie Pagamenti CBILL
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
            Pagamenti identificabili tramite codice CBILL per rateizzazioni e tributi
          </p>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* INPS */}
            <div style={{ padding: 16, borderRadius: 8, border: '2px solid #bfdbfe', background: '#eff6ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🏛️</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: '#1e40af' }}>Rateizzi INPS</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#3b82f6' }}>Dilazioni contributive</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: '#1e40af', margin: 0, paddingLeft: 16 }}>
                <li>Rateizzazione contributi</li>
                <li>Avvisi di addebito</li>
                <li>Sanzioni INPS</li>
              </ul>
            </div>

            {/* Agenzia Entrate */}
            <div style={{ padding: 16, borderRadius: 8, border: '2px solid #bbf7d0', background: '#f0fdf4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>📊</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: '#166534' }}>Agenzia delle Entrate</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#22c55e' }}>Imposte e tributi</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: '#166534', margin: 0, paddingLeft: 16 }}>
                <li>Rateizzazione imposte</li>
                <li>Avvisi bonari</li>
                <li>Comunicazioni di irregolarità</li>
              </ul>
            </div>

            {/* AdER */}
            <div style={{ padding: 16, borderRadius: 8, border: '2px solid #fecaca', background: '#fef2f2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>⚖️</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: '#991b1b' }}>Agenzia Riscossione</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>AdER - Cartelle esattoriali</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: '#991b1b', margin: 0, paddingLeft: 16 }}>
                <li>Rottamazione quater</li>
                <li>Rateizzazione cartelle</li>
                <li>Definizione agevolata</li>
              </ul>
            </div>

            {/* TARI */}
            <div style={{ padding: 16, borderRadius: 8, border: '2px solid #fde68a', background: '#fefce8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🗑️</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: '#92400e' }}>TARI</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#f59e0b' }}>Tassa rifiuti</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: '#92400e', margin: 0, paddingLeft: 16 }}>
                <li>Rate TARI annuali</li>
                <li>Conguagli</li>
                <li>Accertamenti</li>
              </ul>
            </div>

            {/* COSAP / Tosap */}
            <div style={{ padding: 16, borderRadius: 8, border: '2px solid #e9d5ff', background: '#faf5ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🏪</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: '#7c3aed' }}>COSAP / TOSAP</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#a855f7' }}>Occupazione suolo pubblico</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: '#7c3aed', margin: 0, paddingLeft: 16 }}>
                <li>Canone occupazione</li>
                <li>Rinnovi annuali</li>
                <li>Plateatici</li>
              </ul>
            </div>

            {/* Altri tributi */}
            <div style={{ padding: 16, borderRadius: 8, border: '2px solid #e5e7eb', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: '#374151' }}>Altri Tributi</h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Pagamenti vari</p>
                </div>
              </div>
              <ul style={{ fontSize: 13, color: '#374151', margin: 0, paddingLeft: 16 }}>
                <li>IMU / TASI</li>
                <li>Bollo auto</li>
                <li>Multe e sanzioni</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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
                        {formatEuro((ricevuta.importo || 0))}
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
