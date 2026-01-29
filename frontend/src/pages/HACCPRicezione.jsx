import { formatDateIT, STYLES, COLORS, button, badge } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import api from '../api';
import { PageLayout } from '../components/PageLayout';

export default function HACCPRicezione() {
  const [ricezioni, setRicezioni] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/haccp/ricezione-merci');
        setRicezioni(res.data || []);
      } catch (e) {
        console.error('Errore:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <PageLayout title="Ricezione Merci HACCP" icon="📥" subtitle="Registro controlli alla ricezione delle merci">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : ricezioni.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          background: '#f8fafc', 
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📥</div>
          <h3 style={{ color: '#475569', marginBottom: 8 }}>Nessun controllo registrato</h3>
          <p style={{ color: '#94a3b8' }}>
            I controlli alla ricezione merci appariranno qui
          </p>
        </div>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: 12, 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Data</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Fornitore</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Prodotto</th>
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Temp. °C</th>
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Esito</th>
              </tr>
            </thead>
            <tbody>
              {ricezioni.map((ric, idx) => (
                <tr key={ric.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{formatDateIT(ric.data) || '-'}</td>
                  <td style={{ padding: 12 }}>{ric.fornitore || '-'}</td>
                  <td style={{ padding: 12 }}>{ric.prodotto || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>
                    {ric.temperatura || '-'}
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: ric.conforme ? '#dcfce7' : '#fee2e2',
                      color: ric.conforme ? '#166534' : '#991b1b'
                    }}>
                      {ric.conforme ? '✓ Conforme' : '✗ Non conforme'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
