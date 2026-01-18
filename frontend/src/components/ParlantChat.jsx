import React, { useState, useEffect } from 'react';
import ParlantChatbox from 'parlant-chat-react';

/**
 * ParlantChat - Widget ufficiale Parlant per Contabit
 * 
 * Utilizza il widget React ufficiale di Parlant per la chat
 * con l'agente AI contabile.
 */
export default function ParlantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [agentId, setAgentId] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [error, setError] = useState(null);

  // Verifica stato server Parlant
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Check ogni 10s
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      // Prova a raggiungere il server Parlant
      const response = await fetch('http://localhost:8800/agents', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setAgentId(data[0].id);
          setServerStatus('online');
          setError(null);
        } else {
          setServerStatus('no-agent');
        }
      } else {
        setServerStatus('offline');
      }
    } catch (e) {
      setServerStatus('offline');
      // Prova a leggere agent_id dal file (se server è su)
      try {
        const idResponse = await fetch('/api/parlant/agent-id');
        if (idResponse.ok) {
          const idData = await idResponse.json();
          if (idData.agent_id) {
            setAgentId(idData.agent_id);
            setServerStatus('online');
          }
        }
      } catch {
        // Server non disponibile
      }
    }
  };

  // Pulsante toggle (quando chiuso)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="parlant-chat-toggle"
        title="Assistente AI Contabit"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: serverStatus === 'online' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 9999
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: 30 }}>🤖</span>
        {serverStatus === 'online' && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid white'
          }} />
        )}
      </button>
    );
  }

  // Widget aperto
  return (
    <div
      data-testid="parlant-chat-widget"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 400,
        height: 600,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>🤖</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
              Assistente Contabit
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.85)', 
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: serverStatus === 'online' ? '#86efac' : '#fca5a5'
              }} />
              {serverStatus === 'online' ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            color: 'white',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {serverStatus === 'online' && agentId ? (
          // Widget Parlant ufficiale
          <ParlantChatbox 
            server="http://localhost:8800" 
            agentId={agentId}
            style={{ flex: 1, height: '100%' }}
          />
        ) : serverStatus === 'checking' ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            padding: 24
          }}>
            <div style={{ fontSize: 40, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ color: '#64748b', textAlign: 'center' }}>
              Verifica connessione al server AI...
            </div>
          </div>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            padding: 24
          }}>
            <div style={{ fontSize: 48 }}>🔌</div>
            <div style={{ 
              color: '#374151', 
              fontWeight: 600, 
              fontSize: 16,
              textAlign: 'center'
            }}>
              Server AI non disponibile
            </div>
            <div style={{ 
              color: '#64748b', 
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 1.5
            }}>
              Il server Parlant non è attivo.<br/>
              Avvialo con il comando:
            </div>
            <code style={{
              background: '#1e293b',
              color: '#22c55e',
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'monospace'
            }}>
              python3 /app/parlant_server.py
            </code>
            <button
              onClick={checkServerStatus}
              style={{
                marginTop: 8,
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              🔄 Riprova connessione
            </button>
            
            <div style={{ 
              marginTop: 16,
              padding: 16, 
              background: '#f0fdf4', 
              borderRadius: 8,
              fontSize: 12,
              color: '#166534',
              textAlign: 'left',
              width: '100%'
            }}>
              <strong>💡 Funzionalità Assistente:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Domande sulla contabilità</li>
                <li>Ricerca fatture e fornitori</li>
                <li>Stato riconciliazione bancaria</li>
                <li>F24 e tributi pendenti</li>
                <li>Navigazione guidata nel sistema</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
