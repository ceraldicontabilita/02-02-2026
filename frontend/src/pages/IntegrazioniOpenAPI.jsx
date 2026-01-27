import React, { useState, useEffect } from 'react';
import api from '../api';
import { STYLES, COLORS, formatEuro, button, badge } from '../lib/utils';

export default function IntegrazioniOpenAPI() {
  const [sdiStatus, setSdiStatus] = useState(null);
  const [aispStatus, setAispStatus] = useState(null);
  const [xbrlStatus, setXbrlStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sdi');
  
  // SDI State
  const [notifiche, setNotifiche] = useState([]);
  const [invioLoading, setInvioLoading] = useState(false);
  const [ricezioneLoading, setRicezioneLoading] = useState(false);
  const [ricezioneResult, setRicezioneResult] = useState(null);
  
  // XBRL State
  const [xbrlPiva, setXbrlPiva] = useState('');
  const [xbrlAnno, setXbrlAnno] = useState('');
  const [xbrlLoading, setXbrlLoading] = useState(false);
  const [xbrlResult, setXbrlResult] = useState(null);
  const [xbrlRequests, setXbrlRequests] = useState([]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [sdi, aisp] = await Promise.all([
        api.get('/api/openapi/sdi/status').catch(() => ({ data: { status: 'error' } })),
        api.get('/api/openapi/aisp/status').catch(() => ({ data: { status: 'error' } }))
      ]);
      setSdiStatus(sdi.data);
      setAispStatus(aisp.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifiche = async () => {
    try {
      const res = await api.get('/api/openapi/sdi/notifiche');
      setNotifiche(res.data.notifiche || []);
    } catch (e) {
      console.error(e);
    }
  };

  const riceviFatture = async () => {
    setRicezioneLoading(true);
    setRicezioneResult(null);
    try {
      const res = await api.get('/api/openapi/sdi/ricevi-fatture');
      setRicezioneResult(res.data);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setRicezioneLoading(false);
    }
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    marginBottom: 16
  };

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    background: isActive ? '#1a365d' : 'transparent',
    color: isActive ? '#fff' : '#64748b',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 500,
    fontSize: 14
  });

  if (loading) {
    return (
      <div style={{ ...STYLES.pageWrapper, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: 48 }}>⏳</div>
      </div>
    );
  }

  return (
    <div style={STYLES.pageWrapper}>
      <div style={STYLES.pageContainer}>
        <div style={STYLES.pageHeader}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              🔌 Integrazioni OpenAPI.it
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              SDI (Fatturazione Elettronica) & AISP (Open Banking)
            </p>
          </div>
          <button onClick={loadStatus} style={button('#3b82f6')}>
            🔄 Aggiorna Stato
          </button>
        </div>

        <div style={STYLES.pageContent}>
          {/* Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
            {/* SDI Status */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>📄 SDI - Fatturazione Elettronica</h3>
                <span style={badge(sdiStatus?.api_key_configured ? 'success' : 'error')}>
                  {sdiStatus?.api_key_configured ? '✓ Configurato' : '✗ Non configurato'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                <div>Ambiente: <strong>{sdiStatus?.environment || 'N/A'}</strong></div>
                <div>Base URL: <code style={{ fontSize: 11 }}>{sdiStatus?.base_url}</code></div>
              </div>
            </div>

            {/* AISP Status */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>🏦 AISP - Open Banking</h3>
                <span style={badge('warning')}>
                  ⚠ Richiede Autorizzazione PSD2
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                <div>Stato: <strong>{aispStatus?.status || 'N/A'}</strong></div>
                <div>Riconciliazione bancaria automatica</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
            <button style={tabStyle(activeTab === 'sdi')} onClick={() => setActiveTab('sdi')}>
              📄 SDI
            </button>
            <button style={tabStyle(activeTab === 'aisp')} onClick={() => setActiveTab('aisp')}>
              🏦 AISP
            </button>
            <button style={tabStyle(activeTab === 'config')} onClick={() => setActiveTab('config')}>
              ⚙️ Configurazione
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'sdi' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {/* Ricevi Fatture */}
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>📥 Ricevi Fatture</h4>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Scarica le fatture passive ricevute dallo SDI.
                  </p>
                  <button 
                    onClick={riceviFatture}
                    disabled={ricezioneLoading}
                    style={{ ...button('#10b981'), width: '100%' }}
                  >
                    {ricezioneLoading ? '⏳ Caricamento...' : '📥 Ricevi Fatture SDI'}
                  </button>
                  {ricezioneResult && (
                    <div style={{ marginTop: 12, padding: 10, background: '#f0fdf4', borderRadius: 6, fontSize: 12 }}>
                      ✅ Ricevute: {ricezioneResult.fatture_ricevute}<br/>
                      📥 Importate: {ricezioneResult.fatture_importate}
                    </div>
                  )}
                </div>

                {/* Invia Fatture */}
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>📤 Invia Fatture</h4>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Invia le fatture attive allo SDI per la trasmissione.
                  </p>
                  <button 
                    onClick={() => alert('Vai su Fatture Emesse per inviare singole fatture')}
                    style={{ ...button('#3b82f6'), width: '100%' }}
                  >
                    📤 Gestione Invii
                  </button>
                </div>

                {/* Notifiche */}
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>🔔 Notifiche SDI</h4>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    Verifica esiti, scarti e mancate consegne.
                  </p>
                  <button 
                    onClick={loadNotifiche}
                    style={{ ...button('#f59e0b'), width: '100%' }}
                  >
                    🔔 Carica Notifiche
                  </button>
                </div>
              </div>

              {/* Notifiche List */}
              {notifiche.length > 0 && (
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 12px' }}>Notifiche Recenti</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>Data</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>Messaggio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifiche.map((n, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: 10 }}>{n.date || '-'}</td>
                          <td style={{ padding: 10 }}>
                            <span style={badge(n.type === 'error' ? 'error' : 'info')}>
                              {n.type}
                            </span>
                          </td>
                          <td style={{ padding: 10 }}>{n.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'aisp' && (
            <div>
              <div style={{ ...cardStyle, background: '#fffbeb', border: '1px solid #fcd34d' }}>
                <h4 style={{ margin: '0 0 12px', color: '#92400e' }}>⚠️ Autorizzazione PSD2 Richiesta</h4>
                <p style={{ fontSize: 13, color: '#78350f', marginBottom: 16 }}>
                  Per utilizzare l'AISP (Open Banking) è necessario:
                </p>
                <ol style={{ fontSize: 13, color: '#78350f', paddingLeft: 20 }}>
                  <li>Accedere a <a href="https://console.openapi.com/it/dashboard" target="_blank" rel="noreferrer">console.openapi.com</a></li>
                  <li>Richiedere l'attivazione del servizio AISP</li>
                  <li>Completare la procedura di autorizzazione PSD2</li>
                  <li>Collegare i conti bancari da monitorare</li>
                </ol>
              </div>

              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 12px' }}>🏦 Funzionalità AISP</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {aispStatus?.features?.map((f, i) => (
                    <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                      ✓ {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div>
              <div style={cardStyle}>
                <h4 style={{ margin: '0 0 16px' }}>⚙️ Configurazione Attuale</h4>
                <table style={{ width: '100%', fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>API Key</td>
                      <td style={{ padding: '8px 0' }}>
                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 4 }}>
                          ••••••••••••••••{sdiStatus?.api_key_configured ? '(configurata)' : '(mancante)'}
                        </code>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Ambiente</td>
                      <td style={{ padding: '8px 0' }}>
                        <span style={badge(sdiStatus?.environment === 'sandbox' ? 'warning' : 'success')}>
                          {sdiStatus?.environment || 'N/A'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Codice Destinatario</td>
                      <td style={{ padding: '8px 0' }}><code>USAL8PV</code> (OpenAPI.it)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>Base URL SDI</td>
                      <td style={{ padding: '8px 0' }}><code>{sdiStatus?.base_url}</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ ...cardStyle, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <h4 style={{ margin: '0 0 12px', color: '#0369a1' }}>📘 Passare a Produzione</h4>
                <p style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 12 }}>
                  Per passare dall'ambiente Sandbox a Produzione:
                </p>
                <ol style={{ fontSize: 13, color: '#0c4a6e', paddingLeft: 20 }}>
                  <li>Genera una nuova API Key di produzione su OpenAPI.it</li>
                  <li>Aggiorna la variabile <code>OPENAPI_IT_KEY</code> nel file .env</li>
                  <li>Imposta <code>OPENAPI_IT_ENV="production"</code></li>
                  <li>Riavvia il backend</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
