import { isHostedImageReference } from "@/modules/uploads/shared";
import { createOrRefreshOrderCommissions, reconcileScheduledPayouts } from "./financials";
import { canAccessAdminScope } from "./permissions";
import {
  buildPayoutFromSettlements,
  createOrRefreshSettlementEntries,
  getEligibleSettlementsForSeller,
  updateSettlementStatusesForPayout,
} from "./settlements";
import type {
  AdminScope,
  AdminUserInput,
  AuditAction,
  CODRemittanceReviewInput,
  CouponInput,
  InventoryAdjustmentInput,
  ManagedCategoryInput,
  ManagedProductInput,
  MarketplaceState,
  MarketplaceUser,
  PayoutStatus,
  ReviewModerationInput,
  SellerRecordInput,
  SellerPayoutAccountReviewInput,
  SellerPayout,
  SellerSettlementBatchInput,
  SystemSettings,
} from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getActorWithScope(state: MarketplaceState, actorUserId: string, scope: AdminScope) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Admin user not found.");
  assert(canAccessAdminScope(actor, scope), "You do not have access to this admin section.");
  return actor;
}

function assertSuperAdmin(actor: MarketplaceUser, message: string) {
  assert(actor.role === "SUPER_ADMIN", message);
}

function createAuditEntry(input: {
  action: AuditAction;
  actorUserId: string;
  actorRole: MarketplaceUser["role"];
  orderId?: string;
  paymentId?: string;
  proofId?: string;
  productId?: string;
  note?: string;
  fromStatus?: string;
  toStatus?: string;
  createdAt: string;
}) {
  return {
    id: createId("audit"),
    ...input,
  };
}

function createNotification(input: {
  userId: string;
  type: MarketplaceState["notifications"][number]["type"];
  title: string;
  message: string;
  createdAt: string;
  orderId?: string;
  paymentId?: string;
  proofId?: string;
}) {
  return {
    id: createId("notification"),
    ...input,
  };
}

function appendArtifacts(
  state: MarketplaceState,
  input: {
    auditTrail?: MarketplaceState["auditTrail"];
    notifications?: MarketplaceState["notifications"];
    inventoryMovements?: MarketplaceState["inventoryMovements"];
  },
) {
  return {
    ...state,
    auditTrail: input.auditTrail ? [...state.auditTrail, ...input.auditTrail] : state.auditTrail,
    notifications: input.notifications
      ? [...state.notifications, ...input.notifications]
      : state.notifications,
    inventoryMovements: input.inventoryMovements
      ? [...state.inventoryMovements, ...input.inventoryMovements]
      : state.inventoryMovements,
  };
}

function ensureUniqueEmail(state: MarketplaceState, email: string, currentUserId?: string) {
  const normalized = email.trim().toLowerCase();
  const duplicate = state.users.find(
    (user) => user.email.toLowerCase() === normalized && user.id !== currentUserId,
  );
  assert(!duplicate, "A user with this email already exists.");
}

export function saveUserRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: AdminUserInput,
) {
  const scope = input.role === "ADMIN" || input.role === "SUPER_ADMIN" ? "admins" : "users";
  const actor = getActorWithScope(state, actorUserId, scope);
  const createdAt = nowIso();
  const email = input.email.trim();
  ensureUniqueEmail(state, email, input.id);

  const existing = input.id ? state.users.find((user) => user.id === input.id) : undefined;
  const userId = input.id ?? createId("user");

  if (
    input.role === "ADMIN" ||
    input.role === "SUPER_ADMIN" ||
    existing?.role === "ADMIN" ||
    existing?.role === "SUPER_ADMIN"
  ) {
    assertSuperAdmin(actor, "Only a super admin can manage admin accounts.");
  }

  const nextUser = {
    id: userId,
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    role: input.role,
    status: input.status,
    createdAt: existing?.createdAt ?? input.createdAt ?? createdAt,
    lastLoginAt: input.lastLoginAt ?? existing?.lastLoginAt,
    sellerSlug: input.sellerSlug?.trim() || undefined,
    adminTitle: input.adminTitle?.trim() || undefined,
    adminScopes:
      input.role === "ADMIN" ? (input.adminScopes ?? existing?.adminScopes ?? []) : undefined,
  };

  assert(nextUser.name.length >= 2, "User name is required.");
  assert(nextUser.phone.length >= 8, "Valid phone number is required.");

  let nextState: MarketplaceState = {
    ...state,
    users: existing
      ? state.users.map((user) => (user.id === userId ? nextUser : user))
      : [...state.users, nextUser],
    cartsByUserId: state.cartsByUserId[userId]
      ? state.cartsByUserId
      : {
          ...state.cartsByUserId,
          [userId]: [],
        },
  };

  if (nextUser.role === "CUSTOMER" && !nextState.customerAccounts[userId]) {
    nextState = {
      ...nextState,
      customerAccounts: {
        ...nextState.customerAccounts,
        [userId]: {
          userId,
          city: "Karachi",
          joinedAt: nextUser.createdAt.slice(0, 10),
          addresses: [],
          savedVehicles: [],
          wishlistProductIds: [],
          preferences: {
            orderEmailUpdates: true,
            promotions: false,
            priceAlerts: true,
            smsAlerts: false,
            loginAlerts: true,
            twoFactorEnabled: false,
          },
        },
      },
    };
  }

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: existing ? "USER_UPDATED" : "USER_CREATED",
        actorUserId,
        actorRole: actor.role,
        note: `${nextUser.name} (${nextUser.role}) ${existing ? "updated" : "created"}.`,
        createdAt,
      }),
      ...(nextUser.role === "ADMIN" || nextUser.role === "SUPER_ADMIN"
        ? [
            createAuditEntry({
              action: "ADMIN_ROLE_UPDATED",
              actorUserId,
              actorRole: actor.role,
              note: `Admin role permissions updated for ${nextUser.name}.`,
              createdAt,
            }),
          ]
        : []),
    ],
  });
}

