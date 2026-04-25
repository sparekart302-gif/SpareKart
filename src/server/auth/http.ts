import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { AuthApiError } from "./errors";

export function getDeviceMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: forwardedFor?.split(",")[0]?.trim() ?? undefined,
  };
}

export function jsonError(
  message: string,
  status = 400,
  extras?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, error: message, ...(extras ?? {}) }, { status });
}

export function jsonAuthError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthApiError) {
    return jsonError(error.message, error.status, {
      code: error.code,
      ...(error.details ?? {}),
    });
  }

  return jsonError(error instanceof Error ? error.message : fallbackMessage);
}
