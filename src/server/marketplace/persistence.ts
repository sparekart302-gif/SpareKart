import "server-only";

import type { Model } from "mongoose";
import { brands as seedBrands } from "@/data/marketplace";
import {
  buildInitialMarketplaceState,
  normalizeMarketplaceState,
} from "@/modules/marketplace/seed";
import { hasMeaningfulMarketplaceState } from "@/modules/marketplace/state-utils";
import type {
  ManagedCategory,
  ManagedProduct,
  MarketplaceState,
  MarketplaceUser,
  SellerRecord,
} from "@/modules/marketplace/types";
import { connectToMongo } from "@/server/mongodb/connection";
import {
  MarketplaceAdminActionLogModel,
  MarketplaceBrandModel,
  MarketplaceCartModel,
  MarketplaceCategoryModel,
  MarketplaceCouponModel,
  MarketplaceCouponRedemptionModel,
  MarketplaceInventoryItemModel,
  MarketplaceInventoryMovementModel,
  MarketplaceNotificationModel,
  MarketplaceOrderItemModel,
  MarketplaceOrderModel,
  MarketplacePaymentModel,
  MarketplacePaymentProofModel,
  MarketplaceProductModel,
  MarketplaceReviewModel,
  MarketplaceSellerProfileModel,
  MarketplaceStateModel,
  MarketplaceUserModel,
} from "@/server/mongodb/models/marketplace";
import { getRuntimeFilePath, readJsonFile, writeJsonFile } from "@/server/runtime/storage";

const MARKETPLACE_STATE_ID = "primary";
const GUEST_CART_USER_ID = "guest-session";
const MARKETPLACE_STATE_CACHE_TTL_MS = 15_000;
const MARKETPLACE_STATE_READ_RETRY_DELAY_MS = 750;
const MARKETPLACE_RUNTIME_SNAPSHOT_PATH = getRuntimeFilePath(
  "marketplace",
  "last-known-state.json",
);

type MarketplaceStateSource = "mongo" | "memory-cache" | "runtime-snapshot";

export type MarketplaceStateResolution = {
  state: MarketplaceState;
  source: MarketplaceStateSource;
  stale: boolean;
};

type MarketplaceBootstrapCache = {
  promise: Promise<void> | null;
  ready: boolean;
};

type MarketplaceStateCache = {
  promise: Promise<MarketplaceStateResolution> | null;
  state: MarketplaceState | null;
  loadedAt: number;
  source: MarketplaceStateSource | null;
  stale: boolean;
};

type StoredMarketplaceRuntimeSnapshot = {
  savedAt: string;
  state: MarketplaceState;
};

declare global {
  var sparekartMarketplaceBootstrapCache: MarketplaceBootstrapCache | undefined;
  var sparekartMarketplaceStateCache: MarketplaceStateCache | undefined;
}

const globalMarketplaceRuntime = globalThis as typeof globalThis & {
  sparekartMarketplaceBootstrapCache?: MarketplaceBootstrapCache;
  sparekartMarketplaceStateCache?: MarketplaceStateCache;
};

const bootstrapCache = globalMarketplaceRuntime.sparekartMarketplaceBootstrapCache ?? {
  promise: null,
  ready: false,
};

const stateCache = globalMarketplaceRuntime.sparekartMarketplaceStateCache ?? {
  promise: null,
  state: null,
  loadedAt: 0,
  source: null,
  stale: false,
};

globalMarketplaceRuntime.sparekartMarketplaceBootstrapCache = bootstrapCache;
globalMarketplaceRuntime.sparekartMarketplaceStateCache = stateCache;

function nowIso() {
  return new Date().toISOString();
}

function wait(ms: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function rememberMarketplaceState(
  state: MarketplaceState,
  options: {
    source: MarketplaceStateSource;
    stale?: boolean;
  },
) {
  const resolution: MarketplaceStateResolution = {
    state,
    source: options.source,
    stale: options.stale ?? false,
  };

  stateCache.state = state;
  stateCache.loadedAt = Date.now();
  stateCache.source = resolution.source;
  stateCache.stale = resolution.stale;
  stateCache.promise = Promise.resolve(resolution);

  return resolution;
}

function getCachedMarketplaceResolution() {
  if (!stateCache.state || !stateCache.source) {
    return null;
  }

  return {
    state: stateCache.state,
    source: stateCache.source,
    stale: stateCache.stale,
  } satisfies MarketplaceStateResolution;
}

function isRetryableMarketplaceStateError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name.includes("mongo") ||
    name.includes("mongoose") ||
    message.includes("server selection") ||
    message.includes("topology") ||
    message.includes("network") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("ehostunreach") ||
    message.includes("eai_again")
  );
}

