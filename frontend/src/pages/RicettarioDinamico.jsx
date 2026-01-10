import React, { useState, useEffect } from 'react';

const API = '';

// Stili comuni
const styles = {
  page: { padding: 24, maxWidth: 1600, margin: '0 auto', background: '#f8fafc', minHeight: '100vh' },
  header: { 
    padding: '20px 24px', 
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
    borderRadius: 12, 
    color: 'white',
    marginBottom: 24
  },
  card: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 },
  btnPrimary: { padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 },
  btnSecondary: { padding: '10px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 },
  btnDanger: { padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 },
  input: { padding: '10px 12px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  select: { padding: '10px 12px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 14, background: 'white', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 },
  badge: (color) => ({
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: color === 'green' ? '#dcfce7' : color === 'yellow' ? '#fef3c7' : color === 'red' ? '#fee2e2' : '#f3f4f6',
    color: color === 'green' ? '#16a34a' : color === 'yellow' ? '#d97706' : color === 'red' ? '#dc2626' : '#6b7280'
  }),
  ingredientRow: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8, 
    padding: '8px 12px', 
    background: '#f9fafb', 
    borderRadius: 8,
    marginBottom: 6
  },
  traceLink: {
    fontSize: 11,
    color: '#3b82f6',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
};

export default function RicettarioDinamico() {
  const [ricette, setRicette] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorie, setCategorie] = useState([]);
  const [selectedRicetta, setSelectedRicetta] = useState(null);
  const [tracciabilita, setTracciabilita] = useState(null);
  const [stats, setStats] = useState({ totale: 0 });

  useEffect(() => {
    loadRicette();
  }, [search, categoria]);

  async function loadRicette() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoria) params.append('categoria', categoria);
      
      const res = await fetch(`${API}/api/haccp-v2/ricettario?${params}`);
      const data = await res.json();
      setRicette(data.ricette || []);
      setCategorie(data.categorie || []);
      setStats({ totale: data.totale || 0 });
    } catch (err) {
      console.error('Errore caricamento ricette:', err);
    }
    setLoading(false);
  }

  async function loadDettaglio(ricettaId) {
    try {
      const res = await fetch(`${API}/api/haccp-v2/ricettario/${ricettaId}`);
      const data = await res.json();
      setSelectedRicetta(data);
    } catch (err) {
      console.error('Errore caricamento dettaglio:', err);
    }
  }

  async function loadTracciabilita(ricettaId) {
    try {
      const res = await fetch(`${API}/api/haccp-v2/ricettario/tracciabilita/${ricettaId}`);
      const data = await res.json();
      setTracciabilita(data);
    } catch (err) {
      console.error('Errore caricamento tracciabilità:', err);
    }
  }

  function formatEuro(val) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return dateStr;
    }
  }

  function getMarginColor(margine) {
    if (margine >= 60) return 'green';
    if (margine >= 40) return 'yellow';
    return 'red';
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
              📖 Ricettario Dinamico HACCP
            </h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: 14 }}>
              Tracciabilità ingredienti collegati alle fatture XML • {stats.totale} ricette
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={loadRicette} style={{ ...styles.btnPrimary, background: 'white', color: '#059669' }}>
              🔄 Aggiorna
            </button>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ ...styles.card, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="🔍 Cerca ricetta..."
            data-testid="search-ricette"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          style={{ ...styles.select, minWidth: 150 }}
        >
          <option value="">📁 Tutte le categorie</option>
          {categorie.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Contenuto principale */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedRicetta ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Lista ricette */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>📋 Ricette</h3>
          
          {loading ? (
            <div style={styles.card}>
              <p style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>⏳ Caricamento...</p>
            </div>
          ) : ricette.length === 0 ? (
            <div style={styles.card}>
              <p style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                Nessuna ricetta trovata
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {ricette.map(ricetta => (
                <div 
                  key={ricetta.id} 
                  style={{ 
                    ...styles.card, 
                    cursor: 'pointer',
                    border: selectedRicetta?.id === ricetta.id ? '2px solid #059669' : '2px solid transparent',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => {
                    loadDettaglio(ricetta.id);
                    loadTracciabilita(ricetta.id);
                  }}
                  data-testid={`ricetta-card-${ricetta.id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{ricetta.nome}</h4>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{ricetta.categoria}</span>
                    </div>
                    {ricetta.margine !== undefined && (
                      <span style={styles.badge(getMarginColor(ricetta.margine))}>
                        {ricetta.margine}% margine
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Food Cost</p>
                      <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#dc2626' }}>
                        {formatEuro(ricetta.food_cost)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Prezzo Vendita</p>
                      <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#059669' }}>
                        {formatEuro(ricetta.prezzo_vendita)}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                      🥣 {(ricetta.ingredienti || []).length} ingredienti • 
                      🍽️ {ricetta.porzioni || 1} porzioni
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio ricetta selezionata */}
        {selectedRicetta && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                📝 {selectedRicetta.nome}
              </h3>
              <button onClick={() => setSelectedRicetta(null)} style={styles.btnSecondary}>
                ✕ Chiudi
              </button>
            </div>

            {/* Info principali */}
            <div style={{ ...styles.card, background: '#f0fdf4' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Food Cost Totale</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 20, fontWeight: 'bold', color: '#dc2626' }}>
                    {formatEuro(selectedRicetta.food_cost)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Food Cost/Porzione</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 20, fontWeight: 'bold', color: '#d97706' }}>
                    {formatEuro(selectedRicetta.food_cost_per_porzione)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Margine</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                    {selectedRicetta.margine || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Ingredienti con tracciabilità */}
            <div style={styles.card}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600 }}>
                🥣 Ingredienti con Tracciabilità XML
              </h4>
              
              {(selectedRicetta.ingredienti || []).map((ing, idx) => (
                <div key={idx} style={styles.ingredientRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{ing.nome}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {ing.quantita} {ing.unita}
                      </span>
                      {ing.fattura_id ? (
                        <span style={styles.badge('green')}>✓ Tracciato</span>
                      ) : (
                        <span style={styles.badge('yellow')}>⚠️ Non tracciato</span>
                      )}
                    </div>
                    
                    {ing.fattura_id && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                        <span>📄 Fatt. {ing.fattura_numero || '-'}</span>
                        <span style={{ margin: '0 8px' }}>|</span>
                        <span>🏢 {ing.fornitore || '-'}</span>
                        <span style={{ margin: '0 8px' }}>|</span>
                        <span>📦 Lotto: {ing.lotto_interno || ing.lotto_fornitore || '-'}</span>
                        <span style={{ margin: '0 8px' }}>|</span>
                        <span style={{ color: '#dc2626' }}>⏰ Scad: {formatDate(ing.scadenza)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
                      {formatEuro(ing.costo_unitario * ing.quantita)}
                    </span>
                    <br />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      @ {formatEuro(ing.costo_unitario)}/{ing.unita}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tracciabilità */}
            {tracciabilita && (
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    🔗 Report Tracciabilità
                  </h4>
                  <span style={styles.badge(tracciabilita.percentuale_tracciabilita >= 80 ? 'green' : 'yellow')}>
                    {tracciabilita.percentuale_tracciabilita}% tracciabile
                  </span>
                </div>
                
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                  📅 Report generato: {formatDate(tracciabilita.data_report)}
                </p>
                
                <div style={{ marginTop: 12 }}>
                  {tracciabilita.ingredienti?.map((ing, idx) => (
                    <div key={idx} style={{ 
                      padding: '8px 12px', 
                      background: ing.tracciabile ? '#f0fdf4' : '#fef3c7',
                      borderRadius: 6,
                      marginBottom: 6
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{ing.nome}</span>
                        {ing.tracciabile ? (
                          <span style={{ color: '#16a34a', fontSize: 12 }}>✓ Tracciabile</span>
                        ) : (
                          <span style={{ color: '#d97706', fontSize: 12 }}>⚠️ Non tracciabile</span>
                        )}
                      </div>
                      {ing.tracciabile && ing.dettagli && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                          Fattura: {ing.dettagli.fattura?.numero} del {formatDate(ing.dettagli.fattura?.data)} • 
                          Fornitore: {ing.dettagli.fornitore?.nome} • 
                          Lotto: {ing.dettagli.lotto?.interno || ing.dettagli.lotto?.fornitore}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergeni e Note HACCP */}
            {(selectedRicetta.allergeni?.length > 0 || selectedRicetta.note_haccp) && (
              <div style={styles.card}>
                {selectedRicetta.allergeni?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>⚠️ Allergeni</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selectedRicetta.allergeni.map(all => (
                        <span key={all} style={{ ...styles.badge('red'), fontSize: 12 }}>{all}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedRicetta.note_haccp && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600 }}>📋 Note HACCP</h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                      {selectedRicetta.note_haccp}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
