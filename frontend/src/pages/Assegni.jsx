import React, { useState, useEffect } from "react";
import api from "../api";
import { formatDateIT, formatEuro } from "../lib/utils";

export default function Assegni() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newCheck, setNewCheck] = useState({
    type: "emesso",
    amount: "",
    beneficiary: "",
    check_number: "",
    bank: "",
    due_date: new Date().toISOString().split("T")[0],
    fornitore: "",
    numero_fattura: ""
  });

  useEffect(() => { loadChecks(); }, []);

  async function loadChecks() {
    try {
      setLoading(true);
      const r = await api.get("/api/assegni");
      setChecks(Array.isArray(r.data) ? r.data : r.data?.items || []);
    } catch (e) {
      console.error("Error loading checks:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCheck(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/assegni", {
        type: newCheck.type,
        amount: parseFloat(newCheck.amount),
        beneficiary: newCheck.beneficiary,
        check_number: newCheck.check_number,
        bank: newCheck.bank,
        due_date: newCheck.due_date,
        status: "pending",
        fornitore: newCheck.fornitore,
        numero_fattura: newCheck.numero_fattura
      });
      setShowForm(false);
      setNewCheck({ type: "emesso", amount: "", beneficiary: "", check_number: "", bank: "", due_date: new Date().toISOString().split("T")[0], fornitore: "", numero_fattura: "" });
      loadChecks();
    } catch (e) {
      setErr("Errore: " + (e.response?.data?.detail || e.message));
    }
  }

  async function handleUpdateCheck(id) {
    try {
      await api.put(`/api/assegni/${id}`, editData);
      setEditingId(null);
      setEditData({});
      loadChecks();
    } catch (e) {
      setErr("Errore aggiornamento: " + (e.response?.data?.detail || e.message));
    }
  }

  function startEdit(check) {
    setEditingId(check.id);
    setEditData({
      fornitore: check.fornitore || check.beneficiary || "",
      numero_fattura: check.numero_fattura || ""
    });
  }

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: 8,
    border: '2px solid #e5e7eb',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box'
  };

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
        color: 'white',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>📝 Gestione Assegni</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>
            Registro assegni emessi e ricevuti
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{ 
              padding: '10px 20px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ➕ Nuovo Assegno
          </button>
          <button 
            onClick={loadChecks}
            style={{ 
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {err && (
        <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', marginBottom: 20 }}>
          ❌ {err}
        </div>
      )}

      {/* Form Nuovo Assegno */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>📝 Registra Assegno</h2>
          <form onSubmit={handleCreateCheck}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Tipo</label>
                <select
                  value={newCheck.type}
                  onChange={(e) => setNewCheck({ ...newCheck, type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="emesso">Emesso (da pagare)</option>
                  <option value="ricevuto">Ricevuto (da incassare)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Importo €</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCheck.amount}
                  onChange={(e) => setNewCheck({ ...newCheck, amount: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Beneficiario/Emittente</label>
                <input
                  placeholder="Nome"
                  value={newCheck.beneficiary}
                  onChange={(e) => setNewCheck({ ...newCheck, beneficiary: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Numero Assegno</label>
                <input
                  placeholder="N. Assegno"
                  value={newCheck.check_number}
                  onChange={(e) => setNewCheck({ ...newCheck, check_number: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Banca</label>
                <input
                  placeholder="Nome banca"
                  value={newCheck.bank}
                  onChange={(e) => setNewCheck({ ...newCheck, bank: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Scadenza</label>
                <input
                  type="date"
                  value={newCheck.due_date}
                  onChange={(e) => setNewCheck({ ...newCheck, due_date: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Fornitore (per riconciliazione)</label>
                <input
                  placeholder="Nome fornitore"
                  value={newCheck.fornitore}
                  onChange={(e) => setNewCheck({ ...newCheck, fornitore: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: '600' }}>Numero Fattura</label>
                <input
                  placeholder="N. Fattura"
                  value={newCheck.numero_fattura}
                  onChange={(e) => setNewCheck({ ...newCheck, numero_fattura: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 20px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600' }}
              >
                Annulla
              </button>
              <button 
                type="submit"
                style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✅ Registra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Assegni */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>📋 Elenco Assegni ({checks.length})</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
            Compila Fornitore e N. Fattura per aiutare la riconciliazione automatica
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            ⏳ Caricamento...
          </div>
        ) : checks.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ color: '#6b7280' }}>Nessun assegno registrato</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>Tipo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>Numero</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontSize: 13 }}>Importo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>Beneficiario</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>Fornitore</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>N. Fattura</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>Scadenza</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: 13 }}>Stato</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', fontSize: 13 }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: 6, 
                        fontSize: 11, 
                        fontWeight: '600',
                        background: c.type === "emesso" ? '#fee2e2' : '#dcfce7',
                        color: c.type === "emesso" ? '#dc2626' : '#16a34a'
                      }}>
                        {c.type === "emesso" ? "⬆️ Emesso" : "⬇️ Ricevuto"}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.check_number || c.numero || "-"}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>{formatEuro(c.amount || c.importo)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.beneficiary || c.beneficiario || "-"}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingId === c.id ? (
                        <input
                          value={editData.fornitore || ""}
                          onChange={(e) => setEditData({ ...editData, fornitore: e.target.value })}
                          style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: '100%' }}
                          placeholder="Fornitore"
                        />
                      ) : (
                        <span style={{ color: c.fornitore ? '#111' : '#9ca3af' }}>{c.fornitore || "-"}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingId === c.id ? (
                        <input
                          value={editData.numero_fattura || ""}
                          onChange={(e) => setEditData({ ...editData, numero_fattura: e.target.value })}
                          style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, width: 80 }}
                          placeholder="N. Fatt."
                        />
                      ) : (
                        <span style={{ color: c.numero_fattura ? '#111' : '#9ca3af' }}>{c.numero_fattura || "-"}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{formatDateIT(c.due_date || c.data_scadenza) || "-"}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', background: '#fef3c7', color: '#d97706', borderRadius: 6, fontSize: 11, fontWeight: '600' }}>
                        {c.status || c.stato || "pending"}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {editingId === c.id ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleUpdateCheck(c.id)} 
                            style={{ padding: '6px 10px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            style={{ padding: '6px 10px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => startEdit(c)} 
                          style={{ padding: '6px 10px', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