export function deleteUserRecord(
  state: MarketplaceState,
  actorUserId: string,
  targetUserId: string,
) {
  const actor = getActorWithScope(state, actorUserId, "users");
  assert(targetUserId !== actorUserId, "You cannot delete your active session.");

  const targetUser = state.users.find((user) => user.id === targetUserId);
  assert(targetUser, "User not found.");

  if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") {
    assertSuperAdmin(actor, "Only a super admin can delete admin accounts.");
  }

  const customerOrders = state.orders.some((order) => order.customerUserId === targetUserId);
  const submittedProofs = state.paymentProofs.some(
    (proof) => proof.submittedByUserId === targetUserId,
  );
  const ownsSellerRecord = state.sellersDirectory.some(
    (seller) => seller.ownerUserId === targetUserId,
  );
  assert(
    !customerOrders && !submittedProofs && !ownsSellerRecord,
    "This user has marketplace activity and cannot be deleted.",
  );

  const createdAt = nowIso();
  const nextState: MarketplaceState = {
    ...state,
    users: state.users.filter((user) => user.id !== targetUserId),
    customerAccounts: Object.fromEntries(
      Object.entries(state.customerAccounts).filter(([userId]) => userId !== targetUserId),
    ),
    cartsByUserId: Object.fromEntries(
      Object.entries(state.cartsByUserId).filter(([userId]) => userId !== targetUserId),
    ),
  };

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "USER_DELETED",
        actorUserId,
        actorRole: actor.role,
        note: `${targetUser.name} was deleted from marketplace access.`,
        createdAt,
      }),
    ],
  });
}

export function saveSellerRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: SellerRecordInput,
) {
  const actor = getActorWithScope(state, actorUserId, "sellers");
  const createdAt = nowIso();
  const existing = state.sellersDirectory.find((seller) => seller.slug === input.slug);
  assert(existing, "Seller record was not found.");

  const statusChanged = existing.status !== input.status;
  const nextRecord = {
    ...existing,
    ...input,
    approvalNote: input.approvalNote?.trim() || undefined,
    flaggedReason: input.flaggedReason?.trim() || undefined,
    approvedAt:
      statusChanged && input.status === "ACTIVE"
        ? createdAt
        : (input.approvedAt ?? existing.approvedAt),
    approvedByUserId:
      statusChanged && input.status === "ACTIVE"
        ? actorUserId
        : (input.approvedByUserId ?? existing.approvedByUserId),
    updatedAt: createdAt,
  };

  if (actor.role !== "SUPER_ADMIN") {
    assert(nextRecord.tier === existing.tier, "Only a super admin can change seller tiers.");
    assert(
      nextRecord.commissionRate === existing.commissionRate,
      "Only a super admin can change commission rates.",
    );
    assert(
      nextRecord.payoutHold === existing.payoutHold,
      "Only a super admin can manage payout holds.",
    );
    assert(
      JSON.stringify(nextRecord.permissions) === JSON.stringify(existing.permissions),
      "Only a super admin can change seller permission profiles.",
    );
  }

  let nextState: MarketplaceState = {
    ...state,
    sellersDirectory: state.sellersDirectory.map((seller) =>
      seller.slug === input.slug ? nextRecord : seller,
    ),
  };

  const notifications: MarketplaceState["notifications"] = [];

  if (nextRecord.ownerUserId && statusChanged) {
    notifications.push(
      createNotification({
        userId: nextRecord.ownerUserId,
        type: "ORDER_CONFIRMED",
        title: `Seller status: ${nextRecord.status.replaceAll("_", " ")}`,
        message: `${nextRecord.name} is now marked as ${nextRecord.status.replaceAll("_", " ").toLowerCase()}.`,
        createdAt,
      }),
    );
  }

  nextState = appendArtifacts(nextState, {
    notifications,
    auditTrail: [
      createAuditEntry({
        action: statusChanged ? "SELLER_STATUS_CHANGED" : "SELLER_UPDATED",
        actorUserId,
        actorRole: actor.role,
        note: `${nextRecord.name} updated with status ${nextRecord.status}.`,
        createdAt,
        fromStatus: existing.status,
        toStatus: nextRecord.status,
      }),
      ...(existing.commissionRate !== nextRecord.commissionRate
        ? [
            createAuditEntry({
              action: "COMMISSION_RATE_UPDATED",
              actorUserId,
              actorRole: actor.role,
              note: `${nextRecord.name} commission rate changed from ${existing.commissionRate}% to ${nextRecord.commissionRate}%.`,
              createdAt,
            }),
          ]
        : []),
    ],
  });

  return nextState;
}

