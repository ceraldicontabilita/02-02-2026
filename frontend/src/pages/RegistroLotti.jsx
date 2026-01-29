import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { formatDateIT, formatEuro, STYLES, COLORS, button, badge } from '../lib/utils';
import { Package, Search, Filter, ChevronDown, ChevronUp, Eye, Calendar, Factory, Layers, RefreshCw, Copy, Printer, ArrowLeft } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';

const STATO_CONFIG = {
  disponibile: { bg: '#dcfce7', text: '#166534', label: 'Disponibile', icon: '✅' },
  venduto: { bg: '#dbeafe', text: '#1e40af', label: 'Venduto', icon: '💰' },
  scaduto: { bg: '#fee2e2', text: '#991b1b', label: 'Scaduto', icon: '⚠️' },
  eliminato: { bg: '#f3f4f6', text: '#6b7280', label: 'Eliminato', icon: '🗑️' }
};

export default function RegistroLotti() {
  const [lotti, setLotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [selectedLotto, setSelectedLotto] = useState(null);
  const [expandedLotto, setExpandedLotto] = useState(null);

  useEffect(() => {
    loadLotti();
  }, [filterStato]);

  const loadLotti = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStato) params.append('stato', filterStato);
      if (search) params.append('search', search);
      
      const res = await api.get(`/api/ricette/lotti?${params}`);
      setLotti(res.data.lotti || []);
      setStats(res.data.per_stato || {});
    } catch (err) {
      console.error('Errore caricamento lotti:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadLotti();
  };

  const handleStatoChange = async (codice, nuovoStato) => {
    try {
      await api.put(`/api/ricette/lotti/${encodeURIComponent(codice)}/stato`, { stato: nuovoStato });
      loadLotti();
    } catch (err) {
      alert('Errore aggiornamento stato');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiato negli appunti!');
  };

  const getTotale = () => {
    return Object.values(stats).reduce((acc, s) => acc + (s?.count || 0), 0);
  };

  const getLottiSettimana = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return lotti.filter(l => new Date(l.data_produzione) >= oneWeekAgo).length;
  };

  return (
    <PageLayout 
      title="Registro Lotti" 
      icon="📋"
      subtitle="Tracciabilità produzione"
    >
      <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <Link 
            to="/ricette" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={16} /> Torna alle Ricette
          </Link>
        </div>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 700, 
          color: '#1e293b', 
          margin: '0 0 8px 0', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <Layers size={32} style={{ color: '#3b82f6' }} />
          Registro Lotti Produzione
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Tracciabilità completa: dal prodotto finito agli ingredienti e fornitori
        </p>
      </div>

      {/* Stats Cards (stile app di riferimento) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Package size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{getTotale()}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Lotti Totali</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{getLottiSettimana()}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Lotti Settimana</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Factory size={24} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{stats.disponibile?.count || 0}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Disponibili</div>
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RefreshCw size={24} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{stats.scaduto?.count || 0}</div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Scaduti</div>
          </div>
        </div>
      </div>

      {/* Filtri per stato */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setFilterStato('')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: filterStato === '' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
            background: filterStato === '' ? '#eff6ff' : 'white',
            color: filterStato === '' ? '#3b82f6' : '#64748b',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          Tutti ({getTotale()})
        </button>
        {Object.entries(STATO_CONFIG).map(([stato, config]) => (
          <button
            key={stato}
            onClick={() => setFilterStato(filterStato === stato ? '' : stato)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: filterStato === stato ? `2px solid ${config.text}` : '1px solid #e2e8f0',
              background: filterStato === stato ? config.bg : 'white',
              color: filterStato === stato ? config.text : '#64748b',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {config.icon} {config.label} ({stats[stato]?.count || 0})
          </button>
        ))}
      </div>

      {/* Barra di ricerca */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Cerca lotto o prodotto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ 
              width: '100%',
              padding: '12px 12px 12px 40px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              fontSize: '14px'
            }}
            data-testid="search-lotti"
          />
        </div>
        <button 
          onClick={handleSearch} 
          style={{
            padding: '12px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          Cerca
        </button>
        <button 
          onClick={loadLotti} 
          style={{
            padding: '12px 16px',
            background: 'white',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={16} /> Aggiorna
        </button>
      </div>

      {/* Lista Lotti */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        border: '1px solid #e2e8f0' 
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <div>Caricamento lotti...</div>
          </div>
        ) : lotti.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <Layers size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Nessun lotto registrato</div>
            <div style={{ fontSize: '13px' }}>
              I lotti vengono creati automaticamente quando produci una ricetta
            </div>
            <Link 
              to="/ricette"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Vai alle Ricette
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: 'white' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>CODICE LOTTO</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>PRODOTTO</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>QUANTITÀ</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>DATA PROD.</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>COSTO</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>STATO</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>AZIONI</th>
                </tr>
              </thead>
              <tbody>
                {lotti.map((lotto, idx) => {
                  const statoConfig = STATO_CONFIG[lotto.stato] || STATO_CONFIG.disponibile;
                  const isExpanded = expandedLotto === lotto.codice_lotto;
                  
                  return (
                    <React.Fragment key={idx}>
                      <tr style={{ 
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#f8fafc' : 'white'
                      }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px' 
                          }}>
                            <div style={{ 
                              fontFamily: 'monospace', 
                              fontWeight: 700, 
                              color: '#3b82f6',
                              fontSize: '14px',
                              background: '#eff6ff',
                              padding: '6px 10px',
                              borderRadius: '6px'
                            }}>
                              {lotto.codice_lotto}
                            </div>
                            <button
                              onClick={() => copyToClipboard(lotto.codice_lotto)}
                              style={{
                                padding: '4px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8'
                              }}
                              title="Copia codice"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{lotto.prodotto_finito}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{lotto.categoria || 'Altro'}</div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: 700, 
                            fontSize: '16px',
                            color: '#1e293b'
                          }}>
                            {lotto.quantita}
                          </span>
                          <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '4px' }}>
                            {lotto.unita}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '14px', color: '#1e293b' }}>
                            {formatDateIT(lotto.data_produzione)}
                          </div>
                          {lotto.scadenza_stimata && (
                            <div style={{ fontSize: '11px', color: '#f59e0b' }}>
                              Scade: {formatDateIT(lotto.scadenza_stimata)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {formatEuro(lotto.costo_totale)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {formatEuro(lotto.costo_unitario)}/{lotto.unita}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <select
                            value={lotto.stato}
                            onChange={(e) => handleStatoChange(lotto.codice_lotto, e.target.value)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: statoConfig.bg,
                              color: statoConfig.text,
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {Object.entries(STATO_CONFIG).map(([key, config]) => (
                              <option key={key} value={key}>{config.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <button
                            onClick={() => setExpandedLotto(isExpanded ? null : lotto.codice_lotto)}
                            style={{
                              padding: '8px 14px',
                              background: isExpanded ? '#3b82f6' : '#f1f5f9',
                              color: isExpanded ? 'white' : '#64748b',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            data-testid={`expand-lotto-${idx}`}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Chiudi' : 'Dettagli'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Riga espansa con dettagli ingredienti */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 16px 16px 16px', background: '#f8fafc' }}>
                            <div style={{
                              background: 'white',
                              borderRadius: '10px',
                              padding: '20px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <h4 style={{ 
                                fontSize: '14px', 
                                fontWeight: 600, 
                                color: '#1e293b', 
                                margin: '0 0 16px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <Package size={16} />
                                Tracciabilità Ingredienti ({lotto.ingredienti?.length || 0})
                              </h4>
                              
                              {lotto.ingredienti && lotto.ingredienti.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc' }}>
                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>INGREDIENTE</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>QTÀ USATA</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>LOTTO FORN.</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>FORNITORE</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>DATA CONS.</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lotto.ingredienti.map((ing, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px 12px' }}>
                                            <span style={{ fontWeight: 500, color: '#1e293b' }}>{ing.prodotto}</span>
                                          </td>
                                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 600 }}>{ing.quantita_usata}</span>
                                            <span style={{ color: '#64748b', marginLeft: '4px' }}>{ing.unita}</span>
                                          </td>
                                          <td style={{ padding: '10px 12px' }}>
                                            {ing.lotto_fornitore ? (
                                              <span style={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '12px',
                                                background: '#fef3c7',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                color: '#92400e'
                                              }}>
                                                {ing.lotto_fornitore}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>N/D</span>
                                            )}
                                          </td>
                                          <td style={{ padding: '10px 12px', fontSize: '13px', color: '#64748b' }}>
                                            {ing.fornitore || 'N/D'}
                                          </td>
                                          <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px' }}>
                                            {ing.data_consegna ? formatDateIT(ing.data_consegna) : 'N/D'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{ 
                                  padding: '20px', 
                                  textAlign: 'center', 
                                  color: '#94a3b8',
                                  background: '#f8fafc',
                                  borderRadius: '8px'
                                }}>
                                  Nessuna tracciabilità ingredienti disponibile
                                </div>
                              )}
                              
                              {/* Note */}
                              {lotto.note && (
                                <div style={{ 
                                  marginTop: '16px', 
                                  padding: '12px', 
                                  background: '#fffbeb', 
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  color: '#92400e'
                                }}>
                                  <strong>Note:</strong> {lotto.note}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </PageLayout>
  );
}
