import React, { useState, useEffect, useRef } from 'react';

/**
 * ParlantChat - Chat widget personalizzato per Parlant
 * Usa il proxy backend per comunicare con il server Parlant
 */
export default function ParlantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [agentId, setAgentId] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const messagesEndRef = useRef(null);
  
  // Get API base from window location or env
  const getApiBase = () => {
    // In production, use the same origin
    if (typeof window !== 'undefined') {
      // Check if REACT_APP_BACKEND_URL is available
      const envUrl = window._env_?.REACT_APP_BACKEND_URL || '';
      if (envUrl) return envUrl;
      // Fallback to empty string (same origin)
      return '';
    }
    return '';
  };
  
  const API_BASE = getApiBase();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check server status and get agent ID
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/parlant/status`);
      const data = await response.json();
      
      if (data.online) {
        setServerStatus('online');
        // Get agent ID
        const agentRes = await fetch(`${API_BASE}/api/parlant/agent-id`);
        const agentData = await agentRes.json();
        if (agentData.agent_id) {
          setAgentId(agentData.agent_id);
        }
      } else {
        setServerStatus('offline');
      }
    } catch (e) {
      setServerStatus('offline');
    }
  };

  const createSession = async () => {
    if (!agentId) return null;
    
    try {
      const response = await fetch(`${API_BASE}/api/parlant/proxy/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId })
      });
      const data = await response.json();
      return data.id;
    } catch (e) {
      console.error('Errore creazione sessione:', e);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Create session if needed
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession();
        if (!currentSessionId) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '❌ Errore: impossibile creare la sessione. Verifica che il server AI sia attivo.' 
          }]);
          setLoading(false);
          return;
        }
        setSessionId(currentSessionId);
      }

      // Send message
      await fetch(`${API_BASE}/api/parlant/proxy/sessions/${currentSessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'message',
          source: 'customer',
          content: userMessage
        })
      });

      // Poll for response - Emcie può richiedere più tempo per le prime conversazioni
      let attempts = 0;
      const maxAttempts = 90;  // 90 secondi max
      const pollInterval = 1000;

      const pollForResponse = async () => {
        try {
          const eventsRes = await fetch(`${API_BASE}/api/parlant/proxy/sessions/${currentSessionId}/events`);
          const events = await eventsRes.json();
          
          // Find AI response after our message
          const aiMessages = events.filter(e => e.source === 'ai_agent' && e.kind === 'message');
          
          if (aiMessages.length > 0) {
            const lastAiMessage = aiMessages[aiMessages.length - 1];
            setMessages(prev => {
              // Check if we already have this message
              const hasMessage = prev.some(m => m.id === lastAiMessage.id);
              if (hasMessage) return prev;
              return [...prev, { 
                role: 'assistant', 
                content: lastAiMessage.content,
                id: lastAiMessage.id
              }];
            });
            setLoading(false);
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollForResponse, pollInterval);
          } else {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: '⏳ La risposta sta richiedendo più tempo del previsto. Riprova tra poco.' 
            }]);
            setLoading(false);
          }
        } catch (e) {
          console.error('Errore polling:', e);
          setLoading(false);
        }
      };

      setTimeout(pollForResponse, 1500);

    } catch (e) {
      console.error('Errore invio messaggio:', e);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Errore di comunicazione con il server AI.' 
      }]);
      setLoading(false);
    }
  };

  // Toggle button (when closed)
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
            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 9999
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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

  // Widget open
  return (
    <div
      data-testid="parlant-chat-widget"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 380,
        height: 550,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999
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
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Assistente Ceraldi
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 7,
                height: 7,
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
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            color: 'white',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: '#f8fafc'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Ciao! Sono l'assistente Ceraldi</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              Posso aiutarti con domande sulla contabilità, riconciliazione bancaria, F24, fatture e molto altro.
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: '85%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? '#10b981' : 'white',
              color: msg.role === 'user' ? 'white' : '#1f2937',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              fontSize: 14,
              lineHeight: 1.5,
              boxShadow: msg.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {msg.content}
          </div>
        ))}
        
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'white',
            padding: '10px 14px',
            borderRadius: '14px 14px 14px 4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <span style={{ animation: 'pulse 1s infinite' }}>⏳ Sto pensando...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 12,
        borderTop: '1px solid #e5e7eb',
        background: 'white',
        display: 'flex',
        gap: 8
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={serverStatus === 'online' ? "Scrivi un messaggio..." : "Server offline"}
          disabled={serverStatus !== 'online' || loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading || serverStatus !== 'online'}
          style={{
            padding: '10px 16px',
            background: input.trim() && !loading ? '#10b981' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: 14
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
