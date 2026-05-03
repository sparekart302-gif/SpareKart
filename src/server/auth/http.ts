import "server-only";

import type { NextRequest } from "next/server";
import { AuthApiError } from "./errors";
import { jsonFailure } from "@/server/http/responses";

export function getDeviceMeta(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: forwardedFor?.split(",")[0]?.trim() ?? undefined,
  };
}

export function jsonError(message: string, status = 400, extras?: Record<string, unknown>) {
  return jsonFailure(message, {
    status,
    extra: extras,
  });
}

export function jsonAuthError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthApiError) {
    return jsonFailure(error.message, {
      status: error.status,
      code: error.code,
      extra: error.details,
    });
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return jsonFailure(message, {
    status: 500,
  });
}
