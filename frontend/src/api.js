import axios from "axios";

const api = axios.create({
  baseURL: "",
  timeout: 30000,
});

export async function health() {
  const r = await api.get("/api/health");
  return r.data;
}

export async function dashboardSummary() {
  // Try to get KPI data from the backend
  try {
    const r = await api.get("/api/dashboard/kpi");
    return {
      invoices_total: r.data.invoices_count || 0,
      reconciled: r.data.pending_payments || 0,
      products: r.data.suppliers_count || 0,
      haccp_items: 0
    };
  } catch (e) {
    // Return placeholder data if endpoint requires authentication
    return {
      invoices_total: "—",
      reconciled: "—", 
      products: "—",
      haccp_items: "—"
    };
  }
}

export async function uploadDocument(file, kind) {
  // kind: 'fatture-xml' | 'corrispettivi-xml' | 'f24-pdf' | 'paghe-pdf' | 'estratto-conto'
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const r = await api.post("/api/portal/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
}
