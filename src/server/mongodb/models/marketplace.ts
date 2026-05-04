import "server-only";

import { Schema, model, models } from "mongoose";

const stringId = {
  _id: { type: String, required: true },
};

const customerProfileSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    city: { type: String, trim: true },
    joinedAt: { type: String },
    addresses: { type: [Schema.Types.Mixed], default: [] },
    savedVehicles: { type: [Schema.Types.Mixed], default: [] },
    wishlistProductIds: { type: [String], default: [] },
    preferences: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    ...stringId,
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "INVITED"],
      required: true,
      index: true,
    },
    emailVerified: { type: Boolean, default: false, index: true },
    authSource: { type: String, enum: ["LOCAL", "SERVER"], default: "LOCAL" },
    pendingSellerProfile: { type: Schema.Types.Mixed },
    sellerSlug: { type: String, trim: true, index: true },
    adminTitle: { type: String, trim: true },
    adminScopes: { type: [String], default: [] },
    createdAt: { type: String, required: true, index: true },
    lastLoginAt: { type: String },
    customerProfile: { type: customerProfileSchema },
  },
  {
    versionKey: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1, createdAt: -1 });

const sellerProfileSchema = new Schema(
  {
    ...stringId,
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    ownerUserId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    logo: { type: String, trim: true },
    banner: { type: String, trim: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 },
    city: { type: String, trim: true, index: true },
    joined: { type: String },
    verified: { type: Boolean, default: false, index: true },
    responseTime: { type: String, trim: true },
    description: { type: String, trim: true },
    policies: { type: Schema.Types.Mixed, default: {} },
    socialLinks: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING_APPROVAL", "SUSPENDED", "REJECTED", "FLAGGED"],
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ["STANDARD", "PRO", "ENTERPRISE"],
      required: true,
      index: true,
    },
    commissionRate: { type: Number, default: 0 },
    payoutHold: { type: Boolean, default: false },
    payoutAccount: { type: Schema.Types.Mixed },
    approvalNote: { type: String, trim: true },
    approvedByUserId: { type: String },
    approvedAt: { type: String },
    flaggedReason: { type: String, trim: true },
    permissions: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
    lastActiveAt: { type: String },
  },
  {
    versionKey: false,
  },
);

sellerProfileSchema.index({ ownerUserId: 1 });
sellerProfileSchema.index({ status: 1, updatedAt: -1 });
sellerProfileSchema.index({ slug: 1 }, { unique: true });

