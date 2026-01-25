import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  FileText, Search, CheckCircle, XCircle, ChevronRight, 
  Calendar, Building, User, Car, Euro, Folder, Plus,
  ArrowLeft, Trash2, Eye, Download
} from 'lucide-react';

// Stili inline coerenti con InserimentoRapido
const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-primary, #f8fafc)',
    padding: '12px',
    paddingBottom: '80px'
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    color: 'white'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0
  },
  headerSub: {
    fontSize: '13px',
    opacity: 0.9,
    marginTop: '4px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '12px'
  },
  statBox: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '10px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700'
  },
  statLabel: {
    fontSize: '11px',
    opacity: 0.9
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '12px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#1e293b'
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  input: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none'
  },
  btn: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  },
  btnPrimary: {
    background: '#2563eb',
    color: 'white'
  },
  btnSuccess: {
    background: '#22c55e',
    color: 'white'
  },
  btnDanger: {
    background: '#ef4444',
    color: 'white'
  },
  btnOutline: {
    background: 'white',
    color: '#475569',
    border: '1px solid #e2e8f0'
  },
  docItem: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  docItemActive: {
    borderColor: '#2563eb',
    background: '#eff6ff'
  },
  docName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  docMeta: {
    fontSize: '12px',
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '500',
    borderRadius: '4px',
    marginRight: '4px'
  },
  badgeBlue: {
    background: '#dbeafe',
    color: '#1d4ed8'
  },
  badgeGreen: {
    background: '#dcfce7',
    color: '#15803d'
  },
  badgeOrange: {
    background: '#fed7aa',
    color: '#c2410c'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#475569'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    marginBottom: '12px'
  },
  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px'
  },
  infoTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: '8px'
  },
  infoItem: {
    fontSize: '12px',
    color: '#475569',
    marginBottom: '4px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '13px',
    fontFamily: 'monospace',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px'
  },
  btnRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8'
  },
  listContainer: {
    maxHeight: '400px',
    overflowY: 'auto'
  }
};

