import { getCommissionRateForCategory } from "./commission-management";
import type {
  CODCollectionStatus,
  CODRemittance,
  CommissionRule,
  MarketplaceOrder,
  MarketplaceState,
  PaymentRecord,
  SellerPayout,
  SellerSettlement,
  SellerSettlementStatus,
} from "./types";

export function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function isRuleActive(rule: CommissionRule, effectiveAt: string) {
  if (!rule.active) {
    return false;
  }

  if (rule.effectiveFrom > effectiveAt) {
    return false;
  }

  if (rule.effectiveTo && rule.effectiveTo < effectiveAt) {
    return false;
  }

  return true;
}

function getRulePriority(rule: CommissionRule) {
  switch (rule.scope) {
    case "PRODUCT":
      return 0;
    case "STORE":
      return 1;
    case "SELLER":
      return 2;
    case "CATEGORY":
      return 3;
    default:
      return 4;
  }
}

export function resolveCommissionRuleForOrderItem(
  state: MarketplaceState,
  item: MarketplaceOrder["items"][number],
  effectiveAt: string,
) {
  const product = state.managedProducts.find((candidate) => candidate.id === item.productId);
  const categorySlug = product?.category ?? "general";

  const candidates = state.commissionRules
    .filter((rule) => isRuleActive(rule, effectiveAt))
    .filter((rule) => {
      if (rule.scope === "PRODUCT") {
        return rule.productId === item.productId;
      }

      if (rule.scope === "STORE") {
        return rule.storeSlug === item.sellerSlug;
      }

      if (rule.scope === "SELLER") {
        return rule.sellerSlug === item.sellerSlug;
      }

      return rule.categorySlug === categorySlug;
    })
    .sort((left, right) => getRulePriority(left) - getRulePriority(right));

  const matchedRule = candidates[0];
  const seller = state.sellersDirectory.find((entry) => entry.slug === item.sellerSlug);
  const category = state.managedCategories.find((entry) => entry.slug === categorySlug);

  const percentageRate = matchedRule
    ? matchedRule.percentageRate
    : getCommissionRateForCategory(categorySlug, {
        categoryRate: category?.commissionRate,
        productOverride: product?.commissionRateOverride,
        sellerCustomRate: seller?.commissionRate,
        defaultRate: state.systemSettings.sellerPlatform.defaultCommissionRate,
      });

  return {
    matchedRule,
    categorySlug,
    percentageRate,
    fixedFeeAmount: matchedRule?.fixedFeeAmount ?? 0,
  };
}

export function getCODRemittanceByOrderId(state: MarketplaceState, orderId: string) {
  return state.codRemittances.find((entry) => entry.orderId === orderId);
}

export function getLinkedPayoutBySettlementId(state: MarketplaceState, settlementId: string) {
  return state.sellerPayouts.find(
    (payout) =>
      payout.settlementIds?.includes(settlementId) &&
      !["FAILED", "CANCELED"].includes(payout.status),
  );
}

export function getSettlementPayableAt(deliveredAt: string, holdingPeriodDays: number) {
  const date = new Date(deliveredAt);
  date.setDate(date.getDate() + holdingPeriodDays);
  return date.toISOString();
}

export function ensureCODRemittanceRecord(
  state: MarketplaceState,
  order: MarketplaceOrder,
  payment: PaymentRecord,
  updatedAt: string,
) {
  if (payment.method !== "COD") {
    return state.codRemittances;
  }

  const existing = getCODRemittanceByOrderId(state, order.id);
  const sellerSlugs = Array.from(new Set(order.items.map((item) => item.sellerSlug)));
  const expectedAmount = roundMoney(order.totals.total);

  const nextStatus = getAutoCODRemittanceStatus(order.status, existing?.status);

  if (existing) {
    return state.codRemittances.map((entry) =>
      entry.id === existing.id
        ? {
            ...entry,
            expectedAmount,
            sellerSlugs,
            status: nextStatus,
            updatedAt,
          }
        : entry,
    );
  }

  const nextRecord: CODRemittance = {
    id: `remit-${order.id}`,
    orderId: order.id,
    paymentId: payment.id,
    sellerSlugs,
    expectedAmount,
    status: nextStatus,
    discrepancyStatus: "NONE",
    createdAt: updatedAt,
    updatedAt,
  };

  return [...state.codRemittances, nextRecord];
}

