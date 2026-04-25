import "server-only";

import { randomUUID } from "node:crypto";
import { marketplaceUsers } from "@/modules/marketplace/seed";
import { getServerEnv } from "@/server/config/env";
import { connectToMongo } from "@/server/mongodb/connection";
import { MongoApiError } from "@/server/mongodb/errors";
import { AuthRuntimeModel } from "@/server/mongodb/models/auth-runtime";
import { getRuntimeFilePath, readJsonFile, updateJsonFile } from "@/server/runtime/storage";
import type { AuthStoreData, AuthUserRecord } from "./types";
import { hashPassword, verifyPassword } from "./password";

const AUTH_STORE_PATH = getRuntimeFilePath("auth-store.json");
const AUTH_RUNTIME_ID = "primary";

const emptyStore: AuthStoreData = {
  users: [],
  sessions: [],
  tokens: [],
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function buildSeedUsers(): Promise<AuthUserRecord[]> {
  const env = getServerEnv();
  const passwordHash = await hashPassword(env.SPAREKART_SEED_PASSWORD);
  const superAdminPasswordHash = await hashPassword(env.SPAREKART_SUPERADMIN_PASSWORD);

  return marketplaceUsers.map((user) => ({
    id: user.id,
    email: normalizeEmail(
      user.role === "SUPER_ADMIN" ? env.SPAREKART_SUPERADMIN_EMAIL : user.email,
    ),
    name: user.role === "SUPER_ADMIN" ? "SpareKart Super Admin" : user.name,
    phone: user.phone,
    authProvider: "LOCAL",
    role: user.role,
    status: user.status,
    emailVerified: true,
    sellerSlug: user.sellerSlug,
    adminTitle: user.adminTitle,
    adminScopes: user.adminScopes,
    isSeeded: true,
    passwordHash: user.role === "SUPER_ADMIN" ? superAdminPasswordHash : passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  }));
}

async function mergeSeedUsers(currentUsers: AuthUserRecord[]) {
  const env = getServerEnv();
  const seededUsers = await buildSeedUsers();
  const seededUserIds = new Set(seededUsers.map((user) => user.id));
  const preservedUsers = currentUsers.filter((user) => !user.isSeeded || !seededUserIds.has(user.id));
  const mergedSeededUsers = await Promise.all(
    seededUsers.map(async (seededUser) => {
      const existingUser = currentUsers.find((user) => user.id === seededUser.id);

      if (!existingUser) {
        return seededUser;
      }

      let passwordHash = existingUser.passwordHash;

      if (seededUser.role === "SUPER_ADMIN") {
        const matchesConfiguredPassword = await verifyPassword(
          env.SPAREKART_SUPERADMIN_PASSWORD,
          existingUser.passwordHash,
        );
        const matchesLegacySeedPassword = await verifyPassword(
          env.SPAREKART_SEED_PASSWORD,
          existingUser.passwordHash,
        );

        if (!matchesConfiguredPassword && matchesLegacySeedPassword) {
          passwordHash = seededUser.passwordHash;
        }
      }

      return {
        ...existingUser,
        ...seededUser,
        passwordHash,
        createdAt: existingUser.createdAt || seededUser.createdAt,
        updatedAt: existingUser.updatedAt || seededUser.updatedAt,
        lastLoginAt: existingUser.lastLoginAt ?? seededUser.lastLoginAt,
      };
    }),
  );

  return [...mergedSeededUsers, ...preservedUsers];
}

async function reconcileAuthStoreSeeds(store: AuthStoreData) {
  const users = await mergeSeedUsers(store.users);
  return {
    ...store,
    users,
  };
}

function shouldUseMongoAuthStore() {
  return getServerEnv().mongodbConfigured;
}

function normalizeMongoAuthStore(document: {
  users: AuthUserRecord[];
  sessions: AuthStoreData["sessions"];
  tokens: AuthStoreData["tokens"];
}) {
  return {
    users: document.users ?? [],
    sessions: document.sessions ?? [],
    tokens: document.tokens ?? [],
  } satisfies AuthStoreData;
}

async function ensureMongoAuthStore() {
  await connectToMongo();

  const existing = await AuthRuntimeModel.findById(AUTH_RUNTIME_ID).lean();

  if (existing) {
    return existing;
  }

  const seededUsers = await buildSeedUsers();

  try {
    await AuthRuntimeModel.create({
      _id: AUTH_RUNTIME_ID,
      users: seededUsers,
      sessions: [],
      tokens: [],
    });
  } catch {
    // Another request may have initialized the runtime store.
  }

  const ready = await AuthRuntimeModel.findById(AUTH_RUNTIME_ID).lean();

  if (!ready) {
    throw new MongoApiError("Auth runtime store could not be initialized.", {
      status: 500,
      code: "AUTH_RUNTIME_INIT_FAILED",
    });
  }

  return ready;
}

async function getMongoAuthStore() {
  const document = await ensureMongoAuthStore();
  const normalized = normalizeMongoAuthStore(document as AuthStoreData);
  const reconciled = await reconcileAuthStoreSeeds(normalized);

  if (JSON.stringify(reconciled.users) !== JSON.stringify(normalized.users)) {
    const updated = await AuthRuntimeModel.findByIdAndUpdate(
      AUTH_RUNTIME_ID,
      {
        $set: {
          users: reconciled.users,
        },
      },
      { new: true },
    ).lean();

    if (updated) {
      return normalizeMongoAuthStore(updated as AuthStoreData);
    }
  }

  return normalized;
}

async function updateMongoAuthStore(
  updater: (current: AuthStoreData) => AuthStoreData | Promise<AuthStoreData>,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const currentDocument = await ensureMongoAuthStore();
    const currentStore = normalizeMongoAuthStore(currentDocument as AuthStoreData);
    const nextStore = await updater(currentStore);

    const updated = await AuthRuntimeModel.findOneAndUpdate(
      {
        _id: AUTH_RUNTIME_ID,
        __v: currentDocument.__v,
      },
      {
        $set: {
          users: nextStore.users,
          sessions: nextStore.sessions,
          tokens: nextStore.tokens,
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
      },
    ).lean();

    if (updated) {
      return normalizeMongoAuthStore(updated as AuthStoreData);
    }

    lastError = new Error("Concurrent auth runtime update detected. Retrying...");
  }

  throw new MongoApiError("Auth runtime store update failed after multiple retries.", {
    status: 500,
    code: "AUTH_RUNTIME_UPDATE_FAILED",
    details: {
      reason: lastError instanceof Error ? lastError.message : "Unknown concurrency failure",
    },
  });
}

export async function getAuthStore() {
  if (shouldUseMongoAuthStore()) {
    return getMongoAuthStore();
  }

  const existing = await readJsonFile(AUTH_STORE_PATH, emptyStore);

  if (existing.users.length > 0) {
    const reconciled = await reconcileAuthStoreSeeds(existing);

    if (JSON.stringify(reconciled.users) !== JSON.stringify(existing.users)) {
      await updateJsonFile(AUTH_STORE_PATH, emptyStore, () => reconciled);
      return reconciled;
    }

    return existing;
  }

  const seededUsers = await buildSeedUsers();
  const seededStore: AuthStoreData = {
    users: seededUsers,
    sessions: [],
    tokens: [],
  };

  await updateJsonFile(AUTH_STORE_PATH, emptyStore, () => seededStore);
  return seededStore;
}

export async function updateAuthStore(
  updater: (current: AuthStoreData) => AuthStoreData | Promise<AuthStoreData>,
) {
  if (shouldUseMongoAuthStore()) {
    return updateMongoAuthStore(updater);
  }

  return updateJsonFile(AUTH_STORE_PATH, emptyStore, async (current) => {
    const baseState =
      current.users.length > 0
        ? await reconcileAuthStoreSeeds(current)
        : {
            users: await buildSeedUsers(),
            sessions: [],
            tokens: [],
          };

    return updater(baseState);
  });
}

export function createAuthId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function sanitizeAuthUser(user: AuthUserRecord) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function findAuthUserByEmail(store: AuthStoreData, email: string) {
  const normalized = normalizeEmail(email);
  return store.users.find((user) => user.email === normalized);
}

export function normalizeAuthEmail(email: string) {
  return normalizeEmail(email);
}
