import {
  categories,
  productReviews,
  products,
  sampleCart,
  sellers,
  storeReviews,
} from "@/data/marketplace";
import type {
  AdminScope,
  CommissionRule,
  CouponRecord,
  CustomerAccount,
  InventoryItem,
  ManagedCategory,
  ManagedProduct,
  ManagedProductReview,
  ManagedStoreReview,
  MarketplaceState,
  MarketplaceUser,
  PaymentSettings,
  SellerRecord,
  SystemSettings,
} from "./types";
import {
  CATEGORY_COMMISSION_RATES,
  getDefaultPayoutCycleConfig,
} from "./commission-management";
import { ensureOrderLifecycle } from "./order-management";

const marketplaceAdminScopes: AdminScope[] = [
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
];

const productOpsScopes: AdminScope[] = [
  "dashboard",
  "products",
  "inventory",
  "reviews",
  "reports",
  "audit",
];

export const marketplaceUsers: MarketplaceUser[] = [
  {
    id: "user-customer-ahmed",
    name: "Ahmed Khan",
    email: "ahmed@sparekart.pk",
    phone: "+92 300 1234567",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2024-05-14T09:00:00.000Z",
    lastLoginAt: "2026-04-20T18:15:00.000Z",
  },
  {
    id: "user-customer-sara",
    name: "Sara Malik",
    email: "sara@sparekart.pk",
    phone: "+92 333 5550199",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2025-01-22T12:30:00.000Z",
    lastLoginAt: "2026-04-20T14:20:00.000Z",
  },
  {
    id: "user-customer-ali",
    name: "Ali Raza",
    email: "ali@sparekart.pk",
    phone: "+92 334 8002211",
    role: "CUSTOMER",
    status: "ACTIVE",
    createdAt: "2025-09-10T10:15:00.000Z",
    lastLoginAt: "2026-04-18T16:00:00.000Z",
  },
  {
    id: "user-seller-autopro",
    name: "AutoPro Karachi",
    email: "seller@autopro.pk",
    phone: "+92 321 7000001",
    role: "SELLER",
    status: "ACTIVE",
    createdAt: "2024-06-08T09:00:00.000Z",
    lastLoginAt: "2026-04-20T09:30:00.000Z",
    sellerSlug: sellers[0]?.slug,
  },
  {
    id: "user-seller-lahore",
    name: "Lahore Spare Hub",
    email: "ops@lahoresparehub.pk",
    phone: "+92 322 7123400",
    role: "SELLER",
    status: "ACTIVE",
    createdAt: "2024-07-19T09:00:00.000Z",
    lastLoginAt: "2026-04-19T13:10:00.000Z",
    sellerSlug: sellers[1]?.slug,
  },
  {
    id: "user-seller-islamabad",
    name: "Islamabad Motors Parts",
    email: "support@islamabadmotors.pk",
    phone: "+92 333 7129900",
    role: "SELLER",
    status: "ACTIVE",
    createdAt: "2024-09-02T09:00:00.000Z",
    lastLoginAt: "2026-04-18T11:45:00.000Z",
    sellerSlug: sellers[2]?.slug,
  },
  {
    id: "user-admin-fatima",
    name: "Fatima Admin",
    email: "admin@sparekart.pk",
    phone: "+92 300 1112233",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2024-02-01T09:00:00.000Z",
    lastLoginAt: "2026-04-21T08:00:00.000Z",
    adminTitle: "Marketplace Manager",
    adminScopes: marketplaceAdminScopes,
  },
  {
    id: "user-admin-haris",
    name: "Haris Ops",
    email: "haris.ops@sparekart.pk",
    phone: "+92 301 4401100",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2024-08-10T09:00:00.000Z",
    lastLoginAt: "2026-04-20T17:05:00.000Z",
    adminTitle: "Catalog Ops Lead",
    adminScopes: productOpsScopes,
  },
  {
    id: "user-superadmin-bilal",
    name: "SpareKart Super Admin",
    email: "sparekart302@gmail.com",
    phone: "+92 300 9998877",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: "2023-11-15T09:00:00.000Z",
    lastLoginAt: "2026-04-21T08:15:00.000Z",
    adminTitle: "Platform Owner",
  },
];

