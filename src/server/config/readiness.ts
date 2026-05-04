import "server-only";

import { getServerEnv } from "./env";
import { validateResendSenderEmail } from "@/server/email/config";
import { MarketplaceStateModel } from "@/server/mongodb/models/marketplace";
import { connectToMongo } from "@/server/mongodb/connection";
import { probeRuntimeDirectory } from "@/server/runtime/storage";

export type ReadinessStatus = "pass" | "warn" | "fail";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type DeploymentReadiness = Awaited<ReturnType<typeof getDeploymentReadiness>>;

function createCheck(
  id: string,
  label: string,
  status: ReadinessStatus,
  detail: string,
): ReadinessCheck {
  return { id, label, status, detail };
}

export async function getDeploymentReadiness() {
  const env = getServerEnv();
  const checks: ReadinessCheck[] = [];
  const runtimeProbe = await probeRuntimeDirectory();
  const resendSenderValidation = validateResendSenderEmail({
    fromEmail: env.RESEND_FROM_EMAIL,
    publicSiteUrl: env.publicSiteUrl,
    nodeEnv: env.NODE_ENV,
  });
  let marketplaceStateAvailable = false;
  const usesLocalhostSiteUrl =
    env.publicSiteUrl.includes("localhost") || env.publicSiteUrl.includes("127.0.0.1");

  if (env.mongodbConfigured) {
    try {
      await connectToMongo();
      marketplaceStateAvailable = Boolean(await MarketplaceStateModel.exists({ _id: "primary" }));
    } catch {
      marketplaceStateAvailable = false;
    }
  }

  checks.push(
    createCheck(
      "site-url",
      "Public site URL",
      env.NODE_ENV === "production" && usesLocalhostSiteUrl ? "warn" : "pass",
      env.NODE_ENV === "production" && usesLocalhostSiteUrl
        ? `Public site URL is still set to ${env.publicSiteUrl}. Replace it with your live domain before deployment.`
        : `Using ${env.publicSiteUrl} from ${env.publicSiteUrlSource} for auth links, email CTAs, and metadata.`,
    ),
  );

  if (env.resendConfigured) {
    checks.push(
      createCheck(
        "email-delivery",
        "Transactional email delivery",
        resendSenderValidation.ok
          ? resendSenderValidation.level === "warn"
            ? "warn"
            : "pass"
          : env.NODE_ENV === "production"
            ? "fail"
            : "warn",
        resendSenderValidation.ok
          ? `Resend is configured with ${env.RESEND_FROM_EMAIL}. ${resendSenderValidation.detail}`
          : resendSenderValidation.detail,
      ),
    );
  } else if (env.resendPartiallyConfigured) {
    checks.push(
      createCheck(
        "email-delivery",
        "Transactional email delivery",
        env.NODE_ENV === "production" ? "fail" : "warn",
        "Resend is partially configured. Set both RESEND_API_KEY and RESEND_FROM_EMAIL together.",
      ),
    );
  } else {
    checks.push(
      createCheck(
        "email-delivery",
        "Transactional email delivery",
        env.NODE_ENV === "production" ? "fail" : "warn",
        env.NODE_ENV === "production"
          ? "Resend is not configured. Production order and auth emails will not send."
          : "Resend is not configured. Emails will fall back to local preview files in development.",
      ),
    );
  }

  checks.push(
    createCheck(
      "server-runtime",
      "Server runtime storage",
      runtimeProbe.ok
        ? env.NODE_ENV === "production" && !env.SPAREKART_RUNTIME_DIR
          ? "warn"
          : "pass"
        : "fail",
      runtimeProbe.ok
        ? env.SPAREKART_RUNTIME_DIR
          ? `Server-side auth/email runtime files are writable in ${env.runtimeRoot}.`
          : "Using the default .sparekart-runtime directory inside the app root. Set SPAREKART_RUNTIME_DIR on hosted environments so auth/email runtime files live on a known writable path."
        : `Runtime storage is not writable at ${runtimeProbe.path}: ${runtimeProbe.error}`,
    ),
  );

  checks.push(
    createCheck(
      "mongodb",
      "MongoDB Atlas configuration",
      env.mongodbConfigured ? "pass" : env.NODE_ENV === "production" ? "fail" : "warn",
      env.mongodbConfigured
        ? `MongoDB is configured${env.MONGODB_DB_NAME ? ` with database ${env.MONGODB_DB_NAME}` : ""}.`
        : "MONGODB_URI is not set yet or is still using a placeholder. MongoDB-backed routes will not connect until Atlas credentials are configured.",
    ),
  );

  checks.push(
    createCheck(
      "runtime-persistence",
      "Auth and email runtime persistence",
      env.mongodbConfigured ? "pass" : env.NODE_ENV === "production" ? "warn" : "warn",
      env.mongodbConfigured
        ? "Auth sessions, verification tokens, and email queue records are stored in MongoDB."
        : "Auth sessions, verification tokens, and the email queue are still using local runtime files because MongoDB is not configured.",
    ),
  );

  checks.push(
    createCheck(
      "google-oauth",
      "Google OAuth login",
      env.googleConfigured
        ? "pass"
        : env.googlePartiallyConfigured
          ? env.NODE_ENV === "production"
            ? "fail"
            : "warn"
          : "warn",
      env.googleConfigured
        ? "Google OAuth credentials are configured for customer and account sign-in."
        : env.googlePartiallyConfigured
          ? "Google OAuth is partially configured. Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together."
          : "Google OAuth is not configured yet. Email/password login works, but Google sign-in buttons will redirect back with a configuration error.",
    ),
  );

  checks.push(
    createCheck(
      "jwt-auth",
      "JWT authentication",
      env.NODE_ENV === "production" && env.jwtUsesDefault
        ? "fail"
        : env.jwtUsesDefault
          ? "warn"
          : "pass",
      env.jwtUsesDefault
        ? env.NODE_ENV === "production"
          ? "JWT_SECRET is using the default development secret. Replace it with a long random production secret before deployment."
          : "JWT auth is active with the default local development secret. Set JWT_SECRET before staging or production deployment."
        : "JWT signing is configured with a custom secret for login and API auth issuance.",
    ),
  );

  checks.push(
    createCheck(
      "seed-auth",
      "Seed admin credentials",
      env.seedPasswordConfigured && env.superAdminPasswordConfigured
        ? "pass"
        : env.NODE_ENV === "production"
          ? "fail"
          : "warn",
      env.seedPasswordConfigured && env.superAdminPasswordConfigured
        ? "Seeded local accounts and seeded super admin credentials are configured."
        : "SPAREKART_SEED_PASSWORD and SPAREKART_SUPER_ADMIN_PASSWORD should be set so seeded local accounts can be initialized safely.",
    ),
  );

  checks.push(
    createCheck(
      "marketplace-state",
      "Marketplace shared state",
      env.mongodbConfigured
        ? marketplaceStateAvailable
          ? "pass"
          : "warn"
        : env.NODE_ENV === "production"
          ? "fail"
          : "warn",
      env.mongodbConfigured
        ? marketplaceStateAvailable
          ? "MongoDB stores the canonical catalog, users, carts, orders, order items, payment proofs, inventory, notifications, reviews, and admin logs. In-memory cache and runtime snapshots are used only as read-through resilience fallbacks, while guest cart localStorage remains a browser-only convenience until checkout persists the order."
          : "MongoDB is configured but the marketplace snapshot has not been materialized yet. It will be created on first marketplace request."
        : "Marketplace persistence requires MongoDB. Configure MONGODB_URI so catalog, order, and customer state does not remain local-only.",
    ),
  );

  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");
  const overallStatus: "ready" | "warning" | "not_ready" =
    failures.length > 0 ? "not_ready" : warnings.length > 0 ? "warning" : "ready";

  return {
    ok: failures.length === 0,
    status: overallStatus,
    environment: env.NODE_ENV,
    recommendedHost:
      env.mongodbConfigured || env.SPAREKART_RUNTIME_DIR
        ? "Any Node-capable host with persistent storage and server support."
        : "For the current runtime, prefer a Node host with a writable persistent disk over fully serverless deployment.",
    services: {
      mongoConfigured: env.mongodbConfigured,
      resendConfigured: env.resendConfigured,
      googleConfigured: env.googleConfigured,
      runtimeWritable: runtimeProbe.ok,
      jwtUsesDefault: env.jwtUsesDefault,
    },
    checks,
    summary: {
      passed: checks.filter((check) => check.status === "pass").length,
      warnings: warnings.length,
      failures: failures.length,
    },
    knownLimitations: checks
      .filter((check) => check.status !== "pass")
      .map((check) => check.detail),
    generatedAt: new Date().toISOString(),
  };
}
