import React, { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatEuro, formatDateIT, STYLES, COLORS, button, badge } from '../lib/utils';
import api from '../api';
import { useUpload } from '../contexts/UploadContext';
import { PageInfoCard } from '../components/PageInfoCard';
import { PageLayout } from '../components/PageLayout';
import { 
  Upload, FileText, Brain, CheckCircle, AlertCircle, 
  RefreshCw, Eye, Download, Loader2, FileType, FolderUp, Sparkles
} from 'lucide-react';

// ============================================================
// COSTANTI CONDIVISE
// ============================================================

const TIPI_DOCUMENTO = [
  { id: 'auto', label: 'Auto-Detect', color: '#3b82f6', desc: 'Il sistema riconosce automaticamente il tipo', extension: '*', endpoint: '/api/documenti/upload-auto' },
  { id: 'fattura', label: 'Fatture XML', color: '#ec4899', desc: 'Fatture SDI con integrazione Magazzino+Prima Nota+Scadenziario', extension: '.xml,.zip', endpoint: '/api/fatture-ricevute/import-xml', endpointMulti: '/api/fatture-ricevute/import-xml-multipli', endpointZip: '/api/fatture-ricevute/import-zip', hasIntegration: true },
  { id: 'estratto_conto_pdf', label: 'Estratto Conto PDF', color: '#10b981', desc: 'PDF da banca con ANTEPRIMA', extension: '.pdf,.zip', endpoint: '/api/bank-statement-bulk/parse-bulk', hasPreview: true },
  { id: 'estratto_conto', label: 'Estratto Conto Excel/CSV', color: '#059669', desc: 'Excel/CSV da banca', extension: '.xlsx,.xls,.csv,.zip', endpoint: '/api/estratto-conto-movimenti/import' },
  { id: 'f24', label: 'F24', color: '#ef4444', desc: 'Modelli F24 da pagare', extension: '.pdf,.zip', endpoint: '/api/f24/upload-pdf' },
  { id: 'quietanza_f24', label: 'Quietanza F24', color: '#f59e0b', desc: 'Ricevute pagamento F24', extension: '.pdf,.zip', endpoint: '/api/quietanze-f24/upload' },
  { id: 'cedolino', label: 'Buste Paga', color: '#8b5cf6', desc: 'Cedolini e Libro Unico', extension: '.pdf,.zip', endpoint: '/api/employees/paghe/upload-pdf' },
  { id: 'libro_unico', label: 'Libro Unico (Giustificativi)', color: '#6366f1', desc: 'Estrae Ferie, ROL, Malattia dai PDF', extension: '.pdf,.zip', endpoint: '/api/giustificativi/upload-libro-unico' },
  { id: 'bonifici', label: 'Bonifici', color: '#06b6d4', desc: 'Archivio bonifici PDF/ZIP', extension: '.pdf,.zip', endpoint: '/api/archivio-bonifici/jobs', useBonificiJob: true },
  { id: 'corrispettivi', label: 'Corrispettivi', color: '#84cc16', desc: 'Scontrini giornalieri Excel/XML', extension: '.xlsx,.xls,.xml,.zip', endpoint: '/api/prima-nota-auto/import-corrispettivi', endpointXml: '/api/prima-nota-auto/import-corrispettivi-xml' },
  { id: 'pos', label: 'Incassi POS', color: '#a855f7', desc: 'Rendiconti POS Excel', extension: '.xlsx,.xls,.zip', endpoint: '/api/prima-nota-auto/import-pos' },
  { id: 'versamenti', label: 'Versamenti', color: '#14b8a6', desc: 'Versamenti in banca CSV', extension: '.csv,.zip', endpoint: '/api/prima-nota-auto/import-versamenti' },
  { id: 'fornitori', label: 'Fornitori', color: '#f97316', desc: 'Anagrafica fornitori Excel', extension: '.xlsx,.xls,.zip', endpoint: '/api/suppliers/upload-excel' },
];

const TEMPLATES = {
  estratto_conto: '/api/import-templates/estratto-conto',
  corrispettivi: '/api/import-templates/corrispettivi',
  pos: '/api/import-templates/pos',
  versamenti: '/api/import-templates/versamenti',
};

// ============================================================
// TAB: IMPORT MASSIVO
// ============================================================

