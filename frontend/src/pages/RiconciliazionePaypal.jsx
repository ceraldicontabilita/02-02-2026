/**
 * RiconciliazionePaypal.jsx
 * 
 * Interfaccia per visualizzare:
 * - Fatture riconciliate via PayPal
 * - Fornitori PayPal non trovati (servizi senza fattura elettronica)
 * - Report riconciliazioni
 */

import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  RefreshCw, CreditCard, AlertTriangle, CheckCircle2, FileText,
  Download, Search, Filter, TrendingUp, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { PageLayout } from '../components/PageLayout';

// Fornitori noti che non emettono fatture elettroniche XML
const FORNITORI_SENZA_FATTURA = [
  { nome: 'Spotify AB', tipo: 'Streaming Musicale', nota: 'Abbonamento mensile, fattura estera' },
  { nome: 'Adobe Systems', tipo: 'Software', nota: 'Licenze software, fattura estera' },
  { nome: 'HP Italy / HP Instant Ink', tipo: 'Hardware/Servizi', nota: 'Abbonamento inchiostro' },
  { nome: 'Intesa Sanpaolo', tipo: 'Bancario', nota: 'Commissioni bancarie, no fattura' },
  { nome: 'MongoDB Inc.', tipo: 'Cloud Services', nota: 'Database cloud, fattura estera' },
  { nome: 'Express Checkout', tipo: 'E-commerce generico', nota: 'Acquisti vari via PayPal' },
  { nome: 'Pagamento cellulare', tipo: 'Mobile', nota: 'Ricariche/pagamenti mobile' },
  { nome: 'Pagamento sito web', tipo: 'E-commerce', nota: 'Acquisti online generici' },
];

