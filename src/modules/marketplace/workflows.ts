import { products } from "@/data/marketplace";
import {
  isHostedImageReference,
  isReviewImageReference,
} from "@/modules/uploads/shared";
import { normalizeSellerWhatsAppInput } from "./whatsapp";
import {
  createOrRefreshOrderCommissions,
  deactivateOrderCommissions,
  reconcileScheduledPayouts,
} from "./financials";
import {
  createSellerFulfillments,
  getAllowedSellerOrderTransitions,
  getSellerFulfillmentForOrder,
  syncOrderFulfillments,
  updateSellerFulfillmentStatus,
} from "./order-management";
import { canReviewPayments, getCurrentUser, isCustomer, isSeller } from "./permissions";
import {
  buildPayoutFromSettlements,
  createOrRefreshSettlementEntries,
  ensureCODRemittanceRecord,
  getCODRemittanceByOrderId,
  getEligibleSettlementsForSeller,
  getRequestableSettlementBalance,
  roundMoney,
  updateSettlementStatusesForPayout,
} from "./settlements";
import {
  getCartCouponState,
  getCartDetailedLines,
  getOrderById,
  getPaymentById,
  getProofById,
  lookupOrderByReference,
} from "./selectors";
import type {
  AuditAction,
  CODRemittanceReviewInput,
  CheckoutSubmission,
  CODPaymentProofSubmission,
  CustomerAddressInput,
  CustomerPreferencesUpdate,
  CustomerProfileUpdate,
  InventoryMovementReason,
  ManagedProductInput,
  MarketplaceOrder,
  MarketplaceState,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentProof,
  PaymentProofReview,
  PaymentProofSubmission,
  PaymentRecord,
  PaymentStatus,
  PayoutStatus,
  ProductReviewSubmissionInput,
  SavedVehicleInput,
  SellerPayoutAccountInput,
  SellerPayoutRequestInput,
  SellerSettlementBatchInput,
  SellerStoreProfileInput,
  StoreReviewSubmissionInput,
} from "./types";

const GUEST_CART_USER_ID = "guest-session";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function createOrderNumber(state: MarketplaceState) {
  return `SK-${String(state.orders.length + 1).padStart(5, "0")}`;
}

function normalizeContactValue(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, "") ?? "";
}

function createDefaultCustomerAccount(userId: string, city: string, createdAt: string) {
  return {
    userId,
    city,
    joinedAt: createdAt.slice(0, 10),
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
  };
}

function resolveCartOwnerId(
  state: MarketplaceState,
  actorUserId: string,
  actionLabel: string,
) {
  if (!actorUserId) {
    return GUEST_CART_USER_ID;
  }

  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), actionLabel);
  return actorUserId;
}

function upsertGuestCheckoutCustomer(
  state: MarketplaceState,
  input: CheckoutSubmission,
  createdAt: string,
) {
  const normalizedPhone = normalizeContactValue(input.shippingAddress.phone);
  const normalizedEmail = normalizeContactValue(input.guestEmail);
  const existingGuest = state.users.find(
    (user) =>
      user.role === "CUSTOMER" &&
      user.isGuest &&
      normalizeContactValue(user.phone) === normalizedPhone &&
      (!normalizedEmail || normalizeContactValue(user.email) === normalizedEmail),
  );

  const guestUserId = existingGuest?.id ?? createId("guest-customer");
  const guestEmail =
    input.guestEmail?.trim().toLowerCase() ||
    `${guestUserId}@guest.sparekart.local`;

  const guestUser = {
    id: guestUserId,
    name: input.shippingAddress.fullName.trim(),
    email: guestEmail,
    phone: input.shippingAddress.phone.trim(),
    role: "CUSTOMER" as const,
    status: "ACTIVE" as const,
    isGuest: true,
    createdAt: existingGuest?.createdAt ?? createdAt,
    lastLoginAt: existingGuest?.lastLoginAt,
  };

  return {
    state: {
      ...state,
      users: existingGuest
        ? state.users.map((user) => (user.id === guestUserId ? guestUser : user))
        : [...state.users, guestUser],
      customerAccounts: {
        ...state.customerAccounts,
        [guestUserId]: state.customerAccounts[guestUserId] ?? createDefaultCustomerAccount(
          guestUserId,
          input.shippingAddress.city.trim(),
          createdAt,
        ),
      },
    },
    guestUser,
  };
}

function getReviewEligibleOrders(
  state: MarketplaceState,
  userId: string,
) {
  return state.orders
    .filter((order) => order.customerUserId === userId && order.status === "DELIVERED")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function validateReviewImages(imageUrls?: string[]) {
  (imageUrls ?? []).forEach((imageUrl) => {
    assert(isReviewImageReference(imageUrl), "Review image upload is invalid.");
  });
  assert((imageUrls?.length ?? 0) <= 4, "You can upload up to 4 review images.");
}

function resolveReviewActor(
  state: MarketplaceState,
  actorUserId: string,
  orderLookup?: StoreReviewSubmissionInput["orderLookup"] | ProductReviewSubmissionInput["orderLookup"],
) {
  const actor = state.users.find((user) => user.id === actorUserId);

  if (actor && isCustomer(actor)) {
    return {
      actor,
      verifiedOrder: undefined as MarketplaceOrder | undefined,
    };
  }

  assert(orderLookup, "Sign in or verify your delivered order to leave a review.");
  const verifiedOrder = lookupOrderByReference(state, orderLookup);
  assert(verifiedOrder, "We could not verify that order with the provided phone or email.");
  const verifiedGuest = state.users.find((user) => user.id === verifiedOrder.customerUserId);
  assert(
    verifiedGuest?.role === "CUSTOMER" && verifiedGuest.isGuest,
    "Guest review verification only works for guest orders.",
  );
  const guestCustomer = verifiedGuest as NonNullable<typeof verifiedGuest>;

  return {
    actor: guestCustomer,
    verifiedOrder,
  };
}

function getReviewModerators(state: MarketplaceState) {
  return state.users.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN");
}

function createAuditEntry(input: {
  action: AuditAction;
  actorUserId: string;
  actorRole: MarketplaceState["users"][number]["role"];
  orderId?: string;
  paymentId?: string;
  proofId?: string;
  productId?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  createdAt: string;
}) {
  return {
    id: createId("audit"),
    ...input,
  };
}

function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  paymentId?: string;
  proofId?: string;
  createdAt: string;
}) {
  return {
    id: createId("notification"),
    ...input,
  };
}

function getInventoryAvailable(state: MarketplaceState, productId: string) {
  return state.inventory[productId]?.available ?? 0;
}

function getCustomerAccountRecord(state: MarketplaceState, userId: string) {
  const account = state.customerAccounts[userId];
  assert(account, "Customer account was not found.");
  return account;
}

function clearAppliedCouponCode(state: MarketplaceState, userId: string) {
  return {
    ...state.appliedCouponCodesByUserId,
    [userId]: "",
  };
}

function getSellerActorRecord(state: MarketplaceState, userId: string) {
  const actor = state.users.find((user) => user.id === userId);
  assert(actor?.role === "SELLER" && actor.sellerSlug, "Only sellers can access seller dashboard actions.");
  assert(actor.status === "ACTIVE", "Seller account is not active.");

  const seller = state.sellersDirectory.find((item) => item.slug === actor.sellerSlug);
  assert(seller, "Seller store was not found.");

  return { actor, seller };
}

