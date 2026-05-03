import type { AuthenticatedUser } from "@/modules/auth/client";
import type { CustomerAccount, MarketplaceState, MarketplaceUser, SellerRecord } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ensureUniqueSellerSlug(state: MarketplaceState, baseValue: string) {
  const baseSlug = slugify(baseValue) || "seller-store";
  let candidate = baseSlug;
  let counter = 1;

  while (state.sellersDirectory.some((seller) => seller.slug === candidate)) {
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
}

function buildMarketplaceUser(user: AuthenticatedUser, sellerSlug?: string): MarketplaceUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    authSource: "SERVER",
    pendingSellerProfile: user.pendingSellerProfile,
    createdAt: nowIso(),
    lastLoginAt: user.lastLoginAt ?? nowIso(),
    sellerSlug: sellerSlug ?? user.sellerSlug,
    adminTitle: user.adminTitle,
    adminScopes: user.adminScopes,
  };
}

function buildCustomerAccount(userId: string): CustomerAccount {
  return {
    userId,
    city: "Karachi",
    joinedAt: nowIso().slice(0, 10),
    addresses: [],
    savedVehicles: [],
    wishlistProductIds: [],
    preferences: {
      orderEmailUpdates: true,
      promotions: true,
      priceAlerts: true,
      smsAlerts: false,
      loginAlerts: true,
      twoFactorEnabled: false,
    },
  };
}

function buildSellerRecord(user: AuthenticatedUser, sellerSlug: string): SellerRecord {
  const createdAt = nowIso();
  const storeName = user.pendingSellerProfile?.storeName?.trim() || `${user.name}'s Store`;
  const city = user.pendingSellerProfile?.city?.trim() || "Karachi";

  return {
    slug: sellerSlug,
    name: storeName,
    tagline: "Pending seller onboarding and admin approval.",
    logo: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=400&h=400&q=80",
    banner:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1600&h=640&q=80",
    rating: 0,
    reviewCount: 0,
    productCount: 0,
    city,
    joined: createdAt.slice(0, 10),
    verified: false,
    responseTime: "Within 24 hours",
    description: "New SpareKart seller account awaiting storefront setup.",
    policies: {
      returns: "Standard marketplace return policy applies.",
      shipping: "Shipping details will be configured during onboarding.",
      warranty: "Warranty details will be added by the seller.",
    },
    ownerUserId: user.id,
    status: "PENDING_APPROVAL",
    tier: "STANDARD",
    commissionRate: 10,
    payoutHold: true,
    approvalNote: "Awaiting store setup and marketplace approval.",
    permissions: {
      canFeatureProducts: false,
      canRunCampaigns: false,
      maxProducts: 50,
    },
    socialLinks: {},
    createdAt,
    updatedAt: createdAt,
    lastActiveAt: createdAt,
  };
}

export function syncAuthenticatedMarketplaceUser(
  state: MarketplaceState,
  authUser: AuthenticatedUser | null,
) {
  if (!authUser) {
    const currentUser = state.users.find((user) => user.id === state.currentUserId);

    if (currentUser?.authSource === "SERVER") {
      return {
        ...state,
        currentUserId: "",
      };
    }

    return state;
  }

  let nextState = state;
  let sellerSlug = authUser.sellerSlug;

  if (authUser.role === "SELLER" && !sellerSlug) {
    const existingSeller = nextState.sellersDirectory.find(
      (seller) => seller.ownerUserId === authUser.id,
    );

    if (existingSeller) {
      sellerSlug = existingSeller.slug;
    } else {
      sellerSlug = ensureUniqueSellerSlug(
        nextState,
        authUser.pendingSellerProfile?.storeName || authUser.name,
      );
      nextState = {
        ...nextState,
        sellersDirectory: [...nextState.sellersDirectory, buildSellerRecord(authUser, sellerSlug)],
      };
    }
  }

  const marketplaceUser = buildMarketplaceUser(authUser, sellerSlug);
  const existingUser = nextState.users.find((user) => user.id === authUser.id);

  nextState = {
    ...nextState,
    currentUserId: authUser.id,
    users: existingUser
      ? nextState.users.map((user) =>
          user.id === authUser.id ? { ...user, ...marketplaceUser } : user,
        )
      : [...nextState.users, marketplaceUser],
    cartsByUserId: nextState.cartsByUserId[authUser.id]
      ? nextState.cartsByUserId
      : {
          ...nextState.cartsByUserId,
          [authUser.id]: [],
        },
    appliedCouponCodesByUserId: nextState.appliedCouponCodesByUserId[authUser.id]
      ? nextState.appliedCouponCodesByUserId
      : {
          ...nextState.appliedCouponCodesByUserId,
          [authUser.id]: "",
        },
  };

  if (authUser.role === "CUSTOMER" && !nextState.customerAccounts[authUser.id]) {
    nextState = {
      ...nextState,
      customerAccounts: {
        ...nextState.customerAccounts,
        [authUser.id]: buildCustomerAccount(authUser.id),
      },
    };
  }

  return nextState;
}
