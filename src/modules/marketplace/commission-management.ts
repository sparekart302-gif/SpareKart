import type {
  CommissionRecord,
  CommissionReport,
  CommissionDeductionSummary,
  PayoutCycleConfig,
  SellerEarningsSummary,
  SellerPayout,
  PayoutStatus,
} from "./commission-types";
import type { MarketplaceOrder, MarketplaceState, SellerRecord } from "./types";

/**
 * Default commission rates by product category (5% - 25%)
 */
export const CATEGORY_COMMISSION_RATES: Record<string, number> = {
  engine: 10,
  suspension: 12,
  brakes: 11,
  electrical: 15,
  cooling: 10,
  exhaust: 10,
  fuel: 14,
  transmission: 13,
  steering: 12,
  lighting: 16,
  body: 9,
  interior: 20,
  "tyres-wheels": 8,
};

/**
 * Get commission rate for a product category
 */
export function getCommissionRateForCategory(
  category: string,
  options?: {
    categoryRate?: number;
    productOverride?: number;
    sellerCustomRate?: number;
    defaultRate?: number;
  },
): number {
  if (options?.productOverride && options.productOverride > 0) {
    return options.productOverride;
  }

  if (options?.categoryRate && options.categoryRate > 0) {
    return options.categoryRate;
  }

  if (options?.sellerCustomRate && options.sellerCustomRate > 0) {
    return options.sellerCustomRate;
  }

  return CATEGORY_COMMISSION_RATES[category] ?? options?.defaultRate ?? 12;
}

/**
 * Calculate commission for an order for a specific seller.
 */
export function calculateOrderCommission(
  state: MarketplaceState,
  order: MarketplaceOrder,
  seller: SellerRecord,
  calculatedAt = new Date().toISOString(),
): CommissionRecord[] {
  const commissions: CommissionRecord[] = [];
  order.items
    .filter((item) => item.sellerSlug === seller.slug)
    .forEach((item) => {
      const orderAmount = item.unitPrice * item.quantity;
      const product = state.managedProducts.find((candidate) => candidate.id === item.productId);
      const categorySlug = product?.category ?? "general";
      const categoryRecord = state.managedCategories.find((category) => category.slug === categorySlug);
      const productOverride = product?.commissionRateOverride;
      const commissionRate = getCommissionRateForCategory(categorySlug, {
        categoryRate: categoryRecord?.commissionRate,
        productOverride,
        sellerCustomRate: undefined,
        defaultRate: state.systemSettings.sellerPlatform.defaultCommissionRate,
      });
      const commissionAmount = Number(((orderAmount * commissionRate) / 100).toFixed(2));

      commissions.push({
        id: `comm-${order.id}-${item.id}`,
        orderId: order.id,
        orderItemId: item.id,
        productId: item.productId,
        productTitle: item.title,
        sellerSlug: seller.slug,
        productCategory: categorySlug,
        orderAmount,
        commissionRate,
        commissionAmount,
        feeAmount: 0,
        deductedAmount: Number((orderAmount - commissionAmount).toFixed(2)),
        calculatedAt,
        reason: "ORDER_CONFIRMED",
        isActive: true,
      });
    });

  return commissions;
}

export function buildCommissionRecordsForOrder(
  state: MarketplaceState,
  order: MarketplaceOrder,
  calculatedAt = new Date().toISOString(),
) {
  const sellerSlugs = Array.from(new Set(order.items.map((item) => item.sellerSlug)));

  return sellerSlugs.flatMap((sellerSlug) => {
    const seller = state.sellersDirectory.find((entry) => entry.slug === sellerSlug);

    if (!seller) {
      return [];
    }

    return calculateOrderCommission(state, order, seller, calculatedAt);
  });
}

/**
 * Calculate total commissions for a seller from multiple orders
 */
export function calculateSellerCommissions(
  state: MarketplaceState,
  orders: MarketplaceOrder[],
  seller: SellerRecord
): CommissionRecord[] {
  return orders.flatMap((order) => calculateOrderCommission(state, order, seller));
}

