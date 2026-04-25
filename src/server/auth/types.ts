import type { AdminScope, AppRole, UserStatus } from "@/modules/marketplace/types";

export type AuthTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export type AuthSessionUser = {
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
};

export type AuthUserRecord = AuthSessionUser & {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
};

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  userAgent?: string;
  ipAddress?: string;
};

export type AuthTokenRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  type: AuthTokenType;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
};

export type AuthStoreData = {
  users: AuthUserRecord[];
  sessions: AuthSessionRecord[];
  tokens: AuthTokenRecord[];
};

export type SignupInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "CUSTOMER" | "SELLER";
  sellerProfile?: {
    storeName?: string;
    city?: string;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type PasswordResetRequestInput = {
  email: string;
};

export type PasswordResetConfirmInput = {
  email: string;
  code: string;
  password: string;
};

export type VerifyEmailInput = {
  email: string;
  code: string;
};

export type ResendVerificationInput = {
  email: string;
};

export type SessionDeviceMeta = {
  userAgent?: string;
  ipAddress?: string;
};
