import "server-only";

import { hashPassword } from "@/server/auth/password";
import { connectToMongo } from "@/server/mongodb/connection";
import { MongoApiError } from "@/server/mongodb/errors";
import { UserModel } from "@/server/mongodb/models/user";
import {
  createUserSchema,
  type CreateUserInput,
  updateUserSchema,
  type UpdateUserInput,
} from "@/server/mongodb/validators";
import {
  assertObjectId,
  buildPaginationMeta,
  normalizeMongoDocument,
} from "@/server/mongodb/utils";

function sanitizeUserRecord<T>(value: T) {
  const normalized = normalizeMongoDocument(value) as T & {
    passwordHash?: string;
  };

  delete normalized.passwordHash;
  return normalized;
}

export async function listUsers(input: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  await connectToMongo();

  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};

  if (input.search) {
    query.$or = [
      { name: { $regex: input.search, $options: "i" } },
      { email: { $regex: input.search, $options: "i" } },
      { phone: { $regex: input.search, $options: "i" } },
      { sellerSlug: { $regex: input.search, $options: "i" } },
    ];
  }

  if (input.role) {
    query.role = input.role;
  }

  if (input.status) {
    query.status = input.status;
  }

  const [rows, total] = await Promise.all([
    UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    UserModel.countDocuments(query),
  ]);

  return {
    items: rows.map((row) => sanitizeUserRecord(row)),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function createUser(input: CreateUserInput) {
  await connectToMongo();
  const parsed = createUserSchema.parse(input);

  const existing = await UserModel.findOne({ email: parsed.email.toLowerCase() }).lean();

  if (existing) {
    throw new MongoApiError("A user with this email already exists.", {
      status: 409,
      code: "USER_EXISTS",
    });
  }

  const passwordHash = await hashPassword(parsed.password);

  const created = await UserModel.create({
    ...parsed,
    email: parsed.email.toLowerCase(),
    passwordHash,
  });

  return sanitizeUserRecord(created.toObject());
}

export async function getUserById(userId: string) {
  await connectToMongo();
  assertObjectId(userId, "user");

  const record = await UserModel.findById(userId).lean();

  if (!record) {
    throw new MongoApiError("User not found.", {
      status: 404,
      code: "USER_NOT_FOUND",
    });
  }

  return sanitizeUserRecord(record);
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  await connectToMongo();
  assertObjectId(userId, "user");
  const parsed = updateUserSchema.parse(input);

  const updatePayload: Record<string, unknown> = {
    ...parsed,
  };

  if (parsed.email) {
    updatePayload.email = parsed.email.toLowerCase();
  }

  if (parsed.password) {
    updatePayload.passwordHash = await hashPassword(parsed.password);
    delete updatePayload.password;
  }

  const updated = await UserModel.findByIdAndUpdate(userId, updatePayload, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    throw new MongoApiError("User not found.", {
      status: 404,
      code: "USER_NOT_FOUND",
    });
  }

  return sanitizeUserRecord(updated);
}

export async function deleteUser(userId: string) {
  await connectToMongo();
  assertObjectId(userId, "user");

  const deleted = await UserModel.findByIdAndDelete(userId).lean();

  if (!deleted) {
    throw new MongoApiError("User not found.", {
      status: 404,
      code: "USER_NOT_FOUND",
    });
  }

  return sanitizeUserRecord(deleted);
}
