import { getLatestProofForOrder, getPaymentById } from "./selectors";
import {
  getCODRemittanceByOrderId,
  getEffectiveSettlementStatus,
  getSellerSettlementTotals,
} from "./settlements";
import type {
  MarketplaceState,
  OrderStatus,
  PaymentMethod,
  PaymentProofStatus,
  PaymentStatus,
  PayoutStatus,
  SellerPayout,
} from "./types";

export type PaymentDashboardRange = "ALL" | "30D" | "90D" | "365D";

export type PaymentVerificationState =
  | "AWAITING_PROOF"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "NOT_REQUIRED";

export type SellerFundsState =
  | "AWAITING_PAYMENT_VERIFICATION"
  | "READY_FOR_PAYOUT"
  | "SCHEDULED_PAYOUT"
  | "PROCESSING_PAYOUT"
  | "HELD"
  | "PAID_OUT"
  | "CANCELED";

export type SellerPaymentOrderRow = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProofStatus?: PaymentProofStatus;
  verificationState: PaymentVerificationState;
  fundsState: SellerFundsState;
  payoutStatus: PayoutStatus | "UNSCHEDULED";
  payoutId?: string;
  payoutDate?: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerNetAmount: number;
};

export type SellerPaymentCategoryRow = {
  category: string;
  orderCount: number;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerNetAmount: number;
};

export type SellerPaymentDashboardData = {
  sellerSlug: string;
  summary: {
    grossSales: number;
    platformCommission: number;
    netAfterCommission: number;
    verifiedNet: number;
    awaitingVerification: number;
    readyForPayout: number;
    scheduledPayouts: number;
    processingPayouts: number;
    heldPayouts: number;
    paidOut: number;
    codAwaitingVerificationCount: number;
    manualAwaitingVerificationCount: number;
    rejectedVerificationCount: number;
    nextPayoutDate?: string;
  };
  orderRows: SellerPaymentOrderRow[];
  categoryRows: SellerPaymentCategoryRow[];
  payouts: SellerPayout[];
};

export type AdminSellerPaymentSummaryRow = {
  sellerSlug: string;
  sellerName: string;
  grossSales: number;
  platformCommission: number;
  netAfterCommission: number;
  verifiedNet: number;
  awaitingVerification: number;
  readyForPayout: number;
  scheduledPayouts: number;
  processingPayouts: number;
  heldPayouts: number;
  paidOut: number;
  orderCount: number;
  nextPayoutDate?: string;
};

export type PaymentMethodFinanceRow = {
  method: PaymentMethod;
  grossSales: number;
  platformCommission: number;
  sellerNet: number;
  awaitingVerification: number;
  paidOut: number;
  orderCount: number;
};

export type AdminPaymentDashboardData = {
  summary: {
    grossSales: number;
    platformCommission: number;
    sellerNet: number;
    awaitingVerification: number;
    readyForPayout: number;
    scheduledPayouts: number;
    processingPayouts: number;
    heldPayouts: number;
    paidOut: number;
    manualProofQueue: number;
    codProofQueue: number;
  };
  sellerRows: AdminSellerPaymentSummaryRow[];
  paymentMethodRows: PaymentMethodFinanceRow[];
  recentPayouts: SellerPayout[];
};

function matchesRange(dateString: string, range: PaymentDashboardRange) {
  if (range === "ALL") {
    return true;
  }

  const now = Date.now();
  const target = new Date(dateString).getTime();
  const days = range === "30D" ? 30 : range === "90D" ? 90 : 365;

  return target >= now - days * 24 * 60 * 60 * 1000;
}

function getVerificationState(
  paymentStatus: PaymentStatus,
  proofStatus?: PaymentProofStatus,
): PaymentVerificationState {
  if (paymentStatus === "PAID") {
    return "VERIFIED";
  }

  if (paymentStatus === "REJECTED" || proofStatus === "REJECTED") {
    return "REJECTED";
  }

  if (
    paymentStatus === "UNDER_REVIEW" ||
    proofStatus === "SUBMITTED" ||
    paymentStatus === "PROOF_SUBMITTED"
  ) {
    return "UNDER_REVIEW";
  }

  if (paymentStatus === "PENDING" || paymentStatus === "REQUIRES_PROOF") {
    return "AWAITING_PROOF";
  }

  return "NOT_REQUIRED";
}

