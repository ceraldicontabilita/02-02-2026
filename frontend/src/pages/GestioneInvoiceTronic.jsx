import React, { useState, useEffect, useCallback } from 'react';
import { formatEuro, formatDateIT } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  FileText, RefreshCw, CheckCircle2, AlertCircle, 
  Download, ExternalLink, Calendar, Building2, Euro
} from 'lucide-react';
import { toast } from '../components/ui/sonner';
import api from '../api';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function GestioneInvoiceTronic() {
  const [status, setStatus] = useState(null);
  const [fatture, setFatture] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sincronizzaLoading, setSincronizzaLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/invoicetronic/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Errore fetch status:', error);
    }
  }, []);

  const fetchFatture = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/invoicetronic/fatture-ricevute`);
      if (response.ok) {
        const data = await response.json();
        setFatture(data.fatture || []);
      }
    } catch (error) {
      console.error('Errore fetch fatture:', error);
      toast.error('Errore nel caricamento fatture');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchFatture();
  }, [fetchStatus, fetchFatture]);

  const handleSincronizza = async () => {
    setSincronizzaLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/invoicetronic/sincronizza`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Sincronizzazione completata: ${data.fatture_importate || 0} nuove fatture`);
        fetchFatture();
      } else {
        toast.error('Errore nella sincronizzazione');
      }
    } catch (error) {
      console.error('Errore sincronizzazione:', error);
      toast.error('Errore nella sincronizzazione');
    } finally {
      setSincronizzaLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    if (status.connected) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connesso
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Non connesso
        </Badge>
      );
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }} data-testid="gestione-invoicetronic">
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>📨 InvoiceTronic - Fatturazione Elettronica</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
            Ricezione automatica fatture passive via SDI
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {status?.connected && (
            <span style={{ 
              padding: '6px 12px', 
              background: '#22c55e', 
              color: 'white', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 600 
            }}>✅ Connesso</span>
          )}
          {status && !status.connected && (
            <span style={{ 
              padding: '6px 12px', 
              background: '#ef4444', 
              color: 'white', 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 600 
            }}>❌ Disconnesso</span>
          )}
          <button 
            onClick={() => { fetchStatus(); fetchFatture(); }}
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
            data-testid="refresh-invoicetronic-btn"
          >
            🔄 Aggiorna
          </button>
          <button 
            onClick={handleSincronizza}
            disabled={sincronizzaLoading || !status?.connected}
            style={{ 
              padding: '10px 20px',
              background: (sincronizzaLoading || !status?.connected) ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: (sincronizzaLoading || !status?.connected) ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
            data-testid="sincronizza-invoicetronic-btn"
          >
            📥 Sincronizza SDI
          </button>
        </div>
      </div>

      {/* Info Connessione */}
      {status && (
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
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1f2937' }}>📡 Stato Connessione</h2>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Ambiente</p>
                <p style={{ fontWeight: 500, margin: 0 }}>{status.environment === 'sandbox' ? '🧪 Sandbox (Test)' : '🚀 Produzione'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Codice Destinatario</p>
                <p style={{ fontWeight: 500, margin: 0, fontFamily: 'monospace' }}>{status.codice_destinatario || 'Non configurato'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Ultima Sincronizzazione</p>
                <p style={{ fontWeight: 500, margin: 0 }}>{status.last_sync || 'Mai'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Sandbox */}
      {status?.environment === 'sandbox' && (
        <div style={{ 
          padding: 12, 
          background: '#fef3c7', 
          borderRadius: 8, 
          borderLeft: '4px solid #f59e0b',
          fontSize: 13,
          color: '#92400e',
          marginBottom: 20
        }}>
          <strong>⚠️ Ambiente Sandbox:</strong> L'integrazione è in modalità test. Per ricevere fatture reali, 
          è necessario:
          <ol style={{ margin: '8px 0 0 16px', paddingLeft: 0 }}>
            <li>Accedere al portale dell'Agenzia delle Entrate (Fatture e Corrispettivi)</li>
            <li>Registrare il codice destinatario <strong>{status.codice_destinatario}</strong></li>
            <li>Acquistare crediti su InvoiceTronic per l'ambiente di produzione</li>
          </ol>
        </div>
      )}

      {/* Stats Cards */}
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
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>📄 Fatture Ricevute</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#3b82f6' }} data-testid="stats-totali">{fatture.length}</div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            borderLeft: '3px solid #22c55e' 
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>✅ Importate</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#22c55e' }}>{fatture.filter(f => f.importata).length}</div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            borderLeft: '3px solid #f97316' 
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>⏳ Da Importare</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f97316' }}>{fatture.filter(f => !f.importata).length}</div>
          </div>
          <div style={{ 
            background: '#1e3a5f', 
            borderRadius: 8, 
            padding: '10px 12px', 
            color: 'white'
          }}>
            <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4 }}>💰 Totale Imponibile</div>
            <div style={{ fontSize: 18, fontWeight: 'bold' }}>
              {formatEuro(fatture.reduce((sum, f) => sum + (f.importo_totale || 0), 0))}
            </div>
          </div>
        </div>
      </div>
                  {fatture.filter(f => f.stato === 'da_elaborare').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Elaborate</p>
                <p className="text-2xl font-bold text-green-600">
                  {fatture.filter(f => f.stato === 'elaborata').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Importo Totale</p>
                <p className="text-2xl font-bold">
                  {formatEuro(fatture.reduce((sum, f) => sum + (f.importo || 0), 0))}
                </p>
              </div>
              <Euro className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Fatture */}
      <Card>
        <CardHeader>
          <CardTitle>Fatture Ricevute da SDI</CardTitle>
          <CardDescription>
            {fatture.length} fatture nel sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : fatture.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nessuna fattura ricevuta</p>
              <p className="text-sm mt-2">
                Le fatture arriveranno automaticamente quando i fornitori le invieranno al tuo codice destinatario
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Data Ricezione</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Numero</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Fornitore</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Importo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Stato</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {fatture.map((fattura, idx) => (
                    <tr key={fattura.id || idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDateIT(fattura.data_ricezione) || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">
                        {fattura.numero || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {fattura.fornitore || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatEuro((fattura.importo || 0))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {fattura.stato === 'elaborata' ? (
                          <Badge className="bg-green-100 text-green-800">Elaborata</Badge>
                        ) : fattura.stato === 'errore' ? (
                          <Badge variant="destructive">Errore</Badge>
                        ) : (
                          <Badge variant="outline">Da Elaborare</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button variant="ghost" size="sm" data-testid={`view-fattura-${idx}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
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
