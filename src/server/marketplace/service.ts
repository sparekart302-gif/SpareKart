import "server-only";

import { z } from "zod";
import { getCurrentSessionUser } from "@/server/auth/service";
import { MongoApiError } from "@/server/mongodb/errors";
import { syncAuthenticatedMarketplaceUser } from "@/modules/marketplace/auth-bridge";
import {
  deleteCouponRecord,
  deleteManagedCategoryRecord,
  deleteManagedProductRecord,
  deleteUserRecord,
  moderateManagedReview,
  reviewCODRemittanceRecord,
  reviewSellerPayoutAccountRecord,
  saveCouponRecord,
  createSellerPayoutBatchRecord,
  saveManagedCategoryRecord,
  saveManagedProductRecord,
  saveSellerRecord,
  saveUserRecord,
  updateSellerPayoutRecord,
  updateSystemSettingsRecord,
  adjustInventoryRecord,
} from "@/modules/marketplace/admin-workflows";
import type { AuthSessionUser } from "@/server/auth/types";
import {
  approvePaymentProof,
  addItemToCart,
  applyCouponCodeToCart,
  adjustSellerOwnedInventory,
  advanceOrderStatus,
  deleteCustomerAddress,
  deleteCustomerVehicle,
  markAllNotificationsRead,
  placeOrderFromCheckout,
  rejectPaymentProof,
  removeCartLine,
  removeCouponCodeFromCart,
  requestSellerPayout,
  saveCustomerAddress,
  saveCustomerVehicle,
  saveSellerOwnedProduct,
  submitCODCollectionProof,
  submitPaymentProof,
  submitPaymentProofByLookup,
  submitProductReview,
  submitStoreReview,
  toggleWishlistProduct,
  updateCartLineQuantity,
  updateCustomerPreferences,
  updateCustomerProfile,
  updateSellerPayoutAccount,
  updateSellerStoreProfile,
} from "@/modules/marketplace/workflows";
import type {
  AdminUserInput,
  CartLine,
  CouponInput,
  InventoryAdjustmentInput,
  ManagedCategoryInput,
  ManagedProductInput,
  MarketplaceState,
  OrderStatus,
  PaymentProofSubmission,
  PaymentStatus,
  PayoutStatus,
  ReviewModerationInput,
  SellerPayoutAccountInput,
  SellerRecordInput,
  SellerStoreProfileInput,
  SystemSettings,
} from "@/modules/marketplace/types";
import {
  applyMarketplaceSessionContext,
  getMarketplaceState,
  saveMarketplaceState,
} from "./persistence";
import {
  queueOrderCreatedStateEmails,
  queueOrderStatusStateEmails,
  queuePaymentProofStateEmail,
} from "./email";

const GUEST_CART_USER_ID = "guest-session";

const commandNames = [
  "SAVE_USER",
  "DELETE_USER",
  "SAVE_SELLER",
  "SAVE_CATEGORY",
  "DELETE_CATEGORY",
  "SAVE_PRODUCT",
  "DELETE_PRODUCT",
  "MODERATE_REVIEW",
  "SAVE_COUPON",
  "DELETE_COUPON",
  "ADJUST_INVENTORY",
  "UPDATE_SYSTEM_SETTINGS",
  "APPLY_COUPON",
  "REMOVE_COUPON",
  "ADD_TO_CART",
  "UPDATE_CART_QTY",
  "REMOVE_FROM_CART",
  "UPDATE_PROFILE",
  "UPDATE_SELLER_PROFILE",
  "UPDATE_SELLER_PAYOUT_ACCOUNT",
  "SAVE_SELLER_PRODUCT",
  "ADJUST_SELLER_INVENTORY",
  "REQUEST_PAYOUT",
  "SUBMIT_PRODUCT_REVIEW",
  "SUBMIT_STORE_REVIEW",
  "SAVE_ADDRESS",
  "DELETE_ADDRESS",
  "SAVE_VEHICLE",
  "DELETE_VEHICLE",
  "TOGGLE_WISHLIST",
  "UPDATE_PREFERENCES",
  "MARK_NOTIFICATIONS_READ",
  "PLACE_ORDER",
  "SUBMIT_PROOF",
  "SUBMIT_PROOF_BY_LOOKUP",
  "SUBMIT_COD_PROOF",
  "APPROVE_PROOF",
  "REJECT_PROOF",
  "UPDATE_ORDER_STATUS",
  "UPDATE_PAYOUT_RECORD",
  "CREATE_PAYOUT_BATCH",
  "REVIEW_COD_REMITTANCE",
  "REVIEW_SELLER_PAYOUT_ACCOUNT",
] as const;

