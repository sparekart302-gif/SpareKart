import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { getAppUrl, getServerEnv } from "@/server/config/env";
import { queueMarketplaceEmail } from "@/server/email/service";
import { AuthApiError } from "./errors";
import { AUTH_JWT_COOKIE_NAME, buildJwtCookieOptions, createAuthJwt } from "./jwt";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_TTL_MS,
  buildSessionCookieOptions,
  createOpaqueToken,
  hashOpaqueToken,
} from "./session";
import {
  createAuthId,
  findAuthUserByEmail,
  getAuthStore,
  normalizeAuthEmail,
  sanitizeAuthUser,
  updateAuthStore,
} from "./store";
import { hashPassword, verifyPassword } from "./password";
import type {
  AuthSessionUser,
  AuthTokenRecord,
  AuthUserRecord,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  ResendVerificationInput,
  SessionDeviceMeta,
  SignupInput,
  VerifyEmailInput,
} from "./types";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(32),
  password: z.string().min(8).max(128),
  role: z.enum(["CUSTOMER", "SELLER"]),
  sellerProfile: z
    .object({
      storeName: z.string().trim().min(2).max(80).optional(),
      city: z.string().trim().min(2).max(80).optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email(),
});

const passwordResetConfirmSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().length(6),
  password: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().length(6),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

const googleTokenResponseSchema = z.object({
  access_token: z.string(),
});

const googleUserInfoSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean().optional().default(true),
  name: z.string().optional(),
});

const EMAIL_VERIFICATION_TTL_MINUTES = 30;
const PASSWORD_RESET_TTL_MINUTES = 10;

function nowIso() {
  return new Date().toISOString();
}

function addMilliseconds(ms: number) {
  return new Date(Date.now() + ms);
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function createNumericCode(length = 6) {
  const max = 10 ** length;
  return Math.floor(Math.random() * max)
    .toString()
    .padStart(length, "0");
}

export function getPostLoginPath(role: AuthUserRecord["role"]) {
  switch (role) {
    case "CUSTOMER":
      return "/account";
    case "SELLER":
      return "/seller/orders";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}

function assertGoogleConfigured() {
  const env = getServerEnv();

  if (!env.googleConfigured) {
    throw new AuthApiError("Google sign-in is not configured yet.", {
      status: 503,
      code: "GOOGLE_AUTH_NOT_CONFIGURED",
    });
  }

  return env;
}

export function buildGoogleAuthorizationUrl(state: string) {
  const env = assertGoogleConfigured();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", getAppUrl("/api/auth/google/callback"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function issueSession(user: AuthUserRecord, device?: SessionDeviceMeta) {
  const plainToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(plainToken);
  const createdAt = nowIso();
  const expiresAt = addMilliseconds(AUTH_SESSION_TTL_MS);

  await updateAuthStore((store) => ({
    ...store,
    sessions: [
      ...store.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now()),
      {
        id: createAuthId("session"),
        tokenHash,
        userId: user.id,
        createdAt,
        expiresAt: expiresAt.toISOString(),
        lastSeenAt: createdAt,
        userAgent: device?.userAgent,
        ipAddress: device?.ipAddress,
      },
    ],
    users: store.users.map((candidate) =>
      candidate.id === user.id
        ? {
            ...candidate,
            lastLoginAt: createdAt,
            updatedAt: createdAt,
          }
        : candidate,
    ),
  }));

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, plainToken, buildSessionCookieOptions(expiresAt));
  const accessToken = createAuthJwt(user, expiresAt);
  cookieStore.set(AUTH_JWT_COOKIE_NAME, accessToken, buildJwtCookieOptions(expiresAt));
  return {
    accessToken,
    expiresAt: expiresAt.toISOString(),
  };
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(AUTH_JWT_COOKIE_NAME);
}

async function createOneTimeCode(
  userId: string,
  type: AuthTokenRecord["type"],
  expiresInMinutes: number,
) {
  const plainCode = createNumericCode(6);
  const tokenHash = hashOpaqueToken(plainCode);
  const createdAt = nowIso();
  const expiresAt = addMinutes(expiresInMinutes).toISOString();

  await updateAuthStore((store) => ({
    ...store,
    tokens: [
      ...store.tokens.filter(
        (token) => !(token.userId === userId && token.type === type && !token.consumedAt),
      ),
      {
        id: createAuthId("token"),
        tokenHash,
        userId,
        type,
        createdAt,
        expiresAt,
      },
    ],
  }));

  return plainCode;
}

