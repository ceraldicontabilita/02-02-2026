import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

/**
 * AIAssistantWidget - Widget flottante per l'assistente AI
 * 
 * Funzionalità:
 * - Chat conversazionale con l'AI
 * - Suggerimenti domande frequenti
 * - Navigazione automatica alle pagine suggerite
 * - Cronologia sessione persistente
 */
export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [aiStatus, setAiStatus] = useState({ enabled: false });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Carica stato AI e suggerimenti all'avvio
  useEffect(() => {
    checkAIStatus();
    loadSuggestions();
    
    // Recupera sessionId da localStorage
    const savedSession = localStorage.getItem('ai_chat_session');
    if (savedSession) {
      setSessionId(savedSession);
      loadHistory(savedSession);
    }
  }, []);

  // Scroll automatico ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sull'input quando si apre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const checkAIStatus = async () => {
    try {
      const res = await api.get('/api/chat-ai/status');
      setAiStatus(res.data);
    } catch (e) {
      setAiStatus({ enabled: false, status: 'offline' });
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await api.get('/api/chat-ai/suggestions');
      setSuggestions(res.data.suggestions || []);
    } catch (e) {
      console.log('Suggerimenti non disponibili');
    }
  };

  const loadHistory = async (sid) => {
    try {
      const res = await api.get(`/api/chat-ai/history/${sid}`);
      if (res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages.map(m => ({
          type: m.role === 'user' ? 'user' : 'assistant',
          text: m.content,
          timestamp: m.timestamp
        })));
        setShowSuggestions(false);
      }
    } catch (e) {
      // Cronologia non disponibile
    }
  };

  const sendMessage = async (text = null) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    // Aggiungi messaggio utente
    const userMessage = {
      type: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const res = await api.post('/api/chat-ai/ask', {
        question: messageText,
        session_id: sessionId,
        context: {
          current_page: window.location.pathname
        }
      });

      // Salva sessionId
      if (res.data.session_id && !sessionId) {
        setSessionId(res.data.session_id);
        localStorage.setItem('ai_chat_session', res.data.session_id);
      }

      // Aggiungi risposta AI
      const aiMessage = {
        type: 'assistant',
        text: res.data.response || res.data.answer,
        timestamp: new Date().toISOString(),
        suggestedPage: res.data.suggested_page
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (e) {
      const errorMessage = {
        type: 'assistant',
        text: 'Mi dispiace, si è verificato un errore. Riprova tra poco.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const clearHistory = async () => {
    if (sessionId) {
      try {
        await api.delete(`/api/chat-ai/history/${sessionId}`);
      } catch (e) {
        // Ignora errori
      }
    }
    setMessages([]);
    setShowSuggestions(true);
    localStorage.removeItem('ai_chat_session');
    setSessionId(null);
  };

  const navigateToPage = (page) => {
    if (page) {
      window.location.href = page;
    }
  };

  // Formatta il messaggio con markdown semplice
  const formatMessage = (text) => {
    if (!text) return '';
    
    // Bold
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code
    formatted = formatted.replace(/`(.*?)`/g, '<code style="background:#f3f4f6;padding:2px 4px;border-radius:3px">$1</code>');
    // Links/paths
    formatted = formatted.replace(/\/([\w-]+)/g, '<span style="color:#3b82f6;cursor:pointer" class="ai-link">/$1</span>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return formatted;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="ai-assistant-toggle"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          zIndex: 9999
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 25px rgba(99, 102, 241, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
        }}
      >
        <span style={{ fontSize: 28 }}>🤖</span>
      </button>
    );
  }

  return (
    <div
      data-testid="ai-assistant-widget"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 380,
        height: 550,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
              Assistente Contabit
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: aiStatus.enabled ? '#4ade80' : '#ef4444'
              }}></span>
              {aiStatus.enabled ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={clearHistory}
            title="Nuova conversazione"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 6,
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'white',
              fontSize: 12
            }}
          >
            🔄
          </button>
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
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        background: '#f8fafc'
      }}>
        {/* Suggerimenti iniziali */}
        {showSuggestions && messages.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              textAlign: 'center', 
              marginBottom: 16,
              color: '#64748b',
              fontSize: 13
            }}>
              Ciao! Come posso aiutarti oggi?
            </div>
            
            {suggestions.slice(0, 3).map((cat, idx) => (
              <div key={idx} style={{ marginBottom: 12 }}>
                <div style={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#94a3b8',
                  marginBottom: 6,
                  textTransform: 'uppercase'
                }}>
                  {cat.category}
                </div>
                {cat.questions.slice(0, 2).map((q, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => sendMessage(q)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      marginBottom: 6,
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#334155',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f1f5f9';
                      e.target.style.borderColor = '#6366f1';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Messaggi */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.type === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.type === 'user' 
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                : msg.isError ? '#fee2e2' : 'white',
              color: msg.type === 'user' ? 'white' : msg.isError ? '#dc2626' : '#1e293b',
              fontSize: 13,
              lineHeight: 1.5,
              boxShadow: msg.type === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
              <div 
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                onClick={(e) => {
                  if (e.target.classList.contains('ai-link')) {
                    navigateToPage(e.target.textContent);
                  }
                }}
              />
              
              {/* Pulsante navigazione suggerita */}
              {msg.suggestedPage && (
                <button
                  onClick={() => navigateToPage(msg.suggestedPage)}
                  style={{
                    marginTop: 8,
                    padding: '6px 12px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  🔗 Vai a {msg.suggestedPage}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 12
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'white',
              borderRadius: '14px 14px 14px 4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#6366f1',
                      animation: `bounce 1s infinite ${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: 12,
        borderTop: '1px solid #e2e8f0',
        background: 'white'
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end'
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scrivi una domanda..."
            disabled={loading || !aiStatus.enabled}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              fontSize: 14,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              maxHeight: 100,
              overflow: 'auto'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || !aiStatus.enabled}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: input.trim() && !loading 
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                : '#e2e8f0',
              color: 'white',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              transition: 'all 0.2s'
            }}
          >
            ➤
          </button>
        </div>
        
        {!aiStatus.enabled && (
          <div style={{
            marginTop: 8,
            padding: 8,
            background: '#fef3c7',
            borderRadius: 6,
            fontSize: 11,
            color: '#92400e',
            textAlign: 'center'
          }}>
            ⚠️ Assistente AI non disponibile
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
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}