function getVerificationStateForOrder(
  state: MarketplaceState,
  orderId: string,
  paymentStatus: PaymentStatus,
  proofStatus?: PaymentProofStatus,
): PaymentVerificationState {
  const remittance = getCODRemittanceByOrderId(state, orderId);

  if (remittance?.status === "ISSUE_FLAGGED") {
    return "REJECTED";
  }

  if (remittance?.status === "REMITTANCE_CONFIRMED") {
    return "VERIFIED";
  }

  return getVerificationState(paymentStatus, proofStatus);
}

function getFundsState(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
  settlementStatuses: string[],
  payoutStatus: PayoutStatus | "UNSCHEDULED",
): SellerFundsState {
  if (orderStatus === "CANCELED" || orderStatus === "RETURNED") {
    return "CANCELED";
  }

  if (settlementStatuses.includes("ON_HOLD") || payoutStatus === "HELD") {
    return "HELD";
  }

  if (settlementStatuses.length === 0 && paymentStatus !== "PAID") {
    return "AWAITING_PAYMENT_VERIFICATION";
  }

  if (settlementStatuses.includes("NOT_READY")) {
    return "AWAITING_PAYMENT_VERIFICATION";
  }

  if (payoutStatus === "PAID") {
    return "PAID_OUT";
  }

  if (payoutStatus === "PROCESSING") {
    return "PROCESSING_PAYOUT";
  }

  if (
    settlementStatuses.includes("IN_PAYOUT_QUEUE") ||
    payoutStatus === "SCHEDULED" ||
    payoutStatus === "PENDING" ||
    payoutStatus === "DRAFT" ||
    payoutStatus === "PENDING_APPROVAL"
  ) {
    return "SCHEDULED_PAYOUT";
  }

  if (settlementStatuses.includes("PAYOUT_PROCESSING") || payoutStatus === "APPROVED") {
    return "PROCESSING_PAYOUT";
  }

  if (settlementStatuses.includes("PAID_OUT")) {
    return "PAID_OUT";
  }

  if (settlementStatuses.includes("READY_FOR_SETTLEMENT")) {
    return "READY_FOR_PAYOUT";
  }

  return "READY_FOR_PAYOUT";
}

function getLinkedPayout(state: MarketplaceState, sellerSlug: string, orderId: string) {
  return state.sellerPayouts.find(
    (payout) =>
      payout.sellerSlug === sellerSlug &&
      payout.orderIds.includes(orderId) &&
      !["FAILED", "CANCELED"].includes(payout.status),
  );
}

