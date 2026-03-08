import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPOStatusEmail({ to, poNumber, status, supplierName, expectedDate }) {
  if (!to) return;

  const statusLabels = {
    draft: "Draft",
    sent: "Sent to Supplier",
    confirmed: "Confirmed",
    received: "Received",
  };

  const statusColors = {
    draft: "#64748b",
    sent: "#d97706",
    confirmed: "#0284c7",
    received: "#16a34a",
  };

  await resend.emails.send({
    from: "PO Tracker <onboarding@resend.dev>",
    to,
    subject: `Purchase Order ${poNumber} — Status Update: ${statusLabels[status]}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">📦 Purchase Order Update</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #334155;">Dear <strong>${supplierName}</strong>,</p>
          <p style="color: #64748b;">Your purchase order status has been updated.</p>
          
          <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b; font-size: 13px; padding: 6px 0;">PO Number</td>
                <td style="font-weight: 700; color: #1e3a5f;">${poNumber}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 13px; padding: 6px 0;">New Status</td>
                <td>
                  <span style="background: #f1f5f9; color: ${statusColors[status]}; padding: 4px 12px; border-radius: 99px; font-weight: 700; font-size: 13px;">
                    ${statusLabels[status]}
                  </span>
                </td>
              </tr>
              ${expectedDate ? `
              <tr>
                <td style="color: #64748b; font-size: 13px; padding: 6px 0;">Expected Date</td>
                <td style="color: #334155;">${expectedDate}</td>
              </tr>` : ""}
            </table>
          </div>

          <a href="${process.env.SHOPIFY_APP_URL}/vendor?po=${poNumber}" 
             style="display: block; text-align: center; background: #0284c7; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Track Your Order
          </a>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;">
            This email was sent automatically by PO Tracker.
          </p>
        </div>
      </div>
    `,
  });
}