function sanitizeOptionalLink(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function applySellerPayoutAccountToPayout(
  payout: MarketplaceState["sellerPayouts"][number],
  payoutAccount: NonNullable<MarketplaceState["sellersDirectory"][number]["payoutAccount"]>,
) {
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

function syncOrderFinancialLedgerState(
  state: MarketplaceState,
  order: MarketplaceOrder,
  updatedAt: string,
) {
  const payment = getPaymentById(state, order.paymentId);

  if (!payment) {
    return state;
  }

  const remittances = ensureCODRemittanceRecord(state, order, payment, updatedAt);
  const nextState = {
    ...state,
    codRemittances: remittances,
  };

  return {
    ...nextState,
    sellerSettlements: createOrRefreshSettlementEntries(nextState, order, updatedAt),
  };
}

function getOpenSellerPayout(
  state: MarketplaceState,
  sellerSlug: string,
) {
  return state.sellerPayouts.find(
    (payout) =>
      payout.sellerSlug === sellerSlug &&
      ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCESSING", "HELD", "PENDING", "SCHEDULED"].includes(
        payout.status,
      ),
  );
}

function validateSellerPayoutAccountInput(input: SellerPayoutAccountInput) {
  if (input.method === "BANK_TRANSFER") {
    assert((input.accountTitle?.trim().length ?? 0) >= 2, "Account title is required.");
    assert((input.bankName?.trim().length ?? 0) >= 2, "Bank name is required.");
    assert((input.accountNumber?.trim().length ?? 0) >= 6, "Bank account number is required.");
    assert((input.iban?.trim().length ?? 0) >= 8, "IBAN is required.");
    assert((input.branchCode?.trim().length ?? 0) >= 3, "Branch code is required.");
  }

  if (input.method === "EASYPAISA") {
    assert((input.accountTitle?.trim().length ?? 0) >= 2, "Account title is required.");
    assert((input.easyPaisaNumber?.trim().length ?? 0) >= 10, "Easypaisa number is required.");
    assert((input.mobileWalletProvider?.trim().length ?? 0) >= 2, "Wallet provider is required.");
  }

  if (input.method === "JAZZCASH") {
    assert((input.accountTitle?.trim().length ?? 0) >= 2, "Account title is required.");
    assert((input.jazzCashNumber?.trim().length ?? 0) >= 10, "JazzCash number is required.");
    assert((input.mobileWalletProvider?.trim().length ?? 0) >= 2, "Wallet provider is required.");
  }

  if (input.method === "PAYPAL") {
    assert(input.paypalEmail?.includes("@"), "Valid PayPal email is required.");
  }

  if (input.method === "WALLET") {
    assert((input.walletId?.trim().length ?? 0) >= 3, "Wallet ID is required.");
  }
}

function ensureInventoryAvailable(
  state: MarketplaceState,
  order: Pick<MarketplaceOrder, "items">,
) {
  order.items.forEach((item) => {
    const available = getInventoryAvailable(state, item.productId);

    assert(
      available >= item.quantity,
      `Not enough stock available for ${item.title}.`,
    );
  });
}

function appendStateArtifacts(
  state: MarketplaceState,
  input: {
    notifications?: MarketplaceState["notifications"];
    auditTrail?: MarketplaceState["auditTrail"];
    inventoryMovements?: MarketplaceState["inventoryMovements"];
  },
) {
  return {
    ...state,
    notifications: input.notifications
      ? [...state.notifications, ...input.notifications]
      : state.notifications,
    auditTrail: input.auditTrail ? [...state.auditTrail, ...input.auditTrail] : state.auditTrail,
    inventoryMovements: input.inventoryMovements
      ? [...state.inventoryMovements, ...input.inventoryMovements]
      : state.inventoryMovements,
  };
}

function addSellerNotifications(
  state: MarketplaceState,
  order: MarketplaceOrder,
  createdAt: string,
  input?: {
    type?: NotificationType;
    title?: string;
    message?: string;
  },
) {
  const sellerNotifications = Array.from(
    new Set(order.items.map((item) => item.sellerSlug)),
  )
    .map((sellerSlug) =>
      state.users.find((user) => user.role === "SELLER" && user.sellerSlug === sellerSlug),
    )
    .filter(Boolean)
    .map((sellerUser) =>
      createNotification({
        userId: sellerUser!.id,
        type: input?.type ?? "ORDER_CONFIRMED",
        title: input?.title ?? "Order confirmed",
        message: input?.message ?? `${order.orderNumber} is ready for seller processing.`,
        orderId: order.id,
        createdAt,
      }),
    );

  return sellerNotifications;
}

function getSellerUsersForOrder(
  state: MarketplaceState,
  order: MarketplaceOrder,
) {
  return Array.from(new Set(order.items.map((item) => item.sellerSlug)))
    .map((sellerSlug) =>
      state.users.find((user) => user.role === "SELLER" && user.sellerSlug === sellerSlug),
    )
    .filter(Boolean) as MarketplaceState["users"];
}

function getOrderProgressNotificationConfig(nextStatus: OrderStatus) {
  switch (nextStatus) {
    case "PROCESSING":
      return {
        type: "ORDER_PROCESSING" as const,
        title: "Order processing",
      };
    case "SHIPPED":
      return {
        type: "ORDER_SHIPPED" as const,
        title: "Order shipped",
      };
    case "DELIVERED":
      return {
        type: "ORDER_DELIVERED" as const,
        title: "Order delivered",
      };
    case "CANCELED":
      return {
        type: "ORDER_CANCELED" as const,
        title: "Order canceled",
      };
    default:
      return {
        type: "ORDER_CONFIRMED" as const,
        title: "Order updated",
      };
  }
}

function restockInventoryForSellerItems(
  state: MarketplaceState,
  order: MarketplaceOrder,
  sellerSlug: string,
  actorUserId: string,
  createdAt: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Actor not found.");

  if (!order.inventoryCommittedAt) {
    return state;
  }

  const sellerItems = order.items.filter((item) => item.sellerSlug === sellerSlug);

  if (sellerItems.length === 0) {
    return state;
  }

  const inventory = { ...state.inventory };
  const inventoryMovements: MarketplaceState["inventoryMovements"] = [];
  const auditTrail: MarketplaceState["auditTrail"] = [];

  sellerItems.forEach((item) => {
    const current = inventory[item.productId];
    assert(current, `Inventory record missing for ${item.productId}.`);

    const beforeQty = current.available;
    const afterQty = beforeQty + item.quantity;

    inventory[item.productId] = {
      ...current,
      available: afterQty,
      updatedAt: createdAt,
    };

    inventoryMovements.push({
      id: createId("inventory"),
      productId: item.productId,
      orderId: order.id,
      quantityDelta: item.quantity,
      reason: "ORDER_CANCELED",
      actorUserId,
      beforeQty,
      afterQty,
      createdAt,
    });

    auditTrail.push(
      createAuditEntry({
        action: "INVENTORY_RESTOCKED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        productId: item.productId,
        note: `${item.quantity} units returned after ${sellerSlug} canceled its fulfillment.`,
        createdAt,
      }),
    );
  });

  return appendStateArtifacts(
    {
      ...state,
      inventory,
      orders: state.orders.map((candidate) =>
        candidate.id === order.id
          ? { ...candidate, updatedAt: createdAt }
          : candidate,
      ),
    },
    {
      inventoryMovements,
      auditTrail,
    },
  );
}

function commitInventoryForOrder(
  state: MarketplaceState,
  order: MarketplaceOrder,
  actorUserId: string,
  createdAt: string,
  reason: InventoryMovementReason,
) {
  ensureInventoryAvailable(state, order);

  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Actor not found.");

  const inventory = { ...state.inventory };
  const inventoryMovements: MarketplaceState["inventoryMovements"] = [];
  const auditTrail: MarketplaceState["auditTrail"] = [];

  order.items.forEach((item) => {
    const current = inventory[item.productId];
    assert(current, `Inventory record missing for ${item.productId}.`);

    const beforeQty = current.available;
    const afterQty = beforeQty - item.quantity;

    inventory[item.productId] = {
      ...current,
      available: afterQty,
      updatedAt: createdAt,
    };

    inventoryMovements.push({
      id: createId("inventory"),
      productId: item.productId,
      orderId: order.id,
      quantityDelta: -item.quantity,
      reason,
      actorUserId,
      beforeQty,
      afterQty,
      createdAt,
    });

    auditTrail.push(
      createAuditEntry({
        action: "INVENTORY_DEDUCTED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        productId: item.productId,
        note: `${item.quantity} units committed for order confirmation.`,
        createdAt,
      }),
    );
  });

  return appendStateArtifacts(
    {
      ...state,
      inventory,
      orders: state.orders.map((candidate) =>
        candidate.id === order.id
          ? { ...candidate, inventoryCommittedAt: createdAt, updatedAt: createdAt }
          : candidate,
      ),
    },
    {
      inventoryMovements,
      auditTrail,
    },
  );
}

function restockInventoryForOrder(
  state: MarketplaceState,
  order: MarketplaceOrder,
  actorUserId: string,
  createdAt: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Actor not found.");

  if (!order.inventoryCommittedAt || order.inventoryReleasedAt) {
    return state;
  }

  const inventory = { ...state.inventory };
  const inventoryMovements: MarketplaceState["inventoryMovements"] = [];
  const auditTrail: MarketplaceState["auditTrail"] = [];

  order.items.forEach((item) => {
    const current = inventory[item.productId];
    assert(current, `Inventory record missing for ${item.productId}.`);

    const beforeQty = current.available;
    const afterQty = beforeQty + item.quantity;

    inventory[item.productId] = {
      ...current,
      available: afterQty,
      updatedAt: createdAt,
    };

    inventoryMovements.push({
      id: createId("inventory"),
      productId: item.productId,
      orderId: order.id,
      quantityDelta: item.quantity,
      reason: "ORDER_CANCELED",
      actorUserId,
      beforeQty,
      afterQty,
      createdAt,
    });

    auditTrail.push(
      createAuditEntry({
        action: "INVENTORY_RESTOCKED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        productId: item.productId,
        note: `${item.quantity} units returned after order cancellation.`,
        createdAt,
      }),
    );
  });

  return appendStateArtifacts(
    {
      ...state,
      inventory,
      orders: state.orders.map((candidate) =>
        candidate.id === order.id
          ? { ...candidate, inventoryReleasedAt: createdAt, updatedAt: createdAt }
          : candidate,
      ),
    },
    {
      inventoryMovements,
      auditTrail,
    },
  );
}

function validateProofInput(
  state: MarketplaceState,
  proof: PaymentProofSubmission,
) {
  assert(proof.screenshotUrl.startsWith("data:"), "Invalid payment proof upload.");
  assert(proof.screenshotName.trim().length > 0, "Screenshot file name is required.");
  assert(
    proof.transactionReference.trim().length >= 4,
    "Transaction reference must be at least 4 characters.",
  );

  if (proof.amountPaid !== undefined) {
    assert(proof.amountPaid > 0, "Amount paid must be greater than zero.");
  }

  if (proof.paymentDateTime) {
    assert(
      !Number.isNaN(Date.parse(proof.paymentDateTime)),
      "Payment date/time must be valid.",
    );
  }

  assert(
    proof.screenshotUrl.length <= state.paymentSettings.proofMaxSizeBytes * 1.5,
    "Payment proof is too large.",
  );
}

function createProofRecord(
  state: MarketplaceState,
  payment: PaymentRecord,
  order: MarketplaceOrder,
  actorUserId: string,
  proofInput: PaymentProofSubmission,
  createdAt: string,
) {
  validateProofInput(state, proofInput);
  assert(payment.method !== "COD", "Cash on Delivery orders do not accept payment proof.");

  const previousAttempts = state.paymentProofs.filter((proof) => proof.orderId === order.id);

  const proof: PaymentProof = {
    id: createId("proof"),
    orderId: order.id,
    paymentId: payment.id,
    submittedByUserId: actorUserId,
    submittedByRole: "CUSTOMER",
    paymentMethod: payment.method,
    proofKind: "MANUAL_TRANSFER",
    proofSource: "CUSTOMER",
    screenshotUrl: proofInput.screenshotUrl,
    screenshotName: proofInput.screenshotName,
    transactionReference: proofInput.transactionReference.trim(),
    amountPaid: proofInput.amountPaid,
    paymentDateTime: proofInput.paymentDateTime,
    note: proofInput.note?.trim(),
    status: "SUBMITTED",
    createdAt,
    updatedAt: createdAt,
    attemptNumber: previousAttempts.length + 1,
  };

  return proof;
}

function createCODCollectionProofRecord(
  state: MarketplaceState,
  payment: PaymentRecord,
  order: MarketplaceOrder,
  actorUserId: string,
  actorRole: MarketplaceState["users"][number]["role"],
  proofInput: CODPaymentProofSubmission,
  createdAt: string,
) {
  validateProofInput(state, proofInput);
  assert(payment.method === "COD", "COD collection proof can only be used for cash on delivery orders.");
  assert(order.status === "DELIVERED", "COD collection proof can only be submitted after delivery.");
  assert(
    proofInput.deliveryPartnerName.trim().length >= 2,
    "Delivery partner name is required.",
  );
  assert(
    proofInput.deliveryPartnerPhone.trim().length >= 8,
    "Delivery partner phone is required.",
  );

  const previousAttempts = state.paymentProofs.filter((proof) => proof.orderId === order.id);

  return {
    id: createId("proof"),
    orderId: order.id,
    paymentId: payment.id,
    submittedByUserId: actorUserId,
    submittedByRole: actorRole,
    paymentMethod: "COD" as const,
    proofKind: "COD_COLLECTION" as const,
    proofSource: "ADMIN_CAPTURE" as const,
    screenshotUrl: proofInput.screenshotUrl,
    screenshotName: proofInput.screenshotName,
    transactionReference: proofInput.transactionReference.trim(),
    amountPaid: proofInput.amountPaid,
    paymentDateTime: proofInput.paymentDateTime,
    note: proofInput.note?.trim(),
    deliveryPartnerName: proofInput.deliveryPartnerName.trim(),
    deliveryPartnerPhone: proofInput.deliveryPartnerPhone.trim(),
    status: "SUBMITTED" as const,
    createdAt,
    updatedAt: createdAt,
    attemptNumber: previousAttempts.length + 1,
  };
}

function updateOrderFinancialsAfterVerification(
  state: MarketplaceState,
  order: MarketplaceOrder,
  actorUserId: string,
  actorRole: MarketplaceState["users"][number]["role"],
  createdAt: string,
) {
  const previousCommissionIds = new Set(
    state.commissions.filter((commission) => commission.orderId === order.id).map((commission) => commission.id),
  );
  const previousSettlementStatuses = new Map(
    state.sellerSettlements
      .filter((settlement) => settlement.orderId === order.id)
      .map((settlement) => [settlement.id, settlement.settlementStatus]),
  );
  const previousPayoutIds = new Set(state.sellerPayouts.map((payout) => payout.id));

  let nextState: MarketplaceState = {
    ...state,
    commissions: createOrRefreshOrderCommissions(state, order, createdAt),
  };

  nextState = syncOrderFinancialLedgerState(nextState, order, createdAt);
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

  const nextOrderCommissions = nextState.commissions.filter(
    (commission) => commission.orderId === order.id && commission.isActive,
  );
  const nextOrderSettlements = nextState.sellerSettlements.filter(
    (settlement) => settlement.orderId === order.id,
  );
  const bookedCommissions = nextOrderCommissions.filter(
    (commission) => !previousCommissionIds.has(commission.id),
  );
  const readySettlements = nextOrderSettlements.filter(
    (settlement) =>
      settlement.settlementStatus === "READY_FOR_SETTLEMENT" &&
      previousSettlementStatuses.get(settlement.id) !== "READY_FOR_SETTLEMENT",
  );
  const scheduledPayouts = nextState.sellerPayouts.filter(
    (payout) => !previousPayoutIds.has(payout.id),
  );

  const sellerUsers = getSellerUsersForOrder(nextState, order);

  return appendStateArtifacts(nextState, {
    notifications: [
      ...sellerUsers.flatMap((sellerUser) => {
        const sellerCommissions = nextOrderCommissions.filter(
          (commission) => commission.sellerSlug === sellerUser.sellerSlug,
        );
        const sellerReadySettlements = readySettlements.filter(
          (settlement) => settlement.sellerSlug === sellerUser.sellerSlug,
        );
        const scheduledPayout = scheduledPayouts.find(
          (payout) => payout.sellerSlug === sellerUser.sellerSlug,
        );

        return [
          createNotification({
            userId: sellerUser.id,
            type: "COMMISSION_BOOKED",
            title: "Commission booked",
            message: `${order.orderNumber} is now financially verified. SpareKart commission has been deducted from your settlement.`,
            orderId: order.id,
            paymentId: order.paymentId,
            createdAt,
          }),
          ...(sellerReadySettlements.length > 0
            ? [
                createNotification({
                  userId: sellerUser.id,
                  type: "SETTLEMENT_READY",
                  title: "Settlement ready",
                  message: `${formatCurrency(
                    sellerReadySettlements.reduce(
                      (sum, settlement) => sum + settlement.netPayableAmount,
                      0,
                    ),
                  )} is now cleared for payout from ${order.orderNumber}.`,
                  orderId: order.id,
                  paymentId: order.paymentId,
                  createdAt,
                }),
              ]
            : []),
          ...(scheduledPayout
            ? [
                createNotification({
                  userId: sellerUser.id,
                  type: "PAYOUT_SCHEDULED",
                  title: "Payout scheduled",
                  message: `${order.orderNumber} has been added to your payout queue for ${formatCurrency(
                    scheduledPayout.netAmount,
                  )}.`,
                  orderId: order.id,
                  createdAt,
                }),
              ]
            : []),
        ];
      }),
    ],
    auditTrail: [
      ...bookedCommissions.map((commission) =>
        createAuditEntry({
          action: "COMMISSION_BOOKED",
          actorUserId,
          actorRole,
          orderId: order.id,
          note: `${commission.sellerSlug} commission booked at ${commission.commissionRate}% for ${commission.productCategory}.`,
          createdAt,
        }),
      ),
      ...scheduledPayouts.map((payout) =>
        createAuditEntry({
          action: "PAYOUT_CREATED",
          actorUserId,
          actorRole,
          note: `Payout ${payout.id} scheduled for ${payout.sellerSlug} with ${payout.orderIds.length} orders.`,
          createdAt,
        }),
      ),
      ...readySettlements.map((settlement) =>
        createAuditEntry({
          action: "SETTLEMENT_STATUS_CHANGED",
          actorUserId,
          actorRole,
          orderId: settlement.orderId,
          fromStatus: previousSettlementStatuses.get(settlement.id),
          toStatus: settlement.settlementStatus,
          note: `${settlement.id} is ready for seller settlement.`,
          createdAt,
        }),
      ),
    ],
  });
}

function removeOrderFromOpenPayouts(
  payouts: MarketplaceState["sellerPayouts"],
  orderId: string,
  commissions: MarketplaceState["commissions"],
  settlements: MarketplaceState["sellerSettlements"],
  updatedAt: string,
) {
  const commissionIdsForOrder = commissions
    .filter((commission) => commission.orderId === orderId)
    .map((commission) => commission.id);
  const settlementIdsForOrder = settlements
    .filter((settlement) => settlement.orderId === orderId)
    .map((settlement) => settlement.id);

  return payouts.map((payout) => {
    if (!payout.orderIds.includes(orderId) || ["PAID", "PROCESSING"].includes(payout.status)) {
      return payout;
    }

    const nextOrderIds = payout.orderIds.filter((candidate) => candidate !== orderId);
    const nextCommissionIds = payout.commissionIds.filter(
      (commissionId) => !commissionIdsForOrder.includes(commissionId),
    );
    const nextSettlementIds = (payout.settlementIds ?? []).filter(
      (settlementId) => !settlementIdsForOrder.includes(settlementId),
    );

    if (nextOrderIds.length === 0) {
      return {
        ...payout,
        status: "CANCELED" as PayoutStatus,
        settlementIds: [],
        updatedAt,
        adminNotes: `${orderId} was canceled before payout completion.`,
      };
    }

    const nextCommissions = commissions.filter((commission) =>
      nextCommissionIds.includes(commission.id),
    );
    const nextSettlements = settlements.filter((settlement) =>
      nextSettlementIds.includes(settlement.id),
    );

    return {
      ...payout,
      orderIds: nextOrderIds,
      commissionIds: nextCommissionIds,
      settlementIds: nextSettlementIds,
      totalEarnings: nextSettlements.reduce((sum, settlement) => sum + settlement.grossSaleAmount, 0),
      totalCommissionDeducted: nextSettlements.reduce(
        (sum, settlement) => sum + settlement.commissionAmount,
        0,
      ),
      totalFees: nextSettlements.reduce((sum, settlement) => sum + settlement.feeAmount, 0),
      netAmount: nextSettlements.reduce((sum, settlement) => sum + settlement.netPayableAmount, 0),
      updatedAt,
    };
  });
}

function addProofSubmittedArtifacts(
  state: MarketplaceState,
  actorUserId: string,
  order: MarketplaceOrder,
  payment: PaymentRecord,
  proof: PaymentProof,
  createdAt: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Actor not found.");

  const adminNotifications = state.users
    .filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN")
    .map((adminUser) =>
      createNotification({
        userId: adminUser.id,
        type: "PAYMENT_PROOF_SUBMITTED",
        title: "Payment proof pending review",
        message: `${order.orderNumber} was submitted for ${payment.method.replaceAll("_", " ")} verification.`,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        createdAt,
      }),
    );

  const customerNotification = createNotification({
    userId: order.customerUserId,
    type: "PAYMENT_PROOF_SUBMITTED",
    title: "Payment proof submitted",
    message: `${order.orderNumber} is now awaiting admin verification.`,
    orderId: order.id,
    paymentId: payment.id,
    proofId: proof.id,
    createdAt,
  });

  return appendStateArtifacts(state, {
    notifications: [...adminNotifications, customerNotification],
    auditTrail: [
      createAuditEntry({
        action: "PAYMENT_PROOF_SUBMITTED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        note: `Proof attempt ${proof.attemptNumber} submitted.`,
        createdAt,
      }),
      createAuditEntry({
        action: "PAYMENT_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        fromStatus: payment.status,
        toStatus: "PROOF_SUBMITTED",
        createdAt,
      }),
      createAuditEntry({
        action: "ORDER_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "AWAITING_PAYMENT_VERIFICATION",
        createdAt,
      }),
    ],
  });
}

function addCODProofSubmittedArtifacts(
  state: MarketplaceState,
  actorUserId: string,
  order: MarketplaceOrder,
  payment: PaymentRecord,
  proof: PaymentProof,
  createdAt: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Actor not found.");

  const sellerNotifications = getSellerUsersForOrder(state, order).map((sellerUser) =>
    createNotification({
      userId: sellerUser.id,
      type: "COD_COLLECTION_SUBMITTED",
      title: "COD cash receipt submitted",
      message: `${order.orderNumber} cash collection proof is under SpareKart review before payout release.`,
      orderId: order.id,
      paymentId: payment.id,
      proofId: proof.id,
      createdAt,
    }),
  );

  const customerNotification = createNotification({
    userId: order.customerUserId,
    type: "COD_COLLECTION_SUBMITTED",
    title: "COD payment under review",
    message: `${order.orderNumber} cash collection is being verified by SpareKart.`,
    orderId: order.id,
    paymentId: payment.id,
    proofId: proof.id,
    createdAt,
  });

  return appendStateArtifacts(state, {
    notifications: [customerNotification, ...sellerNotifications],
    auditTrail: [
      createAuditEntry({
        action: "COD_COLLECTION_SUBMITTED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        note: `COD collection proof attempt ${proof.attemptNumber} submitted.`,
        createdAt,
      }),
      createAuditEntry({
        action: "PAYMENT_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        fromStatus: payment.status,
        toStatus: "UNDER_REVIEW",
        createdAt,
      }),
    ],
  });
}

function updateOrderAndPaymentStatus(
  state: MarketplaceState,
  orderId: string,
  paymentId: string,
  input: {
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    activeProofId?: string | null;
    updatedAt: string;
  },
) {
  return {
    ...state,
    orders: state.orders.map((order) =>
      order.id === orderId
        ? syncOrderFulfillments(order, input.orderStatus, input.updatedAt)
        : order,
    ),
    payments: state.payments.map((payment) =>
      payment.id === paymentId
        ? {
            ...payment,
            status: input.paymentStatus,
            activeProofId:
              input.activeProofId !== undefined ? input.activeProofId : payment.activeProofId,
            updatedAt: input.updatedAt,
          }
        : payment,
    ),
  };
}

export function switchSessionUser(state: MarketplaceState, userId: string) {
  const user = state.users.find((candidate) => candidate.id === userId);
  assert(user, "Selected user account was not found.");

  return appendStateArtifacts(
    {
      ...state,
      currentUserId: userId,
    },
    {
      auditTrail: [
        createAuditEntry({
          action: "SESSION_CHANGED",
          actorUserId: userId,
          actorRole: user.role,
          note: `Session switched to ${user.name}.`,
          createdAt: nowIso(),
        }),
      ],
    },
  );
}

export function logoutSession(state: MarketplaceState) {
  const actor = state.users.find((user) => user.id === state.currentUserId);

  if (!actor) {
    return {
      ...state,
      currentUserId: "",
    };
  }

  return appendStateArtifacts(
    {
      ...state,
      currentUserId: "",
    },
    {
      auditTrail: [
        createAuditEntry({
          action: "SESSION_CHANGED",
          actorUserId: actor.id,
          actorRole: actor.role,
          note: `Session signed out for ${actor.name}.`,
          createdAt: nowIso(),
        }),
      ],
    },
  );
}

export function addItemToCart(
  state: MarketplaceState,
  actorUserId: string,
  productId: string,
  qty = 1,
) {
  const cartOwnerId = resolveCartOwnerId(state, actorUserId, "Only customers or guest shoppers can add items to cart.");

  const product =
    state.managedProducts.find((candidate) => candidate.id === productId) ??
    products.find((candidate) => candidate.id === productId);
  assert(product, "Product not found.");
  assert(qty > 0, "Quantity must be at least 1.");

  const available = getInventoryAvailable(state, productId);
  assert(available > 0, "This product is currently out of stock.");

  const existingLines = state.cartsByUserId[cartOwnerId] ?? [];
  const existingLine = existingLines.find((line) => line.productId === productId);
  const nextQty = Math.min((existingLine?.qty ?? 0) + qty, available);

  const nextLines = existingLine
    ? existingLines.map((line) =>
        line.productId === productId ? { ...line, qty: nextQty } : line,
      )
    : [...existingLines, { productId, qty: Math.min(qty, available) }];

  return {
    ...state,
    cartsByUserId: {
      ...state.cartsByUserId,
      [cartOwnerId]: nextLines,
    },
  };
}

export function updateCartLineQuantity(
  state: MarketplaceState,
  actorUserId: string,
  productId: string,
  qty: number,
) {
  const cartOwnerId = resolveCartOwnerId(state, actorUserId, "Only customers or guest shoppers can update the cart.");

  const available = getInventoryAvailable(state, productId);
  const safeQty = Math.max(1, Math.min(qty, available));

  return {
    ...state,
    cartsByUserId: {
      ...state.cartsByUserId,
      [cartOwnerId]: (state.cartsByUserId[cartOwnerId] ?? []).map((line) =>
        line.productId === productId ? { ...line, qty: safeQty } : line,
      ),
    },
  };
}

export function removeCartLine(
  state: MarketplaceState,
  actorUserId: string,
  productId: string,
) {
  const cartOwnerId = resolveCartOwnerId(state, actorUserId, "Only customers or guest shoppers can update the cart.");
  const nextLines = (state.cartsByUserId[cartOwnerId] ?? []).filter(
    (line) => line.productId !== productId,
  );

  return {
    ...state,
    cartsByUserId: {
      ...state.cartsByUserId,
      [cartOwnerId]: nextLines,
    },
    appliedCouponCodesByUserId:
      nextLines.length === 0
        ? clearAppliedCouponCode(state, cartOwnerId)
        : state.appliedCouponCodesByUserId,
  };
}

export function applyCouponCodeToCart(
  state: MarketplaceState,
  actorUserId: string,
  rawCode: string,
) {
  const cartOwnerId = resolveCartOwnerId(state, actorUserId, "Only customers or guest shoppers can apply coupons.");

  const code = rawCode.trim().toUpperCase();
  assert(code, "Enter a coupon code first.");

  const nextState: MarketplaceState = {
    ...state,
    appliedCouponCodesByUserId: {
      ...state.appliedCouponCodesByUserId,
      [cartOwnerId]: code,
    },
  };
  const couponState = getCartCouponState(nextState, cartOwnerId);
  assert(couponState.status === "applied", couponState.reason ?? "Coupon could not be applied.");

  return nextState;
}

export function removeCouponCodeFromCart(
  state: MarketplaceState,
  actorUserId: string,
) {
  const cartOwnerId = resolveCartOwnerId(state, actorUserId, "Only customers or guest shoppers can remove coupons.");

  return {
    ...state,
    appliedCouponCodesByUserId: clearAppliedCouponCode(state, cartOwnerId),
  };
}

export function updateCustomerProfile(
  state: MarketplaceState,
  actorUserId: string,
  input: CustomerProfileUpdate,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can update profile details.");

  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const city = input.city.trim();

  assert(name.length >= 2, "Full name must be at least 2 characters.");
  assert(email.includes("@"), "Enter a valid email address.");
  assert(phone.length >= 8, "Enter a valid phone number.");
  assert(city.length >= 2, "City is required.");

  const account = getCustomerAccountRecord(state, actorUserId);

  return {
    ...state,
    users: state.users.map((user) =>
      user.id === actorUserId
        ? {
            ...user,
            name,
            email,
            phone,
          }
        : user,
    ),
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        city,
      },
    },
  };
}

