import React, { useState, useEffect } from 'react';
import api from '../api';

export default function PrimaNotaSalari() {
  const [salari, setSalari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSalari = async () => {
      try {
        const res = await api.get('/api/prima-nota-salari');
        setSalari(res.data.movimenti || []);
      } catch (e) {
        console.error('Errore caricamento prima nota salari:', e);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };
    fetchSalari();
  }, []);

  const formatEuro = (val) => {
    if (!val && val !== 0) return '€ 0,00';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a365d', marginBottom: 8 }}>
        💰 Prima Nota Salari
      </h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Registro dei pagamenti stipendi e contributi
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          Caricamento...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
          {error}
        </div>
      ) : salari.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          background: '#f8fafc', 
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ color: '#475569', marginBottom: 8 }}>Nessun movimento registrato</h3>
          <p style={{ color: '#94a3b8' }}>
            I movimenti salari appariranno qui dopo l'import delle buste paga
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
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Dipendente</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Descrizione</th>
                <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Importo</th>
              </tr>
            </thead>
            <tbody>
              {salari.map((mov, idx) => (
                <tr key={mov.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>{mov.data?.substring(0, 10) || '-'}</td>
                  <td style={{ padding: 12 }}>{mov.dipendente || mov.beneficiario || '-'}</td>
                  <td style={{ padding: 12, color: '#64748b' }}>{mov.descrizione || '-'}</td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>
                    {formatEuro(mov.importo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