function getAutoCODRemittanceStatus(
  orderStatus: MarketplaceOrder["status"],
  currentStatus?: CODCollectionStatus,
): CODCollectionStatus {
  if (currentStatus === "ISSUE_FLAGGED") {
    return currentStatus;
  }

  if (
    currentStatus === "CASH_COLLECTED_BY_PARTNER" ||
    currentStatus === "REMITTED_TO_MARKETPLACE" ||
    currentStatus === "REMITTANCE_CONFIRMED"
  ) {
    return currentStatus;
  }

  if (orderStatus === "DELIVERED") {
    return "DELIVERED_AWAITING_COLLECTION_CONFIRMATION";
  }

  return "AWAITING_DELIVERY";
}

export function deriveSettlementStatus(
  state: MarketplaceState,
  order: MarketplaceOrder,
  payment: PaymentRecord,
  settlementId: string,
  _payableAt?: string,
) {
  const payout = getLinkedPayoutBySettlementId(state, settlementId);
  const remittance =
    payment.method === "COD" ? getCODRemittanceByOrderId(state, order.id) : undefined;

  if (order.status === "CANCELED" || order.status === "RETURNED") {
    return "FAILED" as SellerSettlementStatus;
  }

  if (
    payment.status === "FAILED" ||
    payment.status === "REJECTED" ||
    payment.status === "REFUNDED"
  ) {
    return "FAILED" as SellerSettlementStatus;
  }

  if (remittance?.status === "ISSUE_FLAGGED") {
    return "ON_HOLD" as SellerSettlementStatus;
  }

  if (payout?.status === "HELD") {
    return "ON_HOLD" as SellerSettlementStatus;
  }

  if (payout?.status === "PAID") {
    return "PAID_OUT" as SellerSettlementStatus;
  }

  if (payout && ["PROCESSING", "APPROVED"].includes(payout.status)) {
    return "PAYOUT_PROCESSING" as SellerSettlementStatus;
  }

  if (payout && ["DRAFT", "PENDING_APPROVAL", "PENDING", "SCHEDULED"].includes(payout.status)) {
    return "IN_PAYOUT_QUEUE" as SellerSettlementStatus;
  }

  if (payment.status !== "PAID") {
    return "NOT_READY" as SellerSettlementStatus;
  }

  if (payment.method === "COD" && remittance?.status !== "REMITTANCE_CONFIRMED") {
    return "NOT_READY" as SellerSettlementStatus;
  }

  if (order.status !== "DELIVERED") {
    return "NOT_READY" as SellerSettlementStatus;
  }

  return "READY_FOR_SETTLEMENT" as SellerSettlementStatus;
}

export function getEffectiveSettlementStatus(
  state: MarketplaceState,
  settlement: SellerSettlement,
) {
  const order = state.orders.find((entry) => entry.id === settlement.orderId);

  if (!order) {
    return settlement.settlementStatus;
  }

  const payment = state.payments.find((entry) => entry.id === order.paymentId);

  if (!payment) {
    return settlement.settlementStatus;
  }

  return deriveSettlementStatus(state, order, payment, settlement.id, settlement.payableAt);
}

