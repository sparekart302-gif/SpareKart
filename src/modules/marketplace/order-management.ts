import type {
  AuditEntry,
  CODRemittanceReviewInput,
  CODPaymentProofSubmission,
  MarketplaceOrder,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentProofReview,
  PayoutStatus,
  PaymentProofSubmission,
  SellerPayoutAccountInput,
  SellerPayoutAccountReviewInput,
  SellerPayoutRequestInput,
  SellerSettlementBatchInput,
  SellerOrderFulfillment,
} from "./types";

type SellerManagedOrderStatus = Extract<
  OrderStatus,
  "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED"
>;

export type PaymentProofSubmissionApiInput = PaymentProofSubmission & {
  orderId: string;
};

export type PaymentProofReviewApiInput = PaymentProofReview & {
  decision: "APPROVE" | "REJECT";
};

export type CODCollectionProofSubmissionApiInput = CODPaymentProofSubmission & {
  orderId: string;
};

export type PaymentDashboardApiRange = "ALL" | "30D" | "90D" | "365D";

export type SellerPayoutUpdateApiInput = {
  payoutId: string;
  status: PayoutStatus;
  adminNotes?: string;
  transactionReference?: string;
};

export type SellerPayoutAccountUpdateApiInput = SellerPayoutAccountInput;

export type SellerPayoutAccountReviewApiInput = SellerPayoutAccountReviewInput;

export type SellerPayoutRequestApiInput = SellerPayoutRequestInput;

export type CODRemittanceReviewApiInput = CODRemittanceReviewInput;

export type SellerSettlementBatchApiInput = SellerSettlementBatchInput;

export type AdminPaymentDashboardApiParams = {
  sellerSlug?: string;
  paymentMethod?: PaymentMethod | "ALL";
  payoutStatus?: PayoutStatus | "ALL";
  range?: PaymentDashboardApiRange;
};

export type SellerPaymentDashboardApiParams = {
  sellerSlug?: string;
  payoutStatus?: PayoutStatus | "ALL";
  range?: PaymentDashboardApiRange;
};

export type SellerOrderStatusUpdateApiInput = {
  orderId: string;
  nextStatus: SellerManagedOrderStatus;
};

export type OrderStatusViewApiParams = {
  orderId?: string;
  status?: OrderStatus;
  paymentStatus?: string;
  sellerSlug?: string;
  customerId?: string;
};

export const ORDER_API_ENDPOINTS = {
  submitPaymentProof: "/api/payments/proofs",
  submitCODCollectionProof: "/api/payments/cod/proofs",
  reviewPaymentProof: "/api/payments/proofs/:proofId/review",
  updateSellerOrderStatus: "/api/orders/:orderId/status",
  viewOrders: "/api/orders",
  orderDetails: "/api/orders/:orderId",
  viewCommissions: "/api/commissions",
  sellerPaymentDetails: "/api/seller/payment-details",
  adminSellerPaymentDetails: "/api/admin/sellers/:sellerSlug/payment-details",
  adminPaymentDashboard: "/api/admin/payments/dashboard",
  sellerPaymentDashboard: "/api/seller/payments/dashboard",
  sellerPayoutAccount: "/api/seller/payout-account",
  sellerSettlementLedger: "/api/seller/settlements",
  reviewSellerPayoutAccount: "/api/admin/sellers/:sellerSlug/payout-account/review",
  requestSellerPayout: "/api/seller/payouts/request",
  sellerPayoutHistory: "/api/seller/payouts",
  adminPayoutRequests: "/api/admin/payouts",
  adminCreatePayoutBatch: "/api/admin/payouts/batches",
  adminCODRemittances: "/api/admin/cod-remittances",
  adminCODRemittanceDetail: "/api/admin/cod-remittances/:remittanceId",
  adminSettlements: "/api/admin/settlements",
  sellerCommissionReport: "/api/seller/commissions",
  adminCommissionReport: "/api/admin/commissions",
  viewPayouts: "/api/payouts",
  updatePayoutStatus: "/api/payouts/:payoutId",
} as const;