const commandEnvelopeSchema = z.object({
  command: z.enum(commandNames),
  payload: z.unknown().optional(),
  guestCart: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        qty: z.number().int().positive().max(99),
      }),
    )
    .max(200)
    .optional(),
  guestCouponCode: z.string().trim().max(64).optional(),
});

const appRoleSchema = z.enum(["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"]);
const userStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "INVITED"]);
const adminScopeSchema = z.enum([
  "dashboard",
  "users",
  "sellers",
  "products",
  "payments",
  "orders",
  "inventory",
  "reviews",
  "coupons",
  "reports",
  "audit",
  "settings",
  "admins",
]);
const sellerStatusSchema = z.enum([
  "ACTIVE",
  "PENDING_APPROVAL",
  "SUSPENDED",
  "REJECTED",
  "FLAGGED",
]);
const sellerTierSchema = z.enum(["STANDARD", "PRO", "ENTERPRISE"]);
const productModerationStatusSchema = z.enum(["ACTIVE", "INACTIVE", "FLAGGED", "DRAFT"]);
const reviewModerationStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]);
const couponTypeSchema = z.enum(["FIXED", "PERCENTAGE"]);
const couponScopeSchema = z.enum(["ORDER", "CATEGORY"]);
const shippingOptionIdSchema = z.enum(["STANDARD", "EXPRESS"]);
const paymentMethodSchema = z.enum(["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"]);
const payoutStatusSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PENDING",
  "SCHEDULED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REFUNDED",
  "HELD",
  "CANCELED",
]);
const sellerPayoutMethodSchema = z.enum([
  "BANK_TRANSFER",
  "EASYPAISA",
  "JAZZCASH",
  "PAYPAL",
  "WALLET",
]);
const sellerPayoutScheduleSchema = z.enum(["MANUAL_REQUEST", "WEEKLY", "MONTHLY"]);
const sellerPaymentAccountTypeSchema = z.enum([
  "CURRENT",
  "SAVINGS",
  "BUSINESS",
  "MOBILE_WALLET",
  "DIGITAL_WALLET",
]);
const sellerAccountStatusSchema = z.enum(["VERIFIED", "REJECTED"]);
const sellerPayoutAccountStatusSchema = z.enum([
  "NOT_SUBMITTED",
  "UNVERIFIED",
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
]);
const orderStatusSchema = z.enum([
  "PENDING",
  "AWAITING_PAYMENT_PROOF",
  "AWAITING_PAYMENT_VERIFICATION",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
]);
const codRemittanceStatusSchema = z.enum([
  "REMITTED_TO_MARKETPLACE",
  "REMITTANCE_CONFIRMED",
  "ISSUE_FLAGGED",
]);
const codDiscrepancyStatusSchema = z.enum(["NONE", "SHORT", "OVER", "UNRESOLVED"]);

const guestOrderLookupSchema = z.object({
  orderNumber: z.string().trim().min(1),
  contact: z.string().trim().min(1),
});

const paymentProofSchema = z.object({
  screenshotUrl: z.string().trim().min(1),
  screenshotName: z.string().trim().min(1),
  transactionReference: z.string().trim().min(4),
  amountPaid: z.number().positive().optional(),
  paymentDateTime: z.string().trim().optional(),
  note: z.string().trim().max(500).optional(),
});

const codPaymentProofSchema = paymentProofSchema.extend({
  deliveryPartnerName: z.string().trim().min(2),
  deliveryPartnerPhone: z.string().trim().min(7),
});

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  addressLine: z.string().trim().min(4),
  city: z.string().trim().min(2),
  province: z.string().trim().min(2),
  postalCode: z.string().trim().min(2),
});

const sellerShippingSelectionSchema = z.object({
  sellerSlug: z.string().trim().min(1),
  optionId: shippingOptionIdSchema,
  label: z.string().trim().min(1),
  etaLabel: z.string().trim().min(1),
  price: z.number().min(0),
});

const customerAddressSchema = shippingAddressSchema.extend({
  id: z.string().trim().optional(),
  label: z.string().trim().min(1),
  isDefault: z.boolean().optional(),
});

const savedVehicleSchema = z.object({
  id: z.string().trim().optional(),
  nickname: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.number().int().min(1900),
  engine: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
});

const customerPreferencesSchema = z
  .object({
    orderEmailUpdates: z.boolean().optional(),
    promotions: z.boolean().optional(),
    priceAlerts: z.boolean().optional(),
    smsAlerts: z.boolean().optional(),
    loginAlerts: z.boolean().optional(),
    twoFactorEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one preference must be provided.",
  });

const adminUserSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(32),
  role: appRoleSchema,
  status: userStatusSchema,
  emailVerified: z.boolean().optional(),
  sellerSlug: z.string().trim().optional(),
  adminTitle: z.string().trim().optional(),
  adminScopes: z.array(adminScopeSchema).optional(),
  lastLoginAt: z.string().trim().optional(),
  pendingSellerProfile: z
    .object({
      storeName: z.string().trim().optional(),
      city: z.string().trim().optional(),
    })
    .optional(),
  createdAt: z.string().trim().optional(),
});

const sellerRecordSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  tagline: z.string().trim().min(2),
  logo: z.string().trim().min(1),
  banner: z.string().trim().min(1),
  rating: z.number().min(0).default(0),
  reviewCount: z.number().int().min(0).default(0),
  productCount: z.number().int().min(0).default(0),
  city: z.string().trim().min(2),
  joined: z.string().trim().min(1),
  verified: z.boolean(),
  responseTime: z.string().trim().min(2),
  description: z.string().trim().min(8),
  ownerUserId: z.string().trim().optional(),
  status: sellerStatusSchema,
  tier: sellerTierSchema,
  commissionRate: z.number().min(0),
  payoutHold: z.boolean(),
  approvalNote: z.string().trim().optional(),
  approvedByUserId: z.string().trim().optional(),
  approvedAt: z.string().trim().optional(),
  flaggedReason: z.string().trim().optional(),
  permissions: z.object({
    canFeatureProducts: z.boolean(),
    canRunCampaigns: z.boolean(),
    maxProducts: z.number().int().min(0),
  }),
  socialLinks: z
    .object({
      website: z.string().trim().optional(),
      facebook: z.string().trim().optional(),
      instagram: z.string().trim().optional(),
      whatsapp: z.string().trim().optional(),
    })
    .optional(),
  payoutAccount: z
    .object({
      method: sellerPayoutMethodSchema,
      schedulePreference: sellerPayoutScheduleSchema,
      accountType: sellerPaymentAccountTypeSchema.optional(),
      accountTitle: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      bankName: z.string().trim().optional(),
      iban: z.string().trim().optional(),
      branchCode: z.string().trim().optional(),
      mobileWalletProvider: z.string().trim().optional(),
      easyPaisaNumber: z.string().trim().optional(),
      jazzCashNumber: z.string().trim().optional(),
      paypalEmail: z.string().trim().optional(),
      walletId: z.string().trim().optional(),
      adminNote: z.string().trim().optional(),
      rejectionReason: z.string().trim().optional(),
      notes: z.string().trim().optional(),
      status: sellerPayoutAccountStatusSchema,
      submittedAt: z.string().trim().min(1),
      updatedAt: z.string().trim().min(1),
      verifiedByUserId: z.string().trim().optional(),
      verifiedAt: z.string().trim().optional(),
      rejectedAt: z.string().trim().optional(),
    })
    .optional(),
  policies: z.object({
    returns: z.string().trim().min(1),
    shipping: z.string().trim().min(1),
    warranty: z.string().trim().min(1),
  }),
  createdAt: z.string().trim().optional(),
});

const managedCategorySchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2),
  icon: z.string().trim().min(1),
  description: z.string().trim().min(4),
  productCount: z.number().int().min(0).default(0),
  active: z.boolean(),
  commissionRate: z.number().min(0),
  createdAt: z.string().trim().optional(),
});

const managedProductSchema = z.object({
  id: z.string().trim().optional(),
  slug: z.string().trim().min(1),
  title: z.string().trim().min(2),
  brand: z.string().trim().min(1),
  category: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional(),
  images: z.array(z.string().trim().min(1)).min(1),
  sellerSlug: z.string().trim().min(1),
  rating: z.number().min(0).default(0),
  reviewCount: z.number().int().min(0).default(0),
  stock: z.number().int().min(0),
  badge: z.enum(["best-seller", "new", "deal", "fast-shipping"]).optional(),
  compatibility: z
    .array(
      z.object({
        brand: z.string().trim().min(1),
        model: z.string().trim().min(1),
        years: z.array(z.number().int().min(1900)).min(1),
      }),
    )
    .default([]),
  shortDescription: z.string().trim().min(4),
  description: z.string().trim().min(8),
  specs: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        value: z.string().trim().min(1),
      }),
    )
    .default([]),
  tags: z.array(z.string().trim()).default([]),
  moderationStatus: productModerationStatusSchema,
  reviewRequired: z.boolean(),
  commissionRateOverride: z.number().min(0).optional(),
  createdAt: z.string().trim().optional(),
});

