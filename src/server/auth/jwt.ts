import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl, getServerEnv } from "@/server/config/env";
import { AUTH_SESSION_TTL_MS } from "./session";
import type { AuthUserRecord } from "./types";

export const AUTH_JWT_COOKIE_NAME = "sparekart_auth_jwt";
export const AUTH_JWT_TTL_SECONDS = Math.floor(AUTH_SESSION_TTL_MS / 1000);

export type AuthJwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: AuthUserRecord["role"];
  authProvider?: AuthUserRecord["authProvider"];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

function encodeBase64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64UrlJson<T>(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signPart(input: string) {
  return createHmac("sha256", getServerEnv().JWT_SECRET).update(input).digest("base64url");
}

function buildJwtPayload(user: AuthUserRecord, expiresAt: Date): AuthJwtPayload {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = Math.floor(expiresAt.getTime() / 1000);
  const appUrl = new URL(getAppUrl("/"));
  const audience = appUrl.host;

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authProvider: user.authProvider,
    iat: issuedAtSeconds,
    exp: expiresAtSeconds,
    iss: appUrl.origin,
    aud: audience,
  };
}

export function createAuthJwt(user: AuthUserRecord, expiresAt: Date) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(JSON.stringify(buildJwtPayload(user, expiresAt)));
  const signature = signPart(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

export function verifyAuthJwt(token: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = signPart(`${encodedHeader}.${encodedPayload}`);
  const provided = Buffer.from(encodedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  const payload = decodeBase64UrlJson<AuthJwtPayload>(encodedPayload);

  if (payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return payload;
}

export function buildJwtCookieOptions(expiresAt: Date) {
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

export function buildExpiredJwtCookieOptions() {
  return buildJwtCookieOptions(new Date(0));
}
