import { data } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const orders = await db.purchaseOrder.findMany({
    where: { shop: session.shop },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  return data({ orders });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
const body = await request.json();
  const method = request.method;

  if (method === "POST") {
    const count = await db.purchaseOrder.count({ where: { shop: session.shop } });
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;
    const po = await db.purchaseOrder.create({
      data: {
        shop: session.shop,
        poNumber,
        supplierName: body.supplierName,
        supplierEmail: body.supplierEmail,
        expectedDate: body.expectedDate,
        notes: body.notes,
        status: body.status || "draft",
        items: { create: body.items }
      },
      include: { items: true }
    });
    return data({ po });
  }

  if (method === "PATCH") {
    const po = await db.purchaseOrder.update({
      where: { id: body.id },
      data: {
        supplierName: body.supplierName,
        supplierEmail: body.supplierEmail,
        expectedDate: body.expectedDate,
        notes: body.notes,
        status: body.status,
        items: {
          deleteMany: {},
          create: body.items
        }
      },
      include: { items: true }
    });
    return data({ po });
  }

  if (method === "DELETE") {
    await db.purchaseOrder.delete({ where: { id: body.id } });
    return data({ success: true });
  }
}