export default function RiconciliazionePaypal() {
  const [loading, setLoading] = useState(true);
  const [fatturePaypal, setFatturePaypal] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('riconciliate');
  const [riconciliazioneResult, setRiconciliazioneResult] = useState(null);
  const [eseguendoRiconciliazione, setEseguendoRiconciliazione] = useState(false);

  // Carica dati
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carica fatture riconciliate PayPal direttamente dal DB
      const res = await api.get('/api/fatture-ricevute/lista-paypal');
      const paypalFatture = res.data.fatture || res.data || [];
      setFatturePaypal(paypalFatture);
      
      // Calcola statistiche
      const totalePaypal = paypalFatture.reduce((sum, f) => sum + (f.total_amount || f.importo_totale || 0), 0);
      
      setStats({
        totale_fatture: res.data.totale || paypalFatture.length,
        fatture_paypal: paypalFatture.length,
        importo_paypal: totalePaypal,
        percentuale: paypalFatture.length > 0 ? 100 : 0
      });
      
    } catch (error) {
      console.error('Errore caricamento:', error);
      // Fallback: prova endpoint alternativo
      try {
        const res2 = await api.get('/api/fatture/lista?riconciliato_paypal=true&limit=500');
        const fatture = res2.data.fatture || res2.data || [];
        setFatturePaypal(fatture);
      } catch (e2) {
        console.error('Errore fallback:', e2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Esegui riconciliazione
  const eseguiRiconciliazione = async () => {
    try {
      setEseguendoRiconciliazione(true);
      toast.info('Riconciliazione in corso...');
      
      const res = await api.post('/api/fatture-ricevute/riconcilia-paypal');
      setRiconciliazioneResult(res.data);
      
      if (res.data.riconciliati > 0 || res.data.aggiornati_metodo > 0) {
        toast.success(`✅ Riconciliati: ${res.data.riconciliati}, Aggiornati: ${res.data.aggiornati_metodo}`);
        loadData(); // Ricarica dati
      } else {
        toast.info('Nessuna nuova fattura da riconciliare');
      }
      
      setActiveTab('risultato');
      
    } catch (error) {
      console.error('Errore riconciliazione:', error);
      toast.error('Errore durante la riconciliazione');
    } finally {
      setEseguendoRiconciliazione(false);
    }
  };

  const formatEuro = (value) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <RefreshCw style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <PageLayout title="Riconciliazione PayPal" subtitle="Gestione pagamenti PayPal e fatture">
      <div style={{ maxWidth: 1400, margin: '0 auto' }} data-testid="riconciliazione-paypal-page">
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 24,
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0070ba 0%, #003087 100%)',
          borderRadius: 16,
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CreditCard style={{ width: 28, height: 28 }} />
              Riconciliazione PayPal
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: 14, opacity: 0.9 }}>
              Associa pagamenti PayPal alle fatture ricevute
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={loadData}
              style={{ 
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <RefreshCw style={{ width: 16, height: 16 }} /> Aggiorna
            </button>
            <button 
              onClick={eseguiRiconciliazione}
              disabled={eseguendoRiconciliazione}
              style={{ 
                padding: '12px 24px',
                background: 'white',
                color: '#003087',
                border: 'none',
                borderRadius: 8,
                cursor: eseguendoRiconciliazione ? 'wait' : 'pointer',
                fontWeight: '700',
                opacity: eseguendoRiconciliazione ? 0.7 : 1
              }}
              data-testid="btn-esegui-riconciliazione"
            >
              {eseguendoRiconciliazione ? '⏳ Elaborazione...' : '🔄 Esegui Riconciliazione'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: 16,
          marginBottom: 24
        }}>
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: '4px solid #0070ba'
          }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Fatture PayPal</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0070ba' }}>{stats?.fatture_paypal || 0}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {stats?.percentuale}% del totale
            </div>
          </div>
          
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: '4px solid #22c55e'
          }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Importo Totale PayPal</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#22c55e' }}>
              {formatEuro(stats?.importo_paypal)}
            </div>
          </div>
          
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Fornitori Senza Fattura</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f59e0b' }}>
              {FORNITORI_SENZA_FATTURA.length}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              Servizi esteri/speciali
            </div>
          </div>
          
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            borderLeft: '4px solid #6366f1'
          }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Ultima Riconciliazione</div>
            <div style={{ fontSize: 14, fontWeight: '600', color: '#6366f1' }}>
              {riconciliazioneResult?.timestamp ? formatDate(riconciliazioneResult.timestamp) : 'Mai eseguita'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          borderBottom: '2px solid #e5e7eb', 
          paddingBottom: 8, 
          marginBottom: 20 
        }}>
          {[
            { id: 'riconciliate', label: 'Fatture PayPal', icon: <CheckCircle2 style={{ width: 16, height: 16 }} />, count: fatturePaypal.length },
            { id: 'non-trovati', label: 'Servizi Senza Fattura', icon: <AlertTriangle style={{ width: 16, height: 16 }} />, count: FORNITORI_SENZA_FATTURA.length },
            { id: 'risultato', label: 'Risultato Riconciliazione', icon: <FileText style={{ width: 16, height: 16 }} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: activeTab === tab.id ? '#0070ba' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon} {tab.label}
              {tab.count !== undefined && (
                <span style={{ 
                  padding: '2px 8px', 
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                  borderRadius: 10,
                  fontSize: 12
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Fatture Riconciliate */}
        {activeTab === 'riconciliate' && (
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '16px 20px', 
              background: '#f0fdf4', 
              borderBottom: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: '#22c55e' }} />
              <span style={{ fontWeight: 'bold', color: '#166534' }}>
                Fatture Pagate via PayPal ({fatturePaypal.length})
              </span>
            </div>
            
            {fatturePaypal.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                Nessuna fattura riconciliata con PayPal. Esegui la riconciliazione per associare i pagamenti.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px' }}>Fornitore</th>
                      <th style={{ textAlign: 'left', padding: '12px 16px' }}>N° Fattura</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px' }}>Data</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px' }}>Importo</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px' }}>ID Transazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fatturePaypal.map((f, idx) => (
                      <tr key={f.id || idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                          {f.supplier_name || f.fornitore_ragione_sociale || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                          {f.invoice_number || f.numero_documento || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {formatDate(f.invoice_date || f.data_documento)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0070ba' }}>
                          {formatEuro(f.total_amount || f.importo_totale)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' }}>
                          {f.paypal_transaction_id || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
                      <td colSpan="3" style={{ padding: '12px 16px' }}>TOTALE</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#22c55e' }}>
                        {formatEuro(fatturePaypal.reduce((sum, f) => sum + (f.total_amount || f.importo_totale || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Fornitori Senza Fattura */}
        {activeTab === 'non-trovati' && (
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '16px 20px', 
              background: '#fef3c7', 
              borderBottom: '1px solid #fcd34d',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertTriangle style={{ width: 20, height: 20, color: '#f59e0b' }} />
              <span style={{ fontWeight: 'bold', color: '#92400e' }}>
                Servizi PayPal senza Fattura Elettronica
              </span>
            </div>
            
            <div style={{ padding: 16 }}>
              <p style={{ 
                margin: '0 0 16px 0', 
                padding: 12, 
                background: '#fef9c3', 
                borderRadius: 8, 
                fontSize: 13, 
                color: '#854d0e',
                borderLeft: '4px solid #f59e0b'
              }}>
                ℹ️ Questi fornitori non emettono fatture elettroniche XML in Italia perché sono servizi esteri o non soggetti a fatturazione elettronica. 
                I pagamenti PayPal a questi fornitori non possono essere automaticamente riconciliati.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {FORNITORI_SENZA_FATTURA.map((f, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      background: '#fffbeb', 
                      borderRadius: 12, 
                      padding: 16,
                      border: '1px solid #fcd34d'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: '#fef3c7', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#f59e0b',
                        fontWeight: 'bold'
                      }}>
                        <XCircle style={{ width: 20, height: 20 }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>{f.nome}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{f.tipo}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#78716c', marginLeft: 52 }}>
                      {f.nota}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Risultato Riconciliazione */}
        {activeTab === 'risultato' && (
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '16px 20px', 
              background: '#eff6ff', 
              borderBottom: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <FileText style={{ width: 20, height: 20, color: '#3b82f6' }} />
              <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
                Report Ultima Riconciliazione
              </span>
            </div>
            
            {!riconciliazioneResult ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <FileText style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
                <p>Nessuna riconciliazione eseguita. Clicca "Esegui Riconciliazione" per avviare il processo.</p>
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                {/* Riepilogo */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: 16,
                  marginBottom: 24
                }}>
                  <div style={{ 
                    background: '#f0fdf4', 
                    borderRadius: 8, 
                    padding: 16, 
                    textAlign: 'center',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#22c55e' }}>
                      {riconciliazioneResult.riconciliati || 0}
                    </div>
                    <div style={{ fontSize: 12, color: '#166534' }}>Nuove Riconciliazioni</div>
                  </div>
                  
                  <div style={{ 
                    background: '#eff6ff', 
                    borderRadius: 8, 
                    padding: 16, 
                    textAlign: 'center',
                    border: '1px solid #bfdbfe'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#3b82f6' }}>
                      {riconciliazioneResult.aggiornati_metodo || 0}
                    </div>
                    <div style={{ fontSize: 12, color: '#1e40af' }}>Metodo Aggiornato</div>
                  </div>
                  
                  <div style={{ 
                    background: '#fef3c7', 
                    borderRadius: 8, 
                    padding: 16, 
                    textAlign: 'center',
                    border: '1px solid #fcd34d'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f59e0b' }}>
                      {riconciliazioneResult.non_trovati || 0}
                    </div>
                    <div style={{ fontSize: 12, color: '#92400e' }}>Non Trovati</div>
                  </div>
                  
                  <div style={{ 
                    background: '#f3f4f6', 
                    borderRadius: 8, 
                    padding: 16, 
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#6b7280' }}>
                      {riconciliazioneResult.pagamenti_processati || 0}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Pagamenti Processati</div>
                  </div>
                </div>

                {/* Dettaglio Riconciliazioni */}
                {riconciliazioneResult.dettaglio_riconciliazioni?.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#1f2937' }}>
                      ✅ Fatture Riconciliate
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: '#f0fdf4' }}>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>PayPal</th>
                            <th style={{ textAlign: 'left', padding: '10px 12px' }}>Fattura</th>
                            <th style={{ textAlign: 'right', padding: '10px 12px' }}>Importo</th>
                            <th style={{ textAlign: 'center', padding: '10px 12px' }}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riconciliazioneResult.dettaglio_riconciliazioni.map((r, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 500 }}>{r.pagamento_paypal?.beneficiario}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.pagamento_paypal?.data}</div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 500 }}>{r.fattura?.fornitore}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.fattura?.numero}</div>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                                {formatEuro(r.pagamento_paypal?.importo)}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: 10, 
                                  fontSize: 11,
                                  background: r.score_matching > 0.8 ? '#dcfce7' : '#fef3c7',
                                  color: r.score_matching > 0.8 ? '#166534' : '#92400e'
                                }}>
                                  {(r.score_matching * 100).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Dettaglio Non Trovati */}
                {riconciliazioneResult.dettaglio_non_trovati?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#1f2937' }}>
                      ⚠️ Pagamenti Non Riconciliati
                    </h3>
                    <div style={{ 
                      maxHeight: 300, 
                      overflowY: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8
                    }}>
                      {riconciliazioneResult.dettaglio_non_trovati.slice(0, 20).map((nt, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            padding: '10px 12px', 
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>
                              {nt.pagamento?.beneficiario || nt.pagamento?.descrizione || '-'}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>
                              {nt.motivo}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                            {formatEuro(Math.abs(nt.pagamento?.importo || 0))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {riconciliazioneResult.dettaglio_non_trovati?.length > 20 && (
                      <div style={{ padding: 8, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                        ... e altri {riconciliazioneResult.dettaglio_non_trovati.length - 20} pagamenti
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