const manualPaymentSettings: PaymentSettings = {
  proofMaxSizeBytes: 5 * 1024 * 1024,
  manualInstructions: {
    BANK_TRANSFER: {
      method: "BANK_TRANSFER",
      label: "Bank Transfer",
      summary: "Transfer the exact total to SpareKart's verified bank account.",
      accountTitle: "SpareKart (Pvt) Ltd",
      bankName: "Meezan Bank",
      accountNumber: "0123-4567-8901-234",
      iban: "PK36 MEZN 0001 2345 6789 0123",
      note: "Use your order number as the payment reference and upload a clear screenshot of the successful transfer.",
      referenceHint: "Order number or bank transaction reference",
      guidelines: [
        "Screenshot must show sender account, amount, and successful status.",
        "Upload JPG, PNG, or PDF proof up to 5 MB.",
        "Orders are only confirmed after admin verification.",
      ],
    },
    EASYPAISA: {
      method: "EASYPAISA",
      label: "Easypaisa",
      summary: "Send payment to SpareKart's Easypaisa wallet and upload proof.",
      accountTitle: "SpareKart",
      walletNumber: "0345 1234567",
      note: "Include the Easypaisa transaction ID and keep the sender number visible in your screenshot.",
      referenceHint: "Easypaisa transaction ID",
      guidelines: [
        "Screenshot must show wallet number, amount, and transaction status.",
        "Use the same amount as shown in checkout to avoid verification delays.",
        "Admin review is required before the order is confirmed.",
      ],
    },
    JAZZCASH: {
      method: "JAZZCASH",
      label: "JazzCash",
      summary: "Send payment to SpareKart's JazzCash wallet and upload proof.",
      accountTitle: "SpareKart",
      walletNumber: "0301 9876543",
      note: "Paste the JazzCash reference used in the wallet app and upload a full receipt screenshot.",
      referenceHint: "JazzCash transaction reference",
      guidelines: [
        "Proof should show sender number, recipient number, and payment status.",
        "Blur personal balance data if you wish, but keep the transaction clearly visible.",
        "Orders stay pending until an admin approves the proof.",
      ],
    },
  },
};

function buildInventory(): Record<string, InventoryItem> {
  return products.reduce<Record<string, InventoryItem>>((accumulator, product) => {
    accumulator[product.id] = {
      productId: product.id,
      available: product.stock,
      updatedAt: null,
    };
    return accumulator;
  }, {});
}

