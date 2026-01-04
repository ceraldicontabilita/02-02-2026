import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

/**
 * Vista Mobile Semplificata per Prima Nota
 * - Layout compatto, tutto visibile sullo schermo
 * - Card grosse per selezione tipo
 * - Tasto salva sempre visibile
 */
export default function PrimaNotaMobile() {
  const today = new Date().toISOString().split('T')[0];
  
  const [selectedType, setSelectedType] = useState('pos');
  const [form, setForm] = useState({
    data: today,
    importo: '',
    pos1: '',
    pos2: '',
    pos3: '',
    descrizione: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saldi, setSaldi] = useState({ cassa: 0, entrate: 0, uscite: 0 });
  const [loadingSaldi, setLoadingSaldi] = useState(true);

  const loadSaldi = useCallback(async () => {
    try {
      setLoadingSaldi(true);
      const currentYear = new Date().getFullYear();
      const res = await api.get(`/api/prima-nota/cassa?anno=${currentYear}&limit=1000`);
      setSaldi({
        cassa: res.data.saldo || 0,
        entrate: res.data.totale_entrate || 0,
        uscite: res.data.totale_uscite || 0
      });
    } catch (e) {
      console.error('Error loading saldi:', e);
    } finally {
      setLoadingSaldi(false);
    }
  }, []);

  useEffect(() => {
    loadSaldi();
  }, [loadSaldi]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const resetForm = () => {
    setForm({ data: today, importo: '', pos1: '', pos2: '', pos3: '', descrizione: '' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let payload;
      
      switch (selectedType) {
        case 'pos':
          const totalePOS = (parseFloat(form.pos1) || 0) + (parseFloat(form.pos2) || 0) + (parseFloat(form.pos3) || 0);
          if (totalePOS === 0) { showMessage('Inserisci almeno un POS', 'error'); setSaving(false); return; }
          payload = { data: form.data, tipo: 'uscita', importo: totalePOS, descrizione: `POS (€${form.pos1||0} + €${form.pos2||0} + €${form.pos3||0})`, categoria: 'POS', source: 'mobile' };
          break;
        case 'versamento':
          if (!form.importo) { showMessage('Inserisci importo', 'error'); setSaving(false); return; }
          payload = { data: form.data, tipo: 'uscita', importo: parseFloat(form.importo), descrizione: form.descrizione || 'Versamento banca', categoria: 'Versamento', source: 'mobile' };
          break;
        case 'corrispettivo':
          if (!form.importo) { showMessage('Inserisci importo', 'error'); setSaving(false); return; }
          payload = { data: form.data, tipo: 'entrata', importo: parseFloat(form.importo), descrizione: form.descrizione || 'Corrispettivo', categoria: 'Corrispettivi', source: 'mobile' };
          break;
        case 'altro_entrata':
          if (!form.importo) { showMessage('Inserisci importo', 'error'); setSaving(false); return; }
          payload = { data: form.data, tipo: 'entrata', importo: parseFloat(form.importo), descrizione: form.descrizione || 'Altra entrata', categoria: 'Altro', source: 'mobile' };
          break;
        case 'altro_uscita':
          if (!form.importo) { showMessage('Inserisci importo', 'error'); setSaving(false); return; }
          payload = { data: form.data, tipo: 'uscita', importo: parseFloat(form.importo), descrizione: form.descrizione || 'Altra uscita', categoria: 'Altro', source: 'mobile' };
          break;
        default: setSaving(false); return;
      }

      await api.post('/api/prima-nota/cassa', payload);
      showMessage('✅ Salvato!');
      resetForm();
      loadSaldi();
    } catch (e) {
      showMessage(`❌ ${e.response?.data?.detail || e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0);

  const TIPI = [
    { value: 'pos', label: 'POS', icon: '💳', color: '#2196f3' },
    { value: 'versamento', label: 'Versam.', icon: '🏦', color: '#9c27b0' },
    { value: 'corrispettivo', label: 'Incasso', icon: '💵', color: '#4caf50' },
    { value: 'altro_entrata', label: 'Entrata', icon: '📥', color: '#00bcd4' },
    { value: 'altro_uscita', label: 'Uscita', icon: '📤', color: '#ff5722' }
  ];

  const currentTipo = TIPI.find(t => t.value === selectedType);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f7fa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header compatto */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        color: 'white',
        padding: '10px 12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>📒 Prima Nota</span>
          <input
            type="date"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 13 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 0' }}>
            <div style={{ opacity: 0.8 }}>Entrate</div>
            <div style={{ fontWeight: 'bold', color: '#90EE90' }}>{loadingSaldi ? '...' : formatCurrency(saldi.entrate)}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 0' }}>
            <div style={{ opacity: 0.8 }}>Uscite</div>
            <div style={{ fontWeight: 'bold', color: '#FFB6C1' }}>{loadingSaldi ? '...' : formatCurrency(saldi.uscite)}</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 0' }}>
            <div style={{ opacity: 0.8 }}>Saldo</div>
            <div style={{ fontWeight: 'bold', color: saldi.cassa >= 0 ? '#90EE90' : '#FFB6C1' }}>{loadingSaldi ? '...' : formatCurrency(saldi.cassa)}</div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          margin: '8px 12px',
          padding: 10,
          borderRadius: 8,
          background: message.type === 'error' ? '#ffebee' : '#e8f5e9',
          color: message.type === 'error' ? '#c62828' : '#2e7d32',
          fontWeight: 'bold',
          fontSize: 13,
          textAlign: 'center'
        }}>
          {message.text}
        </div>
      )}

      {/* Content area - scrollabile */}
      <div style={{ flex: 1, padding: '8px 12px', overflow: 'auto' }}>
        {/* Tipo Selector - 5 card in 2 righe */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {TIPI.slice(0, 3).map(tipo => (
              <button
                key={tipo.value}
                onClick={() => { setSelectedType(tipo.value); resetForm(); }}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  border: selectedType === tipo.value ? `2px solid ${tipo.color}` : '1px solid #ddd',
                  borderRadius: 10,
                  background: selectedType === tipo.value ? `${tipo.color}15` : 'white',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 22 }}>{tipo.icon}</div>
                <div style={{ fontWeight: 'bold', color: tipo.color, fontSize: 11 }}>{tipo.label}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIPI.slice(3).map(tipo => (
              <button
                key={tipo.value}
                onClick={() => { setSelectedType(tipo.value); resetForm(); }}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  border: selectedType === tipo.value ? `2px solid ${tipo.color}` : '1px solid #ddd',
                  borderRadius: 10,
                  background: selectedType === tipo.value ? `${tipo.color}15` : 'white',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: 18 }}>{tipo.icon}</div>
                <div style={{ fontWeight: 'bold', color: tipo.color, fontSize: 11 }}>{tipo.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        {selectedType === 'pos' ? (
          /* POS - 3 campi in riga */
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {['pos1', 'pos2', 'pos3'].map((k, i) => (
                <div key={k} style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: '#666', display: 'block', marginBottom: 2, textAlign: 'center' }}>POS {i+1}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 4px',
                      fontSize: 20,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      borderRadius: 10,
                      border: '2px solid #2196f3',
                      color: '#2196f3'
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ background: '#e3f2fd', padding: 8, borderRadius: 8, textAlign: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>Totale: </span>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: '#1565c0' }}>
                {formatCurrency((parseFloat(form.pos1)||0) + (parseFloat(form.pos2)||0) + (parseFloat(form.pos3)||0))}
              </span>
            </div>
          </div>
        ) : (
          /* Altri tipi - campo singolo grande */
          <div>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={form.importo}
              onChange={(e) => setForm({ ...form, importo: e.target.value })}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: 32,
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: 12,
                border: `2px solid ${currentTipo?.color}`,
                color: currentTipo?.color,
                marginBottom: 8
              }}
            />
            <input
              type="text"
              placeholder="Note (opzionale)"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                borderRadius: 10,
                border: '1px solid #ddd',
                marginBottom: 8
              }}
            />
          </div>
        )}
      </div>

      {/* Bottone SALVA - fisso in basso, sempre visibile */}
      <div style={{ 
        padding: '10px 12px 20px 12px',
        background: 'white',
        borderTop: '1px solid #eee',
        position: 'sticky',
        bottom: 56, // sopra la navbar
        zIndex: 50
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: 18,
            fontWeight: 'bold',
            borderRadius: 12,
            border: 'none',
            background: saving ? '#ccc' : (currentTipo?.color || '#2196f3'),
            color: 'white',
            cursor: saving ? 'wait' : 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
          }}
        >
          {saving ? '⏳ Salvataggio...' : `✓ SALVA ${currentTipo?.label?.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
