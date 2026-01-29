import React, { useState, useEffect } from 'react';
import api from '../api';
import { STYLES, COLORS, button, badge, formatEuro } from '../lib/utils';
import { PageLayout } from '../components/PageLayout';

export default function OdooIntegration() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  
  // Config form
  const [config, setConfig] = useState({
    url: '',
    db: '',
    username: '',
    password: ''
  });
  const [configLoading, setConfigLoading] = useState(false);
  
  // Data
  const [partners, setPartners] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Sync results
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/odoo/status');
      setStatus(res.data);
    } catch (e) {
      console.error(e);
      setStatus({ status: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.url || !config.db || !config.username || !config.password) {
      alert('Compila tutti i campi');
      return;
    }
    setConfigLoading(true);
    try {
      const res = await api.post('/api/odoo/configure', config);
      alert('Connessione Odoo configurata con successo!');
      setStatus(res.data);
      loadStatus();
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    } finally {
      setConfigLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const res = await api.get('/api/odoo/partners?limit=50');
      setPartners(res.data.partners || []);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  const loadInvoices = async () => {
    try {
      const res = await api.get('/api/odoo/invoices?limit=50');
      setInvoices(res.data.invoices || []);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  const loadProducts = async () => {
    try {
      const res = await api.get('/api/odoo/products?limit=50');
      setProducts(res.data.products || []);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get('/api/odoo/employees?limit=50');
      setEmployees(res.data.employees || []);
    } catch (e) {
      alert('Errore: ' + (e.response?.data?.detail || e.message));
    }
  };

  const syncToLocal = async (type) => {
    setSyncResult(null);
    try {
      let res;
      switch (type) {
        case 'partners':
          res = await api.post('/api/odoo/partners/sync-to-local');
          break;
        case 'invoices':
          res = await api.post('/api/odoo/invoices/sync-to-local?move_type=in_invoice');
          break;
        case 'products':
          res = await api.post('/api/odoo/products/sync-to-local');
          break;
        case 'employees':
          res = await api.post('/api/odoo/employees/sync-to-local');
          break;
        default:
          return;
      }
      setSyncResult(res.data);
      alert(`Sincronizzazione completata!\nCreati: ${res.data.creati || res.data.created || 0}\nAggiornati: ${res.data.aggiornati || res.data.updated || 0}`);
    } catch (e) {
      alert('Errore sync: ' + (e.response?.data?.detail || e.message));
    }
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  };

  const tabStyle = (active) => ({
    padding: '10px 20px',
    background: active ? '#1e3a5f' : 'transparent',
    color: active ? '#fff' : '#64748b',
    border: 'none',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    borderRadius: '8px 8px 0 0',
    marginRight: 4
  });

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#1e3a5f' }}>🔗 Integrazione Odoo</h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
              Sincronizzazione bidirezionale con Odoo ERP via XML-RPC
            </p>
          </div>
          <button onClick={loadStatus} style={button('#3b82f6')}>
            🔄 Aggiorna Stato
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div style={{
        ...cardStyle,
        background: status?.status === 'connected' ? '#f0fdf4' : 
                    status?.status === 'not_configured' ? '#fefce8' : '#fef2f2',
        border: `1px solid ${status?.status === 'connected' ? '#86efac' : 
                            status?.status === 'not_configured' ? '#fde047' : '#fca5a5'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>
            {status?.status === 'connected' ? '✅' : 
             status?.status === 'not_configured' ? '⚠️' : '❌'}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {status?.status === 'connected' ? 'Connesso a Odoo' : 
               status?.status === 'not_configured' ? 'Configurazione necessaria' : 
               'Errore di connessione'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {status?.status === 'connected' && (
                <>Versione: {status.odoo_version} | DB: {status.database} | User ID: {status.user_id}</>
              )}
              {status?.status === 'not_configured' && (
                <>Inserisci le credenziali Odoo per attivare l'integrazione</>
              )}
              {status?.status === 'error' && status.message}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button style={tabStyle(activeTab === 'status')} onClick={() => setActiveTab('status')}>
          ⚙️ Configurazione
        </button>
        <button style={tabStyle(activeTab === 'partners')} onClick={() => { setActiveTab('partners'); loadPartners(); }}>
          👥 Partner
        </button>
        <button style={tabStyle(activeTab === 'invoices')} onClick={() => { setActiveTab('invoices'); loadInvoices(); }}>
          📄 Fatture
        </button>
        <button style={tabStyle(activeTab === 'products')} onClick={() => { setActiveTab('products'); loadProducts(); }}>
          📦 Prodotti
        </button>
        <button style={tabStyle(activeTab === 'employees')} onClick={() => { setActiveTab('employees'); loadEmployees(); }}>
          👷 Dipendenti
        </button>
      </div>

      {/* Config Tab */}
      {activeTab === 'status' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 20px' }}>🔐 Credenziali Odoo</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                URL Server Odoo *
              </label>
              <input
                type="text"
                placeholder="https://tuazienda.odoo.com"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                Database Name *
              </label>
              <input
                type="text"
                placeholder="tuazienda"
                value={config.db}
                onChange={(e) => setConfig({ ...config, db: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                Username / Email *
              </label>
              <input
                type="text"
                placeholder="admin@tuazienda.com"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                Password / API Key *
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
            <strong>💡 Nota:</strong> Per Odoo Online, vai in Impostazioni → Utenti → Seleziona utente → 
            Azione → Cambia Password per impostare una password locale. In alternativa, usa una API Key.
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button onClick={saveConfig} disabled={configLoading} style={button('#10b981')}>
              {configLoading ? '⏳ Connessione...' : '💾 Salva e Connetti'}
            </button>
            <button onClick={loadStatus} style={button('#64748b')}>
              🔄 Test Connessione
            </button>
          </div>
        </div>
      )}

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>👥 Partner (Clienti/Fornitori)</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadPartners} style={button('#3b82f6')}>🔄 Aggiorna</button>
              <button onClick={() => syncToLocal('partners')} style={button('#10b981')}>
                📥 Importa in Locale
              </button>
            </div>
          </div>
          
          {partners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              {status?.status !== 'connected' ? 'Configura la connessione Odoo' : 'Clicca "Aggiorna" per caricare i partner'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Nome</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>P.IVA</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 10, textAlign: 'center' }}>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {partners.slice(0, 20).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 10 }}>{p.name}</td>
                    <td style={{ padding: 10 }}>{p.vat || '-'}</td>
                    <td style={{ padding: 10 }}>{p.email || '-'}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      {p.supplier_rank > 0 && <span style={badge('warning')}>Fornitore</span>}
                      {p.customer_rank > 0 && <span style={badge('success')}>Cliente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📄 Fatture</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadInvoices} style={button('#3b82f6')}>🔄 Aggiorna</button>
              <button onClick={() => syncToLocal('invoices')} style={button('#10b981')}>
                📥 Importa Fatture Ricevute
              </button>
            </div>
          </div>
          
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              {status?.status !== 'connected' ? 'Configura la connessione Odoo' : 'Clicca "Aggiorna" per caricare le fatture'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Numero</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Partner</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Data</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Totale</th>
                  <th style={{ padding: 10, textAlign: 'center' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 20).map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 10 }}>{inv.name}</td>
                    <td style={{ padding: 10 }}>{inv.partner_id?.[1] || '-'}</td>
                    <td style={{ padding: 10 }}>{inv.invoice_date || '-'}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{formatEuro(inv.amount_total)}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <span style={badge(inv.state === 'posted' ? 'success' : 'warning')}>
                        {inv.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📦 Prodotti</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadProducts} style={button('#3b82f6')}>🔄 Aggiorna</button>
              <button onClick={() => syncToLocal('products')} style={button('#10b981')}>
                📥 Importa in Magazzino
              </button>
            </div>
          </div>
          
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              {status?.status !== 'connected' ? 'Configura la connessione Odoo' : 'Clicca "Aggiorna" per caricare i prodotti'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Codice</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Nome</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Categoria</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Prezzo</th>
                  <th style={{ padding: 10, textAlign: 'right' }}>Qtà</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 20).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 10 }}>{p.default_code || '-'}</td>
                    <td style={{ padding: 10 }}>{p.name}</td>
                    <td style={{ padding: 10 }}>{p.categ_id?.[1] || '-'}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{formatEuro(p.list_price)}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{p.qty_available?.toFixed(0) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>👷 Dipendenti</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadEmployees} style={button('#3b82f6')}>🔄 Aggiorna</button>
              <button onClick={() => syncToLocal('employees')} style={button('#10b981')}>
                📥 Importa in Anagrafica
              </button>
            </div>
          </div>
          
          {employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              {status?.status !== 'connected' ? 'Configura la connessione Odoo' : 'Clicca "Aggiorna" per caricare i dipendenti'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>Nome</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Mansione</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>Reparto</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 20).map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 10 }}>{emp.name}</td>
                    <td style={{ padding: 10 }}>{emp.work_email || '-'}</td>
                    <td style={{ padding: 10 }}>{emp.job_title || '-'}</td>
                    <td style={{ padding: 10 }}>{emp.department_id?.[1] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div style={{
          ...cardStyle,
          background: '#f0fdf4',
          border: '1px solid #86efac'
        }}>
          <h4 style={{ margin: '0 0 12px' }}>✅ Sincronizzazione completata</h4>
          <pre style={{ fontSize: 12, background: '#dcfce7', padding: 12, borderRadius: 6 }}>
            {JSON.stringify(syncResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
