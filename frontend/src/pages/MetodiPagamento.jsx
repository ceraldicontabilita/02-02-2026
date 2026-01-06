import React, { useState, useEffect } from "react";
import api from "../api";

export default function MetodiPagamento() {
  const [loading, setLoading] = useState(true);
  const [fornitori, setFornitori] = useState([]);
  const [metodiDefault, setMetodiDefault] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [fornitoriRes, metodiRes] = await Promise.all([
        api.get("/api/fornitori/metodi-pagamento"),
        api.get("/api/metodi-pagamento")
      ]);
      setFornitori(fornitoriRes.data || []);
      setMetodiDefault(metodiRes.data || []);
    } catch (e) {
      console.error("Error loading data:", e);
      setErr("Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportFromInvoices() {
    setLoading(true);
    setErr("");
    setSuccess("");
    try {
      const res = await api.post("/api/fornitori/import-metodi-da-fatture");
      setSuccess(`Importati ${res.data.imported} metodi pagamento da fatture`);
      loadData();
    } catch (e) {
      setErr("Errore importazione: " + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(supplier) {
    setErr("");
    setSuccess("");
    try {
      await api.post("/api/fornitori/metodo-pagamento", supplier);
      setSuccess(`Metodo pagamento salvato per ${supplier.supplier_name}`);
      setEditingSupplier(null);
      loadData();
    } catch (e) {
      setErr("Errore salvataggio: " + (e.response?.data?.detail || e.message));
    }
  }

  async function handleDelete(supplierVat) {
    if (!window.confirm("Rimuovere configurazione? Il fornitore tornerà al metodo default (Bonifico 30gg)")) return;
    setErr("");
    try {
      await api.delete(`/api/fornitori/${supplierVat}/metodo-pagamento`);
      setSuccess("Configurazione rimossa");
      loadData();
    } catch (e) {
      setErr("Errore eliminazione: " + (e.response?.data?.detail || e.message));
    }
  }

  const filteredFornitori = fornitori.filter(f => 
    f.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.supplier_vat?.includes(searchTerm)
  );

  const getMetodoColor = (codice) => {
    const colors = {
      "BB": "#1976d2",
      "RIBA": "#7b1fa2",
      "RID": "#d32f2f",
      "CONT": "#388e3c",
      "30GG": "#f57c00",
      "60GG": "#fbc02d",
      "90GG": "#c62828"
    };
    return colors[codice] || "#666";
  };

  return (
    <>
      <div className="card">
        <div className="h1">Metodi Pagamento Fornitori</div>
        <div className="small" style={{ marginBottom: 15 }}>
          Configura i metodi di pagamento preferiti per ogni fornitore. I dati possono essere importati automaticamente dalle fatture.
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 15 }}>
          <button 
            className="primary" 
            onClick={handleImportFromInvoices}
            disabled={loading}
          >
            📥 Importa da Fatture
          </button>
          <button onClick={loadData} disabled={loading}>
            🔄 Aggiorna
          </button>
        </div>

        {err && (
          <div style={{ background: "#ffcdd2", color: "#c62828", padding: 10, borderRadius: 4, marginBottom: 15 }}>
            {err}
          </div>
        )}

        {success && (
          <div style={{ background: "#c8e6c9", color: "#2e7d32", padding: 10, borderRadius: 4, marginBottom: 15 }}>
            {success}
          </div>
        )}
      </div>

      {/* Metodi Default */}
      <div className="card">
        <div className="h1">Metodi Disponibili</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {metodiDefault.map((m, i) => (
            <div 
              key={i} 
              style={{ 
                background: "#f5f5f5", 
                padding: "8px 15px", 
                borderRadius: 20,
                borderLeft: `4px solid ${getMetodoColor(m.codice)}`
              }}
            >
              <strong>{m.codice}</strong>
              <span style={{ marginLeft: 8, color: "#666" }}>{m.descrizione}</span>
              <span style={{ marginLeft: 8, color: "#999", fontSize: 12 }}>({m.giorni_default}gg)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ricerca */}
      <div className="card">
        <input
          type="text"
          placeholder="🔍 Cerca fornitore per nome o P.IVA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
      </div>

      {/* Lista Fornitori */}
      <div className="card">
        <div className="h1">Fornitori Configurati ({filteredFornitori.length})</div>
        
        {loading ? (
          <div className="small">Caricamento...</div>
        ) : filteredFornitori.length === 0 ? (
          <div className="small" style={{ color: "#999" }}>
            Nessun fornitore configurato. Usa "Importa da Fatture" per iniziare.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Fornitore</th>
                <th style={{ padding: 10 }}>P.IVA</th>
                <th style={{ padding: 10 }}>Metodo</th>
                <th style={{ padding: 10 }}>Giorni</th>
                <th style={{ padding: 10 }}>IBAN</th>
                <th style={{ padding: 10 }}>Note</th>
                <th style={{ padding: 10 }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredFornitori.map((f, i) => (
                <tr key={f.supplier_vat || i} style={{ borderBottom: "1px solid #eee" }}>
                  {editingSupplier?.supplier_vat === f.supplier_vat ? (
                    // Modalità Edit
                    <>
                      <td style={{ padding: 10 }}>
                        <strong>{f.supplier_name}</strong>
                      </td>
                      <td style={{ padding: 10 }}>{f.supplier_vat}</td>
                      <td style={{ padding: 10 }}>
                        <select
                          value={editingSupplier.metodo_pagamento}
                          onChange={(e) => setEditingSupplier({
                            ...editingSupplier,
                            metodo_pagamento: e.target.value,
                            giorni_pagamento: metodiDefault.find(m => m.codice === e.target.value)?.giorni_default || 30
                          })}
                          style={{ padding: 5 }}
                        >
                          {metodiDefault.map(m => (
                            <option key={m.codice} value={m.codice}>
                              {m.codice} - {m.descrizione}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          type="number"
                          value={editingSupplier.giorni_pagamento}
                          onChange={(e) => setEditingSupplier({
                            ...editingSupplier,
                            giorni_pagamento: parseInt(e.target.value) || 0
                          })}
                          style={{ width: 60, padding: 5 }}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          type="text"
                          value={editingSupplier.iban || ""}
                          onChange={(e) => setEditingSupplier({
                            ...editingSupplier,
                            iban: e.target.value
                          })}
                          placeholder="IT..."
                          style={{ width: 200, padding: 5 }}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <input
                          type="text"
                          value={editingSupplier.note || ""}
                          onChange={(e) => setEditingSupplier({
                            ...editingSupplier,
                            note: e.target.value
                          })}
                          style={{ width: 150, padding: 5 }}
                        />
                      </td>
                      <td style={{ padding: 10 }}>
                        <button 
                          onClick={() => handleSave(editingSupplier)}
                          style={{ background: "#4caf50", color: "white", marginRight: 5 }}
                        >
                          ✓
                        </button>
                        <button onClick={() => setEditingSupplier(null)}>
                          ✕
                        </button>
                      </td>
                    </>
                  ) : (
                    // Modalità View
                    <>
                      <td style={{ padding: 10 }}>
                        <strong>{f.supplier_name}</strong>
                        {f.is_default && (
                          <span style={{ 
                            marginLeft: 8, 
                            background: "#fff3e0", 
                            color: "#e65100",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11
                          }}>
                            Default
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                        {f.supplier_vat}
                      </td>
                      <td style={{ padding: 10 }}>
                        <span style={{ 
                          background: getMetodoColor(f.metodo_pagamento) + "20",
                          color: getMetodoColor(f.metodo_pagamento),
                          padding: "4px 12px",
                          borderRadius: 15,
                          fontWeight: "bold",
                          fontSize: 13
                        }}>
                          {f.metodo_pagamento}
                        </span>
                        <div className="small" style={{ color: "#666", marginTop: 2 }}>
                          {f.descrizione_metodo}
                        </div>
                      </td>
                      <td style={{ padding: 10, fontWeight: "bold" }}>
                        {f.giorni_pagamento} gg
                      </td>
                      <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>
                        {f.iban ? (
                          <span title={f.iban}>
                            {f.iban.substring(0, 15)}...
                          </span>
                        ) : "-"}
                      </td>
                      <td style={{ padding: 10, color: "#666", fontSize: 12 }}>
                        {f.note || "-"}
                      </td>
                      <td style={{ padding: 10 }}>
                        <button 
                          onClick={() => setEditingSupplier({...f})}
                          style={{ marginRight: 5 }}
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDelete(f.supplier_vat)}
                          style={{ background: "#ffcdd2", color: "#c62828" }}
                          title="Rimuovi configurazione"
                        >
                          🗑️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Statistiche */}
      <div className="card" style={{ background: "#e8f5e9" }}>
        <div className="h1">Statistiche</div>
        <div className="grid">
          <div>
            <strong>Fornitori Configurati</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#2e7d32" }}>
              {fornitori.length}
            </div>
          </div>
          <div>
            <strong>Bonifico Bancario</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#1976d2" }}>
              {fornitori.filter(f => f.metodo_pagamento === "BB").length}
            </div>
          </div>
          <div>
            <strong>RIBA</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#7b1fa2" }}>
              {fornitori.filter(f => f.metodo_pagamento === "RIBA").length}
            </div>
          </div>
          <div>
            <strong>Altri Metodi</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#666" }}>
              {fornitori.filter(f => !["BB", "RIBA"].includes(f.metodo_pagamento)).length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
