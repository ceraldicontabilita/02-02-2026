import React, { useState } from "react";
import api from "../api";

export default function Export() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const exports = [
    { type: "invoices", label: "Fatture", icon: "📄" },
    { type: "corrispettivi", label: "Corrispettivi", icon: "🧾" },
    { type: "fornitori", label: "Fornitori", icon: "📦" },
    { type: "prima_nota", label: "Prima Nota", icon: "📒" },
    { type: "iva", label: "Calcolo IVA", icon: "📊" },
  ];

  const cardStyle = { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', marginBottom: 20 };
  const btnPrimary = { padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 };
  const btnSecondary = { padding: '10px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 };

  async function handleExport(type, format) {
    setLoading(true);
    setErr("");
    setSuccess("");
    try {
      const r = await api.get(`/api/exports/${type}?format=${format}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${type}_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess(`Export ${type} completato!`);
    } catch (e) {
      setErr("Errore export: " + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
        borderRadius: 12,
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>📤 Export Dati</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>Esporta i dati del sistema in vari formati</p>
        </div>
      </div>
      
      {err && <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", marginBottom: 20 }}>❌ {err}</div>}
      {success && <div style={{ padding: 16, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, color: "#16a34a", marginBottom: 20 }}>✅ {success}</div>}

      {/* Export Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 20 }}>
        {exports.map((exp) => (
          <div key={exp.type} style={{ ...cardStyle, marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{exp.icon}</div>
            <div style={{ fontWeight: "bold", marginBottom: 16, fontSize: 18, color: '#1e3a5f' }}>{exp.label}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button 
                onClick={() => handleExport(exp.type, "xlsx")} 
                disabled={loading}
                style={btnPrimary}
              >
                📊 Excel
              </button>
              <button 
                onClick={() => handleExport(exp.type, "json")} 
                disabled={loading}
                style={btnSecondary}
              >
                📋 JSON
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ marginTop: 20, padding: 16, background: '#f0f9ff', borderRadius: 8, fontSize: 13, color: '#1e3a5f' }}>
        <strong>ℹ️ Informazioni</strong>
        <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
          <li><strong>Excel (.xlsx)</strong> - Formato compatibile con Microsoft Excel e Google Sheets</li>
          <li><strong>JSON</strong> - Formato dati strutturato per integrazioni</li>
          <li>I file vengono scaricati automaticamente</li>
        </ul>
      </div>
    </div>
  );
}
