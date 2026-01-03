import React, { useEffect, useState } from "react";
import { dashboardSummary, health } from "../api";

export default function Dashboard() {
  const [h, setH] = useState(null);
  const [sum, setSum] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const healthData = await health();
        setH(healthData);
        const summaryData = await dashboardSummary();
        setSum(summaryData);
      } catch (e) {
        console.error("Dashboard error:", e);
        setErr("Backend non raggiungibile. Verifica che il server sia attivo.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="h1">Dashboard</div>
        <div className="small">Caricamento in corso...</div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="h1">Dashboard</div>
        {err ? (
          <div className="small" style={{ color: "#c00" }}>{err}</div>
        ) : (
          <div className="small" style={{ color: "#0a0" }}>
            ✓ Backend connesso - Database: {h?.database || "connesso"}
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <div className="small">Fatture</div>
          <div className="kpi">{sum?.invoices_total ?? 0}</div>
          <div className="small">Totale registrate</div>
        </div>
        <div className="card">
          <div className="small">Fornitori</div>
          <div className="kpi">{sum?.suppliers ?? 0}</div>
          <div className="small">Registrati</div>
        </div>
        <div className="card">
          <div className="small">Magazzino</div>
          <div className="kpi">{sum?.products ?? 0}</div>
          <div className="small">Prodotti a stock</div>
        </div>
        <div className="card">
          <div className="small">HACCP</div>
          <div className="kpi">{sum?.haccp_items ?? 0}</div>
          <div className="small">Registrazioni temperature</div>
        </div>
        <div className="card">
          <div className="small">Dipendenti</div>
          <div className="kpi">{sum?.employees ?? 0}</div>
          <div className="small">In organico</div>
        </div>
        <div className="card">
          <div className="small">Riconciliazione</div>
          <div className="kpi">{sum?.reconciled ?? 0}</div>
          <div className="small">Movimenti riconciliati</div>
        </div>
      </div>

      <div className="card">
        <div className="h1">Benvenuto in Azienda Semplice</div>
        <div className="small">
          Sistema ERP completo per la gestione aziendale. Usa il menu a sinistra per navigare tra le sezioni:
        </div>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li><strong>Fatture & XML</strong> - Carica e gestisci fatture elettroniche</li>
          <li><strong>Corrispettivi</strong> - Gestione corrispettivi giornalieri</li>
          <li><strong>Prima Nota</strong> - Registrazioni cassa e banca</li>
          <li><strong>Magazzino</strong> - Inventario e movimenti</li>
          <li><strong>HACCP</strong> - Controllo temperature e sicurezza alimentare</li>
          <li><strong>F24</strong> - Gestione tributi e modelli F24</li>
          <li><strong>Paghe</strong> - Gestione buste paga</li>
        </ul>
      </div>
    </>
  );
}
