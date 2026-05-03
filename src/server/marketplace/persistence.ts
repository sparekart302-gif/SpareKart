import "server-only";

import type { Model } from "mongoose";
import { brands as seedBrands } from "@/data/marketplace";
import {
  buildInitialMarketplaceState,
  normalizeMarketplaceState,
} from "@/modules/marketplace/seed";
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

const MARKETPLACE_STATE_ID = "primary";
const GUEST_CART_USER_ID = "guest-session";

function nowIso() {
  return new Date().toISOString();
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

  await syncMarketplaceProjections(normalized);
  return normalized;
}

export async function ensureMarketplaceState() {
  await connectToMongo();

  const existing = await MarketplaceStateModel.findById(MARKETPLACE_STATE_ID).lean<{
    state?: MarketplaceState;
  }>();

  if (existing?.state) {
    return normalizeMarketplaceState(existing.state, { seedDefaults: false });
  }

  const initial = buildInitialMarketplaceState();
  return saveMarketplaceState(initial);
}

export async function getMarketplaceState(input?: {
  currentUserId?: string;
  guestCart?: MarketplaceState["cartsByUserId"][string];
  guestCouponCode?: string;
}) {
  const stored = await ensureMarketplaceState();
  return applyMarketplaceSessionContext(
    stored,
    input?.currentUserId,
    input?.guestCart,
    input?.guestCouponCode,
  );
}

export async function findMarketplaceProductBySlug(slug: string) {
  await ensureMarketplaceState();
  return MarketplaceProductModel.findOne({ slug }).lean<ManagedProduct | null>();
}

export async function findMarketplaceCategoryBySlug(slug: string) {
  await ensureMarketplaceState();
  return MarketplaceCategoryModel.findOne({ slug }).lean<ManagedCategory | null>();
}

export async function findMarketplaceSellerBySlug(slug: string) {
  await ensureMarketplaceState();
  return MarketplaceSellerProfileModel.findOne({ _id: slug }).lean<SellerRecord | null>();
}

export async function listMarketplaceProducts() {
  await ensureMarketplaceState();
  return MarketplaceProductModel.find({ deletedAt: null }).sort({ createdAt: -1 }).lean<
    ManagedProduct[]
  >();
}

export async function listMarketplaceCategories() {
  await ensureMarketplaceState();
  return MarketplaceCategoryModel.find({}).sort({ name: 1 }).lean<ManagedCategory[]>();
}

export async function listMarketplaceSellers() {
  await ensureMarketplaceState();
  return MarketplaceSellerProfileModel.find({}).sort({ name: 1 }).lean<SellerRecord[]>();
}

export function isGuestCartUserId(userId: string) {
  return userId === GUEST_CART_USER_ID;
}
