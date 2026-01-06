import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatDateIT, formatEuro } from '../lib/utils';

const STATO_COLORS = {
  disponibile: { bg: '#dcfce7', text: '#166534' },
  venduto: { bg: '#dbeafe', text: '#1e40af' },
  scaduto: { bg: '#fee2e2', text: '#991b1b' },
  eliminato: { bg: '#e5e7eb', text: '#6b7280' }
};

export default function RegistroLotti() {
  const [lotti, setLotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [selectedLotto, setSelectedLotto] = useState(null);

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
      await api.put(`/api/ricette/lotti/${codice}/stato`, { stato: nuovoStato });
      loadLotti();
    } catch (err) {
      alert('Errore aggiornamento stato');
    }
  };

  const getStatoStyle = (stato) => STATO_COLORS[stato] || STATO_COLORS.disponibile;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>
          📋 Registro Lotti Produzione
        </h1>
        <p style={{ color: '#64748b' }}>
          Tracciabilità completa: dal prodotto finito agli ingredienti e fornitori
        </p>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: 12, 
        marginBottom: 24 
      }}>
        {Object.entries(STATO_COLORS).map(([stato, style]) => (
          <div key={stato} style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            borderLeft: `4px solid ${style.text}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            opacity: filterStato && filterStato !== stato ? 0.5 : 1
          }} onClick={() => setFilterStato(filterStato === stato ? '' : stato)}>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{stato}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: style.text }}>
              {stats[stato]?.count || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 20,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12
      }}>
        <input
          type="text"
          placeholder="🔍 Cerca lotto o prodotto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 250 }}
        />
        <button onClick={handleSearch} style={{
          padding: '10px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}>
          Cerca
        </button>
        {filterStato && (
          <button onClick={() => setFilterStato('')} style={{
            padding: '10px 16px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}>
            ✕ Reset Filtro
          </button>
        )}
      </div>

      {/* Tabella Lotti */}
      <div style={{ 
        background: 'white', 
        borderRadius: 12, 
        overflow: 'hidden', 
        border: '1px solid #e2e8f0' 
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>⏳ Caricamento...</div>
        ) : lotti.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontWeight: 600 }}>Nessun lotto registrato</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              I lotti vengono creati automaticamente quando produci una ricetta
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: 'white' }}>
                  <th style={{ padding: 12, textAlign: 'left' }}>Codice Lotto</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Prodotto</th>
                  <th style={{ padding: 12, textAlign: 'center' }}>Quantità</th>
                  <th style={{ padding: 12, textAlign: 'center' }}>Data Produzione</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>Costo</th>
                  <th style={{ padding: 12, textAlign: 'center' }}>Stato</th>
                  <th style={{ padding: 12, textAlign: 'center' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {lotti.map((lotto, idx) => {
                  const statoStyle = getStatoStyle(lotto.stato);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>
                          {lotto.codice_lotto}
                        </div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 500 }}>{lotto.prodotto_finito}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{lotto.categoria}</div>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>
                        {lotto.quantita} {lotto.unita}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>
                        {formatDateIT(lotto.data_produzione)}
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>{formatEuro(lotto.costo_totale)}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {formatEuro(lotto.costo_unitario)}/pz
                        </div>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <select
                          value={lotto.stato}
                          onChange={(e) => handleStatoChange(lotto.codice_lotto, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: 'none',
                            background: statoStyle.bg,
                            color: statoStyle.text,
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="disponibile">Disponibile</option>
                          <option value="venduto">Venduto</option>
                          <option value="scaduto">Scaduto</option>
                          <option value="eliminato">Eliminato</option>
                        </select>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedLotto(lotto)}
                          style={{
                            padding: '6px 12px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          👁️ Dettagli
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dettaglio Lotto */}
      {selectedLotto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedLotto(null)}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#1e3a5f' }}>
                📋 Dettaglio Lotto
              </h2>
              <button onClick={() => setSelectedLotto(null)} style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer'
              }}>×</button>
            </div>

            {/* Info Lotto */}
            <div style={{ 
              background: '#f8fafc', 
              padding: 16, 
              borderRadius: 12, 
              marginBottom: 20 
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Codice Lotto</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: '#3b82f6' }}>
                    {selectedLotto.codice_lotto}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Prodotto</div>
                  <div style={{ fontWeight: 600 }}>{selectedLotto.prodotto_finito}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Quantità Prodotta</div>
                  <div style={{ fontWeight: 600 }}>{selectedLotto.quantita} {selectedLotto.unita}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Data Produzione</div>
                  <div>{formatDateIT(selectedLotto.data_produzione)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Costo Totale</div>
                  <div style={{ fontWeight: 600 }}>{formatEuro(selectedLotto.costo_totale)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Costo Unitario</div>
                  <div>{formatEuro(selectedLotto.costo_unitario)}/pz</div>
                </div>
              </div>
            </div>

            {/* Tracciabilità Ingredienti */}
            <h3 style={{ margin: '0 0 12px 0', color: '#1e3a5f' }}>
              🔗 Tracciabilità Ingredienti
            </h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: 10, textAlign: 'left', fontSize: 12 }}>Ingrediente</th>
                    <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>Qta Usata</th>
                    <th style={{ padding: 10, textAlign: 'left', fontSize: 12 }}>Fornitore</th>
                    <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>Lotto Forn.</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedLotto.ingredienti || []).map((ing, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: 10, fontSize: 13 }}>{ing.prodotto}</td>
                      <td style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>
                        {ing.quantita_usata?.toFixed(3)} {ing.unita}
                      </td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {ing.fornitore || <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                      <td style={{ padding: 10, textAlign: 'center', fontFamily: 'monospace', fontSize: 11 }}>
                        {ing.lotto_fornitore || <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedLotto.note && (
              <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                <strong>Note:</strong> {selectedLotto.note}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
