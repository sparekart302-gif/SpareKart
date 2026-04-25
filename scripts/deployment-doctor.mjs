#!/usr/bin/env node

import "dotenv/config";
import mongoose from "mongoose";
import process from "node:process";
import { resolve } from "node:path";

const issues = [];
const warnings = [];

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

const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
const nodeVersion = process.versions.node;
const environment = process.env.NODE_ENV ?? "development";
const siteUrl = readEnv("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
const mongodbUri = readEnv("MONGODB_URI");
const mongodbDbName = readEnv("MONGODB_DB_NAME");
const resendApiKey = readEnv("RESEND_API_KEY");
const resendFromEmail = readEnv("RESEND_FROM_EMAIL");
const jwtSecret = readEnv("JWT_SECRET");
const runtimeDir = readEnv("SPAREKART_RUNTIME_DIR");
const defaultJwtSecret = "sparekart-local-jwt-secret-change-me-2026";

check(nodeMajor >= 20, `Node ${nodeVersion} is too old. Use Node 20+ for Next.js 16.`);

try {
  new URL(siteUrl);
} catch {
  check(false, `NEXT_PUBLIC_SITE_URL is invalid: ${siteUrl}`);
}

check(
  !(resendApiKey && !resendFromEmail) && !(!resendApiKey && resendFromEmail),
  "Resend configuration is partial. Set both RESEND_API_KEY and RESEND_FROM_EMAIL together.",
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
    Boolean(runtimeDir),
    "SPAREKART_RUNTIME_DIR should be set in production so auth/email runtime files use an explicit writable path.",
    "warn",
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
  Boolean(mongodbUri),
  "MONGODB_URI is not set. MongoDB Atlas and Mongoose CRUD routes are not configured yet.",
  "warn",
);

check(
  false,
  "Marketplace business state is still browser-local for the current demo build. Deploy for local or staging validation only until shared backend persistence is added.",
  "warn",
);

let mongoConnectionSummary = "not configured";

if (mongodbUri) {
  try {
    const connection = await mongoose.connect(mongodbUri, {
      dbName: mongodbDbName || "sparekart",
      autoIndex: false,
      bufferCommands: false,
    });

    await connection.connection.db?.admin().ping();
    mongoConnectionSummary = `connected (${connection.connection.name} @ ${connection.connection.host})`;
    await mongoose.disconnect();
  } catch (error) {
    check(
      false,
      `MongoDB connection test failed: ${error instanceof Error ? error.message : "Unknown connection error"}`,
    );
  }
}

console.log("SpareKart deployment doctor");
console.log(`- Node: ${nodeVersion}`);
console.log(`- Environment: ${environment}`);
console.log(`- Site URL: ${siteUrl}`);
console.log(`- Runtime root: ${resolve(runtimeDir ?? ".sparekart-runtime")}`);
console.log(`- MongoDB: ${mongoConnectionSummary}`);
console.log(`- JWT: ${jwtSecret && jwtSecret !== defaultJwtSecret ? "custom secret configured" : "development fallback"}`);
console.log(
  `- Resend: ${resendApiKey && resendFromEmail ? "configured" : "local preview fallback"}`,
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
