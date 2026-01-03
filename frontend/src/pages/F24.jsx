import React, { useState } from "react";
import { uploadDocument } from "../api";

export default function Page() {
  const [file, setFile] = useState(null);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState("");

  async function onUpload(kind) {
    setErr("");
    setOut(null);
    if (!file) return setErr("Seleziona un file.");
    try {
      const res = await uploadDocument(file, kind);
      setOut(res);
    } catch (e) {
      setErr("Upload fallito. Verifica backend e endpoint /api/portal/upload.");
    }
  }

  return (
    <>
      <div className="card">
        <div className="h1">F24 (PDF) – ERARIO / IVA</div>
        <div className="row">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="primary" onClick={() => onUpload("f24-pdf")}>Carica PDF F24</button>
        </div>
        {err && <div className="small" style={{ marginTop: 10 }}>{err}</div>}
      </div>

      <div className="card">
        <div className="small">Risposta</div>
        <pre>{out ? JSON.stringify(out, null, 2) : "—"}</pre>
      </div>
    </>
  );
}
