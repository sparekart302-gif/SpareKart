import { buildCommissionRecordsForOrder } from "./commission-management";
import { getEligibleSettlementsForSeller, roundMoney } from "./settlements";
import type {
  CommissionRecord,
  MarketplaceOrder,
  MarketplaceState,
  SellerPayoutAccount,
  SellerPayout,
  SellerSettlement,
} from "./types";

function getPayoutPeriodWindow(
  dateString: string,
  period: MarketplaceState["payoutCycleConfig"]["period"],
) {
  const date = new Date(dateString);

  if (period === "WEEKLY") {
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function getCommissionRecordsForOrder(state: MarketplaceState, orderId: string) {
  return state.commissions.filter((commission) => commission.orderId === orderId);
}

export function createOrRefreshOrderCommissions(
  state: MarketplaceState,
  order: MarketplaceOrder,
  calculatedAt: string,
) {
  const nextRecords = buildCommissionRecordsForOrder(state, order, calculatedAt);

  return [
    ...state.commissions.filter((record) => record.orderId !== order.id || !record.isActive),
    ...nextRecords,
  ];
}

export function deactivateOrderCommissions(
  state: MarketplaceState,
  orderId: string,
  deactivatedAt: string,
) {
  return state.commissions.map((record) =>
    record.orderId === orderId
      ? {
          ...record,
          isActive: false,
          calculatedAt: deactivatedAt,
        }
      : record,
  );
}

export function getPayoutByCommissionId(payouts: SellerPayout[], commissionId: string) {
  return payouts.find(
    (payout) =>
      payout.commissionIds.includes(commissionId) &&
      !["FAILED", "CANCELED"].includes(payout.status),
  );
}

export function getEligibleSellerPayoutCommissions(state: MarketplaceState, sellerSlug: string) {
  const seller = state.sellersDirectory.find((entry) => entry.slug === sellerSlug);

  if (!seller || seller.payoutHold) {
    return [] as CommissionRecord[];
  }

  return state.commissions.filter((commission) => {
    if (!commission.isActive || commission.sellerSlug !== sellerSlug) {
      return false;
    }

    if (getPayoutByCommissionId(state.sellerPayouts, commission.id)) {
      return false;
    }

    const order = state.orders.find((candidate) => candidate.id === commission.orderId);
    const payment = order
      ? state.payments.find((candidate) => candidate.id === order.paymentId)
      : undefined;

    if (!order || !payment || order.status !== "DELIVERED" || payment.status !== "PAID") {
      return false;
    }

    return true;
  });
}

export function getEligibleSellerPayoutSettlements(state: MarketplaceState, sellerSlug: string) {
  const seller = state.sellersDirectory.find((entry) => entry.slug === sellerSlug);

  if (!seller || seller.payoutHold) {
    return [] as SellerSettlement[];
  }

  return getEligibleSettlementsForSeller(state, sellerSlug);
}

function applyPayoutAccountToRecord(payout: SellerPayout, payoutAccount?: SellerPayoutAccount) {
  if (!payoutAccount) {
    return payout;
  }

  return {
    ...payout,
    payoutMethod: payoutAccount.method,
    bankDetails:
      payoutAccount.method === "BANK_TRANSFER" &&
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
        : payout.bankDetails,
    easyPaisaNumber:
      payoutAccount.method === "EASYPAISA" ? payoutAccount.easyPaisaNumber : payout.easyPaisaNumber,
    jazzCashNumber:
      payoutAccount.method === "JAZZCASH" ? payoutAccount.jazzCashNumber : payout.jazzCashNumber,
    paypalEmail: payoutAccount.method === "PAYPAL" ? payoutAccount.paypalEmail : payout.paypalEmail,
    walletId: payoutAccount.method === "WALLET" ? payoutAccount.walletId : payout.walletId,
  };
}

export function reconcileScheduledPayouts(state: MarketplaceState, updatedAt: string) {
  const nextPayouts = [...state.sellerPayouts];
  const openStatuses = new Set([
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "PROCESSING",
    "HELD",
    "PENDING",
    "SCHEDULED",
  ]);
  const assignedSettlementIds = new Set(
    nextPayouts
      .filter((payout) => !["FAILED", "CANCELED"].includes(payout.status))
      .flatMap((payout) => payout.settlementIds ?? []),
  );

  const sellerGroups = new Map<string, SellerSettlement[]>();

  state.sellersDirectory.forEach((seller) => {
    const payoutAccount = seller.payoutAccount;

    if (
      !payoutAccount ||
      payoutAccount.status !== "VERIFIED" ||
      payoutAccount.schedulePreference === "MANUAL_REQUEST"
    ) {
      return;
    }

    const settlements = getEligibleSellerPayoutSettlements(state, seller.slug).filter(
      (settlement) => !assignedSettlementIds.has(settlement.id),
    );

    if (settlements.length > 0) {
      sellerGroups.set(seller.slug, settlements);
    }
  });

  sellerGroups.forEach((settlements, sellerSlug) => {
    const seller = state.sellersDirectory.find((entry) => entry.slug === sellerSlug);

    if (!seller || settlements.length === 0) {
      return;
    }

    const netAmount = settlements.reduce((sum, settlement) => sum + settlement.netPayableAmount, 0);

    if (netAmount < state.payoutCycleConfig.minimumPayoutAmount) {
      return;
    }

    const periodWindow = getPayoutPeriodWindow(updatedAt, state.payoutCycleConfig.period);
    const existingOpenPayout = nextPayouts.find(
      (payout) =>
        payout.sellerSlug === sellerSlug &&
        openStatuses.has(payout.status) &&
        payout.periodStartDate === periodWindow.start &&
        payout.periodEndDate === periodWindow.end &&
        payout.requestType !== "SELLER_REQUEST",
    );

    const settlementIds = settlements.map((settlement) => settlement.id);
    const orderIds = Array.from(new Set(settlements.map((settlement) => settlement.orderId)));
    const totalEarnings = roundMoney(
      settlements.reduce((sum, settlement) => sum + settlement.grossSaleAmount, 0),
    );
    const totalCommissionDeducted = roundMoney(
      settlements.reduce((sum, settlement) => sum + settlement.commissionAmount, 0),
    );
    const totalFees = roundMoney(
      settlements.reduce((sum, settlement) => sum + settlement.feeAmount, 0),
    );
    const commissionIds = state.commissions
      .filter((commission) =>
        settlements.some((settlement) => settlement.orderId === commission.orderId),
      )
      .map((commission) => commission.id);

    if (existingOpenPayout) {
      existingOpenPayout.settlementIds = Array.from(
        new Set([...(existingOpenPayout.settlementIds ?? []), ...settlementIds]),
      );
      existingOpenPayout.orderIds = Array.from(
        new Set([...existingOpenPayout.orderIds, ...orderIds]),
      );
      existingOpenPayout.commissionIds = Array.from(
        new Set([...existingOpenPayout.commissionIds, ...commissionIds]),
      );
      const payoutSettlements = state.sellerSettlements.filter((settlement) =>
        existingOpenPayout.settlementIds?.includes(settlement.id),
      );
      existingOpenPayout.totalEarnings = roundMoney(
        payoutSettlements.reduce((sum, settlement) => sum + settlement.grossSaleAmount, 0),
      );
      existingOpenPayout.totalCommissionDeducted = roundMoney(
        payoutSettlements.reduce((sum, settlement) => sum + settlement.commissionAmount, 0),
      );
      existingOpenPayout.totalFees = roundMoney(
        payoutSettlements.reduce((sum, settlement) => sum + settlement.feeAmount, 0),
      );
      existingOpenPayout.netAmount = roundMoney(
        payoutSettlements.reduce((sum, settlement) => sum + settlement.netPayableAmount, 0),
      );
      existingOpenPayout.updatedAt = updatedAt;
      existingOpenPayout.status = "DRAFT";
      existingOpenPayout.requestType = existingOpenPayout.requestType ?? "AUTO_SCHEDULED";
      const hydratedPayout = applyPayoutAccountToRecord(existingOpenPayout, seller.payoutAccount);
      Object.assign(existingOpenPayout, hydratedPayout);
      return;
    }

    let payout: SellerPayout = {
      id: `payout-${sellerSlug}-${new Date(updatedAt).getTime()}`,
      sellerSlug,
      sellerId: seller.ownerUserId ?? seller.slug,
      payoutPeriod: state.payoutCycleConfig.period,
      periodStartDate: periodWindow.start,
      periodEndDate: periodWindow.end,
      totalEarnings,
      totalCommissionDeducted,
      totalFees,
      netAmount,
      commissionIds,
      settlementIds,
      orderIds,
      status: "DRAFT",
      currency: state.systemSettings.currency,
      requestType: "AUTO_SCHEDULED",
      createdByUserId: "system",
      createdAt: updatedAt,
      updatedAt,
    };

    payout = applyPayoutAccountToRecord(payout, seller.payoutAccount);
    nextPayouts.push(payout);
  });

  return nextPayouts;
}
