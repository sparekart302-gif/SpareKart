import type { Category, Product, ProductReview, Seller, StoreReview } from "@/data/marketplace";

export type AppRole = "CUSTOMER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "INVITED";

export type AdminScope =
  | "dashboard"
  | "users"
  | "sellers"
  | "products"
  | "payments"
  | "orders"
  | "inventory"
  | "reviews"
  | "coupons"
  | "reports"
  | "audit"
  | "settings"
  | "admins";

export type PaymentMethod = "COD" | "BANK_TRANSFER" | "EASYPAISA" | "JAZZCASH";

export type ManualPaymentMethod = Exclude<PaymentMethod, "COD">;

export type OrderStatus =
  | "PENDING"
  | "AWAITING_PAYMENT_PROOF"
  | "AWAITING_PAYMENT_VERIFICATION"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED"
  | "RETURNED";

export type PaymentStatus =
  | "PENDING"
  | "REQUIRES_PROOF"
  | "PROOF_SUBMITTED"
  | "UNDER_REVIEW"
  | "PAID"
  | "REJECTED"
  | "FAILED"
  | "REFUNDED";

export type PaymentProofStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export type PayoutStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PENDING"
  | "SCHEDULED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "HELD"
  | "CANCELED";

export type PayoutPeriod = "WEEKLY" | "MONTHLY" | "CUSTOM";

export type SellerPayoutMethod = "BANK_TRANSFER" | "EASYPAISA" | "JAZZCASH" | "PAYPAL" | "WALLET";

export type SellerPayoutAccountStatus =
  | "NOT_SUBMITTED"
  | "UNVERIFIED"
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export type SellerPaymentAccountType =
  | "CURRENT"
  | "SAVINGS"
  | "BUSINESS"
  | "MOBILE_WALLET"
  | "DIGITAL_WALLET";

export type CommissionRuleScope = "CATEGORY" | "SELLER" | "STORE" | "PRODUCT";

export type FinancialSourceType = "COD" | "ONLINE" | "MANUAL_VERIFIED";

export type CODCollectionStatus =
  | "NOT_APPLICABLE"
  | "AWAITING_DELIVERY"
  | "DELIVERED_AWAITING_COLLECTION_CONFIRMATION"
  | "CASH_COLLECTED_BY_PARTNER"
  | "REMITTED_TO_MARKETPLACE"
  | "REMITTANCE_CONFIRMED"
  | "ISSUE_FLAGGED";

export type CODRemittanceDiscrepancyStatus = "NONE" | "SHORT" | "OVER" | "UNRESOLVED";

export type SellerSettlementStatus =
  | "NOT_READY"
  | "READY_FOR_SETTLEMENT"
  | "IN_PAYOUT_QUEUE"
  | "PAYOUT_PROCESSING"
  | "PAID_OUT"
  | "ON_HOLD"
  | "FAILED";

export type SellerPayoutSchedulePreference = "MANUAL_REQUEST" | "WEEKLY" | "MONTHLY";

export type NotificationType =
  | "PAYMENT_PROOF_SUBMITTED"
  | "PAYMENT_PROOF_APPROVED"
  | "PAYMENT_PROOF_REJECTED"
  | "REVIEW_SUBMITTED"
  | "REVIEW_APPROVED"
  | "REVIEW_REJECTED"
  | "COD_COLLECTION_SUBMITTED"
  | "COD_COLLECTION_REJECTED"
  | "COD_PAYMENT_CONFIRMED"
  | "COD_REMITTANCE_PENDING"
  | "COD_REMITTANCE_CONFIRMED"
  | "COD_REMITTANCE_ISSUE"
  | "COMMISSION_BOOKED"
  | "SETTLEMENT_READY"
  | "SETTLEMENT_ON_HOLD"
  | "SETTLEMENT_REQUEUED"
  | "PAYOUT_REQUEST_SUBMITTED"
  | "PAYOUT_REQUEST_APPROVED"
  | "PAYOUT_REQUEST_REJECTED"
  | "PAYOUT_SCHEDULED"
  | "PAYOUT_PROCESSED"
  | "PAYOUT_FAILED"
  | "PAYOUT_ACCOUNT_SUBMITTED"
  | "PAYOUT_ACCOUNT_VERIFIED"
  | "PAYOUT_ACCOUNT_REJECTED"
  | "ORDER_CONFIRMED"
  | "ORDER_PROCESSING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELED"
  | "ORDER_AWAITING_PROOF"
  | "ORDER_AWAITING_PAYMENT_VERIFICATION";

