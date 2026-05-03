import type {
  AdminScope,
  AppRole,
  MarketplaceOrder,
  MarketplaceState,
  MarketplaceUser,
  PaymentRecord,
} from "./types";

function hasRole(user: MarketplaceUser | undefined, roles: AppRole[]) {
  return !!user && roles.includes(user.role);
}

export function isAdmin(user: MarketplaceUser | undefined) {
  return hasRole(user, ["ADMIN", "SUPER_ADMIN"]);
}

export function isSeller(user: MarketplaceUser | undefined) {
  return hasRole(user, ["SELLER"]);
}

export function isCustomer(user: MarketplaceUser | undefined) {
  return hasRole(user, ["CUSTOMER"]);
}

export function canReviewPayments(user: MarketplaceUser | undefined) {
  return isAdmin(user);
}

export function getAdminScopes(user: MarketplaceUser | undefined) {
  if (!user || !isAdmin(user)) {
    return [] as AdminScope[];
  }

  if (user.role === "SUPER_ADMIN") {
    return [
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
    ] as AdminScope[];
  }

  return (
    user.adminScopes ?? [
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
    ]
  );
}

export function canAccessAdminScope(user: MarketplaceUser | undefined, scope: AdminScope) {
  return getAdminScopes(user).includes(scope);
}

export function canViewOrder(user: MarketplaceUser | undefined, order: MarketplaceOrder) {
  if (!user) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (user.role === "CUSTOMER") {
    return order.customerUserId === user.id;
  }

  if (user.role === "SELLER") {
    return !!user.sellerSlug && order.items.some((item) => item.sellerSlug === user.sellerSlug);
  }

  return false;
}

export function canUploadProof(
  user: MarketplaceUser | undefined,
  order: MarketplaceOrder,
  payment: PaymentRecord,
) {
  if (!user || user.role !== "CUSTOMER") {
    return false;
  }

  if (order.customerUserId !== user.id) {
    return false;
  }

  if (payment.method === "COD") {
    return false;
  }

  return payment.status === "REQUIRES_PROOF" || payment.status === "REJECTED";
}

export function canViewProof(user: MarketplaceUser | undefined, order: MarketplaceOrder) {
  if (!user) {
    return false;
  }

  return isAdmin(user) || order.customerUserId === user.id;
}

export function getCurrentUser(state: MarketplaceState) {
  return state.users.find((user) => user.id === state.currentUserId);
}
