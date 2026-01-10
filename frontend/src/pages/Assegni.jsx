import React, { useState, useEffect } from "react";
import api from "../api";
import { formatDateIT, formatEuro } from "../lib/utils";
import { 
  FileCheck, Plus, RefreshCw, Edit, Check, X, ArrowUp, ArrowDown
} from "lucide-react";

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

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <FileCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestione Assegni</h1>
            <p className="text-sm text-gray-500">Registro assegni emessi e ricevuti</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
          >
            <Plus size={16} /> Nuovo Assegno
          </button>
          <button 
            onClick={loadChecks}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            <RefreshCw size={16} /> Aggiorna
          </button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <X size={16} /> {err}
        </div>
      )}

      {/* Form Nuovo Assegno */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold mb-4">Registra Assegno</h2>
          <form onSubmit={handleCreateCheck} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo</label>
                <select
                  value={newCheck.type}
                  onChange={(e) => setNewCheck({ ...newCheck, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="emesso">Emesso (da pagare)</option>
                  <option value="ricevuto">Ricevuto (da incassare)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Importo €</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCheck.amount}
                  onChange={(e) => setNewCheck({ ...newCheck, amount: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Beneficiario/Emittente</label>
                <input
                  placeholder="Nome"
                  value={newCheck.beneficiary}
                  onChange={(e) => setNewCheck({ ...newCheck, beneficiary: e.target.value })}
                  required
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Numero Assegno</label>
                <input
                  placeholder="N. Assegno"
                  value={newCheck.check_number}
                  onChange={(e) => setNewCheck({ ...newCheck, check_number: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Banca</label>
                <input
                  placeholder="Nome banca"
                  value={newCheck.bank}
                  onChange={(e) => setNewCheck({ ...newCheck, bank: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Scadenza</label>
                <input
                  type="date"
                  value={newCheck.due_date}
                  onChange={(e) => setNewCheck({ ...newCheck, due_date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Fornitore (per riconciliazione)</label>
                <input
                  placeholder="Nome fornitore"
                  value={newCheck.fornitore}
                  onChange={(e) => setNewCheck({ ...newCheck, fornitore: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Numero Fattura</label>
                <input
                  placeholder="N. Fattura"
                  value={newCheck.numero_fattura}
                  onChange={(e) => setNewCheck({ ...newCheck, numero_fattura: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Annulla
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
              >
                Registra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Assegni */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Elenco Assegni ({checks.length})</h2>
          <p className="text-sm text-gray-500 mt-1">
            Compila Fornitore e N. Fattura per aiutare la riconciliazione automatica
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : checks.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nessun assegno registrato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Numero</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Importo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Beneficiario</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fornitore</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N. Fattura</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Scadenza</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stato</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c, i) => (
                  <tr key={c.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        c.type === "emesso" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}>
                        {c.type === "emesso" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {c.type === "emesso" ? "Emesso" : "Ricevuto"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{c.check_number || c.numero || "-"}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatEuro(c.amount || c.importo)}</td>
                    <td className="px-4 py-3 text-sm">{c.beneficiary || c.beneficiario || "-"}</td>
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <input
                          value={editData.fornitore || ""}
                          onChange={(e) => setEditData({ ...editData, fornitore: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                          placeholder="Fornitore"
                        />
                      ) : (
                        <span className={c.fornitore ? "text-gray-900" : "text-gray-400"}>{c.fornitore || "-"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <input
                          value={editData.numero_fattura || ""}
                          onChange={(e) => setEditData({ ...editData, numero_fattura: e.target.value })}
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-sm"
                          placeholder="N. Fatt."
                        />
                      ) : (
                        <span className={c.numero_fattura ? "text-gray-900" : "text-gray-400"}>{c.numero_fattura || "-"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDateIT(c.due_date || c.data_scadenza) || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                        {c.status || c.stato || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === c.id ? (
                        <div className="flex gap-1 justify-center">
                          <button 
                            onClick={() => handleUpdateCheck(c.id)} 
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => startEdit(c)} 
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                        >
                          <Edit size={16} />
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
