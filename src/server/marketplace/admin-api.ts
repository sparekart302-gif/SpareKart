import "server-only";

import type {
  AdminUserInput,
  ManagedProductInput,
  ManagedProduct,
  MarketplaceOrder,
  MarketplaceState,
  MarketplaceUser,
  PaymentStatus,
} from "@/modules/marketplace/types";
import { MongoApiError } from "@/server/mongodb/errors";
import { buildPaginationMeta } from "@/server/mongodb/utils";
import { getMarketplaceState } from "./persistence";
import { executeMarketplaceCommand } from "./service";

type OrderAdminRecord = MarketplaceOrder & {
  paymentStatus?: PaymentStatus;
  activeProofId?: string | null;
};

function includesSearch(value: string | undefined, search: string) {
  return value?.toLowerCase().includes(search) ?? false;
}

function paginate<T>(items: T[], page = 1, limit = 20) {
  const total = items.length;
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const start = (safePage - 1) * safeLimit;

  return {
    items: items.slice(start, start + safeLimit),
    meta: buildPaginationMeta({
      page: safePage,
      limit: safeLimit,
      total,
    }),
  };
}

function requireMarketplaceUser(state: MarketplaceState, userId: string) {
  const user = state.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new MongoApiError("User not found.", {
      status: 404,
      code: "USER_NOT_FOUND",
    });
  }

  return user;
}