export function updateSellerStoreProfile(
  state: MarketplaceState,
  actorUserId: string,
  input: SellerStoreProfileInput,
) {
  const { actor, seller } = getSellerActorRecord(state, actorUserId);
  const createdAt = nowIso();

  const nextSeller = {
    ...seller,
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    description: input.description.trim(),
    city: input.city.trim(),
    logo: input.logo.trim(),
    banner: input.banner.trim(),
    responseTime: input.responseTime.trim(),
    policies: {
      returns: input.policies.returns.trim(),
      shipping: input.policies.shipping.trim(),
      warranty: input.policies.warranty.trim(),
    },
    socialLinks: {
      website: sanitizeOptionalLink(input.socialLinks?.website),
      facebook: sanitizeOptionalLink(input.socialLinks?.facebook),
      instagram: sanitizeOptionalLink(input.socialLinks?.instagram),
      whatsapp: normalizeSellerWhatsAppInput(input.socialLinks?.whatsapp),
    },
    updatedAt: createdAt,
  };

  assert(nextSeller.name.length >= 2, "Store name is required.");
  assert(nextSeller.tagline.length >= 2, "Store tagline is required.");
  assert(nextSeller.description.length >= 40, "Store description should be more descriptive.");
  assert(nextSeller.city.length >= 2, "Store city is required.");
  assert(isHostedImageReference(nextSeller.logo), "A valid store logo is required.");
  assert(isHostedImageReference(nextSeller.banner), "A valid store banner is required.");
  assert(nextSeller.responseTime.length >= 4, "Response time is required.");
  assert(nextSeller.policies.returns.length >= 6, "Return policy is required.");
  assert(nextSeller.policies.shipping.length >= 6, "Shipping policy is required.");
  assert(nextSeller.policies.warranty.length >= 6, "Warranty policy is required.");

  return appendStateArtifacts(
    {
      ...state,
      users: state.users.map((user) =>
        user.id === actor.id
          ? {
              ...user,
              name: nextSeller.name,
            }
          : user,
      ),
      sellersDirectory: state.sellersDirectory.map((item) =>
        item.slug === seller.slug ? nextSeller : item,
      ),
    },
    {
      auditTrail: [
        createAuditEntry({
          action: "SELLER_UPDATED",
          actorUserId,
          actorRole: actor.role,
          note: `${nextSeller.name} storefront profile updated by seller.`,
          createdAt,
        }),
      ],
    },
  );
}

