import { formatOrderLifecycleEvent, getSellerFulfillmentForOrder } from "./order-management";
import type {
  AuditEntry,
  CartLine,
  CouponRecord,
  CustomerAccount,
  GuestOrderLookupInput,
  MarketplaceOrder,
  MarketplaceState,
  MarketplaceUser,
  PaymentProof,
} from "./types";

export const GUEST_CART_USER_ID = "guest-session";

export function getCartActorId(user?: MarketplaceUser | null) {
  if (!user) {
    return GUEST_CART_USER_ID;
  }

  return user.role === "CUSTOMER" ? user.id : undefined;
}

export function getUserById(state: MarketplaceState, userId?: string) {
  return state.users.find((user) => user.id === userId);
}

export function getMarketplaceSellerBySlug(state: MarketplaceState, sellerSlug?: string) {
  if (!sellerSlug) {
    return undefined;
  }

  return state.sellersDirectory.find((seller) => seller.slug === sellerSlug);
}

export function getMarketplaceProductById(state: MarketplaceState, productId?: string) {
  if (!productId) {
    return undefined;
  }

  return state.managedProducts.find((product) => product.id === productId);
}

export function getMarketplaceProductBySlug(state: MarketplaceState, slug?: string) {
  if (!slug) {
    return undefined;
  }

  return state.managedProducts.find((product) => product.slug === slug);
}

export function getActiveMarketplaceProducts(state: MarketplaceState) {
  return state.managedProducts.filter(
    (product) => product.moderationStatus === "ACTIVE" && !product.deletedAt,
  );
}

