"use client";

import type { AdminScope, AppRole, UserStatus } from "@/modules/marketplace/types";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  authProvider?: "LOCAL" | "GOOGLE";
  oauthSubject?: string;
  role: AppRole;
  status: UserStatus;
  emailVerified: boolean;
  sellerSlug?: string;
  adminTitle?: string;
  adminScopes?: AdminScope[];
  isSeeded?: boolean;
  pendingSellerProfile?: {
    storeName?: string;
    city?: string;
  };
  lastLoginAt?: string;
};

type JsonResponse<T> = {
  ok: boolean;
  error?: string;
  code?: string;
} & T;

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  payload?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      payload?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status ?? 400;
    this.code = options?.code;
    this.payload = options?.payload;
  }
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as JsonResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new ApiRequestError(payload.error ?? "Request failed.", {
      status: response.status,
      code: payload.code,
      payload,
    });
  }

  return payload;
}

export async function signupWithEmail(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "CUSTOMER" | "SELLER";
  sellerProfile?: {
    storeName?: string;
    city?: string;
  };
}) {
  const payload = await requestJson<{
    user: AuthenticatedUser;
    verificationRequired: boolean;
  }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload;
}

export async function loginWithEmail(input: { email: string; password: string }) {
  const payload = await requestJson<{ user: AuthenticatedUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.user;
}

export async function verifyEmailCode(input: { email: string; code: string }) {
  const payload = await requestJson<{ verified: boolean }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload;
}

export async function resendVerificationCode(email: string) {
  return requestJson<{ accepted: boolean; alreadyVerified: boolean }>(
    "/api/auth/verify-email/resend",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function logoutFromEmailSession() {
  await requestJson<Record<string, never>>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getEmailSessionUser() {
  const payload = await requestJson<{ user: AuthenticatedUser | null }>("/api/auth/session", {
    method: "GET",
  });

  return payload.user;
}

export async function requestPasswordResetEmail(email: string) {
  return requestJson<{ accepted: boolean }>("/api/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordResetCode(input: {
  email: string;
  code: string;
  password: string;
}) {
  const payload = await requestJson<{ user: AuthenticatedUser }>("/api/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.user;
}
