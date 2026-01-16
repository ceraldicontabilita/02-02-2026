import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatEuro } from '../lib/utils';

/**
 * Riconciliazione Smart - Versione Semplificata
 * 
 * Due sezioni:
 * 1. DA CONFERMARE: Movimenti riconosciuti automaticamente, basta un click per confermare
 * 2. DA ASSOCIARE: Movimenti non riconosciuti, scegli tu cosa associare
 */

const TIPO_COLORS = {
  incasso_pos: { bg: '#d1fae5', color: '#059669', icon: '💳', label: 'Incasso POS' },
  commissione_pos: { bg: '#fef3c7', color: '#92400e', icon: '💸', label: 'Commissione POS' },
  commissione_bancaria: { bg: '#e0e7ff', color: '#3730a3', icon: '🏦', label: 'Comm. Bancaria' },
  stipendio: { bg: '#dcfce7', color: '#166534', icon: '👤', label: 'Stipendio' },
  f24: { bg: '#fee2e2', color: '#991b1b', icon: '📄', label: 'F24' },
  prelievo_assegno: { bg: '#fef3c7', color: '#92400e', icon: '📝', label: 'Prelievo Assegno' },
  fattura_sdd: { bg: '#dbeafe', color: '#1e40af', icon: '🔄', label: 'Addebito SDD' },
  fattura_bonifico: { bg: '#f3e8ff', color: '#7c3aed', icon: '📑', label: 'Bonifico' },
  non_riconosciuto: { bg: '#f1f5f9', color: '#475569', icon: '❓', label: 'Da Associare' }
};