export function getActiveMarketplaceCategories(state: MarketplaceState) {
  const countByCategory = new Map<string, number>();

  getActiveMarketplaceProducts(state).forEach((product) => {
    countByCategory.set(product.category, (countByCategory.get(product.category) ?? 0) + 1);
  });

  return state.managedCategories
    .filter((category) => category.active)
    .map((category) => ({
      ...category,
      productCount: countByCategory.get(category.slug) ?? category.productCount ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getActiveMarketplaceSellers(state: MarketplaceState) {
  const countBySeller = new Map<string, number>();

  getActiveMarketplaceProducts(state).forEach((product) => {
    countBySeller.set(product.sellerSlug, (countBySeller.get(product.sellerSlug) ?? 0) + 1);
  });

  return state.sellersDirectory
    .filter((seller) => seller.status === "ACTIVE" || seller.status === "PENDING_APPROVAL")
    .map((seller) => ({
      ...seller,
      productCount: countBySeller.get(seller.slug) ?? seller.productCount ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getMarketplaceBrands(state: MarketplaceState) {
  const brands = new Map<
    string,
    {
      slug: string;
      name: string;
      productCount: number;
    }
  >();

  getActiveMarketplaceProducts(state).forEach((product) => {
    const slug = product.brand
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const current = brands.get(slug);

    if (current) {
      current.productCount += 1;
      return;
    }

    brands.set(slug, {
      slug,
      name: product.brand,
      productCount: 1,
    });
  });

  return Array.from(brands.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function getCartLines(state: MarketplaceState, userId: string) {
  return state.cartsByUserId[userId] ?? [];
}

export function getCartQuantity(state: MarketplaceState, userId: string) {
  return getCartLines(state, userId).reduce((total, line) => total + line.qty, 0);
}

export function getCartDetailedLines(state: MarketplaceState, userId: string) {
  return getCartLines(state, userId)
    .map((line) => {
      const product = getMarketplaceProductById(state, line.productId);

      if (!product) {
        return null;
      }

      const seller = getMarketplaceSellerBySlug(state, product.sellerSlug);

      if (!seller) {
        return null;
      }

      const availableStock = state.inventory[product.id]?.available ?? product.stock;

      return { line, product, seller, availableStock };
    })
    .filter(Boolean) as {
    line: CartLine;
    product: NonNullable<ReturnType<typeof getMarketplaceProductById>>;
    seller: NonNullable<ReturnType<typeof getMarketplaceSellerBySlug>>;
    availableStock: number;
  }[];
}

export function getCartGroups(state: MarketplaceState, userId: string) {
  const detailedLines = getCartDetailedLines(state, userId);
  const groups = new Map<
    string,
    {
      seller: NonNullable<ReturnType<typeof getMarketplaceSellerBySlug>>;
      items: typeof detailedLines;
    }
  >();

  detailedLines.forEach((item) => {
    const existing = groups.get(item.seller.slug);

    if (existing) {
      existing.items.push(item);
      return;
    }

    groups.set(item.seller.slug, {
      seller: item.seller,
      items: [item],
    });
  });

  return Array.from(groups.values());
}

function normalizeCouponCode(code?: string) {
  return code?.trim().toUpperCase() ?? "";
}

function getCouponByCode(state: MarketplaceState, code?: string) {
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    return undefined;
  }

  return state.coupons.find((coupon) => coupon.code === normalizedCode);
}

function getCartSubtotal(state: MarketplaceState, userId: string) {
  return getCartDetailedLines(state, userId).reduce(
    (sum, item) => sum + item.product.price * item.line.qty,
    0,
  );
}

function getEligibleCouponSubtotal(state: MarketplaceState, userId: string, coupon: CouponRecord) {
  const detailedLines = getCartDetailedLines(state, userId);

  if (coupon.scope === "ORDER") {
    return detailedLines.reduce((sum, item) => sum + item.product.price * item.line.qty, 0);
  }

  const eligibleCategories = new Set(coupon.eligibleCategorySlugs ?? []);

  return detailedLines.reduce((sum, item) => {
    if (!eligibleCategories.has(item.product.category)) {
      return sum;
    }

    return sum + item.product.price * item.line.qty;
  }, 0);
}

function formatEligibleCategoryList(state: MarketplaceState, coupon: CouponRecord) {
  if (!coupon.eligibleCategorySlugs?.length) {
    return "selected categories";
  }

  const categoryNames = coupon.eligibleCategorySlugs.map((slug) => {
    const managedCategory = state.managedCategories.find((category) => category.slug === slug);
    return managedCategory?.name ?? slug;
  });

  return categoryNames.join(", ");
}

export function getCartCouponState(state: MarketplaceState, userId: string, codeOverride?: string) {
  const appliedCode = normalizeCouponCode(codeOverride ?? state.appliedCouponCodesByUserId[userId]);

  if (!appliedCode) {
    return {
      status: "none" as const,
      code: "",
      discount: 0,
      eligibleSubtotal: 0,
    };
  }

  const coupon = getCouponByCode(state, appliedCode);

  if (!coupon) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      discount: 0,
      eligibleSubtotal: 0,
      reason: "This coupon code was not found.",
    };
  }

  if (!coupon.active) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal: 0,
      reason: "This coupon is currently disabled.",
    };
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal: 0,
      reason: "This coupon has expired.",
    };
  }

  if (coupon.usageCount >= coupon.usageLimit) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal: 0,
      reason: "This coupon has reached its usage limit.",
    };
  }

  if (coupon.usedByUserIds.includes(userId)) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal: 0,
      reason: "You have already redeemed this coupon.",
    };
  }

  const subtotal = getCartSubtotal(state, userId);
  const eligibleSubtotal = getEligibleCouponSubtotal(state, userId, coupon);

  if (subtotal <= 0) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal,
      reason: "Add items to your cart before applying a coupon.",
    };
  }

  if (subtotal < coupon.minOrderAmount) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal,
      reason: `Order subtotal must reach ${coupon.minOrderAmount.toLocaleString("en-PK")} PKR.`,
    };
  }

  if (eligibleSubtotal <= 0) {
    return {
      status: "invalid" as const,
      code: appliedCode,
      coupon,
      discount: 0,
      eligibleSubtotal,
      reason:
        coupon.scope === "CATEGORY"
          ? `This coupon only applies to ${formatEligibleCategoryList(state, coupon)}.`
          : "This coupon does not apply to the current cart.",
    };
  }

  const rawDiscount =
    coupon.type === "FIXED" ? coupon.value : Math.round((eligibleSubtotal * coupon.value) / 100);
  const discount = Math.min(
    rawDiscount,
    eligibleSubtotal,
    coupon.maxDiscountAmount ?? Number.POSITIVE_INFINITY,
  );

  return {
    status: "applied" as const,
    code: appliedCode,
    coupon,
    discount,
    eligibleSubtotal,
    message:
      coupon.type === "PERCENTAGE"
        ? `${coupon.value}% coupon applied successfully.`
        : `${coupon.value.toLocaleString("en-PK")} PKR coupon applied successfully.`,
  };
}

