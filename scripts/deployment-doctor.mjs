#!/usr/bin/env node

import "dotenv/config";
import mongoose from "mongoose";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import process from "node:process";
import { join, resolve } from "node:path";

const issues = [];
const warnings = [];

const PLACEHOLDER_PATTERNS = [
  /^replace[-_]/i,
  /^your[-_]/i,
  /^example[-_]/i,
  /^changeme$/i,
  /^change-this$/i,
  /<[^>]+>/,
  /example\.com/i,
  /cluster\.example/i,
  /username:password/i,
  /replace-with/i,
  /^re_example/i,
];

function check(condition, message, level = "error") {
  if (condition) {
    return;
  }

  if (level === "warn") {
    warnings.push(message);
    return;
  }

  issues.push(message);
}

function readEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isPlaceholderValue(value) {
  if (!value) {
    return false;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function hasConfiguredValue(value) {
  return Boolean(value) && !isPlaceholderValue(value);
}

function hasConfiguredMongoUri(value) {
  return Boolean(value && /^mongodb(\+srv)?:\/\//i.test(value) && !isPlaceholderValue(value));
}

function hasConfiguredGoogleClientId(value) {
  return Boolean(
    value && value.endsWith(".apps.googleusercontent.com") && !isPlaceholderValue(value),
  );
}

function isDisallowedPublicHostname(hostname) {
  return /^0(?:\.0){3}$/.test(hostname) || hostname === "::" || hostname === "[::]";
}

function normalizePublicSiteUrl(value) {
  if (!value) {
    return null;
  }

  try {
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
  } catch {
    return null;
  }
}

function resolvePublicSiteUrl(environment, port) {
  const candidates = [
    { source: "NEXT_PUBLIC_SITE_URL", value: readEnv("NEXT_PUBLIC_SITE_URL") },
    { source: "NEXTAUTH_URL", value: readEnv("NEXTAUTH_URL") },
    { source: "AUTH_URL", value: readEnv("AUTH_URL") },
    { source: "APP_URL", value: readEnv("APP_URL") },
    { source: "BASE_URL", value: readEnv("BASE_URL") },
    { source: "SITE_URL", value: readEnv("SITE_URL") },
  ];

  for (const candidate of candidates) {
    const normalized = normalizePublicSiteUrl(candidate.value);

    if (normalized) {
      return {
        siteUrl: normalized,
        siteUrlSource: candidate.source,
      };
    }
  }

  return {
    siteUrl:
      environment === "production" ? "https://sparekart.live/" : `http://localhost:${port}/`,
    siteUrlSource: "fallback",
  };
}

function readNpmVersion() {
  const userAgent = process.env.npm_config_user_agent;
  const match = userAgent?.match(/npm\/([0-9.]+)/);

  if (match?.[1]) {
    return match[1];
  }

  try {
    return execSync("npm --version", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

async function hasLocalEnvFile() {
  try {
    await access(resolve(".env"));
    return true;
  } catch {
    return false;
  }
}

async function probeRuntimeDirectory(runtimeDir) {
  const runtimeRoot = resolve(runtimeDir ?? ".sparekart-runtime");
  const probeFile = join(runtimeRoot, `.doctor-${Date.now()}.tmp`);

  try {
    await mkdir(runtimeRoot, { recursive: true });
    await writeFile(probeFile, "ok", "utf8");
    await rm(probeFile, { force: true });
    return {
      ok: true,
      path: runtimeRoot,
    };
  } catch (error) {
    return {
      ok: false,
      path: runtimeRoot,
      error: error instanceof Error ? error.message : "Unknown runtime storage error.",
    };
  }
}

const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
const nodeVersion = process.versions.node;
const npmVersion = readNpmVersion();
const npmMajor = Number(npmVersion?.split(".")[0] ?? "0");
const environment = process.env.NODE_ENV ?? "development";
const port = readEnv("PORT") ?? "3000";
const { siteUrl, siteUrlSource } = resolvePublicSiteUrl(environment, port);
const mongodbUri = readEnv("MONGODB_URI");
const mongodbDbName = readEnv("MONGODB_DB_NAME");
const resendApiKey = readEnv("RESEND_API_KEY");
const resendFromEmail = readEnv("RESEND_FROM_EMAIL");
const googleClientId = readEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET");
const jwtSecret = readEnv("JWT_SECRET");
const runtimeDir = readEnv("SPAREKART_RUNTIME_DIR");
const seedPassword = readEnv("SPAREKART_SEED_PASSWORD");
const superAdminEmail =
  readEnv("SPAREKART_SUPER_ADMIN_EMAIL") ?? readEnv("SPAREKART_SUPERADMIN_EMAIL");
const superAdminPassword =
  readEnv("SPAREKART_SUPER_ADMIN_PASSWORD") ?? readEnv("SPAREKART_SUPERADMIN_PASSWORD");
const defaultJwtSecret = "sparekart-local-jwt-secret-change-me-2026";
const localEnvExists = await hasLocalEnvFile();
const runtimeProbe = await probeRuntimeDirectory(runtimeDir);
const mongoConfigured = hasConfiguredMongoUri(mongodbUri);
const resendConfigured = hasConfiguredValue(resendApiKey) && hasConfiguredValue(resendFromEmail);
const resendPartial = hasConfiguredValue(resendApiKey) !== hasConfiguredValue(resendFromEmail);
const googleConfigured =
  hasConfiguredGoogleClientId(googleClientId) && hasConfiguredValue(googleClientSecret);
const googlePartial =
  hasConfiguredGoogleClientId(googleClientId) !== hasConfiguredValue(googleClientSecret);
let marketplaceStateAvailable = false;

check(nodeMajor >= 20, `Node ${nodeVersion} is too old. Use Node 20+ for Next.js 16.`);
check(
  Boolean(npmVersion) && npmMajor >= 10,
  `npm ${npmVersion ?? "unknown"} is too old. Use npm 10+ for consistent local validation.`,
  "warn",
);

try {
  new URL(siteUrl);
} catch {
  check(false, `Resolved public site URL is invalid: ${siteUrl}`);
}

if (environment !== "production") {
  check(
    localEnvExists,
    "No local .env file was found. Copy .env.example to .env or inject env vars before validating locally.",
    "warn",
  );
}

check(
  runtimeProbe.ok,
  `Runtime directory is not writable at ${runtimeProbe.path}: ${runtimeProbe.error ?? "Unknown error"}`,
);
check(
  !resendPartial,
  "Resend configuration is partial. Set both RESEND_API_KEY and RESEND_FROM_EMAIL together.",
);
check(
  !googlePartial,
  "Google OAuth configuration is partial. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together.",
);

if (environment === "production") {
  check(
    Boolean(jwtSecret),
    "JWT_SECRET is required in production so login and API authentication can issue signed tokens.",
  );
  check(
    jwtSecret !== defaultJwtSecret,
    "JWT_SECRET is still using the default development value. Replace it with a long random production secret.",
  );
  check(
    Boolean(resendApiKey && resendFromEmail),
    "Resend is required in production to send transactional emails.",
  );
  check(
    mongoConfigured,
    "MongoDB is required in production. Set a real MONGODB_URI before deploying.",
  );
  check(
    googleConfigured,
    "Google OAuth is not fully configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before deploying Google sign-in.",
    "warn",
  );
  check(
    Boolean(runtimeDir),
    "SPAREKART_RUNTIME_DIR should be set in production so auth/email runtime files use an explicit writable path.",
    "warn",
  );
  check(
    !siteUrl.includes("localhost"),
    "The resolved public site URL is still pointing to localhost. Set NEXT_PUBLIC_SITE_URL, NEXTAUTH_URL, or AUTH_URL to your production domain before deploying.",
  );
  check(
    hasConfiguredValue(seedPassword) && hasConfiguredValue(superAdminPassword),
    "Seed account passwords are missing. Configure SPAREKART_SEED_PASSWORD and SPAREKART_SUPER_ADMIN_PASSWORD before production rollout.",
  );
}

if (!jwtSecret) {
  warnings.push(
    "JWT_SECRET is not set. The app will fall back to the local development JWT secret until you configure one.",
  );
} else if (jwtSecret === defaultJwtSecret) {
  warnings.push(
    "JWT_SECRET is using the default development value. Replace it before staging or production deployment.",
  );
}

check(
  mongoConfigured,
  "MONGODB_URI is not set or is still using a placeholder value. MongoDB Atlas and Mongoose CRUD routes are not configured yet.",
  environment === "production" ? "error" : "warn",
);

if (!googleConfigured && !googlePartial) {
  warnings.push(
    "Google OAuth is not configured. Email/password login will still work, but Google sign-in will redirect back with a configuration warning.",
  );
}

if (!resendConfigured && !resendPartial) {
  warnings.push(
    "Resend is not configured. Emails will be written to local preview files instead of being delivered live.",
  );
}

if (!hasConfiguredValue(seedPassword) || !hasConfiguredValue(superAdminPassword)) {
  warnings.push(
    "Seed auth credentials are missing. Set SPAREKART_SEED_PASSWORD and SPAREKART_SUPER_ADMIN_PASSWORD before relying on seeded admin accounts.",
  );
}

if (!hasConfiguredValue(superAdminEmail)) {
  warnings.push(
    "SPAREKART_SUPER_ADMIN_EMAIL is not set. The seeded super admin will fall back to the default marketplace seed email.",
  );
}

let mongoConnectionSummary = "not configured";

if (mongoConfigured) {
  try {
    const connection = await mongoose.connect(mongodbUri, {
      dbName: mongodbDbName || "sparekart",
      autoIndex: false,
      bufferCommands: false,
    });

    await connection.connection.db?.admin().ping();
    marketplaceStateAvailable = Boolean(
      await connection.connection.db
        ?.collection("marketplace_state")
        .findOne({ _id: "primary" }, { projection: { _id: 1 } }),
    );
    mongoConnectionSummary = `connected (${connection.connection.name} @ ${connection.connection.host})`;
    await mongoose.disconnect();
  } catch (error) {
    check(
      false,
      `MongoDB connection test failed: ${error instanceof Error ? error.message : "Unknown connection error"}`,
    );
  }
}

if (mongoConfigured && !marketplaceStateAvailable) {
  warnings.push(
    "MongoDB is configured but the marketplace snapshot has not been materialized yet. It will be created on the first marketplace request.",
  );
}

console.log("SpareKart deployment doctor");
console.log(`- Node: ${nodeVersion}`);
console.log(`- npm: ${npmVersion ?? "unknown"}`);
console.log(`- Environment: ${environment}`);
console.log(`- Site URL: ${siteUrl} (${siteUrlSource})`);
console.log(`- Runtime root: ${runtimeProbe.path}`);
console.log(`- Runtime writable: ${runtimeProbe.ok ? "yes" : "no"}`);
console.log(`- Local .env present: ${localEnvExists ? "yes" : "no"}`);
console.log(`- MongoDB: ${mongoConnectionSummary}`);
console.log(
  `- JWT: ${jwtSecret && jwtSecret !== defaultJwtSecret ? "custom secret configured" : "development fallback"}`,
);
console.log(
  `- Resend: ${resendConfigured ? "configured" : resendPartial ? "partial configuration" : "local preview fallback"}`,
);
console.log(
  `- Google OAuth: ${googleConfigured ? "configured" : googlePartial ? "partial configuration" : "not configured"}`,
);

if (warnings.length > 0) {
  console.log("\nWarnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (issues.length > 0) {
  console.error("\nBlocking issues:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log("\nDoctor checks passed.");
