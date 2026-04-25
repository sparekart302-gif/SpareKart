import "server-only";

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { MongoApiError } from "./errors";

export function jsonMongoError(error: unknown, fallbackMessage: string) {
  if (error instanceof MongoApiError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
        ...(error.details ?? {}),
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed.",
        code: "VALIDATION_ERROR",
        issues: error.flatten(),
      },
      { status: 422 },
    );
  }

  if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    const duplicateError = error as {
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };

    return NextResponse.json(
      {
        ok: false,
        error: "A record with the same unique field already exists.",
        code: "DUPLICATE_KEY",
        keyPattern: duplicateError.keyPattern,
        keyValue: duplicateError.keyValue,
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status: 500 },
  );
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
