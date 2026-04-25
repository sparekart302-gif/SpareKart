import "server-only";

import { connectToMongo } from "@/server/mongodb/connection";
import { MongoApiError } from "@/server/mongodb/errors";
import { OrderModel } from "@/server/mongodb/models/order";
import {
  createOrderSchema,
  type CreateOrderInput,
  updateOrderSchema,
  type UpdateOrderInput,
} from "@/server/mongodb/validators";
import {
  assertObjectId,
  buildPaginationMeta,
  normalizeMongoDocument,
} from "@/server/mongodb/utils";

export async function listOrders(input: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isGuest?: boolean;
}) {
  await connectToMongo();

  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};

  if (input.search) {
    query.$or = [
      { orderNumber: { $regex: input.search, $options: "i" } },
      { "customer.name": { $regex: input.search, $options: "i" } },
      { "customer.email": { $regex: input.search, $options: "i" } },
      { "customer.phone": { $regex: input.search, $options: "i" } },
      { trackingNumber: { $regex: input.search, $options: "i" } },
    ];
  }

  if (input.status) {
    query.status = input.status;
  }

  if (input.paymentStatus) {
    query.paymentStatus = input.paymentStatus;
  }

  if (input.paymentMethod) {
    query.paymentMethod = input.paymentMethod;
  }

  if (typeof input.isGuest === "boolean") {
    query["customer.isGuest"] = input.isGuest;
  }

  const [rows, total] = await Promise.all([
    OrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OrderModel.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => normalizeMongoDocument(row)),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function createOrder(input: CreateOrderInput) {
  await connectToMongo();
  const parsed = createOrderSchema.parse(input);

  const existing = await OrderModel.findOne({ orderNumber: parsed.orderNumber }).lean();

  if (existing) {
    throw new MongoApiError("An order with this order number already exists.", {
      status: 409,
      code: "ORDER_EXISTS",
    });
  }

  const created = await OrderModel.create(parsed);
  return normalizeMongoDocument(created.toObject());
}

export async function getOrderById(orderId: string) {
  await connectToMongo();
  assertObjectId(orderId, "order");

  const record = await OrderModel.findById(orderId).lean();

  if (!record) {
    throw new MongoApiError("Order not found.", {
      status: 404,
      code: "ORDER_NOT_FOUND",
    });
  }

  return normalizeMongoDocument(record);
}

export async function updateOrder(orderId: string, input: UpdateOrderInput) {
  await connectToMongo();
  assertObjectId(orderId, "order");
  const parsed = updateOrderSchema.parse(input);

  const updated = await OrderModel.findByIdAndUpdate(orderId, parsed, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    throw new MongoApiError("Order not found.", {
      status: 404,
      code: "ORDER_NOT_FOUND",
    });
  }

  return normalizeMongoDocument(updated);
}

export async function deleteOrder(orderId: string) {
  await connectToMongo();
  assertObjectId(orderId, "order");

  const deleted = await OrderModel.findByIdAndDelete(orderId).lean();

  if (!deleted) {
    throw new MongoApiError("Order not found.", {
      status: 404,
      code: "ORDER_NOT_FOUND",
    });
  }

  return normalizeMongoDocument(deleted);
}
