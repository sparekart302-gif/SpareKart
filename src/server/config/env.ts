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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: optionalString,
  NEXT_PUBLIC_SITE_URL: optionalUrl.default("http://localhost:3000"),
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

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_FROM_NAME: process.env.RESEND_FROM_NAME,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    SPAREKART_RUNTIME_DIR: process.env.SPAREKART_RUNTIME_DIR,
    SPAREKART_SEED_PASSWORD: process.env.SPAREKART_SEED_PASSWORD,
    SPAREKART_SUPER_ADMIN_EMAIL: process.env.SPAREKART_SUPER_ADMIN_EMAIL,
    SPAREKART_SUPER_ADMIN_PASSWORD: process.env.SPAREKART_SUPER_ADMIN_PASSWORD,
    SPAREKART_SUPERADMIN_EMAIL: process.env.SPAREKART_SUPERADMIN_EMAIL,
    SPAREKART_SUPERADMIN_PASSWORD: process.env.SPAREKART_SUPERADMIN_PASSWORD,
  });

  const resolvedSuperAdminEmail = resolvePreferredValue(
    parsed.SPAREKART_SUPER_ADMIN_EMAIL,
    parsed.SPAREKART_SUPERADMIN_EMAIL,
  );
  const resolvedSuperAdminPassword = resolvePreferredValue(
    parsed.SPAREKART_SUPER_ADMIN_PASSWORD,
    parsed.SPAREKART_SUPERADMIN_PASSWORD,
  );
  const resendKeyConfigured = hasConfiguredValue(parsed.RESEND_API_KEY);
  const resendFromConfigured = hasConfiguredValue(parsed.RESEND_FROM_EMAIL);
  const googleClientIdConfigured = hasConfiguredGoogleClientId(parsed.GOOGLE_CLIENT_ID);
  const googleClientSecretConfigured = hasConfiguredValue(parsed.GOOGLE_CLIENT_SECRET);

  cachedEnv = {
    ...parsed,
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

export function getAppUrl(path = "/") {
  return new URL(path, getServerEnv().NEXT_PUBLIC_SITE_URL).toString();
}

export function getRuntimeRoot() {
  return getServerEnv().runtimeRoot;
}
