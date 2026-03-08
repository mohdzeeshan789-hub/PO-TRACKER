import { useState } from "react";
import db from "../db.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const poNumber = url.searchParams.get("po");
  const email = url.searchParams.get("email");

  if (!poNumber && !email) return { po: null, error: null };

  const po = await db.purchaseOrder.findFirst({
    where: {
      OR: [
        poNumber ? { poNumber: poNumber.toUpperCase() } : undefined,
        email ? { supplierEmail: email.toLowerCase() } : undefined,
      ].filter(Boolean),
    },
    include: { items: true },
  });

  if (!po) return { po: null, error: "No purchase order found. Please check your PO number or email." };
  return { po, error: null };
}

const STATUS = {
  draft:     { label: "Draft",     color: "#64748b", bg: "#f1f5f9", step: 1 },
  sent:      { label: "Sent",      color: "#d97706", bg: "#fef3c7", step: 2 },
  confirmed: { label: "Confirmed", color: "#0284c7", bg: "#dbeafe", step: 3 },
  received:  { label: "Received",  color: "#16a34a", bg: "#dcfce7", step: 4 },
};

export default function VendorPortal({ loaderData }) {
  const { po, error } = loaderData;
  const [poInput, setPoInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  const total = po ? po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0) : 0;
  const status = po ? STATUS[po.status] : null;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (poInput.trim()) params.set("po", poInput.trim());
    else if (emailInput.trim()) params.set("email", emailInput.trim());
    window.location.href = `/vendor?${params.toString()}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#1e3a5f", padding: "24px 32px", color: "white" }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>📦 PO Tracker — Vendor Portal</h1>
        <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 14 }}>Check the status of your purchase order</p>
      </div>

      <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px" }}>

        {/* Search Box */}
        <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 32 }}>
          <h2 style={{ marginTop: 0, color: "#1e3a5f" }}>Find Your Order</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>PO Number</label>
              <input
                value={poInput}
                onChange={e => setPoInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. PO-0001"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ textAlign: "center", color: "#94a3b8", fontWeight: 600, paddingTop: 20 }}>OR</div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Your Email</label>
              <input
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="orders@yourcompany.com"
                type="email"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            style={{ width: "100%", background: "#0284c7", color: "white", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 600 }}
          >
            🔍 Track My Order
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 20, color: "#dc2626", marginBottom: 24 }}>
            ❌ {error}
          </div>
        )}

        {/* PO Result */}
        {po && (
          <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

            {/* PO Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, color: "#1e3a5f" }}>{po.poNumber}</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Supplier: {po.supplierName}</p>
                {po.expectedDate && <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Expected: {po.expectedDate}</p>}
              </div>
              <span style={{ background: status.bg, color: status.color, padding: "8px 18px", borderRadius: 99, fontWeight: 700, fontSize: 15 }}>
                {status.label}
              </span>
            </div>

            {/* Status Pipeline */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
              {Object.values(STATUS).map((s, i) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: s.step <= status.step ? s.color : "#e2e8f0",
                      color: "white", fontWeight: 700, fontSize: 14, margin: "0 auto 4px"
                    }}>
                      {s.step <= status.step ? "✓" : s.step}
                    </div>
                    <div style={{ fontSize: 11, color: s.step <= status.step ? s.color : "#94a3b8", fontWeight: 600 }}>{s.label}</div>
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 3, background: s.step < status.step ? "#0284c7" : "#e2e8f0", margin: "0 8px 20px" }} />}
                </div>
              ))}
            </div>

            {/* Items Table */}
            <h3 style={{ color: "#1e3a5f", marginBottom: 12 }}>Order Items</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Product", "SKU", "Qty", "Unit Cost", "Total"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 13, color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px" }}>{item.productTitle}{item.variantTitle ? ` — ${item.variantTitle}` : ""}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{item.sku || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{item.quantity}</td>
                    <td style={{ padding: "12px 14px" }}>{fmt(item.unitCost)}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>{fmt(item.quantity * item.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "right", fontSize: 20, fontWeight: 800, color: "#1e3a5f" }}>
              Total: {fmt(total)}
            </div>

            {/* Notes */}
            {po.notes && (
              <div style={{ marginTop: 24, background: "#f8fafc", borderRadius: 10, padding: 16 }}>
                <strong style={{ color: "#64748b", fontSize: 13 }}>Notes:</strong>
                <p style={{ margin: "6px 0 0", color: "#334155" }}>{po.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}