export function getCouponDiscoveryRows(state: MarketplaceState, userId: string) {
  return state.coupons
    .map((coupon) => {
      const result = getCartCouponState(state, userId, coupon.code);
      const isApplied =
        result.status === "applied" &&
        normalizeCouponCode(state.appliedCouponCodesByUserId[userId]) === coupon.code;

      return {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        scope: coupon.scope,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        eligibleCategorySlugs: coupon.eligibleCategorySlugs ?? [],
        maxDiscountAmount: coupon.maxDiscountAmount,
        canApply: result.status === "applied",
        isApplied,
        discountPreview: result.status === "applied" ? result.discount : 0,
        helper:
          result.status === "applied"
            ? result.message
            : result.status === "invalid"
              ? result.reason
              : "Enter this code to apply it at checkout.",
      };
    })
    .filter((coupon) => {
      const original = state.coupons.find((entry) => entry.id === coupon.id);

      if (!original) {
        return false;
      }

      return original.active && new Date(original.expiresAt).getTime() >= Date.now();
    })
    .sort((left, right) => {
      if (left.isApplied !== right.isApplied) {
        return left.isApplied ? -1 : 1;
      }

      if (left.canApply !== right.canApply) {
        return left.canApply ? -1 : 1;
      }

      return right.discountPreview - left.discountPreview;
    });
}

export function getCartTotals(
  state: MarketplaceState,
  userId: string,
  shippingBySeller: Record<string, number> = {},
) {
  const groups = getCartGroups(state, userId);
  const subtotal = groups.reduce(
    (sum, group) =>
      sum +
      group.items.reduce((groupTotal, item) => groupTotal + item.product.price * item.line.qty, 0),
    0,
  );

  const shipping = groups.reduce((sum, group) => {
    if (shippingBySeller[group.seller.slug] !== undefined) {
      return sum + shippingBySeller[group.seller.slug];
    }

    return sum + state.systemSettings.shipping.standardRate;
  }, 0);

  const couponState = getCartCouponState(state, userId);
  const discount = couponState.status === "applied" ? couponState.discount : 0;
  const shippingThreshold = state.systemSettings.shipping.freeShippingThreshold;
  const discountedShipping = subtotal > shippingThreshold ? 0 : shipping;

  return {
    subtotal,
    discount,
    shipping: discountedShipping,
    total: Math.max(0, subtotal - discount + discountedShipping),
    appliedCoupon: couponState.status === "applied" ? couponState.coupon : undefined,
    appliedCouponCode: couponState.code,
    invalidCouponReason: couponState.status === "invalid" ? couponState.reason : undefined,
  };
}