export function updateSellerPayoutAccount(
  state: MarketplaceState,
  actorUserId: string,
  input: SellerPayoutAccountInput,
) {
  const { actor, seller } = getSellerActorRecord(state, actorUserId);
  const createdAt = nowIso();
  validateSellerPayoutAccountInput(input);

  const nextAccount = {
    method: input.method,
    schedulePreference: input.schedulePreference,
    accountType: input.accountType,
    accountTitle: input.accountTitle?.trim() || undefined,
    accountNumber: input.accountNumber?.trim() || undefined,
    bankName: input.bankName?.trim() || undefined,
    iban: input.iban?.trim() || undefined,
    branchCode: input.branchCode?.trim() || undefined,
    mobileWalletProvider: input.mobileWalletProvider?.trim() || undefined,
    easyPaisaNumber: input.easyPaisaNumber?.trim() || undefined,
    jazzCashNumber: input.jazzCashNumber?.trim() || undefined,
    paypalEmail: input.paypalEmail?.trim() || undefined,
    walletId: input.walletId?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    adminNote:
      seller.payoutAccount?.status === "VERIFIED"
        ? "Updated by seller and awaiting fresh admin review."
        : seller.payoutAccount?.adminNote,
    rejectionReason: undefined,
    status: "PENDING_REVIEW" as const,
    submittedAt: seller.payoutAccount?.submittedAt ?? createdAt,
    updatedAt: createdAt,
    verifiedByUserId: undefined,
    verifiedAt: undefined,
    rejectedAt: undefined,
  };

  const adminNotifications = state.users
    .filter((user) => canReviewPayments(user))
    .map((adminUser) =>
      createNotification({
        userId: adminUser.id,
        type: "PAYOUT_ACCOUNT_SUBMITTED",
        title: "Seller payout account submitted",
        message: `${seller.name} updated payout account details for ${input.method.replaceAll("_", " ")} review.`,
        createdAt,
      }),
    );

  return appendStateArtifacts(
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
      notifications: [
        createNotification({
          userId: actor.id,
          type: "PAYOUT_ACCOUNT_SUBMITTED",
          title: "Payout details submitted",
          message: "Your payout account was saved and sent for admin verification.",
          createdAt,
        }),
        ...adminNotifications,
      ],
      auditTrail: [
        createAuditEntry({
          action: "SELLER_PAYOUT_ACCOUNT_UPDATED",
          actorUserId,
          actorRole: actor.role,
          note: `${seller.name} updated payout account details (${input.method}).`,
          createdAt,
        }),
      ],
    },
  );
}

export function requestSellerPayout(
  state: MarketplaceState,
  actorUserId: string,
  input: SellerPayoutRequestInput = {},
) {
  const { actor, seller } = getSellerActorRecord(state, actorUserId);
  const createdAt = nowIso();
  const payoutAccount = seller.payoutAccount;

  assert(payoutAccount, "Add payout account details before requesting a payout.");
  assert(payoutAccount.status === "VERIFIED", "Your payout account must be verified before requesting a payout.");
  assert(!seller.payoutHold, "Seller payouts are temporarily on hold for this store.");

  const openPayout = getOpenSellerPayout(state, seller.slug);

  if (openPayout) {
    const canConvertScheduledPayout =
      openPayout.requestType !== "SELLER_REQUEST" &&
      ["DRAFT", "PENDING", "SCHEDULED"].includes(openPayout.status);

    assert(
      canConvertScheduledPayout,
      "You already have an open payout in progress.",
    );

    const nextPayout = {
      ...openPayout,
      status: "PENDING_APPROVAL" as const,
      requestType: "SELLER_REQUEST" as const,
      requestedByUserId: actorUserId,
      requestedAt: createdAt,
      requestNote: input.note?.trim() || undefined,
      updatedAt: createdAt,
    };

    const adminNotifications = state.users
      .filter((user) => canReviewPayments(user))
      .map((adminUser) =>
        createNotification({
          userId: adminUser.id,
          type: "PAYOUT_REQUEST_SUBMITTED",
          title: "Scheduled payout requested for release",
          message: `${seller.name} requested manual release of ${formatCurrency(openPayout.netAmount)} from the scheduled payout queue.`,
          createdAt,
        }),
      );

    return appendStateArtifacts(
      {
        ...state,
        sellerPayouts: state.sellerPayouts.map((payout) =>
          payout.id === openPayout.id ? nextPayout : payout,
        ),
      },
      {
        notifications: [
          createNotification({
            userId: actor.id,
            type: "PAYOUT_REQUEST_SUBMITTED",
            title: "Payout request submitted",
            message: `${formatCurrency(openPayout.netAmount)} is now waiting for admin approval.`,
            createdAt,
          }),
          ...adminNotifications,
        ],
        auditTrail: [
          createAuditEntry({
            action: "SELLER_PAYOUT_REQUESTED",
            actorUserId,
            actorRole: actor.role,
            note: `${seller.name} converted scheduled payout ${openPayout.id} into a manual payout request.`,
            createdAt,
          }),
          createAuditEntry({
            action: "PAYOUT_STATUS_CHANGED",
            actorUserId,
            actorRole: actor.role,
            note: `${openPayout.id} requested by seller from scheduled queue.`,
            fromStatus: openPayout.status,
            toStatus: "PENDING_APPROVAL",
            createdAt,
          }),
        ],
      },
    );
  }

  const eligibleSettlements = getEligibleSettlementsForSeller(state, seller.slug);
  const netAmount = getRequestableSettlementBalance(state, seller.slug);
  assert(eligibleSettlements.length > 0, "No verified earnings are currently eligible for payout.");
  assert(
    netAmount >= state.payoutCycleConfig.minimumPayoutAmount,
    `Minimum payout threshold is ${state.payoutCycleConfig.minimumPayoutAmount}.`,
  );

  const payout = buildPayoutFromSettlements(state, seller.slug, eligibleSettlements, {
    createdAt,
    payoutPeriod:
      payoutAccount.schedulePreference === "WEEKLY"
        ? "WEEKLY"
        : payoutAccount.schedulePreference === "MONTHLY"
          ? "MONTHLY"
          : state.payoutCycleConfig.period,
    payoutStatus: "PENDING_APPROVAL",
    requestType: "SELLER_REQUEST",
    requestedByUserId: actorUserId,
    requestNote: input.note?.trim() || undefined,
  });
  assert(payout, "Unable to create payout batch for this seller.");

  const nextSettlements = updateSettlementStatusesForPayout(
    state.sellerSettlements,
    payout,
    createdAt,
  );

  const adminNotifications = state.users
    .filter((user) => canReviewPayments(user))
    .map((adminUser) =>
      createNotification({
        userId: adminUser.id,
        type: "PAYOUT_REQUEST_SUBMITTED",
        title: "Payout request pending approval",
        message: `${seller.name} requested ${formatCurrency(netAmount)} to ${payoutAccount.method.replaceAll("_", " ")}.`,
        createdAt,
      }),
    );

  return appendStateArtifacts(
    {
      ...state,
      sellerSettlements: nextSettlements,
      sellerPayouts: [...state.sellerPayouts, payout],
    },
    {
      notifications: [
        createNotification({
          userId: actor.id,
          type: "PAYOUT_REQUEST_SUBMITTED",
          title: "Payout request submitted",
          message: `${formatCurrency(netAmount)} is now waiting for admin approval.`,
          createdAt,
        }),
        ...adminNotifications,
      ],
      auditTrail: [
        createAuditEntry({
          action: "SELLER_PAYOUT_REQUESTED",
          actorUserId,
          actorRole: actor.role,
          note: `${seller.name} requested payout ${payout.id} for ${formatCurrency(netAmount)}.`,
          createdAt,
        }),
        createAuditEntry({
          action: "PAYOUT_CREATED",
          actorUserId,
          actorRole: actor.role,
          note: `${payout.id} created from seller request.`,
          createdAt,
        }),
        ...eligibleSettlements.map((settlement) =>
          createAuditEntry({
            action: "SETTLEMENT_STATUS_CHANGED",
            actorUserId,
            actorRole: actor.role,
            orderId: settlement.orderId,
            fromStatus: settlement.settlementStatus,
            toStatus: "IN_PAYOUT_QUEUE",
            note: `${settlement.id} moved into seller-requested payout ${payout.id}.`,
            createdAt,
          }),
        ),
      ],
    },
  );
}

