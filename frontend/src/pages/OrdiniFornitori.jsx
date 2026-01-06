import React, { useState, useEffect } from "react";
import api from "../api";
import { formatDateIT, formatEuro } from "../lib/utils";

// Dati azienda Ceraldi per intestazione email/PDF
const AZIENDA = {
  nome: "CERALDI GROUP S.R.L.",
  indirizzo: "Via Example, 123",
  cap: "00100",
  citta: "Roma",
  piva: "12345678901",
  email: "ordini@ceraldi.it",
  tel: "+39 06 12345678"
};

export default function OrdiniFornitori() {
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({ by_supplier: [], total_items: 0, total_amount: 0 });
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [generatingOrder, setGeneratingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cartRes, ordersRes] = await Promise.all([
        api.get("/api/comparatore/cart"),
        api.get("/api/ordini-fornitori")
      ]);
      setCart(cartRes.data || { by_supplier: [], total_items: 0, total_amount: 0 });
      setOrders(ordersRes.data || []);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateOrder(supplier) {
    setGeneratingOrder(supplier.supplier);
    setErr("");
    setSuccess("");
    
    try {
      const orderData = {
        supplier_name: supplier.supplier,
        items: supplier.items.map(item => ({
          product_name: item.normalized_name || item.original_description,
          description: item.original_description,
          quantity: item.quantity || 1,
          unit_price: item.price,
          unit: item.unit || "PZ"
        })),
        subtotal: supplier.subtotal,
        notes: ""
      };
      
      const res = await api.post("/api/ordini-fornitori", orderData);
      setSuccess(`Ordine #${res.data.order_number} generato per ${supplier.supplier}`);
      
      // Rimuovi items dal carrello
      for (const item of supplier.items) {
        try {
          await api.delete(`/api/comparatore/cart/${item.id}`);
        } catch (e) {
          console.warn("Errore rimozione item carrello:", e);
        }
      }
      
      loadData();
    } catch (e) {
      setErr("Errore generazione ordine: " + (e.response?.data?.detail || e.message));
    } finally {
      setGeneratingOrder(null);
    }
  }

  async function handleDeleteOrder(orderId) {
    if (!window.confirm("Eliminare questo ordine?")) return;
    try {
      await api.delete(`/api/ordini-fornitori/${orderId}`);
      setSuccess("Ordine eliminato");
      loadData();
    } catch (e) {
      setErr("Errore eliminazione: " + (e.response?.data?.detail || e.message));
    }
  }

  async function handleUpdateStatus(orderId, newStatus) {
    try {
      await api.put(`/api/ordini-fornitori/${orderId}`, { status: newStatus });
      setSuccess(`Stato aggiornato a "${newStatus}"`);
      loadData();
    } catch (e) {
      setErr("Errore aggiornamento: " + (e.response?.data?.detail || e.message));
    }
  }

  // Genera PDF dell'ordine
  function handlePrintOrder(order) {
    const printWindow = window.open('', '_blank');
    const imponibile = order.subtotal || order.total || 0;
    const iva = imponibile * 0.22;
    const totale = imponibile + iva;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ordine #${order.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company { font-size: 22px; font-weight: bold; color: #1a365d; }
          .info { color: #666; font-size: 12px; margin-top: 5px; }
          .order-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .order-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1a365d; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          .totals { text-align: right; margin-top: 20px; }
          .totals div { margin: 5px 0; }
          .total-row { font-size: 18px; font-weight: bold; color: #1a365d; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${AZIENDA.nome}</div>
          <div class="info">${AZIENDA.indirizzo} - ${AZIENDA.cap} ${AZIENDA.citta}</div>
          <div class="info">P.IVA: ${AZIENDA.piva} | Tel: ${AZIENDA.tel} | Email: ${AZIENDA.email}</div>
        </div>
        
        <div class="order-info">
          <div class="order-box">
            <strong>ORDINE N°</strong><br/>
            <span style="font-size: 24px; color: #1a365d;">#${order.order_number}</span>
          </div>
          <div class="order-box">
            <strong>DATA</strong><br/>
            ${new Date(order.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <div class="order-box">
            <strong>FORNITORE</strong><br/>
            ${order.supplier_name}
          </div>
        </div>
        
        <h3 style="color: #1a365d;">DETTAGLIO PRODOTTI</h3>
        <table>
          <thead>
            <tr>
              <th>Prodotto</th>
              <th>Quantità</th>
              <th style="text-align: right;">Prezzo Unit.</th>
              <th style="text-align: right;">Totale</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map(item => `
              <tr>
                <td>${item.product_name || item.description}</td>
                <td>${item.quantity || 1} ${item.unit || 'PZ'}</td>
                <td style="text-align: right;">€ ${(item.unit_price || 0).toFixed(2)}</td>
                <td style="text-align: right;">€ ${((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div>Imponibile: € ${imponibile.toFixed(2)}</div>
          <div>IVA (22%): € ${iva.toFixed(2)}</div>
          <div class="total-row">TOTALE: € ${totale.toFixed(2)}</div>
        </div>
        
        ${order.notes ? `<div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 8px;"><strong>Note:</strong> ${order.notes}</div>` : ''}
        
        <div class="footer">
          Documento generato il ${new Date().toLocaleDateString('it-IT')} - ${AZIENDA.nome}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  // Invia ordine via email
  async function handleSendEmail(order) {
    setSendingEmail(order.id);
    setErr("");
    
    try {
      // Prepara corpo email
      const imponibile = order.subtotal || order.total || 0;
      const iva = imponibile * 0.22;
      const totale = imponibile + iva;
      
      const emailBody = `
Con la presente, ${AZIENDA.nome} intende ordinare i seguenti prodotti:

ORDINE N° ${order.order_number}
Data: ${new Date(order.created_at).toLocaleDateString('it-IT')}

DETTAGLIO PRODOTTI:
${(order.items || []).map(item => 
  `- ${item.product_name || item.description}: ${item.quantity || 1} ${item.unit || 'PZ'} @ € ${(item.unit_price || 0).toFixed(2)} = € ${((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}`
).join('\n')}

TOTALI:
Imponibile: € ${imponibile.toFixed(2)}
IVA (22%): € ${iva.toFixed(2)}
TOTALE: € ${totale.toFixed(2)}

${order.notes ? `Note: ${order.notes}` : ''}

Cordiali saluti,
${AZIENDA.nome}
${AZIENDA.indirizzo} - ${AZIENDA.cap} ${AZIENDA.citta}
P.IVA: ${AZIENDA.piva}
Tel: ${AZIENDA.tel}
Email: ${AZIENDA.email}
      `.trim();

      // Salva invio nel backend
      await api.put(`/api/ordini-fornitori/${order.id}`, { 
        status: "inviato",
        sent_at: new Date().toISOString(),
        email_body: emailBody
      });

      // Apri client email
      const subject = encodeURIComponent(`Ordine ${order.order_number} - ${AZIENDA.nome}`);
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      
      setSuccess(`Ordine #${order.order_number} pronto per l'invio. Si aprirà il client email.`);
      loadData();
    } catch (e) {
      setErr("Errore preparazione email: " + (e.response?.data?.detail || e.message));
    } finally {
      setSendingEmail(null);
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      "bozza": { bg: "#f5f5f5", color: "#666" },
      "inviato": { bg: "#e3f2fd", color: "#1976d2" },
      "confermato": { bg: "#fff3e0", color: "#f57c00" },
      "consegnato": { bg: "#e8f5e9", color: "#388e3c" },
      "annullato": { bg: "#ffcdd2", color: "#c62828" }
    };
    return colors[status] || colors["bozza"];
  };

  return (
    <>
      <div className="card">
        <div className="h1">Ordini Fornitori</div>
        <div className="small" style={{ marginBottom: 15 }}>
          Genera ordini ai fornitori partendo dal carrello comparatore prezzi.
        </div>

        {err && (
          <div style={{ background: "#ffcdd2", color: "#c62828", padding: 10, borderRadius: 4, marginBottom: 15 }}>
            {err}
          </div>
        )}

        {success && (
          <div style={{ background: "#c8e6c9", color: "#2e7d32", padding: 10, borderRadius: 4, marginBottom: 15 }}>
            {success}
          </div>
        )}
      </div>

      {/* Carrello per Fornitore */}
      {cart.by_supplier.length > 0 && (
        <div className="card" style={{ background: "#fff3e0" }}>
          <div className="h1">🛒 Carrello - Prodotti da Ordinare</div>
          <div className="small" style={{ marginBottom: 15 }}>
            {cart.total_items} prodotti | Totale: <strong>€ {cart.total_amount.toFixed(2)}</strong>
          </div>

          {cart.by_supplier.map((supplier, i) => (
            <div 
              key={i} 
              style={{ 
                background: "white", 
                padding: 15, 
                borderRadius: 8, 
                marginBottom: 15,
                border: "1px solid #ffe0b2"
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{supplier.supplier}</strong>
                  <span style={{ marginLeft: 10, color: "#666" }}>
                    {supplier.items.length} prodotti
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 18, fontWeight: "bold", color: "#e65100", marginRight: 15 }}>
                    € {supplier.subtotal.toFixed(2)}
                  </span>
                  <button 
                    className="primary"
                    onClick={() => handleGenerateOrder(supplier)}
                    disabled={generatingOrder === supplier.supplier}
                  >
                    {generatingOrder === supplier.supplier ? "Generazione..." : "📝 Genera Ordine"}
                  </button>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: 5 }}>Prodotto</th>
                    <th style={{ padding: 5 }}>Quantità</th>
                    <th style={{ padding: 5, textAlign: "right" }}>Prezzo Unit.</th>
                    <th style={{ padding: 5, textAlign: "right" }}>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.items.map((item, j) => (
                    <tr key={j} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: 5 }}>
                        <strong>{item.normalized_name || item.original_description}</strong>
                        {item.normalized_name && item.original_description !== item.normalized_name && (
                          <div className="small" style={{ color: "#999" }}>
                            {item.original_description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 5 }}>{item.quantity || 1} {item.unit || "PZ"}</td>
                      <td style={{ padding: 5, textAlign: "right" }}>€ {item.price?.toFixed(2)}</td>
                      <td style={{ padding: 5, textAlign: "right", fontWeight: "bold" }}>
                        € {((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Lista Ordini */}
      <div className="card">
        <div className="h1">📋 Storico Ordini ({orders.length})</div>

        {loading ? (
          <div className="small">Caricamento...</div>
        ) : orders.length === 0 ? (
          <div className="small" style={{ color: "#999" }}>
            Nessun ordine generato. Aggiungi prodotti al carrello dalla pagina "Ricerca Prodotti".
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                <th style={{ padding: 10 }}>N° Ordine</th>
                <th style={{ padding: 10 }}>Data</th>
                <th style={{ padding: 10 }}>Fornitore</th>
                <th style={{ padding: 10 }}>Prodotti</th>
                <th style={{ padding: 10, textAlign: "right" }}>Totale</th>
                <th style={{ padding: 10 }}>Stato</th>
                <th style={{ padding: 10 }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => {
                const statusStyle = getStatusColor(order.status);
                return (
                  <tr key={order.id || i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 10, fontWeight: "bold" }}>
                      #{order.order_number}
                    </td>
                    <td style={{ padding: 10 }}>
                      {formatDateIT(order.created_at)}
                    </td>
                    <td style={{ padding: 10 }}>
                      <strong>{order.supplier_name}</strong>
                    </td>
                    <td style={{ padding: 10 }}>
                      {order.items?.length || 0} prodotti
                    </td>
                    <td style={{ padding: 10, textAlign: "right", fontWeight: "bold" }}>
                      € {(order.total || order.subtotal || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: 10 }}>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        style={{ 
                          background: statusStyle.bg, 
                          color: statusStyle.color,
                          border: "none",
                          padding: "5px 10px",
                          borderRadius: 15,
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        <option value="bozza">Bozza</option>
                        <option value="inviato">Inviato</option>
                        <option value="confermato">Confermato</option>
                        <option value="consegnato">Consegnato</option>
                        <option value="annullato">Annullato</option>
                      </select>
                    </td>
                    <td style={{ padding: 10 }}>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        style={{ background: "#ffcdd2", color: "#c62828" }}
                        title="Elimina ordine"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Riepilogo */}
      <div className="card" style={{ background: "#e8f5e9" }}>
        <div className="h1">Riepilogo</div>
        <div className="grid">
          <div>
            <strong>Ordini Totali</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#2e7d32" }}>
              {orders.length}
            </div>
          </div>
          <div>
            <strong>In Bozza</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#666" }}>
              {orders.filter(o => o.status === "bozza").length}
            </div>
          </div>
          <div>
            <strong>Inviati</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#1976d2" }}>
              {orders.filter(o => o.status === "inviato").length}
            </div>
          </div>
          <div>
            <strong>Consegnati</strong>
            <div style={{ fontSize: 24, fontWeight: "bold", color: "#388e3c" }}>
              {orders.filter(o => o.status === "consegnato").length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