export function saveManagedCategoryRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: ManagedCategoryInput,
) {
  const actor = getActorWithScope(state, actorUserId, "products");
  const createdAt = nowIso();
  const slug = input.slug?.trim() || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const existing = state.managedCategories.find((category) => category.slug === slug);

  const nextCategory = {
    slug,
    name: input.name.trim(),
    icon: input.icon.trim() || "Cog",
    description: input.description.trim(),
    productCount: input.productCount,
    active: input.active,
    commissionRate: Number(input.commissionRate) || 0,
    createdAt: existing?.createdAt ?? input.createdAt ?? createdAt,
    updatedAt: createdAt,
  };

  assert(nextCategory.name.length >= 2, "Category name is required.");
  assert(
    nextCategory.commissionRate >= 0 && nextCategory.commissionRate <= 100,
    "Commission rate must be between 0 and 100 percent.",
  );

  const nextState: MarketplaceState = {
    ...state,
    managedCategories: existing
      ? state.managedCategories.map((category) =>
          category.slug === slug ? nextCategory : category,
        )
      : [...state.managedCategories, nextCategory],
  };

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "CATEGORY_SAVED",
        actorUserId,
        actorRole: actor.role,
        note: `${nextCategory.name} ${existing ? "updated" : "created"}.`,
        createdAt,
      }),
    ],
  });
}

export function deleteManagedCategoryRecord(
  state: MarketplaceState,
  actorUserId: string,
  slug: string,
) {
  const actor = getActorWithScope(state, actorUserId, "products");
  const category = state.managedCategories.find((item) => item.slug === slug);
  assert(category, "Category not found.");

  const hasProducts = state.managedProducts.some(
    (product) => product.category === slug && !product.deletedAt,
  );
  assert(!hasProducts, "Reassign or remove products from this category before deleting it.");

  const createdAt = nowIso();
  const nextState: MarketplaceState = {
    ...state,
    managedCategories: state.managedCategories.filter((item) => item.slug !== slug),
  };

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "CATEGORY_DELETED",
        actorUserId,
        actorRole: actor.role,
        note: `${category.name} deleted from category management.`,
        createdAt,
      }),
    ],
  });
}

export function saveManagedProductRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: ManagedProductInput,
) {
  const actor = getActorWithScope(state, actorUserId, "products");
  const createdAt = nowIso();
  const existing = input.id
    ? state.managedProducts.find((product) => product.id === input.id)
    : undefined;
  const productId = input.id ?? createId("product");
  const categoryExists = state.managedCategories.some(
    (category) => category.slug === input.category,
  );
  assert(categoryExists, "Selected category does not exist.");
  assert(input.images.length > 0, "At least one image is required.");
  input.images.forEach((imageUrl) => {
    assert(isHostedImageReference(imageUrl), "Each product image must be a valid uploaded image.");
  });
  assert(input.title.trim().length >= 3, "Product title is required.");
  assert(input.sku.trim().length >= 3, "SKU is required.");
  assert(input.price > 0, "Product price must be greater than zero.");
  if (input.commissionRateOverride !== undefined) {
    assert(
      input.commissionRateOverride >= 0 && input.commissionRateOverride <= 100,
      "Commission override must be between 0 and 100 percent.",
    );
  }

  const nextProduct = {
    ...input,
    id: productId,
    title: input.title.trim(),
    slug: input.slug.trim() || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    sku: input.sku.trim(),
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    commissionRateOverride:
      input.commissionRateOverride && input.commissionRateOverride > 0
        ? input.commissionRateOverride
        : undefined,
    createdAt: existing?.createdAt ?? input.createdAt ?? createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };

  const nextState: MarketplaceState = {
    ...state,
    managedProducts: existing
      ? state.managedProducts.map((product) => (product.id === productId ? nextProduct : product))
      : [...state.managedProducts, nextProduct],
    inventory: {
      ...state.inventory,
      [productId]: {
        productId,
        available: input.stock,
        updatedAt: createdAt,
      },
    },
  };

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "PRODUCT_SAVED",
        actorUserId,
        actorRole: actor.role,
        productId,
        note: `${nextProduct.title} ${existing ? "updated" : "created"}.`,
        createdAt,
      }),
    ],
  });
}

export function deleteManagedProductRecord(
  state: MarketplaceState,
  actorUserId: string,
  productId: string,
) {
  const actor = getActorWithScope(state, actorUserId, "products");
  const product = state.managedProducts.find((item) => item.id === productId);
  assert(product, "Product not found.");

  const createdAt = nowIso();
  const nextState: MarketplaceState = {
    ...state,
    managedProducts: state.managedProducts.map((item) =>
      item.id === productId
        ? {
            ...item,
            moderationStatus: "INACTIVE",
            deletedAt: createdAt,
            updatedAt: createdAt,
          }
        : item,
    ),
    inventory: {
      ...state.inventory,
      [productId]: {
        productId,
        available: 0,
        updatedAt: createdAt,
      },
    },
  };

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "PRODUCT_DELETED",
        actorUserId,
        actorRole: actor.role,
        productId,
        note: `${product.title} archived from product management.`,
        createdAt,
      }),
    ],
  });
}