function buildCustomerAccounts(users: MarketplaceUser[]): Record<string, CustomerAccount> {
  return users.reduce<Record<string, CustomerAccount>>((accounts, user, index) => {
    if (user.role !== "CUSTOMER") {
      return accounts;
    }

    const isAhmed = user.id === "user-customer-ahmed";
    const isSara = user.id === "user-customer-sara";

    accounts[user.id] = {
      userId: user.id,
      city: isAhmed ? "Karachi" : isSara ? "Lahore" : "Islamabad",
      joinedAt: user.createdAt.slice(0, 10),
      addresses: [
        {
          id: `address-home-${index}`,
          label: "Home",
          fullName: user.name,
          phone: user.phone,
          addressLine:
            isAhmed
              ? "House 12, Street 5, Block A"
              : isSara
                ? "Flat 8, Gulberg Residencia"
                : "House 19, G-11 Markaz",
          city: isAhmed ? "Karachi" : isSara ? "Lahore" : "Islamabad",
          province: isAhmed ? "Sindh" : isSara ? "Punjab" : "Islamabad Capital Territory",
          postalCode: isAhmed ? "74000" : isSara ? "54000" : "44000",
          isDefault: true,
        },
        {
          id: `address-work-${index}`,
          label: isAhmed ? "Workshop" : "Office",
          fullName: user.name,
          phone: user.phone,
          addressLine:
            isAhmed
              ? "Plot 7, Korangi Industrial Area"
              : isSara
                ? "Shop 19, Montgomery Road"
                : "Unit 4, Blue Area Service Road",
          city: isAhmed ? "Karachi" : isSara ? "Lahore" : "Islamabad",
          province: isAhmed ? "Sindh" : isSara ? "Punjab" : "Islamabad Capital Territory",
          postalCode: isAhmed ? "74900" : isSara ? "54000" : "44010",
          isDefault: false,
        },
      ],
      savedVehicles: isAhmed
        ? [
            {
              id: "vehicle-corolla-ahmed",
              nickname: "Family Corolla",
              brand: "Toyota",
              model: "Corolla",
              year: 2021,
              engine: "1.6L",
              isPrimary: true,
            },
            {
              id: "vehicle-hilux-ahmed",
              nickname: "Hilux Revo",
              brand: "Toyota",
              model: "Hilux",
              year: 2022,
              engine: "2.8L Diesel",
              isPrimary: false,
            },
          ]
        : isSara
          ? [
              {
                id: "vehicle-city-sara",
                nickname: "City Aspire",
                brand: "Honda",
                model: "City",
                year: 2022,
                engine: "1.5L",
                isPrimary: true,
              },
            ]
          : [
              {
                id: "vehicle-civic-ali",
                nickname: "Daily Civic",
                brand: "Honda",
                model: "Civic",
                year: 2020,
                engine: "1.5L Turbo",
                isPrimary: true,
              },
            ],
      wishlistProductIds: isAhmed
        ? ["prod-2", "prod-15", "prod-33"]
        : isSara
          ? ["prod-6", "prod-19"]
          : ["prod-11", "prod-24"],
      preferences: {
        orderEmailUpdates: true,
        promotions: !isAhmed,
        priceAlerts: true,
        smsAlerts: isAhmed,
        loginAlerts: true,
        twoFactorEnabled: false,
      },
    };

    return accounts;
  }, {});
}

function buildManagedCategories(): ManagedCategory[] {
  return categories.map((category, index) => ({
    ...category,
    active: index !== 7,
    commissionRate:
      CATEGORY_COMMISSION_RATES[category.slug] ??
      12,
    createdAt: `2024-${String((index % 9) + 1).padStart(2, "0")}-10T09:00:00.000Z`,
    updatedAt: `2026-04-${String((index % 18) + 1).padStart(2, "0")}T11:30:00.000Z`,
  }));
}

