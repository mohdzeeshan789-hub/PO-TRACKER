import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
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
  const fmt = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
  const calcTotal = (items) => items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const STATUS_COLORS = {
    draft: "#64748b",
    sent: "#d97706",
    confirmed: "#0284c7",
    received: "#16a34a"
  };
  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Purchase Orders</h1>
        <button onClick={() => navigate("/app/po/new")} style={{ background: "#0284c7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 15 }}>
          + New Purchase Order
        </button>
      </div>
      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h2>No purchase orders yet</h2>
          <button onClick={() => navigate("/app/po/new")} style={{ background: "#0284c7", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
            Create your first PO
          </button>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["PO #", "Supplier", "Status", "Items", "Total", "Expected", "Action"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: "#64748b" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(po => (
              <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0284c7" }}>{po.poNumber}</td>
                <td style={{ padding: "14px 16px" }}>{po.supplierName}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: "#f1f5f9", color: STATUS_COLORS[po.status], padding: "4px 10px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
                    {po.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>{po.items.length}</td>
                <td style={{ padding: "14px 16px", fontWeight: 600 }}>{fmt(calcTotal(po.items))}</td>
                <td style={{ padding: "14px 16px", color: "#64748b" }}>{po.expectedDate || "—"}</td>
                <td style={{ padding: "14px 16px" }}>
<button onClick={() => navigate("/app/import")} style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 15, marginRight: 10 }}>
  ⬆ Bulk Import
</button>
                  <button onClick={() => navigate(`/app/po/${po.id}`)} style={{ background: "#f1f5f9", border: "none", padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}