export function moderateManagedReview(
  state: MarketplaceState,
  actorUserId: string,
  input: ReviewModerationInput,
) {
  const actor = getActorWithScope(state, actorUserId, "reviews");
  const createdAt = nowIso();

  if (input.kind === "product") {
    const existing = state.managedProductReviews.find((review) => review.id === input.reviewId);
    assert(existing, "Product review not found.");

    return appendArtifacts(
      {
        ...state,
        managedProductReviews: state.managedProductReviews.map((review) =>
          review.id === input.reviewId
            ? {
                ...review,
                moderationStatus: input.status,
                moderatedAt: createdAt,
                moderatedByUserId: actorUserId,
                moderatorNote: input.moderatorNote?.trim() || undefined,
              }
            : review,
        ),
      },
      {
        notifications: existing.userId
          ? [
              createNotification({
                userId: existing.userId,
                type: input.status === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
                title:
                  input.status === "APPROVED"
                    ? "Product review approved"
                    : "Product review updated",
                message:
                  input.status === "APPROVED"
                    ? `Your review for ${existing.title} is now live.`
                    : `Your product review was marked ${input.status.toLowerCase()}.`,
                orderId: existing.orderId,
                createdAt,
              }),
            ]
          : undefined,
        auditTrail: [
          createAuditEntry({
            action: "REVIEW_MODERATED",
            actorUserId,
            actorRole: actor.role,
            productId: existing.productId,
            note: `Product review ${existing.id} marked as ${input.status.toLowerCase()}.`,
            createdAt,
          }),
        ],
      },
    );
  }

  const existing = state.managedStoreReviews.find((review) => review.id === input.reviewId);
  assert(existing, "Store review not found.");

  return appendArtifacts(
    {
      ...state,
      managedStoreReviews: state.managedStoreReviews.map((review) =>
        review.id === input.reviewId
          ? {
              ...review,
              moderationStatus: input.status,
              moderatedAt: createdAt,
              moderatedByUserId: actorUserId,
              moderatorNote: input.moderatorNote?.trim() || undefined,
            }
          : review,
      ),
    },
    {
      notifications: existing.userId
        ? [
            createNotification({
              userId: existing.userId,
              type: input.status === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
              title: input.status === "APPROVED" ? "Store review approved" : "Store review updated",
              message:
                input.status === "APPROVED"
                  ? "Your store review is now visible on SpareKart."
                  : `Your store review was marked ${input.status.toLowerCase()}.`,
              orderId: existing.orderId,
              createdAt,
            }),
          ]
        : undefined,
      auditTrail: [
        createAuditEntry({
          action: "REVIEW_MODERATED",
          actorUserId,
          actorRole: actor.role,
          note: `Store review ${existing.id} marked as ${input.status.toLowerCase()}.`,
          createdAt,
        }),
      ],
    },
  );
}

export function saveCouponRecord(state: MarketplaceState, actorUserId: string, input: CouponInput) {
  const actor = getActorWithScope(state, actorUserId, "coupons");
  const createdAt = nowIso();
  const existing = input.id ? state.coupons.find((coupon) => coupon.id === input.id) : undefined;
  const normalizedCode = input.code.trim().toUpperCase();
  const duplicate = state.coupons.find(
    (coupon) => coupon.code === normalizedCode && coupon.id !== input.id,
  );
  assert(!duplicate, "Coupon code already exists.");
  assert(input.description.trim().length >= 6, "Coupon description should be descriptive.");
  assert(input.value > 0, "Coupon value must be greater than zero.");
  assert(input.usageLimit > 0, "Usage limit must be at least 1.");
  assert(input.minOrderAmount >= 0, "Minimum order amount cannot be negative.");
  assert(input.type === "FIXED" || input.value <= 100, "Percentage coupons cannot exceed 100%.");
  assert(
    !input.maxDiscountAmount || input.maxDiscountAmount > 0,
    "Maximum discount must be greater than zero.",
  );
  assert(
    input.scope !== "CATEGORY" || (input.eligibleCategorySlugs?.length ?? 0) > 0,
    "Choose at least one eligible category for category-based coupons.",
  );

  const nextCoupon = {
    id: input.id ?? createId("coupon"),
    code: normalizedCode,
    description: input.description.trim(),
    type: input.type,
    scope: input.scope,
    value: input.value,
    maxDiscountAmount: input.maxDiscountAmount,
    minOrderAmount: input.minOrderAmount,
    usageLimit: input.usageLimit,
    usageCount: input.usageCount ?? existing?.usageCount ?? 0,
    active: input.active,
    expiresAt: input.expiresAt,
    createdAt: existing?.createdAt ?? input.createdAt ?? createdAt,
    usedByUserIds: input.usedByUserIds ?? existing?.usedByUserIds ?? [],
    eligibleCategorySlugs:
      input.scope === "CATEGORY" ? (input.eligibleCategorySlugs ?? []) : undefined,
  };

  const nextState: MarketplaceState = {
    ...state,
    coupons: existing
      ? state.coupons.map((coupon) => (coupon.id === nextCoupon.id ? nextCoupon : coupon))
      : [...state.coupons, nextCoupon],
  };

  return appendArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "COUPON_SAVED",
        actorUserId,
        actorRole: actor.role,
        note: `${nextCoupon.code} ${existing ? "updated" : "created"}.`,
        createdAt,
      }),
    ],
  });
}