function buildSellersDirectory(): SellerRecord[] {
  const ownerBySlug = new Map<string, string>([
    [sellers[0].slug, "user-seller-autopro"],
    [sellers[1].slug, "user-seller-lahore"],
    [sellers[2].slug, "user-seller-islamabad"],
  ]);

  return sellers.map((seller, index) => {
    const tier = index < 2 ? "ENTERPRISE" : index < 5 ? "PRO" : "STANDARD";
    const statusMap: SellerRecord["status"][] = [
      "ACTIVE",
      "ACTIVE",
      "ACTIVE",
      "PENDING_APPROVAL",
      "FLAGGED",
      "SUSPENDED",
      "ACTIVE",
      "REJECTED",
    ];

    return {
      ...seller,
      ownerUserId: ownerBySlug.get(seller.slug),
      status: statusMap[index] ?? "ACTIVE",
      tier,
      commissionRate: tier === "ENTERPRISE" ? 8 : tier === "PRO" ? 10 : 12,
      payoutHold: index === 4 || index === 5,
      payoutAccount:
        index === 0
          ? {
              method: "BANK_TRANSFER",
              schedulePreference: "MONTHLY",
              accountType: "BUSINESS",
              accountTitle: seller.name,
              accountNumber: "0234-7654-9922",
              bankName: "Meezan Bank",
              iban: "PK91 MEZN 0001 2345 6700 1122",
              branchCode: "0234",
              status: "VERIFIED",
              submittedAt: "2025-03-18T10:00:00.000Z",
              updatedAt: "2026-04-18T10:00:00.000Z",
              verifiedByUserId: "user-superadmin-bilal",
              verifiedAt: "2025-03-20T12:00:00.000Z",
            }
          : index === 1
            ? {
                method: "EASYPAISA",
                schedulePreference: "MANUAL_REQUEST",
                accountType: "MOBILE_WALLET",
                accountTitle: seller.name,
                mobileWalletProvider: "Easypaisa",
                easyPaisaNumber: "03001234567",
                status: "VERIFIED",
                submittedAt: "2025-05-11T10:00:00.000Z",
                updatedAt: "2026-04-12T09:00:00.000Z",
                verifiedByUserId: "user-admin-fatima",
                verifiedAt: "2025-05-13T11:30:00.000Z",
              }
            : index === 2
              ? {
                  method: "JAZZCASH",
                  schedulePreference: "WEEKLY",
                  accountType: "MOBILE_WALLET",
                  accountTitle: seller.name,
                  mobileWalletProvider: "JazzCash",
                  jazzCashNumber: "03119876543",
                  status: "PENDING_REVIEW",
                  submittedAt: "2026-04-19T08:00:00.000Z",
                  updatedAt: "2026-04-19T08:00:00.000Z",
                  adminNote: "Awaiting final account title verification.",
                }
              : undefined,
      approvalNote:
        index === 3
          ? "Pending KYC documents and store verification."
          : index === 7
            ? "Rejected after incomplete documentation review."
            : undefined,
      approvedByUserId: index < 3 || index === 6 ? "user-superadmin-bilal" : undefined,
      approvedAt: index < 3 || index === 6 ? `2025-0${(index % 5) + 1}-18T10:00:00.000Z` : undefined,
      flaggedReason: index === 4 ? "High cancellation rate and repeated customer complaints." : undefined,
      permissions: {
        canFeatureProducts: tier !== "STANDARD",
        canRunCampaigns: tier === "ENTERPRISE",
        maxProducts: tier === "ENTERPRISE" ? 1200 : tier === "PRO" ? 600 : 250,
      },
      socialLinks: {
        website: `https://${seller.slug}.sparekart.pk`,
        whatsapp:
          index < 4 ? `https://wa.me/92${String(3001234000 + index).slice(1)}` : undefined,
        instagram: index % 2 === 0 ? `https://instagram.com/${seller.slug}` : undefined,
        facebook: index % 3 === 0 ? `https://facebook.com/${seller.slug}` : undefined,
      },
      createdAt: `${seller.joined}T09:00:00.000Z`,
      updatedAt: "2026-04-20T09:00:00.000Z",
      lastActiveAt: `2026-04-${String((index % 20) + 1).padStart(2, "0")}T13:00:00.000Z`,
    };
  });
}

function buildManagedProducts(): ManagedProduct[] {
  return products.map((product, index) => ({
    ...product,
    moderationStatus:
      index % 17 === 0
        ? "FLAGGED"
        : index % 13 === 0
          ? "INACTIVE"
          : index % 19 === 0
            ? "DRAFT"
            : "ACTIVE",
    reviewRequired: index % 9 === 0 || index % 17 === 0,
    createdAt: `2025-${String((index % 9) + 1).padStart(2, "0")}-05T09:00:00.000Z`,
    updatedAt: `2026-04-${String((index % 21) + 1).padStart(2, "0")}T12:00:00.000Z`,
    deletedAt: null,
  }));
}