function requireUserByEmail(store: Awaited<ReturnType<typeof getAuthStore>>, email: string) {
  const user = findAuthUserByEmail(store, email);

  if (!user) {
    throw new AuthApiError("No account was found for that email.", {
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
    });
  }

  return user;
}

function requireFreshCode(
  store: Awaited<ReturnType<typeof getAuthStore>>,
  input: {
    email?: string;
    code: string;
    type: AuthTokenRecord["type"];
  },
) {
  const normalizedEmail = input.email ? normalizeAuthEmail(input.email) : undefined;
  const tokenHash = hashOpaqueToken(input.code);
  const matchedTokens = store.tokens.filter(
    (candidate) => candidate.tokenHash === tokenHash && candidate.type === input.type,
  );

  const token = normalizedEmail
    ? matchedTokens.find((candidate) => {
        const user = store.users.find((entry) => entry.id === candidate.userId);
        return user?.email === normalizedEmail;
      })
    : matchedTokens[0];

  if (!token || token.consumedAt || new Date(token.expiresAt).getTime() < Date.now()) {
    throw new AuthApiError("This code is invalid or expired.", {
      status: 400,
      code: "CODE_INVALID",
    });
  }

  return token;
}

async function sendVerificationCode(user: AuthUserRecord) {
  const verificationCode = await createOneTimeCode(
    user.id,
    "EMAIL_VERIFICATION",
    EMAIL_VERIFICATION_TTL_MINUTES,
  );

  await queueMarketplaceEmail({
    type: "AUTH_TEMPLATE",
    to: { email: user.email, name: user.name },
    template: {
      template: "VERIFY_EMAIL",
      recipientName: user.name,
      verificationCode,
      verificationUrl: getAppUrl(
        `/api/auth/verify-email?email=${encodeURIComponent(user.email)}&code=${encodeURIComponent(verificationCode)}`,
      ),
      expiresLabel: `${EMAIL_VERIFICATION_TTL_MINUTES} minutes`,
    },
  });

  return verificationCode;
}

async function exchangeGoogleCodeForProfile(code: string) {
  const env = assertGoogleConfigured();
  const redirectUri = getAppUrl("/api/auth/google/callback");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    throw new AuthApiError("Google token exchange failed.", {
      status: 401,
      code: "GOOGLE_TOKEN_EXCHANGE_FAILED",
    });
  }

  const tokenPayload = googleTokenResponseSchema.parse(await tokenResponse.json());
  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
    cache: "no-store",
  });

  if (!userInfoResponse.ok) {
    throw new AuthApiError("Google account lookup failed.", {
      status: 401,
      code: "GOOGLE_PROFILE_FETCH_FAILED",
    });
  }

  return googleUserInfoSchema.parse(await userInfoResponse.json());
}

function assertEmailVerified(user: AuthUserRecord) {
  if (!user.emailVerified) {
    throw new AuthApiError("Email not verified. Please verify your email first.", {
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      details: {
        email: user.email,
      },
    });
  }
}

function assertUserCanSignIn(user: Pick<AuthUserRecord, "status">) {
  if (user.status !== "ACTIVE") {
    throw new AuthApiError("This account is not active for sign-in.", {
      status: 403,
      code: "ACCOUNT_INACTIVE",
    });
  }
}

function assertRoleAllowed(
  user: Pick<AuthSessionUser, "role">,
  roles: AuthSessionUser["role"][],
  message: string,
) {
  if (!roles.includes(user.role)) {
    throw new AuthApiError(message, {
      status: 403,
      code: "INSUFFICIENT_ROLE",
    });
  }
}

export async function signupWithEmailPassword(input: SignupInput) {
  const parsed = signupSchema.parse(input);
  const store = await getAuthStore();

  if (findAuthUserByEmail(store, parsed.email)) {
    throw new AuthApiError("An account already exists with that email.", {
      status: 409,
      code: "EMAIL_IN_USE",
    });
  }

  const createdAt = nowIso();
  const user: AuthUserRecord = {
    id: createAuthId("user"),
    email: normalizeAuthEmail(parsed.email),
    name: parsed.name.trim(),
    phone: parsed.phone.trim(),
    role: parsed.role,
    status: "ACTIVE",
    emailVerified: false,
    passwordHash: await hashPassword(parsed.password),
    createdAt,
    updatedAt: createdAt,
    pendingSellerProfile:
      parsed.role === "SELLER"
        ? {
            storeName: parsed.sellerProfile?.storeName?.trim(),
            city: parsed.sellerProfile?.city?.trim(),
          }
        : undefined,
  };

  await updateAuthStore((current) => ({
    ...current,
    users: [...current.users, user],
  }));

  await sendVerificationCode(user);

  return {
    user: sanitizeAuthUser(user),
    verificationRequired: true,
  };
}