function ImportMassivoTab() {
  const [files, setFiles] = useState([]);
  const [tipoSelezionato, setTipoSelezionato] = useState('estratto_conto_pdf');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, filename: '' });
  const [results, setResults] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [previewData, setPreviewData] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [confirmingImport, setConfirmingImport] = useState(false);
  
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const { addUpload, hasActiveUploads } = useUpload();

  // Estrazione da ZIP
  const extractFromZip = async (file, extensions) => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const extractedFiles = [];
      const extList = extensions.split(',').map(e => e.trim().toLowerCase());
      
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const lowerName = filename.toLowerCase();
        
        if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar')) {
          const nestedContent = await zipEntry.async('blob');
          const nestedType = lowerName.endsWith('.rar') ? 'application/vnd.rar' : 'application/zip';
          const nestedFile = new File([nestedContent], filename, { type: nestedType });
          const nestedFiles = await extractFromZip(nestedFile, extensions);
          extractedFiles.push(...nestedFiles);
          continue;
        }
        
        const matchExt = extList.some(ext => lowerName.endsWith(ext));
        if (matchExt || extensions === '*') {
          const content = await zipEntry.async('blob');
          const mimeType = lowerName.endsWith('.xml') ? 'application/xml' :
                          lowerName.endsWith('.pdf') ? 'application/pdf' :
                          lowerName.endsWith('.csv') ? 'text/csv' :
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const cleanName = filename.split('/').pop();
          extractedFiles.push(new File([content], cleanName, { type: mimeType }));
        }
      }
      return extractedFiles;
    } catch (e) {
      console.error('Errore estrazione ZIP:', e);
      return [file];
    }
  };

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(false); }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    await processIncomingFiles(Array.from(e.dataTransfer.files));
  }, [tipoSelezionato]);

  const handleFileSelect = async (e) => {
    await processIncomingFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleZipSelect = async (e) => {
    await processIncomingFiles(Array.from(e.target.files), true);
    e.target.value = '';
  };

  const processIncomingFiles = async (incomingFiles, forceZipExtract = false) => {
    const tipoConfig = TIPI_DOCUMENTO.find(t => t.id === tipoSelezionato) || TIPI_DOCUMENTO[0];
    const extensions = tipoConfig.extension;
    let allFiles = [];
    
    for (const file of incomingFiles) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.zip') || forceZipExtract) {
        const extracted = await extractFromZip(file, extensions);
        allFiles.push(...extracted);
      } else {
        allFiles.push(file);
      }
    }
    
    const filesWithInfo = allFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: detectFileType(file.name),
      status: 'pending'
    }));
    setFiles(prev => [...prev, ...filesWithInfo]);
  };

  const detectFileType = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('estratto') || lower.includes('conto') || lower.includes('movimenti')) {
      return lower.endsWith('.pdf') ? 'estratto_conto_pdf' : 'estratto_conto';
    }
    if (lower.includes('quietanza') || lower.includes('ricevuta') || lower.includes('pagamento_f24')) return 'quietanza_f24';
    if (lower.includes('f24') || lower.includes('delega')) return 'f24';
    if (lower.includes('cedolin') || lower.includes('busta') || lower.includes('paga') || lower.includes('libro_unico') || lower.includes('lul')) return 'cedolino';
    if (lower.includes('bonifico') || lower.includes('bonifici') || lower.includes('sepa')) return 'bonifici';
    if (lower.includes('corrispettiv')) return 'corrispettivi';
    if (lower.includes('pos') || lower.includes('incass')) return 'pos';
    if (lower.includes('versament')) return 'versamenti';
    if (lower.includes('fornitor') || lower.includes('supplier') || lower.includes('reportfornitori')) return 'fornitori';
    if (lower.endsWith('.xml') || lower.includes('fattura') || lower.includes('fattpa')) return 'fattura';
    if (lower.endsWith('.xml')) return 'fattura';
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'estratto_conto';
    if (lower.endsWith('.csv')) return 'versamenti';
    if (lower.endsWith('.pdf')) return 'estratto_conto_pdf';
    return 'auto';
  };

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));
  const changeFileType = (index, newType) => setFiles(prev => prev.map((f, i) => i === index ? { ...f, type: newType } : f));

  // Upload Estratto Conto PDF con anteprima
  const handleUploadEstrattoContoPDF = async () => {
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) { alert('Seleziona almeno un file PDF'); return; }
    
    setUploading(true);
    setUploadProgress({ current: 0, total: pdfFiles.length, filename: 'Analisi PDF in corso...' });
    
    try {
      const formData = new FormData();
      pdfFiles.forEach(f => formData.append('files', f.file));
      const res = await api.post('/api/bank-statement-bulk/parse-bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        setPreviewData(res.data);
        setPreviewId(res.data.preview_id);
        setShowPreview(true);
        setFiles([]);
      } else {
        alert('Errore nel parsing dei PDF');
      }
    } catch (e) {
      console.error('Errore upload:', e);
      alert(e.response?.data?.detail || 'Errore durante l\'analisi dei PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewId) return;
    setConfirmingImport(true);
    try {
      const res = await api.post(`/api/bank-statement-bulk/commit/${previewId}`);
      if (res.data.success) {
        setResults([{
          file: `${res.data.total} transazioni`,
          tipo: 'estratto_conto_pdf',
          status: 'success',
          message: `Importate ${res.data.imported} transazioni (${res.data.skipped} saltate)`
        }]);
        setShowPreview(false);
        setPreviewData(null);
        setPreviewId(null);
      } else {
        alert('Errore durante il salvataggio');
      }
    } catch (e) {
      alert(e.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setConfirmingImport(false);
    }
  };

  const handleCancelPreview = async () => {
    if (previewId) {
      try { await api.delete(`/api/bank-statement-bulk/preview/${previewId}`); } catch (e) {}
    }
    setShowPreview(false);
    setPreviewData(null);
    setPreviewId(null);
  };

  // Upload tradizionale
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    const tipoConfig = TIPI_DOCUMENTO.find(t => t.id === tipoSelezionato);
    if (tipoConfig?.hasPreview && tipoSelezionato === 'estratto_conto_pdf') {
      await handleUploadEstrattoContoPDF();
      return;
    }
    
    if (backgroundMode) {
      for (const fileInfo of files) {
        const tipo = tipoSelezionato !== 'auto' ? tipoSelezionato : fileInfo.type;
        const cfg = TIPI_DOCUMENTO.find(t => t.id === tipo) || TIPI_DOCUMENTO[0];
        let endpoint = cfg.endpoint;
        if (tipo === 'corrispettivi' && fileInfo.name.toLowerCase().endsWith('.xml')) {
          endpoint = cfg.endpointXml || endpoint;
        }
        if (tipo === 'bonifici' && cfg.useBonificiJob) {
          const jobRes = await api.post('/api/archivio-bonifici/jobs', {});
          const jobId = jobRes.data?.id;
          if (!jobId) continue;
          endpoint = `/api/archivio-bonifici/jobs/${jobId}/upload`;
        }

        const formData = new FormData();
        if (tipo === 'bonifici' && cfg.useBonificiJob) {
          formData.append('files', fileInfo.file);
        } else {
          formData.append('file', fileInfo.file);
          formData.append('tipo', tipo);
        }

        addUpload({
          fileName: fileInfo.name,
          fileType: cfg.label,
          endpoint,
          formData,
          onSuccess: (data) => {
            setResults(prev => [...prev, { file: fileInfo.name, tipo, status: 'success', message: data?.message || 'Importato' }]);
          },
          onError: (error) => {
            const errMsg = error.response?.data?.detail || error.message || '';
            const isDuplicate = errMsg.toLowerCase().includes('duplicat') || errMsg.toLowerCase().includes('esiste già');
            setResults(prev => [...prev, { file: fileInfo.name, tipo, status: isDuplicate ? 'duplicate' : 'error', message: isDuplicate ? 'Duplicato' : errMsg }]);
          }
        });
      }
      setFiles([]);
      return;
    }
    
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, filename: '' });
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i];
      const tipo = tipoSelezionato !== 'auto' ? tipoSelezionato : fileInfo.type;
      const cfg = TIPI_DOCUMENTO.find(t => t.id === tipo) || TIPI_DOCUMENTO[0];
      
      setUploadProgress({ current: i + 1, total: files.length, filename: fileInfo.name });
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));

      try {
        let endpoint = cfg.endpoint;
        if (tipo === 'corrispettivi' && fileInfo.name.toLowerCase().endsWith('.xml')) {
          endpoint = cfg.endpointXml || endpoint;
        }
        if (tipo === 'bonifici' && cfg.useBonificiJob) {
          const jobRes = await api.post('/api/archivio-bonifici/jobs', {});
          const jobId = jobRes.data?.id;
          if (!jobId) throw new Error('Impossibile creare job bonifici');
          endpoint = `/api/archivio-bonifici/jobs/${jobId}/upload`;
        }
        
        const formData = new FormData();
        if (tipo === 'bonifici' && cfg.useBonificiJob) {
          formData.append('files', fileInfo.file);
        } else {
          formData.append('file', fileInfo.file);
          formData.append('tipo', tipo);
        }

        const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploadResults.push({ file: fileInfo.name, tipo, status: 'success', message: res.data?.message || 'Importato', details: res.data });
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'success' } : f));

      } catch (e) {
        const errMsg = e.response?.data?.detail || e.response?.data?.message || e.message;
        const isDuplicate = errMsg.toLowerCase().includes('duplicat') || errMsg.toLowerCase().includes('esiste già') || e.response?.status === 409;
        uploadResults.push({ file: fileInfo.name, tipo, status: isDuplicate ? 'duplicate' : 'error', message: isDuplicate ? 'Duplicato' : errMsg });
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: isDuplicate ? 'duplicate' : 'error', error: errMsg } : f));
      }
      
      if (i < files.length - 1) await new Promise(r => setTimeout(r, 50));
    }

    setResults(uploadResults);
    setUploading(false);
  };

  const handleReset = () => { setFiles([]); setResults([]); };

  const downloadTemplate = async (tipo) => {
    const url = TEMPLATES[tipo];
    if (!url) return;
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `template_${tipo}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('Errore download template:', e);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const duplicateCount = results.filter(r => r.status === 'duplicate').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const tipoCorrente = TIPI_DOCUMENTO.find(t => t.id === tipoSelezionato);
  const isEstrattoContoPDF = tipoSelezionato === 'estratto_conto_pdf';

  return (
    <PageLayout 
      title="Import Documenti" 
      icon="📤"
      subtitle="Importazione documenti"
    >
      <div>
      {/* Header opzioni */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {!isEstrattoContoPDF && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={backgroundMode} onChange={(e) => setBackgroundMode(e.target.checked)} style={{ width: 18, height: 18 }} data-testid="background-mode-toggle" />
            <span style={{ fontSize: 13, color: '#374151' }}>Upload in background</span>
          </label>
        )}
        {hasActiveUploads && (
          <span style={{ padding: '4px 12px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
            Upload in corso...
          </span>
        )}
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding: '6px 12px', background: showAdvanced ? '#e0e7ff' : '#f1f5f9', color: showAdvanced ? '#4338ca' : '#64748b', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
          {showAdvanced ? '▼' : '▶'} Opzioni avanzate
        </button>
      </div>

      {/* Selezione Tipo */}
      <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ fontWeight: 600, marginBottom: 10, color: '#374151', fontSize: 14 }}>Tipo Documento</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TIPI_DOCUMENTO.map(tipo => (
            <button key={tipo.id} onClick={() => setTipoSelezionato(tipo.id)} title={tipo.desc} data-testid={`tipo-${tipo.id}`}
              style={{
                padding: '8px 14px',
                background: tipoSelezionato === tipo.id ? tipo.color : '#f8fafc',
                color: tipoSelezionato === tipo.id ? 'white' : '#64748b',
                border: tipoSelezionato === tipo.id ? 'none' : '1px solid #e2e8f0',
                borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12, transition: 'all 0.15s', position: 'relative'
              }}
            >
              {tipo.label}
              {tipo.hasPreview && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#f59e0b', color: 'white', fontSize: 8, padding: '2px 4px', borderRadius: 4, fontWeight: 700 }}>PREVIEW</span>
              )}
            </button>
          ))}
        </div>
        
        {isEstrattoContoPDF && (
          <div style={{ marginTop: 12, padding: 10, background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', fontSize: 12, color: '#065f46' }}>
            <strong>Modalità con Anteprima:</strong> I PDF verranno analizzati e mostrati in anteprima prima di essere salvati.
          </div>
        )}
        
        {TEMPLATES[tipoSelezionato] && (
          <div style={{ marginTop: 12 }}>
            <button onClick={() => downloadTemplate(tipoSelezionato)} style={{ padding: '6px 12px', background: 'transparent', color: '#3b82f6', border: '1px dashed #3b82f6', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              Scarica Template {TIPI_DOCUMENTO.find(t => t.id === tipoSelezionato)?.label}
            </button>
          </div>
        )}
      </div>

      {/* Opzioni Avanzate */}
      {showAdvanced && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151', fontSize: 14 }}>Opzioni Avanzate</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="file" ref={zipInputRef} accept=".zip" multiple onChange={handleZipSelect} style={{ display: 'none' }} data-testid="zip-file-input" />
            <button onClick={() => zipInputRef.current?.click()} disabled={uploading} style={{ padding: '10px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer', fontSize: 13 }} data-testid="upload-zip-btn">
              Carica ZIP Massivo
            </button>
            <div style={{ fontSize: 12, color: '#64748b' }}>Supporta ZIP annidati • Estrazione automatica</div>
          </div>
        </div>
      )}

      {/* Area Drop */}
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} data-testid="drop-zone"
        style={{
          background: dragOver ? '#dbeafe' : 'white',
          border: dragOver ? '3px dashed #3b82f6' : '3px dashed #e5e7eb',
          borderRadius: 16, padding: 'clamp(24px, 5vw, 40px)', textAlign: 'center', marginBottom: 16, transition: 'all 0.2s', cursor: 'pointer'
        }}
      >
        <input ref={fileInputRef} type="file" multiple accept={tipoCorrente?.extension || ".pdf,.xlsx,.xls,.xml,.csv,.zip"} onChange={handleFileSelect} style={{ display: 'none' }} data-testid="file-input" />
        <FolderUp size={56} style={{ marginBottom: 12, opacity: 0.5, color: dragOver ? '#3b82f6' : '#64748b' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          {dragOver ? 'Rilascia qui i file' : isEstrattoContoPDF ? 'Trascina i PDF degli Estratti Conto' : 'Trascina i file o clicca per selezionare'}
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {isEstrattoContoPDF ? 'PDF da BANCO BPM, BNL, Nexi • Upload massivo supportato' : 'PDF, Excel, XML, CSV, ZIP • Singoli o multipli'}
        </div>
      </div>

      {/* Lista File */}
      {files.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: 14, borderBottom: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{files.length} file in coda</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleReset} data-testid="reset-btn" style={{ padding: '8px 14px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                Svuota
              </button>
              <button onClick={handleUpload} disabled={uploading} data-testid="upload-btn"
                style={{ padding: '8px 18px', background: uploading ? '#9ca3af' : isEstrattoContoPDF ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: uploading ? 'wait' : 'pointer', fontWeight: 600, fontSize: 12 }}
              >
                {uploading ? 'Analisi...' : isEstrattoContoPDF ? 'Analizza e Anteprima' : 'Carica Tutti'}
              </button>
            </div>
          </div>

          {uploading && uploadProgress.total > 0 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', background: '#f0f9ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>{uploadProgress.filename}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{uploadProgress.current}/{uploadProgress.total}</span>
              </div>
              <div style={{ height: 6, background: '#e0f2fe', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, background: 'linear-gradient(90deg, #0ea5e9, #3b82f6)', borderRadius: 3, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}
          
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {files.map((f, idx) => {
              const tipoInfo = TIPI_DOCUMENTO.find(t => t.id === f.type) || TIPI_DOCUMENTO[0];
              return (
                <div key={idx} data-testid={`file-item-${idx}`} style={{ padding: 12, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, background: f.status === 'success' ? '#f0fdf4' : f.status === 'duplicate' ? '#fefce8' : f.status === 'error' ? '#fef2f2' : 'white' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: f.status === 'success' ? '#dcfce7' : f.status === 'duplicate' ? '#fef9c3' : f.status === 'error' ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {f.status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> : f.status === 'success' ? <CheckCircle size={16} color="#16a34a" /> : f.status === 'duplicate' ? <AlertCircle size={16} color="#ca8a04" /> : f.status === 'error' ? <AlertCircle size={16} color="#dc2626" /> : <FileText size={16} color="#64748b" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{(f.size / 1024).toFixed(1)} KB {f.error && <span style={{ color: '#dc2626' }}>• {f.error}</span>}</div>
                  </div>
                  {!isEstrattoContoPDF && (
                    <select value={f.type} onChange={(e) => changeFileType(idx, e.target.value)} disabled={f.status !== 'pending'} style={{ padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: 'white', fontSize: 11, color: tipoInfo.color, fontWeight: 600, maxWidth: 120 }}>
                      {TIPI_DOCUMENTO.filter(t => t.id !== 'auto').map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}
                    </select>
                  )}
                  {f.status === 'pending' && (
                    <button onClick={() => removeFile(idx)} style={{ width: 28, height: 28, border: 'none', background: '#fee2e2', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontSize: 14, flexShrink: 0 }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modale Anteprima */}
      {showPreview && previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 1000, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 20, background: '#10b981', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Anteprima Transazioni Estratte</h2>
                <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 13 }}>Verifica i dati prima di confermare</p>
              </div>
              <button onClick={handleCancelPreview} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>✕ Chiudi</button>
            </div>
            <div style={{ padding: 16, background: '#f0fdf4', borderBottom: '1px solid #a7f3d0', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#065f46' }}>{previewData.totale_transazioni}</div>
                <div style={{ fontSize: 11, color: '#047857' }}>Transazioni</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{formatEuro(previewData.totale_entrate || 0)}</div>
                <div style={{ fontSize: 11, color: '#047857' }}>Entrate</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{formatEuro(previewData.totale_uscite || 0)}</div>
                <div style={{ fontSize: 11, color: '#047857' }}>Uscite</div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Data</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Descrizione</th>
                    <th style={{ padding: 10, textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Entrata</th>
                    <th style={{ padding: 10, textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Uscita</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Banca</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewData.transazioni_preview || []).slice(previewPage * 50, (previewPage + 1) * 50).map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8 }}>{tx.data}</td>
                      <td style={{ padding: 8, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descrizione}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#16a34a', fontWeight: tx.entrata ? 600 : 400 }}>{tx.entrata ? formatEuro(tx.entrata) : '-'}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: '#dc2626', fontWeight: tx.uscita ? 600 : 400 }}>{tx.uscita ? formatEuro(tx.uscita) : '-'}</td>
                      <td style={{ padding: 8 }}><span style={{ padding: '2px 6px', background: '#e0e7ff', color: '#4338ca', borderRadius: 4, fontSize: 10 }}>{tx.banca}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.totale_transazioni > 50 && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button onClick={() => setPreviewPage(p => Math.max(0, p - 1))} disabled={previewPage === 0} style={{ padding: '6px 12px', background: previewPage === 0 ? '#f1f5f9' : '#e0e7ff', border: 'none', borderRadius: 4, cursor: previewPage === 0 ? 'default' : 'pointer' }}>← Prec</button>
                  <span style={{ padding: '6px 12px', fontSize: 12 }}>Pagina {previewPage + 1} di {Math.ceil(previewData.totale_transazioni / 50)}</span>
                  <button onClick={() => setPreviewPage(p => p + 1)} disabled={(previewPage + 1) * 50 >= previewData.totale_transazioni} style={{ padding: '6px 12px', background: (previewPage + 1) * 50 >= previewData.totale_transazioni ? '#f1f5f9' : '#e0e7ff', border: 'none', borderRadius: 4, cursor: (previewPage + 1) * 50 >= previewData.totale_transazioni ? 'default' : 'pointer' }}>Succ →</button>
                </div>
              )}
            </div>
            <div style={{ padding: 16, background: '#f8fafc', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={handleCancelPreview} style={{ padding: '10px 20px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
              <button onClick={handleConfirmImport} disabled={confirmingImport} style={{ padding: '10px 24px', background: confirmingImport ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: confirmingImport ? 'wait' : 'pointer', fontWeight: 600 }}>
                {confirmingImport ? 'Salvataggio...' : 'Conferma Importazione'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risultati */}
      {results.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: 14, background: successCount === results.length ? '#dcfce7' : errorCount === results.length ? '#fee2e2' : '#fef3c7', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {errorCount === 0 ? 'Import completato!' : successCount === 0 ? 'Errore import' : 'Import parziale'}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
              <span style={{ color: '#16a34a' }}>✅ {successCount}</span>
              <span style={{ color: '#ca8a04' }}>⚠️ {duplicateCount}</span>
              <span style={{ color: '#dc2626' }}>❌ {errorCount}</span>
            </div>
          </div>
          <div style={{ padding: 14, maxHeight: 250, overflow: 'auto' }}>
            {results.map((r, idx) => (
              <div key={idx} style={{ padding: 10, background: r.status === 'success' ? '#f0fdf4' : r.status === 'duplicate' ? '#fefce8' : '#fef2f2', borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                {r.status === 'success' ? <CheckCircle size={18} color="#16a34a" /> : r.status === 'duplicate' ? <AlertCircle size={18} color="#ca8a04" /> : <AlertCircle size={18} color="#dc2626" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.file}</div>
                  <div style={{ fontSize: 11, color: r.status === 'success' ? '#166534' : r.status === 'duplicate' ? '#92400e' : '#dc2626' }}>{r.message}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
            <button onClick={() => setResults([])} style={{ padding: '6px 14px', background: '#e5e7eb', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Chiudi</button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={{ marginTop: 20, padding: 14, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
        <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: 8, fontSize: 13 }}>Suggerimenti</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#0c4a6e', fontSize: 12, lineHeight: 1.6 }}>
          <li><strong>Estratti Conto PDF</strong>: Supporta BANCO BPM, BNL, Nexi con anteprima</li>
          <li><strong>Fatture XML</strong>: FatturaPA standard, anche in archivi ZIP</li>
          <li><strong>ZIP Annidati</strong>: Il sistema estrae automaticamente tutti i livelli</li>
        </ul>
      </div>
    </div>
    </PageLayout>
  );
}

// ============================================================
// TAB: AI PARSER
// ============================================================

function AIParserTab() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('auto');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
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

      const response = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(response.data);
    } catch (error) {
      console.error('Errore parsing:', error);
      setResult({ success: false, error: error.response?.data?.detail || error.message });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 2fr' : '1fr', gap: '1.5rem' }}>
      {/* Upload Area */}
      <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Carica Documento</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Tipo Documento</label>
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.95rem', background: 'white' }}
          >
            <option value="auto">Rilevamento Automatico</option>
            <option value="fattura">Fattura</option>
            <option value="f24">F24</option>
            <option value="busta_paga">Busta Paga</option>
          </select>
        </div>

        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => document.getElementById('ai-file-input').click()}
          style={{
            border: `2px dashed ${dragActive ? '#8b5cf6' : '#e2e8f0'}`,
            borderRadius: 12, padding: '2rem', textAlign: 'center',
            background: dragActive ? '#faf5ff' : '#fafafa',
            transition: 'all 0.2s ease', cursor: 'pointer'
          }}
        >
          <input id="ai-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
          {selectedFile ? (
            <div>
              <FileType size={48} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{selectedFile.name}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <Upload size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>Trascina qui il file o clicca per selezionare</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>PDF, PNG, JPG supportati</p>
            </div>
          )}
        </div>

        <button onClick={handleParse} disabled={!selectedFile || parsing}
          style={{
            width: '100%', marginTop: '1rem', padding: '1rem', borderRadius: 10, border: 'none',
            background: selectedFile && !parsing ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : '#e2e8f0',
            color: selectedFile && !parsing ? 'white' : '#94a3b8',
            fontSize: '1rem', fontWeight: 600, cursor: selectedFile && !parsing ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}
        >
          {parsing ? (<><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Analisi in corso...</>) : (<><Brain size={20} /> Analizza Documento</>)}
        </button>

        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.85rem', color: '#64748b' }}>
          <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={16} color="#8b5cf6" /> Powered by Claude AI
          </p>
          <p style={{ margin: '0.5rem 0 0 0' }}>La AI analizza il documento ed estrae automaticamente tutti i dati strutturati.</p>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Risultato Analisi</h3>
            {result.success && (
              <span style={{ padding: '0.25rem 0.75rem', background: '#dcfce7', color: '#16a34a', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle size={14} /> Estratto con successo
              </span>
            )}
          </div>
          <ParsedDataViewer data={result} type={documentType} />
          {result.success && (
            <details style={{ marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.85rem', padding: '0.5rem 0' }}>Mostra JSON completo</summary>
              <pre style={{ marginTop: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', overflow: 'auto', maxHeight: 300 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// VIEWER COMPONENTI
// ============================================================

function ParsedDataViewer({ data, type }) {
  if (!data || !data.success) {
    return (
      <div style={{ padding: '2rem', background: '#fef2f2', borderRadius: 12, textAlign: 'center' }}>
        <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <p style={{ color: '#dc2626', fontWeight: 600 }}>{data?.error || 'Errore nel parsing del documento'}</p>
        {data?.raw_response && (
          <pre style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: 8, fontSize: '0.75rem', textAlign: 'left', overflow: 'auto', maxHeight: 200 }}>{data.raw_response}</pre>
        )}
      </div>
    );
  }
  if (type === 'fattura' || data.tipo_documento === 'fattura') return <FatturaViewer data={data} />;
  if (type === 'f24' || data.tipo_documento === 'f24' || data.tipo_documento === 'quietanza_f24') return <F24Viewer data={data} />;
  if (type === 'busta_paga' || data.tipo_documento === 'busta_paga') return <BustaPagaViewer data={data} />;
  return <pre style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.8rem', overflow: 'auto', maxHeight: 500 }}>{JSON.stringify(data, null, 2)}</pre>;
}

function FatturaViewer({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <InfoCard title="Numero Fattura" value={data.numero_fattura} />
        <InfoCard title="Data" value={data.data_fattura} />
        <InfoCard title="Totale" value={`€ ${data.totali?.totale_fattura?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} highlight />
      </div>
      <Section title="Fornitore">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <Field label="Denominazione" value={data.fornitore?.denominazione} />
          <Field label="P.IVA" value={data.fornitore?.partita_iva} />
          <Field label="Codice Fiscale" value={data.fornitore?.codice_fiscale} />
          <Field label="Indirizzo" value={data.fornitore?.indirizzo} />
        </div>
      </Section>
      {data.righe?.length > 0 && (
        <Section title="Dettaglio Prodotti/Servizi">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Descrizione</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Qtà</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Prezzo</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>IVA</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Totale</th>
              </tr>
            </thead>
            <tbody>
              {data.righe.map((riga, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem' }}>{riga.descrizione}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{riga.quantita}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{riga.prezzo_unitario?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{riga.aliquota_iva}%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>€ {riga.prezzo_totale?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

function F24Viewer({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <InfoCard title="Data Pagamento" value={data.data_pagamento} />
        <InfoCard title="Ragione Sociale" value={data.ragione_sociale} />
        <InfoCard title="Totale Versato" value={`€ ${data.totali?.totale_debito?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} highlight />
      </div>
      {data.sezione_erario?.length > 0 && (
        <Section title="Sezione Erario">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#fef3c7' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Cod. Tributo</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Periodo</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Debito</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Credito</th>
              </tr>
            </thead>
            <tbody>
              {data.sezione_erario.map((trib, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{trib.codice_tributo}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{trib.periodo_riferimento}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>{trib.importo_debito ? `€ ${trib.importo_debito.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669' }}>{trib.importo_credito ? `€ ${trib.importo_credito.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

function BustaPagaViewer({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <InfoCard title="Dipendente" value={`${data.dipendente?.nome} ${data.dipendente?.cognome}`} />
        <InfoCard title="Periodo" value={data.periodo?.descrizione || `${data.periodo?.mese}/${data.periodo?.anno}`} />
        <InfoCard title="Netto Pagato" value={`€ ${data.netto?.netto_pagato?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} highlight />
      </div>
      <Section title="Ferie e Permessi">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: 8 }}>
            <h4 style={{ margin: 0, color: '#059669', fontSize: '0.85rem' }}>FERIE</h4>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669' }}>Residue: {data.progressivi?.ferie_residue?.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: 8 }}>
            <h4 style={{ margin: 0, color: '#2563eb', fontSize: '0.85rem' }}>PERMESSI</h4>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}>Residui: {data.progressivi?.permessi_residui?.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: 8 }}>
            <h4 style={{ margin: 0, color: '#d97706', fontSize: '0.85rem' }}>TFR</h4>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>€ {data.tfr?.fondo_accantonato?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function InfoCard({ title, value, highlight }) {
  return (
    <div style={{ padding: '1rem', background: highlight ? '#ecfdf5' : '#f8fafc', borderRadius: 8, border: highlight ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>{title}</span>
      <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600, color: highlight ? '#059669' : '#1e293b' }}>{value || '-'}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>{title}</h4>
      </div>
      <div style={{ padding: '1rem' }}>{children}</div>
    </div>
  );
}

function Field({ label, value, highlight }) {
  return (
    <div>
      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: highlight ? '#059669' : '#1e293b', fontSize: highlight ? '1.1rem' : '0.95rem' }}>{value || '-'}</span>
    </div>
  );
}

// ============================================================
// PAGINA PRINCIPALE CON TABS
// ============================================================

export default function ImportDocumenti() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'import';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'import', label: 'Import Massivo', icon: <FolderUp size={18} />, desc: 'Upload file singoli, multipli o ZIP' },
    { id: 'ai', label: 'Lettura AI', icon: <Sparkles size={18} />, desc: 'Estrazione dati con intelligenza artificiale' },
  ];

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 20px)', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Upload size={28} /> Import Documenti
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Carica documenti con riconoscimento automatico o usa l'AI per estrarre dati strutturati
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #e5e7eb', paddingBottom: 2 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            data-testid={`tab-${tab.id}`}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'import' && <ImportMassivoTab />}
      {activeTab === 'ai' && <AIParserTab />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
