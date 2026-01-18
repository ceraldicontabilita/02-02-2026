import React, { useState, useEffect } from 'react';
import api from '../api';

/**
 * ParlantWidget - Widget per l'agente Parlant AI
 * 
 * Utilizza il server Parlant per un chatbot con:
 * - Guidelines comportamentali
 * - Tools per accesso ai dati
 * - Journeys per guidare l'utente
 */
export default function ParlantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    checkParlantStatus();
  }, []);

  const checkParlantStatus = async () => {
    try {
      const res = await api.get('/api/parlant/config');
      setConfig(res.data);
      setLoading(false);
    } catch (e) {
      setError('Parlant non disponibile');
      setLoading(false);
    }
  };

  const startParlant = async () => {
    setStarting(true);
    try {
      const res = await api.post('/api/parlant/start');
      if (res.data.success) {
        await checkParlantStatus();
      } else {
        setError(res.data.error || 'Errore avvio Parlant');
      }
    } catch (e) {
      setError('Impossibile avviare Parlant');
    } finally {
      setStarting(false);
    }
  };

  // Pulsante toggle
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="parlant-toggle"
        title="Assistente AI Parlant"
        style={{
          position: 'fixed',
          bottom: 100,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: 'none',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 9998
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: 26 }}>🧠</span>
      </button>
    );
  }

  // Widget aperto
  return (
    <div
      data-testid="parlant-widget"
      style={{
        position: 'fixed',
        bottom: 100,
        right: 24,
        width: 380,
        height: 500,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9998
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
              Parlant AI
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: 10
            }}>
              Assistente Intelligente
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            color: 'white',
            fontSize: 14
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ color: '#64748b' }}>Verifica stato Parlant...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: '#dc2626', marginBottom: 16 }}>{error}</div>
            <button
              onClick={startParlant}
              disabled={starting}
              style={{
                padding: '12px 24px',
                background: starting ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: starting ? 'wait' : 'pointer',
                fontWeight: 600
              }}
            >
              {starting ? '⏳ Avvio in corso...' : '🚀 Avvia Parlant'}
            </button>
          </div>
        ) : config?.enabled ? (
          <div style={{ width: '100%', height: '100%' }}>
            {/* Qui andrebbe il widget Parlant ufficiale */}
            <iframe
              src={`http://localhost:8800`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 8
              }}
              title="Parlant Chat"
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
            <div style={{ color: '#374151', marginBottom: 8, fontWeight: 600 }}>
              Parlant AI non attivo
            </div>
            <div style={{ color: '#64748b', marginBottom: 20, fontSize: 13 }}>
              Avvia il server Parlant per utilizzare l'assistente AI avanzato con guidelines e tools.
            </div>
            <button
              onClick={startParlant}
              disabled={starting}
              style={{
                padding: '12px 24px',
                background: starting ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: starting ? 'wait' : 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {starting ? '⏳ Avvio in corso...' : '🚀 Avvia Parlant Server'}
            </button>
            
            <div style={{ 
              marginTop: 20, 
              padding: 12, 
              background: '#fef3c7', 
              borderRadius: 8,
              fontSize: 11,
              color: '#92400e',
              textAlign: 'left'
            }}>
              <strong>⚠️ Nota:</strong> Parlant richiede una API key Gemini nativa. 
              Per usare l'assistente AI con Emergent LLM Key, utilizza il widget 🤖 ChatAI già attivo.
            </div>
            
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              background: '#f0fdf4', 
              borderRadius: 8,
              fontSize: 11,
              color: '#166534',
              textAlign: 'left'
            }}>
              <strong>Funzionalità Parlant:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                <li>Guidelines comportamentali contestuali</li>
                <li>Tools per accesso ai dati contabili</li>
                <li>Journeys per guidare l'utente</li>
                <li>Risposte predefinite (no hallucinations)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
