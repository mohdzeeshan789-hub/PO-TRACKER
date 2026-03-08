import { useState, useRef } from "react";
import { useNavigate } from "react-router";

export default function NewPO() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState("");
  const [email, setEmail] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState([{ productTitle: "", variantTitle: "", sku: "", quantity: 1, unitCost: 0 }]);
  const [saving, setSaving] = useState(false);
  const [csvError, setCsvError] = useState("");
  const fileRef = useRef();

  const addItem = () => setItems([...items, { productTitle: "", variantTitle: "", sku: "", quantity: 1, unitCost: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i][field] = val;
    setItems(updated);
  };

  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

  const downloadTemplate = () => {
    const csv = "productTitle,variantTitle,sku,quantity,unitCost\nExample Product,Blue / Large,SKU-001,10,25.00\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "po-items-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSV = (e) => {
    setCsvError("");
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const lines = evt.target.result.trim().split("\n");
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
        const required = ["producttitle", "quantity", "unitcost"];
        for (const r of required) {
          if (!headers.includes(r)) {
            setCsvError(`Missing column: ${r}. Please use the template.`);
            return;
          }
        }
        const parsed = lines.slice(1).map(line => {
          const vals = line.split(",").map(v => v.trim());
          const get = (col) => vals[headers.indexOf(col)] || "";
          return {
            productTitle: get("producttitle"),
            variantTitle: get("varianttitle"),
            sku: get("sku"),
            quantity: Number(get("quantity")) || 1,
            unitCost: Number(get("unitcost")) || 0,
          };
        }).filter(i => i.productTitle);
        if (parsed.length === 0) {
          setCsvError("No valid items found in CSV.");
          return;
        }
        setItems(parsed);
      } catch {
        setCsvError("Failed to parse CSV. Please use the template.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!supplier.trim()) return alert("Supplier name is required");
    setSaving(true);
    await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierName: supplier, supplierEmail: email, expectedDate, notes, status, items })
    });
    navigate("/app");
  };

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", marginBottom: 8 }}>← Back</button>
          <h1 style={{ margin: 0 }}>New Purchase Order</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ background: "#0284c7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 15 }}>
          {saving ? "Saving..." : "💾 Save PO"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 24 }}>
          <h3 style={{ marginTop: 0 }}>Supplier Info</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Supplier Name *</label>
            <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Global Electric Co." style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, color: "#64748b", marginBottom: 6 }}>Supplier Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="orders@supplier.com" type="email" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Line Items</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={downloadTemplate} style={{ background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
              ⬇ Download Template
            </button>
            <button onClick={() => fileRef.current.click()} style={{ background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
              📂 Import CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            <button onClick={addItem} style={{ background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
              + Add Item
            </button>
          </div>
        </div>

        {csvError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, color: "#dc2626", marginBottom: 16, fontSize: 13 }}>
            ❌ {csvError}
          </div>
        )}

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
                <td style={{ padding: "8px 12px" }}><input value={item.productTitle} onChange={e => updateItem(i, "productTitle", e.target.value)} placeholder="Product name" style={{ width: 160, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px" }}><input value={item.variantTitle} onChange={e => updateItem(i, "variantTitle", e.target.value)} placeholder="Variant" style={{ width: 100, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
                <td style={{ padding: "8px 12px" }}><input value={item.sku} onChange={e => updateItem(i, "sku", e.target.value)} placeholder="SKU" style={{ width: 90, padding: "7px 10px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }} /></td>
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