export async function loginWithEmailPassword(input: LoginInput, device?: SessionDeviceMeta) {
  const parsed = loginSchema.parse(input);
  const store = await getAuthStore();
  const user = findAuthUserByEmail(store, parsed.email);

  if (!user) {
    throw new AuthApiError("Invalid email or password.", {
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  }

  const isValid = await verifyPassword(parsed.password, user.passwordHash);

  if (!isValid) {
    throw new AuthApiError("Invalid email or password.", {
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  }

  assertUserCanSignIn(user);
  assertEmailVerified(user);
  const session = await issueSession(user, device);
  return {
    user: sanitizeAuthUser(user),
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
  };
}

export async function loginWithGoogleCode(code: string, device?: SessionDeviceMeta) {
  const googleProfile = await exchangeGoogleCodeForProfile(code);

  if (!googleProfile.email_verified) {
    throw new AuthApiError("Google did not return a verified email address for this account.", {
      status: 403,
      code: "GOOGLE_EMAIL_NOT_VERIFIED",
    });
  }

  const normalizedEmail = normalizeAuthEmail(googleProfile.email);
  let store = await getAuthStore();
  let user = findAuthUserByEmail(store, normalizedEmail);
  const createdAt = nowIso();
  const isNewUser = !user;

  if (!user) {
    const nextUser: AuthUserRecord = {
      id: createAuthId("user"),
      email: normalizedEmail,
      name: googleProfile.name?.trim() || normalizedEmail.split("@")[0] || "SpareKart User",
      phone: "",
      authProvider: "GOOGLE",
      oauthSubject: googleProfile.sub,
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: googleProfile.email_verified,
      passwordHash: await hashPassword(createOpaqueToken()),
      createdAt,
      updatedAt: createdAt,
    };

    await updateAuthStore((current) => ({
      ...current,
      users: [...current.users, nextUser],
    }));

    store = await getAuthStore();
    user = findAuthUserByEmail(store, normalizedEmail);
  } else {
    await updateAuthStore((current) => ({
      ...current,
      users: current.users.map((entry) =>
        entry.id === user!.id
          ? {
              ...entry,
              emailVerified: true,
              authProvider: entry.authProvider ?? "GOOGLE",
              oauthSubject: entry.oauthSubject ?? googleProfile.sub,
              updatedAt: createdAt,
            }
          : entry,
      ),
    }));

    store = await getAuthStore();
    user = findAuthUserByEmail(store, normalizedEmail);
  }

  if (!user) {
    throw new AuthApiError("Google account could not be provisioned.", {
      status: 500,
      code: "GOOGLE_AUTH_PROVISION_FAILED",
    });
  }

  assertUserCanSignIn(user);
  const session = await issueSession(user, device);

  if (isNewUser) {
    await queueMarketplaceEmail({
      type: "AUTH_TEMPLATE",
      to: { email: user.email, name: user.name },
      template: {
        template: "WELCOME_CUSTOMER",
        recipientName: user.name,
        portalUrl: getAppUrl(getPostLoginPath(user.role)),
      },
    });
  }

  return {
    user: sanitizeAuthUser(user),
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
  };
}

export async function logoutCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashOpaqueToken(token);
    await updateAuthStore((store) => ({
      ...store,
      sessions: store.sessions.filter((session) => session.tokenHash !== tokenHash),
    }));
  }

  await clearSessionCookie();
}

export async function getCurrentSessionUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashOpaqueToken(rawToken);
  const store = await getAuthStore();
  const session = store.sessions.find((candidate) => candidate.tokenHash === tokenHash);

  if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
    await clearSessionCookie();
    return null;
  }

  const user = store.users.find((candidate) => candidate.id === session.userId);

  if (!user) {
    await clearSessionCookie();
    return null;
  }

  if (user.status !== "ACTIVE") {
    await clearSessionCookie();
    return null;
  }

  if (!user.emailVerified && !user.isSeeded) {
    await clearSessionCookie();
    return null;
  }

  await updateAuthStore((current) => ({
    ...current,
    sessions: current.sessions.map((candidate) =>
      candidate.id === session.id
        ? {
            ...candidate,
            lastSeenAt: nowIso(),
          }
        : candidate,
    ),
  }));

  return sanitizeAuthUser(user);
}

export async function resendVerificationEmail(input: ResendVerificationInput) {
  const parsed = resendVerificationSchema.parse(input);
  const store = await getAuthStore();
  const user = requireUserByEmail(store, parsed.email);

  if (user.emailVerified) {
    return { accepted: true, alreadyVerified: true };
  }

  await sendVerificationCode(user);
  return { accepted: true, alreadyVerified: false };
}

