import "server-only";

import { z, ZodError } from "zod";
import { AuthApiError } from "@/server/auth/errors";
import { jsonFailure } from "@/server/http/responses";
import { MongoApiError } from "./errors";

export function jsonMongoError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthApiError) {
    return jsonFailure(error.message, {
      status: error.status,
      code: error.code,
      extra: error.details,
    });
  }

  if (error instanceof MongoApiError) {
    return jsonFailure(error.message, {
      status: error.status,
      code: error.code,
      extra: error.details,
    });
  }

  if (error instanceof ZodError) {
    return jsonFailure("Validation failed.", {
      status: 422,
      code: "VALIDATION_ERROR",
      extra: {
        issues: error.flatten(),
      },
    });
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    const duplicateError = error as {
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };

    return jsonFailure("A record with the same unique field already exists.", {
      status: 409,
      code: "DUPLICATE_KEY",
      extra: {
        keyPattern: duplicateError.keyPattern,
        keyValue: duplicateError.keyValue,
      },
    });
  }

  return jsonFailure(error instanceof Error ? error.message : fallbackMessage, {
    status: 500,
  });
}

export function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

export function parseBooleanParam(value: string | null) {
  if (value === null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}
