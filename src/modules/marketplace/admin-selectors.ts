import { buildCommissionRecordsForOrder } from "./commission-management";
import { getAdminScopes } from "./permissions";
import { getOrderById, getPaymentById, getUserById } from "./selectors";
import type {
  AdminScope,
  ManagedProduct,
  MarketplaceState,
  MarketplaceUser,
  OrderStatus,
  PaymentStatus,
} from "./types";

export type CommissionLedgerStatus = "PENDING" | "READY" | "PAID" | "CANCELED";

export type CommissionLedgerRow = {
  orderId: string;
  orderNumber: string;
  sellerSlug: string;
  sellerName: string;
  customerName: string;
  createdAt: string;
  productCategory: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerNetAmount: number;
  status: CommissionLedgerStatus;
};

export function getAccessibleAdminScopes(user: MarketplaceUser | undefined) {
  return getAdminScopes(user);
}

export function getSellerRecordBySlug(state: MarketplaceState, slug: string) {
  return state.sellersDirectory.find((seller) => seller.slug === slug);
}

export function getManagedProductById(state: MarketplaceState, productId: string) {
  return state.managedProducts.find((product) => product.id === productId);
}

export function getPendingSellerApprovals(state: MarketplaceState) {
  return state.sellersDirectory.filter((seller) => seller.status === "PENDING_APPROVAL");
}

export function getFlaggedManagedProducts(state: MarketplaceState) {
  return state.managedProducts.filter(
    (product) => product.moderationStatus === "FLAGGED" || product.reviewRequired,
  );
}

export function getLowStockManagedProducts(state: MarketplaceState, threshold = 5) {
  return state.managedProducts
    .map((product) => ({
      product,
      available: state.inventory[product.id]?.available ?? product.stock,
    }))
    .filter(({ available, product }) => available <= threshold && !product.deletedAt)
    .sort((left, right) => left.available - right.available);
}

export function getAdminDashboardSummary(state: MarketplaceState) {
  const totalRevenue = state.orders.reduce((sum, order) => sum + order.totals.total, 0);
  const activeSellers = state.sellersDirectory.filter(
    (seller) => seller.status === "ACTIVE",
  ).length;
  const pendingPayments = state.paymentProofs.filter(
    (proof) => proof.status === "SUBMITTED",
  ).length;
  const commissionSummary = getCommissionSummary(state);
  const flaggedReviews =
    state.managedProductReviews.filter((review) => review.moderationStatus === "FLAGGED").length +
    state.managedStoreReviews.filter((review) => review.moderationStatus === "FLAGGED").length;

  return {
    totalRevenue,
    totalOrders: state.orders.length,
    activeSellers,
    pendingPayments,
    pendingSellerApprovals: getPendingSellerApprovals(state).length,
    flaggedProducts: getFlaggedManagedProducts(state).length,
    lowStockCount: getLowStockManagedProducts(state).length,
    totalUsers: state.users.length,
    activeCoupons: state.coupons.filter((coupon) => coupon.active).length,
    flaggedReviews,
    activeProducts: state.managedProducts.filter(
      (product) => product.moderationStatus === "ACTIVE" && !product.deletedAt,
    ).length,
    platformCommissionRevenue: commissionSummary.totalCommission,
    pendingCommissionRevenue: commissionSummary.pendingCommission,
  };
}

export function getRecentAdminActivity(state: MarketplaceState) {
  return state.auditTrail
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 12)
    .map((entry) => ({
      ...entry,
      actor: getUserById(state, entry.actorUserId),
      order: entry.orderId ? getOrderById(state, entry.orderId) : undefined,
      payment: entry.paymentId ? getPaymentById(state, entry.paymentId) : undefined,
    }));
}

export function getAdminNotifications(state: MarketplaceState, userId?: string) {
  if (!userId) {
    return [];
  }

  return state.notifications
    .filter((notification) => notification.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8);
}

export function getMonthlySalesSeries(state: MarketplaceState) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
      orders: 0,
    };
  });

  state.orders.forEach((order) => {
    const key = order.createdAt.slice(0, 7);
    const month = months.find((entry) => entry.key === key);
    if (!month) {
      return;
    }

    month.revenue += order.totals.total;
    month.orders += 1;
  });

  return months;
}

export function getCatalogGrowthSeries(state: MarketplaceState) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleString("en-US", { month: "short" }),
      newProducts: 0,
      sellerApplications: 0,
    };
  });

  state.managedProducts.forEach((product) => {
    const key = product.createdAt.slice(0, 7);
    const month = months.find((entry) => entry.key === key);
    if (month) {
      month.newProducts += 1;
    }
  });

  state.sellersDirectory.forEach((seller) => {
    const key = seller.createdAt.slice(0, 7);
    const month = months.find((entry) => entry.key === key);
    if (month) {
      month.sellerApplications += 1;
    }
  });

  return months;
}