export async function verifyEmailAddress(input: VerifyEmailInput) {
  const parsed = verifyEmailSchema.parse(input);
  const store = await getAuthStore();
  const token = requireFreshCode(store, {
    email: parsed.email,
    code: parsed.code,
    type: "EMAIL_VERIFICATION",
  });
  const verifiedAt = nowIso();
  const user = store.users.find((entry) => entry.id === token.userId);

  if (!user) {
    throw new AuthApiError("The account for this verification code could not be found.", {
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
    });
  }

  await updateAuthStore((current) => ({
    ...current,
    users: current.users.map((entry) =>
      entry.id === token.userId
        ? {
            ...entry,
            emailVerified: true,
            updatedAt: verifiedAt,
          }
        : entry,
    ),
    tokens: current.tokens.map((candidate) =>
      candidate.id === token.id
        ? {
            ...candidate,
            consumedAt: verifiedAt,
          }
        : candidate,
    ),
  }));

  await queueMarketplaceEmail({
    type: "AUTH_TEMPLATE",
    to: { email: user.email, name: user.name },
    template: {
      template: user.role === "SELLER" ? "WELCOME_SELLER" : "WELCOME_CUSTOMER",
      recipientName: user.name,
      portalUrl: getAppUrl(user.role === "SELLER" ? "/seller/orders" : "/account"),
    },
  });

  return { verified: true };
}

export async function requestPasswordReset(input: PasswordResetRequestInput) {
  const parsed = passwordResetRequestSchema.parse(input);
  const store = await getAuthStore();
  const user = findAuthUserByEmail(store, parsed.email);

  if (!user) {
    return { accepted: true };
  }

  const otpCode = await createOneTimeCode(user.id, "PASSWORD_RESET", PASSWORD_RESET_TTL_MINUTES);

  await queueMarketplaceEmail({
    type: "AUTH_TEMPLATE",
    to: { email: user.email, name: user.name },
    template: {
      template: "PASSWORD_RESET",
      recipientName: user.name,
      otpCode,
      recoveryUrl: getAppUrl(`/forgot-password?email=${encodeURIComponent(user.email)}`),
      expiresLabel: `${PASSWORD_RESET_TTL_MINUTES} minutes`,
    },
  });

  return { accepted: true };
}

export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  device?: SessionDeviceMeta,
) {
  const parsed = passwordResetConfirmSchema.parse(input);
  const store = await getAuthStore();
  const user = requireUserByEmail(store, parsed.email);
  const token = requireFreshCode(store, {
    email: parsed.email,
    code: parsed.code,
    type: "PASSWORD_RESET",
  });
  const passwordHash = await hashPassword(parsed.password);
  const updatedAt = nowIso();

  await updateAuthStore((current) => ({
    ...current,
    users: current.users.map((entry) =>
      entry.id === user.id
        ? {
            ...entry,
            passwordHash,
            updatedAt,
          }
        : entry,
    ),
    tokens: current.tokens.map((candidate) =>
      candidate.id === token.id
        ? {
            ...candidate,
            consumedAt: updatedAt,
          }
        : candidate,
    ),
    sessions: current.sessions.filter((session) => session.userId !== user.id),
  }));

  const nextStore = await getAuthStore();
  const freshUser = nextStore.users.find((entry) => entry.id === user.id);

  if (!freshUser) {
    throw new AuthApiError("Password was reset, but the account could not be reloaded.", {
      status: 500,
      code: "RESET_RELOAD_FAILED",
    });
  }

  assertUserCanSignIn(freshUser);
  assertEmailVerified(freshUser);
  const session = await issueSession(freshUser, device);
  return {
    user: sanitizeAuthUser(freshUser),
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
  };
}

export async function requireCurrentSessionUser() {
  const user = await getCurrentSessionUser();

  if (!user) {
    throw new AuthApiError("Authentication is required for this action.", {
      status: 401,
      code: "AUTH_REQUIRED",
    });
  }

  return user;
}

export async function requireAdminSessionUser() {
  const user = await requireCurrentSessionUser();
  assertRoleAllowed(user, ["ADMIN", "SUPER_ADMIN"], "Admin access is required for this action.");
  return user;
}

export async function requireSellerOrAdminSessionUser() {
  const user = await requireCurrentSessionUser();
  assertRoleAllowed(
    user,
    ["SELLER", "ADMIN", "SUPER_ADMIN"],
    "Seller or admin access is required for this action.",
  );
  return user;
}