function requireMarketplaceProduct(state: MarketplaceState, productId: string) {
  const product = state.managedProducts.find((candidate) => candidate.id === productId);

  if (!product) {
    throw new MongoApiError("Product not found.", {
      status: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  }

  return product;
}

function requireMarketplaceOrder(state: MarketplaceState, orderId: string) {
  const order = state.orders.find((candidate) => candidate.id === orderId);

  if (!order) {
    throw new MongoApiError("Order not found.", {
      status: 404,
      code: "ORDER_NOT_FOUND",
    });
  }

  return order;
}

function mapOrderAdminRecord(state: MarketplaceState, order: MarketplaceOrder): OrderAdminRecord {
  const payment = state.payments.find((candidate) => candidate.id === order.paymentId);

  return {
    ...order,
    paymentStatus: payment?.status,
    activeProofId: payment?.activeProofId ?? null,
  };
}

function mapProductActiveState(product: ManagedProduct) {
  return product.moderationStatus === "ACTIVE" && !product.deletedAt;
}

export async function listMarketplaceUsersAdmin(input: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  const state = await getMarketplaceState();
  const search = input.search?.trim().toLowerCase();
  let items = [...state.users];

  if (search) {
    items = items.filter(
      (user) =>
        includesSearch(user.name, search) ||
        includesSearch(user.email, search) ||
        includesSearch(user.phone, search) ||
        includesSearch(user.sellerSlug, search),
    );
  }

  if (input.role) {
    items = items.filter((user) => user.role === input.role);
  }

  if (input.status) {
    items = items.filter((user) => user.status === input.status);
  }

  items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return paginate(items, input.page, input.limit);
}

export async function getMarketplaceUserAdmin(userId: string) {
  const state = await getMarketplaceState();
  return requireMarketplaceUser(state, userId);
}

export async function createMarketplaceUserAdmin(input: AdminUserInput) {
  const result = await executeMarketplaceCommand({
    command: "SAVE_USER",
    payload: input,
  });
  const user = result.state.users.find((candidate) => candidate.email === input.email);

  if (!user) {
    throw new MongoApiError("User was saved but could not be reloaded.", {
      status: 500,
      code: "USER_RELOAD_FAILED",
    });
  }

  return user;
}

export async function updateMarketplaceUserAdmin(
  userId: string,
  input: Partial<AdminUserInput>,
) {
  const current = await getMarketplaceUserAdmin(userId);
  const result = await executeMarketplaceCommand({
    command: "SAVE_USER",
    payload: {
      ...current,
      ...input,
      id: userId,
    },
  });
  return requireMarketplaceUser(result.state, userId);
}

export async function deleteMarketplaceUserAdmin(userId: string) {
  const current = await getMarketplaceUserAdmin(userId);
  await executeMarketplaceCommand({
    command: "DELETE_USER",
    payload: {
      userId,
    },
  });
  return current;
}

export async function listMarketplaceProductsAdmin(input: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sellerSlug?: string;
  isActive?: boolean;
}) {
  const state = await getMarketplaceState();
  const search = input.search?.trim().toLowerCase();
  let items = [...state.managedProducts];

  if (search) {
    items = items.filter(
      (product) =>
        includesSearch(product.title, search) ||
        includesSearch(product.brand, search) ||
        includesSearch(product.sku, search) ||
        includesSearch(product.description, search),
    );
  }

  if (input.category) {
    items = items.filter((product) => product.category === input.category);
  }

  if (input.sellerSlug) {
    items = items.filter((product) => product.sellerSlug === input.sellerSlug);
  }

  if (typeof input.isActive === "boolean") {
    items = items.filter((product) => mapProductActiveState(product) === input.isActive);
  }

  items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return paginate(items, input.page, input.limit);
}

export async function getMarketplaceProductAdmin(productId: string) {
  const state = await getMarketplaceState();
  return requireMarketplaceProduct(state, productId);
}

export async function createMarketplaceProductAdmin(input: ManagedProductInput) {
  const result = await executeMarketplaceCommand({
    command: "SAVE_PRODUCT",
    payload: input,
  });
  const product = input.id
    ? result.state.managedProducts.find((candidate) => candidate.id === input.id)
    : result.state.managedProducts.find((candidate) => candidate.slug === input.slug);

  if (!product) {
    throw new MongoApiError("Product was saved but could not be reloaded.", {
      status: 500,
      code: "PRODUCT_RELOAD_FAILED",
    });
  }

  return product;
}

export async function updateMarketplaceProductAdmin(
  productId: string,
  input: Partial<ManagedProductInput>,
) {
  const current = await getMarketplaceProductAdmin(productId);
  const result = await executeMarketplaceCommand({
    command: "SAVE_PRODUCT",
    payload: {
      ...current,
      ...input,
      id: productId,
    },
  });
  return requireMarketplaceProduct(result.state, productId);
}

export async function deleteMarketplaceProductAdmin(productId: string) {
  const current = await getMarketplaceProductAdmin(productId);
  await executeMarketplaceCommand({
    command: "DELETE_PRODUCT",
    payload: {
      productId,
    },
  });
  return current;
}

export async function listMarketplaceOrdersAdmin(input: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isGuest?: boolean;
}) {
  const state = await getMarketplaceState();
  const search = input.search?.trim().toLowerCase();
  let items = state.orders.map((order) => mapOrderAdminRecord(state, order));

  if (search) {
    items = items.filter(
      (order) =>
        includesSearch(order.orderNumber, search) ||
        includesSearch(order.customerEmail, search) ||
        includesSearch(order.shippingAddress.fullName, search) ||
        includesSearch(order.shippingAddress.phone, search),
    );
  }

  if (input.status) {
    items = items.filter((order) => order.status === input.status);
  }

  if (input.paymentStatus) {
    items = items.filter((order) => order.paymentStatus === input.paymentStatus);
  }

  if (input.paymentMethod) {
    items = items.filter((order) => order.paymentMethod === input.paymentMethod);
  }

  if (typeof input.isGuest === "boolean") {
    items = items.filter((order) => (order.customerType === "GUEST") === input.isGuest);
  }

  items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return paginate(items, input.page, input.limit);
}

export async function getMarketplaceOrderAdmin(orderId: string) {
  const state = await getMarketplaceState();
  const order = requireMarketplaceOrder(state, orderId);
  return mapOrderAdminRecord(state, order);
}

export function assertMarketplaceOrderMutationUnsupported() {
  throw new MongoApiError(
    "Orders must be created through checkout and updated through marketplace payment or fulfillment workflows.",
    {
      status: 405,
      code: "ORDER_WORKFLOW_ONLY",
    },
  );
}
