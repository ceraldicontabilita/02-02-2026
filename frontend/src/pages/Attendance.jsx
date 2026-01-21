/**
 * Attendance.jsx
 * 
 * Sistema di gestione presenze dipendenti.
 * Features:
 * - Dashboard presenze giornaliere
 * - Timbrature entrata/uscita
 * - Richieste ferie e permessi
 * - Calcolo ore lavorate
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Clock, Users, UserCheck, UserX, Calendar, Plus,
  RefreshCw, Check, X, Sun, Moon, Coffee, LogIn, LogOut,
  FileText, Timer, AlertTriangle, History, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// Formatta data
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT');
  } catch {
    return dateStr;
  }
};

// Formatta ora
const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  return timeStr.substring(0, 5);
};

// Tipi assenza
const TIPI_ASSENZA = [
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso', label: 'Permesso' },
  { value: 'malattia', label: 'Malattia' },
  { value: 'rol', label: 'ROL' },
  { value: 'maternita', label: 'Maternità' },
  { value: 'paternita', label: 'Paternità' },
  { value: 'lutto', label: 'Lutto' },
  { value: 'matrimonio', label: 'Matrimonio' },
  { value: 'altro', label: 'Altro' }
];

// Badge stato richiesta
const StatoBadge = ({ stato }) => {
  const config = {
    pending: { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approvata', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rifiutata', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Annullata', color: 'bg-gray-100 text-gray-800' }
  };
  const c = config[stato] || config.pending;
  return <Badge className={c.color}>{c.label}</Badge>;
};

export default function Attendance() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [richiestePending, setRichiestePending] = useState([]);
  const [dataSelezionata, setDataSelezionata] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Form timbratura
  const [showTimbratura, setShowTimbratura] = useState(false);
  const [timbraturaForm, setTimbraturaForm] = useState({
    employee_id: '',
    tipo: 'entrata'
  });
  
  // Form richiesta assenza
  const [showRichiesta, setShowRichiesta] = useState(false);
  const [richiestaForm, setRichiestaForm] = useState({
    employee_id: '',
    tipo: 'ferie',
    data_inizio: '',
    data_fine: '',
    motivo: ''
  });
  
  // Storico Ore
  const [storicoEmployee, setStoricoEmployee] = useState('');
  const [storicoMese, setStoricoMese] = useState(new Date().getMonth() + 1);
  const [storicoAnno, setStoricoAnno] = useState(new Date().getFullYear());
  const [storicoData, setStoricoData] = useState(null);
  const [loadingStorico, setLoadingStorico] = useState(false);

  // Carica dati
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [dashRes, pendingRes, empRes] = await Promise.all([
        api.get(`/api/attendance/dashboard-presenze?data=${dataSelezionata}`),
        api.get('/api/attendance/richieste-pending'),
        api.get('/api/employees?limit=200')
      ]);
      
      setDashboard(dashRes.data);
      setRichiestePending(pendingRes.data.richieste || []);
      
      // Normalizza employees
      const emps = empRes.data.employees || empRes.data || [];
      setEmployees(emps);
      
    } catch (error) {
      console.error('Errore caricamento:', error);
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  }, [dataSelezionata]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Registra timbratura
  const handleTimbratura = async () => {
    if (!timbraturaForm.employee_id) {
      toast.error('Seleziona un dipendente');
      return;
    }
    
    try {
      const res = await api.post('/api/attendance/timbratura', timbraturaForm);
      
      if (res.data.success) {
        toast.success(`Timbratura ${timbraturaForm.tipo} registrata`);
        if (res.data.ore_lavorate) {
          toast.info(`Ore lavorate: ${res.data.ore_lavorate.toFixed(2)}`);
        }
        setShowTimbratura(false);
        setTimbraturaForm({ employee_id: '', tipo: 'entrata' });
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore registrazione');
    }
  };

  // Crea richiesta assenza
  const handleRichiesta = async () => {
    if (!richiestaForm.employee_id || !richiestaForm.data_inizio || !richiestaForm.data_fine) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    
    try {
      const res = await api.post('/api/attendance/richiesta-assenza', richiestaForm);
      
      if (res.data.success) {
        toast.success(`Richiesta ${richiestaForm.tipo} creata (${res.data.giorni_totali} giorni)`);
        setShowRichiesta(false);
        setRichiestaForm({
          employee_id: '',
          tipo: 'ferie',
          data_inizio: '',
          data_fine: '',
          motivo: ''
        });
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore creazione richiesta');
    }
  };

  // Approva richiesta
  const handleApprova = async (richiestaId) => {
    try {
      const res = await api.put(`/api/attendance/richiesta-assenza/${richiestaId}/approva`);
      if (res.data.success) {
        toast.success('Richiesta approvata');
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore approvazione');
    }
  };

  // Rifiuta richiesta
  const handleRifiuta = async (richiestaId) => {
    const motivo = prompt('Motivo del rifiuto:');
    if (!motivo) return;
    
    try {
      const res = await api.put(`/api/attendance/richiesta-assenza/${richiestaId}/rifiuta`, { motivo });
      if (res.data.success) {
        toast.success('Richiesta rifiutata');
        loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  // Carica storico ore
  const loadStoricoOre = async () => {
    if (!storicoEmployee) {
      toast.error('Seleziona un dipendente');
      return;
    }
    
    try {
      setLoadingStorico(true);
      const res = await api.get(`/api/attendance/ore-lavorate/${storicoEmployee}?mese=${storicoMese}&anno=${storicoAnno}`);
      setStoricoData(res.data);
    } catch (error) {
      console.error('Errore caricamento storico:', error);
      toast.error('Errore caricamento storico ore');
    } finally {
      setLoadingStorico(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const riepilogo = dashboard?.riepilogo || {};

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }} data-testid="attendance-page">
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>👥 Gestione Presenze</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
            Timbrature, ferie e permessi
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="date"
            value={dataSelezionata}
            onChange={(e) => setDataSelezionata(e.target.value)}
            style={{
              padding: '10px 15px',
              fontSize: 14,
              fontWeight: 'bold',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,255,255,0.95)',
              color: '#1e3a5f',
              cursor: 'pointer'
            }}
            data-testid="date-selector"
          />
          <span style={{ 
            padding: '10px 20px',
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.9)',
            color: '#1e3a5f',
          }}>
            {formatDate(dataSelezionata)}
          </span>
        </div>
      </div>

      {/* Azioni */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          onClick={loadData}
          style={{ 
            padding: '10px 20px',
            background: '#e5e7eb',
            color: '#374151',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: '600'
          }}
          data-testid="btn-refresh"
        >
          🔄 Aggiorna
        </button>
        <button 
          onClick={() => setShowTimbratura(true)}
          style={{ 
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: '600'
          }}
          data-testid="btn-nuova-timbratura"
        >
          ⏱️ Nuova Timbratura
        </button>
        <button 
          onClick={() => setShowRichiesta(true)}
          style={{ 
            padding: '10px 20px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: '600'
          }}
          data-testid="btn-nuova-richiesta"
        >
          📅 Richiesta Assenza
        </button>
        {richiestePending.length > 0 && (
          <span style={{ 
            padding: '8px 16px', 
            background: '#fef3c7', 
            color: '#92400e', 
            borderRadius: 8,
            fontSize: 13,
            fontWeight: '600'
          }}>
            ⚠️ {richiestePending.length} richieste da approvare
          </span>
        )}
      </div>

      {/* Statistiche */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        padding: 16, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
        marginBottom: 20 
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            borderLeft: '3px solid #6b7280' 
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>👥 Dipendenti</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#374151' }}>{riepilogo.totale_dipendenti || 0}</div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            borderLeft: '3px solid #22c55e' 
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>✅ Presenti</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#22c55e' }}>{riepilogo.presenti || 0}</div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            borderLeft: '3px solid #f97316' 
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>📅 Assenti</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#f97316' }}>{riepilogo.assenti || 0}</div>
          </div>
          <div style={{ 
            background: 'white', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            borderLeft: '3px solid #ef4444' 
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>⚠️ Non Timbrato</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ef4444' }}>{riepilogo.non_timbrato || 0}</div>
          </div>
          <div style={{ 
            background: '#1e3a5f', 
            borderRadius: 8, 
            padding: '10px 12px', 
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', 
            color: 'white' 
          }}>
            <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 4 }}>📊 In Ufficio</div>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>
              {dashboard?.presenti?.filter(p => p.in_ufficio)?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e5e7eb', paddingBottom: 8, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'dashboard' ? '#1e3a5f' : 'transparent',
            color: activeTab === 'dashboard' ? 'white' : '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Users className="h-4 w-4" />
          Presenze Oggi
        </button>
        <button
          onClick={() => setActiveTab('richieste')}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: activeTab === 'richieste' ? 'bold' : 'normal',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'richieste' ? '#1e3a5f' : 'transparent',
            color: activeTab === 'richieste' ? 'white' : '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FileText className="h-4 w-4" />
          Richieste Pending ({richiestePending.length})
        </button>
        <button
          onClick={() => setActiveTab('storico')}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: activeTab === 'storico' ? 'bold' : 'normal',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            background: activeTab === 'storico' ? '#1e3a5f' : 'transparent',
            color: activeTab === 'storico' ? 'white' : '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          data-testid="tab-storico-ore"
        >
          <History className="h-4 w-4" />
          Storico Ore
        </button>
      </div>

      {/* Tab Presenze */}
      {activeTab === 'dashboard' && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Presenti */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Presenti ({dashboard?.presenti?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {dashboard?.presenti?.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessuno presente</p>
              ) : (
                dashboard?.presenti?.map((p, idx) => (
                  <div key={idx} className="p-2 bg-green-50 rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-sm text-gray-600">
                        <LogIn className="h-3 w-3 inline mr-1" />
                        {formatTime(p.entrata)}
                        {p.uscita && (
                          <>
                            <LogOut className="h-3 w-3 inline mx-1 ml-2" />
                            {formatTime(p.uscita)}
                          </>
                        )}
                      </div>
                    </div>
                    {p.in_ufficio && (
                      <Badge className="bg-green-500 text-white">In sede</Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Assenti */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                Assenti ({dashboard?.assenti?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {dashboard?.assenti?.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessuna assenza</p>
              ) : (
                dashboard?.assenti?.map((a, idx) => (
                  <div key={idx} className="p-2 bg-orange-50 rounded">
                    <div className="font-medium">{a.nome}</div>
                    <div className="text-sm">
                      <Badge variant="outline">{a.tipo_assenza}</Badge>
                      {a.motivo && <span className="ml-2 text-gray-500">{a.motivo}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Non timbrato */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Non Timbrato ({dashboard?.non_timbrato?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {dashboard?.non_timbrato?.length === 0 ? (
                <p className="text-gray-500 text-sm">Tutti hanno timbrato</p>
              ) : (
                dashboard?.non_timbrato?.map((n, idx) => (
                  <div key={idx} className="p-2 bg-red-50 rounded flex justify-between items-center">
                    <span className="font-medium">{n.nome}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTimbraturaForm({ employee_id: n.employee_id, tipo: 'entrata' });
                        setShowTimbratura(true);
                      }}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Timbra
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Richieste */}
      {activeTab === 'richieste' && (
        <Card>
          <CardHeader>
            <CardTitle>Richieste in Attesa di Approvazione</CardTitle>
          </CardHeader>
          <CardContent>
            {richiestePending.length === 0 ? (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>Nessuna richiesta in attesa</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {richiestePending.map((r) => (
                  <div key={r.id} className="border rounded-lg p-4 bg-white flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{r.employee_nome}</div>
                      <div className="text-sm text-gray-600">
                        <Badge variant="outline" className="mr-2">{r.tipo}</Badge>
                        {formatDate(r.data_inizio)} - {formatDate(r.data_fine)}
                        <span className="ml-2">({r.giorni_totali} giorni)</span>
                      </div>
                      {r.motivo && <div className="text-sm text-gray-500 mt-1">{r.motivo}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprova(r.id)}
                        data-testid={`btn-approva-${r.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approva
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRifiuta(r.id)}
                        data-testid={`btn-rifiuta-${r.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rifiuta
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Storico Ore */}
      {activeTab === 'storico' && (
        <div className="space-y-4">
          {/* Filtri */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label>Dipendente *</Label>
                  <Select
                    value={storicoEmployee}
                    onValueChange={setStoricoEmployee}
                  >
                    <SelectTrigger data-testid="select-storico-employee">
                      <SelectValue placeholder="Seleziona dipendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome} {e.cognome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-32">
                  <Label>Mese</Label>
                  <Select
                    value={storicoMese.toString()}
                    onValueChange={(v) => setStoricoMese(parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-storico-mese">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: '1', label: 'Gennaio' },
                        { value: '2', label: 'Febbraio' },
                        { value: '3', label: 'Marzo' },
                        { value: '4', label: 'Aprile' },
                        { value: '5', label: 'Maggio' },
                        { value: '6', label: 'Giugno' },
                        { value: '7', label: 'Luglio' },
                        { value: '8', label: 'Agosto' },
                        { value: '9', label: 'Settembre' },
                        { value: '10', label: 'Ottobre' },
                        { value: '11', label: 'Novembre' },
                        { value: '12', label: 'Dicembre' }
                      ].map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-28">
                  <Label>Anno</Label>
                  <Select
                    value={storicoAnno.toString()}
                    onValueChange={(v) => setStoricoAnno(parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-storico-anno">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((a) => (
                        <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={loadStoricoOre} 
                  disabled={loadingStorico}
                  data-testid="btn-carica-storico"
                >
                  {loadingStorico ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <History className="h-4 w-4 mr-2" />
                  )}
                  Carica Storico
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Risultati */}
          {storicoData && (
            <>
              {/* Riepilogo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                    <div className="text-2xl font-bold text-blue-700">
                      {storicoData.riepilogo?.giorni_lavorati || 0}
                    </div>
                    <div className="text-xs text-blue-600">Giorni Lavorati</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto text-green-600 mb-1" />
                    <div className="text-2xl font-bold text-green-700">
                      {storicoData.riepilogo?.ore_totali?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-green-600">Ore Totali</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50 border-gray-200">
                  <CardContent className="p-4 text-center">
                    <Timer className="h-6 w-6 mx-auto text-gray-600 mb-1" />
                    <div className="text-2xl font-bold text-gray-700">
                      {storicoData.riepilogo?.ore_ordinarie?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-gray-600">Ore Ordinarie</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto text-orange-600 mb-1" />
                    <div className="text-2xl font-bold text-orange-700">
                      {storicoData.riepilogo?.ore_straordinario?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-orange-600">Ore Straordinario</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                    <div className="text-2xl font-bold text-purple-700">
                      {storicoData.riepilogo?.ore_assenza || 0}
                    </div>
                    <div className="text-xs text-purple-600">Ore Assenza</div>
                  </CardContent>
                </Card>
              </div>

              {/* Dettaglio Giorni */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Dettaglio Giornaliero</CardTitle>
                </CardHeader>
                <CardContent>
                  {storicoData.dettaglio_giorni?.length === 0 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>Nessuna timbratura registrata per questo mese</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-2">Data</th>
                            <th className="text-center p-2">Entrata</th>
                            <th className="text-center p-2">Uscita</th>
                            <th className="text-right p-2">Ore Ordinarie</th>
                            <th className="text-right p-2">Straordinario</th>
                            <th className="text-right p-2 font-bold">Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storicoData.dettaglio_giorni?.map((g, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{formatDate(g.data)}</td>
                              <td className="p-2 text-center">
                                {g.entrata ? (
                                  <span className="text-green-600">
                                    <LogIn className="h-3 w-3 inline mr-1" />
                                    {formatTime(g.entrata)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-2 text-center">
                                {g.uscita ? (
                                  <span className="text-red-600">
                                    <LogOut className="h-3 w-3 inline mr-1" />
                                    {formatTime(g.uscita)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-2 text-right">{g.ore_ordinarie?.toFixed(2) || '-'}</td>
                              <td className="p-2 text-right">
                                {g.ore_straordinario > 0 ? (
                                  <span className="text-orange-600 font-medium">
                                    +{g.ore_straordinario.toFixed(2)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="p-2 text-right font-bold">{g.ore_totali?.toFixed(2) || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan="3" className="p-2">TOTALE MESE</td>
                            <td className="p-2 text-right">{storicoData.riepilogo?.ore_ordinarie?.toFixed(2)}</td>
                            <td className="p-2 text-right text-orange-600">
                              {storicoData.riepilogo?.ore_straordinario > 0 ? 
                                `+${storicoData.riepilogo?.ore_straordinario?.toFixed(2)}` : '-'}
                            </td>
                            <td className="p-2 text-right">{storicoData.riepilogo?.ore_totali?.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assenze del mese */}
              {storicoData.assenze?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Assenze nel Periodo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {storicoData.assenze.map((a, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-purple-50 rounded">
                          <div>
                            <Badge variant="outline" className="mr-2">{a.tipo}</Badge>
                            <span className="text-sm">
                              {formatDate(a.data_inizio)} - {formatDate(a.data_fine)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{a.giorni_totali} giorni</span>
                            <span className="text-gray-500 text-sm ml-2">({a.ore_totali} ore)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Placeholder iniziale */}
          {!storicoData && !loadingStorico && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Seleziona un dipendente e clicca "Carica Storico" per visualizzare le ore lavorate</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal Timbratura */}
      {showTimbratura && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Nuova Timbratura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dipendente *</Label>
                <Select
                  value={timbraturaForm.employee_id}
                  onValueChange={(v) => setTimbraturaForm({ ...timbraturaForm, employee_id: v })}
                >
                  <SelectTrigger data-testid="select-employee-timbratura">
                    <SelectValue placeholder="Seleziona dipendente" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome} {e.cognome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Tipo</Label>
                <Select
                  value={timbraturaForm.tipo}
                  onValueChange={(v) => setTimbraturaForm({ ...timbraturaForm, tipo: v })}
                >
                  <SelectTrigger data-testid="select-tipo-timbratura">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrata">
                      <div className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" /> Entrata
                      </div>
                    </SelectItem>
                    <SelectItem value="uscita">
                      <div className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" /> Uscita
                      </div>
                    </SelectItem>
                    <SelectItem value="pausa_inizio">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4" /> Inizio Pausa
                      </div>
                    </SelectItem>
                    <SelectItem value="pausa_fine">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4" /> Fine Pausa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleTimbratura} data-testid="btn-conferma-timbratura">
                  <Clock className="h-4 w-4 mr-2" />
                  Registra
                </Button>
                <Button variant="outline" onClick={() => setShowTimbratura(false)}>
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Richiesta Assenza */}
      {showRichiesta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Nuova Richiesta Assenza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dipendente *</Label>
                <Select
                  value={richiestaForm.employee_id}
                  onValueChange={(v) => setRichiestaForm({ ...richiestaForm, employee_id: v })}
                >
                  <SelectTrigger data-testid="select-employee-richiesta">
                    <SelectValue placeholder="Seleziona dipendente" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome} {e.cognome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Tipo Assenza *</Label>
                <Select
                  value={richiestaForm.tipo}
                  onValueChange={(v) => setRichiestaForm({ ...richiestaForm, tipo: v })}
                >
                  <SelectTrigger data-testid="select-tipo-assenza">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPI_ASSENZA.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Inizio *</Label>
                  <Input
                    type="date"
                    value={richiestaForm.data_inizio}
                    onChange={(e) => setRichiestaForm({ ...richiestaForm, data_inizio: e.target.value })}
                    data-testid="input-data-inizio"
                  />
                </div>
                <div>
                  <Label>Data Fine *</Label>
                  <Input
                    type="date"
                    value={richiestaForm.data_fine}
                    onChange={(e) => setRichiestaForm({ ...richiestaForm, data_fine: e.target.value })}
                    data-testid="input-data-fine"
                  />
                </div>
              </div>
              
              <div>
                <Label>Motivo</Label>
                <Input
                  value={richiestaForm.motivo}
                  onChange={(e) => setRichiestaForm({ ...richiestaForm, motivo: e.target.value })}
                  placeholder="Motivo della richiesta (opzionale)"
                  data-testid="input-motivo"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleRichiesta} data-testid="btn-conferma-richiesta">
                  <Calendar className="h-4 w-4 mr-2" />
                  Invia Richiesta
                </Button>
                <Button variant="outline" onClick={() => setShowRichiesta(false)}>
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
