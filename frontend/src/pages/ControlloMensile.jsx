import React, { useState, useEffect } from 'react';
import api from '../api';

/**
 * ControlloMensile - Pagina per confrontare i dati POS automatici vs manuali
 * Vista annuale con breakdown mensile
 */
export default function ControlloMensile() {
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [anno, setAnno] = useState(currentYear);
  const [viewMode, setViewMode] = useState('anno'); // 'anno' or 'mese'
  const [meseSelezionato, setMeseSelezionato] = useState(null);
  
  // Monthly summary data
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearTotals, setYearTotals] = useState({
    posAuto: 0,
    posManual: 0,
    corrispettiviAuto: 0,
    corrispettiviManual: 0,
    versamentiManual: 0,
    versamentiEC: 0  // Estratto Conto
  });
  
  // Daily detail data (when viewing a specific month)
  const [dailyComparison, setDailyComparison] = useState([]);

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  useEffect(() => {
    if (viewMode === 'anno') {
      loadYearData();
    } else if (meseSelezionato) {
      loadMonthData(meseSelezionato);
    }
  }, [anno, viewMode, meseSelezionato]);

  const loadYearData = async () => {
    setLoading(true);
    try {
      const startDate = `${anno}-01-01`;
      const endDate = `${anno}-12-31`;
      
      const params = new URLSearchParams({
        data_da: startDate,
        data_a: endDate
      });

      const [bancaRes, cassaRes, corrispRes] = await Promise.all([
        api.get(`/api/prima-nota/banca?${params}&limit=1000`),
        api.get(`/api/prima-nota/cassa?${params}&limit=1000`),
        api.get(`/api/corrispettivi?data_da=${startDate}&data_a=${endDate}`)
      ]);

      const banca = bancaRes.data.movimenti || [];
      const cassa = cassaRes.data.movimenti || [];
      const corrispettivi = corrispRes.data.corrispettivi || corrispRes.data || [];
      
      // Process data by month
      processYearData(banca, cassa, corrispettivi);
    } catch (error) {
      console.error('Error loading year data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processYearData = (banca, cassa, corrispettivi) => {
    const monthly = [];
    let yearPosAuto = 0, yearPosManual = 0, yearCorrispAuto = 0, yearCorrispManual = 0, yearVersamenti = 0;

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      const monthPrefix = `${anno}-${monthStr}`;
      
      // Filter data for this month
      const monthBanca = banca.filter(m => m.data?.startsWith(monthPrefix));
      const monthCassa = cassa.filter(m => m.data?.startsWith(monthPrefix));
      const monthCorrisp = corrispettivi.filter(c => 
        c.data?.startsWith(monthPrefix) || c.data_ora?.startsWith(monthPrefix)
      );

      // POS Auto (from XML/bank imports)
      const posAuto = monthBanca
        .filter(m => (m.categoria?.toLowerCase().includes('pos') || m.descrizione?.toLowerCase().includes('incasso pos')) && m.source !== 'manual_pos')
        .reduce((sum, m) => sum + (m.importo || 0), 0);

      // POS Manual
      const posManual = monthBanca
        .filter(m => m.source === 'manual_pos')
        .reduce((sum, m) => sum + (m.importo || 0), 0);

      // Corrispettivi Auto (from XML)
      const corrispAuto = monthCorrisp.reduce((sum, c) => sum + (c.ammontare_vendite || c.importo || 0), 0);

      // Corrispettivi Manual
      const corrispManual = monthCassa
        .filter(m => m.categoria === 'Corrispettivi' && m.source === 'manual_entry')
        .reduce((sum, m) => sum + (m.importo || 0), 0);

      // Versamenti
      const versamenti = monthCassa
        .filter(m => m.categoria === 'Versamento' && m.tipo === 'uscita')
        .reduce((sum, m) => sum + (m.importo || 0), 0);

      const posDiff = posAuto - posManual;
      const corrispDiff = corrispAuto - corrispManual;
      const hasData = posAuto > 0 || posManual > 0 || corrispAuto > 0 || corrispManual > 0;
      const hasDiscrepancy = Math.abs(posDiff) > 1 || Math.abs(corrispDiff) > 1;

      monthly.push({
        month,
        monthName: monthNames[month - 1],
        posAuto,
        posManual,
        posDiff,
        corrispAuto,
        corrispManual,
        corrispDiff,
        versamenti,
        hasData,
        hasDiscrepancy
      });

      yearPosAuto += posAuto;
      yearPosManual += posManual;
      yearCorrispAuto += corrispAuto;
      yearCorrispManual += corrispManual;
      yearVersamenti += versamenti;
    }

    setMonthlyData(monthly);
    setYearTotals({
      posAuto: yearPosAuto,
      posManual: yearPosManual,
      corrispettiviAuto: yearCorrispAuto,
      corrispettiviManual: yearCorrispManual,
      versamenti: yearVersamenti
    });
  };

  const loadMonthData = async (month) => {
    setLoading(true);
    try {
      const monthStr = String(month).padStart(2, '0');
      const startDate = `${anno}-${monthStr}-01`;
      const daysInMonth = new Date(anno, month, 0).getDate();
      const endDate = `${anno}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
      
      const params = new URLSearchParams({
        data_da: startDate,
        data_a: endDate
      });

      const [bancaRes, cassaRes, corrispRes] = await Promise.all([
        api.get(`/api/prima-nota/banca?${params}`),
        api.get(`/api/prima-nota/cassa?${params}`),
        api.get(`/api/corrispettivi?data_da=${startDate}&data_a=${endDate}`)
      ]);

      const banca = bancaRes.data.movimenti || [];
      const cassa = cassaRes.data.movimenti || [];
      const corrispettivi = corrispRes.data.corrispettivi || corrispRes.data || [];
      
      processDailyData(banca, cassa, corrispettivi, month);
    } catch (error) {
      console.error('Error loading month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDailyData = (banca, cassa, corrispettivi, month) => {
    const daysInMonth = new Date(anno, month, 0).getDate();
    const comparison = [];
    const monthStr = String(month).padStart(2, '0');

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${anno}-${monthStr}-${String(day).padStart(2, '0')}`;
      const dayData = { date: dateStr, day };

      // POS Auto
      const posAutoMovements = banca.filter(m => 
        m.data?.startsWith(dateStr) && 
        (m.categoria?.toLowerCase().includes('pos') || m.descrizione?.toLowerCase().includes('incasso pos')) &&
        m.source !== 'manual_pos'
      );
      dayData.posAuto = posAutoMovements.reduce((sum, m) => sum + (m.importo || 0), 0);

      // POS Manual
      const posManualMovements = banca.filter(m => 
        m.data?.startsWith(dateStr) && m.source === 'manual_pos'
      );
      dayData.posManual = posManualMovements.reduce((sum, m) => sum + (m.importo || 0), 0);
      dayData.posDetails = posManualMovements.length > 0 ? posManualMovements[0].pos_details : null;

      // Corrispettivi Auto
      const corrispAuto = corrispettivi.filter(c => 
        c.data?.startsWith(dateStr) || c.data_ora?.startsWith(dateStr)
      );
      dayData.corrispettivoAuto = corrispAuto.reduce((sum, c) => 
        sum + (c.ammontare_vendite || c.importo || 0), 0
      );

      // Corrispettivi Manual
      const corrispManualMovements = cassa.filter(m => 
        m.data?.startsWith(dateStr) && m.categoria === 'Corrispettivi' && m.source === 'manual_entry'
      );
      dayData.corrispettivoManual = corrispManualMovements.reduce((sum, m) => sum + (m.importo || 0), 0);

      // Versamenti
      const versamentiMovements = cassa.filter(m => 
        m.data?.startsWith(dateStr) && m.categoria === 'Versamento' && m.tipo === 'uscita'
      );
      dayData.versamento = versamentiMovements.reduce((sum, m) => sum + (m.importo || 0), 0);

      dayData.posDiff = dayData.posAuto - dayData.posManual;
      dayData.corrispettivoDiff = dayData.corrispettivoAuto - dayData.corrispettivoManual;
      dayData.hasData = dayData.posAuto > 0 || dayData.posManual > 0 || 
                        dayData.corrispettivoAuto > 0 || dayData.corrispettivoManual > 0;
      dayData.hasDiscrepancy = Math.abs(dayData.posDiff) > 1 || Math.abs(dayData.corrispettivoDiff) > 1;

      comparison.push(dayData);
    }

    setDailyComparison(comparison);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  };

  const handleMonthClick = (month) => {
    setMeseSelezionato(month);
    setViewMode('mese');
  };

  const handleBackToYear = () => {
    setViewMode('anno');
    setMeseSelezionato(null);
  };

  // Generate year options (last 5 years)
  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 4; y--) {
    yearOptions.push(y);
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 data-testid="controllo-mensile-title" style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)' }}>
          📊 Controllo {viewMode === 'anno' ? 'Annuale' : 'Mensile'}
        </h1>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          Confronto chiusure giornaliere - POS automatici vs manuali
        </p>
      </div>

      {/* Year Selector & View Toggle */}
      <div style={{ display: 'flex', gap: 15, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontWeight: 'bold' }}>Anno:</label>
          <select
            value={anno}
            onChange={(e) => setAnno(parseInt(e.target.value))}
            style={{ 
              padding: '10px 16px', 
              borderRadius: 8, 
              border: '2px solid #e0e0e0', 
              fontSize: 16,
              cursor: 'pointer',
              minWidth: 100
            }}
            data-testid="year-selector"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {viewMode === 'mese' && (
          <button
            onClick={handleBackToYear}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            data-testid="back-to-year-btn"
          >
            ← Torna a Vista Annuale
          </button>
        )}

        <span style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 'auto' }}>
          📅 {viewMode === 'anno' ? anno : `${monthNames[meseSelezionato - 1]} ${anno}`}
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
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(yearTotals.posAuto)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>POS Manuali</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(yearTotals.posManual)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Corrispettivi Auto</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(yearTotals.corrispettiviAuto)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Corrispettivi Manuali</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(yearTotals.corrispettiviManual)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Versamenti</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatCurrency(yearTotals.versamenti)}</div>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {((viewMode === 'anno' && monthlyData.some(d => d.hasDiscrepancy)) || 
        (viewMode === 'mese' && dailyComparison.some(d => d.hasDiscrepancy))) && (
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
            <strong>Attenzione!</strong> Ci sono discrepanze tra i dati automatici e manuali.
            <br />
            <span style={{ fontSize: 12, color: '#92400e' }}>
              Le righe evidenziate in giallo richiedono verifica.
            </span>
          </div>
        </div>
      )}

      {/* Year View - Monthly Table */}
      {viewMode === 'anno' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} data-testid="yearly-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Mese</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#dbeafe' }}>POS Auto</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#ede9fe' }}>POS Manuale</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Diff. POS</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#fef3c7' }}>Corrisp. Auto</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#d1fae5' }}>Corrisp. Man.</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Diff. Corr.</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#ecfdf5' }}>Versamenti</th>
                <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Stato</th>
                <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Dettagli</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 40 }}>
                    ⏳ Caricamento dati...
                  </td>
                </tr>
              ) : (
                monthlyData.map((row) => (
                  <tr 
                    key={row.month} 
                    style={{ 
                      background: row.hasDiscrepancy ? '#fef3c7' : (row.hasData ? 'white' : '#f9fafb'),
                      opacity: row.hasData ? 1 : 0.5
                    }}
                    data-testid={`row-month-${row.month}`}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                      {row.monthName}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#f0f9ff' }}>
                      {row.posAuto > 0 ? formatCurrency(row.posAuto) : '-'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#faf5ff' }}>
                      {row.posManual > 0 ? formatCurrency(row.posManual) : '-'}
                    </td>
                    <td style={{ 
                      padding: 12, 
                      borderBottom: '1px solid #e2e8f0', 
                      textAlign: 'right',
                      fontWeight: Math.abs(row.posDiff) > 1 ? 'bold' : 'normal',
                      color: Math.abs(row.posDiff) > 1 ? (row.posDiff > 0 ? '#16a34a' : '#dc2626') : '#666'
                    }}>
                      {Math.abs(row.posDiff) > 0.01 ? (
                        <span>{row.posDiff > 0 ? '+' : ''}{formatCurrency(row.posDiff)}</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#fffbeb' }}>
                      {row.corrispAuto > 0 ? formatCurrency(row.corrispAuto) : '-'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#ecfdf5' }}>
                      {row.corrispManual > 0 ? formatCurrency(row.corrispManual) : '-'}
                    </td>
                    <td style={{ 
                      padding: 12, 
                      borderBottom: '1px solid #e2e8f0', 
                      textAlign: 'right',
                      fontWeight: Math.abs(row.corrispDiff) > 1 ? 'bold' : 'normal',
                      color: Math.abs(row.corrispDiff) > 1 ? (row.corrispDiff > 0 ? '#16a34a' : '#dc2626') : '#666'
                    }}>
                      {Math.abs(row.corrispDiff) > 0.01 ? (
                        <span>{row.corrispDiff > 0 ? '+' : ''}{formatCurrency(row.corrispDiff)}</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'right', background: '#f0fdf4' }}>
                      {row.versamenti > 0 ? formatCurrency(row.versamenti) : '-'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {row.hasDiscrepancy ? (
                        <span title="Discrepanza rilevata" style={{ color: '#f59e0b' }}>⚠️</span>
                      ) : row.hasData ? (
                        <span title="OK" style={{ color: '#22c55e' }}>✓</span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {row.hasData && (
                        <button
                          onClick={() => handleMonthClick(row.month)}
                          style={{
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}
                          data-testid={`view-month-${row.month}`}
                        >
                          👁️ Vedi
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1e293b', color: 'white', fontWeight: 'bold' }}>
                <td style={{ padding: 12 }}>TOTALE {anno}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(yearTotals.posAuto)}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(yearTotals.posManual)}</td>
                <td style={{ 
                  padding: 12, 
                  textAlign: 'right',
                  color: Math.abs(yearTotals.posAuto - yearTotals.posManual) > 1 ? '#fbbf24' : '#22c55e'
                }}>
                  {formatCurrency(yearTotals.posAuto - yearTotals.posManual)}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(yearTotals.corrispettiviAuto)}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(yearTotals.corrispettiviManual)}</td>
                <td style={{ 
                  padding: 12, 
                  textAlign: 'right',
                  color: Math.abs(yearTotals.corrispettiviAuto - yearTotals.corrispettiviManual) > 1 ? '#fbbf24' : '#22c55e'
                }}>
                  {formatCurrency(yearTotals.corrispettiviAuto - yearTotals.corrispettiviManual)}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(yearTotals.versamenti)}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  {monthlyData.filter(d => d.hasDiscrepancy).length > 0 ? '⚠️' : '✓'}
                </td>
                <td style={{ padding: 12 }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Month View - Daily Table */}
      {viewMode === 'mese' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }} data-testid="monthly-table">
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
                <td style={{ padding: 12 }}>TOTALE {monthNames[meseSelezionato - 1].toUpperCase()}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.posAuto, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.posManual, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.posDiff, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.corrispettivoAuto, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.corrispettivoManual, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.corrispettivoDiff, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.versamento, 0))}
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  {dailyComparison.filter(d => d.hasDiscrepancy).length > 0 ? '⚠️' : '✓'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

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
