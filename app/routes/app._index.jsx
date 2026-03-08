import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { useState } from "react";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const orders = await db.purchaseOrder.findMany({
    where: { shop: session.shop },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  return { orders };
}

export default function Index() {
  const { orders } = useLoaderData();
  const navigate = useNavigate();
  const [poList, setPoList] = useState(orders);
  const [updatingId, setUpdatingId] = useState(null);

  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  const calcTotal = (items) => items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  const STATUS_COLORS = {
    draft: "#64748b",
    sent: "#d97706",
    confirmed: "#0284c7",
    received: "#16a34a"
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    const po = poList.find(p => p.id === id);
    await fetch("/api/purchase-orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        supplierName: po.supplierName,
        supplierEmail: po.supplierEmail,
        expectedDate: po.expectedDate,
        notes: po.notes,
        status: newStatus,
        items: po.items.map(i => ({
          productTitle: i.productTitle,
          variantTitle: i.variantTitle,
          sku: i.sku,
          quantity: i.quantity,
          unitCost: i.unitCost,
        }))
      })
    });
    setPoList(poList.map(p => p.id === id ? { ...p, status: newStatus } : p));
    setUpdatingId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this PO? This cannot be undone.")) return;
    await fetch("/api/purchase-orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setPoList(poList.filter(p => p.id !== id));
  };

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Purchase Orders</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/app/import")} style={{ background: "#f1f5f9", color: "#334155", border: "1.5px solid #e2e8f0", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            ⬆ Bulk Import
          </button>
          <button onClick={() => navigate("/app/po/new")} style={{ background: "#0284c7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            + New Purchase Order
          </button>
        </div>
      </div>

      {poList.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h2>No purchase orders yet</h2>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => navigate("/app/import")} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
              ⬆ Bulk Import
            </button>
            <button onClick={() => navigate("/app/po/new")} style={{ background: "#0284c7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
              Create your first PO
            </button>
          </div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["PO #", "Supplier", "Status", "Items", "Total", "Expected", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {poList.map(po => (
              <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0284c7" }}>{po.poNumber}</td>
                <td style={{ padding: "14px 16px" }}>{po.supplierName}</td>
                <td style={{ padding: "14px 16px" }}>
                  <select
                    value={po.status}
                    disabled={updatingId === po.id}
                    onChange={e => handleStatusChange(po.id, e.target.value)}
                    style={{
                      background: "#f1f5f9",
                      color: STATUS_COLORS[po.status],
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: 99,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <option value="draft">DRAFT</option>
                    <option value="sent">SENT</option>
                    <option value="confirmed">CONFIRMED</option>
                    <option value="received">RECEIVED</option>
                  </select>
                </td>
                <td style={{ padding: "14px 16px" }}>{po.items.length} items</td>
                <td style={{ padding: "14px 16px", fontWeight: 600 }}>{fmt(calcTotal(po.items))}</td>
                <td style={{ padding: "14px 16px", color: "#64748b" }}>{po.expectedDate || "—"}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => navigate(`/app/po/${po.id}`)} style={{ background: "#f1f5f9", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                      View
                    </button>
                    <button onClick={() => navigate(`/app/po/${po.id}/edit`)} style={{ background: "#eff6ff", color: "#0284c7", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(po.id)} style={{ background: "#fef2f2", color: "#ef4444", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}