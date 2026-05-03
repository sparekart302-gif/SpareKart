import type { MarketplaceOrder, PaymentRecord, MarketplaceUser } from "./types";
import type { SellerRecord } from "./types";
import type {
  CODPaymentVerificationRequest,
  CODPaymentVerificationResponse,
  CommissionRecord,
} from "./commission-types";
import {
  calculateOrderCommission,
  getDefaultPayoutCycleConfig,
  shouldGeneratePayout,
  createPayoutFromCommissions,
} from "./commission-management";

/**
 * Admin Roles that can verify COD payments
 */
export const PAYMENT_VERIFICATION_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/**
 * Check if user can verify payments
 */
export function canVerifyPayments(user: MarketplaceUser | undefined): boolean {
  return user
    ? PAYMENT_VERIFICATION_ROLES.includes(user.role as (typeof PAYMENT_VERIFICATION_ROLES)[number])
    : false;
}

/**
 * Verify COD payment - Admin approves/rejects payment
 */
export function verifyCODPayment(
  order: MarketplaceOrder,
  payment: PaymentRecord,
  verificationRequest: CODPaymentVerificationRequest,
  adminUser: MarketplaceUser,
  decision: "APPROVE" | "REJECT",
): {
  updatedOrder: MarketplaceOrder;
  updatedPayment: PaymentRecord;
  commissions?: CommissionRecord[];
  success: boolean;
  message: string;
} {
  if (!canVerifyPayments(adminUser)) {
    return {
      updatedOrder: order,
      updatedPayment: payment,
      success: false,
      message: "Unauthorized: Only admins can verify payments.",
    };
  }

  if (payment.method !== "COD") {
    return {
      updatedOrder: order,
      updatedPayment: payment,
      success: false,
      message: "This payment verification is only for COD orders.",
    };
  }

  if (decision === "APPROVE") {
    return approvePayment(order, payment, verificationRequest, adminUser);
  } else {
    return rejectPayment(order, payment, verificationRequest, adminUser);
  }
}

/**
 * Approve COD payment and trigger commission calculation
 */
function approvePayment(
  order: MarketplaceOrder,
  payment: PaymentRecord,
  verification: CODPaymentVerificationRequest,
  adminUser: MarketplaceUser,
): {
  updatedOrder: MarketplaceOrder;
  updatedPayment: PaymentRecord;
  commissions?: CommissionRecord[];
  success: boolean;
  message: string;
} {
  const now = new Date().toISOString();

  // Update payment status
  const updatedPayment: PaymentRecord = {
    ...payment,
    status: "PAID",
    updatedAt: now,
  };

  // Update order status to CONFIRMED
  const updatedOrder: MarketplaceOrder = {
    ...order,
    status: "CONFIRMED",
    updatedAt: now,
    inventoryCommittedAt: order.inventoryCommittedAt || now,
  };

  // Calculate commissions for the order (for all sellers in this order)
  const commissions: CommissionRecord[] = [];
  const sellerSlugs = Array.from(new Set(order.items.map((item) => item.sellerSlug)));

  for (const sellerSlug of sellerSlugs) {
    // Note: In real implementation, you'd fetch seller data
    // For now, we'll create commission records with default rates
    const sellerItems = order.items.filter((item) => item.sellerSlug === sellerSlug);
    const categoryMap = new Map<string, number>();

    for (const item of sellerItems) {
      const category = item.brand || "general"; // Use category or brand as fallback
      categoryMap.set(category, (categoryMap.get(category) || 0) + item.unitPrice * item.quantity);
    }

    // Create commission for each category
    for (const [category, amount] of categoryMap) {
      const commissionRate = 0.12; // Default 12% - would come from seller's rate
      const commissionAmount = amount * commissionRate;

      commissions.push({
        id: `comm-${order.id}-${sellerSlug}-${category}`,
        orderId: order.id,
        sellerSlug,
        productCategory: category,
        orderAmount: amount,
        commissionRate,
        commissionAmount,
        deductedAmount: amount - commissionAmount,
        calculatedAt: now,
        reason: "ORDER_CONFIRMED",
        isActive: true,
      });
    }
  }

  return {
    updatedOrder,
    updatedPayment,
    commissions,
    success: true,
    message: `COD Payment approved. Order confirmed and commission calculated for ${sellerSlugs.length} seller(s).`,
  };
}

/**
 * Reject COD payment
 */
