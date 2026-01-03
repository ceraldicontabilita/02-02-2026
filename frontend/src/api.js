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
  const r = await api.get("/api/dashboard/summary").catch(() => ({ data: null }));
  return r.data;
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
