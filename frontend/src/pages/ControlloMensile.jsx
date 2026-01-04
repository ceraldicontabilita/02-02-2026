import React, { useState, useEffect } from 'react';
import api from '../api';

/**
 * ControlloMensile - Pagina per confrontare i dati POS automatici vs manuali
 * e verificare le chiusure giornaliere
 */
export default function ControlloMensile() {
  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Data from API
  const [bancaMovements, setBancaMovements] = useState([]);
  const [cassaMovements, setCassaMovements] = useState([]);
  const [corrispettiviXML, setCorrispettiviXML] = useState([]);
  
  // Processed comparison data
  const [dailyComparison, setDailyComparison] = useState([]);
  const [totals, setTotals] = useState({
    posAuto: 0,
    posManual: 0,
    corrispettiviAuto: 0,
    corrispettiviManual: 0,
    versamenti: 0
  });

  useEffect(() => {
    loadData();
  }, [mese]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [year, month] = mese.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      const params = new URLSearchParams({
        data_da: startDate,
        data_a: endDate
      });

      const [bancaRes, cassaRes, corrispRes] = await Promise.all([
        api.get(`/api/prima-nota/banca?${params}`),
        api.get(`/api/prima-nota/cassa?${params}`),
        api.get(`/api/corrispettivi?data_da=${startDate}&data_a=${endDate}`)
      ]);

      setBancaMovements(bancaRes.data.movimenti || []);
      setCassaMovements(cassaRes.data.movimenti || []);
      setCorrispettiviXML(corrispRes.data.corrispettivi || corrispRes.data || []);
      
      // Process data into daily comparison
      processComparison(
        bancaRes.data.movimenti || [],
        cassaRes.data.movimenti || [],
        corrispRes.data.corrispettivi || corrispRes.data || [],
        year,
        month
      );
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processComparison = (banca, cassa, corrispettivi, year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const comparison = [];
    
    let totalPosAuto = 0;
    let totalPosManual = 0;
    let totalCorrispAuto = 0;
    let totalCorrispManual = 0;
    let totalVersamenti = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
      const dayData = { date: dateStr, day };

      // POS from Banca (automatic from XML or bank imports)
      const posAutoMovements = banca.filter(m => 
        m.data?.startsWith(dateStr) && 
        (m.categoria?.toLowerCase().includes('pos') || m.descrizione?.toLowerCase().includes('incasso pos')) &&
        m.source !== 'manual_pos'
      );
      dayData.posAuto = posAutoMovements.reduce((sum, m) => sum + (m.importo || 0), 0);
      totalPosAuto += dayData.posAuto;

      // POS from Banca (manual entry)
      const posManualMovements = banca.filter(m => 
        m.data?.startsWith(dateStr) && 
        m.source === 'manual_pos'
      );
      dayData.posManual = posManualMovements.reduce((sum, m) => sum + (m.importo || 0), 0);
      dayData.posDetails = posManualMovements.length > 0 ? posManualMovements[0].pos_details : null;
      totalPosManual += dayData.posManual;

      // Corrispettivi from XML imports
      const corrispAuto = corrispettivi.filter(c => 
        c.data?.startsWith(dateStr) || c.data_ora?.startsWith(dateStr)
      );
      dayData.corrispettivoAuto = corrispAuto.reduce((sum, c) => 
        sum + (c.ammontare_vendite || c.importo || 0), 0
      );
      totalCorrispAuto += dayData.corrispettivoAuto;

      // Corrispettivi from manual entry (Cassa)
      const corrispManualMovements = cassa.filter(m => 
        m.data?.startsWith(dateStr) && 
        m.categoria === 'Corrispettivi' &&
        m.source === 'manual_entry'
      );
      dayData.corrispettivoManual = corrispManualMovements.reduce((sum, m) => sum + (m.importo || 0), 0);
      totalCorrispManual += dayData.corrispettivoManual;

      // Versamenti (from manual entry)
      const versamentiMovements = cassa.filter(m => 
        m.data?.startsWith(dateStr) && 
        m.categoria === 'Versamento' &&
        m.tipo === 'uscita'
      );
      dayData.versamento = versamentiMovements.reduce((sum, m) => sum + (m.importo || 0), 0);
      totalVersamenti += dayData.versamento;

      // Calculate differences
      dayData.posDiff = dayData.posAuto - dayData.posManual;
      dayData.corrispettivoDiff = dayData.corrispettivoAuto - dayData.corrispettivoManual;

      // Status indicators
      dayData.hasData = dayData.posAuto > 0 || dayData.posManual > 0 || 
                        dayData.corrispettivoAuto > 0 || dayData.corrispettivoManual > 0;
      dayData.hasDiscrepancy = Math.abs(dayData.posDiff) > 1 || Math.abs(dayData.corrispettivoDiff) > 1;

      comparison.push(dayData);
    }

    setDailyComparison(comparison);
    setTotals({
      posAuto: totalPosAuto,
      posManual: totalPosManual,
      corrispettiviAuto: totalCorrispAuto,
      corrispettiviManual: totalCorrispManual,
      versamenti: totalVersamenti
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  };

  const getDiscrepancyClass = (value) => {
    if (Math.abs(value) < 1) return '';
    return value > 0 ? 'discrepancy-positive' : 'discrepancy-negative';
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const [year, month] = mese.split('-');
  const monthName = monthNames[parseInt(month) - 1];

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 data-testid="controllo-mensile-title" style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)' }}>
          📊 Controllo Mensile
        </h1>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          Confronto chiusure giornaliere - POS automatici vs manuali
        </p>
      </div>

      {/* Month Selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold' }}>Mese:</label>
        <input
          type="month"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 8, border: '2px solid #e0e0e0', fontSize: 16 }}
          data-testid="month-selector"
        />
        <span style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>
          📅 {monthName} {year}
        </span>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 15, 
        marginBottom: 25 
      }}>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>POS Automatici (XML)</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(totals.posAuto)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>POS Manuali</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(totals.posManual)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Corrispettivi Auto</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(totals.corrispettiviAuto)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Corrispettivi Manuali</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(totals.corrispettiviManual)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Versamenti</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(totals.versamenti)}</div>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {dailyComparison.some(d => d.hasDiscrepancy) && (
        <div style={{ 
          background: '#fef3c7', 
          border: '2px solid #f59e0b', 
          borderRadius: 8, 
          padding: 15, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <strong>Attenzione!</strong> Ci sono discrepanze tra i dati automatici e manuali in alcuni giorni.
            <br />
            <span style={{ fontSize: 12, color: '#92400e' }}>
              Le righe evidenziate in giallo/rosso richiedono verifica.
            </span>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} data-testid="comparison-table">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Data</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#dbeafe' }}>POS Auto</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#ede9fe' }}>POS Manuale</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Diff. POS</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#fef3c7' }}>Corrisp. Auto</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#d1fae5' }}>Corrisp. Man.</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Diff. Corr.</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#ecfdf5' }}>Versamento</th>
              <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>
                  ⏳ Caricamento dati...
                </td>
              </tr>
            ) : (
              dailyComparison.map((row) => (
                <tr 
                  key={row.date} 
                  style={{ 
                    background: row.hasDiscrepancy ? '#fef3c7' : (row.hasData ? 'white' : '#f9fafb'),
                    opacity: row.hasData ? 1 : 0.5
                  }}
                  data-testid={`row-${row.date}`}
                >
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', fontWeight: 500 }}>
                    {formatDate(row.date)}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#f0f9ff' }}>
                    {row.posAuto > 0 ? formatCurrency(row.posAuto) : '-'}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#faf5ff' }}>
                    {row.posManual > 0 ? (
                      <div>
                        {formatCurrency(row.posManual)}
                        {row.posDetails && (
                          <div style={{ fontSize: 10, color: '#666' }}>
                            P1:{row.posDetails.pos1} P2:{row.posDetails.pos2} P3:{row.posDetails.pos3}
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ 
                    padding: 10, 
                    borderBottom: '1px solid #e2e8f0', 
                    textAlign: 'right',
                    fontWeight: Math.abs(row.posDiff) > 1 ? 'bold' : 'normal',
                    color: Math.abs(row.posDiff) > 1 ? (row.posDiff > 0 ? '#16a34a' : '#dc2626') : '#666'
                  }}>
                    {Math.abs(row.posDiff) > 0.01 ? (
                      <span>{row.posDiff > 0 ? '+' : ''}{formatCurrency(row.posDiff)}</span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#fffbeb' }}>
                    {row.corrispettivoAuto > 0 ? formatCurrency(row.corrispettivoAuto) : '-'}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#ecfdf5' }}>
                    {row.corrispettivoManual > 0 ? formatCurrency(row.corrispettivoManual) : '-'}
                  </td>
                  <td style={{ 
                    padding: 10, 
                    borderBottom: '1px solid #e2e8f0', 
                    textAlign: 'right',
                    fontWeight: Math.abs(row.corrispettivoDiff) > 1 ? 'bold' : 'normal',
                    color: Math.abs(row.corrispettivoDiff) > 1 ? (row.corrispettivoDiff > 0 ? '#16a34a' : '#dc2626') : '#666'
                  }}>
                    {Math.abs(row.corrispettivoDiff) > 0.01 ? (
                      <span>{row.corrispettivoDiff > 0 ? '+' : ''}{formatCurrency(row.corrispettivoDiff)}</span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#f0fdf4' }}>
                    {row.versamento > 0 ? formatCurrency(row.versamento) : '-'}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                    {row.hasDiscrepancy ? (
                      <span title="Discrepanza rilevata" style={{ color: '#f59e0b' }}>⚠️</span>
                    ) : row.hasData ? (
                      <span title="OK" style={{ color: '#22c55e' }}>✓</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: '#1e293b', color: 'white', fontWeight: 'bold' }}>
              <td style={{ padding: 12 }}>TOTALE {monthName.toUpperCase()}</td>
              <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(totals.posAuto)}</td>
              <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(totals.posManual)}</td>
              <td style={{ 
                padding: 12, 
                textAlign: 'right',
                color: Math.abs(totals.posAuto - totals.posManual) > 1 ? '#fbbf24' : '#22c55e'
              }}>
                {formatCurrency(totals.posAuto - totals.posManual)}
              </td>
              <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(totals.corrispettiviAuto)}</td>
              <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(totals.corrispettiviManual)}</td>
              <td style={{ 
                padding: 12, 
                textAlign: 'right',
                color: Math.abs(totals.corrispettiviAuto - totals.corrispettiviManual) > 1 ? '#fbbf24' : '#22c55e'
              }}>
                {formatCurrency(totals.corrispettiviAuto - totals.corrispettiviManual)}
              </td>
              <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(totals.versamenti)}</td>
              <td style={{ padding: 12, textAlign: 'center' }}>
                {dailyComparison.filter(d => d.hasDiscrepancy).length > 0 ? '⚠️' : '✓'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div style={{ 
        marginTop: 20, 
        padding: 15, 
        background: '#f8fafc', 
        borderRadius: 8,
        fontSize: 13 
      }}>
        <strong>Legenda:</strong>
        <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
          <span><span style={{ color: '#3b82f6' }}>●</span> POS Auto = Importi da XML registratore di cassa</span>
          <span><span style={{ color: '#8b5cf6' }}>●</span> POS Manuale = Importi inseriti manualmente</span>
          <span><span style={{ color: '#f59e0b' }}>●</span> Corrisp. Auto = Corrispettivi da XML</span>
          <span><span style={{ color: '#10b981' }}>●</span> Corrisp. Man. = Corrispettivi inseriti manualmente</span>
          <span>⚠️ = Discrepanza &gt; €1</span>
          <span>✓ = Dati corrispondenti</span>
        </div>
      </div>
    </div>
  );
}