function rejectPayment(
  order: MarketplaceOrder,
  payment: PaymentRecord,
  verification: CODPaymentVerificationRequest,
  adminUser: MarketplaceUser,
): {
  updatedOrder: MarketplaceOrder;
  updatedPayment: PaymentRecord;
  success: boolean;
  message: string;
} {
  const now = new Date().toISOString();

  // Update payment status
  const updatedPayment: PaymentRecord = {
    ...payment,
    status: "REJECTED",
    updatedAt: now,
  };

  // Order status remains AWAITING_PAYMENT_VERIFICATION or goes back to PENDING
  const updatedOrder: MarketplaceOrder = {
    ...order,
    status: "PENDING",
    updatedAt: now,
  };

  return {
    updatedOrder,
    updatedPayment,
    success: true,
    message: "COD Payment rejected. Order status reset to pending.",
  };
}

/**
 * Generate payment verification report for admin
 */
export function generatePaymentVerificationReport(
  orders: MarketplaceOrder[],
  payments: Map<string, PaymentRecord>,
) {
  const pending = orders.filter((order) => {
    const payment = payments.get(order.paymentId);
    return payment?.method === "COD" && payment?.status === "PENDING";
  });

  const awaitingVerification = orders.filter((order) => {
    const payment = payments.get(order.paymentId);
    return payment?.method === "COD" && payment?.status === "UNDER_REVIEW";
  });

  const verified = orders.filter((order) => {
    const payment = payments.get(order.paymentId);
    return payment?.method === "COD" && payment?.status === "PAID";
  });

  const rejected = orders.filter((order) => {
    const payment = payments.get(order.paymentId);
    return payment?.method === "COD" && payment?.status === "REJECTED";
  });

  return {
    totalCODOrders: orders.filter((o) => {
      const p = payments.get(o.paymentId);
      return p?.method === "COD";
    }).length,
    pendingVerification: pending.length,
    awaitingVerification: awaitingVerification.length,
    verifiedAndPaid: verified.length,
    rejected: rejected.length,
    pendingOrders: pending,
    awaitingVerificationOrders: awaitingVerification,
    verifiedOrders: verified,
    rejectedOrders: rejected,
  };
}

/**
 * Batch process COD verifications
 */
export function batchVerifyCODPayments(
  orders: MarketplaceOrder[],
  payments: Map<string, PaymentRecord>,
  adminUser: MarketplaceUser,
  decisions: Map<string, "APPROVE" | "REJECT">,
) {
  const results: {
    orderId: string;
    success: boolean;
    message: string;
    updatedOrder?: MarketplaceOrder;
    updatedPayment?: PaymentRecord;
  }[] = [];

  for (const order of orders) {
    const decision = decisions.get(order.id);
    if (!decision) continue;

    const payment = payments.get(order.paymentId);
    if (!payment) {
      results.push({
        orderId: order.id,
        success: false,
        message: "Payment record not found.",
      });
      continue;
    }

    const result = verifyCODPayment(
      order,
      payment,
      {
        orderId: order.id,
        amountReceived: order.totals.total,
        deliveryPartnerName: "Unknown",
        deliveryPartnerPhone: "Unknown",
        deliveryDateTime: new Date().toISOString(),
      },
      adminUser,
      decision,
    );

    results.push({
      orderId: order.id,
      success: result.success,
      message: result.message,
      updatedOrder: result.updatedOrder,
      updatedPayment: result.updatedPayment,
    });
  }

  return results;
}

/**
 * Hold/Flag a payment for investigation
 */
export function holdPaymentForReview(
  payment: PaymentRecord,
  reason: string,
  adminUser: MarketplaceUser,
): PaymentRecord {
  if (!canVerifyPayments(adminUser)) {
    throw new Error("Unauthorized: Only admins can hold payments.");
  }

  return {
    ...payment,
    status: "UNDER_REVIEW",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Release payment from hold
 */
export function releasePaymentFromHold(
  payment: PaymentRecord,
  decision: "APPROVE" | "REJECT",
  adminUser: MarketplaceUser,
): PaymentRecord {
  if (!canVerifyPayments(adminUser)) {
    throw new Error("Unauthorized: Only admins can release held payments.");
  }

  const newStatus: PaymentRecord["status"] = decision === "APPROVE" ? "PAID" : "REJECTED";

  return {
    ...payment,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}
