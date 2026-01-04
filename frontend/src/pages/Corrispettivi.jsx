import React, { useState, useEffect, useRef } from "react";
import api from "../api";

export default function Corrispettivi() {
  const [corrispettivi, setCorrispettivi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);
  const bulkFileInputRef = useRef(null);

  useEffect(() => {
    loadCorrispettivi();
  }, []);

  async function loadCorrispettivi() {
    try {
      setLoading(true);
      const r = await api.get("/api/corrispettivi");
      setCorrispettivi(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error("Error loading corrispettivi:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadXML(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setErr("");
    setUploadResult(null);
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const r = await api.post("/api/corrispettivi/upload-xml", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setUploadResult({
        type: "success",
        message: r.data.message,
        corrispettivo: r.data.corrispettivo
      });
      loadCorrispettivi();
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      if (e.response?.status === 409) {
        setErr("Corrispettivo già presente nel sistema.");
      } else {
        setErr("Upload fallito. " + detail);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBulkUploadXML(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setErr("");
    setUploadResult(null);
    setUploading(true);
    
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      
      const r = await api.post("/api/corrispettivi/upload-xml-bulk", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000 // 5 minuti timeout per upload grandi
      });
      
      setUploadResult({
        type: "bulk",
        data: r.data
      });
      loadCorrispettivi();
    } catch (e) {
      console.error("Upload error:", e);
      let errorMsg = "Errore durante l'upload massivo";
      if (e.response?.data?.detail) {
        errorMsg = e.response.data.detail;
      } else if (e.code === "ECONNABORTED") {
        errorMsg = "Timeout - troppe file. Prova a caricare meno file alla volta.";
      } else if (e.message) {
        errorMsg = e.message;
      }
      setErr(errorMsg);
    } finally {
      setUploading(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Eliminare questo corrispettivo?")) return;
    try {
      await api.delete(`/api/corrispettivi/${id}`);
      loadCorrispettivi();
    } catch (e) {
      setErr("Errore eliminazione: " + (e.response?.data?.detail || e.message));
    }
  }

  // Calcola totali
  const totaleGiornaliero = corrispettivi.reduce((sum, c) => sum + (c.totale || 0), 0);
  const totaleIVA = corrispettivi.reduce((sum, c) => sum + (c.totale_iva || 0), 0);

  return (
    <>
      <div className="card">
        <div className="h1">Corrispettivi Elettronici</div>
        <div className="small" style={{ marginBottom: 15 }}>
          Carica i file XML dei corrispettivi giornalieri dal registratore di cassa telematico.
        </div>
        
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {/* Upload singolo */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleUploadXML}
              style={{ display: "none" }}
              id="xml-upload"
              data-testid="corrispettivi-single-upload"
            />
            <button 
              className="primary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="corrispettivi-single-upload-btn"
            >
              📄 Carica XML Singolo
            </button>
          </div>
          
          {/* Upload massivo */}
          <div>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".xml"
              multiple
              onChange={handleBulkUploadXML}
              style={{ display: "none" }}
              id="xml-bulk-upload"
              data-testid="corrispettivi-bulk-upload"
            />
            <button 
              onClick={() => bulkFileInputRef.current?.click()}
              disabled={uploading}
              style={{ background: "#4caf50", color: "white" }}
              data-testid="corrispettivi-bulk-upload-btn"
            >
              📁 Upload XML Massivo
            </button>
          </div>
          
          <button onClick={loadCorrispettivi} data-testid="corrispettivi-refresh-btn">
            🔄 Aggiorna
          </button>
        </div>
        
        {uploading && (
          <div className="small" style={{ marginTop: 10, color: "#1565c0" }}>
            ⏳ Elaborazione in corso...
          </div>
        )}
        
        {err && <div className="small" style={{ marginTop: 10, color: "#c00" }} data-testid="corrispettivi-error">{err}</div>}
      </div>

      {/* Risultato Upload */}
      {uploadResult && (
        <div className="card" style={{ background: uploadResult.type === "success" ? "#e8f5e9" : "#fff3e0" }} data-testid="corrispettivi-upload-result">
          {uploadResult.type === "success" ? (
            <>
              <div className="h1" style={{ color: "#2e7d32" }}>✓ {uploadResult.message}</div>
              <div className="small">
                <strong>Data:</strong> {uploadResult.corrispettivo?.data}<br/>
                <strong>Totale:</strong> € {uploadResult.corrispettivo?.totale?.toFixed(2)}<br/>
                <strong>IVA:</strong> € {uploadResult.corrispettivo?.totale_iva?.toFixed(2)}
              </div>
            </>
          ) : (
            <>
              <div className="h1">Risultato Upload Massivo</div>
              <div className="grid" style={{ marginTop: 10 }}>
                <div style={{ background: "#c8e6c9", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: "#2e7d32" }}>✓ Importati: {uploadResult.data.imported}</strong>
                </div>
                <div style={{ background: uploadResult.data.skipped_duplicates > 0 ? "#fff3e0" : "#f5f5f5", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: uploadResult.data.skipped_duplicates > 0 ? "#e65100" : "#666" }}>
                    ⚠ Duplicati: {uploadResult.data.skipped_duplicates || 0}
                  </strong>
                </div>
                <div style={{ background: uploadResult.data.failed > 0 ? "#ffcdd2" : "#f5f5f5", padding: 10, borderRadius: 8 }}>
                  <strong style={{ color: uploadResult.data.failed > 0 ? "#c62828" : "#666" }}>
                    ✗ Errori: {uploadResult.data.failed}
                  </strong>
                </div>
              </div>
              
              {uploadResult.data.success && uploadResult.data.success.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Corrispettivi importati:</strong>
                  <ul style={{ paddingLeft: 20, marginTop: 5 }}>
                    {uploadResult.data.success.map((s, i) => (
                      <li key={i}>
                        {s.data} - € {s.totale?.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {uploadResult.data.duplicates && uploadResult.data.duplicates.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong style={{ color: "#e65100" }}>Corrispettivi già presenti (saltati):</strong>
                  <ul style={{ paddingLeft: 20, marginTop: 5 }}>
                    {uploadResult.data.duplicates.map((d, i) => (
                      <li key={i} style={{ color: "#e65100" }}>
                        {d.data} - {d.matricola} - € {d.totale?.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {uploadResult.data.errors && uploadResult.data.errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong style={{ color: "#c62828" }}>Errori:</strong>
                  <ul style={{ paddingLeft: 20, marginTop: 5 }}>
                    {uploadResult.data.errors.map((e, i) => (
                      <li key={i} style={{ color: "#c62828" }}>
                        {e.filename}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <button onClick={() => setUploadResult(null)} style={{ marginTop: 10 }}>Chiudi</button>
        </div>
      )}

      {/* Riepilogo Totali */}
      {corrispettivi.length > 0 && (
        <div className="card" style={{ background: "#e3f2fd" }}>
          <div className="h1">Riepilogo</div>
          <div className="grid">
            <div>
              <strong>Totale Corrispettivi</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#1565c0" }}>
                € {totaleGiornaliero.toFixed(2)}
              </div>
            </div>
            <div>
              <strong>Totale IVA</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#e65100" }}>
                € {totaleIVA.toFixed(2)}
              </div>
            </div>
            <div>
              <strong>Numero Registrazioni</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#2e7d32" }}>
                {corrispettivi.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista Corrispettivi */}
      <div className="card">
        <div className="h1">Elenco Corrispettivi ({corrispettivi.length})</div>
        {loading ? (
          <div className="small">Caricamento...</div>
        ) : corrispettivi.length === 0 ? (
          <div className="small">
            Nessun corrispettivo registrato.<br/>
            Carica un file XML per iniziare.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="corrispettivi-table">
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Data</th>
                <th style={{ padding: 8 }}>Matricola RT</th>
                <th style={{ padding: 8 }}>P.IVA</th>
                <th style={{ padding: 8 }}>Totale</th>
                <th style={{ padding: 8 }}>IVA</th>
                <th style={{ padding: 8 }}>Stato</th>
                <th style={{ padding: 8 }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {corrispettivi.map((c, i) => (
                <tr key={c.id || i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    <strong>{c.data || "-"}</strong>
                  </td>
                  <td style={{ padding: 8 }}>
                    {c.matricola_rt || "-"}
                  </td>
                  <td style={{ padding: 8 }}>
                    {c.partita_iva || "-"}
                  </td>
                  <td style={{ padding: 8, fontWeight: "bold" }}>
                    € {(c.totale || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: 8 }}>
                    € {(c.totale_iva || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      background: c.status === "imported" ? "#e3f2fd" : "#c8e6c9",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12
                    }}>
                      {c.status === "imported" ? "Importato" : c.status || "OK"}
                    </span>
                  </td>
                  <td style={{ padding: 8 }}>
                    <button 
                      onClick={() => handleDelete(c.id)}
                      style={{ color: "#c00" }}
                      title="Elimina"
                      data-testid={`delete-corrispettivo-${c.id}`}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="h1">Informazioni</div>
        <ul style={{ paddingLeft: 20 }}>
          <li>Formato supportato: XML Agenzia delle Entrate (RT)</li>
          <li>I corrispettivi vengono automaticamente registrati nel sistema</li>
          <li>I dati IVA vengono estratti e aggregati per la liquidazione</li>
          <li><strong>Upload massivo:</strong> puoi caricare più file XML contemporaneamente</li>
          <li><strong>Controllo duplicati:</strong> i corrispettivi già importati vengono automaticamente saltati</li>
        </ul>
      </div>
    </>
  );
}