export function getSellerPaymentDashboardData(
  state: MarketplaceState,
  sellerSlug: string,
  range: PaymentDashboardRange = "ALL",
): SellerPaymentDashboardData {
  const orderRowMap = new Map<string, SellerPaymentOrderRow>();
  const settlementRows = state.sellerSettlements.filter(
    (entry) => entry.sellerSlug === sellerSlug && matchesRange(entry.createdAt, range),
  );
  const effectiveSettlementRows = settlementRows.map((settlement) => ({
    ...settlement,
    settlementStatus: getEffectiveSettlementStatus(state, settlement),
  }));

  effectiveSettlementRows.forEach((settlement) => {
    const order = state.orders.find((item) => item.id === settlement.orderId);
    const payment = order ? getPaymentById(state, order.paymentId) : undefined;
    const latestProof = order ? getLatestProofForOrder(state, order.id) : undefined;
    const linkedPayout =
      state.sellerPayouts.find(
        (payout) =>
          payout.sellerSlug === sellerSlug && payout.settlementIds?.includes(settlement.id),
      ) ?? getLinkedPayout(state, sellerSlug, settlement.orderId);
    const payoutStatus = linkedPayout?.status ?? "UNSCHEDULED";

    if (!order || !payment) {
      return;
    }

    const orderSettlements = effectiveSettlementRows.filter(
      (entry) => entry.orderId === settlement.orderId,
    );
    const settlementStatuses = orderSettlements.map((entry) => entry.settlementStatus);
    const existing = orderRowMap.get(settlement.orderId);
    const grossAmount = (existing?.grossAmount ?? 0) + settlement.grossSaleAmount;
    const commissionAmount = (existing?.commissionAmount ?? 0) + settlement.commissionAmount;
    const sellerNetAmount = (existing?.sellerNetAmount ?? 0) + settlement.netPayableAmount;

    orderRowMap.set(settlement.orderId, {
      orderId: settlement.orderId,
      orderNumber: order.orderNumber,
      createdAt: settlement.createdAt,
      orderStatus: order.status,
      paymentMethod: payment.method,
      paymentStatus: payment.status,
      paymentProofStatus: latestProof?.status,
      verificationState: getVerificationStateForOrder(
        state,
        settlement.orderId,
        payment.status,
        latestProof?.status,
      ),
      fundsState: getFundsState(order.status, payment.status, settlementStatuses, payoutStatus),
      payoutStatus,
      payoutId: linkedPayout?.id,
      payoutDate: linkedPayout?.paidAt ?? linkedPayout?.processedAt ?? linkedPayout?.periodEndDate,
      grossAmount,
      commissionRate:
        grossAmount > 0 ? Number(((commissionAmount / grossAmount) * 100).toFixed(2)) : 0,
      commissionAmount,
      sellerNetAmount,
    });
  });

  const orderRows = Array.from(orderRowMap.values()).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  const payouts = state.sellerPayouts
    .filter((payout) => payout.sellerSlug === sellerSlug)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const settlementSummary = getSellerSettlementTotals(effectiveSettlementRows);

  const summary = {
    grossSales: settlementSummary.gross,
    platformCommission: settlementSummary.commission,
    netAfterCommission: settlementSummary.net,
    verifiedNet:
      settlementSummary.ready +
      settlementSummary.inQueue +
      settlementSummary.processing +
      settlementSummary.paid,
    awaitingVerification: settlementSummary.notReady,
    readyForPayout: settlementSummary.ready,
    scheduledPayouts: settlementSummary.inQueue,
    processingPayouts: settlementSummary.processing,
    heldPayouts: settlementSummary.onHold,
    paidOut: settlementSummary.paid,
    codAwaitingVerificationCount: orderRows.filter(
      (row) => row.paymentMethod === "COD" && row.verificationState !== "VERIFIED",
    ).length,
    manualAwaitingVerificationCount: orderRows.filter(
      (row) => row.paymentMethod !== "COD" && row.verificationState !== "VERIFIED",
    ).length,
    rejectedVerificationCount: orderRows.filter((row) => row.verificationState === "REJECTED")
      .length,
    nextPayoutDate: payouts
      .filter((payout) =>
        [
          "DRAFT",
          "PENDING_APPROVAL",
          "APPROVED",
          "PROCESSING",
          "HELD",
          "PENDING",
          "SCHEDULED",
        ].includes(payout.status),
      )
      .sort((left, right) => left.periodEndDate.localeCompare(right.periodEndDate))[0]
      ?.periodEndDate,
  };

  const categoryMap = new Map<string, SellerPaymentCategoryRow>();

  settlementRows.forEach((row) => {
    const existing = categoryMap.get(row.productCategory) ?? {
      category: row.productCategory,
      orderCount: 0,
      grossAmount: 0,
      commissionRate: row.commissionRate,
      commissionAmount: 0,
      sellerNetAmount: 0,
    };

    existing.orderCount += 1;
    existing.grossAmount += row.grossSaleAmount;
    existing.commissionAmount += row.commissionAmount;
    existing.sellerNetAmount += row.netPayableAmount;
    existing.commissionRate =
      existing.grossAmount > 0
        ? Number(((existing.commissionAmount / existing.grossAmount) * 100).toFixed(2))
        : row.commissionRate;

    categoryMap.set(row.productCategory, existing);
  });

  const categoryRows = Array.from(categoryMap.values()).sort(
    (left, right) => right.sellerNetAmount - left.sellerNetAmount,
  );

  return {
    sellerSlug,
    summary,
    orderRows,
    categoryRows,
    payouts,
  };
}