export function getOrdersForCustomer(state: MarketplaceState, userId: string) {
  return state.orders
    .filter((order) => order.customerUserId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function canUserReviewProduct(
  state: MarketplaceState,
  userId: string | undefined,
  productId: string,
) {
  if (!userId) {
    return false;
  }

  return state.orders.some(
    (order) =>
      order.customerUserId === userId &&
      order.status === "DELIVERED" &&
      order.items.some((item) => item.productId === productId),
  );
}

export function canUserReviewStore(
  state: MarketplaceState,
  userId: string | undefined,
  sellerSlug: string,
) {
  if (!userId) {
    return false;
  }

  return state.orders.some(
    (order) =>
      order.customerUserId === userId &&
      order.status === "DELIVERED" &&
      order.items.some((item) => item.sellerSlug === sellerSlug),
  );
}

export function getCustomerAccount(state: MarketplaceState, userId?: string) {
  if (!userId) {
    return undefined;
  }

  return state.customerAccounts[userId];
}

export function getCustomerDefaultAddress(state: MarketplaceState, userId?: string) {
  const account = getCustomerAccount(state, userId);

  return account?.addresses.find((address) => address.isDefault) ?? account?.addresses[0];
}

export function getWishlistProducts(state: MarketplaceState, userId?: string) {
  const account = getCustomerAccount(state, userId);

  if (!account) {
    return [];
  }

  return account.wishlistProductIds
    .map((productId) => getMarketplaceProductById(state, productId))
    .filter(Boolean) as NonNullable<ReturnType<typeof getMarketplaceProductById>>[];
}

export function getOrdersForSeller(state: MarketplaceState, sellerSlug?: string) {
  if (!sellerSlug) {
    return [];
  }

  return state.orders
    .filter((order) => order.items.some((item) => item.sellerSlug === sellerSlug))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getPaymentById(state: MarketplaceState, paymentId: string) {
  return state.payments.find((payment) => payment.id === paymentId);
}

export function getOrderById(state: MarketplaceState, orderId: string) {
  return state.orders.find((order) => order.id === orderId);
}

function normalizeLookupValue(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, "") ?? "";
}

export function lookupOrderByReference(state: MarketplaceState, input: GuestOrderLookupInput) {
  const normalizedOrderNumber = input.orderNumber.trim().toUpperCase();
  const normalizedContact = normalizeLookupValue(input.contact);

  if (!normalizedOrderNumber || !normalizedContact) {
    return undefined;
  }

  const order = state.orders.find(
    (entry) => entry.orderNumber.trim().toUpperCase() === normalizedOrderNumber,
  );

  if (!order) {
    return undefined;
  }

  const customer = getUserById(state, order.customerUserId);
  const contactMatches = [
    order.shippingAddress.phone,
    order.customerEmail,
    customer?.phone,
    customer?.email,
  ].some((candidate) => normalizeLookupValue(candidate) === normalizedContact);

  return contactMatches ? order : undefined;
}

export function getProofById(state: MarketplaceState, proofId?: string | null) {
  return state.paymentProofs.find((proof) => proof.id === proofId);
}

export function getProofAttemptsForOrder(state: MarketplaceState, orderId: string) {
  return state.paymentProofs
    .filter((proof) => proof.orderId === orderId)
    .sort((left, right) => right.attemptNumber - left.attemptNumber);
}

export function getLatestProofForOrder(state: MarketplaceState, orderId: string) {
  return getProofAttemptsForOrder(state, orderId)[0];
}

export function getNotificationsForUser(state: MarketplaceState, userId: string) {
  return state.notifications
    .filter((notification) => notification.userId === userId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getUnreadNotificationsForUser(state: MarketplaceState, userId: string) {
  return getNotificationsForUser(state, userId).filter((notification) => !notification.readAt);
}

export function getAuditEntriesForOrder(state: MarketplaceState, orderId: string) {
  return state.auditTrail
    .filter((entry) => entry.orderId === orderId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getSellerFulfillmentAuditEntries(
  state: MarketplaceState,
  orderId: string,
  sellerSlug?: string,
) {
  if (!sellerSlug) {
    return [] as AuditEntry[];
  }

  return getAuditEntriesForOrder(state, orderId).filter((entry) =>
    entry.note?.toLowerCase().includes(sellerSlug.toLowerCase()),
  );
}

export function getOrderTimeline(state: MarketplaceState, orderId: string) {
  return getAuditEntriesForOrder(state, orderId)
    .map((entry) => {
      const actor = getUserById(state, entry.actorUserId);
      const formatted = formatOrderLifecycleEvent(entry, actor?.name);

      if (!formatted) return null; // Filter out ignored events

      return {
        id: entry.id,
        createdAt: entry.createdAt,
        title: formatted.title,
        detail: formatted.detail,
        action: entry.action,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        category: formatted.category,
      };
    })
    .filter((item) => item !== null);
}

export function getSellerOrderView(
  state: MarketplaceState,
  order: MarketplaceOrder,
  sellerSlug?: string,
) {
  const fulfillment = getSellerFulfillmentForOrder(order, sellerSlug);

  return {
    fulfillment,
    sellerItems: sellerSlug
      ? order.items.filter((item) => item.sellerSlug === sellerSlug)
      : order.items,
    sellerSelection: sellerSlug
      ? order.sellerShippingSelections.find((selection) => selection.sellerSlug === sellerSlug)
      : undefined,
  };
}

export function getPendingProofs(state: MarketplaceState) {
  return state.paymentProofs
    .filter((proof) => proof.status === "SUBMITTED")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getInventoryForProduct(state: MarketplaceState, productId: string) {
  return state.inventory[productId]?.available ?? 0;
}

export function getRoleHomePath(user: MarketplaceUser | undefined) {
  if (!user) {
    return "/login";
  }

  switch (user.role) {
    case "CUSTOMER":
      return "/account";
    case "SELLER":
      return "/seller/orders";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}

export function getVisibleProofForOrder(state: MarketplaceState, order: MarketplaceOrder) {
  const payment = getPaymentById(state, order.paymentId);

  if (!payment?.activeProofId) {
    return undefined;
  }

  return getProofById(state, payment.activeProofId);
}

export function getOrderCustomer(state: MarketplaceState, order: MarketplaceOrder) {
  return getUserById(state, order.customerUserId);
}

export function getProofCustomer(state: MarketplaceState, proof: PaymentProof) {
  return getUserById(state, proof.submittedByUserId);
}

export function getCustomerStats(state: MarketplaceState, userId?: string) {
  const orders = userId ? getOrdersForCustomer(state, userId) : [];
  const account = getCustomerAccount(state, userId);

  return {
    orderCount: orders.length,
    activeOrderCount: orders.filter((order) =>
      ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status),
    ).length,
    addressCount: account?.addresses.length ?? 0,
    vehicleCount: account?.savedVehicles.length ?? 0,
    wishlistCount: account?.wishlistProductIds.length ?? 0,
    unreadNotificationCount: userId ? getUnreadNotificationsForUser(state, userId).length : 0,
  };
}