export function createOrRefreshSettlementEntries(
  state: MarketplaceState,
  order: MarketplaceOrder,
  updatedAt: string,
) {
  const payment = state.payments.find((entry) => entry.id === order.paymentId);

  if (!payment) {
    return state.sellerSettlements;
  }

  const nextEntries = order.items.flatMap((item) => {
    const seller = state.sellersDirectory.find((entry) => entry.slug === item.sellerSlug);

    if (!seller) {
      return [];
    }

    const existing = state.sellerSettlements.find(
      (entry) => entry.orderId === order.id && entry.orderItemId === item.id,
    );
    const { matchedRule, categorySlug, percentageRate, fixedFeeAmount } =
      resolveCommissionRuleForOrderItem(state, item, updatedAt);
    const grossSaleAmount = roundMoney(item.unitPrice * item.quantity);
    const commissionAmount = roundMoney((grossSaleAmount * percentageRate) / 100);
    const feeAmount = roundMoney(fixedFeeAmount);
    const netPayableAmount = roundMoney(
      Math.max(0, grossSaleAmount - commissionAmount - feeAmount),
    );
    const payableAt =
      order.status === "DELIVERED"
        ? getSettlementPayableAt(order.updatedAt, state.payoutCycleConfig.holdingPeriodDays)
        : existing?.payableAt;
    const settlementId = existing?.id ?? `settlement-${order.id}-${item.id}`;
    const payoutId = existing?.payoutId;
    const remittance =
      payment.method === "COD" ? getCODRemittanceByOrderId(state, order.id) : undefined;

    return [
      {
        id: settlementId,
        sellerSlug: item.sellerSlug,
        sellerId: seller.ownerUserId ?? seller.slug,
        storeId: seller.slug,
        orderId: order.id,
        orderItemId: item.id,
        productId: item.productId,
        productTitle: item.title,
        productCategory: categorySlug,
        grossSaleAmount,
        commissionRuleId: matchedRule?.id,
        commissionRate: percentageRate,
        commissionAmount,
        feeAmount,
        netPayableAmount,
        financialSourceType:
          payment.method === "COD"
            ? "COD"
            : payment.method === "BANK_TRANSFER" ||
                payment.method === "EASYPAISA" ||
                payment.method === "JAZZCASH"
              ? "MANUAL_VERIFIED"
              : "ONLINE",
        settlementStatus: deriveSettlementStatus(state, order, payment, settlementId, payableAt),
        createdAt: existing?.createdAt ?? updatedAt,
        updatedAt,
        payableAt,
        payoutId,
        codRemittanceId: remittance?.id,
        note: existing?.note,
        holdReason: existing?.holdReason,
      } satisfies SellerSettlement,
    ];
  });

  const preserved = state.sellerSettlements.filter((entry) => entry.orderId !== order.id);
  return [...preserved, ...nextEntries];
}

export function getEligibleSettlementsForSeller(state: MarketplaceState, sellerSlug: string) {
  return state.sellerSettlements.filter(
    (entry) =>
      entry.sellerSlug === sellerSlug &&
      getEffectiveSettlementStatus(state, entry) === "READY_FOR_SETTLEMENT" &&
      !entry.payoutId,
  );
}

export function getRequestableSettlementBalance(state: MarketplaceState, sellerSlug: string) {
  return roundMoney(
    getEligibleSettlementsForSeller(state, sellerSlug).reduce(
      (sum, entry) => sum + entry.netPayableAmount,
      0,
    ),
  );
}

export function updateSettlementStatusesForPayout(
  settlements: SellerSettlement[],
  payout: Pick<SellerPayout, "id" | "status" | "settlementIds">,
  updatedAt: string,
) {
  return settlements.map((entry) => {
    if (!payout.settlementIds?.includes(entry.id)) {
      return entry;
    }

    let settlementStatus: SellerSettlementStatus = entry.settlementStatus;

    if (payout.status === "PAID") {
      settlementStatus = "PAID_OUT";
    } else if (payout.status === "HELD") {
      settlementStatus = "ON_HOLD";
    } else if (payout.status === "FAILED" || payout.status === "CANCELED") {
      settlementStatus = "READY_FOR_SETTLEMENT";
    } else if (payout.status === "PROCESSING" || payout.status === "APPROVED") {
      settlementStatus = "PAYOUT_PROCESSING";
    } else if (["DRAFT", "PENDING_APPROVAL", "PENDING", "SCHEDULED"].includes(payout.status)) {
      settlementStatus = "IN_PAYOUT_QUEUE";
    }

    return {
      ...entry,
      payoutId: payout.status === "FAILED" || payout.status === "CANCELED" ? undefined : payout.id,
      settlementStatus,
      updatedAt,
    };
  });
}

