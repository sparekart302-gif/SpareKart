import "server-only";

import { isAbsolute, join } from "node:path";
import { z } from "zod";
import {
  hasConfiguredGoogleClientId,
  hasConfiguredMongoUri,
  hasConfiguredValue,
} from "./env-flags";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const DEFAULT_JWT_SECRET = "sparekart-local-jwt-secret-change-me-2026";

function isDisallowedPublicHostname(hostname: string) {
  return /^0(?:\.0){3}$/.test(hostname) || hostname === "::" || hostname === "[::]";
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: optionalString,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXTAUTH_URL: optionalUrl,
  AUTH_URL: optionalUrl,
  APP_URL: optionalUrl,
  BASE_URL: optionalUrl,
  SITE_URL: optionalUrl,
  MONGODB_URI: optionalString,
  MONGODB_DB_NAME: optionalString,
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalEmail,
  RESEND_FROM_NAME: optionalString.default("SpareKart"),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  JWT_SECRET: z.string().min(32).default(DEFAULT_JWT_SECRET),
  DATABASE_URL: optionalString,
  SPAREKART_RUNTIME_DIR: optionalString,
  SPAREKART_SEED_PASSWORD: optionalString,
  SPAREKART_SUPER_ADMIN_EMAIL: optionalEmail,
  SPAREKART_SUPER_ADMIN_PASSWORD: optionalString,
  SPAREKART_SUPERADMIN_EMAIL: optionalEmail,
  SPAREKART_SUPERADMIN_PASSWORD: optionalString,
});

export type ServerEnv = z.infer<typeof envSchema> & {
  publicSiteUrl: string;
  publicSiteUrlSource: string;
  cookieDomain?: string;
  runtimeRoot: string;
  mongodbConfigured: boolean;
  resendConfigured: boolean;
  googleConfigured: boolean;
  resendPartiallyConfigured: boolean;
  googlePartiallyConfigured: boolean;
  jwtUsesDefault: boolean;
  resolvedSuperAdminEmail?: string;
  resolvedSuperAdminPassword?: string;
  seedPasswordConfigured: boolean;
  superAdminPasswordConfigured: boolean;
};

let cachedEnv: ServerEnv | null = null;

function getAppRoot() {
  return process.env.SPAREKART_APP_ROOT || process.env.INIT_CWD || process.cwd();
}

function resolveRuntimeRoot(runtimeDir?: string) {
  if (!runtimeDir) {
    return join(/* turbopackIgnore: true */ getAppRoot(), ".sparekart-runtime");
  }

  return isAbsolute(runtimeDir)
    ? runtimeDir
    : join(/* turbopackIgnore: true */ getAppRoot(), runtimeDir);
}

function resolvePreferredValue(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0);
}

function readRuntimeEnv(name: string) {
  return process.env[name];
}

function isIpHostname(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function normalizePublicSiteUrl(value: string) {
  const url = new URL(value);

  if (isDisallowedPublicHostname(url.hostname)) {
    return null;
  }

  url.hash = "";
  url.search = "";

  if (!url.pathname) {
    url.pathname = "/";
  } else if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }

  return url.toString();
}