/**
 * Calculate deduction summary for a seller
 */
export function calculateCommissionDeductionSummary(
  commissions: CommissionRecord[]
): CommissionDeductionSummary {
  const byCategory = new Map<string, {
    orderCount: number;
    rate: number;
    amount: number;
  }>();

  let totalOrderAmount = 0;
  let totalCommissionAmount = 0;

  for (const commission of commissions) {
    totalOrderAmount += commission.orderAmount;
    totalCommissionAmount += commission.commissionAmount;

    if (!byCategory.has(commission.productCategory)) {
      byCategory.set(commission.productCategory, {
        orderCount: 0,
        rate: commission.commissionRate,
        amount: 0,
      });
    }

    const catData = byCategory.get(commission.productCategory)!;
    catData.orderCount += 1;
    catData.amount += commission.commissionAmount;
  }

  return {
    totalOrders: commissions.length,
    orderAmount: totalOrderAmount,
    commissionAmount: totalCommissionAmount,
    deductedAmount: totalOrderAmount - totalCommissionAmount,
    averageCommissionRate: totalOrderAmount > 0 ? totalCommissionAmount / totalOrderAmount : 0,
    byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
      category,
      ...data,
    })),
  };
}

/**
 * Create a payout from commissions
 */
export function createPayoutFromCommissions(
  sellerSlug: string,
  sellerId: string,
  commissions: CommissionRecord[],
  orderIds: string[],
  period: "WEEKLY" | "MONTHLY" | "CUSTOM" = "MONTHLY"
): SellerPayout {
  const totalEarnings = commissions.reduce((sum, c) => sum + c.orderAmount, 0);
  const totalCommissionDeducted = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  
  const now = new Date();
  const payoutId = `payout-${sellerSlug}-${now.getTime()}`;

  return {
    id: payoutId,
    sellerSlug,
    sellerId,
    payoutPeriod: period,
    periodStartDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    periodEndDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    totalEarnings,
    totalCommissionDeducted,
    netAmount: totalEarnings - totalCommissionDeducted,
    commissionIds: commissions.map(c => c.id),
    orderIds,
    status: "DRAFT" as PayoutStatus,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Generate seller earnings summary
 */
export function generateSellerEarningsSummary(
  sellerSlug: string,
  commissions: CommissionRecord[],
  payouts: SellerPayout[],
  currentMonth: Date = new Date()
): SellerEarningsSummary {
  const allEarnings = commissions.reduce((sum, c) => sum + c.orderAmount, 0);
  const allCommissions = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const currentMonthCommissions = commissions.filter(c => {
    const calcDate = new Date(c.calculatedAt);
    return calcDate >= monthStart && calcDate <= monthEnd;
  });
  
  const currentMonthEarnings = currentMonthCommissions.reduce((sum, c) => sum + c.orderAmount, 0);
  const currentMonthCommissionDeducted = currentMonthCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  
  const paidPayouts = payouts.filter(p => p.status === "PAID");
  const totalPaidCommissions = paidPayouts.reduce((sum, p) => sum + p.totalCommissionDeducted, 0);
  
  const scheduledPayouts = payouts.filter(p => p.status === "DRAFT" || p.status === "PENDING_APPROVAL");
  const scheduledAmount = scheduledPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  
  const pendingEarnings = allEarnings - allCommissions - (paidPayouts.reduce((sum, p) => sum + p.netAmount, 0) + scheduledAmount);
  
  const nextPayout = scheduledPayouts.sort((a, b) => 
    new Date(a.periodEndDate).getTime() - new Date(b.periodEndDate).getTime()
  )[0];

  return {
    sellerSlug,
    totalEarnings: allEarnings,
    totalComissions: allCommissions,
    pendingEarnings: Math.max(0, pendingEarnings),
    scheduledPayouts: scheduledAmount,
    currentMonthEarnings,
    currentMonthCommissions: currentMonthCommissionDeducted,
    avgCommissionRate: allEarnings > 0 ? allCommissions / allEarnings : 0,
    nextPayoutDate: nextPayout?.periodEndDate,
  };
}

/**
 * Generate commission report for admin dashboard
 */
export function generateCommissionReport(
  allCommissions: CommissionRecord[],
  allPayouts: SellerPayout[],
  sellerMap: Map<string, SellerRecord>
): CommissionReport {
  const totalEarned = allCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const paidPayouts = allPayouts.filter(p => p.status === "PAID");
  const totalPaid = paidPayouts.reduce((sum, p) => sum + p.totalCommissionDeducted, 0);
  const pendingPayouts = allPayouts.filter(p => p.status !== "PAID" && p.status !== "FAILED" && p.status !== "CANCELED");
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.totalCommissionDeducted, 0);

  // Top sellers by commission
  const commissionBySlug = new Map<string, { commission: number; orders: number }>();
  for (const comm of allCommissions) {
    if (!commissionBySlug.has(comm.sellerSlug)) {
      commissionBySlug.set(comm.sellerSlug, { commission: 0, orders: 0 });
    }
    const data = commissionBySlug.get(comm.sellerSlug)!;
    data.commission += comm.commissionAmount;
    data.orders += 1;
  }

  const topSellersByCommission = Array.from(commissionBySlug.entries())
    .map(([slug, data]) => ({
      sellerSlug: slug,
      commissionAmount: data.commission,
      orderCount: data.orders,
    }))
    .sort((a, b) => b.commissionAmount - a.commissionAmount)
    .slice(0, 10);

  // Commission by category
  const commissionByCategory = new Map<string, { commission: number; orders: number }>();
  for (const comm of allCommissions) {
    if (!commissionByCategory.has(comm.productCategory)) {
      commissionByCategory.set(comm.productCategory, { commission: 0, orders: 0 });
    }
    const data = commissionByCategory.get(comm.productCategory)!;
    data.commission += comm.commissionAmount;
    data.orders += 1;
  }

  const byCategory = Array.from(commissionByCategory.entries()).map(([category, data]) => ({
    category,
    totalCommission: data.commission,
    orderCount: data.orders,
    averageRate: data.orders > 0 ? data.commission / data.orders * 100 : 0, // As percentage
  }));

  return {
    totalCommissionEarned: totalEarned,
    totalPayoutsPaid: totalPaid,
    totalPayoutsPending: totalPending,
    activeSellers: commissionBySlug.size,
    topSellersByCommission,
    commissionByCategory: byCategory,
    recentPayouts: paidPayouts.sort((a, b) => 
      new Date(b.paidAt || b.updatedAt).getTime() - new Date(a.paidAt || a.updatedAt).getTime()
    ).slice(0, 10),
    pendingVerifications: 0, // Will be filled by data
  };
}

/**
 * Default payout cycle configuration
 */
export function getDefaultPayoutCycleConfig(): PayoutCycleConfig {
  return {
    period: "MONTHLY",
    enabled: true,
    dayOfMonth: 5, // 5th of each month
    holdingPeriodDays: 0, // settlements become payable once delivery and payment/remittance are confirmed
    minimumPayoutAmount: 1000, // Minimum 1000 PKR
  };
}

/**
 * Check if a payout should be generated for a seller
 */
export function shouldGeneratePayout(
  commissions: CommissionRecord[],
  lastPayout: SellerPayout | undefined,
  config: PayoutCycleConfig
): boolean {
  if (!config.enabled) return false;
  
  if (commissions.length === 0) return false;

  const totalAmount = commissions.reduce((sum, c) => sum + c.deductedAmount, 0);
  if (totalAmount < config.minimumPayoutAmount) return false;

  if (!lastPayout) return true;

  const now = new Date();
  const lastPayoutDate = new Date(lastPayout.periodEndDate);
  const daysDiff = (now.getTime() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24);

  if (config.period === "WEEKLY") {
    return daysDiff >= 7;
  } else if (config.period === "MONTHLY") {
    return daysDiff >= 30;
  }

  return false;
}
