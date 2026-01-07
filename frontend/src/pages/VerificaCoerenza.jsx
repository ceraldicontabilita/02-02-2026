import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { formatEuro } from '../lib/utils';
import { 
  AlertTriangle, CheckCircle, XCircle, RefreshCw, 
  FileText, CreditCard, Building2, Receipt, TrendingUp, TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const MESI = ['', 'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function VerificaCoerenza() {
  const { anno } = useAnnoGlobale();
  const [loading, setLoading] = useState(false);
  const [verificaCompleta, setVerificaCompleta] = useState(null);
  const [confrontoIva, setConfrontoIva] = useState(null);
  const [bonifici, setBonifici] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAll();
  }, [anno]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [completa, iva, bonif] = await Promise.all([
        api.get(`/api/verifica-coerenza/completa/${anno}`),
        api.get(`/api/verifica-coerenza/confronto-iva-completo/${anno}`),
        api.get(`/api/verifica-coerenza/verifica-bonifici-vs-banca/${anno}`)
      ]);
      setVerificaCompleta(completa.data);
      setConfrontoIva(iva.data);
      setBonifici(bonif.data);
    } catch (err) {
      console.error('Errore caricamento:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const getStatoColor = (stato) => {
    switch (stato) {
      case 'OK': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'ATTENZIONE': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'CRITICO': return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  const stato = verificaCompleta?.stato_generale || 'OK';
  const statoColors = getStatoColor(stato);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 'bold', color: '#1e293b' }}>
            🔍 Verifica Coerenza Dati
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>
            Controllo automatico della consistenza dei dati tra tutte le sezioni - Anno {anno}
          </p>
        </div>
        <Button onClick={loadAll} disabled={loading} data-testid="btn-ricarica-verifica">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Ricarica Verifiche
        </Button>
      </div>

      {error && (
        <div style={{ 
          padding: 16, 
          background: '#fef2f2', 
          borderRadius: 8, 
          color: '#991b1b',
          marginBottom: 20 
        }}>
          {error}
        </div>
      )}

      {/* Stato Generale */}
      {verificaCompleta && (
        <Card style={{ 
          marginBottom: 24, 
          background: statoColors.bg,
          border: `2px solid ${statoColors.border}`
        }}>
          <CardContent className="pt-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {stato === 'OK' && <CheckCircle size={48} color={statoColors.text} />}
                {stato === 'ATTENZIONE' && <AlertTriangle size={48} color={statoColors.text} />}
                {stato === 'CRITICO' && <XCircle size={48} color={statoColors.text} />}
                <div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: statoColors.text }}>
                    Stato: {stato}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Ultima verifica: {new Date(verificaCompleta.timestamp).toLocaleString('it-IT')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#dc2626' }}>
                    {verificaCompleta.riepilogo?.critical || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Critiche</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f59e0b' }}>
                    {verificaCompleta.riepilogo?.warning || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Avvisi</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2563eb' }}>
                    {verificaCompleta.riepilogo?.info || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Info</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Griglia Verifiche */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
        
        {/* IVA Annuale */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              IVA Annuale {anno}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificaCompleta?.verifiche?.iva_annuale && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: '#fef2f2', borderRadius: 8 }}>
                  <span style={{ color: '#991b1b' }}>IVA Debito (Corrispettivi)</span>
                  <strong style={{ color: '#dc2626' }}>{formatEuro(verificaCompleta.verifiche.iva_annuale.iva_debito_totale)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: '#dcfce7', borderRadius: 8 }}>
                  <span style={{ color: '#166534' }}>IVA Credito (Fatture)</span>
                  <strong style={{ color: '#059669' }}>{formatEuro(verificaCompleta.verifiche.iva_annuale.iva_credito_totale)}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: 12, 
                  background: verificaCompleta.verifiche.iva_annuale.saldo_iva > 0 ? '#fef3c7' : '#dbeafe',
                  borderRadius: 8,
                  fontWeight: 'bold'
                }}>
                  <span>Saldo IVA</span>
                  <span style={{ color: verificaCompleta.verifiche.iva_annuale.saldo_iva > 0 ? '#92400e' : '#1e40af' }}>
                    {verificaCompleta.verifiche.iva_annuale.saldo_iva > 0 ? 'Da versare ' : 'A credito '}
                    {formatEuro(Math.abs(verificaCompleta.verifiche.iva_annuale.saldo_iva))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Versamenti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Versamenti Cassa vs Banca
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificaCompleta?.verifiche?.versamenti && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Versamenti registrati (Cassa)</span>
                  <strong>{formatEuro(verificaCompleta.verifiche.versamenti.versamenti_manuali)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Versamenti in banca</span>
                  <strong>{formatEuro(verificaCompleta.verifiche.versamenti.versamenti_banca)}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: 12,
                  background: Math.abs(verificaCompleta.verifiche.versamenti.differenza) < 1 ? '#dcfce7' : '#fef2f2',
                  borderRadius: 8
                }}>
                  <span>Differenza</span>
                  <strong style={{ 
                    color: Math.abs(verificaCompleta.verifiche.versamenti.differenza) < 1 ? '#166534' : '#dc2626'
                  }}>
                    {Math.abs(verificaCompleta.verifiche.versamenti.differenza) < 1 ? (
                      <><CheckCircle size={16} style={{ display: 'inline', marginRight: 4 }} />OK</>
                    ) : (
                      formatEuro(verificaCompleta.verifiche.versamenti.differenza)
                    )}
                  </strong>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saldi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Prima Nota vs Estratto Conto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificaCompleta?.verifiche?.saldi && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Saldo Prima Nota Banca</span>
                  <strong>{formatEuro(verificaCompleta.verifiche.saldi.saldo_prima_nota)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Saldo Estratto Conto</span>
                  <strong>{formatEuro(verificaCompleta.verifiche.saldi.saldo_estratto_conto)}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: 12,
                  background: Math.abs(verificaCompleta.verifiche.saldi.differenza) < 1 ? '#dcfce7' : '#fef2f2',
                  borderRadius: 8
                }}>
                  <span>Differenza</span>
                  <strong style={{ 
                    color: Math.abs(verificaCompleta.verifiche.saldi.differenza) < 1 ? '#166534' : '#dc2626'
                  }}>
                    {Math.abs(verificaCompleta.verifiche.saldi.differenza) < 1 ? (
                      <><CheckCircle size={16} style={{ display: 'inline', marginRight: 4 }} />OK</>
                    ) : (
                      formatEuro(verificaCompleta.verifiche.saldi.differenza)
                    )}
                  </strong>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bonifici */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Bonifici Registrati vs Banca
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bonifici && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bonifici registrati</span>
                  <strong>{formatEuro(bonifici.bonifici_registrati.totale)} ({bonifici.bonifici_registrati.count})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Riconciliati</span>
                  <strong style={{ color: '#059669' }}>{bonifici.bonifici_registrati.riconciliati}/{bonifici.bonifici_registrati.count}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bonifici in banca</span>
                  <strong>{formatEuro(bonifici.bonifici_banca.totale)} ({bonifici.bonifici_banca.count})</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: 12,
                  background: bonifici.coerente ? '#dcfce7' : '#fef2f2',
                  borderRadius: 8
                }}>
                  <span>Differenza</span>
                  <strong style={{ color: bonifici.coerente ? '#166534' : '#dc2626' }}>
                    {bonifici.coerente ? (
                      <><CheckCircle size={16} style={{ display: 'inline', marginRight: 4 }} />OK</>
                    ) : (
                      formatEuro(bonifici.differenza)
                    )}
                  </strong>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabella IVA Mensile */}
      {confrontoIva && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Confronto IVA Mensile {anno}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: 12, textAlign: 'left' }}>Mese</th>
                    <th style={{ padding: 12, textAlign: 'right' }}>IVA Debito</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>N. Corr.</th>
                    <th style={{ padding: 12, textAlign: 'right' }}>IVA Credito</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>N. Fatt.</th>
                    <th style={{ padding: 12, textAlign: 'right' }}>Saldo</th>
                    <th style={{ padding: 12, textAlign: 'center' }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {confrontoIva.mensile?.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 12, fontWeight: 'bold' }}>{m.mese_nome}</td>
                      <td style={{ padding: 12, textAlign: 'right', color: '#dc2626' }}>
                        {formatEuro(m.iva_debito_corrispettivi)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>
                        {m.num_corrispettivi}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right', color: '#059669' }}>
                        {formatEuro(m.iva_credito_fatture)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>
                        {m.num_fatture}
                      </td>
                      <td style={{ 
                        padding: 12, 
                        textAlign: 'right', 
                        fontWeight: 'bold',
                        color: m.saldo > 0 ? '#dc2626' : '#059669'
                      }}>
                        {m.saldo > 0 ? '+' : ''}{formatEuro(m.saldo)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        {m.da_versare > 0 ? (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: 4, 
                            background: '#fef3c7', 
                            color: '#92400e',
                            fontSize: 11
                          }}>
                            Versare {formatEuro(m.da_versare)}
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: 4, 
                            background: '#dbeafe', 
                            color: '#1e40af',
                            fontSize: 11
                          }}>
                            Credito {formatEuro(m.a_credito)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#1e293b', color: 'white', fontWeight: 'bold' }}>
                    <td style={{ padding: 12 }}>TOTALE {anno}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{formatEuro(confrontoIva.totali?.iva_debito_totale)}</td>
                    <td style={{ padding: 12 }}></td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{formatEuro(confrontoIva.totali?.iva_credito_totale)}</td>
                    <td style={{ padding: 12 }}></td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      {confrontoIva.totali?.saldo_annuale > 0 ? '+' : ''}{formatEuro(confrontoIva.totali?.saldo_annuale)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {confrontoIva.totali?.saldo_annuale > 0 ? 'DA VERSARE' : 'A CREDITO'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista Discrepanze */}
      {verificaCompleta?.discrepanze?.length > 0 && (
        <Card className="mt-6" style={{ border: '2px solid #fecaca' }}>
          <CardHeader style={{ background: '#fef2f2' }}>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Discrepanze Rilevate ({verificaCompleta.discrepanze.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div style={{ display: 'grid', gap: 12 }}>
              {verificaCompleta.discrepanze.map((d, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: 16,
                    background: d.severita === 'critical' ? '#fef2f2' : '#fffbeb',
                    borderRadius: 8,
                    border: `1px solid ${d.severita === 'critical' ? '#fecaca' : '#fde68a'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 'bold',
                          background: d.severita === 'critical' ? '#dc2626' : '#f59e0b',
                          color: 'white'
                        }}>
                          {d.severita.toUpperCase()}
                        </span>
                        <strong style={{ color: '#1e293b' }}>{d.categoria}</strong>
                        <span style={{ color: '#64748b' }}>• {d.sottocategoria}</span>
                      </div>
                      <p style={{ margin: '8px 0', color: '#475569' }}>{d.descrizione}</p>
                      {d.periodo && (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Periodo: {d.periodo}</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 20 }}>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Atteso</div>
                      <div style={{ fontWeight: 'bold', color: '#059669', fontSize: 16 }}>{formatEuro(d.valore_atteso)}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Trovato</div>
                      <div style={{ fontWeight: 'bold', color: '#dc2626', fontSize: 16 }}>{formatEuro(d.valore_trovato)}</div>
                      <div style={{ 
                        marginTop: 8,
                        padding: '4px 12px',
                        background: '#1e293b',
                        color: 'white',
                        borderRadius: 4,
                        fontWeight: 'bold'
                      }}>
                        Δ {d.differenza > 0 ? '+' : ''}{formatEuro(d.differenza)}
                      </div>
                    </div>
                  </div>
                  {d.suggerimento && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12, 
                      background: 'white', 
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#64748b',
                      borderLeft: '3px solid #3b82f6'
                    }}>
                      💡 <strong>Suggerimento:</strong> {d.suggerimento}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nessuna discrepanza */}
      {verificaCompleta?.discrepanze?.length === 0 && (
        <Card className="mt-6" style={{ background: '#dcfce7', border: '2px solid #bbf7d0' }}>
          <CardContent className="pt-6">
            <div style={{ textAlign: 'center', padding: 40 }}>
              <CheckCircle size={64} color="#16a34a" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ margin: 0, color: '#166534', fontSize: 24 }}>Tutti i Dati sono Coerenti!</h3>
              <p style={{ margin: '8px 0 0', color: '#15803d' }}>
                Non sono state rilevate discrepanze tra le varie sezioni del gestionale.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