const couponSchema = z.object({
  id: z.string().trim().optional(),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().min(4),
  type: couponTypeSchema,
  scope: couponScopeSchema,
  value: z.number().positive(),
  maxDiscountAmount: z.number().positive().optional(),
  minOrderAmount: z.number().min(0),
  usageLimit: z.number().int().positive(),
  usageCount: z.number().int().min(0).optional(),
  active: z.boolean(),
  expiresAt: z.string().trim().min(1),
  createdAt: z.string().trim().optional(),
  usedByUserIds: z.array(z.string().trim()).optional(),
  eligibleCategorySlugs: z.array(z.string().trim()).optional(),
});

const inventoryAdjustmentSchema = z.object({
  productId: z.string().trim().min(1),
  quantityDelta: z.number().int(),
  note: z.string().trim().optional(),
});

const systemSettingsSchema = z.object({
  currency: z.string().trim().min(1),
  taxRate: z.number().min(0),
  shipping: z.object({
    standardRate: z.number().min(0),
    expressRate: z.number().min(0),
    freeShippingThreshold: z.number().min(0),
  }),
  sellerPlatform: z.object({
    allowSelfRegistration: z.boolean(),
    autoApproveSellers: z.boolean(),
    defaultCommissionRate: z.number().min(0),
    tiers: z.array(
      z.object({
        tier: sellerTierSchema,
        label: z.string().trim().min(1),
        commissionRate: z.number().min(0),
        maxProducts: z.number().int().min(0),
        canFeatureProducts: z.boolean(),
        canRunCampaigns: z.boolean(),
      }),
    ),
  }),
  payments: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      requiresManualReview: z.boolean(),
      label: z.string().trim().min(1),
    }),
  ),
  notifications: z.object({
    orderEmails: z.boolean(),
    paymentQueueAlerts: z.boolean(),
    sellerApprovalAlerts: z.boolean(),
    lowStockAlerts: z.boolean(),
  }),
  integrations: z.object({
    analyticsEnabled: z.boolean(),
    emailProviderEnabled: z.boolean(),
    webhookUrl: z.string().trim(),
  }),
});

const checkoutSchema = z.object({
  checkoutMode: z.enum(["CUSTOMER", "GUEST"]).optional(),
  guestEmail: z.string().trim().email().optional(),
  shippingAddress: shippingAddressSchema,
  sellerShippingSelections: z.array(sellerShippingSelectionSchema),
  paymentMethod: paymentMethodSchema,
  paymentProof: paymentProofSchema.optional(),
});

const reviewSchema = z.object({
  title: z.string().trim().min(2),
  body: z.string().trim().min(8),
  rating: z.number().int().min(1).max(5),
  imageUrls: z.array(z.string().trim().min(1)).max(4).optional(),
  orderLookup: guestOrderLookupSchema.optional(),
});

const sellerProfileSchema = z.object({
  name: z.string().trim().min(2),
  tagline: z.string().trim().min(2),
  description: z.string().trim().min(8),
  city: z.string().trim().min(2),
  logo: z.string().trim().min(1),
  banner: z.string().trim().min(1),
  responseTime: z.string().trim().min(2),
  policies: z.object({
    returns: z.string().trim().min(1),
    shipping: z.string().trim().min(1),
    warranty: z.string().trim().min(1),
  }),
  socialLinks: z
    .object({
      website: z.string().trim().optional(),
      facebook: z.string().trim().optional(),
      instagram: z.string().trim().optional(),
      whatsapp: z.string().trim().optional(),
    })
    .optional(),
});

