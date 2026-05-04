import "server-only";

import type { EmailTemplatePayload } from "./types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderRows(rows: { label: string; value: string }[]) {
  return rows
    .map(
      (row) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">${escapeHtml(row.label)}</td><td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");
}

function renderItems(
  items: {
    title: string;
    quantity: number;
    unitPriceLabel: string;
    sellerName?: string;
  }[],
) {
  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-top:1px solid #e2e8f0;">
            <div style="font-weight:700;color:#0f172a;font-size:14px;">${escapeHtml(item.title)}</div>
            ${item.sellerName ? `<div style="color:#64748b;font-size:12px;margin-top:4px;">Seller: ${escapeHtml(item.sellerName)}</div>` : ""}
          </td>
          <td style="padding:12px 0;border-top:1px solid #e2e8f0;text-align:center;color:#334155;font-size:13px;">${item.quantity}</td>
          <td style="padding:12px 0;border-top:1px solid #e2e8f0;text-align:right;color:#0f172a;font-size:13px;font-weight:700;">${escapeHtml(item.unitPriceLabel)}</td>
        </tr>`,
    )
    .join("");
}

function layout(input: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const ctaMarkup =
    input.ctaLabel && input.ctaUrl
      ? `<div style="margin-top:24px;"><a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(input.ctaLabel)}</a></div>`
      : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
        <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
          <div style="border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;background:#ffffff;">
            <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#ffffff;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#bfdbfe;">${escapeHtml(input.eyebrow)}</div>
              <div style="margin-top:10px;font-size:28px;font-weight:900;line-height:1.15;">${escapeHtml(input.title)}</div>
              <div style="margin-top:10px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.84);">${escapeHtml(input.intro)}</div>
            </div>
            <div style="padding:28px;">
              ${input.body}
              ${ctaMarkup}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderEmailTemplate(payload: EmailTemplatePayload) {
  switch (payload.template) {
    case "WELCOME_CUSTOMER":
      return {
        subject: "Welcome to SpareKart",
        text: `Welcome to SpareKart, ${payload.recipientName}.`,
        html: layout({
          eyebrow: "Welcome",
          title: "Your SpareKart account is ready",
          intro: `Hi ${payload.recipientName}, your SpareKart customer account has been created successfully.`,
          body: `<p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">You can now manage your orders, upload payment proofs, track deliveries, and leave verified reviews after completed purchases.</p>`,
          ctaLabel: "Open account",
          ctaUrl: payload.portalUrl,
        }),
      };
    case "WELCOME_SELLER":
      return {
        subject: "Welcome to SpareKart Seller Access",
        text: `Welcome to SpareKart seller access, ${payload.recipientName}.`,
        html: layout({
          eyebrow: "Seller access",
          title: "Your seller account has been created",
          intro: `Hi ${payload.recipientName}, your SpareKart seller access is active.`,
          body: `<p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">You can now continue store setup, manage your catalogue, and track marketplace operations from your seller workspace.</p>`,
          ctaLabel: "Open seller workspace",
          ctaUrl: payload.portalUrl,
        }),
      };
    case "VERIFY_EMAIL":
      return {
        subject: "Verify your SpareKart email",
        text: `Your SpareKart verification code is ${payload.verificationCode}. Open ${payload.verificationUrl} if you want to verify from the browser.`,
        html: layout({
          eyebrow: "Email verification",
          title: "Confirm your email address",
          intro: `Hi ${payload.recipientName}, please verify your email so SpareKart can send secure order and account notifications.`,
          body: `
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">Use the verification code below to activate your SpareKart account. This code expires in ${escapeHtml(payload.expiresLabel)}.</p>
            <div style="margin-top:20px;border:1px solid #dbeafe;background:#eff6ff;border-radius:18px;padding:18px 20px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;">Verification code</div>
              <div style="margin-top:8px;font-size:32px;font-weight:900;letter-spacing:0.26em;color:#0f172a;">${escapeHtml(payload.verificationCode)}</div>
            </div>
            <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:1.8;">If you did not create this account, you can safely ignore this email.</p>
          `,
          ctaLabel: "Verify email",
          ctaUrl: payload.verificationUrl,
        }),
      };
    case "PASSWORD_RESET":
      return {
        subject: "Reset your SpareKart password",
        text: `Your SpareKart password reset OTP is ${payload.otpCode}. Open ${payload.recoveryUrl} to complete the reset.`,
        html: layout({
          eyebrow: "Password reset",
          title: "Reset your password securely",
          intro: `Hi ${payload.recipientName}, we received a request to reset your SpareKart password.`,
          body: `
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">Enter this one-time password on the SpareKart recovery screen. It expires in ${escapeHtml(payload.expiresLabel)}.</p>
            <div style="margin-top:20px;border:1px solid #ede9fe;background:#f5f3ff;border-radius:18px;padding:18px 20px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#6d28d9;">Reset OTP</div>
              <div style="margin-top:8px;font-size:32px;font-weight:900;letter-spacing:0.26em;color:#0f172a;">${escapeHtml(payload.otpCode)}</div>
            </div>
            <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:1.8;">If you did not request a reset, you can safely ignore this email.</p>
          `,
          ctaLabel: "Open recovery screen",
          ctaUrl: payload.recoveryUrl,
        }),
      };
    case "TEST_DELIVERY":
      return {
        subject: "SpareKart email delivery test",
        text: `This is a SpareKart delivery test for ${payload.recipientName}. Requested by ${payload.requestedBy} in ${payload.environmentLabel}.`,
        html: layout({
          eyebrow: "Delivery test",
          title: "SpareKart email is working",
          intro: `Hi ${payload.recipientName}, this is a backend delivery test generated from the SpareKart admin tools.`,
          body: `
            <p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">The request was submitted by <strong>${escapeHtml(payload.requestedBy)}</strong> in the <strong>${escapeHtml(payload.environmentLabel)}</strong> environment.</p>
            <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:1.8;">If you received this email, Resend credentials, sender configuration, and DNS records are aligned for the current environment.</p>
          `,
          ctaLabel: "Open SpareKart admin",
          ctaUrl: payload.dashboardUrl,
        }),
      };
    case "ORDER_CONFIRMATION_CUSTOMER":
      return {
        subject: `Order confirmed: ${payload.orderNumber}`,
        text: `Your SpareKart order ${payload.orderNumber} was created successfully.`,
        html: layout({
          eyebrow: "Order confirmation",
          title: `Order ${payload.orderNumber}`,
          intro: `Hi ${payload.recipientName}, thanks for shopping with SpareKart. Your order is now in the system.`,
          body: `
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              ${renderRows([
                { label: "Payment method", value: payload.paymentMethod.replaceAll("_", " ") },
                { label: "Order total", value: payload.totalAmountLabel },
              ])}
            </table>
            <div style="margin-top:20px;padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
              <div style="font-weight:800;font-size:13px;color:#0f172a;">Shipping address</div>
              <div style="margin-top:8px;color:#334155;font-size:13px;line-height:1.7;">${payload.shippingAddress.map(escapeHtml).join("<br />")}</div>
            </div>
            <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border-collapse:collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Item</th>
                  <th align="center" style="padding-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Qty</th>
                  <th align="right" style="padding-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Price</th>
                </tr>
              </thead>
              <tbody>${renderItems(payload.items)}</tbody>
            </table>
          `,
          ctaLabel: "Track order",
          ctaUrl: payload.trackingUrl,
        }),
      };
    case "ORDER_CONFIRMATION_SELLER":
      return {
        subject: `New SpareKart order: ${payload.orderNumber}`,
        text: `A new order ${payload.orderNumber} is ready for seller action.`,
        html: layout({
          eyebrow: "New order",
          title: `Order ${payload.orderNumber}`,
          intro: `Hi ${payload.recipientName}, a new SpareKart order includes products from your store.`,
          body: `
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              ${renderRows([
                { label: "Customer", value: payload.customerName },
                { label: "Phone", value: payload.customerPhone },
              ])}
            </table>
            <div style="margin-top:20px;padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
              <div style="font-weight:800;font-size:13px;color:#0f172a;">Delivery address</div>
              <div style="margin-top:8px;color:#334155;font-size:13px;line-height:1.7;">${payload.shippingAddress.map(escapeHtml).join("<br />")}</div>
            </div>
            <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border-collapse:collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Item</th>
                  <th align="center" style="padding-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Qty</th>
                  <th align="right" style="padding-bottom:8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#64748b;">Price</th>
                </tr>
              </thead>
              <tbody>${renderItems(payload.items)}</tbody>
            </table>
          `,
          ctaLabel: "Open seller orders",
          ctaUrl: payload.workspaceUrl,
        }),
      };
    case "ORDER_STATUS_UPDATE":
      return {
        subject: `Order ${payload.orderNumber}: ${payload.status.replaceAll("_", " ")}`,
        text: `Your SpareKart order ${payload.orderNumber} is now ${payload.status}.`,
        html: layout({
          eyebrow: "Order update",
          title: `${payload.orderNumber} is ${payload.status.replaceAll("_", " ")}`,
          intro:
            payload.audience === "SELLER"
              ? `Hi ${payload.recipientName}, a SpareKart marketplace order connected to your store has changed state.`
              : `Hi ${payload.recipientName}, your order status has changed.`,
          body: `<p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">${escapeHtml(payload.summary)}</p>`,
          ctaLabel: payload.actionLabel,
          ctaUrl: payload.actionUrl,
        }),
      };
    case "PAYMENT_PROOF_RECEIVED":
      return {
        subject: `Payment proof received for ${payload.orderNumber}`,
        text: `SpareKart received payment proof for ${payload.orderNumber}.`,
        html: layout({
          eyebrow: "Payment update",
          title: "Payment proof received",
          intro: `Hi ${payload.recipientName}, we received the payment proof for your order ${payload.orderNumber}.`,
          body: `<p style="margin:0;color:#334155;font-size:14px;line-height:1.8;">Reference <strong>${escapeHtml(payload.proofReference)}</strong> has been routed for verification. We'll email you again when the review is completed.</p>`,
          ctaLabel: "Track order",
          ctaUrl: payload.trackingUrl,
        }),
      };
  }
}
