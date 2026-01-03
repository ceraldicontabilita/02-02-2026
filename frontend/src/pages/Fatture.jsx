import React, { useState, useEffect } from "react";
import { uploadDocument, getInvoices, createInvoice } from "../api";

export default function Fatture() {
  const [file, setFile] = useState(null);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    numero: "",
    fornitore: "",
    importo: "",
    data: new Date().toISOString().split("T")[0],
    descrizione: ""
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      setLoading(true);
      const data = await getInvoices();
      setInvoices(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      console.error("Error loading invoices:", e);
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(kind) {
    setErr("");
    setOut(null);
    if (!file) return setErr("Seleziona un file XML.");
    try {
      const res = await uploadDocument(file, kind);
      setOut(res);
      loadInvoices();
    } catch (e) {
      setErr("Upload fallito. " + (e.response?.data?.detail || e.message));
    }
  }

  async function handleCreateInvoice(e) {
    e.preventDefault();
    try {
      await createInvoice({
        invoice_number: newInvoice.numero,
        supplier_name: newInvoice.fornitore,
        total_amount: parseFloat(newInvoice.importo) || 0,
        invoice_date: newInvoice.data,
        description: newInvoice.descrizione,
        status: "pending"
      });
      setShowForm(false);
      setNewInvoice({ numero: "", fornitore: "", importo: "", data: new Date().toISOString().split("T")[0], descrizione: "" });
      loadInvoices();
    } catch (e) {
      setErr("Errore creazione fattura: " + (e.response?.data?.detail || e.message));
    }
  }

  return (
    <>
      <div className="card">
        <div className="h1">Fatture & XML</div>
        <div className="row">
          <input type="file" accept=".xml" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="primary" onClick={() => onUpload("fatture-xml")}>Carica Fatture XML</button>
          <button onClick={() => setShowForm(!showForm)}>+ Nuova Fattura Manuale</button>
        </div>
        {err && <div className="small" style={{ marginTop: 10, color: "#c00" }}>{err}</div>}
      </div>

      {showForm && (
        <div className="card">
          <div className="h1">Nuova Fattura</div>
          <form onSubmit={handleCreateInvoice}>
            <div className="row" style={{ marginBottom: 10 }}>
              <input
                placeholder="Numero Fattura"
                value={newInvoice.numero}
                onChange={(e) => setNewInvoice({ ...newInvoice, numero: e.target.value })}
                required
              />
              <input
                placeholder="Fornitore"
                value={newInvoice.fornitore}
                onChange={(e) => setNewInvoice({ ...newInvoice, fornitore: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Importo €"
                value={newInvoice.importo}
                onChange={(e) => setNewInvoice({ ...newInvoice, importo: e.target.value })}
                required
              />
              <input
                type="date"
                value={newInvoice.data}
                onChange={(e) => setNewInvoice({ ...newInvoice, data: e.target.value })}
              />
            </div>
            <div className="row">
              <input
                placeholder="Descrizione"
                style={{ flex: 1 }}
                value={newInvoice.descrizione}
                onChange={(e) => setNewInvoice({ ...newInvoice, descrizione: e.target.value })}
              />
              <button type="submit" className="primary">Salva</button>
              <button type="button" onClick={() => setShowForm(false)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {out && (
        <div className="card">
          <div className="small">Risposta Upload</div>
          <pre>{JSON.stringify(out, null, 2)}</pre>
        </div>
      )}

      <div className="card">
        <div className="h1">Elenco Fatture ({invoices.length})</div>
        {loading ? (
          <div className="small">Caricamento...</div>
        ) : invoices.length === 0 ? (
          <div className="small">Nessuna fattura registrata. Carica un file XML o crea una fattura manuale.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: 8 }}>Numero</th>
                <th style={{ padding: 8 }}>Fornitore</th>
                <th style={{ padding: 8 }}>Data</th>
                <th style={{ padding: 8 }}>Importo</th>
                <th style={{ padding: 8 }}>Stato</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id || i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{inv.invoice_number || inv.numero || "-"}</td>
                  <td style={{ padding: 8 }}>{inv.supplier_name || inv.fornitore || "-"}</td>
                  <td style={{ padding: 8 }}>{inv.invoice_date || inv.data || "-"}</td>
                  <td style={{ padding: 8 }}>€ {(inv.total_amount || inv.importo || 0).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{inv.status || "pending"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