export type AuditAction =
  | "SESSION_CHANGED"
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "PAYMENT_STATUS_CHANGED"
  | "REVIEW_SUBMITTED"
  | "PAYMENT_PROOF_SUBMITTED"
  | "PAYMENT_PROOF_APPROVED"
  | "PAYMENT_PROOF_REJECTED"
  | "COD_COLLECTION_SUBMITTED"
  | "COD_COLLECTION_APPROVED"
  | "COD_COLLECTION_REJECTED"
  | "COD_REMITTANCE_UPDATED"
  | "COD_REMITTANCE_CONFIRMED"
  | "COD_REMITTANCE_FLAGGED"
  | "INVENTORY_DEDUCTED"
  | "INVENTORY_RESTOCKED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "SELLER_STATUS_CHANGED"
  | "SELLER_UPDATED"
  | "PRODUCT_SAVED"
  | "PRODUCT_DELETED"
  | "PRODUCT_STATUS_CHANGED"
  | "CATEGORY_SAVED"
  | "CATEGORY_DELETED"
  | "REVIEW_MODERATED"
  | "COUPON_SAVED"
  | "COUPON_DELETED"
  | "SETTINGS_UPDATED"
  | "ADMIN_ROLE_UPDATED"
  | "INVENTORY_ADJUSTED"
  | "COMMISSION_RATE_UPDATED"
  | "COMMISSION_BOOKED"
  | "SETTLEMENT_CREATED"
  | "SETTLEMENT_STATUS_CHANGED"
  | "PAYOUT_CREATED"
  | "PAYOUT_STATUS_CHANGED"
  | "SELLER_PAYOUT_REQUESTED"
  | "SELLER_PAYOUT_ACCOUNT_UPDATED"
  | "SELLER_PAYOUT_ACCOUNT_REVIEWED";

export type InventoryMovementReason = "ORDER_CONFIRMED" | "ORDER_CANCELED" | "MANUAL_ADJUSTMENT";

export type ShippingOptionId = "STANDARD" | "EXPRESS";

export type MarketplaceUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AppRole;
  status: UserStatus;
  isGuest?: boolean;
  emailVerified?: boolean;
  authSource?: "LOCAL" | "SERVER";
  pendingSellerProfile?: {
    storeName?: string;
    city?: string;
  };
  createdAt: string;
  lastLoginAt?: string;
  sellerSlug?: string;
  adminTitle?: string;
  adminScopes?: AdminScope[];
};

export type SellerStatus = "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | "REJECTED" | "FLAGGED";

export type SellerTier = "STANDARD" | "PRO" | "ENTERPRISE";

export type ProductModerationStatus = "ACTIVE" | "INACTIVE" | "FLAGGED" | "DRAFT";

export type ReviewModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";

export type CouponType = "FIXED" | "PERCENTAGE";
export type CouponScope = "ORDER" | "CATEGORY";

export type CartLine = {
  productId: string;
  qty: number;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
};

export type CustomerAddress = ShippingAddress & {
  id: string;
  label: string;
  isDefault: boolean;
};

export type SavedVehicle = {
  id: string;
  nickname: string;
  brand: string;
  model: string;
  year: number;
  engine: string;
  isPrimary: boolean;
};

export type CustomerPreferences = {
  orderEmailUpdates: boolean;
  promotions: boolean;
  priceAlerts: boolean;
  smsAlerts: boolean;
  loginAlerts: boolean;
  twoFactorEnabled: boolean;
};

export type CustomerAccount = {
  userId: string;
  city: string;
  joinedAt: string;
  addresses: CustomerAddress[];
  savedVehicles: SavedVehicle[];
  wishlistProductIds: string[];
  preferences: CustomerPreferences;
};

export type SellerPermissionProfile = {
  canFeatureProducts: boolean;
  canRunCampaigns: boolean;
  maxProducts: number;
};