function buildCommissionRules(
  managedCategories: ManagedCategory[],
  managedProducts: ManagedProduct[],
  sellersDirectory: SellerRecord[],
  defaultRate: number,
): CommissionRule[] {
  const createdAt = "2025-01-01T00:00:00.000Z";
  const categoryRules = managedCategories.map<CommissionRule>((category) => ({
    id: `commission-category-${category.slug}`,
    scope: "CATEGORY",
    categorySlug: category.slug,
    percentageRate: category.commissionRate,
    fixedFeeAmount: 0,
    active: category.active,
    effectiveFrom: createdAt,
    notes: `Default category commission for ${category.name}.`,
    createdAt,
    updatedAt: category.updatedAt,
  }));

  const sellerRules = sellersDirectory.map<CommissionRule>((seller) => ({
    id: `commission-seller-${seller.slug}`,
    scope: "SELLER",
    sellerSlug: seller.slug,
    storeSlug: seller.slug,
    percentageRate: seller.commissionRate || defaultRate,
    fixedFeeAmount: 0,
    active: seller.status === "ACTIVE",
    effectiveFrom: createdAt,
    notes: `${seller.name} seller-level override.`,
    createdAt,
    updatedAt: seller.updatedAt,
  }));

  const productRules = managedProducts
    .filter((product) => product.commissionRateOverride && product.commissionRateOverride > 0)
    .map<CommissionRule>((product) => ({
      id: `commission-product-${product.id}`,
      scope: "PRODUCT",
      productId: product.id,
      sellerSlug: product.sellerSlug,
      storeSlug: product.sellerSlug,
      categorySlug: product.category,
      percentageRate: product.commissionRateOverride ?? defaultRate,
      fixedFeeAmount: 0,
      active: !product.deletedAt,
      effectiveFrom: product.createdAt,
      notes: `${product.title} product-level commission override.`,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

  return [...categoryRules, ...sellerRules, ...productRules];
}

function buildManagedProductReviews(): ManagedProductReview[] {
  return productReviews.map((review, index) => ({
    ...review,
    moderationStatus:
      index % 10 === 0
        ? "FLAGGED"
        : index % 7 === 0
          ? "PENDING"
          : "APPROVED",
    reportedCount: index % 10 === 0 ? 3 : index % 7 === 0 ? 1 : 0,
    createdAt: `2026-03-${String((index % 24) + 1).padStart(2, "0")}T10:00:00.000Z`,
    moderatedAt: index % 7 === 0 ? undefined : "2026-04-10T10:30:00.000Z",
    moderatedByUserId: index % 7 === 0 ? undefined : "user-admin-haris",
    moderatorNote:
      index % 10 === 0
        ? "Review flagged for repeated abuse reports."
        : index % 7 === 0
          ? "Pending moderation after customer report."
          : undefined,
  }));
}

function buildManagedStoreReviews(): ManagedStoreReview[] {
  return storeReviews.map((review, index) => ({
    ...review,
    moderationStatus:
      index % 9 === 0
        ? "FLAGGED"
        : index % 6 === 0
          ? "PENDING"
          : "APPROVED",
    reportedCount: index % 9 === 0 ? 2 : index % 6 === 0 ? 1 : 0,
    createdAt: `2026-03-${String((index % 24) + 1).padStart(2, "0")}T12:00:00.000Z`,
    moderatedAt: index % 6 === 0 ? undefined : "2026-04-08T15:00:00.000Z",
    moderatedByUserId: index % 6 === 0 ? undefined : "user-admin-haris",
    moderatorNote:
      index % 9 === 0
        ? "Needs manual validation due to repeated reporting."
        : undefined,
  }));
}

function buildCoupons(): CouponRecord[] {
  return [
    {
      id: "coupon-welcome-500",
      code: "WELCOME500",
      description: "Flat discount for first order customers.",
      type: "FIXED",
      scope: "ORDER",
      value: 500,
      minOrderAmount: 3500,
      usageLimit: 150,
      usageCount: 42,
      active: true,
      expiresAt: "2026-06-30T23:59:59.000Z",
      createdAt: "2026-01-10T09:00:00.000Z",
      usedByUserIds: ["user-customer-ahmed", "user-customer-sara"],
    },
    {
      id: "coupon-service10",
      code: "SERVICE10",
      description: "10% off on service essentials and engine parts.",
      type: "PERCENTAGE",
      scope: "CATEGORY",
      value: 10,
      maxDiscountAmount: 1800,
      minOrderAmount: 5000,
      usageLimit: 500,
      usageCount: 126,
      active: true,
      expiresAt: "2026-05-31T23:59:59.000Z",
      createdAt: "2026-02-05T10:00:00.000Z",
      usedByUserIds: ["user-customer-ahmed", "user-customer-ali"],
      eligibleCategorySlugs: ["engine"],
    },
    {
      id: "coupon-sellerboost",
      code: "SELLERBOOST",
      description: "Campaign credit for marketplace flash sale.",
      type: "PERCENTAGE",
      scope: "ORDER",
      value: 15,
      maxDiscountAmount: 2500,
      minOrderAmount: 8000,
      usageLimit: 100,
      usageCount: 19,
      active: false,
      expiresAt: "2026-03-31T23:59:59.000Z",
      createdAt: "2026-01-20T11:00:00.000Z",
      usedByUserIds: [],
    },
    {
      id: "coupon-parts250",
      code: "PARTS250",
      description: "Instant cart saving on eligible marketplace orders.",
      type: "FIXED",
      scope: "ORDER",
      value: 250,
      minOrderAmount: 2500,
      usageLimit: 1000,
      usageCount: 0,
      active: true,
      expiresAt: "2026-12-31T23:59:59.000Z",
      createdAt: "2026-04-01T09:30:00.000Z",
      usedByUserIds: [],
    },
  ];
}

function buildSystemSettings(): SystemSettings {
  return {
    currency: "PKR",
    taxRate: 16,
    shipping: {
      standardRate: 250,
      expressRate: 600,
      freeShippingThreshold: 5000,
    },
    sellerPlatform: {
      allowSelfRegistration: true,
      autoApproveSellers: false,
      defaultCommissionRate: 12,
      tiers: [
        {
          tier: "STANDARD",
          label: "Standard",
          commissionRate: 12,
          maxProducts: 250,
          canFeatureProducts: false,
          canRunCampaigns: false,
        },
        {
          tier: "PRO",
          label: "Pro",
          commissionRate: 10,
          maxProducts: 600,
          canFeatureProducts: true,
          canRunCampaigns: false,
        },
        {
          tier: "ENTERPRISE",
          label: "Enterprise",
          commissionRate: 8,
          maxProducts: 1200,
          canFeatureProducts: true,
          canRunCampaigns: true,
        },
      ],
    },
    payments: {
      COD: {
        enabled: true,
        requiresManualReview: true,
        label: "Cash on Delivery",
      },
      BANK_TRANSFER: {
        enabled: true,
        requiresManualReview: true,
        label: "Bank Transfer",
      },
      EASYPAISA: {
        enabled: true,
        requiresManualReview: true,
        label: "Easypaisa",
      },
      JAZZCASH: {
        enabled: true,
        requiresManualReview: true,
        label: "JazzCash",
      },
    },
    notifications: {
      orderEmails: true,
      paymentQueueAlerts: true,
      sellerApprovalAlerts: true,
      lowStockAlerts: true,
    },
    integrations: {
      analyticsEnabled: true,
      emailProviderEnabled: true,
      webhookUrl: "https://hooks.sparekart.pk/admin-events",
    },
  };
}

function mergeByKey<T extends Record<string, unknown>>(
  defaults: T[],
  incoming: T[] | undefined,
  key: keyof T,
) {
  const incomingMap = new Map((incoming ?? []).map((entry) => [String(entry[key]), entry]));
  const mergedDefaults = defaults.map((entry) => ({
    ...entry,
    ...incomingMap.get(String(entry[key])),
  }));
  const missingIncoming = (incoming ?? []).filter(
    (entry) => !defaults.some((candidate) => String(candidate[key]) === String(entry[key])),
  );
  return [...mergedDefaults, ...missingIncoming];
}

export function buildInitialMarketplaceState(): MarketplaceState {
  const customerAccounts = buildCustomerAccounts(marketplaceUsers);
  const managedCategories = buildManagedCategories();
  const sellersDirectory = buildSellersDirectory();
  const managedProducts = buildManagedProducts();
  const users = marketplaceUsers;
  const systemSettings = buildSystemSettings();
  const commissionRules = buildCommissionRules(
    managedCategories,
    managedProducts,
    sellersDirectory,
    systemSettings.sellerPlatform.defaultCommissionRate,
  );

  return {
    currentUserId: "user-customer-ahmed",
    users,
    customerAccounts,
    managedCategories,
    sellersDirectory,
    managedProducts,
    managedProductReviews: buildManagedProductReviews(),
    managedStoreReviews: buildManagedStoreReviews(),
    coupons: buildCoupons(),
    systemSettings,
    cartsByUserId: Object.fromEntries(
      [
        ...users.map((user) => [user.id, user.id === "user-customer-ahmed" ? sampleCart : []]),
        ["guest-session", [] as typeof sampleCart],
      ],
    ),
    appliedCouponCodesByUserId: Object.fromEntries([
      ...users.map((user) => [user.id, ""]),
      ["guest-session", ""],
    ]),
    orders: [],
    payments: [],
    paymentProofs: [],
    commissionRules,
    commissions: [],
    codRemittances: [],
    sellerSettlements: [],
    sellerPayouts: [],
    notifications: [],
    auditTrail: [],
    inventory: buildInventory(),
    inventoryMovements: [],
    paymentSettings: manualPaymentSettings,
    payoutCycleConfig: getDefaultPayoutCycleConfig(),
  };
}

export function normalizeMarketplaceState(raw: Partial<MarketplaceState>): MarketplaceState {
  const initial = buildInitialMarketplaceState();

  const users = mergeByKey(
    initial.users,
    raw.users?.map((user) => ({
      ...user,
      status: user.status ?? "ACTIVE",
      createdAt: user.createdAt ?? "2025-01-01T09:00:00.000Z",
    })),
    "id",
  );

  const customerAccounts = Object.fromEntries(
    users
      .filter((user) => user.role === "CUSTOMER")
      .map((user) => {
        const defaultAccount = initial.customerAccounts[user.id] ?? {
          userId: user.id,
          city: "Karachi",
          joinedAt: user.createdAt.slice(0, 10),
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
        const incomingAccount = raw.customerAccounts?.[user.id];

        return [
          user.id,
          {
            ...defaultAccount,
            ...incomingAccount,
            addresses: incomingAccount?.addresses ?? defaultAccount.addresses,
            savedVehicles: incomingAccount?.savedVehicles ?? defaultAccount.savedVehicles,
            wishlistProductIds:
              incomingAccount?.wishlistProductIds ?? defaultAccount.wishlistProductIds,
            preferences: {
              ...defaultAccount.preferences,
              ...incomingAccount?.preferences,
            },
          },
        ];
      }),
  ) as MarketplaceState["customerAccounts"];

  const cartsByUserId = {
    ...Object.fromEntries([...users.map((user) => [user.id, []]), ["guest-session", []]]),
    ...initial.cartsByUserId,
    ...raw.cartsByUserId,
  };

  const appliedCouponCodesByUserId = {
    ...Object.fromEntries([...users.map((user) => [user.id, ""]), ["guest-session", ""]]),
    ...initial.appliedCouponCodesByUserId,
    ...raw.appliedCouponCodesByUserId,
  };

  const ensureOrderItemIds = (orders: MarketplaceState["orders"]) =>
    orders.map((order) => ({
      ...order,
      customerType: order.customerType ?? "REGISTERED",
      customerEmail: order.customerEmail,
      items: order.items.map((item, index) => ({
        ...item,
        id: item.id ?? `${order.id}-item-${index + 1}`,
      })),
    }));

  return {
    ...initial,
    ...raw,
    users,
    customerAccounts,
    managedCategories: mergeByKey(initial.managedCategories, raw.managedCategories, "slug"),
    sellersDirectory: mergeByKey(initial.sellersDirectory, raw.sellersDirectory, "slug"),
    managedProducts: mergeByKey(initial.managedProducts, raw.managedProducts, "id"),
    managedProductReviews: mergeByKey(
      initial.managedProductReviews,
      raw.managedProductReviews,
      "id",
    ),
    managedStoreReviews: mergeByKey(
      initial.managedStoreReviews,
      raw.managedStoreReviews,
      "id",
    ),
    coupons: mergeByKey(initial.coupons, raw.coupons, "id"),
    systemSettings: {
      ...initial.systemSettings,
      ...raw.systemSettings,
      shipping: {
        ...initial.systemSettings.shipping,
        ...raw.systemSettings?.shipping,
      },
      sellerPlatform: {
        ...initial.systemSettings.sellerPlatform,
        ...raw.systemSettings?.sellerPlatform,
        tiers:
          raw.systemSettings?.sellerPlatform?.tiers ?? initial.systemSettings.sellerPlatform.tiers,
      },
      payments: {
        ...initial.systemSettings.payments,
        ...raw.systemSettings?.payments,
      },
      notifications: {
        ...initial.systemSettings.notifications,
        ...raw.systemSettings?.notifications,
      },
      integrations: {
        ...initial.systemSettings.integrations,
        ...raw.systemSettings?.integrations,
      },
    },
    cartsByUserId,
    appliedCouponCodesByUserId,
    orders: ensureOrderItemIds(raw.orders ?? initial.orders).map((order) =>
      ensureOrderLifecycle(order),
    ),
    payments: (raw.payments ?? initial.payments).map((payment) => ({
      ...payment,
      proofIds: payment.proofIds ?? [],
      activeProofId: payment.activeProofId ?? null,
    })),
    paymentProofs: (raw.paymentProofs ?? initial.paymentProofs).map((proof) => ({
      ...proof,
      submittedByRole:
        proof.submittedByRole ??
        users.find((user) => user.id === proof.submittedByUserId)?.role ??
        "CUSTOMER",
      proofKind:
        proof.proofKind ?? (proof.paymentMethod === "COD" ? "COD_COLLECTION" : "MANUAL_TRANSFER"),
      proofSource:
        proof.proofSource ?? (proof.paymentMethod === "COD" ? "ADMIN_CAPTURE" : "CUSTOMER"),
    })),
    commissionRules: raw.commissionRules ?? initial.commissionRules,
    commissions: raw.commissions ?? initial.commissions,
    codRemittances: raw.codRemittances ?? initial.codRemittances,
    sellerSettlements: raw.sellerSettlements ?? initial.sellerSettlements,
    sellerPayouts: (raw.sellerPayouts ?? initial.sellerPayouts).map((payout) => ({
      ...payout,
      settlementIds: payout.settlementIds ?? [],
      totalFees: payout.totalFees ?? 0,
      currency: payout.currency ?? initial.systemSettings.currency,
    })),
    notifications: raw.notifications ?? initial.notifications,
    auditTrail: raw.auditTrail ?? initial.auditTrail,
    inventory: {
      ...initial.inventory,
      ...raw.inventory,
    },
    inventoryMovements: raw.inventoryMovements ?? initial.inventoryMovements,
    paymentSettings: raw.paymentSettings ?? initial.paymentSettings,
    payoutCycleConfig: {
      ...initial.payoutCycleConfig,
      ...raw.payoutCycleConfig,
    },
  };
}