export function getOrderStatusDistribution(state: MarketplaceState) {
  const distribution = new Map<string, number>();

  state.orders.forEach((order) => {
    distribution.set(order.status, (distribution.get(order.status) ?? 0) + 1);
  });

  return Array.from(distribution.entries()).map(([status, count]) => ({
    status,
    count,
  }));
}

export function getTopCustomers(state: MarketplaceState) {
  const customerTotals = new Map<string, { spend: number; orders: number }>();

  state.orders.forEach((order) => {
    const current = customerTotals.get(order.customerUserId) ?? { spend: 0, orders: 0 };
    current.spend += order.totals.total;
    current.orders += 1;
    customerTotals.set(order.customerUserId, current);
  });

  return Array.from(customerTotals.entries())
    .map(([userId, totals]) => ({
      user: getUserById(state, userId),
      ...totals,
    }))
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 8);
}

export function getProductPerformance(state: MarketplaceState) {
  const totals = new Map<string, { units: number; revenue: number }>();

  state.orders.forEach((order) => {
    order.items.forEach((item) => {
      const current = totals.get(item.productId) ?? { units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.unitPrice * item.quantity;
      totals.set(item.productId, current);
    });
  });

  return state.managedProducts
    .map((product) => ({
      product,
      units: totals.get(product.id)?.units ?? 0,
      revenue: totals.get(product.id)?.revenue ?? 0,
      available: state.inventory[product.id]?.available ?? product.stock,
    }))
    .sort((left, right) => right.revenue - left.revenue);
}

export function getCouponUsageRows(state: MarketplaceState) {
  return state.coupons.map((coupon) => ({
    ...coupon,
    customers: coupon.usedByUserIds.map((userId) => getUserById(state, userId)).filter(Boolean),
  }));
}

export function getUserOrderHistory(state: MarketplaceState, userId: string) {
  return state.orders
    .filter((order) => order.customerUserId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getUserPaymentHistory(state: MarketplaceState, userId: string) {
  const userOrders = new Set(getUserOrderHistory(state, userId).map((order) => order.id));
  return state.payments
    .filter((payment) => userOrders.has(payment.orderId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getUserReviewHistory(state: MarketplaceState, userName: string) {
  return {
    product: state.managedProductReviews.filter((review) =>
      review.author.startsWith(userName.split(" ")[0]),
    ),
    store: state.managedStoreReviews.filter((review) =>
      review.author.startsWith(userName.split(" ")[0]),
    ),
  };
}

export function getOrdersForSellerRecord(state: MarketplaceState, sellerSlug: string) {
  return state.orders.filter((order) => order.items.some((item) => item.sellerSlug === sellerSlug));
}

export function getProductsForSellerRecord(state: MarketplaceState, sellerSlug: string) {
  return state.managedProducts.filter(
    (product) => product.sellerSlug === sellerSlug && !product.deletedAt,
  );
}

export function getSellerRevenue(state: MarketplaceState, sellerSlug: string) {
  return getOrdersForSellerRecord(state, sellerSlug).reduce((sum, order) => {
    const sellerSubtotal = order.items
      .filter((item) => item.sellerSlug === sellerSlug)
      .reduce((total, item) => total + item.unitPrice * item.quantity, 0);
    return sum + sellerSubtotal;
  }, 0);
}

export function getAdminQuickActions(state: MarketplaceState) {
  return [
    {
      label: "Review seller approvals",
      href: "/admin/sellers",
      count: getPendingSellerApprovals(state).length,
    },
    {
      label: "Verify payments",
      href: "/admin/payments",
      count: state.paymentProofs.filter((proof) => proof.status === "SUBMITTED").length,
    },
    {
      label: "Check low stock",
      href: "/admin/inventory",
      count: getLowStockManagedProducts(state).length,
    },
    {
      label: "Moderate reviews",
      href: "/admin/reviews",
      count:
        state.managedProductReviews.filter((review) => review.moderationStatus !== "APPROVED")
          .length +
        state.managedStoreReviews.filter((review) => review.moderationStatus !== "APPROVED").length,
    },
  ];
}

export function getMarketplaceRevenueBySeller(state: MarketplaceState) {
  return state.sellersDirectory
    .map((seller) => ({
      seller,
      revenue: getSellerRevenue(state, seller.slug),
    }))
    .sort((left, right) => right.revenue - left.revenue);
}

function deriveCommissionStatus(
  state: MarketplaceState,
  commissionId: string,
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): CommissionLedgerStatus {
  const linkedPayout = state.sellerPayouts.find(
    (payout) =>
      payout.commissionIds.includes(commissionId) &&
      !["FAILED", "CANCELED"].includes(payout.status),
  );

  if (orderStatus === "CANCELED") {
    return "CANCELED";
  }

  if (linkedPayout?.status === "PAID") {
    return "PAID";
  }

  if (orderStatus === "DELIVERED") {
    return paymentStatus === "PAID" ? "READY" : "PENDING";
  }

  if (paymentStatus === "PAID" || ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(orderStatus)) {
    return "READY";
  }

  return "PENDING";
}

export function getCommissionRows(state: MarketplaceState) {
  const rows: CommissionLedgerRow[] = [];

  state.orders.forEach((order) => {
    const payment = getPaymentById(state, order.paymentId);
    const customer = getUserById(state, order.customerUserId);
    const storedCommissions = state.commissions.filter(
      (commission) => commission.orderId === order.id && commission.isActive,
    );
    const orderCommissions =
      storedCommissions.length > 0
        ? storedCommissions
        : buildCommissionRecordsForOrder(state, order, order.updatedAt);

    orderCommissions.forEach((commission) => {
      const sellerSlug = commission.sellerSlug;
      const seller = state.sellersDirectory.find((item) => item.slug === sellerSlug);

      rows.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerSlug,
        sellerName: seller?.name ?? sellerSlug,
        customerName: customer?.name ?? "Unknown customer",
        createdAt: order.createdAt,
        productCategory: commission.productCategory,
        orderStatus: order.status,
        paymentStatus: payment?.status ?? "PENDING",
        grossAmount: commission.orderAmount,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        sellerNetAmount: commission.deductedAmount,
        status: deriveCommissionStatus(
          state,
          commission.id,
          order.status,
          payment?.status ?? "PENDING",
        ),
      });
    });
  });

  return rows.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getCommissionRowsForSeller(state: MarketplaceState, sellerSlug: string) {
  return getCommissionRows(state).filter((row) => row.sellerSlug === sellerSlug);
}

export function getCommissionRowsForOrder(state: MarketplaceState, orderId: string) {
  return getCommissionRows(state).filter((row) => row.orderId === orderId);
}

export function getCommissionSummary(state: MarketplaceState, sellerSlug?: string) {
  const rows = sellerSlug
    ? getCommissionRowsForSeller(state, sellerSlug)
    : getCommissionRows(state);

  return rows.reduce(
    (summary, row) => {
      summary.totalGross += row.grossAmount;
      summary.totalCommission += row.commissionAmount;
      summary.totalSellerNet += row.sellerNetAmount;
      summary.totalRows += 1;

      if (row.status === "PENDING") {
        summary.pendingCommission += row.commissionAmount;
      }
      if (row.status === "READY") {
        summary.readyCommission += row.commissionAmount;
      }
      if (row.status === "PAID") {
        summary.paidCommission += row.commissionAmount;
      }

      return summary;
    },
    {
      totalGross: 0,
      totalCommission: 0,
      totalSellerNet: 0,
      pendingCommission: 0,
      readyCommission: 0,
      paidCommission: 0,
      totalRows: 0,
    },
  );
}

export function getReviewInsights(state: MarketplaceState) {
  const averageProductRating =
    state.managedProductReviews.reduce((sum, review) => sum + review.rating, 0) /
    (state.managedProductReviews.length || 1);
  const averageStoreRating =
    state.managedStoreReviews.reduce((sum, review) => sum + review.rating, 0) /
    (state.managedStoreReviews.length || 1);

  return {
    averageProductRating,
    averageStoreRating,
    flaggedReviewCount:
      state.managedProductReviews.filter((review) => review.moderationStatus === "FLAGGED").length +
      state.managedStoreReviews.filter((review) => review.moderationStatus === "FLAGGED").length,
    pendingReviewCount:
      state.managedProductReviews.filter((review) => review.moderationStatus === "PENDING").length +
      state.managedStoreReviews.filter((review) => review.moderationStatus === "PENDING").length,
  };
}

export function getScopeLabel(scope: AdminScope) {
  const labels: Record<AdminScope, string> = {
    dashboard: "Dashboard",
    users: "Users",
    sellers: "Sellers",
    products: "Products",
    payments: "Payments",
    orders: "Orders",
    inventory: "Inventory",
    reviews: "Reviews",
    coupons: "Coupons",
    reports: "Reports",
    audit: "Audit Logs",
    settings: "Settings",
    admins: "Admin Roles",
  };

  return labels[scope];
}

export function getOrderInvoiceDetails(state: MarketplaceState, orderId: string) {
  const order = getOrderById(state, orderId);
  if (!order) {
    return undefined;
  }

  const payment = getPaymentById(state, order.paymentId);
  const customer = getUserById(state, order.customerUserId);

  return {
    order,
    payment,
    customer,
    sellerNames: Array.from(
      new Set(
        order.items.map(
          (item) =>
            state.sellersDirectory.find((seller) => seller.slug === item.sellerSlug)?.name ??
            item.sellerSlug,
        ),
      ),
    ),
  };
}

export function getManagedInventoryRows(state: MarketplaceState) {
  return state.managedProducts
    .map((product) => ({
      product,
      inventory: state.inventory[product.id],
    }))
    .filter(
      (row): row is { product: ManagedProduct; inventory: MarketplaceState["inventory"][string] } =>
        !!row.inventory,
    )
    .sort((left, right) => (left.inventory.available ?? 0) - (right.inventory.available ?? 0));
}
