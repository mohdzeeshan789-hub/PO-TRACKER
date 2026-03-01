import { useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const po = await db.purchaseOrder.findFirst({
    where: { id: params.id, shop: session.shop },
    include: { items: true }
  });
  return { po };
}

export default function PODetail() {
  const { po } = useLoaderData();
  const navigate = useNavigate();
  const [status, setStatus] = useState(po.status);

  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  const total = po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const received = po.items.reduce((s, i) => s + i.receivedQty * i.unitCost, 0);
  const progress = total > 0 ? Math.round((received / total) * 100) : 0;

  const STATUS_CONFIG = {
    draft:     { label: "Draft",     color: "#64748b" },
    sent:      { label: "Sent",      color: "#d97706" },
    confirmed: { label: "Confirmed", color: "#0284c7" },
    received:  { label: "Received",  color: "#16a34a" },
  };

  const updateStatus = async (newStatus) => {
    await fetch("/api/purchase-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: po.id, status: newStatus, supplierName: po.supplierName, supplierEmail: po.supplierEmail, expectedDate: po.expectedDate, notes: po.notes, items: po.items })
    });
    setStatus(newStatus);
  };

  const deletePO = async () => {
    if (!window.confirm("Delete this PO?")) return;
    await fetch("/api/purchase-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: po.id })
    });
    navigate("/app");
  };

  const printPO = () => {
    const html = `<html><head><title>${po.poNumber}</title></head><body style="font-family:sans-serif;padding:40px">
      <h1>Purchase Order: ${po.poNumber}</h1>
      <p><strong>Supplier:</strong> ${po.supplierName}</p>
      <p><strong>Email:</strong> ${po.supplierEmail || "—"}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Expected:</strong> ${po.expectedDate || "—"}</p>
      <p><strong>Notes:</strong> ${po.notes || "—"}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:20px">
        <tr style="background:#f1f5f9"><th style="padding:10px;text-align:left">Product</th><th>SKU</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
        ${po.items.map(i => `<tr style="border-bottom:1px solid #eee"><td style="padding:10px">${i.productTitle}</td><td>${i.sku||"—"}</td><td>${i.quantity}</td><td>${fmt(i.unitCost)}</td><td>${fmt(i.quantity*i.unitCost)}</td></tr>`).join("")}
      </table>
      <h2 style="text-align:right">Total: ${fmt(total)}</h2>
    </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", marginBottom: 16 }}>← Back</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{po.poNumber}</h1>
          <span style={{ background: "#f1f5f9", color: STATUS_CONFIG[status].color, padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
            {STATUS_CONFIG[status].label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={printPO} style={{ background: "white", border: "1.5px solid #e2e8f0", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>🖨️ PDF</button>
          <button onClick={deletePO} style={{ background: "white", border: "1.5px solid #ef4444", color: "#ef4444", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>🗑️ Delete</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Order Total", value: fmt(total) },
          { label: "Received Value", value: fmt(received) },
          { label: "Outstanding", value: fmt(total - received) },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Fulfillment Progress</span>
          <span style={{ color: "#64748b" }}>{progress}%</span>
        </div>
        <div style={{ height: 10, background: "#f1f5f9", borderRadius: 99 }}>
          <div style={{ height: "100%", borderRadius: 99, background: progress === 100 ? "#16a34a" : "#0284c7", width: `${progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const statuses = Object.keys(STATUS_CONFIG);
            const active = statuses.indexOf(key) <= statuses.indexOf(status);
            return (
              <button key={key} onClick={() => updateStatus(key)} style={{
                background: active ? cfg.color : "#f1f5f9",
                color: active ? "white" : "#94a3b8",
                border: "none", padding: "8px 20px", borderRadius: 99, cursor: "pointer", fontWeight: 600, fontSize: 13
              }}>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24 }}>
        <h3 style={{ marginTop: 0 }}>Line Items</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Product", "SKU", "Ordered", "Received", "Unit Cost", "Total"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {po.items.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px" }}>
                  <div style={{ fontWeight: 600 }}>{item.productTitle}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.variantTitle}</div>
                </td>
                <td style={{ padding: "12px", color: "#64748b" }}>{item.sku || "—"}</td>
                <td style={{ padding: "12px" }}>{item.quantity}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: item.receivedQty >= item.quantity ? "#f0fdf4" : "#fef9c3", color: item.receivedQty >= item.quantity ? "#16a34a" : "#854d0e", padding: "2px 8px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
                    {item.receivedQty}/{item.quantity}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>{fmt(item.unitCost)}</td>
                <td style={{ padding: "12px", fontWeight: 600 }}>{fmt(item.quantity * item.unitCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ padding: "14px 12px", fontWeight: 700, textAlign: "right" }}>Total</td>
              <td style={{ padding: "14px 12px", fontWeight: 800, fontSize: 18 }}>{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}