export function saveSellerOwnedProduct(
  state: MarketplaceState,
  actorUserId: string,
  input: ManagedProductInput,
) {
  const { actor, seller } = getSellerActorRecord(state, actorUserId);
  const createdAt = nowIso();
  const existing = input.id
    ? state.managedProducts.find((product) => product.id === input.id)
    : undefined;

  if (existing) {
    assert(existing.sellerSlug === seller.slug, "You can only edit products from your own store.");
  }

  const productId = input.id ?? createId("product");
  const categoryExists = state.managedCategories.some((category) => category.slug === input.category);
  assert(categoryExists, "Selected category does not exist.");
  assert(input.images.length > 0 && input.images[0]?.trim(), "At least one product image is required.");
  input.images.forEach((imageUrl) => {
    assert(isHostedImageReference(imageUrl), "Each product image must be a valid uploaded image.");
  });
  assert(input.title.trim().length >= 3, "Product title is required.");
  assert(input.sku.trim().length >= 3, "SKU is required.");
  assert(input.price > 0, "Product price must be greater than zero.");
  assert(input.shortDescription.trim().length >= 20, "Short description must be more descriptive.");
  assert(input.description.trim().length >= 40, "Product description must be more descriptive.");

  const requestedStatus: MarketplaceState["managedProducts"][number]["moderationStatus"] =
    input.moderationStatus === "DRAFT" ? "DRAFT" : "ACTIVE";
  const moderationStatus: MarketplaceState["managedProducts"][number]["moderationStatus"] =
    existing?.moderationStatus === "FLAGGED"
      ? "DRAFT"
      : requestedStatus;

  const reviewRequired =
    existing?.moderationStatus === "FLAGGED"
      ? true
      : input.reviewRequired ?? existing?.reviewRequired ?? false;

  const nextProduct: MarketplaceState["managedProducts"][number] = {
    ...input,
    id: productId,
    sellerSlug: seller.slug,
    title: input.title.trim(),
    slug: input.slug.trim() || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    sku: input.sku.trim(),
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    images: input.images.map((image) => image.trim()).filter(Boolean),
    moderationStatus,
    reviewRequired,
    createdAt: existing?.createdAt ?? input.createdAt ?? createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };

  const nextState = {
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

  return appendStateArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "PRODUCT_SAVED",
        actorUserId,
        actorRole: actor.role,
        productId,
        note: `${nextProduct.title} ${existing ? "updated" : "created"} by seller dashboard.`,
        createdAt,
      }),
    ],
  });
}

export function adjustSellerOwnedInventory(
  state: MarketplaceState,
  actorUserId: string,
  input: { productId: string; quantityDelta: number; note?: string },
) {
  const { actor, seller } = getSellerActorRecord(state, actorUserId);
  const createdAt = nowIso();
  const product = state.managedProducts.find((item) => item.id === input.productId);
  assert(product, "Product not found.");
  assert(product.sellerSlug === seller.slug, "You can only adjust inventory for your own products.");
  const current = state.inventory[input.productId];
  assert(current, "Inventory record not found.");

  const nextAvailable = Math.max(0, current.available + input.quantityDelta);

  return appendStateArtifacts(
    {
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
    },
    {
      inventoryMovements: [
        {
          id: createId("inventory"),
          productId: input.productId,
          orderId: "seller-adjustment",
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
          note: `${product.title} stock adjusted by seller (${input.quantityDelta}). ${input.note ?? ""}`.trim(),
          createdAt,
        }),
      ],
    },
  );
}

export function submitProductReview(
  state: MarketplaceState,
  actorUserId: string,
  input: ProductReviewSubmissionInput,
) {
  const { actor, verifiedOrder } = resolveReviewActor(state, actorUserId, input.orderLookup);
  const product = state.managedProducts.find((item) => item.id === input.productId);
  assert(product, "Product was not found.");

  const createdAt = nowIso();
  const title = input.title.trim();
  const body = input.body.trim();
  validateReviewImages(input.imageUrls);

  assert(title.length >= 3, "Review title is required.");
  assert(body.length >= 20, "Review should be at least 20 characters.");
  assert(input.rating >= 1 && input.rating <= 5, "Review rating must be between 1 and 5.");
  assert(
    !state.managedProductReviews.some(
      (review) => review.productId === product.id && review.userId === actor.id,
    ),
    "You have already submitted a review for this product.",
  );

  const eligibleOrders = getReviewEligibleOrders(state, actor.id).filter((order) =>
    order.items.some((item) => item.productId === product.id),
  );
  const eligibleOrder = verifiedOrder
    ? eligibleOrders.find((order) => order.id === verifiedOrder.id)
    : eligibleOrders[0];
  assert(eligibleOrder, "You need to purchase and receive this product before reviewing it.");

  const nextReview: MarketplaceState["managedProductReviews"][number] = {
    id: createId("product-review"),
    productId: product.id,
    userId: actor.id,
    orderId: eligibleOrder.id,
    author: actor.isGuest ? "Guest" : actor.name,
    rating: input.rating,
    date: "Just now",
    title,
    body,
    fitment: input.rating,
    quality: input.rating,
    value: input.rating,
    verified: true,
    imageUrls: input.imageUrls?.filter(Boolean),
    isVerifiedPurchase: true,
    moderationStatus: "PENDING",
    reportedCount: 0,
    createdAt,
  };

  return appendStateArtifacts(
    {
      ...state,
      managedProductReviews: [nextReview, ...state.managedProductReviews],
    },
    {
      notifications: [
        createNotification({
          userId: actor.id,
          type: "REVIEW_SUBMITTED",
          title: "Review submitted",
          message: `Your review for ${product.title} is awaiting admin approval.`,
          orderId: eligibleOrder.id,
          createdAt,
        }),
        ...getReviewModerators(state).map((admin) =>
          createNotification({
            userId: admin.id,
            type: "REVIEW_SUBMITTED",
            title: "Product review pending",
            message: `${product.title} received a new review awaiting moderation.`,
            orderId: eligibleOrder.id,
            createdAt,
          }),
        ),
      ],
      auditTrail: [
        createAuditEntry({
          action: "REVIEW_SUBMITTED",
          actorUserId: actor.id,
          actorRole: actor.role,
          orderId: eligibleOrder.id,
          productId: product.id,
          note: `Product review submitted for ${product.title}.`,
          createdAt,
        }),
      ],
    },
  );
}

export function submitStoreReview(
  state: MarketplaceState,
  actorUserId: string,
  input: StoreReviewSubmissionInput,
) {
  const { actor, verifiedOrder } = resolveReviewActor(state, actorUserId, input.orderLookup);
  const seller = state.sellersDirectory.find((item) => item.slug === input.sellerSlug);
  assert(seller, "Seller store was not found.");

  const createdAt = nowIso();
  const title = input.title.trim();
  const body = input.body.trim();
  validateReviewImages(input.imageUrls);

  assert(title.length >= 3, "Review title is required.");
  assert(body.length >= 20, "Review should be at least 20 characters.");
  assert(input.rating >= 1 && input.rating <= 5, "Review rating must be between 1 and 5.");

  const eligibleOrders = getReviewEligibleOrders(state, actor.id).filter((order) =>
    order.items.some((item) => item.sellerSlug === seller.slug),
  );
  const eligibleOrder = verifiedOrder
    ? eligibleOrders.find((order) => order.id === verifiedOrder.id)
    : eligibleOrders.find(
        (order) =>
          !state.managedStoreReviews.some(
            (review) =>
              review.userId === actor.id &&
              review.sellerSlug === seller.slug &&
              review.orderId === order.id,
          ),
      ) ?? eligibleOrders[0];
  assert(eligibleOrder, "You can review this store only after a delivered order.");
  assert(
    !state.managedStoreReviews.some(
      (review) =>
        review.userId === actor.id &&
        review.sellerSlug === seller.slug &&
        review.orderId === eligibleOrder.id,
    ),
    "You have already reviewed this store for the verified order.",
  );

  const nextReview: MarketplaceState["managedStoreReviews"][number] = {
    id: createId("store-review"),
    sellerSlug: seller.slug,
    userId: actor.id,
    orderId: eligibleOrder.id,
    author: actor.isGuest ? "Guest" : actor.name,
    rating: input.rating,
    date: "Just now",
    title,
    body,
    service: input.rating,
    delivery: input.rating,
    communication: input.rating,
    imageUrls: input.imageUrls?.filter(Boolean),
    isVerifiedPurchase: true,
    moderationStatus: "PENDING",
    reportedCount: 0,
    createdAt,
  };

  return appendStateArtifacts(
    {
      ...state,
      managedStoreReviews: [nextReview, ...state.managedStoreReviews],
    },
    {
      notifications: [
        createNotification({
          userId: actor.id,
          type: "REVIEW_SUBMITTED",
          title: "Store review submitted",
          message: `Your review for ${seller.name} is awaiting admin approval.`,
          orderId: eligibleOrder.id,
          createdAt,
        }),
        ...getReviewModerators(state).map((admin) =>
          createNotification({
            userId: admin.id,
            type: "REVIEW_SUBMITTED",
            title: "Store review pending",
            message: `${seller.name} received a new store review awaiting moderation.`,
            orderId: eligibleOrder.id,
            createdAt,
          }),
        ),
      ],
      auditTrail: [
        createAuditEntry({
          action: "REVIEW_SUBMITTED",
          actorUserId: actor.id,
          actorRole: actor.role,
          orderId: eligibleOrder.id,
          note: `Store review submitted for ${seller.name}.`,
          createdAt,
        }),
      ],
    },
  );
}

export function saveCustomerAddress(
  state: MarketplaceState,
  actorUserId: string,
  input: CustomerAddressInput,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can manage saved addresses.");

  const account = getCustomerAccountRecord(state, actorUserId);
  const addressId = input.id ?? createId("address");
  const nextAddress = {
    id: addressId,
    label: input.label.trim(),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    addressLine: input.addressLine.trim(),
    city: input.city.trim(),
    province: input.province.trim(),
    postalCode: input.postalCode.trim(),
    isDefault: input.isDefault ?? account.addresses.length === 0,
  };

  assert(nextAddress.label.length >= 2, "Address label is required.");
  assert(nextAddress.fullName.length >= 2, "Recipient name is required.");
  assert(nextAddress.phone.length >= 8, "Phone number is required.");
  assert(nextAddress.addressLine.length >= 5, "Address line is required.");
  assert(nextAddress.city.length >= 2, "City is required.");
  assert(nextAddress.province.length >= 2, "Province is required.");
  assert(nextAddress.postalCode.length >= 4, "Postal code is required.");

  let addresses = account.addresses.some((address) => address.id === addressId)
    ? account.addresses.map((address) =>
        address.id === addressId ? nextAddress : address,
      )
    : [...account.addresses, nextAddress];

  if (nextAddress.isDefault) {
    addresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === addressId,
    }));
  }

  if (!addresses.some((address) => address.isDefault) && addresses.length > 0) {
    addresses = addresses.map((address, index) => ({
      ...address,
      isDefault: index === 0,
    }));
  }

  return {
    ...state,
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        addresses,
      },
    },
  };
}

export function deleteCustomerAddress(
  state: MarketplaceState,
  actorUserId: string,
  addressId: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can manage saved addresses.");

  const account = getCustomerAccountRecord(state, actorUserId);
  let addresses = account.addresses.filter((address) => address.id !== addressId);

  if (!addresses.some((address) => address.isDefault) && addresses.length > 0) {
    addresses = addresses.map((address, index) => ({
      ...address,
      isDefault: index === 0,
    }));
  }

  return {
    ...state,
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        addresses,
      },
    },
  };
}