export function deleteCouponRecord(state: MarketplaceState, actorUserId: string, couponId: string) {
  const actor = getActorWithScope(state, actorUserId, "coupons");
  const coupon = state.coupons.find((item) => item.id === couponId);
  assert(coupon, "Coupon not found.");

  const createdAt = nowIso();
  return appendArtifacts(
    {
      ...state,
      coupons: state.coupons.filter((item) => item.id !== couponId),
    },
    {
      auditTrail: [
        createAuditEntry({
          action: "COUPON_DELETED",
          actorUserId,
          actorRole: actor.role,
          note: `${coupon.code} removed from coupon management.`,
          createdAt,
        }),
      ],
    },
  );
}

export function adjustInventoryRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: InventoryAdjustmentInput,
) {
  const actor = getActorWithScope(state, actorUserId, "inventory");
  const createdAt = nowIso();
  const current = state.inventory[input.productId];
  assert(current, "Inventory record not found.");

  const nextAvailable = Math.max(0, current.available + input.quantityDelta);
  const product = state.managedProducts.find((item) => item.id === input.productId);

  const nextState: MarketplaceState = {
    ...state,
    inventory: {
      ...state.inventory,
      [input.productId]: {
        ...current,
        available: nextAvailable,
        updatedAt: createdAt,
      },
    },
    managedProducts: state.managedProducts.map((item) =>
      item.id === input.productId
        ? {
            ...item,
            stock: nextAvailable,
            updatedAt: createdAt,
          }
        : item,
    ),
  };

  return appendArtifacts(nextState, {
    inventoryMovements: [
      {
        id: createId("inventory"),
        productId: input.productId,
        orderId: "manual-adjustment",
        quantityDelta: input.quantityDelta,
        reason: "MANUAL_ADJUSTMENT",
        actorUserId,
        beforeQty: current.available,
        afterQty: nextAvailable,
        createdAt,
      },
    ],
    auditTrail: [
      createAuditEntry({
        action: "INVENTORY_ADJUSTED",
        actorUserId,
        actorRole: actor.role,
        productId: input.productId,
        note: `${product?.title ?? input.productId} inventory adjusted by ${input.quantityDelta}. ${input.note ?? ""}`.trim(),
        createdAt,
      }),
    ],
  });
}

export function createSellerPayoutBatchRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: SellerSettlementBatchInput,
) {
  const actor = getActorWithScope(state, actorUserId, "reports");
  const seller = state.sellersDirectory.find((entry) => entry.slug === input.sellerSlug);
  assert(seller, "Seller record not found.");
  assert(!seller.payoutHold, "Seller payouts are currently on hold.");
  assert(seller.payoutAccount, "Seller payout account details are missing.");
  assert(
    seller.payoutAccount.status === "VERIFIED",
    "Seller payout account must be verified before batching settlements.",
  );
  assert(
    !state.sellerPayouts.some(
      (payout) =>
        payout.sellerSlug === seller.slug &&
        [
          "DRAFT",
          "PENDING_APPROVAL",
          "APPROVED",
          "PROCESSING",
          "HELD",
          "PENDING",
          "SCHEDULED",
        ].includes(payout.status),
    ),
    "This seller already has an open payout batch.",
  );

  const eligibleSettlements = getEligibleSettlementsForSeller(state, seller.slug);
  const requestedSettlementIds =
    input.settlementIds.length > 0
      ? new Set(input.settlementIds)
      : new Set(eligibleSettlements.map((entry) => entry.id));
  const settlements = eligibleSettlements.filter((entry) => requestedSettlementIds.has(entry.id));

  assert(settlements.length > 0, "No eligible settlements were selected for payout.");

  const totalNet = settlements.reduce((sum, entry) => sum + entry.netPayableAmount, 0);
  assert(
    totalNet >= state.payoutCycleConfig.minimumPayoutAmount,
    `Minimum payout threshold is ${state.payoutCycleConfig.minimumPayoutAmount}.`,
  );

  const createdAt = nowIso();
  const payout = buildPayoutFromSettlements(state, seller.slug, settlements, {
    createdAt,
    payoutPeriod:
      seller.payoutAccount.schedulePreference === "WEEKLY"
        ? "WEEKLY"
        : seller.payoutAccount.schedulePreference === "MONTHLY"
          ? "MONTHLY"
          : state.payoutCycleConfig.period,
    payoutStatus: "DRAFT",
    requestType: input.requestType ?? "ADMIN_BATCH",
    requestNote: input.note?.trim() || undefined,
    createdByUserId: actorUserId,
  });
  assert(payout, "Unable to create payout batch.");

  const nextSettlements = updateSettlementStatusesForPayout(
    state.sellerSettlements,
    payout,
    createdAt,
  );

  return appendArtifacts(
    {
      ...state,
      sellerSettlements: nextSettlements,
      sellerPayouts: [...state.sellerPayouts, payout],
    },
    {
      notifications: seller.ownerUserId
        ? [
            createNotification({
              userId: seller.ownerUserId,
              type: "PAYOUT_SCHEDULED",
              title: "Payout batch created",
              message: `${payout.id} has been created for ${seller.name} and is awaiting finance approval.`,
              createdAt,
            }),
          ]
        : [],
      auditTrail: [
        createAuditEntry({
          action: "PAYOUT_CREATED",
          actorUserId,
          actorRole: actor.role,
          note: `${payout.id} created for ${seller.name} with ${settlements.length} settlements.`,
          createdAt,
        }),
        ...settlements.map((settlement) =>
          createAuditEntry({
            action: "SETTLEMENT_STATUS_CHANGED",
            actorUserId,
            actorRole: actor.role,
            orderId: settlement.orderId,
            fromStatus: settlement.settlementStatus,
            toStatus: "IN_PAYOUT_QUEUE",
            note: `${settlement.id} assigned to payout ${payout.id}.`,
            createdAt,
          }),
        ),
      ],
    },
  );
}