async function persistRuntimeMarketplaceSnapshot(state: MarketplaceState) {
  try {
    await writeJsonFile<StoredMarketplaceRuntimeSnapshot>(MARKETPLACE_RUNTIME_SNAPSHOT_PATH, {
      savedAt: nowIso(),
      state,
    });
  } catch (error) {
    console.warn(
      `[marketplace] Failed to persist runtime marketplace snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function readRuntimeMarketplaceSnapshot() {
  const snapshot = await readJsonFile<StoredMarketplaceRuntimeSnapshot | null>(
    MARKETPLACE_RUNTIME_SNAPSHOT_PATH,
    null,
  );

  if (!snapshot?.state) {
    return null;
  }

  const normalized = normalizeMarketplaceState(snapshot.state, { seedDefaults: false });

  if (!hasMeaningfulMarketplaceState(normalized)) {
    return null;
  }

  return normalized;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prepareStateForStorage(state: MarketplaceState): MarketplaceState {
  return {
    ...state,
    currentUserId: "",
    cartsByUserId: Object.fromEntries(
      Object.entries(state.cartsByUserId).filter(([userId]) => userId !== GUEST_CART_USER_ID),
    ),
    appliedCouponCodesByUserId: Object.fromEntries(
      Object.entries(state.appliedCouponCodesByUserId).filter(
        ([userId]) => userId !== GUEST_CART_USER_ID,
      ),
    ),
  };
}

export function applyMarketplaceSessionContext(
  state: MarketplaceState,
  currentUserId?: string,
  guestCart?: MarketplaceState["cartsByUserId"][string],
  guestCouponCode?: string,
): MarketplaceState {
  return {
    ...state,
    currentUserId: currentUserId ?? "",
    cartsByUserId: {
      ...state.cartsByUserId,
      [GUEST_CART_USER_ID]: guestCart ?? [],
    },
    appliedCouponCodesByUserId: {
      ...state.appliedCouponCodesByUserId,
      [GUEST_CART_USER_ID]: guestCouponCode ?? "",
    },
  };
}

async function replaceCollection<T extends { _id: string }>(
  model: Pick<Model<T>, "bulkWrite" | "deleteMany">,
  records: T[],
) {
  const ids = records.map((record) => record._id);

  if (ids.length === 0) {
    await model.deleteMany({});
    return;
  }

  const operations = records.map((record) => ({
    replaceOne: {
      filter: { _id: record._id },
      replacement: record,
      upsert: true,
    },
  }));

  await model.bulkWrite(operations as never);

  await model.deleteMany({
    _id: {
      $nin: ids,
    },
  });
}

function buildBrandRows(state: MarketplaceState) {
  const countByName = new Map<string, number>();

  state.managedProducts
    .filter((product) => !product.deletedAt && product.moderationStatus === "ACTIVE")
    .forEach((product) => {
      countByName.set(product.brand, (countByName.get(product.brand) ?? 0) + 1);
    });

  const seen = new Set<string>();
  const rows = [
    ...seedBrands.map((brand) => ({
      _id: brand.slug,
      slug: brand.slug,
      name: brand.name,
      productCount: countByName.get(brand.name) ?? 0,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: nowIso(),
    })),
    ...Array.from(countByName.entries())
      .filter(([name]) => !seedBrands.some((brand) => brand.name === name))
      .map(([name, productCount]) => ({
        _id: slugify(name),
        slug: slugify(name),
        name,
        productCount,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: nowIso(),
      })),
  ];

  return rows.filter((row) => {
    if (seen.has(row._id)) {
      return false;
    }

    seen.add(row._id);
    return true;
  });
}

function buildCategoryRows(state: MarketplaceState) {
  const countByCategory = new Map<string, number>();

  state.managedProducts
    .filter((product) => !product.deletedAt && product.moderationStatus === "ACTIVE")
    .forEach((product) => {
      countByCategory.set(product.category, (countByCategory.get(product.category) ?? 0) + 1);
    });

  return state.managedCategories.map((category) => ({
    _id: category.slug,
    ...category,
    productCount: countByCategory.get(category.slug) ?? category.productCount ?? 0,
  }));
}

function buildUserRows(state: MarketplaceState) {
  return state.users.map((user) => ({
    _id: user.id,
    ...user,
    customerProfile: state.customerAccounts[user.id]
      ? {
          ...state.customerAccounts[user.id],
        }
      : undefined,
  }));
}

function buildSellerRows(state: MarketplaceState) {
  const countBySeller = new Map<string, number>();

  state.managedProducts
    .filter((product) => !product.deletedAt && product.moderationStatus === "ACTIVE")
    .forEach((product) => {
      countBySeller.set(product.sellerSlug, (countBySeller.get(product.sellerSlug) ?? 0) + 1);
    });

  return state.sellersDirectory.map((seller) => ({
    _id: seller.slug,
    ...seller,
    productCount: countBySeller.get(seller.slug) ?? seller.productCount ?? 0,
  }));
}

function buildCartRows(state: MarketplaceState) {
  return Object.entries(state.cartsByUserId).map(([userId, items]) => ({
    _id: userId,
    userId,
    isGuest: false,
    items,
    appliedCouponCode: state.appliedCouponCodesByUserId[userId] ?? "",
    updatedAt: nowIso(),
  }));
}

function buildOrderRows(state: MarketplaceState) {
  return state.orders.map((order) => ({
    _id: order.id,
    ...order,
  }));
}

function buildOrderItemRows(state: MarketplaceState) {
  return state.orders.flatMap((order) =>
    order.items.map((item) => ({
      _id: item.id,
      ...item,
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
    })),
  );
}

function buildCouponRedemptionRows(state: MarketplaceState) {
  return state.coupons.flatMap((coupon) =>
    coupon.usedByUserIds.map((userId) => ({
      _id: `${coupon.id}:${userId}`,
      couponId: coupon.id,
      code: coupon.code,
      userId,
      redeemedAt: coupon.createdAt,
    })),
  );
}

function buildReviewRows(state: MarketplaceState) {
  return [
    ...state.managedProductReviews.map((review) => ({
      _id: review.id,
      kind: "product" as const,
      ...review,
    })),
    ...state.managedStoreReviews.map((review) => ({
      _id: review.id,
      kind: "store" as const,
      ...review,
    })),
  ];
}

async function syncMarketplaceProjections(state: MarketplaceState) {
  await Promise.all([
    replaceCollection(MarketplaceUserModel, buildUserRows(state)),
    replaceCollection(MarketplaceSellerProfileModel, buildSellerRows(state)),
    replaceCollection(MarketplaceCategoryModel, buildCategoryRows(state)),
    replaceCollection(MarketplaceBrandModel, buildBrandRows(state)),
    replaceCollection(
      MarketplaceProductModel,
      state.managedProducts.map((product) => ({
        _id: product.id,
        ...product,
      })),
    ),
    replaceCollection(MarketplaceCartModel, buildCartRows(state)),
    replaceCollection(MarketplaceOrderModel, buildOrderRows(state)),
    replaceCollection(MarketplaceOrderItemModel, buildOrderItemRows(state)),
    replaceCollection(
      MarketplacePaymentModel,
      state.payments.map((payment) => ({
        _id: payment.id,
        ...payment,
      })),
    ),
    replaceCollection(
      MarketplacePaymentProofModel,
      state.paymentProofs.map((proof) => ({
        _id: proof.id,
        ...proof,
      })),
    ),
    replaceCollection(
      MarketplaceInventoryItemModel,
      Object.values(state.inventory).map((item) => ({
        _id: item.productId,
        ...item,
      })),
    ),
    replaceCollection(
      MarketplaceInventoryMovementModel,
      state.inventoryMovements.map((movement) => ({
        _id: movement.id,
        ...movement,
      })),
    ),
    replaceCollection(
      MarketplaceNotificationModel,
      state.notifications.map((notification) => ({
        _id: notification.id,
        ...notification,
      })),
    ),
    replaceCollection(
      MarketplaceAdminActionLogModel,
      state.auditTrail.map((entry) => ({
        _id: entry.id,
        ...entry,
      })),
    ),
    replaceCollection(
      MarketplaceCouponModel,
      state.coupons.map((coupon) => ({
        _id: coupon.id,
        ...coupon,
      })),
    ),
    replaceCollection(MarketplaceCouponRedemptionModel, buildCouponRedemptionRows(state)),
    replaceCollection(MarketplaceReviewModel, buildReviewRows(state)),
  ]);
}

async function readMarketplaceStateFallback() {
  try {
    const resolution = await ensureMarketplaceState();
    return resolution.state;
  } catch {
    return null;
  }
}

export async function saveMarketplaceState(state: MarketplaceState) {
  await connectToMongo();
  const prepared = prepareStateForStorage(state);
  const normalized = normalizeMarketplaceState(prepared, { seedDefaults: false });
  const updatedAt = nowIso();

  await MarketplaceStateModel.replaceOne(
    { _id: MARKETPLACE_STATE_ID },
    {
      _id: MARKETPLACE_STATE_ID,
      state: normalized,
      seededAt: updatedAt,
      updatedAt,
    },
    { upsert: true },
  );

  try {
    await syncMarketplaceProjections(normalized);
  } catch (error) {
    console.warn(
      `[marketplace] Projection sync failed after saving canonical marketplace state: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  bootstrapCache.ready = true;
  await persistRuntimeMarketplaceSnapshot(normalized);
  rememberMarketplaceState(normalized, {
    source: "mongo",
  });
  return normalized;
}

async function readMarketplaceStateFromMongo() {
  await connectToMongo();

  const existing = await MarketplaceStateModel.findById(MARKETPLACE_STATE_ID).lean<{
    state?: MarketplaceState;
  }>();

  if (existing?.state) {
    const normalized = normalizeMarketplaceState(existing.state, { seedDefaults: false });
    await persistRuntimeMarketplaceSnapshot(normalized);
    return normalized;
  }

  const initial = buildInitialMarketplaceState();
  return saveMarketplaceState(initial);
}

async function readMarketplaceStateFromMongoWithRetry() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await readMarketplaceStateFromMongo();
    } catch (error) {
      lastError = error;

      if (attempt >= 2 || !isRetryableMarketplaceStateError(error)) {
        throw error;
      }

      console.warn(
        `[marketplace] MongoDB state read failed on attempt ${attempt}. Retrying in ${MARKETPLACE_STATE_READ_RETRY_DELAY_MS}ms: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      await wait(MARKETPLACE_STATE_READ_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function ensureMarketplaceBootstrap() {
  if (bootstrapCache.ready) {
    return;
  }

  if (!bootstrapCache.promise) {
    bootstrapCache.promise = (async () => {
      await connectToMongo();

      const existing = await MarketplaceStateModel.findById(MARKETPLACE_STATE_ID)
        .select({ _id: 1 })
        .lean();

      if (!existing) {
        await saveMarketplaceState(buildInitialMarketplaceState());
      }

      bootstrapCache.ready = true;
    })().catch((error) => {
      bootstrapCache.ready = false;
      throw error;
    });
  }

  try {
    await bootstrapCache.promise;
  } finally {
    if (bootstrapCache.ready) {
      bootstrapCache.promise = null;
    }
  }
}

export async function ensureMarketplaceState() {
  const now = Date.now();
  const cachedResolution = getCachedMarketplaceResolution();

  if (cachedResolution && now - stateCache.loadedAt < MARKETPLACE_STATE_CACHE_TTL_MS) {
    return {
      ...cachedResolution,
      source: cachedResolution.source === "mongo" ? "memory-cache" : cachedResolution.source,
    } satisfies MarketplaceStateResolution;
  }

  if (!stateCache.promise) {
    stateCache.promise = readMarketplaceStateFromMongoWithRetry().then((state) => {
      bootstrapCache.ready = true;
      return rememberMarketplaceState(state, {
        source: "mongo",
      });
    });
  }

  try {
    return await stateCache.promise;
  } catch (error) {
    if (cachedResolution && hasMeaningfulMarketplaceState(cachedResolution.state)) {
      console.warn(
        `[marketplace] Serving stale in-memory marketplace state after MongoDB refresh failure: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return rememberMarketplaceState(cachedResolution.state, {
        source: "memory-cache",
        stale: true,
      });
    }

    const runtimeSnapshot = await readRuntimeMarketplaceSnapshot();

    if (runtimeSnapshot) {
      console.warn(
        `[marketplace] Serving runtime marketplace snapshot after MongoDB refresh failure: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      bootstrapCache.ready = true;
      return rememberMarketplaceState(runtimeSnapshot, {
        source: "runtime-snapshot",
        stale: true,
      });
    }

    throw error;
  } finally {
    stateCache.promise = null;
  }
}

export async function getMarketplaceState(input?: {
  currentUserId?: string;
  guestCart?: MarketplaceState["cartsByUserId"][string];
  guestCouponCode?: string;
}) {
  const stored = await ensureMarketplaceState();
  return {
    ...stored,
    state: applyMarketplaceSessionContext(
      stored.state,
      input?.currentUserId,
      input?.guestCart,
      input?.guestCouponCode,
    ),
  } satisfies MarketplaceStateResolution;
}

export async function findMarketplaceProductBySlug(slug: string) {
  try {
    await ensureMarketplaceBootstrap();
    const product = await MarketplaceProductModel.findOne({ slug }).lean<ManagedProduct | null>();

    if (product) {
      return product;
    }
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for product ${slug}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return fallbackState?.managedProducts.find((product) => product.slug === slug) ?? null;
}

export async function findMarketplaceCategoryBySlug(slug: string) {
  try {
    await ensureMarketplaceBootstrap();
    const category = await MarketplaceCategoryModel.findOne({
      slug,
    }).lean<ManagedCategory | null>();

    if (category) {
      return category;
    }
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for category ${slug}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return fallbackState?.managedCategories.find((category) => category.slug === slug) ?? null;
}

export async function findMarketplaceSellerBySlug(slug: string) {
  try {
    await ensureMarketplaceBootstrap();
    const seller = await MarketplaceSellerProfileModel.findOne({
      _id: slug,
    }).lean<SellerRecord | null>();

    if (seller) {
      return seller;
    }
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for seller ${slug}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return fallbackState?.sellersDirectory.find((seller) => seller.slug === slug) ?? null;
}

export async function listMarketplaceProducts() {
  try {
    await ensureMarketplaceBootstrap();
    return MarketplaceProductModel.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .lean<ManagedProduct[]>();
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for product list: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return (
    fallbackState?.managedProducts.filter((product) => !product.deletedAt).slice() ?? []
  ).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function listMarketplaceProductsByCategory(categorySlug: string, limit = 60) {
  try {
    await ensureMarketplaceBootstrap();
    return MarketplaceProductModel.find({
      deletedAt: null,
      category: categorySlug,
      moderationStatus: "ACTIVE",
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<ManagedProduct[]>();
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for category product list ${categorySlug}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return (
    fallbackState?.managedProducts
      .filter(
        (product) =>
          !product.deletedAt &&
          product.category === categorySlug &&
          product.moderationStatus === "ACTIVE",
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit) ?? []
  );
}

export async function listMarketplaceCategories() {
  try {
    await ensureMarketplaceBootstrap();
    return MarketplaceCategoryModel.find({}).sort({ name: 1 }).lean<ManagedCategory[]>();
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for categories: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return (fallbackState?.managedCategories.slice() ?? []).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function listMarketplaceSellers() {
  try {
    await ensureMarketplaceBootstrap();
    return MarketplaceSellerProfileModel.find({}).sort({ name: 1 }).lean<SellerRecord[]>();
  } catch (error) {
    console.warn(
      `[marketplace] Falling back to marketplace snapshot for sellers: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const fallbackState = await readMarketplaceStateFallback();
  return (fallbackState?.sellersDirectory.slice() ?? []).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function isGuestCartUserId(userId: string) {
  return userId === GUEST_CART_USER_ID;
}