const payoutAccountSchema = z.object({
  method: sellerPayoutMethodSchema,
  schedulePreference: sellerPayoutScheduleSchema,
  accountType: sellerPaymentAccountTypeSchema.optional(),
  accountTitle: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  iban: z.string().trim().optional(),
  branchCode: z.string().trim().optional(),
  mobileWalletProvider: z.string().trim().optional(),
  easyPaisaNumber: z.string().trim().optional(),
  jazzCashNumber: z.string().trim().optional(),
  paypalEmail: z.string().trim().optional(),
  walletId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const payoutBatchSchema = z.object({
  sellerSlug: z.string().trim().min(1),
  settlementIds: z.array(z.string().trim().min(1)).min(1),
  note: z.string().trim().optional(),
  requestType: z.enum(["SELLER_REQUEST", "AUTO_SCHEDULED", "ADMIN_BATCH"]).optional(),
});

const payoutRecordUpdateSchema = z.object({
  payoutId: z.string().trim().min(1),
  status: payoutStatusSchema,
  adminNotes: z.string().trim().optional(),
  transactionReference: z.string().trim().optional(),
});

const sellerPayoutAccountReviewSchema = z.object({
  sellerSlug: z.string().trim().min(1),
  status: sellerAccountStatusSchema,
  adminNote: z.string().trim().optional(),
});

const codRemittanceReviewSchema = z.object({
  remittanceId: z.string().trim().min(1),
  status: codRemittanceStatusSchema,
  receivedAmount: z.number().positive().optional(),
  remittanceReference: z.string().trim().optional(),
  receiptReference: z.string().trim().optional(),
  adminNote: z.string().trim().optional(),
  discrepancyStatus: codDiscrepancyStatusSchema.optional(),
});

type MarketplaceCommand = z.infer<typeof commandEnvelopeSchema>;

type SideEffect =
  | { kind: "ORDER_CREATED"; orderId: string; paymentMethod: string; paymentProofId?: string | null }
  | { kind: "PAYMENT_PROOF_RECEIVED"; orderId: string; proofId: string }
  | { kind: "ORDER_STATUS_CHANGED"; orderId: string; status: OrderStatus };

function parsePayload<T>(schema: z.ZodType<T>, payload: unknown) {
  return schema.parse(payload);
}

function getCurrentUserId(user: AuthSessionUser | null, state: MarketplaceState) {
  return user?.id ?? state.currentUserId ?? "";
}

async function getMarketplaceStateForRequest(input?: {
  guestCart?: CartLine[];
  guestCouponCode?: string;
}) {
  const sessionUser = await getCurrentSessionUser();
  let state = await getMarketplaceState({
    currentUserId: sessionUser?.id,
    guestCart: input?.guestCart,
    guestCouponCode: input?.guestCouponCode,
  });

  if (!sessionUser) {
    return { state, sessionUser };
  }

  const syncedState = syncAuthenticatedMarketplaceUser(state, sessionUser);

  if (syncedState !== state) {
    const persisted = await saveMarketplaceState(syncedState);
    state = applyMarketplaceSessionContext(
      persisted,
      sessionUser.id,
      input?.guestCart,
      input?.guestCouponCode,
    );
  }

  return { state, sessionUser };
}

function rebuildResponseState(
  savedState: MarketplaceState,
  actingState: MarketplaceState,
  sessionUser: AuthSessionUser | null,
) {
  return applyMarketplaceSessionContext(
    savedState,
    getCurrentUserId(sessionUser, actingState),
    actingState.cartsByUserId[GUEST_CART_USER_ID],
    actingState.appliedCouponCodesByUserId[GUEST_CART_USER_ID],
  );
}

async function runSideEffects(state: MarketplaceState, sideEffects: SideEffect[]) {
  await Promise.allSettled(
    sideEffects.map(async (effect) => {
      switch (effect.kind) {
        case "ORDER_CREATED":
          await queueOrderCreatedStateEmails(state, effect.orderId);
          if (effect.paymentMethod !== "COD" && effect.paymentProofId) {
            await queuePaymentProofStateEmail(state, effect.orderId, effect.paymentProofId);
          }
          return;
        case "PAYMENT_PROOF_RECEIVED":
          await queuePaymentProofStateEmail(state, effect.orderId, effect.proofId);
          return;
        case "ORDER_STATUS_CHANGED":
          await queueOrderStatusStateEmails(state, effect.orderId, effect.status);
          return;
      }
    }),
  );
}

export async function getMarketplaceStateSnapshotForRequest() {
  return getMarketplaceStateForRequest();
}

export async function executeMarketplaceCommand(input: MarketplaceCommand) {
  const parsed = commandEnvelopeSchema.parse(input);
  const { state, sessionUser } = await getMarketplaceStateForRequest({
    guestCart: parsed.guestCart,
    guestCouponCode: parsed.guestCouponCode,
  });
  const actorUserId = getCurrentUserId(sessionUser, state);
  const sideEffects: SideEffect[] = [];
  let nextState = state;
  let result: Record<string, unknown> = {};

  switch (parsed.command) {
    case "SAVE_USER":
      nextState = saveUserRecord(
        state,
        actorUserId,
        parsePayload<AdminUserInput>(adminUserSchema as z.ZodType<AdminUserInput>, parsed.payload),
      );
      break;
    case "DELETE_USER":
      nextState = deleteUserRecord(
        state,
        actorUserId,
        parsePayload(z.object({ userId: z.string().trim().min(1) }), parsed.payload).userId,
      );
      break;
    case "SAVE_SELLER":
      nextState = saveSellerRecord(
        state,
        actorUserId,
        parsePayload<SellerRecordInput>(
          sellerRecordSchema as z.ZodType<SellerRecordInput>,
          parsed.payload,
        ),
      );
      break;
    case "SAVE_CATEGORY":
      nextState = saveManagedCategoryRecord(
        state,
        actorUserId,
        parsePayload<ManagedCategoryInput>(
          managedCategorySchema as z.ZodType<ManagedCategoryInput>,
          parsed.payload,
        ),
      );
      break;
    case "DELETE_CATEGORY":
      nextState = deleteManagedCategoryRecord(
        state,
        actorUserId,
        parsePayload(z.object({ slug: z.string().trim().min(1) }), parsed.payload).slug,
      );
      break;
    case "SAVE_PRODUCT":
      nextState = saveManagedProductRecord(
        state,
        actorUserId,
        parsePayload<ManagedProductInput>(
          managedProductSchema as z.ZodType<ManagedProductInput>,
          parsed.payload,
        ),
      );
      break;
    case "DELETE_PRODUCT":
      nextState = deleteManagedProductRecord(
        state,
        actorUserId,
        parsePayload(z.object({ productId: z.string().trim().min(1) }), parsed.payload).productId,
      );
      break;
    case "MODERATE_REVIEW":
      nextState = moderateManagedReview(
        state,
        actorUserId,
        parsePayload<ReviewModerationInput>(
          z.object({
            kind: z.enum(["product", "store"]),
            reviewId: z.string().trim().min(1),
            status: reviewModerationStatusSchema,
            moderatorNote: z.string().trim().optional(),
          }) as z.ZodType<ReviewModerationInput>,
          parsed.payload,
        ),
      );
      break;
    case "SAVE_COUPON":
      nextState = saveCouponRecord(
        state,
        actorUserId,
        parsePayload<CouponInput>(couponSchema as z.ZodType<CouponInput>, parsed.payload),
      );
      break;
    case "DELETE_COUPON":
      nextState = deleteCouponRecord(
        state,
        actorUserId,
        parsePayload(z.object({ couponId: z.string().trim().min(1) }), parsed.payload).couponId,
      );
      break;
    case "ADJUST_INVENTORY":
      nextState = adjustInventoryRecord(
        state,
        actorUserId,
        parsePayload<InventoryAdjustmentInput>(
          inventoryAdjustmentSchema as z.ZodType<InventoryAdjustmentInput>,
          parsed.payload,
        ),
      );
      break;
    case "UPDATE_SYSTEM_SETTINGS":
      nextState = updateSystemSettingsRecord(
        state,
        actorUserId,
        parsePayload<SystemSettings>(
          systemSettingsSchema as z.ZodType<SystemSettings>,
          parsed.payload,
        ),
      );
      break;
    case "APPLY_COUPON":
      nextState = applyCouponCodeToCart(
        state,
        actorUserId,
        parsePayload(z.object({ code: z.string().trim().min(1) }), parsed.payload).code,
      );
      break;
    case "REMOVE_COUPON":
      nextState = removeCouponCodeFromCart(state, actorUserId);
      break;
    case "ADD_TO_CART": {
      const payload = parsePayload(
        z.object({
          productId: z.string().trim().min(1),
          qty: z.number().int().positive().max(99).optional(),
        }),
        parsed.payload,
      );
      nextState = addItemToCart(state, actorUserId, payload.productId, payload.qty ?? 1);
      break;
    }
    case "UPDATE_CART_QTY": {
      const payload = parsePayload(
        z.object({
          productId: z.string().trim().min(1),
          qty: z.number().int().min(0).max(99),
        }),
        parsed.payload,
      );
      nextState = updateCartLineQuantity(state, actorUserId, payload.productId, payload.qty);
      break;
    }
    case "REMOVE_FROM_CART":
      nextState = removeCartLine(
        state,
        actorUserId,
        parsePayload(z.object({ productId: z.string().trim().min(1) }), parsed.payload).productId,
      );
      break;
    case "UPDATE_PROFILE":
      nextState = updateCustomerProfile(
        state,
        actorUserId,
        parsePayload(
          z.object({
            name: z.string().trim().min(2),
            email: z.string().trim().email(),
            phone: z.string().trim().min(7),
            city: z.string().trim().min(2),
          }),
          parsed.payload,
        ),
      );
      break;
    case "UPDATE_SELLER_PROFILE":
      nextState = updateSellerStoreProfile(
        state,
        actorUserId,
        parsePayload<SellerStoreProfileInput>(
          sellerProfileSchema as z.ZodType<SellerStoreProfileInput>,
          parsed.payload,
        ),
      );
      break;
    case "UPDATE_SELLER_PAYOUT_ACCOUNT":
      nextState = updateSellerPayoutAccount(
        state,
        actorUserId,
        parsePayload<SellerPayoutAccountInput>(
          payoutAccountSchema as z.ZodType<SellerPayoutAccountInput>,
          parsed.payload,
        ),
      );
      break;
    case "SAVE_SELLER_PRODUCT":
      nextState = saveSellerOwnedProduct(
        state,
        actorUserId,
        parsePayload<ManagedProductInput>(
          managedProductSchema as z.ZodType<ManagedProductInput>,
          parsed.payload,
        ),
      );
      break;
    case "ADJUST_SELLER_INVENTORY":
      nextState = adjustSellerOwnedInventory(
        state,
        actorUserId,
        parsePayload(inventoryAdjustmentSchema, parsed.payload),
      );
      break;
    case "REQUEST_PAYOUT":
      nextState = requestSellerPayout(
        state,
        actorUserId,
        parsePayload(
          z.object({
            note: z.string().trim().optional(),
          }),
          parsed.payload ?? {},
        ),
      );
      break;
    case "SUBMIT_PRODUCT_REVIEW":
      nextState = submitProductReview(
        state,
        actorUserId,
        parsePayload(reviewSchema.extend({ productId: z.string().trim().min(1) }), parsed.payload),
      );
      break;
    case "SUBMIT_STORE_REVIEW":
      nextState = submitStoreReview(
        state,
        actorUserId,
        parsePayload(reviewSchema.extend({ sellerSlug: z.string().trim().min(1) }), parsed.payload),
      );
      break;
    case "SAVE_ADDRESS":
      nextState = saveCustomerAddress(
        state,
        actorUserId,
        parsePayload(customerAddressSchema, parsed.payload),
      );
      break;
    case "DELETE_ADDRESS":
      nextState = deleteCustomerAddress(
        state,
        actorUserId,
        parsePayload(z.object({ addressId: z.string().trim().min(1) }), parsed.payload).addressId,
      );
      break;
    case "SAVE_VEHICLE":
      nextState = saveCustomerVehicle(
        state,
        actorUserId,
        parsePayload(savedVehicleSchema, parsed.payload),
      );
      break;
    case "DELETE_VEHICLE":
      nextState = deleteCustomerVehicle(
        state,
        actorUserId,
        parsePayload(z.object({ vehicleId: z.string().trim().min(1) }), parsed.payload).vehicleId,
      );
      break;
    case "TOGGLE_WISHLIST":
      nextState = toggleWishlistProduct(
        state,
        actorUserId,
        parsePayload(z.object({ productId: z.string().trim().min(1) }), parsed.payload).productId,
      );
      break;
    case "UPDATE_PREFERENCES":
      nextState = updateCustomerPreferences(
        state,
        actorUserId,
        parsePayload(customerPreferencesSchema, parsed.payload),
      );
      break;
    case "MARK_NOTIFICATIONS_READ":
      nextState = markAllNotificationsRead(state, actorUserId);
      break;
    case "PLACE_ORDER": {
      const orderResult = placeOrderFromCheckout(
        state,
        actorUserId,
        parsePayload(checkoutSchema, parsed.payload),
      );
      nextState = orderResult.state;
      const order = nextState.orders.find((candidate) => candidate.id === orderResult.orderId);
      const activeProofId = order
        ? nextState.payments.find((payment) => payment.id === order.paymentId)?.activeProofId
        : null;
      sideEffects.push({
        kind: "ORDER_CREATED",
        orderId: orderResult.orderId,
        paymentMethod: order?.paymentMethod ?? "COD",
        paymentProofId: activeProofId,
      });
      result = { orderId: orderResult.orderId };
      break;
    }
    case "SUBMIT_PROOF": {
      const payload = parsePayload(
        z.object({
          orderId: z.string().trim().min(1),
          proof: paymentProofSchema,
        }),
        parsed.payload,
      );
      const proofResult = submitPaymentProof(state, actorUserId, payload.orderId, payload.proof);
      nextState = proofResult.state;
      sideEffects.push({
        kind: "PAYMENT_PROOF_RECEIVED",
        orderId: payload.orderId,
        proofId: proofResult.proofId,
      });
      result = { proofId: proofResult.proofId };
      break;
    }
    case "SUBMIT_PROOF_BY_LOOKUP": {
      const payload = parsePayload(
        z.object({
          lookup: guestOrderLookupSchema,
          proof: paymentProofSchema,
        }),
        parsed.payload,
      );
      const proofResult = submitPaymentProofByLookup(state, payload.lookup, payload.proof);
      nextState = proofResult.state;
      const proof = nextState.paymentProofs.find((candidate) => candidate.id === proofResult.proofId);

      if (!proof) {
        throw new MongoApiError("Payment proof was created but could not be reloaded.", {
          status: 500,
          code: "PAYMENT_PROOF_RELOAD_FAILED",
        });
      }

      sideEffects.push({
        kind: "PAYMENT_PROOF_RECEIVED",
        orderId: proof.orderId,
        proofId: proofResult.proofId,
      });
      result = { proofId: proofResult.proofId, orderId: proof.orderId };
      break;
    }
    case "SUBMIT_COD_PROOF": {
      const payload = parsePayload(
        z.object({
          orderId: z.string().trim().min(1),
          proof: codPaymentProofSchema,
        }),
        parsed.payload,
      );
      const proofResult = submitCODCollectionProof(state, actorUserId, payload.orderId, payload.proof);
      nextState = proofResult.state;
      sideEffects.push({
        kind: "PAYMENT_PROOF_RECEIVED",
        orderId: payload.orderId,
        proofId: proofResult.proofId,
      });
      result = { proofId: proofResult.proofId };
      break;
    }
    case "APPROVE_PROOF": {
      const payload = parsePayload(
        z.object({
          proofId: z.string().trim().min(1),
          adminNote: z.string().trim().optional(),
        }),
        parsed.payload,
      );
      const proof = state.paymentProofs.find((candidate) => candidate.id === payload.proofId);
      const approvalResult = approvePaymentProof(state, actorUserId, payload);
      nextState = approvalResult.state;

      if (proof) {
        const order = nextState.orders.find((candidate) => candidate.id === proof.orderId);
        if (order) {
          sideEffects.push({
            kind: "ORDER_STATUS_CHANGED",
            orderId: proof.orderId,
            status: order.status,
          });
        }
      }
      break;
    }
    case "REJECT_PROOF": {
      const payload = parsePayload(
        z.object({
          proofId: z.string().trim().min(1),
          adminNote: z.string().trim().optional(),
        }),
        parsed.payload,
      );
      const proof = state.paymentProofs.find((candidate) => candidate.id === payload.proofId);
      const rejectionResult = rejectPaymentProof(state, actorUserId, payload);
      nextState = rejectionResult.state;

      if (proof) {
        const order = nextState.orders.find((candidate) => candidate.id === proof.orderId);
        if (order) {
          sideEffects.push({
            kind: "ORDER_STATUS_CHANGED",
            orderId: proof.orderId,
            status: order.status,
          });
        }
      }
      break;
    }
    case "UPDATE_ORDER_STATUS": {
      const payload = parsePayload(
        z.object({
          orderId: z.string().trim().min(1),
          nextStatus: orderStatusSchema,
        }),
        parsed.payload,
      );
      const statusResult = advanceOrderStatus(
        state,
        actorUserId,
        payload.orderId,
        payload.nextStatus,
      );
      nextState = statusResult.state;
      sideEffects.push({
        kind: "ORDER_STATUS_CHANGED",
        orderId: payload.orderId,
        status: payload.nextStatus,
      });
      break;
    }
    case "UPDATE_PAYOUT_RECORD":
      nextState = updateSellerPayoutRecord(
        state,
        actorUserId,
        parsePayload(payoutRecordUpdateSchema, parsed.payload),
      );
      break;
    case "CREATE_PAYOUT_BATCH":
      nextState = createSellerPayoutBatchRecord(
        state,
        actorUserId,
        parsePayload(payoutBatchSchema, parsed.payload),
      );
      break;
    case "REVIEW_COD_REMITTANCE":
      nextState = reviewCODRemittanceRecord(
        state,
        actorUserId,
        parsePayload(codRemittanceReviewSchema, parsed.payload),
      );
      break;
    case "REVIEW_SELLER_PAYOUT_ACCOUNT":
      nextState = reviewSellerPayoutAccountRecord(
        state,
        actorUserId,
        parsePayload(sellerPayoutAccountReviewSchema, parsed.payload),
      );
      break;
    default:
      throw new MongoApiError("Unsupported marketplace command.", {
        status: 400,
        code: "UNSUPPORTED_MARKETPLACE_COMMAND",
      });
  }

  const savedState = await saveMarketplaceState(nextState);
  const responseState = rebuildResponseState(savedState, nextState, sessionUser);
  await runSideEffects(responseState, sideEffects);

  return {
    state: responseState,
    result,
  };
}