export function buildPayoutFromSettlements(
  state: MarketplaceState,
  sellerSlug: string,
  settlements: SellerSettlement[],
  input: {
    createdAt: string;
    payoutPeriod: SellerPayout["payoutPeriod"];
    payoutStatus: SellerPayout["status"];
    requestType: NonNullable<SellerPayout["requestType"]>;
    requestedByUserId?: string;
    requestNote?: string;
    createdByUserId?: string;
  },
) {
  const seller = state.sellersDirectory.find((entry) => entry.slug === sellerSlug);

  if (!seller) {
    return null;
  }

  const payoutAccount = seller.payoutAccount;
  const settlementIds = settlements.map((entry) => entry.id);
  const orderIds = Array.from(new Set(settlements.map((entry) => entry.orderId)));
  const commissionIds = state.commissions
    .filter((commission) =>
      settlements.some(
        (settlement) =>
          settlement.orderId === commission.orderId &&
          settlement.orderItemId === commission.orderItemId,
      ),
    )
    .map((commission) => commission.id);

  return {
    id: `payout-${sellerSlug}-${new Date(input.createdAt).getTime()}`,
    sellerSlug,
    sellerId: seller.ownerUserId ?? seller.slug,
    payoutPeriod: input.payoutPeriod,
    periodStartDate: input.createdAt,
    periodEndDate: input.createdAt,
    totalEarnings: roundMoney(settlements.reduce((sum, entry) => sum + entry.grossSaleAmount, 0)),
    totalCommissionDeducted: roundMoney(
      settlements.reduce((sum, entry) => sum + entry.commissionAmount, 0),
    ),
    totalFees: roundMoney(settlements.reduce((sum, entry) => sum + entry.feeAmount, 0)),
    netAmount: roundMoney(settlements.reduce((sum, entry) => sum + entry.netPayableAmount, 0)),
    commissionIds,
    settlementIds,
    orderIds,
    status: input.payoutStatus,
    currency: state.systemSettings.currency,
    payoutMethod: payoutAccount?.method,
    payoutAccountSnapshot: payoutAccount,
    bankDetails:
      payoutAccount?.method === "BANK_TRANSFER" &&
      payoutAccount.accountTitle &&
      payoutAccount.accountNumber &&
      payoutAccount.bankName &&
      payoutAccount.iban
        ? {
            accountTitle: payoutAccount.accountTitle,
            accountNumber: payoutAccount.accountNumber,
            bankName: payoutAccount.bankName,
            iban: payoutAccount.iban,
          }
        : undefined,
    easyPaisaNumber:
      payoutAccount?.method === "EASYPAISA" ? payoutAccount.easyPaisaNumber : undefined,
    jazzCashNumber: payoutAccount?.method === "JAZZCASH" ? payoutAccount.jazzCashNumber : undefined,
    paypalEmail: payoutAccount?.method === "PAYPAL" ? payoutAccount.paypalEmail : undefined,
    walletId: payoutAccount?.method === "WALLET" ? payoutAccount.walletId : undefined,
    requestType: input.requestType,
    requestedByUserId: input.requestedByUserId,
    requestedAt: input.requestedByUserId ? input.createdAt : undefined,
    requestNote: input.requestNote,
    createdByUserId: input.createdByUserId ?? input.requestedByUserId ?? "system",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  } satisfies SellerPayout;
}

export function getSellerSettlementTotals(settlements: SellerSettlement[]) {
  return settlements.reduce(
    (summary, entry) => {
      summary.gross += entry.grossSaleAmount;
      summary.commission += entry.commissionAmount;
      summary.fees += entry.feeAmount;
      summary.net += entry.netPayableAmount;

      if (entry.settlementStatus === "READY_FOR_SETTLEMENT") {
        summary.ready += entry.netPayableAmount;
      }

      if (entry.settlementStatus === "IN_PAYOUT_QUEUE") {
        summary.inQueue += entry.netPayableAmount;
      }

      if (entry.settlementStatus === "PAYOUT_PROCESSING") {
        summary.processing += entry.netPayableAmount;
      }

      if (entry.settlementStatus === "PAID_OUT") {
        summary.paid += entry.netPayableAmount;
      }

      if (entry.settlementStatus === "ON_HOLD") {
        summary.onHold += entry.netPayableAmount;
      }

      if (entry.settlementStatus === "NOT_READY") {
        summary.notReady += entry.netPayableAmount;
      }

      if (entry.settlementStatus === "FAILED") {
        summary.failed += entry.netPayableAmount;
      }

      return summary;
    },
    {
      gross: 0,
      commission: 0,
      fees: 0,
      net: 0,
      ready: 0,
      inQueue: 0,
      processing: 0,
      paid: 0,
      onHold: 0,
      notReady: 0,
      failed: 0,
    },
  );
}
