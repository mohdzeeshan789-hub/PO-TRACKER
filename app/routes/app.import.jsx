import { useState, useRef } from "react";
import { useNavigate } from "react-router";

export default function BulkImport() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    const csv = [
      "poNumber,supplierName,supplierEmail,expectedDate,status,notes,itemName,sku,quantity,unitCost",
      "PO-001,ABC Supplies,abc@supplier.com,2026-04-01,confirmed,Handle with care,Wire 10mm,SKU-001,50,12.50",
      "PO-001,ABC Supplies,abc@supplier.com,2026-04-01,confirmed,Handle with care,Cable 5mm,SKU-002,30,8.00",
      "PO-002,XYZ Electric,xyz@supplier.com,2026-04-10,sent,,Breaker 20A,SKU-003,10,45.00",
      "PO-002,XYZ Electric,xyz@supplier.com,2026-04-10,sent,,Panel Box,SKU-004,5,120.00",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "po-bulk-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSV = (e) => {
    setError("");
    setRows([]);
    setResult(null);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const lines = evt.target.result.trim().split("\n");
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
        const required = ["ponumber", "suppliername", "itemname", "quantity", "unitcost"];
        for (const r of required) {
          if (!headers.includes(r)) {
            setError(`Missing required column: "${r}". Please use the template.`);
            return;
          }
        }
        const get = (vals, col) => vals[headers.indexOf(col)]?.trim() || "";
        const parsed = lines.slice(1).map(line => {
          const vals = line.split(",").map(v => v.trim());
          return {
            poNumber: get(vals, "ponumber").toUpperCase(),
            supplierName: get(vals, "suppliername"),
            supplierEmail: get(vals, "supplieremail"),
            expectedDate: get(vals, "expecteddate"),
            status: get(vals, "status") || "draft",
            notes: get(vals, "notes"),
            itemName: get(vals, "itemname"),
            sku: get(vals, "sku"),
            quantity: Number(get(vals, "quantity")) || 1,
            unitCost: Number(get(vals, "unitcost")) || 0,
          };
        }).filter(r => r.poNumber && r.supplierName && r.itemName);

        if (parsed.length === 0) {
          setError("No valid rows found. Please check your CSV.");
          return;
        }
        setRows(parsed);
      } catch {
        setError("Failed to parse CSV. Please use the template.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Group rows by PO number
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.poNumber]) {
      acc[row.poNumber] = {
        poNumber: row.poNumber,
        supplierName: row.supplierName,
        supplierEmail: row.supplierEmail,
        expectedDate: row.expectedDate,
        status: row.status,
        notes: row.notes,
        items: [],
      };
    }
    acc[row.poNumber].items.push({
      productTitle: row.itemName,
      sku: row.sku,
      quantity: row.quantity,
      unitCost: row.unitCost,
    });
    return acc;
  }, {});

  const pos = Object.values(grouped);
  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const po of pos) {
      try {
        const res = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierName: po.supplierName,
            supplierEmail: po.supplierEmail,
            expectedDate: po.expectedDate,
            notes: po.notes,
            status: po.status,
            items: po.items,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ success, failed });
  };

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate("/app")} style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", marginBottom: 8 }}>← Back</button>
          <h1 style={{ margin: 0 }}>Bulk Import Purchase Orders</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>Upload one CSV to create multiple POs at once</p>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 10px", color: "#1e40af" }}>📋 How it works</h3>
        <p style={{ margin: "0 0 8px", color: "#1e40af", fontSize: 14 }}>1. Download the template CSV below</p>
        <p style={{ margin: "0 0 8px", color: "#1e40af", fontSize: 14 }}>2. Fill in your PO data — one row per item (multiple rows = same PO if poNumber matches)</p>
        <p style={{ margin: "0 0 8px", color: "#1e40af", fontSize: 14 }}>3. Upload your filled CSV — preview will appear before importing</p>
        <p style={{ margin: 0, color: "#1e40af", fontSize: 14 }}>4. Click Import — all POs get created instantly</p>
      </div>

      {/* Upload Area */}
      <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 24, display: "flex", gap: 16 }}>
        <button onClick={downloadTemplate} style={{ background: "#f1f5f9", border: "1.5px solid #e2e8f0", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          ⬇ Download Template
        </button>
        <button onClick={() => fileRef.current.click()} style={{ background: "#0284c7", color: "white", border: "none", padding: "12px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          📂 Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 16, color: "#dc2626", marginBottom: 24 }}>
          ❌ {error}
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 8px", color: "#16a34a" }}>✅ Import Complete!</h3>
          <p style={{ margin: 0, color: "#16a34a" }}>{result.success} POs created successfully{result.failed > 0 ? `, ${result.failed} failed` : ""}.</p>
          <button onClick={() => navigate("/app")} style={{ marginTop: 12, background: "#16a34a", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
            View All POs →
          </button>
        </div>
      )}

      {/* Preview */}
      {pos.length > 0 && !result && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Preview — {pos.length} PO{pos.length > 1 ? "s" : ""} found</h2>
            <button onClick={handleImport} disabled={importing} style={{ background: "#16a34a", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>
              {importing ? "Importing..." : `⬆ Import ${pos.length} POs`}
            </button>
          </div>

          {pos.map((po, idx) => (
            <div key={idx} style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#1e3a5f" }}>{po.poNumber}</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>{po.supplierName} {po.supplierEmail ? `• ${po.supplierEmail}` : ""}</p>
                  {po.expectedDate && <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Expected: {po.expectedDate}</p>}
                </div>
                <span style={{ background: "#f1f5f9", color: "#0284c7", padding: "4px 14px", borderRadius: 99, fontWeight: 700, fontSize: 13 }}>
                  {po.status.toUpperCase()}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Item", "SKU", "Qty", "Unit Cost", "Total"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontSize: 13 }}>{item.productTitle}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, color: "#64748b" }}>{item.sku || "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13 }}>{item.quantity}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13 }}>{fmt(item.unitCost)}</td>
                      <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>{fmt(item.quantity * item.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: "right", marginTop: 10, fontWeight: 700, color: "#1e3a5f" }}>
                Total: {fmt(po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
              </div>
            </div>
          ))}

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={handleImport} disabled={importing} style={{ background: "#16a34a", color: "white", border: "none", padding: "14px 40px", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>
              {importing ? "Importing..." : `⬆ Import ${pos.length} POs`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}