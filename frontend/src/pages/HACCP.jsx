import React, { useState, useEffect } from "react";
import api from "../api";
import { formatDateTimeIT } from "../lib/utils";

export default function HACCP() {
  const [temperatures, setTemperatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");
  const [newTemp, setNewTemp] = useState({
    equipment: "",
    temperature: "",
    location: "",
    notes: ""
  });

  const cardStyle = { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', marginBottom: 20 };
  const btnPrimary = { padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 };
  const btnSecondary = { padding: '10px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 };
  const inputStyle = { padding: '10px 12px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 14 };

  useEffect(() => {
    loadTemperatures();
  }, []);

  async function loadTemperatures() {
    try {
      setLoading(true);
      const r = await api.get("/api/haccp/temperatures");
      setTemperatures(Array.isArray(r.data) ? r.data : r.data?.items || []);
    } catch (e) {
      console.error("Error loading temperatures:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemp(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/haccp/temperatures", {
        equipment_name: newTemp.equipment,
        temperature: parseFloat(newTemp.temperature),
        location: newTemp.location,
        notes: newTemp.notes,
        recorded_at: new Date().toISOString()
      });
      setShowForm(false);
      setNewTemp({ equipment: "", temperature: "", location: "", notes: "" });
      loadTemperatures();
    } catch (e) {
      setErr("Errore: " + (e.response?.data?.detail || e.message));
    }
  }

  function getTempStatus(temp) {
    if (temp < -18) return { text: "OK (Congelatore)", color: "#0066cc" };
    if (temp >= -18 && temp <= 0) return { text: "OK (Freezer)", color: "#0088cc" };
    if (temp >= 0 && temp <= 4) return { text: "OK (Frigo)", color: "#16a34a" };
    if (temp >= 4 && temp <= 8) return { text: "Attenzione", color: "#f59e0b" };
    return { text: "Fuori range!", color: "#dc2626" };
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>🌡️ HACCP - Controllo Temperature</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>Registrazione temperature per conformità HACCP</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>➕ Nuova Rilevazione</button>
          <button style={btnSecondary} onClick={loadTemperatures}>🔄 Aggiorna</button>
        </div>
      </div>
      
      {err && <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", marginBottom: 20 }}>❌ {err}</div>}

      {/* Form Nuova Rilevazione */}
      {showForm && (
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' }}>➕ Nuova Rilevazione Temperatura</h2>
          <form onSubmit={handleCreateTemp}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <input
                placeholder="Attrezzatura (es. Frigo 1)"
                value={newTemp.equipment}
                onChange={(e) => setNewTemp({ ...newTemp, equipment: e.target.value })}
                required
                style={{ ...inputStyle, minWidth: 180 }}
              />
              <input
                type="number"
                step="0.1"
                placeholder="Temperatura °C"
                value={newTemp.temperature}
                onChange={(e) => setNewTemp({ ...newTemp, temperature: e.target.value })}
                required
                style={inputStyle}
              />
              <input
                placeholder="Posizione"
                value={newTemp.location}
                onChange={(e) => setNewTemp({ ...newTemp, location: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                placeholder="Note"
                value={newTemp.notes}
                onChange={(e) => setNewTemp({ ...newTemp, notes: e.target.value })}
                style={{ ...inputStyle, flex: 1, minWidth: 200 }}
              />
              <button type="submit" style={btnPrimary}>✅ Registra</button>
              <button type="button" style={btnSecondary} onClick={() => setShowForm(false)}>Annulla</button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ ...cardStyle, background: "#dcfce7", textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 4 }}>Range Frigo</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#166534' }}>0°C - 4°C</div>
          <div style={{ fontSize: 12, color: '#16a34a' }}>Temperatura ottimale</div>
        </div>
        <div style={{ ...cardStyle, background: "#dbeafe", textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 13, color: '#1e40af', marginBottom: 4 }}>Range Freezer</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1e3a8a' }}>-18°C</div>
          <div style={{ fontSize: 12, color: '#1e40af' }}>Congelamento</div>
        </div>
      </div>

      {/* Lista Temperature */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' }}>📋 Registro Temperature ({temperatures.length})</h2>
        {loading ? (
          <div style={{ fontSize: 14, color: '#6b7280', padding: 20 }}>⏳ Caricamento...</div>
        ) : temperatures.length === 0 ? (
          <div style={{ fontSize: 14, color: '#6b7280', padding: 20 }}>Nessuna rilevazione registrata. Clicca "+ Nuova Rilevazione" per aggiungerne una.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Data/Ora</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Attrezzatura</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>Temperatura</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Stato</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Posizione</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {temperatures.map((t, i) => {
                  const status = getTempStatus(t.temperature);
                  return (
                    <tr key={t.id || i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '12px 16px' }}>{formatDateTimeIT(t.recorded_at || t.created_at)}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{t.equipment_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: "bold", color: status.color }}>
                        {t.temperature}°C
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          background: status.color === '#16a34a' ? '#dcfce7' : status.color === '#f59e0b' ? '#fef3c7' : '#fee2e2',
                          color: status.color,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: '600'
                        }}>
                          {status.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{t.location || "-"}</td>
                      <td style={{ padding: '12px 16px' }}>{t.notes || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
