import "server-only";

import { Types } from "mongoose";
import { MongoApiError } from "./errors";

export function normalizeMongoDocument<T>(value: T): T & { id?: string } {
  const normalized = JSON.parse(JSON.stringify(value)) as T & {
    _id?: string;
    id?: string;
  };

  if (normalized._id && !normalized.id) {
    normalized.id = normalized._id;
  }

  delete normalized._id;
  return normalized;
}

export function assertObjectId(id: string, label = "record") {
  if (!Types.ObjectId.isValid(id)) {
    throw new MongoApiError(`Invalid ${label} id.`, {
      status: 400,
      code: "INVALID_ID",
      details: { id },
    });
  }
}

export function buildPaginationMeta(input: { page: number; limit: number; total: number }) {
  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages: input.total === 0 ? 0 : Math.ceil(input.total / input.limit),
  };
}