export function saveCustomerVehicle(
  state: MarketplaceState,
  actorUserId: string,
  input: SavedVehicleInput,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can manage saved vehicles.");

  const account = getCustomerAccountRecord(state, actorUserId);
  const vehicleId = input.id ?? createId("vehicle");
  const nextVehicle = {
    id: vehicleId,
    nickname: input.nickname.trim(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    engine: input.engine.trim(),
    isPrimary: input.isPrimary ?? account.savedVehicles.length === 0,
  };

  assert(nextVehicle.nickname.length >= 2, "Vehicle nickname is required.");
  assert(nextVehicle.brand.length >= 2, "Vehicle brand is required.");
  assert(nextVehicle.model.length >= 2, "Vehicle model is required.");
  assert(nextVehicle.year >= 1990, "Vehicle year must be valid.");
  assert(nextVehicle.engine.length >= 2, "Vehicle engine is required.");

  let savedVehicles = account.savedVehicles.some((vehicle) => vehicle.id === vehicleId)
    ? account.savedVehicles.map((vehicle) =>
        vehicle.id === vehicleId ? nextVehicle : vehicle,
      )
    : [...account.savedVehicles, nextVehicle];

  if (nextVehicle.isPrimary) {
    savedVehicles = savedVehicles.map((vehicle) => ({
      ...vehicle,
      isPrimary: vehicle.id === vehicleId,
    }));
  }

  if (!savedVehicles.some((vehicle) => vehicle.isPrimary) && savedVehicles.length > 0) {
    savedVehicles = savedVehicles.map((vehicle, index) => ({
      ...vehicle,
      isPrimary: index === 0,
    }));
  }

  return {
    ...state,
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        savedVehicles,
      },
    },
  };
}

export function deleteCustomerVehicle(
  state: MarketplaceState,
  actorUserId: string,
  vehicleId: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can manage saved vehicles.");

  const account = getCustomerAccountRecord(state, actorUserId);
  let savedVehicles = account.savedVehicles.filter((vehicle) => vehicle.id !== vehicleId);

  if (!savedVehicles.some((vehicle) => vehicle.isPrimary) && savedVehicles.length > 0) {
    savedVehicles = savedVehicles.map((vehicle, index) => ({
      ...vehicle,
      isPrimary: index === 0,
    }));
  }

  return {
    ...state,
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        savedVehicles,
      },
    },
  };
}

export function toggleWishlistProduct(
  state: MarketplaceState,
  actorUserId: string,
  productId: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can manage wishlist items.");
  assert(products.some((product) => product.id === productId), "Product not found.");

  const account = getCustomerAccountRecord(state, actorUserId);
  const wishlistProductIds = account.wishlistProductIds.includes(productId)
    ? account.wishlistProductIds.filter((candidate) => candidate !== productId)
    : [productId, ...account.wishlistProductIds];

  return {
    ...state,
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        wishlistProductIds,
      },
    },
  };
}

export function updateCustomerPreferences(
  state: MarketplaceState,
  actorUserId: string,
  input: CustomerPreferencesUpdate,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can update account preferences.");

  const account = getCustomerAccountRecord(state, actorUserId);

  return {
    ...state,
    customerAccounts: {
      ...state.customerAccounts,
      [actorUserId]: {
        ...account,
        preferences: {
          ...account.preferences,
          ...input,
        },
      },
    },
  };
}

export function markAllNotificationsRead(
  state: MarketplaceState,
  actorUserId: string,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can manage account notifications.");

  const readAt = nowIso();

  return {
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.userId === actorUserId && !notification.readAt
        ? {
            ...notification,
            readAt,
          }
        : notification,
    ),
  };
}

