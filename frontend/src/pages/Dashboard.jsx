import React, { useEffect, useState } from "react";
import { dashboardSummary, health } from "../api";

export default function Dashboard() {
  const [h, setH] = useState(null);
  const [sum, setSum] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setH(await health());
      } catch (e) {
        setErr("Backend non raggiungibile su /api. Avvia prima il backend (porta 8000).");
      }
      setSum(await dashboardSummary());
    })();
  }, []);

  return (
    <>
      <div className="card">
        <div className="h1">Dashboard</div>
        {err ? <div className="small">{err}</div> : <div className="small">Stato backend: {h ? "OK" : "..."}</div>}
      </div>

      <div className="grid">
        <div className="card">
          <div className="small">Fatture (stato)</div>
          <div className="kpi">{sum?.invoices_total ?? "—"}</div>
          <div className="small">Totale registrate</div>
        </div>
        <div className="card">
          <div className="small">Riconciliazione</div>
          <div className="kpi">{sum?.reconciled ?? "—"}</div>
          <div className="small">Movimenti riconciliati</div>
        </div>
        <div className="card">
          <div className="small">Magazzino</div>
          <div className="kpi">{sum?.products ?? "—"}</div>
          <div className="small">Prodotti a stock</div>
        </div>
        <div className="card">
          <div className="small">HACCP</div>
          <div className="kpi">{sum?.haccp_items ?? "—"}</div>
          <div className="small">Ingredienti / schede</div>
        </div>
      </div>

      <div className="card">
        <div className="small">Nota</div>
        <div className="small">
          Se i KPI sono “—” significa che l’endpoint <code>/api/dashboard/summary</code> non è disponibile
          o non è ancora popolato: la UI resta comunque completa come sezioni.
        </div>
      </div>
    </>
  );
}