export function reviewCODRemittanceRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: CODRemittanceReviewInput,
) {
  const actor = getActorWithScope(state, actorUserId, "payments");
  const remittance = state.codRemittances.find((entry) => entry.id === input.remittanceId);
  assert(remittance, "COD remittance record not found.");
  const createdAt = nowIso();

  const nextRemittance = {
    ...remittance,
    status: input.status,
    receivedAmount: input.receivedAmount ?? remittance.receivedAmount,
    remittanceReference: input.remittanceReference?.trim() || remittance.remittanceReference,
    receiptReference: input.receiptReference?.trim() || remittance.receiptReference,
    discrepancyStatus: input.discrepancyStatus ?? remittance.discrepancyStatus,
    adminNote: input.adminNote?.trim() || remittance.adminNote,
    confirmedByUserId:
      input.status === "REMITTANCE_CONFIRMED" ? actorUserId : remittance.confirmedByUserId,
    confirmedAt: input.status === "REMITTANCE_CONFIRMED" ? createdAt : remittance.confirmedAt,
    updatedAt: createdAt,
  };

  let nextState: MarketplaceState = {
    ...state,
    codRemittances: state.codRemittances.map((entry) =>
      entry.id === remittance.id ? nextRemittance : entry,
    ),
  };
  const order = nextState.orders.find((entry) => entry.id === remittance.orderId);
  const payment = order
    ? nextState.payments.find((entry) => entry.id === order.paymentId)
    : undefined;

  if (input.status === "REMITTANCE_CONFIRMED" && order && payment) {
    assert(
      payment.method === "COD",
      "Only COD payments can be cleared through remittance confirmation.",
    );

    const nextPayment = {
      ...payment,
      status: "PAID" as const,
      verifiedByUserId: actorUserId,
      verifiedAt: payment.verifiedAt ?? createdAt,
      commissionCalculatedAt: createdAt,
      updatedAt: createdAt,
    };

    nextState = {
      ...nextState,
      payments: nextState.payments.map((entry) => (entry.id === payment.id ? nextPayment : entry)),
    };
    nextState = {
      ...nextState,
      commissions: createOrRefreshOrderCommissions(nextState, order, createdAt),
    };
    nextState = {
      ...nextState,
      sellerSettlements: createOrRefreshSettlementEntries(nextState, order, createdAt),
    };
    nextState = {
      ...nextState,
      sellerPayouts: reconcileScheduledPayouts(nextState, createdAt),
    };
    nextState = {
      ...nextState,
      sellerSettlements: nextState.sellerPayouts.reduce(
        (settlements, payout) => updateSettlementStatusesForPayout(settlements, payout, createdAt),
        nextState.sellerSettlements,
      ),
    };
  }

  if (input.status === "ISSUE_FLAGGED") {
    nextState = {
      ...nextState,
      sellerSettlements: nextState.sellerSettlements.map((settlement) =>
        settlement.orderId === remittance.orderId
          ? {
              ...settlement,
              settlementStatus: "ON_HOLD",
              holdReason:
                input.adminNote?.trim() || "COD remittance was flagged by finance operations.",
              updatedAt: createdAt,
            }
          : settlement,
      ),
    };
  }

  const sellerNotifications = state.users
    .filter(
      (user) =>
        user.role === "SELLER" &&
        user.sellerSlug &&
        remittance.sellerSlugs.includes(user.sellerSlug),
    )
    .map((sellerUser) =>
      createNotification({
        userId: sellerUser.id,
        type:
          input.status === "REMITTANCE_CONFIRMED"
            ? "SETTLEMENT_READY"
            : input.status === "ISSUE_FLAGGED"
              ? "SETTLEMENT_ON_HOLD"
              : "COD_REMITTANCE_PENDING",
        title:
          input.status === "REMITTANCE_CONFIRMED"
            ? "COD remittance confirmed"
            : input.status === "ISSUE_FLAGGED"
              ? "COD remittance issue flagged"
              : "COD remittance updated",
        message:
          input.status === "REMITTANCE_CONFIRMED"
            ? `${order?.orderNumber ?? remittance.orderId} cash receipt is confirmed and eligible settlements are now visible for payout.`
            : input.status === "ISSUE_FLAGGED"
              ? `${order?.orderNumber ?? remittance.orderId} settlement is on hold while finance reviews the COD remittance issue.`
              : `${order?.orderNumber ?? remittance.orderId} COD remittance was updated by finance operations.`,
        createdAt,
        orderId: remittance.orderId,
        paymentId: remittance.paymentId,
      }),
    );

  return appendArtifacts(nextState, {
    notifications: sellerNotifications,
    auditTrail: [
      createAuditEntry({
        action:
          input.status === "REMITTANCE_CONFIRMED"
            ? "COD_REMITTANCE_CONFIRMED"
            : input.status === "ISSUE_FLAGGED"
              ? "COD_REMITTANCE_FLAGGED"
              : "COD_REMITTANCE_UPDATED",
        actorUserId,
        actorRole: actor.role,
        orderId: remittance.orderId,
        paymentId: remittance.paymentId,
        fromStatus: remittance.status,
        toStatus: input.status,
        note: input.adminNote?.trim(),
        createdAt,
      }),
      ...(input.status === "REMITTANCE_CONFIRMED" && payment
        ? [
            createAuditEntry({
              action: "PAYMENT_STATUS_CHANGED",
              actorUserId,
              actorRole: actor.role,
              orderId: remittance.orderId,
              paymentId: payment.id,
              fromStatus: payment.status,
              toStatus: "PAID",
              note: "COD payment cleared by confirmed remittance.",
              createdAt,
            }),
          ]
        : []),
      ...nextState.sellerSettlements
        .filter((settlement) => settlement.orderId === remittance.orderId)
        .map((settlement) =>
          createAuditEntry({
            action: "SETTLEMENT_STATUS_CHANGED",
            actorUserId,
            actorRole: actor.role,
            orderId: settlement.orderId,
            fromStatus:
              state.sellerSettlements.find((entry) => entry.id === settlement.id)
                ?.settlementStatus ?? "NOT_READY",
            toStatus: settlement.settlementStatus,
            note: `${settlement.id} refreshed after COD remittance review.`,
            createdAt,
          }),
        ),
    ],
  });
}

