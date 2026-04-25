import "server-only";

import { connectToMongo } from "@/server/mongodb/connection";
import { MongoApiError } from "@/server/mongodb/errors";
import { ProductModel } from "@/server/mongodb/models/product";
import {
  createProductSchema,
  type CreateProductInput,
  updateProductSchema,
  type UpdateProductInput,
} from "@/server/mongodb/validators";
import {
  assertObjectId,
  buildPaginationMeta,
  normalizeMongoDocument,
} from "@/server/mongodb/utils";

function buildSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listProducts(input: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sellerSlug?: string;
  isActive?: boolean;
}) {
  await connectToMongo();

  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (input.search) {
    query.$or = [
      { title: { $regex: input.search, $options: "i" } },
      { brand: { $regex: input.search, $options: "i" } },
      { sku: { $regex: input.search, $options: "i" } },
      { description: { $regex: input.search, $options: "i" } },
    ];
  }

  if (input.category) {
    query.category = input.category;
  }

  if (input.sellerSlug) {
    query.sellerSlug = input.sellerSlug;
  }

  if (typeof input.isActive === "boolean") {
    query.isActive = input.isActive;
  }

  const [rows, total] = await Promise.all([
    ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ProductModel.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => normalizeMongoDocument(row)),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function createProduct(input: CreateProductInput) {
  await connectToMongo();
  const parsed = createProductSchema.parse(input);
  const slug = parsed.slug ? buildSlug(parsed.slug) : buildSlug(parsed.title);

  const existing = await ProductModel.findOne({
    $or: [{ slug }, { sku: parsed.sku }],
  }).lean();

  if (existing) {
    throw new MongoApiError("A product with the same slug or SKU already exists.", {
      status: 409,
      code: "PRODUCT_EXISTS",
    });
  }

  const created = await ProductModel.create({
    ...parsed,
    slug,
  });

  return normalizeMongoDocument(created.toObject());
}

export async function getProductById(productId: string) {
  await connectToMongo();
  assertObjectId(productId, "product");

  const record = await ProductModel.findById(productId).lean();

  if (!record) {
    throw new MongoApiError("Product not found.", {
      status: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  }

  return normalizeMongoDocument(record);
}

export async function updateProduct(productId: string, input: UpdateProductInput) {
  await connectToMongo();
  assertObjectId(productId, "product");
  const parsed = updateProductSchema.parse(input);

  const updatePayload = {
    ...parsed,
    ...(parsed.slug ? { slug: buildSlug(parsed.slug) } : {}),
  };

  const updated = await ProductModel.findByIdAndUpdate(productId, updatePayload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    throw new MongoApiError("Product not found.", {
      status: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  }

  return normalizeMongoDocument(updated);
}

export async function deleteProduct(productId: string) {
  await connectToMongo();
  assertObjectId(productId, "product");

  const deleted = await ProductModel.findByIdAndDelete(productId).lean();

  if (!deleted) {
    throw new MongoApiError("Product not found.", {
      status: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  }

  return normalizeMongoDocument(deleted);
}
