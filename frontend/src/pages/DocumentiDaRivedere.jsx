import React, { useState, useEffect, useCallback } from 'react';
import { PageInfoCard } from '../components/PageInfoCard';
import { 
  AlertCircle, CheckCircle, Eye, RefreshCw, Filter, 
  FileText, Brain, Building2, Tag, Clock, ChevronDown
} from 'lucide-react';
import api from '../api';

export default function DocumentiDaRivedere() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [filterType, setFilterType] = useState('');
  const [centriCosto, setCentriCosto] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [classifyingId, setClassifyingId] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterType ? `?tipo=${filterType}` : '';
      const res = await api.get(`/api/ai-parser/da-rivedere${params}`);
      setDocuments(res.data.documents || []);
      setStats(res.data.by_type || {});
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const fetchCentriCosto = async () => {
    try {
      const res = await api.get('/api/centri-costo');
      setCentriCosto(res.data || []);
    } catch (error) {
      console.error('Errore caricamento centri costo:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/ai-parser/statistiche');
      setStats(prev => ({ ...prev, ...res.data }));
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCentriCosto();
    fetchStats();
  }, [fetchDocuments]);

  const handleClassify = async (docId, centroCostoId) => {
    setClassifyingId(docId);
    try {
      const formData = new FormData();
      formData.append('centro_costo_id', centroCostoId);
      
      await api.put(`/api/ai-parser/da-rivedere/${docId}/classifica`, formData);
      
      // Rimuovi dalla lista
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setSelectedDoc(null);
    } catch (error) {
      console.error('Errore classificazione:', error);
    } finally {
      setClassifyingId(null);
    }
  };

  const handleProcessBatch = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/api/ai-parser/process-email-batch?limit=20');
      alert(`Processati ${res.data.processed} documenti. Successi: ${res.data.success}, Errori: ${res.data.failed}`);
      fetchDocuments();
      fetchStats();
    } catch (error) {
      console.error('Errore processing:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      fattura: { bg: '#dbeafe', color: '#2563eb' },
      f24: { bg: '#fef3c7', color: '#d97706' },
      busta_paga: { bg: '#dcfce7', color: '#16a34a' },
      altro: { bg: '#f3e8ff', color: '#9333ea' }
    };
    return colors[type] || colors.altro;
  };

  const getTypeLabel = (type) => {
    const labels = {
      fattura: 'Fattura',
      f24: 'F24',
      busta_paga: 'Busta Paga',
      altro: 'Altro'
    };
    return labels[type] || type;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <PageInfoCard
        icon={<AlertCircle size={24} color="#f59e0b" />}
        title="Documenti Da Rivedere"
        description="Documenti che richiedono classificazione manuale o verifica dei dati estratti dall'AI."
      />

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem',
        marginTop: '1.5rem'
      }}>
        <StatCard 
          label="Da Rivedere" 
          value={stats.needs_review || documents.length} 
          color="#f59e0b"
          icon={<AlertCircle size={20} />}
        />
        <StatCard 
          label="Processati AI" 
          value={stats.total_parsed || 0} 
          color="#2563eb"
          icon={<Brain size={20} />}
        />
        <StatCard 
          label="Classificati Auto" 
          value={stats.auto_classified || 0} 
          color="#16a34a"
          icon={<CheckCircle size={20} />}
        />
        <StatCard 
          label="In Attesa" 
          value={stats.pending_processing || 0} 
          color="#8b5cf6"
          icon={<Clock size={20} />}
        />
        <StatCard 
          label="Tasso Classif." 
          value={`${stats.classification_rate || 0}%`} 
          color="#06b6d4"
          icon={<Tag size={20} />}
        />
      </div>

      {/* Actions Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Filter size={20} color="#64748b" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.9rem'
            }}
          >
            <option value="">Tutti i tipi</option>
            <option value="fattura">Fatture</option>
            <option value="f24">F24</option>
            <option value="busta_paga">Buste Paga</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleProcessBatch}
            disabled={processing}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: processing ? '#94a3b8' : '#8b5cf6',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: processing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Brain size={16} />
            {processing ? 'Elaborazione...' : 'Processa Email'}
          </button>
          
          <button
            onClick={fetchDocuments}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: 'white',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div style={{
        marginTop: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Caricamento...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <CheckCircle size={48} color="#16a34a" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#16a34a', fontWeight: 600 }}>Nessun documento da rivedere</p>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Tutti i documenti sono stati classificati correttamente.</p>
          </div>
        ) : (
          <div>
            {documents.map(doc => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                centriCosto={centriCosto}
                onClassify={handleClassify}
                classifying={classifyingId === doc.id}
                getTypeColor={getTypeColor}
                getTypeLabel={getTypeLabel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      padding: '1rem',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

function DocumentRow({ doc, centriCosto, onClassify, classifying, getTypeColor, getTypeLabel }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCdc, setSelectedCdc] = useState('');
  
  const typeStyle = getTypeColor(doc.ai_parsed_type);
  
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <div 
        style={{
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          alignItems: 'center',
          gap: '1rem',
          cursor: 'pointer',
          transition: 'background 0.2s',
          ':hover': { background: '#f8fafc' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={18} color="#64748b" />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{doc.filename}</span>
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: typeStyle.bg,
              color: typeStyle.color
            }}>
              {getTypeLabel(doc.ai_parsed_type)}
            </span>
          </div>
          {doc.fornitore_nome && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <Building2 size={14} color="#94a3b8" />
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{doc.fornitore_nome}</span>
            </div>
          )}
        </div>
        
        <div style={{ textAlign: 'right' }}>
          {doc.importo_totale && (
            <span style={{ fontWeight: 600, color: '#1e293b' }}>
              € {doc.importo_totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          )}
          {doc.data_documento && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>{doc.data_documento}</p>
          )}
        </div>
        
        <div>
          {doc.ai_parsing_error ? (
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              background: '#fef2f2',
              color: '#dc2626'
            }}>
              Errore AI
            </span>
          ) : !doc.classificazione_automatica ? (
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              background: '#fef3c7',
              color: '#d97706'
            }}>
              Da classificare
            </span>
          ) : null}
        </div>
        
        <ChevronDown 
          size={20} 
          color="#94a3b8" 
          style={{ 
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
          }} 
        />
      </div>
      
      {expanded && (
        <div style={{ padding: '1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>Dati Estratti</h4>
              <div style={{ fontSize: '0.85rem' }}>
                {doc.ai_parsed_type === 'fattura' && (
                  <>
                    <p><strong>Numero:</strong> {doc.numero_documento || '-'}</p>
                    <p><strong>P.IVA:</strong> {doc.fornitore_piva || '-'}</p>
                    <p><strong>Imponibile:</strong> € {doc.imponibile?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '-'}</p>
                  </>
                )}
                {doc.ai_parsed_type === 'f24' && (
                  <>
                    <p><strong>CF:</strong> {doc.codice_fiscale || '-'}</p>
                    <p><strong>Data Pagamento:</strong> {doc.data_pagamento || '-'}</p>
                    <p><strong>Totale:</strong> € {doc.totale_versato?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '-'}</p>
                  </>
                )}
                {doc.ai_parsed_type === 'busta_paga' && (
                  <>
                    <p><strong>Dipendente:</strong> {doc.dipendente_nome || '-'}</p>
                    <p><strong>Periodo:</strong> {doc.periodo_mese}/{doc.periodo_anno}</p>
                    <p><strong>Netto:</strong> € {doc.netto_pagato?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '-'}</p>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>Classifica Manualmente</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={selectedCdc}
                  onChange={(e) => setSelectedCdc(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="">Seleziona centro di costo...</option>
                  {centriCosto.map(cdc => (
                    <option key={cdc.codice} value={cdc.codice}>{cdc.nome}</option>
                  ))}
                </select>
                <button
                  onClick={() => selectedCdc && onClassify(doc.id, selectedCdc)}
                  disabled={!selectedCdc || classifying}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedCdc && !classifying ? '#16a34a' : '#e2e8f0',
                    color: selectedCdc && !classifying ? 'white' : '#94a3b8',
                    fontWeight: 600,
                    cursor: selectedCdc && !classifying ? 'pointer' : 'not-allowed'
                  }}
                >
                  {classifying ? '...' : 'Classifica'}
                </button>
              </div>
            </div>
          </div>
          
          {doc.ai_parsing_error && (
            <div style={{
              padding: '0.75rem',
              background: '#fef2f2',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#dc2626'
            }}>
              <strong>Errore:</strong> {doc.ai_parsing_error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