export function getAdminPaymentDashboardData(
  state: MarketplaceState,
  range: PaymentDashboardRange = "ALL",
): AdminPaymentDashboardData {
  const sellerRows = state.sellersDirectory
    .map((seller) => {
      const sellerDashboard = getSellerPaymentDashboardData(state, seller.slug, range);

      return {
        sellerSlug: seller.slug,
        sellerName: seller.name,
        grossSales: sellerDashboard.summary.grossSales,
        platformCommission: sellerDashboard.summary.platformCommission,
        netAfterCommission: sellerDashboard.summary.netAfterCommission,
        verifiedNet: sellerDashboard.summary.verifiedNet,
        awaitingVerification: sellerDashboard.summary.awaitingVerification,
        readyForPayout: sellerDashboard.summary.readyForPayout,
        scheduledPayouts: sellerDashboard.summary.scheduledPayouts,
        processingPayouts: sellerDashboard.summary.processingPayouts,
        heldPayouts: sellerDashboard.summary.heldPayouts,
        paidOut: sellerDashboard.summary.paidOut,
        orderCount: sellerDashboard.orderRows.length,
        nextPayoutDate: sellerDashboard.summary.nextPayoutDate,
      };
    })
    .filter(
      (row) =>
        row.orderCount > 0 ||
        row.awaitingVerification > 0 ||
        row.readyForPayout > 0 ||
        row.scheduledPayouts > 0 ||
        row.processingPayouts > 0 ||
        row.paidOut > 0,
    )
    .sort(
      (left, right) =>
        right.awaitingVerification +
        right.readyForPayout +
        right.scheduledPayouts +
        right.processingPayouts -
        (left.awaitingVerification +
          left.readyForPayout +
          left.scheduledPayouts +
          left.processingPayouts),
    );

  const allOrderRows = sellerRows.flatMap(
    (row) => getSellerPaymentDashboardData(state, row.sellerSlug, range).orderRows,
  );

  const methods: PaymentMethod[] = ["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"];
  const paymentMethodRows = methods.map((method) => {
    const methodRows = allOrderRows.filter((row) => row.paymentMethod === method);

    return methodRows.reduce<PaymentMethodFinanceRow>(
      (acc, row) => {
        acc.grossSales += row.grossAmount;
        acc.platformCommission += row.commissionAmount;
        acc.sellerNet += row.sellerNetAmount;
        acc.orderCount += 1;

        if (row.fundsState === "AWAITING_PAYMENT_VERIFICATION") {
          acc.awaitingVerification += row.sellerNetAmount;
        }

        if (row.fundsState === "PAID_OUT") {
          acc.paidOut += row.sellerNetAmount;
        }

        return acc;
      },
      {
        method,
        grossSales: 0,
        platformCommission: 0,
        sellerNet: 0,
        awaitingVerification: 0,
        paidOut: 0,
        orderCount: 0,
      },
    );
  });

  const summary = sellerRows.reduce(
    (acc, row) => {
      acc.grossSales += row.grossSales;
      acc.platformCommission += row.platformCommission;
      acc.sellerNet += row.netAfterCommission;
      acc.awaitingVerification += row.awaitingVerification;
      acc.readyForPayout += row.readyForPayout;
      acc.scheduledPayouts += row.scheduledPayouts;
      acc.processingPayouts += row.processingPayouts;
      acc.heldPayouts += row.heldPayouts;
      acc.paidOut += row.paidOut;
      return acc;
    },
    {
      grossSales: 0,
      platformCommission: 0,
      sellerNet: 0,
      awaitingVerification: 0,
      readyForPayout: 0,
      scheduledPayouts: 0,
      processingPayouts: 0,
      heldPayouts: 0,
      paidOut: 0,
      manualProofQueue: state.paymentProofs.filter(
        (proof) => proof.paymentMethod !== "COD" && proof.status === "SUBMITTED",
      ).length,
      codProofQueue:
        state.payments.filter(
          (payment) => payment.method === "COD" && payment.status === "UNDER_REVIEW",
        ).length +
        state.orders.filter((order) => {
          const payment = getPaymentById(state, order.paymentId);
          return (
            payment?.method === "COD" &&
            payment.status === "PENDING" &&
            order.status === "DELIVERED"
          );
        }).length,
    },
  );

  return {
    summary,
    sellerRows,
    paymentMethodRows,
    recentPayouts: [...state.sellerPayouts]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8),
  };
}
