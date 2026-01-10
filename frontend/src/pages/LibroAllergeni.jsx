import React, { useState, useEffect, useRef } from 'react';
import { useResponsive } from '../hooks/useResponsive';

const API = '';

// Area di stampa PDF (non responsive - formato fisso per stampa)
const PrintableLibro = React.forwardRef(({ libro, azienda, indirizzo, dataGenerazione }, ref) => (
  <div ref={ref} style={{ padding: 40, fontFamily: 'Arial, sans-serif', background: 'white' }}>
    {/* Intestazione */}
    <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '3px solid #f59e0b', paddingBottom: 20 }}>
      <h1 style={{ margin: 0, fontSize: 28, color: '#1f2937' }}>📋 LIBRO DEGLI ALLERGENI</h1>
      <p style={{ margin: '10px 0 0 0', fontSize: 14, color: '#6b7280' }}>
        Reg. UE 1169/2011 - Informazioni alimentari ai consumatori
      </p>
    </div>
    
    {/* Info Azienda */}
    <div style={{ marginBottom: 30, padding: 16, background: '#fef3c7', borderRadius: 8 }}>
      <p style={{ margin: 0, fontWeight: 'bold', fontSize: 16 }}>{azienda}</p>
      <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>{indirizzo}</p>
      <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#6b7280' }}>
        Data generazione: {new Date(dataGenerazione).toLocaleDateString('it-IT')}
      </p>
    </div>
    
    {/* Tabella */}
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
      <thead>
        <tr style={{ background: '#f59e0b', color: 'white' }}>
          <th style={{ padding: 12, textAlign: 'left', border: '1px solid #d97706' }}>INGREDIENTE</th>
          <th style={{ padding: 12, textAlign: 'left', border: '1px solid #d97706' }}>ALLERGENI PRESENTI</th>
        </tr>
      </thead>
      <tbody>
        {libro.filter(v => v.allergeni.length > 0).map((voce, idx) => (
          <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#fffbeb' }}>
            <td style={{ padding: 10, border: '1px solid #e5e7eb', fontWeight: 500 }}>
              {voce.ingrediente}
            </td>
            <td style={{ padding: 10, border: '1px solid #e5e7eb' }}>
              <strong style={{ color: '#dc2626' }}>
                {voce.allergeni_dettaglio.map(a => `${a.icona} ${a.nome}`).join(', ')}
              </strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    
    {/* Legenda */}
    <div style={{ marginTop: 30, padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>LEGENDA - 14 ALLERGENI OBBLIGATORI (Reg. UE 1169/2011)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
        <span>🌾 Glutine</span>
        <span>🦐 Crostacei</span>
        <span>🥚 Uova</span>
        <span>🐟 Pesce</span>
        <span>🥜 Arachidi</span>
        <span>🫘 Soia</span>
        <span>🥛 Latte</span>
        <span>🌰 Frutta a guscio</span>
        <span>🥬 Sedano</span>
        <span>🟡 Senape</span>
        <span>⚪ Semi di sesamo</span>
        <span>🍷 Solfiti</span>
        <span>🫛 Lupini</span>
        <span>🦪 Molluschi</span>
      </div>
    </div>
    
    {/* Footer */}
    <div style={{ marginTop: 30, textAlign: 'center', fontSize: 10, color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
      <p>Il presente documento elenca gli allergeni presenti nei prodotti. Per informazioni dettagliate, rivolgersi al personale.</p>
      <p style={{ fontWeight: 'bold' }}>DA ESPORRE IN MODO VISIBILE AI SENSI DEL REG. UE 1169/2011</p>
    </div>
  </div>
));

export default function LibroAllergeni() {
  const [libro, setLibro] = useState([]);
  const [allergeniUE, setAllergeniUE] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({});
  const [azienda, setAzienda] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [dataGenerazione, setDataGenerazione] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ingrediente: '', allergeni: [], note: '' });
  const printRef = useRef();

  useEffect(() => {
    loadAllergeniUE();
    loadLibro();
  }, []);

  async function loadAllergeniUE() {
    try {
      const res = await fetch(`${API}/api/haccp-v2/allergeni/elenco`);
      const data = await res.json();
      setAllergeniUE(data.allergeni || {});
    } catch (err) {
      console.error('Errore:', err);
    }
  }

  async function loadLibro() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/haccp-v2/allergeni/libro`);
      const data = await res.json();
      setLibro(data.libro_allergeni || []);
      setStats(data.statistiche_allergeni || {});
      setAzienda(data.azienda || '');
      setIndirizzo(data.indirizzo || '');
      setDataGenerazione(data.data_generazione || '');
    } catch (err) {
      console.error('Errore:', err);
    }
    setLoading(false);
  }

  async function handleAddVoce(e) {
    e.preventDefault();
    if (!form.ingrediente) return;

    try {
      const res = await fetch(`${API}/api/haccp-v2/allergeni/libro/voce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingrediente: form.ingrediente,
          allergeni: form.allergeni,
          note: form.note,
          ricette_collegate: []
        })
      });

      if (res.ok) {
        setShowModal(false);
        setForm({ ingrediente: '', allergeni: [], note: '' });
        loadLibro();
      } else {
        const err = await res.json();
        alert(err.detail || 'Errore');
      }
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  }

  async function handleDeleteVoce(voceId) {
    if (!window.confirm('Eliminare questa voce?')) return;
    try {
      await fetch(`${API}/api/haccp-v2/allergeni/libro/voce/${voceId}`, { method: 'DELETE' });
      loadLibro();
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  }

  function handlePrint() {
    const content = printRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Libro Allergeni - ${azienda}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>${content.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function toggleAllergene(codice) {
    setForm(prev => ({
      ...prev,
      allergeni: prev.allergeni.includes(codice)
        ? prev.allergeni.filter(a => a !== codice)
        : [...prev.allergeni, codice]
    }));
  }

  const libroFiltrato = libro.filter(v =>
    v.ingrediente.toLowerCase().includes(search.toLowerCase()) ||
    v.allergeni_dettaglio.some(a => a.nome.toLowerCase().includes(search.toLowerCase()))
  );

  const ingredientiConAllergeni = libro.filter(v => v.allergeni.length > 0).length;

  const { isMobile, isTablet, device } = useResponsive();

  // Stili responsive
  const s = {
    page: { 
      padding: isMobile ? 12 : isTablet ? 16 : 24, 
      maxWidth: 1200, 
      margin: '0 auto', 
      background: '#f8fafc', 
      minHeight: '100vh' 
    },
    header: { 
      padding: isMobile ? '16px 12px' : '20px 24px', 
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
      borderRadius: 12, 
      color: 'white',
      marginBottom: isMobile ? 16 : 24
    },
    headerContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 16
    },
    title: { 
      margin: 0, 
      fontSize: isMobile ? 18 : isTablet ? 20 : 24, 
      fontWeight: 'bold', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8 
    },
    subtitle: { 
      margin: '8px 0 0 0', 
      opacity: 0.9, 
      fontSize: isMobile ? 12 : 14 
    },
    headerButtons: { 
      display: 'flex', 
      gap: isMobile ? 8 : 12,
      flexWrap: 'wrap'
    },
    btnPrimary: { 
      padding: isMobile ? '8px 12px' : '10px 20px', 
      background: 'white', 
      color: '#f59e0b', 
      border: 'none', 
      borderRadius: 8, 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      fontSize: isMobile ? 12 : 14 
    },
    btnSecondary: { 
      padding: isMobile ? '8px 12px' : '10px 20px', 
      background: '#e5e7eb', 
      color: '#374151', 
      border: 'none', 
      borderRadius: 8, 
      cursor: 'pointer', 
      fontWeight: '600', 
      fontSize: isMobile ? 12 : 14 
    },
    btnSuccess: { 
      padding: isMobile ? '8px 12px' : '10px 20px', 
      background: '#16a34a', 
      color: 'white', 
      border: 'none', 
      borderRadius: 8, 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      fontSize: isMobile ? 12 : 14 
    },
    statsGrid: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
      gap: isMobile ? 10 : 16, 
      marginBottom: isMobile ? 16 : 24 
    },
    card: { 
      background: 'white', 
      borderRadius: 12, 
      padding: isMobile ? 12 : 20, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
      marginBottom: isMobile ? 12 : 16 
    },
    statLabel: { 
      margin: 0, 
      fontSize: isMobile ? 10 : 12, 
      color: '#6b7280', 
      textTransform: 'uppercase' 
    },
    statValue: { 
      margin: '8px 0 0 0', 
      fontSize: isMobile ? 22 : 28, 
      fontWeight: 'bold' 
    },
    filterRow: { 
      display: 'flex', 
      gap: isMobile ? 8 : 16, 
      alignItems: 'center',
      flexDirection: isMobile ? 'column' : 'row'
    },
    input: { 
      padding: isMobile ? '8px 10px' : '10px 12px', 
      borderRadius: 8, 
      border: '2px solid #e5e7eb', 
      fontSize: 14, 
      width: '100%', 
      boxSizing: 'border-box',
      maxWidth: isMobile ? '100%' : 400
    },
    tableContainer: { 
      overflowX: 'auto', 
      WebkitOverflowScrolling: 'touch',
      margin: isMobile ? '0 -12px' : 0,
      padding: isMobile ? '0 12px' : 0
    },
    table: { 
      width: '100%', 
      borderCollapse: 'collapse', 
      fontSize: isMobile ? 11 : isTablet ? 12 : 14,
      minWidth: isMobile ? 500 : 'auto'
    },
    th: { 
      padding: isMobile ? '8px 6px' : '12px 16px', 
      textAlign: 'left', 
      borderBottom: '2px solid #e5e7eb', 
      background: '#fef3c7', 
      fontWeight: 600 
    },
    td: { 
      padding: isMobile ? '8px 6px' : '12px 16px', 
      borderBottom: '1px solid #f3f4f6' 
    },
    badge: { 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 4, 
      padding: isMobile ? '3px 6px' : '4px 10px', 
      background: '#fef3c7', 
      color: '#92400e', 
      borderRadius: 20, 
      fontSize: isMobile ? 10 : 12, 
      fontWeight: 600,
      marginRight: 4,
      marginBottom: 4
    },
    modalOverlay: {
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
      padding: isMobile ? 12 : 24
    },
    modalContent: { 
      background: 'white', 
      borderRadius: 16, 
      padding: isMobile ? 16 : 24, 
      width: isMobile ? '100%' : '90%',
      maxWidth: 500, 
      maxHeight: '90vh', 
      overflow: 'auto' 
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerContent}>
          <div>
            <h1 style={s.title}>📋 Libro degli Allergeni</h1>
            <p style={s.subtitle}>{azienda} • Reg. UE 1169/2011</p>
          </div>
          <div style={s.headerButtons}>
            <button onClick={() => setShowModal(true)} style={s.btnPrimary}>
              {isMobile ? '➕' : '➕ Aggiungi Voce'}
            </button>
            <button onClick={handlePrint} style={s.btnPrimary} data-testid="btn-stampa">
              {isMobile ? '🖨️' : '🖨️ Stampa PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistiche */}
      <div style={s.statsGrid}>
        <div style={{ ...s.card, borderLeft: '4px solid #f59e0b' }}>
          <p style={s.statLabel}>Ingredienti Totali</p>
          <p style={{ ...s.statValue, color: '#1f2937' }}>{libro.length}</p>
        </div>
        <div style={{ ...s.card, borderLeft: '4px solid #dc2626' }}>
          <p style={s.statLabel}>Con Allergeni</p>
          <p style={{ ...s.statValue, color: '#dc2626' }}>{ingredientiConAllergeni}</p>
        </div>
        {!isMobile && (
          <div style={{ ...s.card, borderLeft: '4px solid #16a34a' }}>
            <p style={s.statLabel}>Allergeni Rilevati</p>
            <p style={{ ...s.statValue, color: '#16a34a' }}>{Object.keys(stats).length}</p>
          </div>
        )}
      </div>

      {/* Ricerca */}
      <div style={{ ...s.card, ...s.filterRow }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.input}
          placeholder="🔍 Cerca ingrediente o allergene..."
          data-testid="search-allergeni"
        />
        <button onClick={loadLibro} style={s.btnSecondary}>🔄 {!isMobile && 'Aggiorna'}</button>
      </div>

      {/* Legenda Allergeni */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? 12 : 14, fontWeight: 600 }}>⚠️ 14 Allergeni Obbligatori UE</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 4 : 8 }}>
          {Object.entries(allergeniUE).map(([codice, info]) => (
            <span key={codice} style={{
              ...s.badge,
              background: stats[codice] ? '#fef3c7' : '#f3f4f6',
              color: stats[codice] ? '#92400e' : '#9ca3af'
            }}>
              {info.icona} {!isMobile && info.nome} {stats[codice] ? `(${stats[codice]})` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Tabella Libro */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: isMobile ? 14 : 16, fontWeight: 600 }}>📖 Elenco Ingredienti e Allergeni</h3>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: isMobile ? 20 : 40, color: '#6b7280' }}>⏳ Caricamento...</p>
        ) : libroFiltrato.length === 0 ? (
          <p style={{ textAlign: 'center', padding: isMobile ? 20 : 40, color: '#6b7280' }}>Nessun ingrediente trovato</p>
        ) : (
          <div style={s.tableContainer}>
            <table style={s.table} data-testid="tabella-allergeni">
              <thead>
                <tr>
                  <th style={s.th}>Ingrediente</th>
                  <th style={s.th}>Allergeni</th>
                  {!isMobile && <th style={s.th}>Presente in</th>}
                  <th style={{ ...s.th, width: isMobile ? 50 : 80 }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {libroFiltrato.map((voce, idx) => (
                  <tr key={idx} style={{ background: voce.allergeni.length > 0 ? '#fffbeb' : 'white' }}>
                    <td style={s.td}>
                      <strong style={{ fontSize: isMobile ? 11 : 'inherit' }}>{voce.ingrediente}</strong>
                      {voce.manuale && <span style={{ marginLeft: 4, fontSize: 9, color: '#6b7280' }}>(M)</span>}
                    </td>
                    <td style={s.td}>
                      {voce.allergeni_dettaglio.length > 0 ? (
                        voce.allergeni_dettaglio.map((a, i) => (
                          <span key={i} style={s.badge}>
                            {a.icona} {!isMobile && a.nome}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: isMobile ? 10 : 12 }}>-</span>
                      )}
                    </td>
                    {!isMobile && (
                      <td style={s.td}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>
                          {voce.ricette_collegate.slice(0, 3).join(', ')}
                          {voce.ricette_collegate.length > 3 && ` +${voce.ricette_collegate.length - 3}`}
                        </span>
                      </td>
                    )}
                    <td style={s.td}>
                      {voce.manuale && (
                        <button
                          onClick={() => handleDeleteVoce(voce.id)}
                          style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Area di stampa nascosta */}
      <div style={{ display: 'none' }}>
        <PrintableLibro
          ref={printRef}
          libro={libro}
          azienda={azienda}
          indirizzo={indirizzo}
          dataGenerazione={dataGenerazione}
        />
      </div>

      {/* Modale Aggiungi Voce */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>➕ Aggiungi Ingrediente</h2>
            
            <form onSubmit={handleAddVoce}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  Nome Ingrediente *
                </label>
                <input
                  type="text"
                  value={form.ingrediente}
                  onChange={(e) => setForm({ ...form, ingrediente: e.target.value })}
                  style={styles.input}
                  placeholder="Es: Farina di grano"
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  Allergeni Contenuti
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(allergeniUE).map(([codice, info]) => (
                    <button
                      key={codice}
                      type="button"
                      onClick={() => toggleAllergene(codice)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        background: form.allergeni.includes(codice) ? '#fef3c7' : '#f3f4f6',
                        color: form.allergeni.includes(codice) ? '#92400e' : '#6b7280'
                      }}
                    >
                      {info.icona} {info.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  Note
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  style={{ ...styles.input, minHeight: 60, resize: 'vertical' }}
                  placeholder="Note aggiuntive..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={styles.btnSecondary}>
                  Annulla
                </button>
                <button type="submit" style={styles.btnSuccess}>
                  ✓ Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
