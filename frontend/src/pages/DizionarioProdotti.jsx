import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAnnoGlobale } from '../contexts/AnnoContext';
import { Package, Search, AlertTriangle, Check, RefreshCw, Edit2, Save, X, ChevronDown, ChevronUp, Database, Scale } from 'lucide-react';

export default function DizionarioProdotti() {
  const { anno } = useAnnoGlobale();
  const [prodotti, setProdotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [soloSenzaPeso, setSoloSenzaPeso] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  // Stato per modifica peso
  const [editingProdotto, setEditingProdotto] = useState(null);
  const [newPesoGrammi, setNewPesoGrammi] = useState('');
  const [newUnitaPeso, setNewUnitaPeso] = useState('g');
  const [saving, setSaving] = useState(false);
  
  // Paginazione
  const [limit, setLimit] = useState(50);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadStats();
    loadProdotti();
  }, [search, soloSenzaPeso, limit]);

  async function loadStats() {
    try {
      const res = await api.get('/api/dizionario-prodotti/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Errore caricamento stats:', e);
    }
  }

  async function loadProdotti() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (soloSenzaPeso) params.append('solo_senza_peso', 'true');
      params.append('limit', showAll ? '500' : limit.toString());
      
      const res = await api.get(`/api/dizionario-prodotti/prodotti?${params.toString()}`);
      setProdotti(res.data.prodotti || []);
    } catch (e) {
      console.error('Errore caricamento prodotti:', e);
    }
    setLoading(false);
  }

  async function scanFatture() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.post(`/api/dizionario-prodotti/prodotti/scan-fatture?anno=${anno}`);
      setScanResult(res.data);
      loadStats();
      loadProdotti();
    } catch (e) {
      console.error('Errore scan:', e);
      setScanResult({ error: e.message });
    }
    setScanning(false);
  }

  async function updatePeso(prodottoId) {
    if (!newPesoGrammi || parseFloat(newPesoGrammi) <= 0) {
      alert('Inserisci un peso valido');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/api/dizionario-prodotti/prodotti/${prodottoId}/peso`, {
        peso_grammi: parseFloat(newPesoGrammi),
        unita_peso: newUnitaPeso
      });
      setEditingProdotto(null);
      setNewPesoGrammi('');
      loadProdotti();
      loadStats();
    } catch (e) {
      alert('Errore aggiornamento peso: ' + (e.response?.data?.detail || e.message));
    }
    setSaving(false);
  }

  function openEditPeso(prodotto) {
    setEditingProdotto(prodotto.id);
    setNewPesoGrammi(prodotto.peso_grammi || '');
    setNewUnitaPeso(prodotto.unita_peso || 'g');
  }

  function formatPrezzo(prezzo) {
    if (prezzo === null || prezzo === undefined) return 'N/D';
    return `€${prezzo.toFixed(2)}`;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={32} />
          Dizionario Prodotti
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Gestione prodotti estratti dalle fatture per il calcolo del Food Cost
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>TOTALE PRODOTTI</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>{stats.totale_prodotti?.toLocaleString()}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>CON PREZZO/KG</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{stats.con_prezzo_al_kg?.toLocaleString()}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>SENZA PESO</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{stats.senza_peso?.toLocaleString()}</div>
          </div>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>COMPLETEZZA</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: stats.completezza_percentuale > 50 ? '#10b981' : '#f59e0b' }}>
              {stats.completezza_percentuale}%
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={scanFatture}
          disabled={scanning}
          style={{
            padding: '12px 24px',
            background: scanning ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: scanning ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          data-testid="scan-fatture-btn"
        >
          <RefreshCw size={18} className={scanning ? 'animate-spin' : ''} style={scanning ? { animation: 'spin 1s linear infinite' } : {}} />
          {scanning ? 'Scansione in corso...' : `Scansiona Fatture ${anno}`}
        </button>
        
        <div style={{ flex: 1 }} />
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={soloSenzaPeso}
            onChange={(e) => setSoloSenzaPeso(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>Solo prodotti senza peso</span>
        </label>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          borderRadius: '12px',
          background: scanResult.error ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${scanResult.error ? '#fecaca' : '#86efac'}`
        }}>
          {scanResult.error ? (
            <div style={{ color: '#dc2626' }}>Errore: {scanResult.error}</div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: '#15803d', marginBottom: '8px' }}>
                <Check size={18} style={{ display: 'inline', marginRight: '8px' }} />
                Scansione completata!
              </div>
              <div style={{ fontSize: '14px', color: '#166534' }}>
                Fatture analizzate: <strong>{scanResult.fatture_analizzate}</strong> • 
                Prodotti aggiunti: <strong>{scanResult.prodotti_aggiunti}</strong> • 
                Prodotti aggiornati: <strong>{scanResult.prodotti_aggiornati}</strong>
                {scanResult.prodotti_senza_peso > 0 && (
                  <span style={{ color: '#f59e0b' }}> • Senza peso: <strong>{scanResult.prodotti_senza_peso}</strong></span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtri */}
      <div style={{ 
        background: '#f8fafc', 
        padding: '16px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Cerca prodotto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
            data-testid="search-prodotti"
          />
        </div>
      </div>

      {/* Lista Prodotti */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Caricamento...</div>
      ) : prodotti.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '12px' }}>
          <Package size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <h3 style={{ color: '#64748b', margin: '0 0 8px 0' }}>Nessun prodotto trovato</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            {soloSenzaPeso ? 'Tutti i prodotti hanno già un peso assegnato' : 'Esegui una scansione delle fatture per popolare il dizionario'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>PRODOTTO</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>FORNITORE</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>PESO</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>PREZZO/KG</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>ULTIMO PREZZO</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>AZIONI</th>
              </tr>
            </thead>
            <tbody>
              {prodotti.map((prodotto, idx) => (
                <tr key={prodotto.id} style={{ borderBottom: idx < prodotti.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '13px' }}>{prodotto.descrizione}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      Acquisti: {prodotto.conteggio_acquisti || 1}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{prodotto.fornitore_nome || 'N/D'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {editingProdotto === prodotto.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        <input
                          type="number"
                          value={newPesoGrammi}
                          onChange={(e) => setNewPesoGrammi(e.target.value)}
                          placeholder="Peso"
                          style={{ width: '80px', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}
                          autoFocus
                        />
                        <select
                          value={newUnitaPeso}
                          onChange={(e) => setNewUnitaPeso(e.target.value)}
                          style={{ padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="l">l</option>
                          <option value="ml">ml</option>
                        </select>
                        <button
                          onClick={() => updatePeso(prodotto.id)}
                          disabled={saving}
                          style={{ padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingProdotto(null)}
                          style={{ padding: '6px', background: '#f3f4f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        {prodotto.peso_grammi ? (
                          <span style={{ 
                            padding: '4px 10px', 
                            background: prodotto.peso_confermato ? '#dcfce7' : '#f1f5f9', 
                            borderRadius: '6px', 
                            fontSize: '12px',
                            color: prodotto.peso_confermato ? '#15803d' : '#64748b'
                          }}>
                            {prodotto.peso_grammi >= 1000 
                              ? `${(prodotto.peso_grammi / 1000).toFixed(2)} kg`
                              : `${prodotto.peso_grammi} ${prodotto.unita_peso || 'g'}`
                            }
                            {prodotto.peso_confermato && <Check size={12} style={{ marginLeft: '4px', display: 'inline' }} />}
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                            <AlertTriangle size={12} style={{ marginRight: '4px', display: 'inline' }} />
                            Mancante
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: prodotto.prezzo_per_kg ? '#1e293b' : '#94a3b8',
                      fontSize: '14px'
                    }}>
                      {prodotto.prezzo_per_kg ? `€${prodotto.prezzo_per_kg.toFixed(2)}` : 'N/D'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {formatPrezzo(prodotto.ultimo_prezzo_unitario)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {prodotto.ultima_fattura_data || ''}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {!prodotto.peso_grammi && editingProdotto !== prodotto.id && (
                      <button
                        onClick={() => openEditPeso(prodotto)}
                        style={{
                          padding: '6px 12px',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        data-testid={`edit-peso-${prodotto.id}`}
                      >
                        <Scale size={14} />
                        Imposta Peso
                      </button>
                    )}
                    {prodotto.peso_grammi && !prodotto.peso_confermato && editingProdotto !== prodotto.id && (
                      <button
                        onClick={() => openEditPeso(prodotto)}
                        style={{
                          padding: '6px 12px',
                          background: '#f3f4f6',
                          color: '#64748b',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit2 size={14} />
                        Modifica
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Load More */}
          {prodotti.length >= limit && !showAll && (
            <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setShowAll(true)}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ChevronDown size={16} />
                Mostra altri prodotti
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS per animazione spin */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