const DocumentiNonAssociati = () => {
  const navigate = useNavigate();
  const [documenti, setDocumenti] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [collezioniDisponibili, setCollezioniDisponibili] = useState([]);
  const [associazioneForm, setAssociazioneForm] = useState({
    collezione: '',
    campiJson: ''
  });
  const [nuovaCollezione, setNuovaCollezione] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes, collRes] = await Promise.all([
        api.get('/api/documenti-non-associati/lista?limit=100'),
        api.get('/api/documenti-non-associati/statistiche'),
        api.get('/api/documenti-non-associati/collezioni-disponibili')
      ]);
      setDocumenti(docsRes.data.documenti || []);
      setStats(statsRes.data);
      setCollezioniDisponibili(collRes.data || []);
    } catch (err) {
      console.error('Errore caricamento:', err);
      setMessage({ type: 'error', text: 'Errore caricamento dati' });
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/documenti-non-associati/lista?search=${encodeURIComponent(search)}&limit=100`);
      setDocumenti(res.data.documenti || []);
    } catch (err) {
      console.error('Errore ricerca:', err);
    }
    setLoading(false);
  };

  const handleAssocia = async () => {
    if (!selectedDoc) return;
    
    const collezione = nuovaCollezione || associazioneForm.collezione;
    if (!collezione) {
      setMessage({ type: 'error', text: 'Seleziona una collezione' });
      return;
    }
    
    try {
      let campi = {};
      if (associazioneForm.campiJson) {
        try {
          campi = JSON.parse(associazioneForm.campiJson);
        } catch {
          setMessage({ type: 'error', text: 'JSON campi non valido' });
          return;
        }
      }
      
      // Aggiungi campi dalla proposta se presenti
      if (selectedDoc.proposta) {
        if (selectedDoc.proposta.anno_suggerito) campi.anno = selectedDoc.proposta.anno_suggerito;
        if (selectedDoc.proposta.mese_suggerito) campi.mese = selectedDoc.proposta.mese_suggerito;
      }
      
      const payload = {
        documento_id: selectedDoc.id,
        collezione_target: collezione,
        crea_nuovo: true,
        campi_associazione: campi
      };
      
      await api.post('/api/documenti-non-associati/associa', payload);
      setMessage({ type: 'success', text: 'Documento associato!' });
      setSelectedDoc(null);
      setNuovaCollezione('');
      setAssociazioneForm({ collezione: '', campiJson: '' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Errore associazione' });
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Eliminare questo documento?')) return;
    
    try {
      await api.delete(`/api/documenti-non-associati/${docId}`);
      setMessage({ type: 'success', text: 'Documento eliminato' });
      setSelectedDoc(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Errore eliminazione' });
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'fattura': return '#3b82f6';
      case 'f24': return '#ef4444';
      case 'busta_paga': return '#22c55e';
      case 'verbale': return '#f97316';
      case 'cartella': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={styles.headerTitle}>Documenti Non Associati</h1>
            <p style={styles.headerSub}>Gestisci e associa i documenti scaricati</p>
          </div>
        </div>
        
        {stats && (
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.totale}</div>
              <div style={styles.statLabel}>Totali</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.associati}</div>
              <div style={styles.statLabel}>Associati</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.da_associare}</div>
              <div style={styles.statLabel}>Da fare</div>
            </div>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div style={{
          ...styles.card,
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          borderLeft: `4px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`
        }}>
          <span style={{ color: message.type === 'success' ? '#15803d' : '#dc2626' }}>
            {message.text}
          </span>
        </div>
      )}

      {/* Search */}
      <div style={styles.card}>
        <div style={styles.searchRow}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome file..."
            style={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} style={{ ...styles.btn, ...styles.btnPrimary }}>
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '1fr 1fr' : '1fr', gap: '12px' }}>
        {/* Document List */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <FileText size={18} />
            Documenti ({documenti.length})
          </div>
          
          <div style={styles.listContainer}>
            {loading ? (
              <div style={styles.emptyState}>Caricamento...</div>
            ) : documenti.length === 0 ? (
              <div style={styles.emptyState}>
                <Folder size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <div>Nessun documento</div>
              </div>
            ) : (
              documenti.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  style={{
                    ...styles.docItem,
                    ...(selectedDoc?.id === doc.id ? styles.docItemActive : {})
                  }}
                >
                  <div style={styles.docName}>{doc.filename}</div>
                  <div style={styles.docMeta}>{doc.email_subject}</div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{
                      ...styles.badge,
                      background: getCategoryColor(doc.category) + '20',
                      color: getCategoryColor(doc.category)
                    }}>
                      {doc.category || 'altro'}
                    </span>
                    {doc.proposta?.anno_suggerito && (
                      <span style={{ ...styles.badge, ...styles.badgeBlue }}>
                        {doc.proposta.anno_suggerito}
                      </span>
                    )}
                    {doc.proposta?.mese_suggerito && (
                      <span style={{ ...styles.badge, ...styles.badgeGreen }}>
                        Mese {doc.proposta.mese_suggerito}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedDoc && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <Eye size={18} />
              Dettaglio
            </div>
            
            {/* PULSANTE VISUALIZZA PDF - IMPORTANTE */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => {
                  const url = `${process.env.REACT_APP_BACKEND_URL}/api/documenti-non-associati/pdf/${selectedDoc.id}`;
                  window.open(url, '_blank');
                }}
                style={{ 
                  ...styles.btn, 
                  ...styles.btnPrimary, 
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px'
                }}
                data-testid="view-pdf-btn"
              >
                <Eye size={20} /> Apri PDF per vedere il contenuto
              </button>
            </div>
            
            {/* File Info */}
            <div style={{ marginBottom: '12px' }}>
              <div style={styles.label}>File</div>
              <div style={{ fontSize: '14px', fontWeight: '500', wordBreak: 'break-all' }}>
                {selectedDoc.filename}
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={styles.label}>Categoria rilevata</div>
              <div style={{ fontSize: '14px' }}>{selectedDoc.category || 'Non classificato'}</div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={styles.label}>Dimensione</div>
              <div style={{ fontSize: '14px' }}>{Math.round((selectedDoc.size_bytes || selectedDoc.pdf_size || 0) / 1024)} KB</div>
            </div>

            {/* AI Suggestion */}
            {selectedDoc.proposta && (selectedDoc.proposta.anno_suggerito || selectedDoc.proposta.tipo_suggerito) && (
              <div style={styles.infoBox}>
                <div style={styles.infoTitle}>💡 Proposta Intelligente</div>
                {selectedDoc.proposta.tipo_suggerito && (
                  <div style={styles.infoItem}>Tipo: <strong>{selectedDoc.proposta.tipo_suggerito}</strong></div>
                )}
                {selectedDoc.proposta.anno_suggerito && (
                  <div style={styles.infoItem}>Anno: <strong>{selectedDoc.proposta.anno_suggerito}</strong></div>
                )}
                {selectedDoc.proposta.mese_suggerito && (
                  <div style={styles.infoItem}>Mese: <strong>{selectedDoc.proposta.mese_suggerito}</strong></div>
                )}
                {selectedDoc.proposta.entita_suggerita && (
                  <div style={styles.infoItem}>Entità: <strong>{selectedDoc.proposta.entita_suggerita}</strong></div>
                )}
              </div>
            )}

            {/* Association Form */}
            <div style={styles.label}>Associa a collezione</div>
            <select
              value={associazioneForm.collezione}
              onChange={(e) => setAssociazioneForm({...associazioneForm, collezione: e.target.value})}
              style={styles.select}
            >
              <option value="">-- Seleziona --</option>
              {collezioniDisponibili.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div style={styles.label}>Oppure crea nuova collezione</div>
            <input
              type="text"
              value={nuovaCollezione}
              onChange={(e) => setNuovaCollezione(e.target.value)}
              placeholder="nome_collezione"
              style={{ ...styles.input, marginBottom: '12px' }}
            />

            <div style={styles.label}>Campi aggiuntivi (JSON)</div>
            <textarea
              value={associazioneForm.campiJson}
              onChange={(e) => setAssociazioneForm({...associazioneForm, campiJson: e.target.value})}
              placeholder='{"anno": 2024, "importo": 150.00}'
              style={styles.textarea}
            />

            <div style={styles.btnRow}>
              <button
                onClick={handleAssocia}
                disabled={!associazioneForm.collezione && !nuovaCollezione}
                style={{ 
                  ...styles.btn, 
                  ...styles.btnSuccess, 
                  flex: 1,
                  opacity: (!associazioneForm.collezione && !nuovaCollezione) ? 0.5 : 1
                }}
              >
                <CheckCircle size={18} /> Associa
              </button>
              <button
                onClick={() => handleDelete(selectedDoc.id)}
                style={{ ...styles.btn, ...styles.btnDanger }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentiNonAssociati;
