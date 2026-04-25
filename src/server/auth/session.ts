import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const AUTH_COOKIE_NAME = "sparekart_auth";
export const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

