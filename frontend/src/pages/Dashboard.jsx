import React, { useEffect, useState } from "react";
import { dashboardSummary, health } from "../api";
import api from "../api";
import { Link } from "react-router-dom";
import { useAnnoGlobale } from "../contexts/AnnoContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
  const { anno } = useAnnoGlobale();
  const [h, setH] = useState(null);
  const [sum, setSum] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [notificheHaccp, setNotificheHaccp] = useState(0);
  const [trendData, setTrendData] = useState(null);
  const [posCalendario, setPosCalendario] = useState(null);
  const [scadenzeData, setScadenzeData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [healthData, summaryData] = await Promise.all([
          health(),
          dashboardSummary(anno)
        ]);
        setH(healthData);
        setSum(summaryData);
        
        // Load trend mensile, calendario POS e scadenze
        const [trendRes, posRes, notifRes, scadenzeRes] = await Promise.all([
          api.get(`/api/dashboard/trend-mensile?anno=${anno}`).catch(() => ({ data: null })),
          api.get(`/api/pos-accredito/calendario-mensile/${anno}/${new Date().getMonth() + 1}`).catch(() => ({ data: null })),
          api.get('/api/haccp-completo/notifiche?solo_non_lette=true&limit=1').catch(() => ({ data: { non_lette: 0 } })),
          api.get('/api/scadenze/prossime?giorni=30&limit=8').catch(() => ({ data: null }))
        ]);
        
        setTrendData(trendRes.data);
        setPosCalendario(posRes.data);
        setNotificheHaccp(notifRes.data.non_lette || 0);
        setScadenzeData(scadenzeRes.data);
      } catch (e) {
        console.error("Dashboard error:", e);
        setErr("Backend non raggiungibile. Verifica che il server sia attivo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [anno]);

  const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);

  if (loading) {
    return (
      <div className="card">
        <div className="h1">Dashboard</div>
        <div className="small">Caricamento in corso...</div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="h1">Dashboard {anno}</div>
        {err ? (
          <div className="small" style={{ color: "#c00" }}>{err}</div>
        ) : (
          <div className="small" style={{ color: "#0a0" }}>
            ✓ Backend connesso - Database: {h?.database || "connesso"}
          </div>
        )}
      </div>

      {/* Alert Section */}
      {(notificheHaccp > 0) && (
        <div style={{ 
          background: '#ffebee', 
          border: '2px solid #f44336', 
          borderRadius: 8, 
          padding: 16, 
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 15
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#c62828' }}>Attenzione!</div>
              <div style={{ fontSize: 14 }}>{notificheHaccp} anomalie HACCP non lette</div>
            </div>
          </div>
          <Link to="/haccp/notifiche" style={{
            padding: '8px 16px',
            background: '#f44336',
            color: 'white',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            Visualizza Alert
          </Link>
        </div>
      )}

      {/* Widget Scadenze */}
      {scadenzeData && scadenzeData.scadenze && scadenzeData.scadenze.length > 0 && (
        <ScadenzeWidget scadenze={scadenzeData} />
      )}

      {/* KPI Cards */}
      <div className="grid">
        <div className="card">
          <div className="small">Fatture</div>
          <div className="kpi">{sum?.invoices_total ?? 0}</div>
          <div className="small">Totale registrate</div>
        </div>
        <div className="card">
          <div className="small">Fornitori</div>
          <div className="kpi">{sum?.suppliers ?? 0}</div>
          <div className="small">Registrati</div>
        </div>
        <div className="card">
          <div className="small">Magazzino</div>
          <div className="kpi">{sum?.products ?? 0}</div>
          <div className="small">Prodotti a stock</div>
        </div>
        <div className="card">
          <div className="small">HACCP</div>
          <div className="kpi">{sum?.haccp_items ?? 0}</div>
          <div className="small">Registrazioni</div>
        </div>
        <div className="card">
          <div className="small">Dipendenti</div>
          <div className="kpi">{sum?.employees ?? 0}</div>
          <div className="small">In organico</div>
        </div>
        <div className="card">
          <div className="small">Riconciliazione</div>
          <div className="kpi">{sum?.reconciled ?? 0}</div>
          <div className="small">Movimenti</div>
        </div>
      </div>

      {/* Trend Mensile Chart */}
      {trendData && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div className="h1" style={{ fontSize: 18, margin: 0 }}>📈 Trend Mensile {anno}</div>
              <div className="small">Entrate vs Uscite</div>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
              <div>
                <span style={{ color: '#10b981' }}>● Entrate:</span>{' '}
                <strong>{formatCurrency(trendData.totali?.entrate)}</strong>
              </div>
              <div>
                <span style={{ color: '#ef4444' }}>● Uscite:</span>{' '}
                <strong>{formatCurrency(trendData.totali?.uscite)}</strong>
              </div>
              <div>
                <span style={{ color: trendData.totali?.saldo >= 0 ? '#10b981' : '#ef4444' }}>● Saldo:</span>{' '}
                <strong style={{ color: trendData.totali?.saldo >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatCurrency(trendData.totali?.saldo)}
                </strong>
              </div>
            </div>
          </div>
          
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={trendData.trend_mensile} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mese_nome" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ fontWeight: 'bold' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="entrate" fill="#10b981" name="Entrate" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uscite" fill="#ef4444" name="Uscite" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Statistiche */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 15, 
            marginTop: 20,
            padding: 15,
            background: '#f8fafc',
            borderRadius: 8
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Media Entrate</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#10b981' }}>
                {formatCurrency(trendData.statistiche?.media_entrate_mensile)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Media Uscite</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>
                {formatCurrency(trendData.statistiche?.media_uscite_mensile)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Picco Entrate</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{trendData.statistiche?.mese_picco_entrate}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Picco Uscite</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{trendData.statistiche?.mese_picco_uscite}</div>
            </div>
          </div>
        </div>
      )}

      {/* IVA Trend Chart */}
      {trendData && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="h1" style={{ fontSize: 18, margin: '0 0 15px 0' }}>📊 Trend IVA {anno}</div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={trendData.trend_mensile} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mese_nome" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Legend />
                <Line type="monotone" dataKey="iva_debito" stroke="#f59e0b" strokeWidth={2} name="IVA Debito" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="iva_credito" stroke="#3b82f6" strokeWidth={2} name="IVA Credito" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 30, 
            marginTop: 15,
            fontSize: 14 
          }}>
            <div>
              IVA Debito Totale: <strong style={{ color: '#f59e0b' }}>{formatCurrency(trendData.totali?.iva_debito)}</strong>
            </div>
            <div>
              IVA Credito Totale: <strong style={{ color: '#3b82f6' }}>{formatCurrency(trendData.totali?.iva_credito)}</strong>
            </div>
            <div>
              Saldo IVA: <strong style={{ color: trendData.totali?.saldo_iva >= 0 ? '#ef4444' : '#10b981' }}>
                {formatCurrency(Math.abs(trendData.totali?.saldo_iva))} {trendData.totali?.saldo_iva >= 0 ? '(da versare)' : '(a credito)'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Calendario POS Sfasamento */}
      {posCalendario && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <div>
              <div className="h1" style={{ fontSize: 18, margin: 0 }}>💳 Calendario POS - Sfasamento Accrediti</div>
              <div className="small">Mese corrente - Giorni con sfasamento lungo evidenziati</div>
            </div>
            <Link to="/riconciliazione" style={{
              padding: '6px 12px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13
            }}>
              Vai a Riconciliazione
            </Link>
          </div>
          
          <POSCalendarWidget data={posCalendario} />
          
          {/* Legenda */}
          <div style={{ 
            display: 'flex', 
            gap: 20, 
            marginTop: 15, 
            fontSize: 12,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#dcfce7', borderRadius: 2, marginRight: 4 }}></span> +1 giorno</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fef3c7', borderRadius: 2, marginRight: 4 }}></span> +2 giorni</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fee2e2', borderRadius: 2, marginRight: 4 }}></span> +3 giorni</span>
            <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#fecaca', borderRadius: 2, marginRight: 4 }}></span> Festivo</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="h1" style={{ fontSize: 18 }}>🚀 Azioni Rapide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, marginTop: 15 }}>
          <Link to="/import-export" style={quickActionStyle('#e3f2fd', '#1565c0')}>
            <span style={{ fontSize: 20 }}>📤</span>
            <span>Import/Export</span>
          </Link>
          <Link to="/bilancio" style={quickActionStyle('#f3e5f5', '#7b1fa2')}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span>Bilancio</span>
          </Link>
          <Link to="/controllo-mensile" style={quickActionStyle('#e8f5e9', '#2e7d32')}>
            <span style={{ fontSize: 20 }}>📈</span>
            <span>Controllo Mensile</span>
          </Link>
          <Link to="/f24" style={quickActionStyle('#fff3e0', '#e65100')}>
            <span style={{ fontSize: 20 }}>📋</span>
            <span>F24 / Tributi</span>
          </Link>
          <Link to="/iva" style={quickActionStyle('#e0f2f1', '#00695c')}>
            <span style={{ fontSize: 20 }}>🧾</span>
            <span>Calcolo IVA</span>
          </Link>
          <Link to="/commercialista" style={quickActionStyle('#fce4ec', '#c2185b')}>
            <span style={{ fontSize: 20 }}>📁</span>
            <span>Commercialista</span>
          </Link>
        </div>
      </div>
    </>
  );
}

// Style helper
const quickActionStyle = (bg, color) => ({
  padding: 15,
  background: bg,
  borderRadius: 8,
  textDecoration: 'none',
  color: color,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  transition: 'transform 0.2s',
});

// POS Calendar Widget Component
function POSCalendarWidget({ data }) {
  if (!data || !data.giorni) return null;
  
  const mesiNomi = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  // Trova il primo giorno del mese
  const primoGiorno = new Date(data.giorni[0].data_pagamento);
  const offsetInizio = (primoGiorno.getDay() + 6) % 7; // Lunedì = 0
  
  // Prepara griglia calendario
  const settimane = [];
  let settimanaCorrente = new Array(offsetInizio).fill(null);
  
  data.giorni.forEach((g, idx) => {
    const sfasamento = g.giorni_sfasamento;
    const isFestivo = data.festivi?.includes(g.data_pagamento);
    
    settimanaCorrente.push({
      ...g,
      giorno: idx + 1,
      sfasamento,
      isFestivo
    });
    
    if (settimanaCorrente.length === 7) {
      settimane.push(settimanaCorrente);
      settimanaCorrente = [];
    }
  });
  
  if (settimanaCorrente.length > 0) {
    while (settimanaCorrente.length < 7) settimanaCorrente.push(null);
    settimane.push(settimanaCorrente);
  }
  
  const getColor = (sfasamento, isFestivo) => {
    if (isFestivo) return '#fecaca';
    if (sfasamento === 1) return '#dcfce7';
    if (sfasamento === 2) return '#fef3c7';
    if (sfasamento >= 3) return '#fee2e2';
    return '#f9fafb';
  };
  
  return (
    <div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>
        {mesiNomi[data.mese]} {data.anno}
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: 4,
        fontSize: 12
      }}>
        {/* Header */}
        {giorniSettimana.map(g => (
          <div key={g} style={{ 
            textAlign: 'center', 
            fontWeight: 'bold', 
            padding: 6,
            color: g === 'Sab' || g === 'Dom' ? '#ef4444' : '#374151'
          }}>
            {g}
          </div>
        ))}
        
        {/* Giorni */}
        {settimane.flat().map((g, idx) => (
          <div 
            key={idx} 
            style={{ 
              textAlign: 'center', 
              padding: '8px 4px',
              background: g ? getColor(g.sfasamento, g.isFestivo) : 'transparent',
              borderRadius: 4,
              cursor: g ? 'pointer' : 'default',
              position: 'relative'
            }}
            title={g ? `${g.giorno_settimana_pagamento}: Accredito in ${g.giorni_sfasamento} giorni\n${g.note}` : ''}
          >
            {g && (
              <>
                <div style={{ fontWeight: '500' }}>{g.giorno}</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>+{g.sfasamento}g</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
