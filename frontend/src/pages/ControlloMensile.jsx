import React, { useState, useEffect } from 'react';
import api from '../api';

/**
 * ControlloMensile - Pagina per confrontare i dati POS automatici vs manuali
 * Vista annuale con breakdown mensile
 * 
 * Colonne: Mese | POS Auto | POS Manuale | Diff. POS | Corrisp. Auto | Corrisp. Man. | Diff. Corr. | Versamenti | Saldo Cassa | Dettagli
 * 
 * POS Auto = pagato_elettronico dai corrispettivi XML
 * Corrisp. Auto = totale corrispettivi XML (sovrascrive Excel se diverso)
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
    versamenti: 0,
    saldoCassa: 0
  });
  
  // Daily detail data (when viewing a specific month)
  const [dailyComparison, setDailyComparison] = useState([]);
  
  // Dettaglio versamenti per il mese
  const [versamentiDettaglio, setVersamentiDettaglio] = useState([]);
  const [showVersamentiModal, setShowVersamentiModal] = useState(false);

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

      // Carica dati in parallelo
      const [bancaRes, cassaRes, corrispRes] = await Promise.all([
        api.get(`/api/prima-nota/banca?${params}&limit=2000`).catch(() => ({ data: { movimenti: [] } })),
        api.get(`/api/prima-nota/cassa?${params}&limit=2000`).catch(() => ({ data: { movimenti: [] } })),
        api.get(`/api/corrispettivi?data_da=${startDate}&data_a=${endDate}`).catch(() => ({ data: [] }))
      ]);

      const banca = bancaRes.data.movimenti || [];
      const cassa = cassaRes.data.movimenti || [];
      const corrispettivi = Array.isArray(corrispRes.data) ? corrispRes.data : (corrispRes.data.corrispettivi || []);
      
      processYearData(banca, cassa, corrispettivi);
    } catch (error) {
      console.error('Error loading year data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processYearData = (banca, cassa, corrispettivi) => {
    const monthly = [];
    let yearPosAuto = 0, yearPosManual = 0, yearCorrispAuto = 0, yearCorrispManual = 0;
    let yearVersamenti = 0, yearSaldoCassa = 0;

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      const monthPrefix = `${anno}-${monthStr}`;
      
      // Filter data for this month
      const monthBanca = banca.filter(m => m.data?.startsWith(monthPrefix));
      const monthCassa = cassa.filter(m => m.data?.startsWith(monthPrefix));
      const monthCorrisp = corrispettivi.filter(c => 
        c.data?.startsWith(monthPrefix) || c.data_ora?.startsWith(monthPrefix)
      );

      // ============ POS AUTO ============
      // POS Auto = pagato_elettronico dai corrispettivi XML
      const posAuto = monthCorrisp.reduce((sum, c) => sum + (parseFloat(c.pagato_elettronico) || 0), 0);

      // ============ POS MANUALE ============
      // POS da Prima Nota Cassa/Banca con source manual o excel
      const posManualCassa = monthCassa
        .filter(m => m.source === 'manual_pos' || m.source === 'excel_pos' || 
                    (m.categoria?.toLowerCase().includes('pos') && m.tipo === 'entrata'))
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);
      
      const posManualBanca = monthBanca
        .filter(m => m.source === 'manual_pos' || m.source === 'excel_pos' ||
                    (m.descrizione?.toLowerCase().includes('pos') && m.tipo === 'entrata'))
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);
      
      const posManual = posManualCassa + posManualBanca;

      // ============ CORRISPETTIVI AUTO ============
      // Totale corrispettivi da XML (questo SOVRASCRIVE i dati Excel se presenti)
      const corrispAuto = monthCorrisp.reduce((sum, c) => sum + (parseFloat(c.totale) || 0), 0);

      // ============ CORRISPETTIVI MANUALI ============
      // Corrispettivi da Prima Nota Cassa (inseriti manualmente o da Excel)
      const corrispManual = monthCassa
        .filter(m => m.categoria === 'Corrispettivi' || m.source === 'excel_corrispettivi')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);

      // ============ VERSAMENTI ============
      // Versamenti = uscite dalla cassa verso banca
      const versamenti = monthCassa
        .filter(m => (m.categoria === 'Versamento' || m.descrizione?.toLowerCase().includes('versamento')) && 
                    m.tipo === 'uscita')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);

      // ============ SALDO CASSA ============
      // Saldo Cassa = Entrate cassa - Uscite cassa del mese
      const entrateCassa = monthCassa
        .filter(m => m.tipo === 'entrata')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);
      const usciteCassa = monthCassa
        .filter(m => m.tipo === 'uscita')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);
      const saldoCassa = entrateCassa - usciteCassa;

      // ============ DIFFERENZE ============
      const posDiff = posAuto - posManual;
      // Se ci sono corrispettivi XML, usiamo quelli (XML sovrascrive Excel)
      const corrispDiff = corrispAuto > 0 ? (corrispAuto - corrispManual) : 0;
      
      const hasData = posAuto > 0 || posManual > 0 || corrispAuto > 0 || corrispManual > 0 || versamenti > 0;
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
        saldoCassa,
        hasData,
        hasDiscrepancy,
        // Flag se XML sovrascrive Excel
        xmlOverridesExcel: corrispAuto > 0 && corrispManual > 0 && Math.abs(corrispAuto - corrispManual) > 1
      });

      yearPosAuto += posAuto;
      yearPosManual += posManual;
      yearCorrispAuto += corrispAuto;
      yearCorrispManual += corrispManual;
      yearVersamenti += versamenti;
      yearSaldoCassa += saldoCassa;
    }

    setMonthlyData(monthly);
    setYearTotals({
      posAuto: yearPosAuto,
      posManual: yearPosManual,
      corrispettiviAuto: yearCorrispAuto,
      corrispettiviManual: yearCorrispManual,
      versamenti: yearVersamenti,
      saldoCassa: yearSaldoCassa
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
        api.get(`/api/prima-nota/banca?${params}`).catch(() => ({ data: { movimenti: [] } })),
        api.get(`/api/prima-nota/cassa?${params}`).catch(() => ({ data: { movimenti: [] } })),
        api.get(`/api/corrispettivi?data_da=${startDate}&data_a=${endDate}`).catch(() => ({ data: [] }))
      ]);

      const banca = bancaRes.data.movimenti || [];
      const cassa = cassaRes.data.movimenti || [];
      const corrispettivi = Array.isArray(corrispRes.data) ? corrispRes.data : (corrispRes.data.corrispettivi || []);
      
      processDailyData(banca, cassa, corrispettivi, month);
      
      // Estrai dettaglio versamenti
      const versamentiMese = cassa.filter(m => 
        (m.categoria === 'Versamento' || m.descrizione?.toLowerCase().includes('versamento')) && 
        m.tipo === 'uscita'
      );
      setVersamentiDettaglio(versamentiMese);
      
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

      // Corrispettivi del giorno
      const dayCorrisp = corrispettivi.filter(c => 
        c.data?.startsWith(dateStr) || c.data_ora?.startsWith(dateStr)
      );
      
      // POS Auto dal corrispettivo XML (pagato_elettronico)
      dayData.posAuto = dayCorrisp.reduce((sum, c) => sum + (parseFloat(c.pagato_elettronico) || 0), 0);

      // POS Manual da Prima Nota
      const dayCassa = cassa.filter(m => m.data?.startsWith(dateStr));
      const dayBanca = banca.filter(m => m.data?.startsWith(dateStr));
      
      dayData.posManual = dayCassa
        .filter(m => m.source === 'manual_pos' || m.source === 'excel_pos')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);

      // Corrispettivi Auto (totale da XML)
      dayData.corrispettivoAuto = dayCorrisp.reduce((sum, c) => sum + (parseFloat(c.totale) || 0), 0);

      // Corrispettivi Manual
      dayData.corrispettivoManual = dayCassa
        .filter(m => m.categoria === 'Corrispettivi')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);

      // Versamenti del giorno
      dayData.versamento = dayCassa
        .filter(m => (m.categoria === 'Versamento' || m.descrizione?.toLowerCase().includes('versamento')) && m.tipo === 'uscita')
        .reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);

      // Saldo Cassa del giorno
      const entrateGiorno = dayCassa.filter(m => m.tipo === 'entrata').reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);
      const usciteGiorno = dayCassa.filter(m => m.tipo === 'uscita').reduce((sum, m) => sum + (parseFloat(m.importo) || 0), 0);
      dayData.saldoCassa = entrateGiorno - usciteGiorno;

      dayData.posDiff = dayData.posAuto - dayData.posManual;
      dayData.corrispettivoDiff = dayData.corrispettivoAuto - dayData.corrispettivoManual;
      dayData.hasData = dayData.posAuto > 0 || dayData.posManual > 0 || 
                        dayData.corrispettivoAuto > 0 || dayData.corrispettivoManual > 0 ||
                        dayData.versamento > 0;
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

  // Modal Versamenti
  const VersamentiModal = () => {
    if (!showVersamentiModal) return null;
    
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }} onClick={() => setShowVersamentiModal(false)}>
        <div style={{
          background: 'white', borderRadius: 12, padding: 20, maxWidth: 600, width: '90%',
          maxHeight: '80vh', overflowY: 'auto'
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h2 style={{ margin: 0 }}>💰 Dettaglio Versamenti - {monthNames[meseSelezionato - 1]} {anno}</h2>
            <button onClick={() => setShowVersamentiModal(false)} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          
          {versamentiDettaglio.length === 0 ? (
            <p style={{ color: '#666' }}>Nessun versamento registrato per questo mese.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Data</th>
                  <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Descrizione</th>
                  <th style={{ padding: 10, textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Importo</th>
                </tr>
              </thead>
              <tbody>
                {versamentiDettaglio.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 10 }}>{v.data}</td>
                    <td style={{ padding: 10 }}>{v.descrizione || v.categoria}</td>
                    <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                      {formatCurrency(v.importo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1e293b', color: 'white' }}>
                  <td colSpan={2} style={{ padding: 10, fontWeight: 'bold' }}>TOTALE</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold' }}>
                    {formatCurrency(versamentiDettaglio.reduce((sum, v) => sum + (parseFloat(v.importo) || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 data-testid="controllo-mensile-title" style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)' }}>
          📊 Controllo {viewMode === 'anno' ? 'Annuale' : 'Mensile'}
        </h1>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          Confronto chiusure giornaliere - POS Auto (da XML) vs Manuali | Saldo Cassa
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
          <>
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
            
            <button
              onClick={() => setShowVersamentiModal(true)}
              style={{
                padding: '10px 20px',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              data-testid="show-versamenti-btn"
            >
              💰 Dettaglio Versamenti
            </button>
          </>
        )}

        <span style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 'auto' }}>
          📅 {viewMode === 'anno' ? anno : `${monthNames[meseSelezionato - 1]} ${anno}`}
        </span>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: 15, 
        marginBottom: 25 
      }}>
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>POS Auto (XML)</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(yearTotals.posAuto)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>POS Manuali</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(yearTotals.posManual)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Corrisp. Auto (XML)</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(yearTotals.corrispettiviAuto)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Corrisp. Manuali</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(yearTotals.corrispettiviManual)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Versamenti</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(yearTotals.versamenti)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', borderRadius: 12, padding: 16, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Saldo Cassa</div>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>{formatCurrency(yearTotals.saldoCassa)}</div>
        </div>
      </div>

      {/* Info Box - XML Sovrascrive Excel */}
      <div style={{ 
        background: '#e0f2fe', 
        border: '2px solid #0284c7', 
        borderRadius: 8, 
        padding: 15, 
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <span style={{ fontSize: 24 }}>ℹ️</span>
        <div>
          <strong>POS Auto e Corrispettivi Auto</strong> vengono estratti direttamente dai file XML dei corrispettivi.
          <br />
          <span style={{ fontSize: 12, color: '#0369a1' }}>
            Se i dati XML sono diversi da quelli Excel/manuali, i dati XML hanno la priorità (sono più affidabili).
          </span>
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
            <strong>Attenzione!</strong> Ci sono discrepanze tra i dati automatici (XML) e manuali.
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
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#e0f2fe' }}>Saldo Cassa</th>
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
                      background: row.hasDiscrepancy ? '#fef3c7' : (row.xmlOverridesExcel ? '#e0f2fe' : (row.hasData ? 'white' : '#f9fafb')),
                      opacity: row.hasData ? 1 : 0.5
                    }}
                    data-testid={`row-month-${row.month}`}
                  >
                    <td style={{ padding: 12, borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                      {row.monthName}
                      {row.xmlOverridesExcel && <span title="Dati XML usati" style={{ marginLeft: 5 }}>📄</span>}
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
                    <td style={{ 
                      padding: 12, 
                      borderBottom: '1px solid #e2e8f0', 
                      textAlign: 'right', 
                      background: '#e0f2fe',
                      fontWeight: 'bold',
                      color: row.saldoCassa >= 0 ? '#16a34a' : '#dc2626'
                    }}>
                      {formatCurrency(row.saldoCassa)}
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
                <td style={{ padding: 12, textAlign: 'right' }}>{formatCurrency(yearTotals.saldoCassa)}</td>
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
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #e2e8f0', background: '#e0f2fe' }}>Saldo Cassa</th>
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
                      {row.posManual > 0 ? formatCurrency(row.posManual) : '-'}
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
                    <td style={{ 
                      padding: 10, 
                      borderBottom: '1px solid #e2e8f0', 
                      textAlign: 'right', 
                      background: '#e0f2fe',
                      fontWeight: 'bold',
                      color: row.saldoCassa >= 0 ? '#16a34a' : '#dc2626'
                    }}>
                      {formatCurrency(row.saldoCassa)}
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
                <td style={{ padding: 12, textAlign: 'right' }}>
                  {formatCurrency(dailyComparison.reduce((s, d) => s + d.saldoCassa, 0))}
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
          <span><span style={{ color: '#3b82f6' }}>●</span> POS Auto = pagato_elettronico da XML corrispettivi</span>
          <span><span style={{ color: '#8b5cf6' }}>●</span> POS Manuale = Importi inseriti manualmente/Excel</span>
          <span><span style={{ color: '#f59e0b' }}>●</span> Corrisp. Auto = Totale corrispettivi da XML</span>
          <span><span style={{ color: '#10b981' }}>●</span> Corrisp. Man. = Corrispettivi inseriti manualmente</span>
          <span><span style={{ color: '#0ea5e9' }}>●</span> Saldo Cassa = Entrate - Uscite cassa</span>
          <span>⚠️ = Discrepanza &gt; €1</span>
          <span>📄 = Dati XML usati (sovrascrive Excel)</span>
        </div>
      </div>
      
      {/* Modal Versamenti */}
      <VersamentiModal />
    </div>
  );
}
