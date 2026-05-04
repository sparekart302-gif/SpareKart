import "server-only";

import { getServerEnv } from "@/server/config/env";

const COMMON_FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

export function getEmailDomain(email?: string | null) {
  const normalized = email?.trim().toLowerCase();

  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized.split("@").at(-1) ?? null;
}

function getPublicRootDomain(siteUrl: string) {
  const hostname = new URL(siteUrl).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export function validateResendSenderEmail(input?: {
  fromEmail?: string | null;
  publicSiteUrl?: string;
  nodeEnv?: "development" | "test" | "production";
}) {
  const env = getServerEnv();
  const fromEmail = input?.fromEmail ?? env.RESEND_FROM_EMAIL;
  const nodeEnv = input?.nodeEnv ?? env.NODE_ENV;
  const publicSiteUrl = input?.publicSiteUrl ?? env.publicSiteUrl;
  const senderDomain = getEmailDomain(fromEmail);

  if (!fromEmail || !senderDomain) {
    return {
      ok: false,
      level: nodeEnv === "production" ? "error" : "warn",
      senderDomain: senderDomain ?? undefined,
      detail: "RESEND_FROM_EMAIL is missing or invalid.",
    } as const;
  }

  if (senderDomain === "resend.dev") {
    return {
      ok: true,
      level: "pass",
      senderDomain,
      detail: "Using the Resend onboarding sender for test delivery.",
    } as const;
  }

  if (COMMON_FREEMAIL_DOMAINS.has(senderDomain)) {
    return {
      ok: false,
      level: nodeEnv === "production" ? "error" : "warn",
      senderDomain,
      detail: `The sender domain ${senderDomain} is a consumer inbox domain. Resend requires a verified sending domain such as noreply@${getPublicRootDomain(publicSiteUrl)}.`,
    } as const;
  }

  const siteRootDomain = getPublicRootDomain(publicSiteUrl);
  const matchesSiteDomain =
    senderDomain === siteRootDomain || senderDomain.endsWith(`.${siteRootDomain}`);

  if (!matchesSiteDomain) {
    return {
      ok: true,
      level: nodeEnv === "production" ? "warn" : "pass",
      senderDomain,
      detail: `The sender domain ${senderDomain} does not match ${siteRootDomain}. This can still work if the domain is verified in Resend, but confirm SPF, DKIM, and DMARC records for that sender domain.`,
    } as const;
  }

  return {
    ok: true,
    level: "pass",
    senderDomain,
    detail: `Using ${senderDomain} as the Resend sender domain.`,
  } as const;
}

export function getResendFromAddress() {
  const env = getServerEnv();
  const validation = validateResendSenderEmail({
    fromEmail: env.RESEND_FROM_EMAIL,
    publicSiteUrl: env.publicSiteUrl,
    nodeEnv: env.NODE_ENV,
  });

  if (!validation.ok) {
    throw new Error(validation.detail);
  }

  return env.RESEND_FROM_NAME
    ? `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL!}>`
    : env.RESEND_FROM_EMAIL!;
}
