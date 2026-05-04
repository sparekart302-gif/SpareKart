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
import {
  MarketplaceOrderModel,
  MarketplacePaymentModel,
  MarketplaceProductModel,
  MarketplaceUserModel,
} from "@/server/mongodb/models/marketplace";
import { buildPaginationMeta, normalizeMongoDocument } from "@/server/mongodb/utils";
import { measureAsync } from "@/server/performance";
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
  const search = input.search?.trim().toLowerCase();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, input.limit ?? 20);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { name: pattern },
      { email: pattern },
      { phone: pattern },
      { sellerSlug: pattern },
    ];
  }

  if (input.role) {
    filter.role = input.role;
  }

  if (input.status) {
    filter.status = input.status;
  }

  return measureAsync(
    "admin.users.list",
    async () => {
      const [items, total] = await Promise.all([
        MarketplaceUserModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<MarketplaceUser[]>(),
        MarketplaceUserModel.countDocuments(filter),
      ]);

      return {
        items: items.map((item) => normalizeMongoDocument(item) as MarketplaceUser),
        meta: buildPaginationMeta({
          page,
          limit,
          total,
        }),
      };
    },
    {
      details: {
        page,
        limit,
        hasSearch: Boolean(search),
      },
    },
  ).then(({ result }) => result);
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
  const search = input.search?.trim().toLowerCase();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, input.limit ?? 20);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    andConditions.push({
      $or: [
        { title: pattern },
        { brand: pattern },
        { sku: pattern },
        { description: pattern },
      ],
    });
  }

  if (input.category) {
    filter.category = input.category;
  }

  if (input.sellerSlug) {
    filter.sellerSlug = input.sellerSlug;
  }

  if (typeof input.isActive === "boolean") {
    if (input.isActive) {
      filter.moderationStatus = "ACTIVE";
      filter.deletedAt = null;
    } else {
      andConditions.push({
        $or: [{ moderationStatus: { $ne: "ACTIVE" } }, { deletedAt: { $ne: null } }],
      });
    }
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  return measureAsync(
    "admin.products.list",
    async () => {
      const [items, total] = await Promise.all([
        MarketplaceProductModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<ManagedProduct[]>(),
        MarketplaceProductModel.countDocuments(filter),
      ]);

      return {
        items: items.map((item) => normalizeMongoDocument(item) as ManagedProduct),
        meta: buildPaginationMeta({
          page,
          limit,
          total,
        }),
      };
    },
    {
      details: {
        page,
        limit,
        hasSearch: Boolean(search),
      },
    },
  ).then(({ result }) => result);
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
  const search = input.search?.trim().toLowerCase();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, input.limit ?? 20);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { orderNumber: pattern },
      { customerEmail: pattern },
      { "shippingAddress.fullName": pattern },
      { "shippingAddress.phone": pattern },
    ];
  }

  if (input.status) {
    filter.status = input.status;
  }

  if (input.paymentMethod) {
    filter.paymentMethod = input.paymentMethod;
  }

  if (typeof input.isGuest === "boolean") {
    filter.customerType = input.isGuest ? "GUEST" : "REGISTERED";
  }

  if (input.paymentStatus) {
    const matchingOrderIds = await MarketplacePaymentModel.find({
      status: input.paymentStatus,
    })
      .select({ orderId: 1, _id: 0 })
      .lean<{ orderId: string }[]>();

    filter._id = {
      $in: matchingOrderIds.map((payment) => payment.orderId),
    };
  }

  return measureAsync(
    "admin.orders.list",
    async () => {
      const [items, total] = await Promise.all([
        MarketplaceOrderModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<MarketplaceOrder[]>(),
        MarketplaceOrderModel.countDocuments(filter),
      ]);

      const orderIds = items
        .map((order) => normalizeMongoDocument(order).id)
        .filter((orderId): orderId is string => Boolean(orderId));
      const payments = await MarketplacePaymentModel.find({
        orderId: {
          $in: orderIds,
        },
      })
        .select({ orderId: 1, status: 1, activeProofId: 1 })
        .lean<{ orderId: string; status?: PaymentStatus; activeProofId?: string | null }[]>();

      const paymentByOrderId = new Map(payments.map((payment) => [payment.orderId, payment]));
      const records = items.map((order) => {
        const normalizedOrder = normalizeMongoDocument(order) as MarketplaceOrder;

        return {
          ...normalizedOrder,
          paymentStatus: paymentByOrderId.get(normalizedOrder.id)?.status,
          activeProofId: paymentByOrderId.get(normalizedOrder.id)?.activeProofId ?? null,
        };
      });

      return {
        items: records,
        meta: buildPaginationMeta({
          page,
          limit,
          total,
        }),
      };
    },
    {
      details: {
        page,
        limit,
        hasSearch: Boolean(search),
      },
    },
  ).then(({ result }) => result);
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