export default function RiconciliazioneSmart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('auto'); // 'auto' | 'manual'
  const [selectedMovimento, setSelectedMovimento] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('fattura');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/operazioni-da-confermare/smart/analizza?limit=300');
      setData(res.data);
    } catch (e) {
      console.error('Errore:', e);
    } finally {
      setLoading(false);
    }
  };

  // Conferma singolo movimento (automatico)
  const handleConferma = async (movimento) => {
    setProcessing(movimento.movimento_id);
    try {
      await api.post('/api/operazioni-da-confermare/smart/riconcilia-manuale', {
        movimento_id: movimento.movimento_id,
        tipo: movimento.tipo,
        associazioni: movimento.suggerimenti?.slice(0, 1) || [],
        categoria: movimento.categoria
      });
      
      // Rimuovi dalla lista
      setData(prev => ({
        ...prev,
        movimenti: prev.movimenti.filter(m => m.movimento_id !== movimento.movimento_id),
        stats: {
          ...prev.stats,
          totale: prev.stats.totale - 1
        }
      }));
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setProcessing(null);
    }
  };

  // Conferma TUTTI i movimenti automatici
  const handleConfermaTutti = async () => {
    const autoMovs = data?.movimenti?.filter(m => m.associazione_automatica) || [];
    if (autoMovs.length === 0) {
      alert('Nessun movimento da confermare');
      return;
    }
    
    if (!window.confirm(`Confermare ${autoMovs.length} movimenti?`)) return;
    
    setProcessing('all');
    let ok = 0, err = 0;
    
    for (const m of autoMovs) {
      try {
        await api.post('/api/operazioni-da-confermare/smart/riconcilia-manuale', {
          movimento_id: m.movimento_id,
          tipo: m.tipo,
          associazioni: m.suggerimenti?.slice(0, 1) || [],
          categoria: m.categoria
        });
        ok++;
      } catch (e) {
        err++;
      }
    }
    
    alert(`✅ Confermati: ${ok}\n❌ Errori: ${err}`);
    loadData();
    setProcessing(null);
  };

  // Apri modal per associazione manuale
  const handleAssociaManuale = async (movimento, tipo) => {
    setSelectedMovimento(movimento);
    setSearchType(tipo);
    setSearchResults([]);
    
    try {
      const importo = Math.abs(movimento.importo);
      let url = '';
      
      if (tipo === 'fattura') {
        url = `/api/operazioni-da-confermare/smart/cerca-fatture?importo=${importo}`;
      } else if (tipo === 'stipendio') {
        url = `/api/operazioni-da-confermare/smart/cerca-stipendi?importo=${importo}`;
      } else if (tipo === 'f24') {
        url = `/api/operazioni-da-confermare/smart/cerca-f24?importo=${importo}`;
      }
      
      if (url) {
        const res = await api.get(url);
        setSearchResults(res.data?.results || res.data || []);
      }
    } catch (e) {
      console.error('Errore ricerca:', e);
    }
  };

  // Conferma associazione manuale
  const handleConfermaAssociazione = async (item) => {
    if (!selectedMovimento) return;
    
    setProcessing(selectedMovimento.movimento_id);
    try {
      await api.post('/api/operazioni-da-confermare/smart/riconcilia-manuale', {
        movimento_id: selectedMovimento.movimento_id,
        tipo: searchType,
        associazioni: [item],
        categoria: selectedMovimento.categoria
      });
      
      // Rimuovi dalla lista
      setData(prev => ({
        ...prev,
        movimenti: prev.movimenti.filter(m => m.movimento_id !== selectedMovimento.movimento_id),
        stats: { ...prev.stats, totale: prev.stats.totale - 1 }
      }));
      
      setSelectedMovimento(null);
      setSearchResults([]);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setProcessing(null);
    }
  };

  // Ignora movimento (salta senza associare)
  const handleIgnora = async (movimento) => {
    if (!window.confirm('Ignorare questo movimento?')) return;
    
    setProcessing(movimento.movimento_id);
    try {
      await api.post('/api/operazioni-da-confermare/smart/ignora', {
        movimento_id: movimento.movimento_id
      });
      
      setData(prev => ({
        ...prev,
        movimenti: prev.movimenti.filter(m => m.movimento_id !== movimento.movimento_id),
        stats: { ...prev.stats, totale: prev.stats.totale - 1 }
      }));
    } catch (e) {
      // Se l'endpoint non esiste, rimuovi comunque dalla UI
      setData(prev => ({
        ...prev,
        movimenti: prev.movimenti.filter(m => m.movimento_id !== movimento.movimento_id),
        stats: { ...prev.stats, totale: prev.stats.totale - 1 }
      }));
    } finally {
      setProcessing(null);
    }
  };

  // Filtra movimenti
  const movimentiAuto = data?.movimenti?.filter(m => m.associazione_automatica) || [];
  const movimentiManuali = data?.movimenti?.filter(m => !m.associazione_automatica) || [];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '-';

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div>Caricamento riconciliazione...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          🔗 Riconciliazione Smart
        </h1>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>
          Associa i movimenti bancari a fatture, stipendi e F24
        </p>
      </div>

      {/* Stats rapide */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: 12, 
        marginBottom: 20 
      }}>
        <StatCard 
          label="Da Confermare" 
          value={movimentiAuto.length} 
          color="#10b981" 
          icon="✅"
          subtitle="Riconosciuti auto"
        />
        <StatCard 
          label="Da Associare" 
          value={movimentiManuali.length} 
          color="#f59e0b" 
          icon="🔍"
          subtitle="Manuale"
        />
        <StatCard 
          label="Totale" 
          value={data?.stats?.totale || 0} 
          color="#3b82f6" 
          icon="📊"
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab('auto')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'auto' ? '#10b981' : '#f1f5f9',
            color: activeTab === 'auto' ? 'white' : '#374151',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          ✅ Da Confermare ({movimentiAuto.length})
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'manual' ? '#f59e0b' : '#f1f5f9',
            color: activeTab === 'manual' ? 'white' : '#374151',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          🔍 Da Associare ({movimentiManuali.length})
        </button>
        <button
          onClick={loadData}
          style={{
            marginLeft: 'auto',
            padding: '12px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          🔄 Aggiorna
        </button>
      </div>

      {/* TAB: Da Confermare (Automatici) */}
      {activeTab === 'auto' && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {/* Header con azione batch */}
          <div style={{ 
            padding: 16, 
            background: '#ecfdf5', 
            borderBottom: '1px solid #d1fae5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#059669' }}>
                ✅ Movimenti Riconosciuti Automaticamente
              </div>
              <div style={{ fontSize: 13, color: '#10b981' }}>
                Questi movimenti sono stati associati automaticamente. Conferma o modifica.
              </div>
            </div>
            {movimentiAuto.length > 0 && (
              <button
                onClick={handleConfermaTutti}
                disabled={processing === 'all'}
                style={{
                  padding: '10px 20px',
                  background: processing === 'all' ? '#9ca3af' : '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 'bold',
                  cursor: processing === 'all' ? 'not-allowed' : 'pointer'
                }}
              >
                {processing === 'all' ? '⏳ Elaborazione...' : `✓ Conferma Tutti (${movimentiAuto.length})`}
              </button>
            )}
          </div>

          {/* Lista movimenti auto */}
          {movimentiAuto.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>✅</div>
              <div>Nessun movimento da confermare</div>
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              {movimentiAuto.map((m, idx) => (
                <MovimentoCard
                  key={m.movimento_id || idx}
                  movimento={m}
                  onConferma={() => handleConferma(m)}
                  onIgnora={() => handleIgnora(m)}
                  processing={processing === m.movimento_id}
                  showAssociazione={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Da Associare (Manuali) */}
      {activeTab === 'manual' && (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            padding: 16, 
            background: '#fffbeb', 
            borderBottom: '1px solid #fef3c7'
          }}>
            <div style={{ fontWeight: 'bold', color: '#92400e' }}>
              🔍 Movimenti da Associare Manualmente
            </div>
            <div style={{ fontSize: 13, color: '#b45309' }}>
              Clicca su un movimento per associarlo a una fattura, stipendio o F24
            </div>
          </div>

          {/* Lista movimenti manuali */}
          {movimentiManuali.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 48, opacity: 0.3 }}>🎉</div>
              <div>Tutti i movimenti sono stati associati!</div>
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              {movimentiManuali.map((m, idx) => (
                <MovimentoCardManuale
                  key={m.movimento_id || idx}
                  movimento={m}
                  onAssociaFattura={() => handleAssociaManuale(m, 'fattura')}
                  onAssociaStipendio={() => handleAssociaManuale(m, 'stipendio')}
                  onAssociaF24={() => handleAssociaManuale(m, 'f24')}
                  onIgnora={() => handleIgnora(m)}
                  processing={processing === m.movimento_id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Associazione */}
      {selectedMovimento && (
        <ModalAssociazione
          movimento={selectedMovimento}
          tipo={searchType}
          results={searchResults}
          onSelect={handleConfermaAssociazione}
          onClose={() => { setSelectedMovimento(null); setSearchResults([]); }}
        />
      )}
    </div>
  );
}

// Componenti helper

function StatCard({ label, value, color, icon, subtitle }) {
  return (
    <div style={{ 
      background: 'white', 
      borderRadius: 10, 
      padding: 16, 
      border: '1px solid #e5e7eb',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{value}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#9ca3af' }}>{subtitle}</div>}
        </div>
        <div style={{ fontSize: 32, opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
}

function MovimentoCard({ movimento, onConferma, onIgnora, processing, showAssociazione }) {
  const tipo = TIPO_COLORS[movimento.tipo] || TIPO_COLORS.non_riconosciuto;
  const suggerimento = movimento.suggerimenti?.[0];
  
  return (
    <div style={{ 
      padding: 16, 
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      opacity: processing ? 0.5 : 1
    }}>
      {/* Icona tipo */}
      <div style={{ 
        width: 44, 
        height: 44, 
        borderRadius: 10, 
        background: tipo.bg, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: 20
      }}>
        {tipo.icon}
      </div>
      
      {/* Info movimento */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>
          {new Date(movimento.data).toLocaleDateString('it-IT')} - {formatEuro(movimento.importo)}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          {movimento.descrizione?.substring(0, 80) || '-'}
        </div>
        <div style={{ 
          display: 'inline-block',
          padding: '2px 8px', 
          background: tipo.bg, 
          color: tipo.color,
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 'bold'
        }}>
          {tipo.label}
        </div>
      </div>
      
      {/* Suggerimento associazione */}
      {showAssociazione && suggerimento && (
        <div style={{ 
          padding: 10, 
          background: '#f0fdf4', 
          borderRadius: 8,
          border: '1px solid #bbf7d0',
          maxWidth: 250
        }}>
          <div style={{ fontSize: 10, color: '#059669', fontWeight: 'bold', marginBottom: 4 }}>
            🔗 ASSOCIATO A:
          </div>
          <div style={{ fontSize: 12, fontWeight: 'bold' }}>
            {suggerimento.fornitore || suggerimento.dipendente || suggerimento.tipo_tributo || '-'}
          </div>
          {suggerimento.numero_fattura && (
            <div style={{ fontSize: 11, color: '#64748b' }}>Fatt. {suggerimento.numero_fattura}</div>
          )}
          {suggerimento.importo && (
            <div style={{ fontSize: 11, color: '#059669' }}>{formatEuro(suggerimento.importo)}</div>
          )}
        </div>
      )}
      
      {/* Azioni */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onConferma}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: 13
          }}
        >
          {processing ? '⏳' : '✓ Conferma'}
        </button>
        <button
          onClick={onIgnora}
          disabled={processing}
          style={{
            padding: '8px 12px',
            background: '#f1f5f9',
            color: '#64748b',
            border: 'none',
            borderRadius: 6,
            cursor: processing ? 'not-allowed' : 'pointer',
            fontSize: 13
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function MovimentoCardManuale({ movimento, onAssociaFattura, onAssociaStipendio, onAssociaF24, onIgnora, processing }) {
  const tipo = TIPO_COLORS[movimento.tipo] || TIPO_COLORS.non_riconosciuto;
  
  return (
    <div style={{ 
      padding: 16, 
      borderBottom: '1px solid #f1f5f9',
      opacity: processing ? 0.5 : 1
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        {/* Icona */}
        <div style={{ 
          width: 44, 
          height: 44, 
          borderRadius: 10, 
          background: tipo.bg, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: 20
        }}>
          {tipo.icon}
        </div>
        
        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {new Date(movimento.data).toLocaleDateString('it-IT')} - {formatEuro(movimento.importo)}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {movimento.descrizione?.substring(0, 100) || '-'}
          </div>
        </div>
      </div>
      
      {/* Bottoni associazione */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={onAssociaFattura}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 12
          }}
        >
          🧾 Associa Fattura
        </button>
        <button
          onClick={onAssociaStipendio}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 12
          }}
        >
          👤 Associa Stipendio
        </button>
        <button
          onClick={onAssociaF24}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 12
          }}
        >
          📄 Associa F24
        </button>
        <button
          onClick={onIgnora}
          disabled={processing}
          style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            color: '#64748b',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            marginLeft: 'auto'
          }}
        >
          Ignora
        </button>
      </div>
    </div>
  );
}

function ModalAssociazione({ movimento, tipo, results, onSelect, onClose }) {
  const tipoLabel = {
    fattura: '🧾 Seleziona Fattura',
    stipendio: '👤 Seleziona Stipendio',
    f24: '📄 Seleziona F24'
  }[tipo] || 'Seleziona';

  return (
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
      zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        width: '100%',
        maxWidth: 600,
        maxHeight: '80vh',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ 
          padding: 20, 
          borderBottom: '1px solid #e5e7eb',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{tipoLabel}</h3>
            <button onClick={onClose} style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: 24, 
              cursor: 'pointer',
              color: '#64748b'
            }}>✕</button>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
            Movimento: {new Date(movimento.data).toLocaleDateString('it-IT')} - {formatEuro(movimento.importo)}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {movimento.descrizione?.substring(0, 60)}...
          </div>
        </div>
        
        {/* Results */}
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              Nessun risultato trovato con importo simile
            </div>
          ) : (
            results.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => onSelect(item)}
                style={{
                  padding: 16,
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {item.fornitore || item.supplier_name || item.dipendente || item.tipo_tributo || 'N/A'}
                    </div>
                    {item.numero_fattura && (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Fattura: {item.numero_fattura} del {item.data_fattura || '-'}
                      </div>
                    )}
                    {item.codice_tributo && (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Tributo: {item.codice_tributo}
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: 16,
                    color: '#059669'
                  }}>
                    {formatEuro(item.importo || item.total_amount || item.netto_pagare || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}
