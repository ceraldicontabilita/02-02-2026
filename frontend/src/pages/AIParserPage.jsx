import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageInfoCard } from '../components/PageInfoCard';
import { 
  Upload, FileText, Brain, CheckCircle, AlertCircle, 
  RefreshCw, Eye, Download, Loader2, FileType
} from 'lucide-react';
import api from '../api';
import { STYLES, COLORS, button, badge, formatEuro, formatDateIT } from '../lib/utils';

// Componente per mostrare i dati estratti
function ParsedDataViewer({ data, type }) {
  if (!data || !data.success) {
    return (
      <div style={{
        padding: '2rem',
        background: '#fef2f2',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <p style={{ color: '#dc2626', fontWeight: 600 }}>
          {data?.error || 'Errore nel parsing del documento'}
        </p>
        {data?.raw_response && (
          <pre style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#fee2e2', 
            borderRadius: '8px',
            fontSize: '0.75rem',
            textAlign: 'left',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {data.raw_response}
          </pre>
        )}
      </div>
    );
  }

  // Render specifico per tipo documento
  if (type === 'fattura' || data.tipo_documento === 'fattura') {
    return <FatturaViewer data={data} />;
  }
  if (type === 'f24' || data.tipo_documento === 'f24' || data.tipo_documento === 'quietanza_f24') {
    return <F24Viewer data={data} />;
  }
  if (type === 'busta_paga' || data.tipo_documento === 'busta_paga') {
    return <BustaPagaViewer data={data} />;
  }

  // Generico
  return (
    <pre style={{ 
      padding: '1rem', 
      background: '#f8fafc', 
      borderRadius: '8px',
      fontSize: '0.8rem',
      overflow: 'auto',
      maxHeight: '500px'
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// Viewer per Fatture
function FatturaViewer({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        <InfoCard 
          title="Numero Fattura" 
          value={data.numero_fattura} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Data" 
          value={data.data_fattura} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Totale" 
          value={`€ ${data.totali?.totale_fattura?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={<FileText size={20} />}
          highlight
        />
      </div>

      {/* Fornitore */}
      <Section title="Fornitore">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <Field label="Denominazione" value={data.fornitore?.denominazione} />
          <Field label="P.IVA" value={data.fornitore?.partita_iva} />
          <Field label="Codice Fiscale" value={data.fornitore?.codice_fiscale} />
          <Field label="Indirizzo" value={data.fornitore?.indirizzo} />
          <Field label="CAP" value={data.fornitore?.cap} />
          <Field label="Città" value={data.fornitore?.citta} />
        </div>
      </Section>

      {/* Righe */}
      {data.righe?.length > 0 && (
        <Section title="Dettaglio Prodotti/Servizi">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Descrizione</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Qtà</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Prezzo Unit.</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IVA %</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Totale</th>
              </tr>
            </thead>
            <tbody>
              {data.righe.map((riga, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem' }}>{riga.descrizione}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{riga.quantita}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {riga.prezzo_unitario?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{riga.aliquota_iva}%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    € {riga.prezzo_totale?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Totali */}
      <Section title="Totali">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '300px', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Imponibile:</span>
            <span>€ {data.totali?.imponibile?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>IVA:</span>
            <span>€ {data.totali?.iva?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', paddingTop: '0.5rem', borderTop: '2px solid #e2e8f0' }}>
            <span>Totale:</span>
            <span style={{ color: '#059669' }}>€ {data.totali?.totale_fattura?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </Section>

      {/* Note */}
      {data.note && (
        <Section title="Note">
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{data.note}</p>
        </Section>
      )}
    </div>
  );
}

// Viewer per F24
function F24Viewer({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <InfoCard 
          title="Data Pagamento" 
          value={data.data_pagamento} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Ragione Sociale" 
          value={data.ragione_sociale} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Codice Fiscale" 
          value={data.codice_fiscale} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Totale Versato" 
          value={`€ ${data.totali?.totale_debito?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={<FileText size={20} />}
          highlight
        />
      </div>

      {/* Sezione Erario */}
      {data.sezione_erario?.length > 0 && (
        <Section title="Sezione Erario">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#fef3c7' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Cod. Tributo</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Descrizione</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Periodo</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Debito</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Credito</th>
              </tr>
            </thead>
            <tbody>
              {data.sezione_erario.map((trib, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{trib.codice_tributo}</td>
                  <td style={{ padding: '0.75rem' }}>{trib.descrizione || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{trib.periodo_riferimento}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>
                    {trib.importo_debito ? `€ ${trib.importo_debito.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669' }}>
                    {trib.importo_credito ? `€ ${trib.importo_credito.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Sezione INPS */}
      {data.sezione_inps?.length > 0 && (
        <Section title="Sezione INPS">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#dbeafe' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Causale</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Matricola</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Periodo</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Importo</th>
              </tr>
            </thead>
            <tbody>
              {data.sezione_inps.map((contr, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{contr.causale}</td>
                  <td style={{ padding: '0.75rem' }}>{contr.matricola}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{contr.periodo_riferimento}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    € {contr.importo_debito?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Banca */}
      {data.banca && (
        <Section title="Informazioni Banca">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <Field label="Banca" value={data.banca.nome} />
            <Field label="ABI" value={data.banca.abi} />
            <Field label="CAB" value={data.banca.cab} />
          </div>
        </Section>
      )}
    </div>
  );
}

// Viewer per Busta Paga
function BustaPagaViewer({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <InfoCard 
          title="Dipendente" 
          value={`${data.dipendente?.nome} ${data.dipendente?.cognome}`} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Periodo" 
          value={data.periodo?.descrizione || `${data.periodo?.mese}/${data.periodo?.anno}`} 
          icon={<FileText size={20} />}
        />
        <InfoCard 
          title="Netto Pagato" 
          value={`€ ${data.netto?.netto_pagato?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={<FileText size={20} />}
          highlight
        />
      </div>

      {/* Dipendente */}
      <Section title="Dati Dipendente">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <Field label="Codice Fiscale" value={data.dipendente?.codice_fiscale} />
          <Field label="Matricola" value={data.dipendente?.matricola} />
          <Field label="Qualifica" value={data.dipendente?.qualifica} />
          <Field label="Livello" value={data.dipendente?.livello} />
        </div>
      </Section>

      {/* Retribuzione */}
      <Section title="Retribuzione">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          <Field label="Paga Base" value={`€ ${data.retribuzione?.paga_base?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="Contingenza" value={`€ ${data.retribuzione?.contingenza?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="Superminimo" value={`€ ${data.retribuzione?.superminimo?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="Ore Ordinarie" value={data.retribuzione?.ore_ordinarie} />
          <Field label="Lordo Totale" value={`€ ${data.retribuzione?.lordo_totale?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} highlight />
        </div>
      </Section>

      {/* Trattenute */}
      <Section title="Trattenute">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          <Field label="INPS" value={`€ ${data.trattenute?.inps_dipendente?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="IRPEF" value={`€ ${data.trattenute?.irpef?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="Add. Regionale" value={`€ ${data.trattenute?.addizionale_regionale?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="Add. Comunale" value={`€ ${data.trattenute?.addizionale_comunale?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
          <Field label="Totale Trattenute" value={`€ ${data.trattenute?.totale_trattenute?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} highlight />
        </div>
      </Section>

      {/* Progressivi - Ferie e Permessi */}
      <Section title="Ferie e Permessi">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '8px' }}>
            <h4 style={{ margin: 0, color: '#059669', fontSize: '0.85rem' }}>FERIE</h4>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Maturate: {data.progressivi?.ferie_maturate}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Godute: {data.progressivi?.ferie_godute}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669' }}>Residue: {data.progressivi?.ferie_residue?.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px' }}>
            <h4 style={{ margin: 0, color: '#2563eb', fontSize: '0.85rem' }}>PERMESSI</h4>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Maturati: {data.progressivi?.permessi_maturati}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Goduti: {data.progressivi?.permessi_goduti?.toFixed(2)}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}>Residui: {data.progressivi?.permessi_residui?.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px' }}>
            <h4 style={{ margin: 0, color: '#d97706', fontSize: '0.85rem' }}>TFR</h4>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Quota Mese: € {data.tfr?.quota_mese?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>Accantonato: € {data.tfr?.fondo_accantonato?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Info aggiornamento dipendente */}
      {data.dipendente_aggiornato && (
        <div style={{
          padding: '1rem',
          background: '#ecfdf5',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle size={24} color="#059669" />
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#059669' }}>Scheda Dipendente Aggiornata</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              I progressivi (ferie, permessi, TFR) sono stati aggiornati automaticamente nella scheda del dipendente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Componenti helper
function InfoCard({ title, value, icon, highlight }) {
  return (
    <div style={{
      padding: '1rem',
      background: highlight ? '#ecfdf5' : '#f8fafc',
      borderRadius: '8px',
      border: highlight ? '1px solid #86efac' : '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {icon}
        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: highlight ? '#059669' : '#1e293b' }}>
        {value || '-'}
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{title}</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div>
      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{label}</span>
      <span style={{ 
        fontWeight: highlight ? 700 : 500, 
        color: highlight ? '#059669' : '#1e293b',
        fontSize: highlight ? '1.1rem' : '0.95rem'
      }}>
        {value || '-'}
      </span>
    </div>
  );
}

// Pagina principale
export default function AIParserPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('auto');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleParse = async () => {
    if (!selectedFile) return;

    setParsing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('save_to_db', 'false');

      let endpoint = '/api/ai-parser/parse';
      if (documentType === 'fattura') endpoint = '/api/ai-parser/parse-fattura';
      else if (documentType === 'f24') endpoint = '/api/ai-parser/parse-f24';
      else if (documentType === 'busta_paga') endpoint = '/api/ai-parser/parse-busta-paga';

      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
    } catch (error) {
      console.error('Errore parsing:', error);
      setResult({
        success: false,
        error: error.response?.data?.detail || error.message
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <PageInfoCard
        icon={<Brain size={24} color="#8b5cf6" />}
        title="Lettura Documenti AI"
        description="Carica fatture, F24 o buste paga per estrarre automaticamente tutti i dati usando l'intelligenza artificiale."
      />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: result ? '1fr 2fr' : '1fr',
        gap: '1.5rem',
        marginTop: '1.5rem'
      }}>
        {/* Upload Area */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
            Carica Documento
          </h2>

          {/* Tipo documento */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Tipo Documento
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.95rem',
                background: 'white'
              }}
            >
              <option value="auto">Rilevamento Automatico</option>
              <option value="fattura">Fattura</option>
              <option value="f24">F24</option>
              <option value="busta_paga">Busta Paga</option>
            </select>
          </div>

          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? '#8b5cf6' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              background: dragActive ? '#faf5ff' : '#fafafa',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            
            {selectedFile ? (
              <div>
                <FileType size={48} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{selectedFile.name}</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <Upload size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>
                  Trascina qui il file o clicca per selezionare
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  PDF, PNG, JPG supportati
                </p>
              </div>
            )}
          </div>

          {/* Parse button */}
          <button
            onClick={handleParse}
            disabled={!selectedFile || parsing}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '10px',
              border: 'none',
              background: selectedFile && !parsing ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : '#e2e8f0',
              color: selectedFile && !parsing ? 'white' : '#94a3b8',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: selectedFile && !parsing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            {parsing ? (
              <>
                <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Analisi in corso...
              </>
            ) : (
              <>
                <Brain size={20} />
                Analizza Documento
              </>
            )}
          </button>

          {/* Info */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: '#64748b'
          }}>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={16} color="#8b5cf6" />
              Powered by Claude AI
            </p>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              L'AI analizza il documento ed estrae automaticamente tutti i dati strutturati.
            </p>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                Risultato Analisi
              </h2>
              {result.success && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <CheckCircle size={14} />
                  Estratto con successo
                </span>
              )}
            </div>

            <ParsedDataViewer data={result} type={documentType} />

            {/* Raw JSON toggle */}
            {result.success && (
              <details style={{ marginTop: '1.5rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: '#64748b', 
                  fontSize: '0.85rem',
                  padding: '0.5rem 0'
                }}>
                  Mostra JSON completo
                </summary>
                <pre style={{ 
                  marginTop: '0.5rem',
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            )}
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
