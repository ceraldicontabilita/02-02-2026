import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatDateIT } from '../lib/utils';

export default function HACCPScadenze() {
  const [scadenze, setScadenze] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/haccp/scadenze');
        setScadenze(res.data || []);
      } catch (e) {
        console.error('Errore:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a365d', marginBottom: 8 }}>
        ⏰ Scadenziario HACCP
      </h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>
        Scadenze documenti, certificazioni e controlli periodici
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : scadenze.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          background: '#f8fafc', 
          borderRadius: 12,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3 style={{ color: '#475569', marginBottom: 8 }}>Nessuna scadenza registrata</h3>
          <p style={{ color: '#94a3b8' }}>
            Le scadenze HACCP appariranno qui
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {scadenze.map((scad, idx) => {
            const days = getDaysUntil(scad.data_scadenza);
            const isUrgent = days !== null && days <= 7;
            const isExpired = days !== null && days < 0;
            
            return (
              <div 
                key={scad.id || idx} 
                style={{ 
                  background: 'white', 
                  borderRadius: 12, 
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${isExpired ? '#dc2626' : isUrgent ? '#f59e0b' : '#22c55e'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    {scad.descrizione || scad.tipo || 'Scadenza'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: 14 }}>
                    Scadenza: {formatDateIT(scad.data_scadenza) || '-'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    background: isExpired ? '#fee2e2' : isUrgent ? '#fef3c7' : '#dcfce7',
                    color: isExpired ? '#991b1b' : isUrgent ? '#92400e' : '#166534'
                  }}>
                    {isExpired ? `Scaduto da ${Math.abs(days)} giorni` : 
                     days === 0 ? 'Scade oggi!' :
                     `${days} giorni`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
