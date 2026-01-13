import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { MessageCircle, X, Send, Mic, MicOff, Loader2, Volume2, Trash2 } from 'lucide-react';

export default function ChatAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ciao! Sono il tuo assistente AI. Puoi chiedermi informazioni su fatture, stipendi, dipendenti, F24 e molto altro. Prova a dire "Qual era l\'ultima fattura di Naturissima?" o "Ho pagato il salario a Moscato?"' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  const sendTextMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const question = inputText.trim();
    setInputText('');
    setError(null);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);
    
    try {
      // Ottieni anno selezionato dal localStorage (impostato dalla AnnoContext)
      const selectedYear = localStorage.getItem('annoGlobale') || new Date().getFullYear();
      
      const res = await api.post('/api/chat-ai/ask', {
        question,
        session_id: sessionId,
        anno: parseInt(selectedYear)
      });
      
      if (res.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: res.data.answer,
          dataFound: res.data.data_found
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: res.data.error || 'Mi dispiace, si è verificato un errore.',
          isError: true
        }]);
      }
    } catch (e) {
      console.error('Errore chat:', e);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Mi dispiace, si è verificato un errore di connessione.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendVoiceMessage(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Errore accesso microfono:', e);
      setError('Non riesco ad accedere al microfono. Verifica i permessi del browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    setIsLoading(true);
    
    // Add placeholder message
    setMessages(prev => [...prev, { role: 'user', content: '🎤 Messaggio vocale...', isVoice: true }]);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      if (sessionId) {
        formData.append('session_id', sessionId);
      }
      
      const res = await api.post('/api/chat-ai/ask-voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update the last user message with transcription
      setMessages(prev => {
        const updated = [...prev];
        const lastUserIdx = updated.map(m => m.role).lastIndexOf('user');
        if (lastUserIdx >= 0 && res.data.transcription) {
          updated[lastUserIdx] = { 
            role: 'user', 
            content: res.data.transcription,
            isVoice: true 
          };
        }
        return updated;
      });
      
      if (res.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: res.data.answer,
          dataFound: res.data.data_found
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: res.data.error || 'Non sono riuscito a capire. Riprova.',
          isError: true
        }]);
      }
    } catch (e) {
      console.error('Errore invio audio:', e);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Errore nell\'elaborazione dell\'audio. Riprova.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Chat cancellata. Come posso aiutarti?' }
    ]);
    setSessionId(`chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <>
      {/* Floating Button - Posizionato più in alto per non coprire il menu mobile */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '100px', // Più in alto per non coprire la nav mobile
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 998, // Sotto il menu mobile (1000)
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(99, 102, 241, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
          }}
          data-testid="chat-ai-button"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* Chat Window - Responsive */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px', // Più in alto su mobile
            right: '16px',
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(500px, calc(100vh - 180px))',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 999,
            resize: 'both', // Permette ridimensionamento
            minWidth: '300px',
            minHeight: '300px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 120px)'
          }}
          data-testid="chat-ai-window"
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={20} />
                Assistente AI
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
                Chiedi qualsiasi cosa sui tuoi dati
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={clearChat}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white'
                }}
                title="Cancella chat"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f8fafc'
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                    : msg.isError ? '#fee2e2' : 'white',
                  color: msg.role === 'user' ? 'white' : msg.isError ? '#dc2626' : '#1e293b',
                  boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.isVoice && msg.role === 'user' && (
                    <span style={{ marginRight: '6px' }}>🎤</span>
                  )}
                  {msg.content}
                  {msg.dataFound && Object.keys(msg.dataFound).length > 0 && (
                    <div style={{ 
                      marginTop: '8px', 
                      paddingTop: '8px', 
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '11px',
                      color: '#64748b'
                    }}>
                      📊 Dati trovati: {Object.entries(msg.dataFound).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#64748b'
                }}>
                  <Loader2 size={16} className="animate-spin" />
                  Sto elaborando...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 16px',
              background: '#fee2e2',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              {error}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e2e8f0',
            background: 'white',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end'
          }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Scrivi o usa il microfono..."
              disabled={isLoading || isRecording}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '14px',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              rows={1}
              data-testid="chat-input"
            />
            
            {/* Voice Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                background: isRecording ? '#ef4444' : '#f1f5f9',
                color: isRecording ? 'white' : '#64748b',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title={isRecording ? 'Ferma registrazione' : 'Inizia registrazione vocale'}
              data-testid="voice-button"
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            {/* Send Button */}
            <button
              onClick={sendTextMessage}
              disabled={!inputText.trim() || isLoading}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                border: 'none',
                background: inputText.trim() && !isLoading 
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                  : '#e2e8f0',
                color: inputText.trim() && !isLoading ? 'white' : '#94a3b8',
                cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              data-testid="send-button"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