export function updateSellerPayoutRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: {
    payoutId: string;
    status: PayoutStatus;
    adminNotes?: string;
    transactionReference?: string;
  },
) {
  const actor = getActorWithScope(state, actorUserId, "payments");
  const payout = state.sellerPayouts.find((entry) => entry.id === input.payoutId);
  assert(payout, "Payout record not found.");
  const seller = state.sellersDirectory.find((entry) => entry.slug === payout.sellerSlug);
  assert(seller, "Seller record not found.");

  if (["APPROVED", "PROCESSING", "PAID", "SCHEDULED"].includes(input.status)) {
    assert(seller.payoutAccount, "Seller payout account is missing.");
    assert(
      seller.payoutAccount.status === "VERIFIED",
      "Seller payout account must be verified before releasing payout.",
    );
  }
  if (input.status === "PAID") {
    assert(
      Boolean(input.transactionReference?.trim()) || Boolean(input.adminNotes?.trim()),
      "Add a payout reference or finance note before marking a payout as paid.",
    );
  }

  const createdAt = nowIso();
  const nextPayout: SellerPayout = {
    ...payout,
    status: input.status,
    adminNotes: input.adminNotes?.trim() || payout.adminNotes,
    transactionReference: input.transactionReference?.trim() || payout.transactionReference,
    processedByUserId: actorUserId,
    approvedByUserId:
      input.status === "APPROVED" ||
      input.status === "PROCESSING" ||
      input.status === "PAID" ||
      input.status === "SCHEDULED"
        ? actorUserId
        : payout.approvedByUserId,
    approvedAt:
      input.status === "APPROVED" ||
      input.status === "PROCESSING" ||
      input.status === "PAID" ||
      input.status === "SCHEDULED"
        ? (payout.approvedAt ?? createdAt)
        : payout.approvedAt,
    rejectedByUserId: input.status === "FAILED" ? actorUserId : payout.rejectedByUserId,
    processedAt:
      input.status === "PROCESSING" || input.status === "PAID" ? createdAt : payout.processedAt,
    paidAt: input.status === "PAID" ? createdAt : payout.paidAt,
    heldAt: input.status === "HELD" ? createdAt : payout.heldAt,
    rejectedAt: input.status === "FAILED" ? createdAt : payout.rejectedAt,
    failureReason:
      input.status === "FAILED"
        ? input.adminNotes?.trim() || payout.failureReason
        : payout.failureReason,
    updatedAt: createdAt,
  };

  const nextSettlements = updateSettlementStatusesForPayout(
    state.sellerSettlements,
    nextPayout,
    createdAt,
  );

  const sellerOwner = state.users.find(
    (user) => user.role === "SELLER" && user.sellerSlug === payout.sellerSlug,
  );

  return appendArtifacts(
    {
      ...state,
      sellerSettlements: nextSettlements,
      sellerPayouts: state.sellerPayouts.map((entry) =>
        entry.id === payout.id ? nextPayout : entry,
      ),
    },
    {
      notifications: sellerOwner
        ? [
            createNotification({
              userId: sellerOwner.id,
              type:
                input.status === "PAID"
                  ? "PAYOUT_PROCESSED"
                  : input.status === "FAILED"
                    ? "PAYOUT_FAILED"
                    : input.status === "APPROVED" || input.status === "SCHEDULED"
                      ? "PAYOUT_REQUEST_APPROVED"
                      : input.status === "HELD"
                        ? "SETTLEMENT_ON_HOLD"
                        : "PAYOUT_SCHEDULED",
              title:
                input.status === "PAID"
                  ? "Payout processed"
                  : input.status === "FAILED"
                    ? "Payout request rejected"
                    : input.status === "APPROVED" || input.status === "SCHEDULED"
                      ? "Payout request approved"
                      : input.status === "HELD"
                        ? "Payout placed on hold"
                        : `Payout ${input.status.toLowerCase()}`,
              message:
                input.status === "PAID"
                  ? `${payout.id} has been paid to your store settlement account.`
                  : input.status === "FAILED"
                    ? `${payout.id} was rejected. Review the admin note and update payout details if needed.`
                    : input.status === "HELD"
                      ? `${payout.id} is on hold until the finance team resolves the issue.`
                      : `${payout.id} is now marked as ${input.status.toLowerCase()}.`,
              createdAt,
            }),
          ]
        : [],
      auditTrail: [
        createAuditEntry({
          action: "PAYOUT_STATUS_CHANGED",
          actorUserId,
          actorRole: actor.role,
          note: `${payout.id} moved from ${payout.status} to ${input.status}.`,
          fromStatus: payout.status,
          toStatus: input.status,
          createdAt,
        }),
      ],
    },
  );
}

export function reviewSellerPayoutAccountRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: SellerPayoutAccountReviewInput,
) {
  const actor = getActorWithScope(state, actorUserId, "payments");
  const seller = state.sellersDirectory.find((entry) => entry.slug === input.sellerSlug);
  assert(seller, "Seller record not found.");
  assert(seller.payoutAccount, "Seller payout account has not been submitted.");
  const createdAt = nowIso();

  const nextAccount = {
    ...seller.payoutAccount,
    status: input.status,
    adminNote: input.adminNote?.trim() || undefined,
    verifiedByUserId: input.status === "VERIFIED" ? actorUserId : undefined,
    verifiedAt: input.status === "VERIFIED" ? createdAt : undefined,
    rejectedAt: input.status === "REJECTED" ? createdAt : undefined,
    rejectionReason:
      input.status === "REJECTED"
        ? input.adminNote?.trim() || "Payout account rejected."
        : undefined,
    updatedAt: createdAt,
  };

  return appendArtifacts(
    {
      ...state,
      sellersDirectory: state.sellersDirectory.map((entry) =>
        entry.slug === seller.slug
          ? {
              ...entry,
              payoutAccount: nextAccount,
              updatedAt: createdAt,
            }
          : entry,
      ),
    },
    {
      notifications: seller.ownerUserId
        ? [
            createNotification({
              userId: seller.ownerUserId,
              type:
                input.status === "VERIFIED" ? "PAYOUT_ACCOUNT_VERIFIED" : "PAYOUT_ACCOUNT_REJECTED",
              title:
                input.status === "VERIFIED" ? "Payout account verified" : "Payout account rejected",
              message:
                input.status === "VERIFIED"
                  ? `${seller.name} payout details are now verified for payouts.`
                  : `${seller.name} payout details need updates before payouts can be released.`,
              createdAt,
            }),
          ]
        : [],
      auditTrail: [
        createAuditEntry({
          action: "SELLER_PAYOUT_ACCOUNT_REVIEWED",
          actorUserId,
          actorRole: actor.role,
          note: `${seller.name} payout account moved to ${input.status}. ${input.adminNote?.trim() ?? ""}`.trim(),
          fromStatus: seller.payoutAccount.status,
          toStatus: input.status,
          createdAt,
        }),
      ],
    },
  );
}

export function updateSystemSettingsRecord(
  state: MarketplaceState,
  actorUserId: string,
  input: SystemSettings,
) {
  const actor = getActorWithScope(state, actorUserId, "settings");
  assertSuperAdmin(actor, "Only a super admin can update system settings.");
  const createdAt = nowIso();

  return appendArtifacts(
    {
      ...state,
      systemSettings: input,
    },
    {
      auditTrail: [
        createAuditEntry({
          action: "SETTINGS_UPDATED",
          actorUserId,
          actorRole: actor.role,
          note: "System settings updated from admin panel.",
          createdAt,
        }),
      ],
    },
  );
}
