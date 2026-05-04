import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { getServerEnv } from "@/server/config/env";

export const AUTH_COOKIE_NAME = "sparekart_auth";
export const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionCookieOptions(expiresAt: Date) {
  const env = getServerEnv();

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
  };
}

export function buildExpiredSessionCookieOptions() {
  return buildSessionCookieOptions(new Date(0));
}
