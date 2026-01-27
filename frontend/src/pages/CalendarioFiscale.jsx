import React, { useState, useEffect } from 'react';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { PageLayout, PageSection, PageGrid, PageEmpty, PageLoading, PageError } from '../components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, CheckCircle, Clock, AlertTriangle, Bell, Filter, RefreshCw } from 'lucide-react';
import api from '../api';

export default function CalendarioFiscale() {
  const { anno: selectedYear } = useAnnoGlobale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendario, setCalendario] = useState(null);
  const [filtroMese, setFiltroMese] = useState('tutti');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [completando, setCompletando] = useState(null);
  
  const MESI = [
    { id: 'tutti', label: 'Tutti i mesi' },
    { id: '01', label: 'Gennaio' },
    { id: '02', label: 'Febbraio' },
    { id: '03', label: 'Marzo' },
    { id: '04', label: 'Aprile' },
    { id: '05', label: 'Maggio' },
    { id: '06', label: 'Giugno' },
    { id: '07', label: 'Luglio' },
    { id: '08', label: 'Agosto' },
    { id: '09', label: 'Settembre' },
    { id: '10', label: 'Ottobre' },
    { id: '11', label: 'Novembre' },
    { id: '12', label: 'Dicembre' },
  ];
  
  const loadCalendario = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/fiscalita/calendario/${selectedYear}`);
      if (res.data?.success) {
        setCalendario(res.data);
      } else {
        setError('Impossibile caricare il calendario');
      }
    } catch (err) {
      console.error('Errore caricamento calendario:', err);
      setError(err.message || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadCalendario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);
  
  const completaScadenza = async (scadenzaId) => {
    setCompletando(scadenzaId);
    try {
      await api.post(`/api/fiscalita/calendario/completa/${scadenzaId}`);
      await loadCalendario();
    } catch (err) {
      console.error('Errore completamento:', err);
    } finally {
      setCompletando(null);
    }
  };
  
  const getScadenzeFiltrate = () => {
    if (!calendario?.scadenze) return [];
    
    let scadenze = [...calendario.scadenze];
    
    if (filtroMese !== 'tutti') {
      scadenze = scadenze.filter(s => s.data?.substring(5, 7) === filtroMese);
    }
    
    if (filtroStato === 'completate') {
      scadenze = scadenze.filter(s => s.completato);
    } else if (filtroStato === 'da_fare') {
      scadenze = scadenze.filter(s => !s.completato);
    }
    
    return scadenze.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  };
  
  const getTipoColor = (tipo) => {
    const colors = {
      'iva': '#3b82f6',
      'f24': '#ef4444',
      'dichiarazione': '#8b5cf6',
      'imu': '#f59e0b',
      'comunicazione': '#06b6d4',
      'default': '#64748b'
    };
    return colors[tipo] || colors.default;
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };
  
  const isScaduta = (dateStr) => {
    if (!dateStr) return false;
    const oggi = new Date().toISOString().substring(0, 10);
    return dateStr < oggi;
  };
  
  const isImminente = (dateStr) => {
    if (!dateStr) return false;
    const oggi = new Date();
    const scadenza = new Date(dateStr);
    const diffDays = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const scadenzeFiltrate = getScadenzeFiltrate();
  const scadenzeImminenti = calendario?.prossime_5 || [];

  return (
    <PageLayout
      title="Calendario Fiscale"
      subtitle={`Scadenze fiscali per ${selectedYear}`}
      icon={<Calendar size={24} />}
      actions={
        <Button onClick={loadCalendario} disabled={loading} variant="outline">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} style={{ marginRight: 8 }} />
          Aggiorna
        </Button>
      }
    >
      {loading ? (
        <PageLoading message="Caricamento calendario fiscale..." />
      ) : error ? (
        <PageError message={error} onRetry={loadCalendario} />
      ) : (
        <>
          {/* KPI Cards */}
          <PageGrid cols={4} gap={16}>
            <Card>
              <CardContent style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b' }}>
                  {calendario?.totale_scadenze || 0}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Scadenze Totali</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
                  {calendario?.completate || 0}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Completate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
                  {(calendario?.totale_scadenze || 0) - (calendario?.completate || 0)}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Da Completare</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#ef4444' }}>
                  {scadenzeImminenti.length}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Prossime 7 gg</div>
              </CardContent>
            </Card>
          </PageGrid>
          
          {/* Scadenze Imminenti */}
          {scadenzeImminenti.length > 0 && (
            <PageSection title="Scadenze Imminenti" icon={<Bell size={18} />} style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {scadenzeImminenti.map((scad, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      background: isScaduta(scad.data) ? '#fef2f2' : '#fefce8',
                      borderRadius: 12,
                      border: `1px solid ${isScaduta(scad.data) ? '#fca5a5' : '#fde047'}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: getTipoColor(scad.tipo),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        {scad.data?.substring(8, 10)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {scad.descrizione}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {formatDate(scad.data)} - {scad.tipo?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {isScaduta(scad.data) ? (
                      <span style={{
                        padding: '4px 12px',
                        background: '#dc2626',
                        color: '#fff',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        SCADUTA
                      </span>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => completaScadenza(scad.id)}
                        disabled={completando === scad.id}
                      >
                        {completando === scad.id ? 'Salvo...' : 'Completa'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </PageSection>
          )}
          
          {/* Filtri */}
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            marginTop: 20,
            marginBottom: 16,
            flexWrap: 'wrap'
          }}>
            <select
              value={filtroMese}
              onChange={(e) => setFiltroMese(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 14
              }}
            >
              {MESI.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            
            <select
              value={filtroStato}
              onChange={(e) => setFiltroStato(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 14
              }}
            >
              <option value="tutti">Tutte le scadenze</option>
              <option value="da_fare">Da completare</option>
              <option value="completate">Completate</option>
            </select>
            
            <div style={{ marginLeft: 'auto', fontSize: 14, color: '#64748b' }}>
              {scadenzeFiltrate.length} scadenze visualizzate
            </div>
          </div>
          
          {/* Lista Scadenze */}
          <Card>
            <CardContent style={{ padding: 0 }}>
              {scadenzeFiltrate.length === 0 ? (
                <PageEmpty icon="📅" message="Nessuna scadenza per i filtri selezionati" />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Data</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Descrizione</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tipo</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Stato</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scadenzeFiltrate.map((scad, idx) => (
                      <tr 
                        key={scad.id || idx}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          background: scad.completato ? '#f0fdf4' : 
                                     isScaduta(scad.data) ? '#fef2f2' :
                                     isImminente(scad.data) ? '#fefce8' : 'white'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{formatDate(scad.data)}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 500 }}>{scad.descrizione}</div>
                          {scad.note && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {scad.note}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: getTipoColor(scad.tipo),
                            color: '#fff'
                          }}>
                            {scad.tipo?.toUpperCase() || 'ALTRO'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {scad.completato ? (
                            <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <CheckCircle size={16} />
                              Completata
                            </span>
                          ) : isScaduta(scad.data) ? (
                            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <AlertTriangle size={16} />
                              Scaduta
                            </span>
                          ) : (
                            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <Clock size={16} />
                              In attesa
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {!scad.completato && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completaScadenza(scad.id)}
                              disabled={completando === scad.id}
                            >
                              {completando === scad.id ? '...' : 'Completa'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageLayout>
  );
}