function resolveCookieDomain(publicSiteUrl: string, nodeEnv: z.infer<typeof envSchema>["NODE_ENV"]) {
  if (nodeEnv !== "production") {
    return undefined;
  }

  const hostname = new URL(publicSiteUrl).hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isDisallowedPublicHostname(hostname) ||
    isIpHostname(hostname)
  ) {
    return undefined;
  }

  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function resolvePublicSiteUrl(parsed: z.infer<typeof envSchema>) {
  const configuredCandidates = [
    { source: "NEXT_PUBLIC_SITE_URL", value: parsed.NEXT_PUBLIC_SITE_URL },
    { source: "NEXTAUTH_URL", value: parsed.NEXTAUTH_URL },
    { source: "AUTH_URL", value: parsed.AUTH_URL },
    { source: "APP_URL", value: parsed.APP_URL },
    { source: "BASE_URL", value: parsed.BASE_URL },
    { source: "SITE_URL", value: parsed.SITE_URL },
  ];

  for (const candidate of configuredCandidates) {
    if (!candidate.value) {
      continue;
    }

    const normalized = normalizePublicSiteUrl(candidate.value);

    if (normalized) {
      return {
        publicSiteUrl: normalized,
        publicSiteUrlSource: candidate.source,
      };
    }
  }

  const fallbackUrl =
    parsed.NODE_ENV === "production"
      ? "https://sparekart.live/"
      : `http://localhost:${parsed.PORT ?? "3000"}/`;

  return {
    publicSiteUrl: fallbackUrl,
    publicSiteUrlSource: "fallback",
  };
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.parse({
    NODE_ENV: readRuntimeEnv("NODE_ENV"),
    PORT: readRuntimeEnv("PORT"),
    NEXT_PUBLIC_SITE_URL: readRuntimeEnv("NEXT_PUBLIC_SITE_URL"),
    NEXTAUTH_URL: readRuntimeEnv("NEXTAUTH_URL"),
    AUTH_URL: readRuntimeEnv("AUTH_URL"),
    APP_URL: readRuntimeEnv("APP_URL"),
    BASE_URL: readRuntimeEnv("BASE_URL"),
    SITE_URL: readRuntimeEnv("SITE_URL"),
    MONGODB_URI: readRuntimeEnv("MONGODB_URI"),
    MONGODB_DB_NAME: readRuntimeEnv("MONGODB_DB_NAME"),
    RESEND_API_KEY: readRuntimeEnv("RESEND_API_KEY"),
    RESEND_FROM_EMAIL: readRuntimeEnv("RESEND_FROM_EMAIL"),
    RESEND_FROM_NAME: readRuntimeEnv("RESEND_FROM_NAME"),
    GOOGLE_CLIENT_ID: readRuntimeEnv("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: readRuntimeEnv("GOOGLE_CLIENT_SECRET"),
    JWT_SECRET: readRuntimeEnv("JWT_SECRET"),
    DATABASE_URL: readRuntimeEnv("DATABASE_URL"),
    SPAREKART_RUNTIME_DIR: readRuntimeEnv("SPAREKART_RUNTIME_DIR"),
    SPAREKART_SEED_PASSWORD: readRuntimeEnv("SPAREKART_SEED_PASSWORD"),
    SPAREKART_SUPER_ADMIN_EMAIL: readRuntimeEnv("SPAREKART_SUPER_ADMIN_EMAIL"),
    SPAREKART_SUPER_ADMIN_PASSWORD: readRuntimeEnv("SPAREKART_SUPER_ADMIN_PASSWORD"),
    SPAREKART_SUPERADMIN_EMAIL: readRuntimeEnv("SPAREKART_SUPERADMIN_EMAIL"),
    SPAREKART_SUPERADMIN_PASSWORD: readRuntimeEnv("SPAREKART_SUPERADMIN_PASSWORD"),
  });

  const resolvedSuperAdminEmail = resolvePreferredValue(
    parsed.SPAREKART_SUPER_ADMIN_EMAIL,
    parsed.SPAREKART_SUPERADMIN_EMAIL,
  );
  const resolvedSuperAdminPassword = resolvePreferredValue(
    parsed.SPAREKART_SUPER_ADMIN_PASSWORD,
    parsed.SPAREKART_SUPERADMIN_PASSWORD,
  );
  const { publicSiteUrl, publicSiteUrlSource } = resolvePublicSiteUrl(parsed);
  const resendKeyConfigured = hasConfiguredValue(parsed.RESEND_API_KEY);
  const resendFromConfigured = hasConfiguredValue(parsed.RESEND_FROM_EMAIL);
  const googleClientIdConfigured = hasConfiguredGoogleClientId(parsed.GOOGLE_CLIENT_ID);
  const googleClientSecretConfigured = hasConfiguredValue(parsed.GOOGLE_CLIENT_SECRET);

  cachedEnv = {
    ...parsed,
    publicSiteUrl,
    publicSiteUrlSource,
    cookieDomain: resolveCookieDomain(publicSiteUrl, parsed.NODE_ENV),
    runtimeRoot: resolveRuntimeRoot(parsed.SPAREKART_RUNTIME_DIR),
    mongodbConfigured: hasConfiguredMongoUri(parsed.MONGODB_URI),
    resendConfigured: resendKeyConfigured && resendFromConfigured,
    resendPartiallyConfigured: resendKeyConfigured !== resendFromConfigured,
    googleConfigured: googleClientIdConfigured && googleClientSecretConfigured,
    googlePartiallyConfigured: googleClientIdConfigured !== googleClientSecretConfigured,
    jwtUsesDefault: parsed.JWT_SECRET === DEFAULT_JWT_SECRET,
    resolvedSuperAdminEmail,
    resolvedSuperAdminPassword,
    seedPasswordConfigured: hasConfiguredValue(parsed.SPAREKART_SEED_PASSWORD),
    superAdminPasswordConfigured: hasConfiguredValue(resolvedSuperAdminPassword),
  };

  return cachedEnv;
}

export function getAppUrl(path = "/", baseUrl?: string | URL) {
  return new URL(path, baseUrl ?? getServerEnv().publicSiteUrl).toString();
}

type RequestLike =
  | string
  | URL
  | {
      headers?: Headers | { get(name: string): string | null | undefined };
      nextUrl?: { origin?: string; protocol?: string };
      url?: string;
    }
  | null
  | undefined;

function readHeader(
  headers: Headers | { get(name: string): string | null | undefined } | undefined,
  name: string,
) {
  return headers?.get(name) ?? undefined;
}

function extractRequestOrigins(input: RequestLike) {
  if (!input) {
    return [];
  }

  if (typeof input === "string") {
    return [input];
  }

  if (input instanceof URL) {
    return [input.origin];
  }

  const origins: string[] = [];
  const forwardedHost = readHeader(input.headers, "x-forwarded-host");
  const forwardedProto = readHeader(input.headers, "x-forwarded-proto");
  const host = forwardedHost ?? readHeader(input.headers, "host");
  const proto =
    forwardedProto?.split(",")[0]?.trim() ||
    input.nextUrl?.protocol?.replace(/:$/, "") ||
    undefined;

  if (host && proto) {
    origins.push(`${proto}://${host.split(",")[0]!.trim()}`);
  }

  if (input.nextUrl?.origin) {
    origins.push(input.nextUrl.origin);
  }

  if (input.url) {
    origins.push(new URL(input.url).origin);
  }

  return origins;
}

export function resolveRequestPublicSiteUrl(input?: RequestLike) {
  for (const candidate of extractRequestOrigins(input)) {
    const normalized = normalizePublicSiteUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return getServerEnv().publicSiteUrl;
}

export function getRequestAppUrl(path = "/", input?: RequestLike) {
  return new URL(path, resolveRequestPublicSiteUrl(input)).toString();
}

export function getPublicSiteUrl() {
  return getServerEnv().publicSiteUrl;
}

export function getRuntimeRoot() {
  return getServerEnv().runtimeRoot;
}
