import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { Send, Bot, User, Loader2, Sparkles, FileText, BarChart3, Tag } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';

const CONTEXT_TYPES = [
  { id: 'general', label: 'Generale', icon: <Sparkles size={16} />, color: '#3b82f6' },
  { id: 'fatture', label: 'Fatture', icon: <FileText size={16} />, color: '#ec4899' },
  { id: 'bilancio', label: 'Bilancio', icon: <BarChart3 size={16} />, color: '#10b981' },
  { id: 'dipendenti', label: 'Dipendenti', icon: <User size={16} />, color: '#8b5cf6' },
  { id: 'scadenze', label: 'Scadenze', icon: <Tag size={16} />, color: '#f59e0b' },
];

export default function AssistenteAI() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState('general');
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Messaggio di benvenuto
  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `👋 Ciao! Sono l'assistente AI contabile. Posso aiutarti con:

• **Analisi dati** - Fatture, corrispettivi, bilancio
• **Scadenze fiscali** - F24, IVA, contributi
• **Dipendenti** - Buste paga, ferie, TFR
• **Report** - Genera report narrativi sui tuoi dati

Seleziona un contesto sopra o fai una domanda!`
    }]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/api/claude/chat', {
        message: userMessage,
        session_id: sessionId,
        context_type: contextType
      });

      if (response.data.response) {
        setSessionId(response.data.session_id);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.response,
          context: response.data.context_used
        }]);
      }
    } catch (error) {
      console.error('Errore chat:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Errore nella comunicazione con Claude. Riprova.',
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    "Quante fatture ho questo mese?",
    "Ci sono scadenze fiscali imminenti?",
    "Qual è il margine sui corrispettivi?",
    "Genera un report bilancio"
  ];

  return (
    <PageLayout 
      title="Assistente AI Contabile" 
      icon="🤖"
      subtitle="Powered by Claude Sonnet"
    >
      <div style={{ 
        height: 'calc(100vh - 200px)', 
        display: 'flex', 
        flexDirection: 'column',
        maxWidth: 900,
        margin: '0 auto'
      }}>
        {/* Context selector */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
          borderRadius: '16px 16px 0 0',
          padding: '16px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CONTEXT_TYPES.map(ctx => (
              <button
                key={ctx.id}
                onClick={() => setContextType(ctx.id)}
                data-testid={`context-${ctx.id}`}
                style={{
                  padding: '6px 12px',
                  background: contextType === ctx.id ? 'white' : 'rgba(255,255,255,0.2)',
                  color: contextType === ctx.id ? ctx.color : 'white',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                {ctx.icon}
                {ctx.label}
              </button>
            ))}
          </div>
        </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: 20,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: 12,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: msg.role === 'user' ? '#3b82f6' : 'linear-gradient(135deg, #1e3a5f, #2d5a87)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {msg.role === 'user' ? <User size={18} color="white" /> : <Bot size={18} color="white" />}
            </div>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#3b82f6' : 'white',
              color: msg.role === 'user' ? 'white' : '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: 14
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a5f, #2d5a87)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{
              padding: '12px 16px',
              background: 'white',
              borderRadius: '16px 16px 16px 4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#64748b', fontSize: 13 }}>Claude sta elaborando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div style={{ 
          padding: '12px 20px', 
          background: 'white',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap'
        }}>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => { setInput(q); }}
              style={{
                padding: '6px 12px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                cursor: 'pointer',
                fontSize: 12,
                color: '#475569',
                transition: 'all 0.2s'
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ 
        padding: 16,
        background: 'white',
        borderRadius: '0 0 16px 16px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: 12
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Scrivi una domanda sui tuoi dati contabili..."
          data-testid="chat-input"
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            resize: 'none',
            fontSize: 14,
            fontFamily: 'inherit',
            minHeight: 48,
            maxHeight: 120
          }}
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          data-testid="send-btn"
          style={{
            padding: '12px 20px',
            background: loading || !input.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
            color: loading || !input.trim() ? '#94a3b8' : 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          Invia
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </PageLayout>
  );
}
