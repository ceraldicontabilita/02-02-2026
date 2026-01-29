import { formatDateIT, STYLES, COLORS, button, badge } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import api from '../api';
import { PageLayout } from '../components/PageLayout';

export default function HACCPSanificazioni() {
  const [sanificazioni, setSanificazioni] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/haccp/sanificazioni');
        setSanificazioni(res.data || []);
      } catch (e) {
        console.error('Errore:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <PageLayout 
      title="HACCP Sanificazioni" 
      icon="🧹"
      subtitle="Registro sanificazioni"
    >
      <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a365d', marginBottom: 8 }}>
        🧹 Registro Sanificazioni
      </h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Storico delle sanificazioni effettuate
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : sanificazioni.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          background: '#f8fafc', 
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧹</div>
          <h3 style={{ color: '#475569', marginBottom: 8 }}>Nessuna sanificazione registrata</h3>
          <p style={{ color: '#94a3b8' }}>
            Le sanificazioni appariranno qui dopo essere state registrate
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
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Area/Attrezzatura</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Operatore</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Prodotto</th>
                <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {sanificazioni.map((san, idx) => (
                <tr key={san.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{formatDateIT(san.data) || '-'}</td>
                  <td style={{ padding: 12 }}>{san.area || san.attrezzatura || '-'}</td>
                  <td style={{ padding: 12 }}>{san.operatore || '-'}</td>
                  <td style={{ padding: 12, color: '#64748b' }}>{san.prodotto || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: san.completato ? '#dcfce7' : '#fef9c3',
                      color: san.completato ? '#166534' : '#854d0e'
                    }}>
                      {san.completato ? '✓ Completato' : '⏳ In corso'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </PageLayout>
  );
}