export type SellerSocialLinks = {
  website?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
};

export type SellerPayoutAccount = {
  method: SellerPayoutMethod;
  schedulePreference: SellerPayoutSchedulePreference;
  accountType?: SellerPaymentAccountType;
  accountTitle?: string;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
  branchCode?: string;
  mobileWalletProvider?: string;
  easyPaisaNumber?: string;
  jazzCashNumber?: string;
  paypalEmail?: string;
  walletId?: string;
  adminNote?: string;
  rejectionReason?: string;
  notes?: string;
  status: SellerPayoutAccountStatus;
  submittedAt: string;
  updatedAt: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  rejectedAt?: string;
};

export type SellerRecord = Seller & {
  ownerUserId?: string;
  status: SellerStatus;
  tier: SellerTier;
  commissionRate: number;
  payoutHold: boolean;
  payoutAccount?: SellerPayoutAccount;
  approvalNote?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  flaggedReason?: string;
  permissions: SellerPermissionProfile;
  socialLinks?: SellerSocialLinks;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
};

export type ManagedCategory = Category & {
  active: boolean;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagedProduct = Product & {
  moderationStatus: ProductModerationStatus;
  reviewRequired: boolean;
  commissionRateOverride?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ManagedProductReview = ProductReview & {
  userId?: string;
  orderId?: string;
  imageUrls?: string[];
  isVerifiedPurchase?: boolean;
  moderationStatus: ReviewModerationStatus;
  reportedCount: number;
  createdAt: string;
  moderatedAt?: string;
  moderatedByUserId?: string;
  moderatorNote?: string;
};

export type ManagedStoreReview = StoreReview & {
  userId?: string;
  orderId?: string;
  imageUrls?: string[];
  isVerifiedPurchase?: boolean;
  moderationStatus: ReviewModerationStatus;
  reportedCount: number;
  createdAt: string;
  moderatedAt?: string;
  moderatedByUserId?: string;
  moderatorNote?: string;
};

export type CouponRecord = {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  scope: CouponScope;
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  usageLimit: number;
  usageCount: number;
  active: boolean;
  expiresAt: string;
  createdAt: string;
  usedByUserIds: string[];
  eligibleCategorySlugs?: string[];
};

export type AppliedCouponSnapshot = {
  couponId: string;
  code: string;
  description: string;
  type: CouponType;
  scope: CouponScope;
  value: number;
  maxDiscountAmount?: number;
  eligibleCategorySlugs?: string[];
  discountAmount: number;
};

export type SellerTierSettings = {
  tier: SellerTier;
  label: string;
  commissionRate: number;
  maxProducts: number;
  canFeatureProducts: boolean;
  canRunCampaigns: boolean;
};

export type SystemSettings = {
  currency: string;
  taxRate: number;
  shipping: {
    standardRate: number;
    expressRate: number;
    freeShippingThreshold: number;
  };
  sellerPlatform: {
    allowSelfRegistration: boolean;
    autoApproveSellers: boolean;
    defaultCommissionRate: number;
    tiers: SellerTierSettings[];
  };
  payments: Record<
    PaymentMethod,
    {
      enabled: boolean;
      requiresManualReview: boolean;
      label: string;
    }
  >;
  notifications: {
    orderEmails: boolean;
    paymentQueueAlerts: boolean;
    sellerApprovalAlerts: boolean;
    lowStockAlerts: boolean;
  };
  integrations: {
    analyticsEnabled: boolean;
    emailProviderEnabled: boolean;
    webhookUrl: string;
  };
};

export type SellerShippingSelection = {
  sellerSlug: string;
  optionId: ShippingOptionId;
  label: string;
  etaLabel: string;
  price: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  sellerSlug: string;
  title: string;
  brand: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

export type ManualPaymentInstruction = {
  method: ManualPaymentMethod;
  label: string;
  summary: string;
  accountTitle: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  walletNumber?: string;
  note: string;
  guidelines: string[];
  referenceHint: string;
};

export type PaymentSettings = {
  proofMaxSizeBytes: number;
  manualInstructions: Record<ManualPaymentMethod, ManualPaymentInstruction>;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountDue: number;
  proofIds: string[];
  activeProofId: string | null;
  instructionsSnapshot?: ManualPaymentInstruction;
  verifiedByUserId?: string;
  verifiedAt?: string;
  commissionCalculatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProofKind = "MANUAL_TRANSFER" | "COD_COLLECTION";
export type PaymentProofSource = "CUSTOMER" | "DELIVERY_PARTNER" | "ADMIN_CAPTURE";

export type PaymentProof = {
  id: string;
  orderId: string;
  paymentId: string;
  submittedByUserId: string;
  submittedByRole: AppRole;
  paymentMethod: PaymentMethod;
  proofKind: PaymentProofKind;
  proofSource: PaymentProofSource;
  screenshotUrl: string;
  screenshotName: string;
  transactionReference: string;
  amountPaid?: number;
  paymentDateTime?: string;
  note?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  status: PaymentProofStatus;
  adminNote?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  attemptNumber: number;
};

export type SellerOrderFulfillment = {
  sellerSlug: string;
  status: OrderStatus;
  updatedAt: string;
};

export type MarketplaceOrder = {
  id: string;
  orderNumber: string;
  customerUserId: string;
  customerType: "REGISTERED" | "GUEST";
  customerEmail?: string;
  status: OrderStatus;
  paymentId: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  sellerShippingSelections: SellerShippingSelection[];
  sellerFulfillments: SellerOrderFulfillment[];
  totals: OrderTotals;
  appliedCoupon?: AppliedCouponSnapshot;
  inventoryCommittedAt: string | null;
  inventoryReleasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  productId: string;
  available: number;
  updatedAt: string | null;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  orderId: string;
  quantityDelta: number;
  reason: InventoryMovementReason;
  actorUserId: string;
  beforeQty: number;
  afterQty: number;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  paymentId?: string;
  proofId?: string;
  readAt?: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: AuditAction;
  actorUserId: string;
  actorRole: AppRole;
  orderId?: string;
  paymentId?: string;
  proofId?: string;
  productId?: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  createdAt: string;
};

export type CommissionRecord = {
  id: string;
  orderId: string;
  orderItemId?: string;
  productId?: string;
  productTitle?: string;
  sellerSlug: string;
  productCategory: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  feeAmount?: number;
  deductedAmount: number;
  ruleId?: string;
  calculatedAt: string;
  reason: "ORDER_CONFIRMED" | "MANUAL_ADJUSTMENT";
  isActive: boolean;
};

export type CommissionRule = {
  id: string;
  scope: CommissionRuleScope;
  categorySlug?: string;
  sellerSlug?: string;
  storeSlug?: string;
  productId?: string;
  percentageRate: number;
  fixedFeeAmount: number;
  active: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CODRemittance = {
  id: string;
  orderId: string;
  paymentId: string;
  sellerSlugs: string[];
  expectedAmount: number;
  receivedAmount?: number;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  cashCollectedAt?: string;
  remittedAt?: string;
  confirmedAt?: string;
  confirmedByUserId?: string;
  remittanceReference?: string;
  receiptReference?: string;
  supportingProofId?: string;
  status: CODCollectionStatus;
  discrepancyStatus: CODRemittanceDiscrepancyStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type SellerSettlement = {
  id: string;
  sellerSlug: string;
  sellerId: string;
  storeId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  productTitle: string;
  productCategory: string;
  grossSaleAmount: number;
  commissionRuleId?: string;
  commissionRate: number;
  commissionAmount: number;
  feeAmount: number;
  netPayableAmount: number;
  financialSourceType: FinancialSourceType;
  settlementStatus: SellerSettlementStatus;
  createdAt: string;
  updatedAt: string;
  payableAt?: string;
  payoutId?: string;
  codRemittanceId?: string;
  note?: string;
  holdReason?: string;
};

export type SellerPayout = {
  id: string;
  sellerSlug: string;
  sellerId: string;
  payoutPeriod: PayoutPeriod;
  periodStartDate: string;
  periodEndDate: string;
  totalEarnings: number;
  totalCommissionDeducted: number;
  totalFees?: number;
  netAmount: number;
  commissionIds: string[];
  settlementIds?: string[];
  orderIds: string[];
  status: PayoutStatus;
  currency?: string;
  payoutMethod?: SellerPayoutMethod;
  payoutAccountSnapshot?: SellerPayoutAccount;
  bankDetails?: {
    accountTitle: string;
    accountNumber: string;
    bankName: string;
    iban: string;
  };
  easyPaisaNumber?: string;
  jazzCashNumber?: string;
  paypalEmail?: string;
  walletId?: string;
  requestType?: "SELLER_REQUEST" | "AUTO_SCHEDULED" | "ADMIN_BATCH";
  requestedByUserId?: string;
  requestedAt?: string;
  requestNote?: string;
  createdByUserId?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  transactionReference?: string;
  processedAt?: string;
  paidAt?: string;
  rejectedReason?: string;
  rejectedAt?: string;
  failureReason?: string;
  holdReason?: string;
  heldAt?: string;
  adminNotes?: string;
  processedByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommissionDeductionSummary = {
  totalOrders: number;
  orderAmount: number;
  commissionAmount: number;
  deductedAmount: number;
  averageCommissionRate: number;
  byCategory: {
    category: string;
    orderCount: number;
    rate: number;
    amount: number;
  }[];
};

export type PayoutCycleConfig = {
  period: PayoutPeriod;
  enabled: boolean;
  dayOfWeek?: number;
  dayOfMonth?: number;
  holdingPeriodDays: number;
  minimumPayoutAmount: number;
  maximumPayoutAmount?: number;
};

export type CODPaymentVerificationRequest = {
  orderId: string;
  amountReceived: number;
  deliveryPartnerName: string;
  deliveryPartnerPhone: string;
  deliveryDateTime: string;
  receivedProofUrl?: string;
  notes?: string;
};

export type CODPaymentVerificationResponse = {
  orderId: string;
  verificationStatus: "APPROVED" | "REJECTED" | "HOLD";
  verifiedByUserId: string;
  adminNotes: string;
  verifiedAt: string;
};

export type CommissionReport = {
  totalCommissionEarned: number;
  totalPayoutsPaid: number;
  totalPayoutsPending: number;
  activeSellers: number;
  topSellersByCommission: {
    sellerSlug: string;
    commissionAmount: number;
    orderCount: number;
  }[];
  commissionByCategory: {
    category: string;
    totalCommission: number;
    orderCount: number;
    averageRate: number;
  }[];
  recentPayouts: SellerPayout[];
  pendingVerifications: number;
};

export type SellerEarningsSummary = {
  sellerSlug: string;
  totalEarnings: number;
  totalComissions: number;
  pendingEarnings: number;
  scheduledPayouts: number;
  currentMonthEarnings: number;
  currentMonthCommissions: number;
  avgCommissionRate: number;
  nextPayoutDate?: string;
};

export type MarketplaceState = {
  currentUserId: string;
  users: MarketplaceUser[];
  customerAccounts: Record<string, CustomerAccount>;
  managedCategories: ManagedCategory[];
  sellersDirectory: SellerRecord[];
  managedProducts: ManagedProduct[];
  managedProductReviews: ManagedProductReview[];
  managedStoreReviews: ManagedStoreReview[];
  coupons: CouponRecord[];
  systemSettings: SystemSettings;
  cartsByUserId: Record<string, CartLine[]>;
  appliedCouponCodesByUserId: Record<string, string>;
  orders: MarketplaceOrder[];
  payments: PaymentRecord[];
  paymentProofs: PaymentProof[];
  commissionRules: CommissionRule[];
  commissions: CommissionRecord[];
  codRemittances: CODRemittance[];
  sellerSettlements: SellerSettlement[];
  sellerPayouts: SellerPayout[];
  notifications: NotificationRecord[];
  auditTrail: AuditEntry[];
  inventory: Record<string, InventoryItem>;
  inventoryMovements: InventoryMovement[];
  paymentSettings: PaymentSettings;
  payoutCycleConfig: PayoutCycleConfig;
};

export type CustomerProfileUpdate = {
  name: string;
  email: string;
  phone: string;
  city: string;
};

export type CustomerAddressInput = {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
};

export type SavedVehicleInput = {
  id?: string;
  nickname: string;
  brand: string;
  model: string;
  year: number;
  engine: string;
  isPrimary?: boolean;
};

export type CustomerPreferencesUpdate = Partial<CustomerPreferences>;

export type CheckoutSubmission = {
  checkoutMode?: "CUSTOMER" | "GUEST";
  guestEmail?: string;
  shippingAddress: ShippingAddress;
  sellerShippingSelections: SellerShippingSelection[];
  paymentMethod: PaymentMethod;
  paymentProof?: PaymentProofSubmission;
};

export type GuestOrderLookupInput = {
  orderNumber: string;
  contact: string;
};

export type PaymentProofSubmission = {
  screenshotUrl: string;
  screenshotName: string;
  transactionReference: string;
  amountPaid?: number;
  paymentDateTime?: string;
  note?: string;
};

export type CODPaymentProofSubmission = PaymentProofSubmission & {
  deliveryPartnerName: string;
  deliveryPartnerPhone: string;
};

export type PaymentProofReview = {
  proofId: string;
  adminNote?: string;
};

export type AdminUserInput = Omit<MarketplaceUser, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type SellerRecordInput = Omit<SellerRecord, "createdAt" | "updatedAt" | "approvedAt"> & {
  createdAt?: string;
  approvedAt?: string;
};

export type ManagedCategoryInput = Omit<ManagedCategory, "createdAt" | "updatedAt"> & {
  createdAt?: string;
};

export type ManagedProductInput = Omit<
  ManagedProduct,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
> & {
  id?: string;
  createdAt?: string;
};

export type ReviewModerationInput = {
  kind: "product" | "store";
  reviewId: string;
  status: ReviewModerationStatus;
  moderatorNote?: string;
};

export type CouponInput = Omit<
  CouponRecord,
  "id" | "createdAt" | "usageCount" | "usedByUserIds"
> & {
  id?: string;
  createdAt?: string;
  usageCount?: number;
  usedByUserIds?: string[];
};

export type InventoryAdjustmentInput = {
  productId: string;
  quantityDelta: number;
  note?: string;
};

export type SellerStoreProfileInput = {
  name: string;
  tagline: string;
  description: string;
  city: string;
  logo: string;
  banner: string;
  responseTime: string;
  policies: SellerRecord["policies"];
  socialLinks?: SellerSocialLinks;
};

export type SellerPayoutAccountInput = {
  method: SellerPayoutMethod;
  schedulePreference: SellerPayoutSchedulePreference;
  accountType?: SellerPaymentAccountType;
  accountTitle?: string;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
  branchCode?: string;
  mobileWalletProvider?: string;
  easyPaisaNumber?: string;
  jazzCashNumber?: string;
  paypalEmail?: string;
  walletId?: string;
  notes?: string;
};

export type SellerPayoutAccountReviewInput = {
  sellerSlug: string;
  status: Extract<SellerPayoutAccountStatus, "VERIFIED" | "REJECTED">;
  adminNote?: string;
};

export type SellerPayoutRequestInput = {
  note?: string;
};

export type CODRemittanceReviewInput = {
  remittanceId: string;
  status: Extract<
    CODCollectionStatus,
    "REMITTED_TO_MARKETPLACE" | "REMITTANCE_CONFIRMED" | "ISSUE_FLAGGED"
  >;
  receivedAmount?: number;
  remittanceReference?: string;
  receiptReference?: string;
  adminNote?: string;
  discrepancyStatus?: CODRemittanceDiscrepancyStatus;
};

export type SellerSettlementBatchInput = {
  sellerSlug: string;
  settlementIds: string[];
  note?: string;
  requestType?: "SELLER_REQUEST" | "AUTO_SCHEDULED" | "ADMIN_BATCH";
};

export type StoreReviewSubmissionInput = {
  sellerSlug: string;
  title: string;
  body: string;
  rating: number;
  imageUrls?: string[];
  orderLookup?: GuestOrderLookupInput;
};

export type ProductReviewSubmissionInput = {
  productId: string;
  title: string;
  body: string;
  rating: number;
  imageUrls?: string[];
  orderLookup?: GuestOrderLookupInput;
};
