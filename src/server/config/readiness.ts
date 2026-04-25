import "server-only";

import { getServerEnv } from "./env";

export type ReadinessStatus = "pass" | "warn" | "fail";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

function createCheck(
  id: string,
  label: string,
  status: ReadinessStatus,
  detail: string,
): ReadinessCheck {
  return { id, label, status, detail };
}

export function getDeploymentReadiness() {
  const env = getServerEnv();
  const checks: ReadinessCheck[] = [];

  checks.push(
    createCheck(
      "site-url",
      "Public site URL",
      "pass",
      `Using ${env.NEXT_PUBLIC_SITE_URL} for auth links, email CTAs, and metadata.`,
    ),
  );

  if (env.resendConfigured) {
    checks.push(
      createCheck(
        "email-delivery",
        "Transactional email delivery",
        "pass",
        `Resend is configured with ${env.RESEND_FROM_EMAIL}.`,
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
      env.NODE_ENV === "production" && !env.SPAREKART_RUNTIME_DIR ? "warn" : "pass",
      env.SPAREKART_RUNTIME_DIR
        ? `Server-side auth/email runtime files will be stored in ${env.runtimeRoot}.`
        : "Using the default .sparekart-runtime directory inside the app root. Set SPAREKART_RUNTIME_DIR on hosted environments so auth/email runtime files live on a known writable path.",
    ),
  );

  checks.push(
    createCheck(
      "mongodb",
      "MongoDB Atlas configuration",
      env.MONGODB_URI ? "pass" : "warn",
      env.MONGODB_URI
        ? `MongoDB is configured${env.MONGODB_DB_NAME ? ` with database ${env.MONGODB_DB_NAME}` : ""}.`
        : "MONGODB_URI is not set yet. Mongoose CRUD routes will not connect until MongoDB Atlas credentials are configured.",
    ),
  );

  checks.push(
    createCheck(
      "runtime-persistence",
      "Auth and email runtime persistence",
      env.mongodbConfigured ? "pass" : "warn",
      env.mongodbConfigured
        ? "Auth sessions, verification tokens, and email queue records are stored in MongoDB."
        : "Auth sessions, verification tokens, and the email queue are still using local runtime files because MongoDB is not configured.",
    ),
  );

  checks.push(
    createCheck(
      "google-oauth",
      "Google OAuth login",
      env.googleConfigured ? "pass" : env.NODE_ENV === "production" ? "warn" : "warn",
      env.googleConfigured
        ? "Google OAuth credentials are configured for customer and account sign-in."
        : "Google OAuth is not configured yet. Email/password login works, but Google sign-in buttons will redirect back with a configuration error.",
    ),
  );

  checks.push(
    createCheck(
      "jwt-auth",
      "JWT authentication",
      env.NODE_ENV === "production" && env.jwtUsesDefault ? "fail" : env.jwtUsesDefault ? "warn" : "pass",
      env.jwtUsesDefault
        ? env.NODE_ENV === "production"
          ? "JWT_SECRET is using the default development secret. Replace it with a long random production secret before deployment."
          : "JWT auth is active with the default local development secret. Set JWT_SECRET before staging or production deployment."
        : "JWT signing is configured with a custom secret for login and API auth issuance.",
    ),
  );

  checks.push(
    createCheck(
      "marketplace-state",
      "Marketplace shared state",
      "warn",
      "Catalog, cart, and order workflow state is still browser-local for the current demo build. Local testing works, but multi-user production rollout should move marketplace state to shared backend persistence.",
    ),
  );

  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  return {
    ok: failures.length === 0,
    environment: env.NODE_ENV,
    recommendedHost:
      env.MONGODB_URI || env.SPAREKART_RUNTIME_DIR
        ? "Any Node-capable host with persistent storage and server support."
        : "For the current runtime, prefer a Node host with a writable persistent disk over fully serverless deployment.",
    checks,
    summary: {
      passed: checks.filter((check) => check.status === "pass").length,
      warnings: warnings.length,
      failures: failures.length,
    },
    generatedAt: new Date().toISOString(),
  };
}