export function placeOrderFromCheckout(
  state: MarketplaceState,
  actorUserId: string,
  input: CheckoutSubmission,
) {
  const createdAt = nowIso();
  const sessionActor = state.users.find((user) => user.id === actorUserId);

  let checkoutState = state;
  let checkoutActor = sessionActor;
  let checkoutUserId = actorUserId;
  let cartOwnerId = actorUserId;

  if (sessionActor && isCustomer(sessionActor)) {
    checkoutUserId = sessionActor.id;
    cartOwnerId = sessionActor.id;
  } else {
    assert(!sessionActor, "Switch to a customer account to place marketplace orders.");
    const guestCheckout = upsertGuestCheckoutCustomer(state, input, createdAt);
    checkoutState = guestCheckout.state;
    checkoutActor = guestCheckout.guestUser;
    checkoutUserId = guestCheckout.guestUser.id;
    cartOwnerId = GUEST_CART_USER_ID;
  }

  assert(checkoutActor, "Customer identity could not be prepared for checkout.");

  const cartDetailedLines = getCartDetailedLines(checkoutState, cartOwnerId);
  assert(cartDetailedLines.length > 0, "Your cart is empty.");
  assert(input.shippingAddress.fullName.trim(), "Full name is required.");
  assert(input.shippingAddress.phone.trim(), "Phone number is required.");
  assert(input.shippingAddress.addressLine.trim(), "Address line is required.");
  assert(input.shippingAddress.city.trim(), "City is required.");
  assert(input.shippingAddress.province.trim(), "Province is required.");
  assert(input.shippingAddress.postalCode.trim(), "Postal code is required.");

  const groupedSellerSlugs = Array.from(
    new Set(cartDetailedLines.map((item) => item.seller.slug)),
  );

  assert(
    groupedSellerSlugs.every((sellerSlug) =>
        input.sellerShippingSelections.some((selection) => selection.sellerSlug === sellerSlug),
    ),
    "Shipping selection is missing for one or more sellers.",
  );

  const orderId = createId("order");
  const paymentId = createId("payment");
  const paymentMethod = input.paymentMethod;
  const items = cartDetailedLines.map(({ line, product, seller }) => ({
    id: `${orderId}-item-${product.id}`,
    productId: product.id,
    sellerSlug: seller.slug,
    title: product.title,
    brand: product.brand,
    sku: product.sku,
    image: product.images[0],
    unitPrice: product.price,
    quantity: line.qty,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shippingRaw = input.sellerShippingSelections.reduce(
    (sum, selection) => sum + selection.price,
    0,
  );
  const shippingThreshold = checkoutState.systemSettings.shipping.freeShippingThreshold;
  const shipping = subtotal > shippingThreshold ? 0 : shippingRaw;
  const appliedCouponState = getCartCouponState(checkoutState, cartOwnerId);
  assert(
    appliedCouponState.status !== "invalid",
    appliedCouponState.reason ?? "Remove the invalid coupon before placing the order.",
  );
  const discount = appliedCouponState.status === "applied" ? appliedCouponState.discount : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const order: MarketplaceOrder = {
    id: orderId,
    orderNumber: createOrderNumber(checkoutState),
    customerUserId: checkoutUserId,
    customerType: checkoutActor.isGuest ? "GUEST" : "REGISTERED",
    customerEmail: input.guestEmail?.trim() || checkoutActor.email,
    status: "PENDING",
    paymentId,
    paymentMethod,
    items,
    shippingAddress: input.shippingAddress,
    sellerShippingSelections: input.sellerShippingSelections,
    sellerFulfillments: createSellerFulfillments(items, "PENDING", createdAt),
    totals: { subtotal, discount, shipping, total },
    appliedCoupon:
      appliedCouponState.status === "applied"
        ? {
            couponId: appliedCouponState.coupon.id,
            code: appliedCouponState.coupon.code,
            description: appliedCouponState.coupon.description,
            type: appliedCouponState.coupon.type,
            scope: appliedCouponState.coupon.scope,
            value: appliedCouponState.coupon.value,
            maxDiscountAmount: appliedCouponState.coupon.maxDiscountAmount,
            eligibleCategorySlugs: appliedCouponState.coupon.eligibleCategorySlugs,
            discountAmount: appliedCouponState.discount,
          }
        : undefined,
    inventoryCommittedAt: null,
    inventoryReleasedAt: null,
    createdAt,
    updatedAt: createdAt,
  };

  const payment: PaymentRecord = {
    id: paymentId,
    orderId,
    method: paymentMethod,
    status: paymentMethod === "COD" ? "PENDING" : "REQUIRES_PROOF",
    amountDue: total,
    proofIds: [],
    activeProofId: null,
    instructionsSnapshot:
      paymentMethod === "COD"
        ? undefined
        : state.paymentSettings.manualInstructions[paymentMethod],
    createdAt,
    updatedAt: createdAt,
  };

  let nextState: MarketplaceState = {
    ...checkoutState,
    orders: [...checkoutState.orders, order],
    payments: [...checkoutState.payments, payment],
    coupons:
      appliedCouponState.status === "applied"
        ? checkoutState.coupons.map((coupon) =>
            coupon.id === appliedCouponState.coupon.id
              ? {
                  ...coupon,
                  usageCount: coupon.usageCount + 1,
                  usedByUserIds: Array.from(
                    new Set([
                      ...coupon.usedByUserIds,
                      checkoutUserId,
                      ...(cartOwnerId !== checkoutUserId ? [cartOwnerId] : []),
                    ]),
                  ),
                }
              : coupon,
          )
        : checkoutState.coupons,
    cartsByUserId: {
      ...checkoutState.cartsByUserId,
      [cartOwnerId]: [],
    },
    appliedCouponCodesByUserId: clearAppliedCouponCode(checkoutState, cartOwnerId),
  };

  nextState = syncOrderFinancialLedgerState(nextState, order, createdAt);

  nextState = appendStateArtifacts(nextState, {
    auditTrail: [
      createAuditEntry({
        action: "ORDER_CREATED",
        actorUserId: checkoutUserId,
        actorRole: checkoutActor.role,
        orderId,
        paymentId,
        toStatus: order.status,
        note:
          appliedCouponState.status === "applied"
            ? `${order.orderNumber} created with ${paymentMethod} and coupon ${appliedCouponState.coupon.code}.`
            : `${order.orderNumber} created with ${paymentMethod}.`,
        createdAt,
      }),
      createAuditEntry({
        action: "PAYMENT_STATUS_CHANGED",
        actorUserId: checkoutUserId,
        actorRole: checkoutActor.role,
        orderId,
        paymentId,
        toStatus: payment.status,
        createdAt,
      }),
    ],
  });

  if (paymentMethod === "COD") {
    nextState = updateOrderAndPaymentStatus(nextState, order.id, payment.id, {
      orderStatus: "CONFIRMED",
      paymentStatus: "PENDING",
      updatedAt: createdAt,
    });

    nextState = commitInventoryForOrder(nextState, order, checkoutUserId, createdAt, "ORDER_CONFIRMED");
    nextState = appendStateArtifacts(nextState, {
      notifications: [
        createNotification({
          userId: checkoutUserId,
          type: "ORDER_CONFIRMED",
          title: "Order confirmed",
          message: `${order.orderNumber} is confirmed for fulfilment. Cash will be collected at delivery and verified by SpareKart before seller payout release.`,
          orderId,
          paymentId,
          createdAt,
        }),
        ...addSellerNotifications(nextState, order, createdAt),
      ],
      auditTrail: [
        createAuditEntry({
          action: "ORDER_STATUS_CHANGED",
          actorUserId: checkoutUserId,
          actorRole: checkoutActor.role,
          orderId,
          fromStatus: "PENDING",
          toStatus: "CONFIRMED",
          createdAt,
        }),
      ],
    });

    return { state: nextState, orderId };
  }

  if (input.paymentProof) {
    const proof = createProofRecord(nextState, payment, order, checkoutUserId, input.paymentProof, createdAt);

    nextState = {
      ...nextState,
      paymentProofs: [...nextState.paymentProofs, proof],
      payments: nextState.payments.map((candidate) =>
        candidate.id === payment.id
          ? {
              ...candidate,
              proofIds: [...candidate.proofIds, proof.id],
            }
          : candidate,
      ),
    };

    nextState = updateOrderAndPaymentStatus(nextState, order.id, payment.id, {
      orderStatus: "AWAITING_PAYMENT_VERIFICATION",
      paymentStatus: "PROOF_SUBMITTED",
      activeProofId: proof.id,
      updatedAt: createdAt,
    });
    nextState = syncOrderFinancialLedgerState(
      nextState,
      getOrderById(nextState, order.id) ?? {
        ...order,
        status: "AWAITING_PAYMENT_VERIFICATION",
        updatedAt: createdAt,
      },
      createdAt,
    );

    nextState = addProofSubmittedArtifacts(nextState, checkoutUserId, order, payment, proof, createdAt);

    return { state: nextState, orderId };
  }

  nextState = updateOrderAndPaymentStatus(nextState, order.id, payment.id, {
    orderStatus: "AWAITING_PAYMENT_PROOF",
    paymentStatus: "REQUIRES_PROOF",
    updatedAt: createdAt,
  });
  nextState = syncOrderFinancialLedgerState(
    nextState,
    getOrderById(nextState, order.id) ?? {
      ...order,
      status: "AWAITING_PAYMENT_PROOF",
      updatedAt: createdAt,
    },
    createdAt,
  );

  nextState = appendStateArtifacts(nextState, {
    notifications: [
      createNotification({
        userId: checkoutUserId,
        type: "ORDER_AWAITING_PROOF",
        title: "Payment proof required",
        message: `${order.orderNumber} is waiting for payment proof before admin review can begin.`,
        orderId,
        paymentId,
        createdAt,
      }),
    ],
    auditTrail: [
      createAuditEntry({
        action: "ORDER_STATUS_CHANGED",
        actorUserId: checkoutUserId,
        actorRole: checkoutActor.role,
        orderId,
        fromStatus: order.status,
        toStatus: "AWAITING_PAYMENT_PROOF",
        createdAt,
      }),
    ],
  });

  return { state: nextState, orderId };
}

export function submitPaymentProof(
  state: MarketplaceState,
  actorUserId: string,
  orderId: string,
  proofInput: PaymentProofSubmission,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(isCustomer(actor), "Only customers can submit payment proof.");

  const order = getOrderById(state, orderId);
  assert(order, "Order not found.");
  assert(order.customerUserId === actorUserId, "You can only upload proof for your own orders.");

  const payment = getPaymentById(state, order.paymentId);
  assert(payment, "Payment record not found.");
  assert(payment.method !== "COD", "Cash on Delivery orders do not accept payment proof.");
  assert(
    payment.status === "REQUIRES_PROOF" || payment.status === "REJECTED",
    "This order is not ready for another proof submission.",
  );

  const createdAt = nowIso();
  const proof = createProofRecord(state, payment, order, actorUserId, proofInput, createdAt);

  let nextState: MarketplaceState = {
    ...state,
    paymentProofs: [...state.paymentProofs, proof],
    orders: state.orders.map((candidate) =>
      candidate.id === order.id
        ? syncOrderFulfillments(candidate, "AWAITING_PAYMENT_VERIFICATION", createdAt)
        : candidate,
    ),
    payments: state.payments.map((candidate) =>
      candidate.id === payment.id
        ? {
            ...candidate,
            proofIds: [...candidate.proofIds, proof.id],
            activeProofId: proof.id,
            status: "PROOF_SUBMITTED",
            updatedAt: createdAt,
          }
        : candidate,
    ),
  };
  nextState = syncOrderFinancialLedgerState(
    nextState,
    getOrderById(nextState, order.id) ?? {
      ...order,
      status: "AWAITING_PAYMENT_VERIFICATION",
      updatedAt: createdAt,
    },
    createdAt,
  );

  nextState = addProofSubmittedArtifacts(nextState, actorUserId, order, payment, proof, createdAt);

  return { state: nextState, proofId: proof.id };
}

export function submitPaymentProofByLookup(
  state: MarketplaceState,
  lookupInput: {
    orderNumber: string;
    contact: string;
  },
  proofInput: PaymentProofSubmission,
) {
  const order = lookupOrderByReference(state, lookupInput);
  assert(order, "We could not verify that order with the provided phone or email.");
  const customer = state.users.find((user) => user.id === order.customerUserId);
  assert(
    customer?.role === "CUSTOMER" && customer.isGuest,
    "Direct order lookup proof submission is only available for guest orders.",
  );

  return submitPaymentProof(state, customer.id, order.id, proofInput);
}

export function submitCODCollectionProof(
  state: MarketplaceState,
  actorUserId: string,
  orderId: string,
  proofInput: CODPaymentProofSubmission,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Current user was not found.");
  assert(canReviewPayments(actor), "Only admins can capture COD payment proof.");

  const order = getOrderById(state, orderId);
  assert(order, "Order not found.");
  const payment = getPaymentById(state, order.paymentId);
  assert(payment, "Payment record not found.");
  assert(payment.method === "COD", "This workflow only supports COD orders.");
  assert(
    payment.status === "PENDING" || payment.status === "REJECTED",
    "This COD order is not ready for another collection proof submission.",
  );

  const createdAt = nowIso();
  const proof = createCODCollectionProofRecord(
    state,
    payment,
    order,
    actorUserId,
    actor.role,
    proofInput,
    createdAt,
  );

  const receivedAmount = proof.amountPaid ?? order.totals.total;
  const discrepancyDelta = roundMoney(receivedAmount - order.totals.total);
  const discrepancyStatus =
    discrepancyDelta === 0 ? "NONE" : discrepancyDelta < 0 ? "SHORT" : "OVER";
  const remittanceStatus = discrepancyStatus === "NONE" ? "REMITTED_TO_MARKETPLACE" : "ISSUE_FLAGGED";

  let nextState: MarketplaceState = {
    ...state,
    paymentProofs: [...state.paymentProofs, proof],
    codRemittances: ensureCODRemittanceRecord(state, order, payment, createdAt).map((entry) =>
      entry.orderId === order.id
        ? {
            ...entry,
            receivedAmount,
            deliveryPartnerName: proof.deliveryPartnerName,
            deliveryPartnerPhone: proof.deliveryPartnerPhone,
            cashCollectedAt: proof.paymentDateTime ?? createdAt,
            remittedAt: createdAt,
            remittanceReference: proof.transactionReference,
            supportingProofId: proof.id,
            discrepancyStatus,
            status: remittanceStatus,
            adminNote:
              discrepancyStatus === "NONE"
                ? entry.adminNote
                : `Expected ${formatCurrency(order.totals.total)} but received ${formatCurrency(receivedAmount)}.`,
            updatedAt: createdAt,
          }
        : entry,
    ),
    payments: state.payments.map((candidate) =>
      candidate.id === payment.id
        ? {
            ...candidate,
            proofIds: [...candidate.proofIds, proof.id],
            activeProofId: proof.id,
            status: "UNDER_REVIEW",
            updatedAt: createdAt,
          }
        : candidate,
    ),
  };

  nextState = addCODProofSubmittedArtifacts(nextState, actorUserId, order, payment, proof, createdAt);

  return { state: nextState, proofId: proof.id };
}

export function approvePaymentProof(
  state: MarketplaceState,
  actorUserId: string,
  input: PaymentProofReview,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Current user was not found.");
  assert(canReviewPayments(actor), "Only admins can verify payment proofs.");

  const proof = getProofById(state, input.proofId);
  assert(proof, "Payment proof not found.");
  assert(proof.status === "SUBMITTED", "Only submitted payment proofs can be approved.");

  const order = getOrderById(state, proof.orderId);
  assert(order, "Linked order not found.");
  const payment = getPaymentById(state, proof.paymentId);
  assert(payment, "Linked payment not found.");
  assert(payment.activeProofId === proof.id, "Only the latest active proof can be approved.");
  assert(payment.status !== "PAID", "This payment is already approved.");

  const approvedAt = nowIso();

  let nextState = {
    ...state,
    paymentProofs: state.paymentProofs.map((candidate) =>
      candidate.id === proof.id
        ? {
            ...candidate,
            status: "APPROVED" as const,
            adminNote: input.adminNote?.trim(),
            verifiedByUserId: actorUserId,
            verifiedAt: approvedAt,
            updatedAt: approvedAt,
          }
        : candidate,
    ),
  };

  const isCODCollection = payment.method === "COD" || proof.proofKind === "COD_COLLECTION";

  if (isCODCollection) {
    assert(order.status === "DELIVERED", "COD payments can only be approved after delivery.");

    nextState = {
      ...nextState,
      codRemittances: nextState.codRemittances.map((entry) =>
        entry.orderId === order.id
          ? {
              ...entry,
              status: "REMITTANCE_CONFIRMED",
              discrepancyStatus: entry.discrepancyStatus === "UNRESOLVED" ? "NONE" : entry.discrepancyStatus,
              confirmedByUserId: actorUserId,
              confirmedAt: approvedAt,
              receiptReference: input.adminNote?.trim() || entry.receiptReference,
              adminNote: input.adminNote?.trim() || entry.adminNote,
              updatedAt: approvedAt,
            }
          : entry,
      ),
      payments: nextState.payments.map((candidate) =>
      candidate.id === payment.id
        ? {
            ...candidate,
            status: "PAID",
            verifiedByUserId: actorUserId,
            verifiedAt: approvedAt,
            commissionCalculatedAt: approvedAt,
            updatedAt: approvedAt,
          }
        : candidate,
      ),
    };

    nextState = updateOrderFinancialsAfterVerification(
      nextState,
      order,
      actorUserId,
      actor.role,
      approvedAt,
    );

    nextState = appendStateArtifacts(nextState, {
      notifications: [
        createNotification({
          userId: order.customerUserId,
          type: "COD_PAYMENT_CONFIRMED",
          title: "COD payment verified",
          message: `${order.orderNumber} cash collection has been verified by SpareKart.`,
          orderId: order.id,
          paymentId: payment.id,
          proofId: proof.id,
          createdAt: approvedAt,
        }),
        ...getSellerUsersForOrder(nextState, order).map((sellerUser) =>
          createNotification({
            userId: sellerUser.id,
            type: "COD_REMITTANCE_CONFIRMED",
            title: "COD remittance confirmed",
            message: `${order.orderNumber} remittance has been confirmed and seller settlements can now move forward.`,
            orderId: order.id,
            paymentId: payment.id,
            proofId: proof.id,
            createdAt: approvedAt,
          }),
        ),
      ],
      auditTrail: [
        createAuditEntry({
          action: "COD_COLLECTION_APPROVED",
          actorUserId,
          actorRole: actor.role,
          orderId: order.id,
          paymentId: payment.id,
          proofId: proof.id,
          note: input.adminNote?.trim(),
          createdAt: approvedAt,
        }),
        createAuditEntry({
          action: "PAYMENT_STATUS_CHANGED",
          actorUserId,
          actorRole: actor.role,
          orderId: order.id,
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: "PAID",
          createdAt: approvedAt,
        }),
        createAuditEntry({
          action: "COD_REMITTANCE_CONFIRMED",
          actorUserId,
          actorRole: actor.role,
          orderId: order.id,
          paymentId: payment.id,
          proofId: proof.id,
          note: input.adminNote?.trim() || "COD remittance confirmed.",
          createdAt: approvedAt,
        }),
      ],
    });

    return { state: nextState };
  }

  nextState = updateOrderAndPaymentStatus(nextState, order.id, payment.id, {
    orderStatus: "CONFIRMED",
    paymentStatus: "PAID",
    updatedAt: approvedAt,
  });

  nextState = {
    ...nextState,
    payments: nextState.payments.map((candidate) =>
      candidate.id === payment.id
        ? {
            ...candidate,
            verifiedByUserId: actorUserId,
            verifiedAt: approvedAt,
            commissionCalculatedAt: approvedAt,
            updatedAt: approvedAt,
          }
        : candidate,
    ),
  };

  nextState = commitInventoryForOrder(nextState, order, actorUserId, approvedAt, "ORDER_CONFIRMED");
  const confirmedOrder = getOrderById(nextState, order.id) ?? {
    ...order,
    status: "CONFIRMED",
    updatedAt: approvedAt,
  };
  nextState = updateOrderFinancialsAfterVerification(
    nextState,
    confirmedOrder,
    actorUserId,
    actor.role,
    approvedAt,
  );
  nextState = appendStateArtifacts(nextState, {
    notifications: [
      createNotification({
        userId: order.customerUserId,
        type: "PAYMENT_PROOF_APPROVED",
        title: "Payment approved",
        message: `${order.orderNumber} has been approved and confirmed.`,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        createdAt: approvedAt,
      }),
      ...addSellerNotifications(nextState, order, approvedAt),
    ],
    auditTrail: [
      createAuditEntry({
        action: "PAYMENT_PROOF_APPROVED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        note: input.adminNote?.trim(),
        createdAt: approvedAt,
      }),
      createAuditEntry({
        action: "PAYMENT_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        fromStatus: payment.status,
        toStatus: "PAID",
        createdAt: approvedAt,
      }),
      createAuditEntry({
        action: "ORDER_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "CONFIRMED",
        createdAt: approvedAt,
      }),
    ],
  });

  return { state: nextState };
}

export function rejectPaymentProof(
  state: MarketplaceState,
  actorUserId: string,
  input: PaymentProofReview,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Current user was not found.");
  assert(canReviewPayments(actor), "Only admins can reject payment proofs.");
  assert(input.adminNote?.trim(), "Admin note is required when rejecting payment proof.");

  const proof = getProofById(state, input.proofId);
  assert(proof, "Payment proof not found.");
  assert(proof.status === "SUBMITTED", "Only submitted payment proofs can be rejected.");

  const order = getOrderById(state, proof.orderId);
  assert(order, "Linked order not found.");
  const payment = getPaymentById(state, proof.paymentId);
  assert(payment, "Linked payment not found.");
  assert(payment.activeProofId === proof.id, "Only the latest active proof can be rejected.");

  const rejectedAt = nowIso();
  let nextState: MarketplaceState = {
    ...state,
    paymentProofs: state.paymentProofs.map((candidate) =>
      candidate.id === proof.id
        ? {
            ...candidate,
            status: "REJECTED" as const,
            adminNote: input.adminNote?.trim(),
            verifiedByUserId: actorUserId,
            verifiedAt: rejectedAt,
            updatedAt: rejectedAt,
          }
        : candidate,
    ),
  };

  const isCODCollection = payment.method === "COD" || proof.proofKind === "COD_COLLECTION";

  if (isCODCollection) {
    nextState = {
      ...nextState,
      codRemittances: nextState.codRemittances.map((entry) =>
        entry.orderId === order.id
          ? {
              ...entry,
              status: "ISSUE_FLAGGED",
              adminNote: input.adminNote?.trim(),
              updatedAt: rejectedAt,
            }
          : entry,
      ),
      sellerSettlements: nextState.sellerSettlements.map((settlement) =>
        settlement.orderId === order.id
          ? {
              ...settlement,
              settlementStatus: "ON_HOLD",
              holdReason: input.adminNote?.trim(),
              updatedAt: rejectedAt,
            }
          : settlement,
      ),
      payments: nextState.payments.map((candidate) =>
        candidate.id === payment.id
          ? {
              ...candidate,
              status: "REJECTED",
              updatedAt: rejectedAt,
            }
          : candidate,
      ),
    };

    nextState = appendStateArtifacts(nextState, {
      notifications: [
        createNotification({
          userId: order.customerUserId,
          type: "COD_COLLECTION_REJECTED",
          title: "COD verification needs review",
          message: `${order.orderNumber} cash collection proof was rejected. SpareKart will re-check the delivery settlement.`,
          orderId: order.id,
          paymentId: payment.id,
          proofId: proof.id,
          createdAt: rejectedAt,
        }),
        ...addSellerNotifications(nextState, order, rejectedAt, {
          type: "COD_COLLECTION_REJECTED",
          title: "COD collection proof rejected",
          message: `${order.orderNumber} payout is on hold until SpareKart receives a valid COD receipt.`,
        }),
      ],
      auditTrail: [
        createAuditEntry({
          action: "COD_COLLECTION_REJECTED",
          actorUserId,
          actorRole: actor.role,
          orderId: order.id,
          paymentId: payment.id,
          proofId: proof.id,
          note: input.adminNote!.trim(),
          createdAt: rejectedAt,
        }),
        createAuditEntry({
          action: "PAYMENT_STATUS_CHANGED",
          actorUserId,
          actorRole: actor.role,
          orderId: order.id,
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: "REJECTED",
          createdAt: rejectedAt,
        }),
        createAuditEntry({
          action: "COD_REMITTANCE_FLAGGED",
          actorUserId,
          actorRole: actor.role,
          orderId: order.id,
          paymentId: payment.id,
          proofId: proof.id,
          note: input.adminNote!.trim(),
          createdAt: rejectedAt,
        }),
      ],
    });

    return { state: nextState };
  }

  nextState = updateOrderAndPaymentStatus(nextState, order.id, payment.id, {
    orderStatus: "AWAITING_PAYMENT_PROOF",
    paymentStatus: "REJECTED",
    updatedAt: rejectedAt,
  });
  nextState = syncOrderFinancialLedgerState(
    nextState,
    getOrderById(nextState, order.id) ?? {
      ...order,
      status: "AWAITING_PAYMENT_PROOF",
      updatedAt: rejectedAt,
    },
    rejectedAt,
  );

  nextState = appendStateArtifacts(nextState, {
    notifications: [
      createNotification({
        userId: order.customerUserId,
        type: "PAYMENT_PROOF_REJECTED",
        title: "Payment proof rejected",
        message: `${order.orderNumber} needs a new payment proof submission. Admin note: ${input.adminNote!.trim()}`,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        createdAt: rejectedAt,
      }),
      ...addSellerNotifications(nextState, order, rejectedAt, {
        type: "PAYMENT_PROOF_REJECTED",
        title: "Payment rejected",
        message: `${order.orderNumber} is blocked until the customer resubmits payment proof.`,
      }),
    ],
    auditTrail: [
      createAuditEntry({
        action: "PAYMENT_PROOF_REJECTED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        proofId: proof.id,
        note: input.adminNote!.trim(),
        createdAt: rejectedAt,
      }),
      createAuditEntry({
        action: "PAYMENT_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        fromStatus: payment.status,
        toStatus: "REJECTED",
        createdAt: rejectedAt,
      }),
      createAuditEntry({
        action: "ORDER_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "AWAITING_PAYMENT_PROOF",
        createdAt: rejectedAt,
      }),
    ],
  });

  return { state: nextState };
}

export function advanceOrderStatus(
  state: MarketplaceState,
  actorUserId: string,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const actor = state.users.find((user) => user.id === actorUserId);
  assert(actor, "Current user was not found.");
  assert(isSeller(actor), "Only sellers can update fulfilment workflow status.");
  assert(actor.sellerSlug, "Seller store context is missing.");

  const order = getOrderById(state, orderId);
  assert(order, "Order not found.");
  const payment = getPaymentById(state, order.paymentId);
  assert(payment, "Payment record not found.");
  const sellerFulfillment = getSellerFulfillmentForOrder(order, actor.sellerSlug);
  assert(sellerFulfillment, "You can only manage orders assigned to your store.");

  const allowedTransitions = getAllowedSellerOrderTransitions(sellerFulfillment.status);
  assert(
    allowedTransitions.includes(nextStatus as typeof allowedTransitions[number]),
    `Your store cannot move this order from ${sellerFulfillment.status} to ${nextStatus}.`,
  );
  assert(
    order.status === "CONFIRMED" ||
      order.status === "PROCESSING" ||
      order.status === "SHIPPED",
    "This order is not yet ready for seller fulfilment updates.",
  );

  const updatedAt = nowIso();
  const previousOrderStatus = order.status;
  const nextOrder = updateSellerFulfillmentStatus(
    order,
    actor.sellerSlug,
    nextStatus as Extract<OrderStatus, "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED">,
    updatedAt,
  );
  const sellerRecord = state.sellersDirectory.find((seller) => seller.slug === actor.sellerSlug);
  const sellerLabel = sellerRecord?.name ?? actor.name;
  const notificationConfig = getOrderProgressNotificationConfig(nextStatus);

  let nextState: MarketplaceState = {
    ...state,
    orders: state.orders.map((candidate) =>
      candidate.id === order.id
        ? nextOrder.status === "CANCELED"
          ? { ...nextOrder, inventoryReleasedAt: updatedAt }
          : nextOrder
        : candidate,
    ),
  };

  nextState = syncOrderFinancialLedgerState(nextState, nextOrder, updatedAt);

  if (nextStatus === "CANCELED") {
    nextState = restockInventoryForSellerItems(
      nextState,
      order,
      actor.sellerSlug,
      actorUserId,
      updatedAt,
    );
    nextState = {
      ...nextState,
      commissions: deactivateOrderCommissions(nextState, order.id, updatedAt),
      sellerSettlements: nextState.sellerSettlements.map((settlement) =>
        settlement.orderId === order.id
          ? {
              ...settlement,
              payoutId: undefined,
              settlementStatus: "FAILED",
              updatedAt,
              note: `${sellerLabel} canceled seller fulfillment before settlement.`,
            }
          : settlement,
      ),
      sellerPayouts: removeOrderFromOpenPayouts(
        nextState.sellerPayouts,
        order.id,
        nextState.commissions,
        nextState.sellerSettlements,
        updatedAt,
      ),
    };
  }

  if (nextOrder.status === "DELIVERED" && payment.status === "PAID") {
    nextState = updateOrderFinancialsAfterVerification(
      nextState,
      nextOrder,
      actorUserId,
      actor.role,
      updatedAt,
    );
  }

  nextState = appendStateArtifacts(nextState, {
    notifications: [
      createNotification({
        userId: order.customerUserId,
        type: notificationConfig.type,
        title: notificationConfig.title,
        message:
          nextStatus === "CANCELED"
            ? `${sellerLabel} canceled its part of ${order.orderNumber}.`
            : `${sellerLabel} moved ${order.orderNumber} to ${nextStatus.replaceAll("_", " ")}.`,
        orderId: order.id,
        paymentId: payment.id,
        createdAt: updatedAt,
      }),
      ...state.users
        .filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN")
        .map((adminUser) =>
          createNotification({
            userId: adminUser.id,
            type:
              nextOrder.status === "DELIVERED" && payment.method === "COD" && payment.status !== "PAID"
                ? "COD_REMITTANCE_PENDING"
                : notificationConfig.type,
            title:
              nextOrder.status === "DELIVERED" && payment.method === "COD" && payment.status !== "PAID"
                ? "COD remittance pending"
                : `${notificationConfig.title} update`,
            message:
              nextOrder.status === "DELIVERED" && payment.method === "COD" && payment.status !== "PAID"
                ? `${sellerLabel} delivered ${order.orderNumber}. Delivery partner remittance now needs confirmation before seller settlement.`
                : `${sellerLabel} moved ${order.orderNumber} to ${nextStatus.replaceAll("_", " ")}.`,
            orderId: order.id,
            paymentId: payment.id,
            createdAt: updatedAt,
          }),
        ),
    ],
    auditTrail: [
      createAuditEntry({
        action: "ORDER_STATUS_CHANGED",
        actorUserId,
        actorRole: actor.role,
        orderId: order.id,
        paymentId: payment.id,
        fromStatus: sellerFulfillment.status,
        toStatus: nextStatus,
        note: `${sellerLabel} updated seller fulfilment.`,
        createdAt: updatedAt,
      }),
      ...(previousOrderStatus !== nextOrder.status
        ? [
            createAuditEntry({
              action: "ORDER_STATUS_CHANGED",
              actorUserId,
              actorRole: actor.role,
              orderId: order.id,
              paymentId: payment.id,
              fromStatus: previousOrderStatus,
              toStatus: nextOrder.status,
              note: `Marketplace order status synchronized after ${sellerLabel} fulfilment update.`,
              createdAt: updatedAt,
            }),
          ]
        : []),
    ],
  });

  return { state: nextState };
}
