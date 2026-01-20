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
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen" data-testid="gestione-invoicetronic">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">InvoiceTronic - Fatturazione Elettronica</h1>
          <p className="text-gray-600">Ricezione automatica fatture passive via SDI</p>
        </div>
        
        <div className="flex gap-2 items-center">
          {getStatusBadge()}
          <Button 
            variant="outline" 
            onClick={() => { fetchStatus(); fetchFatture(); }}
            disabled={loading}
            data-testid="refresh-invoicetronic-btn"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button 
            onClick={handleSincronizza}
            disabled={sincronizzaLoading || !status?.connected}
            data-testid="sincronizza-invoicetronic-btn"
          >
            <Download className={`h-4 w-4 mr-2 ${sincronizzaLoading ? 'animate-spin' : ''}`} />
            Sincronizza SDI
          </Button>
        </div>
      </div>

      {/* Info Connessione */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stato Connessione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Ambiente</p>
                <p className="font-medium">{status.environment === 'sandbox' ? 'Sandbox (Test)' : 'Produzione'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Codice Destinatario</p>
                <p className="font-mono font-medium">{status.codice_destinatario || 'Non configurato'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ultima Sincronizzazione</p>
                <p className="font-medium">{status.last_sync || 'Mai'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Sandbox */}
      {status?.environment === 'sandbox' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ambiente Sandbox:</strong> L'integrazione è in modalità test. Per ricevere fatture reali, 
            è necessario:
            <ol className="list-decimal ml-4 mt-2 text-sm">
              <li>Accedere al portale dell'Agenzia delle Entrate (Fatture e Corrispettivi)</li>
              <li>Registrare il codice destinatario <strong>{status.codice_destinatario}</strong></li>
              <li>Acquistare crediti su InvoiceTronic per l'ambiente di produzione</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fatture Ricevute</p>
                <p className="text-2xl font-bold" data-testid="stats-totali">{fatture.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Da Elaborare</p>
                <p className="text-2xl font-bold text-orange-600">
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
                  €{fatture.reduce((sum, f) => sum + (f.importo || 0), 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
                          {fattura.data_ricezione || '-'}
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
                        €{(fattura.importo || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
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
