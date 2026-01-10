import React, { useState, useEffect } from "react";
import api from "../api";
import { formatDateIT, formatEuro } from "../lib/utils";
import { useAnnoGlobale } from "../contexts/AnnoContext";

export default function Corrispettivi() {
  const { anno: selectedYear } = useAnnoGlobale();
  const [corrispettivi, setCorrispettivi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadCorrispettivi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  async function loadCorrispettivi() {
    try {
      setLoading(true);
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const r = await api.get(`/api/corrispettivi?data_da=${startDate}&data_a=${endDate}`);
      setCorrispettivi(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error("Error loading corrispettivi:", e);
    } finally {
      setLoading(false);
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
  const totaleCassa = corrispettivi.reduce((sum, c) => sum + (c.pagato_contanti || 0), 0);
  const totaleElettronico = corrispettivi.reduce((sum, c) => sum + (c.pagato_elettronico || 0), 0);
  const totaleIVA = corrispettivi.reduce((sum, c) => {
    if (c.totale_iva && c.totale_iva > 0) return sum + c.totale_iva;
    const totale = c.totale || 0;
    return sum + (totale - (totale / 1.10));
  }, 0);
  const totaleImponibile = totaleGiornaliero / 1.10;

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="h1">Corrispettivi Elettronici</div>
            <div className="small">
              Visualizzazione corrispettivi giornalieri dal registratore di cassa telematico.
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ 
              padding: "10px 16px", 
              borderRadius: 8, 
              background: "#e3f2fd",
              fontSize: 16,
              fontWeight: "bold",
              color: "#1565c0"
            }}>
              📅 Anno: {selectedYear}
            </span>
          </div>
        </div>
        
        <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 15 }}>
          <a 
            href="/import-export"
            style={{ 
              padding: "8px 16px",
              background: "#3b82f6",
              color: "white",
              fontWeight: "bold",
              borderRadius: 6,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            📥 Importa Corrispettivi
          </a>
          
          <button onClick={loadCorrispettivi} data-testid="corrispettivi-refresh-btn">
            🔄 Aggiorna
          </button>
        </div>
        
        {err && (
          <div className="small" style={{ marginTop: 10, color: "#c00", padding: 10, background: "#ffebee", borderRadius: 4 }} data-testid="corrispettivi-error">
            ❌ {err}
          </div>
        )}
      </div>

      {/* Riepilogo Totali */}
      {corrispettivi.length > 0 && (
        <div className="card" style={{ background: "#e3f2fd" }}>
          <div className="h1">Riepilogo Totali</div>
          <div className="grid">
            <div>
              <strong>Totale Corrispettivi</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#1565c0" }}>
                {formatEuro(totaleGiornaliero)}
              </div>
            </div>
            <div>
              <strong>💵 Pagato Cassa</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#2e7d32" }}>
                {formatEuro(totaleCassa)}
              </div>
            </div>
            <div>
              <strong>💳 Pagato Elettronico (POS)</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#9c27b0" }}>
                {formatEuro(totaleElettronico)}
              </div>
            </div>
            <div>
              <strong>IVA 10%</strong>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#e65100" }}>
                {formatEuro(totaleIVA)}
              </div>
              <div className="small" style={{ color: "#666" }}>
                Imponibile: {formatEuro(totaleImponibile)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dettaglio selezionato */}
      {selectedItem && (
        <div className="card" style={{ background: "#f5f5f5" }}>
          <div className="h1">
            Dettaglio Corrispettivo {selectedItem.data}
            <button onClick={() => setSelectedItem(null)} style={{ float: "right" }}>✕</button>
          </div>
          
          <div className="grid">
            <div>
              <strong>Dati Generali</strong>
              <div className="small">Data: {selectedItem.data}</div>
              <div className="small">Matricola RT: {selectedItem.matricola_rt || "-"}</div>
              <div className="small">P.IVA: {selectedItem.partita_iva || "-"}</div>
              <div className="small">N° Documenti: {selectedItem.numero_documenti || "-"}</div>
            </div>
            <div>
              <strong>Pagamenti</strong>
              <div className="small">💵 Cassa: {formatEuro(selectedItem.pagato_contanti)}</div>
              <div className="small">💳 Elettronico: {formatEuro(selectedItem.pagato_elettronico)}</div>
              <div className="small" style={{ fontWeight: "bold", marginTop: 5 }}>
                Totale: {formatEuro(selectedItem.totale)}
              </div>
            </div>
            <div>
              <strong>IVA</strong>
              <div className="small">Imponibile: {formatEuro(selectedItem.totale_imponibile)}</div>
              <div className="small">Imposta: {formatEuro(selectedItem.totale_iva)}</div>
            </div>
          </div>
          
          {selectedItem.riepilogo_iva && selectedItem.riepilogo_iva.length > 0 && (
            <div style={{ marginTop: 15 }}>
              <strong>Riepilogo per Aliquota IVA</strong>
              <table style={{ width: "100%", marginTop: 5, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <th style={{ textAlign: "left" }}>Aliquota</th>
                    <th style={{ textAlign: "right" }}>Imponibile</th>
                    <th style={{ textAlign: "right" }}>Imposta</th>
                    <th style={{ textAlign: "right" }}>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItem.riepilogo_iva.map((r, i) => (
                    <tr key={i}>
                      <td>{r.aliquota_iva}% {r.natura && `(${r.natura})`}</td>
                      <td style={{ textAlign: "right" }}>{formatEuro(r.ammontare)}</td>
                      <td style={{ textAlign: "right" }}>{formatEuro(r.imposta)}</td>
                      <td style={{ textAlign: "right" }}>{formatEuro(r.importo_parziale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            <a href="/import-export" style={{ color: "#1565c0" }}>Vai a Import/Export</a> per caricare i corrispettivi.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }} data-testid="corrispettivi-table">
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Data</th>
                <th style={{ padding: 8 }}>Matricola RT</th>
                <th style={{ padding: 8 }}>💵 Cassa</th>
                <th style={{ padding: 8 }}>💳 Elettronico</th>
                <th style={{ padding: 8 }}>Totale</th>
                <th style={{ padding: 8 }}>IVA</th>
                <th style={{ padding: 8 }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {corrispettivi.map((c, i) => (
                <tr key={c.id || i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    <strong>{formatDateIT(c.data) || "-"}</strong>
                  </td>
                  <td style={{ padding: 8 }}>
                    {c.matricola_rt || "-"}
                  </td>
                  <td style={{ padding: 8, color: "#2e7d32" }}>
                    {formatEuro(c.pagato_contanti)}
                  </td>
                  <td style={{ padding: 8, color: "#9c27b0" }}>
                    {formatEuro(c.pagato_elettronico)}
                  </td>
                  <td style={{ padding: 8, fontWeight: "bold" }}>
                    {formatEuro(c.totale)}
                  </td>
                  <td style={{ padding: 8 }}>
                    {formatEuro(c.totale_iva)}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button 
                      onClick={() => setSelectedItem(c)}
                      style={{ marginRight: 5 }}
                      title="Dettagli"
                    >
                      👁️
                    </button>
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
    </>
  );
}