const categorySchema = new Schema(
  {
    ...stringId,
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
    description: { type: String, trim: true },
    productCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    commissionRate: { type: Number, default: 0 },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

categorySchema.index({ slug: 1 }, { unique: true });

const brandSchema = new Schema(
  {
    ...stringId,
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    productCount: { type: Number, default: 0 },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

brandSchema.index({ slug: 1 }, { unique: true });
brandSchema.index({ name: 1 }, { unique: true });

const productSchema = new Schema(
  {
    ...stringId,
    slug: { type: String, required: true, trim: true, lowercase: true, index: true },
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    sku: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true },
    comparePrice: { type: Number },
    images: { type: [String], default: [] },
    sellerSlug: { type: String, required: true, trim: true, index: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    badge: { type: String },
    compatibility: { type: [Schema.Types.Mixed], default: [] },
    shortDescription: { type: String, trim: true },
    description: { type: String, trim: true },
    specs: { type: [Schema.Types.Mixed], default: [] },
    tags: { type: [String], default: [] },
    moderationStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "FLAGGED", "DRAFT"],
      required: true,
      index: true,
    },
    reviewRequired: { type: Boolean, default: false },
    commissionRateOverride: { type: Number },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
    deletedAt: { type: String, default: null },
  },
  {
    versionKey: false,
  },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sellerSlug: 1, moderationStatus: 1, createdAt: -1 });
productSchema.index({ category: 1, brand: 1, createdAt: -1 });
productSchema.index({ moderationStatus: 1, category: 1, createdAt: -1 });
productSchema.index({ moderationStatus: 1, sellerSlug: 1, createdAt: -1 });
productSchema.index({ moderationStatus: 1, brand: 1, "compatibility.model": 1 });
productSchema.index({ brand: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ "compatibility.brand": 1 });
productSchema.index({ "compatibility.model": 1 });
productSchema.index({ "compatibility.years": 1 });

const cartSchema = new Schema(
  {
    ...stringId,
    userId: { type: String, required: true, index: true },
    isGuest: { type: Boolean, default: false, index: true },
    items: { type: [Schema.Types.Mixed], default: [] },
    appliedCouponCode: { type: String, trim: true, default: "" },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

cartSchema.index({ userId: 1 }, { unique: true });

const orderSchema = new Schema(
  {
    ...stringId,
    orderNumber: { type: String, required: true, trim: true, index: true },
    customerUserId: { type: String, required: true, index: true },
    customerType: { type: String, enum: ["REGISTERED", "GUEST"], required: true, index: true },
    customerEmail: { type: String, trim: true, lowercase: true, index: true },
    status: {
      type: String,
      enum: [
        "PENDING",
        "AWAITING_PAYMENT_PROOF",
        "AWAITING_PAYMENT_VERIFICATION",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELED",
        "RETURNED",
      ],
      required: true,
      index: true,
    },
    paymentId: { type: String, required: true, index: true },
    paymentMethod: {
      type: String,
      enum: ["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"],
      required: true,
      index: true,
    },
    items: { type: [Schema.Types.Mixed], default: [] },
    shippingAddress: { type: Schema.Types.Mixed, required: true },
    sellerShippingSelections: { type: [Schema.Types.Mixed], default: [] },
    sellerFulfillments: { type: [Schema.Types.Mixed], default: [] },
    totals: { type: Schema.Types.Mixed, required: true },
    appliedCoupon: { type: Schema.Types.Mixed },
    inventoryCommittedAt: { type: String, default: null },
    inventoryReleasedAt: { type: String, default: null },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customerUserId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerEmail: 1, orderNumber: 1 });
orderSchema.index({ customerType: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, createdAt: -1 });

const orderItemSchema = new Schema(
  {
    ...stringId,
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    sellerSlug: { type: String, required: true, index: true },
    title: { type: String, trim: true, required: true },
    brand: { type: String, trim: true },
    sku: { type: String, trim: true },
    image: { type: String, trim: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    createdAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

orderItemSchema.index({ orderId: 1, sellerSlug: 1 });

const paymentSchema = new Schema(
  {
    ...stringId,
    orderId: { type: String, required: true, index: true },
    method: {
      type: String,
      enum: ["COD", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "REQUIRES_PROOF",
        "PROOF_SUBMITTED",
        "UNDER_REVIEW",
        "PAID",
        "REJECTED",
        "FAILED",
        "REFUNDED",
      ],
      required: true,
      index: true,
    },
    amountDue: { type: Number, required: true },
    proofIds: { type: [String], default: [] },
    activeProofId: { type: String, default: null },
    instructionsSnapshot: { type: Schema.Types.Mixed },
    verifiedByUserId: { type: String },
    verifiedAt: { type: String },
    commissionCalculatedAt: { type: String },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ status: 1, updatedAt: -1 });

const paymentProofSchema = new Schema(
  {
    ...stringId,
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, required: true, index: true },
    submittedByUserId: { type: String, required: true, index: true },
    submittedByRole: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, index: true },
    proofKind: { type: String, required: true, index: true },
    proofSource: { type: String, required: true },
    screenshotUrl: { type: String, required: true },
    screenshotName: { type: String, required: true },
    transactionReference: { type: String, required: true, trim: true },
    amountPaid: { type: Number },
    paymentDateTime: { type: String },
    note: { type: String },
    deliveryPartnerName: { type: String },
    deliveryPartnerPhone: { type: String },
    status: { type: String, required: true, index: true },
    adminNote: { type: String },
    verifiedByUserId: { type: String },
    verifiedAt: { type: String },
    createdAt: { type: String, required: true, index: true },
    updatedAt: { type: String, required: true, index: true },
    attemptNumber: { type: Number, required: true },
  },
  {
    versionKey: false,
  },
);

paymentProofSchema.index({ orderId: 1, createdAt: -1 });

const inventoryItemSchema = new Schema(
  {
    ...stringId,
    productId: { type: String, required: true, index: true },
    available: { type: Number, required: true },
    updatedAt: { type: String, default: null, index: true },
  },
  {
    versionKey: false,
  },
);

inventoryItemSchema.index({ productId: 1 }, { unique: true });

const inventoryMovementSchema = new Schema(
  {
    ...stringId,
    productId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    quantityDelta: { type: Number, required: true },
    reason: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    beforeQty: { type: Number, required: true },
    afterQty: { type: Number, required: true },
    createdAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

inventoryMovementSchema.index({ productId: 1, createdAt: -1 });

const notificationSchema = new Schema(
  {
    ...stringId,
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    orderId: { type: String, index: true },
    paymentId: { type: String, index: true },
    proofId: { type: String, index: true },
    readAt: { type: String, default: null, index: true },
    createdAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

const adminActionLogSchema = new Schema(
  {
    ...stringId,
    action: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true, index: true },
    orderId: { type: String, index: true },
    paymentId: { type: String, index: true },
    proofId: { type: String, index: true },
    productId: { type: String, index: true },
    fromStatus: { type: String, index: true },
    toStatus: { type: String, index: true },
    note: { type: String },
    createdAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

adminActionLogSchema.index({ action: 1, createdAt: -1 });

const couponSchema = new Schema(
  {
    ...stringId,
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    description: { type: String, required: true },
    type: { type: String, required: true, index: true },
    scope: { type: String, required: true, index: true },
    value: { type: Number, required: true },
    maxDiscountAmount: { type: Number },
    minOrderAmount: { type: Number, required: true },
    usageLimit: { type: Number, required: true },
    usageCount: { type: Number, required: true, index: true },
    active: { type: Boolean, required: true, index: true },
    expiresAt: { type: String, required: true, index: true },
    createdAt: { type: String, required: true, index: true },
    eligibleCategorySlugs: { type: [String], default: [] },
    usedByUserIds: { type: [String], default: [] },
  },
  {
    versionKey: false,
  },
);

couponSchema.index({ code: 1 }, { unique: true });

const couponRedemptionSchema = new Schema(
  {
    ...stringId,
    couponId: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, index: true },
    userId: { type: String, required: true, index: true },
    redeemedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

couponRedemptionSchema.index({ couponId: 1, userId: 1 }, { unique: true });

const reviewSchema = new Schema(
  {
    ...stringId,
    kind: { type: String, enum: ["product", "store"], required: true, index: true },
    productId: { type: String, index: true },
    sellerSlug: { type: String, index: true },
    userId: { type: String, index: true },
    orderId: { type: String, index: true },
    author: { type: String, required: true },
    rating: { type: Number, required: true, index: true },
    date: { type: String },
    title: { type: String, required: true },
    body: { type: String, required: true },
    fitment: { type: Number },
    quality: { type: Number },
    value: { type: Number },
    service: { type: Number },
    delivery: { type: Number },
    communication: { type: Number },
    verified: { type: Boolean },
    imageUrls: { type: [String], default: [] },
    isVerifiedPurchase: { type: Boolean },
    moderationStatus: { type: String, required: true, index: true },
    reportedCount: { type: Number, default: 0 },
    createdAt: { type: String, required: true, index: true },
    moderatedAt: { type: String },
    moderatedByUserId: { type: String },
    moderatorNote: { type: String },
  },
  {
    versionKey: false,
  },
);

reviewSchema.index({ kind: 1, moderationStatus: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ sellerSlug: 1, createdAt: -1 });

const marketplaceStateSchema = new Schema(
  {
    ...stringId,
    state: { type: Schema.Types.Mixed, required: true },
    seededAt: { type: String, required: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

export const MarketplaceUserModel =
  models.MarketplaceUserProjection || model("MarketplaceUserProjection", userSchema, "users");
export const MarketplaceSellerProfileModel =
  models.MarketplaceSellerProjection ||
  model("MarketplaceSellerProjection", sellerProfileSchema, "seller_profiles");
export const MarketplaceCategoryModel =
  models.MarketplaceCategoryProjection ||
  model("MarketplaceCategoryProjection", categorySchema, "categories");
export const MarketplaceBrandModel =
  models.MarketplaceBrandProjection ||
  model("MarketplaceBrandProjection", brandSchema, "brands");
export const MarketplaceProductModel =
  models.MarketplaceProductProjection ||
  model("MarketplaceProductProjection", productSchema, "products");
export const MarketplaceCartModel =
  models.MarketplaceCartProjection || model("MarketplaceCartProjection", cartSchema, "carts");
export const MarketplaceOrderModel =
  models.MarketplaceOrderProjection || model("MarketplaceOrderProjection", orderSchema, "orders");
export const MarketplaceOrderItemModel =
  models.MarketplaceOrderItemProjection ||
  model("MarketplaceOrderItemProjection", orderItemSchema, "order_items");
export const MarketplacePaymentModel =
  models.MarketplacePaymentProjection ||
  model("MarketplacePaymentProjection", paymentSchema, "payments");
export const MarketplacePaymentProofModel =
  models.MarketplacePaymentProofProjection ||
  model("MarketplacePaymentProofProjection", paymentProofSchema, "payment_proofs");
export const MarketplaceInventoryItemModel =
  models.MarketplaceInventoryItemProjection ||
  model("MarketplaceInventoryItemProjection", inventoryItemSchema, "inventory_items");
export const MarketplaceInventoryMovementModel =
  models.MarketplaceInventoryMovementProjection ||
  model("MarketplaceInventoryMovementProjection", inventoryMovementSchema, "inventory_movements");
export const MarketplaceNotificationModel =
  models.MarketplaceNotificationProjection ||
  model("MarketplaceNotificationProjection", notificationSchema, "notifications");
export const MarketplaceAdminActionLogModel =
  models.MarketplaceAdminActionLogProjection ||
  model("MarketplaceAdminActionLogProjection", adminActionLogSchema, "admin_action_logs");
export const MarketplaceCouponModel =
  models.MarketplaceCouponProjection || model("MarketplaceCouponProjection", couponSchema, "coupons");
export const MarketplaceCouponRedemptionModel =
  models.MarketplaceCouponRedemptionProjection ||
  model(
    "MarketplaceCouponRedemptionProjection",
    couponRedemptionSchema,
    "coupon_redemptions",
  );
export const MarketplaceReviewModel =
  models.MarketplaceReviewProjection || model("MarketplaceReviewProjection", reviewSchema, "reviews");
export const MarketplaceStateModel =
  models.MarketplaceStateSnapshot ||
  model("MarketplaceStateSnapshot", marketplaceStateSchema, "marketplace_state");
