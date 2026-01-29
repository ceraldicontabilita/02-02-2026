import { formatDateIT, STYLES, COLORS, button, badge } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import api from '../api';
import { PageLayout } from '../components/PageLayout';

export default function HACCPTemperature() {
  const [temperatures, setTemperatures] = useState({ frigoriferi: [], congelatori: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [frigo, congel] = await Promise.all([
          api.get('/api/haccp/temperature-frigoriferi').catch(() => ({ data: [] })),
          api.get('/api/haccp/temperature-congelatori').catch(() => ({ data: [] }))
        ]);
        setTemperatures({
          frigoriferi: frigo.data || [],
          congelatori: congel.data || []
        });
      } catch (e) {
        console.error('Errore:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <PageLayout title="Registro Temperature HACCP" icon="🌡️" subtitle="Monitoraggio temperature frigoriferi e congelatori">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Caricamento...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          {/* Frigoriferi */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0891b2', marginBottom: 16 }}>
              ❄️ Frigoriferi ({temperatures.frigoriferi.length} rilevazioni)
            </h2>
            {temperatures.frigoriferi.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nessuna rilevazione</p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {temperatures.frigoriferi.slice(0, 20).map((t, idx) => (
                  <div key={idx} style={{ 
                    padding: 10, 
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{formatDateIT(t.data)}</span>
                    <span style={{ fontWeight: 600, color: t.temperatura > 8 ? '#dc2626' : '#059669' }}>
                      {t.temperatura}°C
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Congelatori */}
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#7c3aed', marginBottom: 16 }}>
              🧊 Congelatori ({temperatures.congelatori.length} rilevazioni)
            </h2>
            {temperatures.congelatori.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nessuna rilevazione</p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {temperatures.congelatori.slice(0, 20).map((t, idx) => (
                  <div key={idx} style={{ 
                    padding: 10, 
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{formatDateIT(t.data)}</span>
                    <span style={{ fontWeight: 600, color: t.temperatura > -15 ? '#dc2626' : '#059669' }}>
                      {t.temperatura}°C
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ 
        marginTop: 24,
        padding: 20,
        background: '#fef3c7',
        borderRadius: 12,
        border: '1px solid #fcd34d'
      }}>
        <p style={{ color: '#92400e', fontSize: 14 }}>
          ⚠️ <strong>Nota:</strong> I dati HACCP sono stati ripristinati. Per aggiungere nuove rilevazioni, 
          utilizza il pulsante "Nuova Rilevazione" che sarà disponibile nella prossima versione.
        </p>
      </div>
    </PageLayout>
  );
}
