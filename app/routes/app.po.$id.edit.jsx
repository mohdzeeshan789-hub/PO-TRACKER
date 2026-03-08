import { useState } from "react";
import { useNavigate, useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import db from "../../db.server";

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const po = await db.purchaseOrder.findFirst({
    where: { id: params.id, shop: session.shop },
    include: { items: true }
  });
  if (!po) throw new Response("Not Found", { status: 404 });
  return { po };
}

export default function EditPO() {
  const { po } = useLoaderData();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(po.supplierName);
  const [email, setEmail] = useState(po.supplierEmail || "");
  const [expectedDate, setExpectedDate] = useState(po.expectedDate || "");
  const [notes, setNotes] = useState(po.notes || "");
  const [status, setStatus] = useState(po.status);
  const [items, setItems] = useState(po.items.map(i => ({
    productTitle: i.productTitle,
    variantTitle: i.variantTitle || "",
    sku: i.sku || "",
    quantity: i.quantity,
    unitCost: i.unitCost,
  })));
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { productTitle: "", variantTitle: "", sku: "", quantity: 1, unitCost: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i][field] = val;
    setItems(updated);
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

  const handleSave = async () => {
    if (!supplier.trim()) return alert("Supplier name is required");
    setSaving(true);
    await fetch("/api/purchase-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: po.id, supplierName: supplier, supplierEmail: email, expectedDate, notes, status, items })
    });
    navigate("/app");
  };

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", marginBottom: 8 }}>← Back</button>
          <h1 style={{ margin: 0 }}>Edit — {po.poNumber}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: "#0284c7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 15 }}>
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Supplier Info</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Supplier Name *</label>
            <input value={supplier} onChange={e => setSupplier(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Supplier Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 12, padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Order Details</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="received">Received</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Expected Delivery</label>
            <input value={expectedDate} onChange={e => setExpectedDate(e.target.value)} type="date" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, resize: "none" }} />
          </div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Line Items</h3>
          <button onClick={addItem} style={{ background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>+ Add Item</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Product", "Variant", "SKU", "Qty", "Unit Cost", "Total", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13, color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "8px 12px" }}><input value={item.productTitle} onChange={e => updateItem(i, "productTitle", e.target.value)} style={{ width: 160, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px" }}><input value={item.variantTitle} onChange={e => updateItem(i, "variantTitle", e.target.value)} style={{ width: 100, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px" }}><input value={item.sku} onChange={e => updateItem(i, "sku", e.target.value)} style={{ width: 90, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px" }}><input type="number" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} style={{ width: 60, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px" }}><input type="number" value={item.unitCost} onChange={e => updateItem(i, "unitCost", Number(e.target.value))} style={{ width: 80, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmt(item.quantity * item.unitCost)}</td>
                <td style={{ padding: "8px 12px" }}>{items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: "right", marginTop: 16, fontSize: 20, fontWeight: 800 }}>
          Total: {fmt(total)}
        </div>
      </div>
    </div>
  );
}