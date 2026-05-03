import "server-only";

import type { MarketplaceState, OrderStatus } from "@/modules/marketplace/types";
import { getAppUrl } from "@/server/config/env";
import { queueMarketplaceEmail } from "@/server/email/service";

function formatPKR(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildShippingLines(order: MarketplaceState["orders"][number]) {
  const shipping = order.shippingAddress;
  return [
    shipping.fullName,
    shipping.phone,
    shipping.addressLine,
    `${shipping.city}, ${shipping.province} ${shipping.postalCode}`,
  ];
}

function getCustomerContact(state: MarketplaceState, order: MarketplaceState["orders"][number]) {
  const customer = state.users.find((user) => user.id === order.customerUserId);
  const email = order.customerEmail || customer?.email;

  if (!email) {
    return null;
  }

  return {
    email,
    name: customer?.name ?? order.shippingAddress.fullName,
    phone: customer?.phone ?? order.shippingAddress.phone,
  };
}

function getSellerRecipients(state: MarketplaceState, order: MarketplaceState["orders"][number]) {
  return Array.from(new Set(order.items.map((item) => item.sellerSlug)))
    .map((sellerSlug) => {
      const sellerOwner = state.users.find(
        (user) => user.role === "SELLER" && user.sellerSlug === sellerSlug,
      );
      const seller = state.sellersDirectory.find((candidate) => candidate.slug === sellerSlug);

      if (!sellerOwner?.email || !seller) {
        return null;
      }

      return {
        email: sellerOwner.email,
        name: sellerOwner.name,
        sellerName: seller.name,
        workspaceUrl: getAppUrl("/seller/orders"),
      };
    })
    .filter(Boolean) as {
    email: string;
    name: string;
    sellerName: string;
    workspaceUrl: string;
  }[];
}

function getStatusSummary(orderNumber: string, status: OrderStatus) {
  switch (status) {
    case "PROCESSING":
      return `Your order ${orderNumber} is now being prepared by the seller.`;
    case "SHIPPED":
      return `Your order ${orderNumber} has been shipped and is on the way.`;
    case "DELIVERED":
      return `Your order ${orderNumber} has been marked as delivered.`;
    case "CANCELED":
      return `Your order ${orderNumber} has been canceled.`;
    case "CONFIRMED":
      return `Your order ${orderNumber} has been confirmed after payment clearance.`;
    case "AWAITING_PAYMENT_PROOF":
      return `Your order ${orderNumber} still needs a payment proof upload before review can continue.`;
    case "AWAITING_PAYMENT_VERIFICATION":
      return `Your order ${orderNumber} is waiting for admin verification of the submitted payment proof.`;
    default:
      return `Your order ${orderNumber} status changed to ${status.replaceAll("_", " ")}.`;
  }
}

function getSellerStatusSummary(orderNumber: string, sellerName: string, status: OrderStatus) {
  switch (status) {
    case "CONFIRMED":
      return `${orderNumber} is now financially confirmed and ready for ${sellerName} to process.`;
    case "AWAITING_PAYMENT_PROOF":
      return `${orderNumber} is blocked because the customer still needs to submit a valid payment proof.`;
    case "AWAITING_PAYMENT_VERIFICATION":
      return `${orderNumber} is waiting for admin verification of the submitted payment proof before fulfillment can proceed.`;
    case "CANCELED":
      return `${orderNumber} has been canceled and no further seller action is required.`;
    case "RETURNED":
      return `${orderNumber} has been marked as returned. Review the seller workspace for next steps.`;
    default:
      return `${orderNumber} moved to ${status.replaceAll("_", " ")} in SpareKart. Review the seller workspace for the latest order state.`;
  }
}

export async function queueOrderCreatedStateEmails(state: MarketplaceState, orderId: string) {
  const order = state.orders.find((candidate) => candidate.id === orderId);

  if (!order) {
    return;
  }

  const customer = getCustomerContact(state, order);

  if (!customer) {
    return;
  }

  await queueMarketplaceEmail({
    type: "ORDER_CREATED",
    order: {
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      totalAmountLabel: formatPKR(order.totals.total),
      customer,
      shippingAddress: buildShippingLines(order),
      trackingUrl: getAppUrl("/order-tracking"),
      sellerWorkspaceBaseUrl: getAppUrl("/seller/orders"),
      items: order.items.map((item) => {
        const seller = state.sellersDirectory.find((candidate) => candidate.slug === item.sellerSlug);
        const sellerOwner = state.users.find(
          (user) => user.sellerSlug === item.sellerSlug && user.role === "SELLER",
        );

        return {
          title: item.title,
          quantity: item.quantity,
          unitPriceLabel: formatPKR(item.unitPrice),
          sellerName: seller?.name ?? item.sellerSlug,
          sellerEmail: sellerOwner?.email,
          sellerContactName: sellerOwner?.name,
          sellerSlug: item.sellerSlug,
        };
      }),
    },
  });
}

export async function queueOrderStatusStateEmails(
  state: MarketplaceState,
  orderId: string,
  status: OrderStatus,
) {
  const order = state.orders.find((candidate) => candidate.id === orderId);

  if (!order) {
    return;
  }

  const customer = getCustomerContact(state, order);

  if (!customer) {
    return;
  }

  const sellerRecipients = [
    "CONFIRMED",
    "AWAITING_PAYMENT_PROOF",
    "AWAITING_PAYMENT_VERIFICATION",
    "CANCELED",
    "RETURNED",
  ].includes(status)
    ? getSellerRecipients(state, order).map((seller) => ({
        email: seller.email,
        name: seller.name,
        summary: getSellerStatusSummary(order.orderNumber, seller.sellerName, status),
        workspaceUrl: seller.workspaceUrl,
      }))
    : [];

  await queueMarketplaceEmail({
    type: "ORDER_STATUS_CHANGED",
    order: {
      orderNumber: order.orderNumber,
      status,
      customer: {
        email: customer.email,
        name: customer.name,
      },
      summary: getStatusSummary(order.orderNumber, status),
      trackingUrl: getAppUrl("/order-tracking"),
      sellers: sellerRecipients,
    },
  });
}

export async function queuePaymentProofStateEmail(
  state: MarketplaceState,
  orderId: string,
  proofId: string,
) {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  const proof = state.paymentProofs.find((candidate) => candidate.id === proofId);

  if (!order || !proof) {
    return;
  }

  const customer = getCustomerContact(state, order);

  if (!customer) {
    return;
  }

  await queueMarketplaceEmail({
    type: "PAYMENT_PROOF_RECEIVED",
    order: {
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      proofReference: proof.transactionReference,
      customer: {
        email: customer.email,
        name: customer.name,
      },
      trackingUrl: getAppUrl("/order-tracking"),
    },
  });
}