export function createSellerFulfillments(
  items: Pick<OrderItem, "sellerSlug">[],
  status: OrderStatus,
  updatedAt: string,
) {
  return Array.from(new Set(items.map((item) => item.sellerSlug))).map<SellerOrderFulfillment>(
    (sellerSlug) => ({
      sellerSlug,
      status,
      updatedAt,
    }),
  );
}

export function ensureOrderLifecycle(order: MarketplaceOrder): MarketplaceOrder {
  const sellerFulfillments =
    order.sellerFulfillments?.length > 0
      ? order.sellerFulfillments
      : createSellerFulfillments(order.items, order.status, order.updatedAt);

  return {
    ...order,
    totals: {
      ...order.totals,
      discount: order.totals.discount ?? 0,
    },
    sellerFulfillments,
    status: deriveOrderStatusFromFulfillments(sellerFulfillments, order.status),
  };
}

export function getSellerFulfillmentForOrder(order: MarketplaceOrder, sellerSlug?: string) {
  if (!sellerSlug) {
    return undefined;
  }

  return order.sellerFulfillments.find((fulfillment) => fulfillment.sellerSlug === sellerSlug);
}

export function getAllowedSellerOrderTransitions(status: OrderStatus) {
  const transitions: Record<OrderStatus, SellerManagedOrderStatus[]> = {
    PENDING: [],
    AWAITING_PAYMENT_PROOF: [],
    AWAITING_PAYMENT_VERIFICATION: [],
    CONFIRMED: ["PROCESSING", "CANCELED"],
    PROCESSING: ["SHIPPED", "CANCELED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELED: [],
    RETURNED: [],
  };

  return transitions[status];
}

export function canSellerManageOrder(order: MarketplaceOrder, sellerSlug?: string) {
  const fulfillment = getSellerFulfillmentForOrder(order, sellerSlug);

  if (!fulfillment) {
    return false;
  }

  return getAllowedSellerOrderTransitions(fulfillment.status).length > 0;
}

export function updateSellerFulfillmentStatus(
  order: MarketplaceOrder,
  sellerSlug: string,
  nextStatus: SellerManagedOrderStatus,
  updatedAt: string,
) {
  const sellerFulfillments = order.sellerFulfillments.map((fulfillment) =>
    fulfillment.sellerSlug === sellerSlug
      ? {
          ...fulfillment,
          status: nextStatus,
          updatedAt,
        }
      : fulfillment,
  );

  return {
    ...order,
    sellerFulfillments,
    status: deriveOrderStatusFromFulfillments(sellerFulfillments, order.status),
    updatedAt,
  };
}

export function syncOrderFulfillments(
  order: MarketplaceOrder,
  nextStatus: OrderStatus,
  updatedAt: string,
) {
  const sellerFulfillments =
    order.sellerFulfillments?.length > 0
      ? order.sellerFulfillments.map((fulfillment) => ({
          ...fulfillment,
          status: nextStatus,
          updatedAt,
        }))
      : createSellerFulfillments(order.items, nextStatus, updatedAt);

  return {
    ...order,
    status: nextStatus,
    sellerFulfillments,
    updatedAt,
  };
}

export function deriveOrderStatusFromFulfillments(
  sellerFulfillments: SellerOrderFulfillment[],
  fallbackStatus: OrderStatus,
): OrderStatus {
  if (sellerFulfillments.length === 0) {
    return fallbackStatus;
  }

  const statuses = sellerFulfillments.map((fulfillment) => fulfillment.status);

  if (statuses.every((status) => status === "PENDING")) {
    return "PENDING";
  }

  if (statuses.every((status) => status === "AWAITING_PAYMENT_PROOF")) {
    return "AWAITING_PAYMENT_PROOF";
  }

  if (statuses.every((status) => status === "AWAITING_PAYMENT_VERIFICATION")) {
    return "AWAITING_PAYMENT_VERIFICATION";
  }

  const activeFulfillments = sellerFulfillments.filter(
    (fulfillment) => fulfillment.status !== "CANCELED",
  );

  if (activeFulfillments.length === 0) {
    return "CANCELED";
  }

  if (activeFulfillments.every((fulfillment) => fulfillment.status === "RETURNED")) {
    return "RETURNED";
  }

  if (activeFulfillments.every((fulfillment) => fulfillment.status === "CONFIRMED")) {
    return "CONFIRMED";
  }

  if (activeFulfillments.every((fulfillment) => fulfillment.status === "DELIVERED")) {
    return "DELIVERED";
  }

  if (
    activeFulfillments.every((fulfillment) => ["SHIPPED", "DELIVERED"].includes(fulfillment.status))
  ) {
    return "SHIPPED";
  }

  if (
    activeFulfillments.some((fulfillment) =>
      ["PROCESSING", "SHIPPED", "DELIVERED"].includes(fulfillment.status),
    )
  ) {
    return "PROCESSING";
  }

  if (activeFulfillments.some((fulfillment) => fulfillment.status === "CONFIRMED")) {
    return "CONFIRMED";
  }

  if (
    activeFulfillments.some((fulfillment) => fulfillment.status === "AWAITING_PAYMENT_VERIFICATION")
  ) {
    return "AWAITING_PAYMENT_VERIFICATION";
  }

  if (activeFulfillments.some((fulfillment) => fulfillment.status === "AWAITING_PAYMENT_PROOF")) {
    return "AWAITING_PAYMENT_PROOF";
  }

  return fallbackStatus;
}

export function formatOrderLifecycleEvent(entry: AuditEntry, actorName?: string) {
  // Filter out internal/technical events
  const ignoredActions = [
    "INVENTORY_DEDUCTED",
    "INVENTORY_RESTORED",
    "PAYMENT_STATUS_CHANGED",
    "FULFILLMENT_STATUS_CHANGED",
  ];

  if (ignoredActions.includes(entry.action)) {
    return null; // Return null to be filtered out
  }

  const actorLabel = actorName ? ` (${actorName})` : "";

  switch (entry.action) {
    case "ORDER_CREATED":
      return {
        title: "Order placed",
        detail: "Your order has been successfully placed.",
        category: "order",
      };
    case "PAYMENT_PROOF_SUBMITTED":
      return {
        title: "Payment proof submitted",
        detail: "Your payment proof has been uploaded and is awaiting verification.",
        category: "payment",
      };
    case "PAYMENT_PROOF_APPROVED":
      return {
        title: "Payment verified",
        detail: "Your payment has been verified. Order is confirmed!",
        category: "success",
      };
    case "PAYMENT_PROOF_REJECTED":
      return {
        title: "Payment proof rejected",
        detail: "Please submit a valid payment proof. Try again from My Orders.",
        category: "danger",
      };
    case "ORDER_STATUS_CHANGED": {
      const statusMessages: Record<
        string,
        { title: string; detail: string; category: "success" | "warning" | "danger" | "default" }
      > = {
        CONFIRMED: {
          title: "Order confirmed",
          detail: "Your payment is confirmed. Sellers are preparing your items.",
          category: "success",
        },
        PROCESSING: {
          title: "Being processed",
          detail: "Sellers are packing and preparing your items for shipment.",
          category: "warning",
        },
        SHIPPED: {
          title: "Order shipped",
          detail: "Your order is on the way! Check back for delivery updates.",
          category: "warning",
        },
        DELIVERED: {
          title: "Delivered",
          detail: "Your order has been successfully delivered. Thank you!",
          category: "success",
        },
        CANCELLED: {
          title: "Order cancelled",
          detail: "This order has been cancelled. Refund will be processed soon.",
          category: "danger",
        },
        PENDING: {
          title: "Awaiting payment",
          detail: "Please complete your payment to confirm this order.",
          category: "warning",
        },
      };

      const status = entry.toStatus || "";
      const message = statusMessages[status] || {
        title: `Order ${status.replaceAll("_", " ").toLowerCase()}`,
        detail: `Order status changed to ${status.replaceAll("_", " ")}.`,
        category: "default" as const,
      };

      return {
        title: message.title,
        detail: message.detail,
        category: message.category,
      };
    }
    default:
      return null; // Hide unknown/internal events
  }
}
