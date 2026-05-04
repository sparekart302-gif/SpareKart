"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  DollarSign,
  Eye,
  ExternalLink,
  LayoutDashboard,
  Minus,
  PackageCheck,
  PencilLine,
  Plus,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import {
  OperationsDetailPanel,
  OperationsKeyValue,
  OperationsMobileCard,
  OperationsMobileList,
  OperationsPager,
  OperationsPanel,
  OperationsRow,
  OperationsSearch,
  OperationsSelect,
  OperationsTable,
  OperationsTabs,
  OperationsTd,
  OperationsTh,
  OperationsToolbar,
  OperationsWorkspace,
} from "@/components/admin/OperationsUI";
import { AccessGuard } from "@/components/marketplace/AccessGuard";
import { NotificationFeed } from "@/components/marketplace/NotificationFeed";
import { OrderTimeline, SellerFulfillmentGrid } from "@/components/marketplace/OrderProgressUI";
import { SellerCommissionDashboard } from "@/components/marketplace/SellerCommissionDashboard";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/marketplace/StatusBadge";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { SellerShell } from "@/components/seller/SellerShell";
import { ProductModal } from "@/components/seller/ProductModal";
import { StoreModal } from "@/components/seller/StoreModal";
import { InventoryModal } from "@/components/seller/InventoryModal";
import { formatPKR } from "@/data/marketplace";
import { getAllowedSellerOrderTransitions } from "@/modules/marketplace/order-management";
import { getSellerPaymentDashboardData } from "@/modules/marketplace/payment-reporting";
import {
  getNotificationsForUser,
  getOrderTimeline,
  getOrdersForSeller,
  getPaymentById,
  getSellerOrderView,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type {
  InventoryAdjustmentInput,
  ManagedProduct,
  ManagedProductInput,
  OrderStatus,
  ProductModerationStatus,
  SellerRecord,
  SellerStoreProfileInput,
} from "@/modules/marketplace/types";

const dashboardTabs = [
  {
    key: "overview",
    label: "Overview",
    description: "Performance and health",
    Icon: LayoutDashboard,
  },
  { key: "store", label: "Store Profile", description: "Brand and trust details", Icon: Store },
  { key: "products", label: "Products", description: "Catalog and listings", Icon: PackageCheck },
  { key: "inventory", label: "Inventory", description: "Stock and replenishment", Icon: Boxes },
  { key: "orders", label: "Orders", description: "Fulfilment desk", Icon: ClipboardList },
  { key: "earnings", label: "Earnings", description: "Commissions and payouts", Icon: DollarSign },
] as const;

type DashboardTab = (typeof dashboardTabs)[number]["key"];
type ProductFilterStatus = ProductModerationStatus | "ALL";

type SellerProductDraft = {
  id?: string;
  title: string;
  slug: string;
  brand: string;
  category: string;
  sku: string;
  price: string;
  comparePrice: string;
  stock: string;
  badge: "" | NonNullable<ManagedProduct["badge"]>;
  images: string[];
  shortDescription: string;
  description: string;
  tags: string;
  specLines: string;
  compatibilityLines: string;
  status: "ACTIVE" | "DRAFT";
};

const productBadges: SellerProductDraft["badge"][] = [
  "",
  "best-seller",
  "new",
  "deal",
  "fast-shipping",
];

const productStatuses: ProductFilterStatus[] = ["ALL", "ACTIVE", "DRAFT", "FLAGGED", "INACTIVE"];

const orderStatusFilters: Array<OrderStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "AWAITING_PAYMENT_PROOF",
  "AWAITING_PAYMENT_VERIFICATION",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
];

const SELLER_ORDERS_PER_PAGE = 10;
const SELLER_PRODUCTS_PER_PAGE = 12;

function normalizeDashboardTab(value: string | null): DashboardTab {
  return dashboardTabs.some((tab) => tab.key === value) ? (value as DashboardTab) : "overview";
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

function formatCompactMoney(value: number) {
  if (value >= 100000) {
    return `${(value / 1000).toFixed(value >= 1000000 ? 0 : 1)}k`;
  }

  return formatPKR(value);
}

function createStoreDraft(seller: SellerRecord): SellerStoreProfileInput {
  return {
    name: seller.name,
    tagline: seller.tagline,
    description: seller.description,
    city: seller.city,
    logo: seller.logo,
    banner: seller.banner,
    responseTime: seller.responseTime,
    policies: { ...seller.policies },
    socialLinks: {
      website: seller.socialLinks?.website ?? "",
      facebook: seller.socialLinks?.facebook ?? "",
      instagram: seller.socialLinks?.instagram ?? "",
      whatsapp: seller.socialLinks?.whatsapp ?? "",
    },
  };
}

function createEmptyProductDraft(defaultCategory: string): SellerProductDraft {
  return {
    title: "",
    slug: "",
    brand: "",
    category: defaultCategory,
    sku: "",
    price: "",
    comparePrice: "",
    stock: "0",
    badge: "",
    images: [],
    shortDescription: "",
    description: "",
    tags: "",
    specLines: "",
    compatibilityLines: "",
    status: "ACTIVE",
  };
}

function createProductDraft(product: ManagedProduct): SellerProductDraft {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    brand: product.brand,
    category: product.category,
    sku: product.sku,
    price: String(product.price),
    comparePrice: product.comparePrice ? String(product.comparePrice) : "",
    stock: String(product.stock),
    badge: product.badge ?? "",
    images: product.images.slice(0, 4),
    shortDescription: product.shortDescription,
    description: product.description,
    tags: product.tags.join(", "),
    specLines: product.specs.map((spec) => `${spec.label}: ${spec.value}`).join("\n"),
    compatibilityLines: product.compatibility
      .map((entry) => `${entry.brand}; ${entry.model}; ${entry.years.join(", ")}`)
      .join("\n"),
    status: product.moderationStatus === "DRAFT" ? "DRAFT" : "ACTIVE",
  };
}

function parseYears(input: string) {
  return input
    .split(",")
    .flatMap((token) => {
      const trimmed = token.trim();

      if (!trimmed) {
        return [];
      }

      if (trimmed.includes("-")) {
        const [startRaw, endRaw] = trimmed.split("-").map((item) => item.trim());
        const start = Number(startRaw);
        const end = Number(endRaw);

        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          return Array.from({ length: end - start + 1 }, (_, index) => start + index);
        }
      }

      const year = Number(trimmed);
      return Number.isFinite(year) ? [year] : [];
    })
    .filter((year, index, list) => year > 0 && list.indexOf(year) === index)
    .sort((left, right) => left - right);
}

function parseSpecLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return {
        label: label.trim(),
        value: rest.join(":").trim(),
      };
    })
    .filter((spec) => spec.label && spec.value);
}

function parseCompatibilityLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [brand, model, yearsRaw] = line.split(";").map((part) => part.trim());
      const years = parseYears(yearsRaw ?? "");

      if (!brand || !model || years.length === 0) {
        return null;
      }

      return { brand, model, years };
    })
    .filter(Boolean) as ManagedProduct["compatibility"];
}

function buildProductInput(
  draft: SellerProductDraft,
  existing: ManagedProduct | undefined,
  sellerSlug: string,
): ManagedProductInput {
  const images = draft.images
    .map((image) => image.trim())
    .filter(Boolean)
    .slice(0, 4);

  const specs = parseSpecLines(draft.specLines);
  const compatibility = parseCompatibilityLines(draft.compatibilityLines);

  return {
    id: draft.id,
    slug: draft.slug.trim(),
    title: draft.title.trim(),
    brand: draft.brand.trim(),
    category: draft.category,
    sku: draft.sku.trim(),
    price: Number(draft.price),
    comparePrice: draft.comparePrice.trim() ? Number(draft.comparePrice) : undefined,
    images,
    sellerSlug,
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    stock: Number(draft.stock),
    badge: draft.badge || undefined,
    compatibility,
    shortDescription: draft.shortDescription.trim(),
    description: draft.description.trim(),
    specs,
    tags: draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    moderationStatus: draft.status,
    reviewRequired: existing?.reviewRequired ?? false,
    createdAt: existing?.createdAt,
  };
}

export default function SellerOrdersPage({
  initialTab = "overview",
}: {
  initialTab?: DashboardTab;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentUser,
    state,
    updateSellerStoreProfile,
    saveSellerProduct,
    adjustSellerInventory,
    updateOrderStatus,
  } = useMarketplace();

  const sellerSlug = currentUser?.sellerSlug;
  const sellerRecord = useMemo(
    () =>
      sellerSlug ? state.sellersDirectory.find((seller) => seller.slug === sellerSlug) : undefined,
    [sellerSlug, state.sellersDirectory],
  );
  const sellerProducts = useMemo(
    () =>
      sellerSlug
        ? state.managedProducts
            .filter((product) => product.sellerSlug === sellerSlug && !product.deletedAt)
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        : [],
    [sellerSlug, state.managedProducts],
  );
  const orders = useMemo(
    () => (sellerSlug ? getOrdersForSeller(state, sellerSlug) : []),
    [sellerSlug, state],
  );
  const notifications = currentUser
    ? getNotificationsForUser(state, currentUser.id).slice(0, 5)
    : [];
  const approvedReviews = sellerSlug
    ? state.managedStoreReviews.filter(
        (review) => review.sellerSlug === sellerSlug && review.moderationStatus === "APPROVED",
      )
    : [];
  const pendingReviews = sellerSlug
    ? state.managedStoreReviews.filter(
        (review) => review.sellerSlug === sellerSlug && review.moderationStatus === "PENDING",
      )
    : [];
  const lowStockProducts = sellerProducts.filter((product) => {
    const available = state.inventory[product.id]?.available ?? product.stock;
    return available <= 5;
  });
  const publishedProducts = sellerProducts.filter(
    (product) => product.moderationStatus === "ACTIVE",
  );
  const totalInventoryUnits = sellerProducts.reduce(
    (sum, product) => sum + (state.inventory[product.id]?.available ?? product.stock),
    0,
  );
  const storeRating =
    approvedReviews.reduce((sum, review) => sum + review.rating, 0) /
      (approvedReviews.length || 1) ||
    sellerRecord?.rating ||
    0;
  const totalSellerValue = orders.reduce((sum, order) => {
    const sellerItems = order.items.filter((item) => item.sellerSlug === sellerSlug);
    return (
      sum + sellerItems.reduce((itemTotal, item) => itemTotal + item.unitPrice * item.quantity, 0)
    );
  }, 0);
  const readyOrders = orders.filter((order) => ["CONFIRMED", "PROCESSING"].includes(order.status));
  const liveOrderCount = orders.filter((order) =>
    ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status),
  ).length;
  const financeDashboard = sellerSlug
    ? getSellerPaymentDashboardData(state, sellerSlug)
    : undefined;
  const defaultCategory =
    state.managedCategories.find((category) => category.active)?.slug ??
    state.managedCategories[0]?.slug ??
    "engine";

  const [storeDraft, setStoreDraft] = useState<SellerStoreProfileInput | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | "new">("new");
  const [productDraft, setProductDraft] = useState<SellerProductDraft>(
    createEmptyProductDraft(defaultCategory),
  );
  const [productQuery, setProductQuery] = useState("");
  const [productStatusFilter, setProductStatusFilter] = useState<ProductFilterStatus>("ALL");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [selectedSellerOrderId, setSelectedSellerOrderId] = useState("");
  const [sellerOrdersPage, setSellerOrdersPage] = useState(1);
  const [sellerProductsPage, setSellerProductsPage] = useState(1);
  const [inventoryDeltaByProduct, setInventoryDeltaByProduct] = useState<Record<string, string>>(
    {},
  );
  const [inventoryNoteByProduct, setInventoryNoteByProduct] = useState<Record<string, string>>({});

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedInventoryProductId, setSelectedInventoryProductId] = useState<string | null>(null);
  const [inventoryModalDelta, setInventoryModalDelta] = useState("");
  const [inventoryModalNote, setInventoryModalNote] = useState("");

  const selectedProduct =
    selectedProductId === "new"
      ? undefined
      : sellerProducts.find((product) => product.id === selectedProductId);

  const activeTab = normalizeDashboardTab(searchParams.get("tab") ?? initialTab);

  const visibleProducts = useMemo(() => {
    return sellerProducts.filter((product) => {
      const searchable = `${product.title} ${product.brand} ${product.sku}`.toLowerCase();
      return (
        (!productQuery.trim() || searchable.includes(productQuery.trim().toLowerCase())) &&
        (productStatusFilter === "ALL" || product.moderationStatus === productStatusFilter)
      );
    });
  }, [productQuery, productStatusFilter, sellerProducts]);

  const sellerProductsTotalPages = Math.max(
    Math.ceil(visibleProducts.length / SELLER_PRODUCTS_PER_PAGE),
    1,
  );
  const paginatedSellerProducts = visibleProducts.slice(
    (sellerProductsPage - 1) * SELLER_PRODUCTS_PER_PAGE,
    sellerProductsPage * SELLER_PRODUCTS_PER_PAGE,
  );

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchable =
        `${order.orderNumber} ${order.shippingAddress.fullName} ${order.shippingAddress.city}`.toLowerCase();
      return (
        (!orderQuery.trim() || searchable.includes(orderQuery.trim().toLowerCase())) &&
        (orderStatusFilter === "ALL" || order.status === orderStatusFilter)
      );
    });
  }, [orderQuery, orderStatusFilter, orders]);

  const sellerOrdersTotalPages = Math.max(
    Math.ceil(visibleOrders.length / SELLER_ORDERS_PER_PAGE),
    1,
  );
  const paginatedSellerOrders = visibleOrders.slice(
    (sellerOrdersPage - 1) * SELLER_ORDERS_PER_PAGE,
    sellerOrdersPage * SELLER_ORDERS_PER_PAGE,
  );
  const selectedSellerOrder = visibleOrders.find((order) => order.id === selectedSellerOrderId);
  const selectedSellerOrderView =
    selectedSellerOrder && sellerRecord
      ? getSellerOrderView(state, selectedSellerOrder, sellerRecord.slug)
      : undefined;
  const selectedSellerPayment = selectedSellerOrder
    ? getPaymentById(state, selectedSellerOrder.paymentId)
    : undefined;
  const selectedSellerTimeline = selectedSellerOrder
    ? getOrderTimeline(state, selectedSellerOrder.id).slice(0, 6)
    : [];
  const selectedSellerTransitions = selectedSellerOrderView?.fulfillment
    ? getAllowedSellerOrderTransitions(selectedSellerOrderView.fulfillment.status)
    : [];

  useEffect(() => {
    if (sellerRecord) {
      setStoreDraft(createStoreDraft(sellerRecord));
    }
  }, [sellerRecord]);

  useEffect(() => {
    if (selectedProduct) {
      setProductDraft(createProductDraft(selectedProduct));
      return;
    }

    setProductDraft(createEmptyProductDraft(defaultCategory));
  }, [defaultCategory, selectedProduct]);

  useEffect(() => {
    setSellerProductsPage(1);
  }, [productQuery, productStatusFilter]);

  useEffect(() => {
    setSellerOrdersPage(1);
  }, [orderQuery, orderStatusFilter]);

  useEffect(() => {
    if (!visibleOrders.length) {
      setSelectedSellerOrderId("");
      return;
    }

    if (!visibleOrders.some((order) => order.id === selectedSellerOrderId)) {
      setSelectedSellerOrderId(visibleOrders[0].id);
    }
  }, [selectedSellerOrderId, visibleOrders]);

  const setActiveTab = (tab: DashboardTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab);
    router.replace(`/seller/orders?${nextParams.toString()}`, { scroll: false });
  };

  const handleSaveStore = () => {
    if (!storeDraft) {
      return;
    }

    try {
      updateSellerStoreProfile(storeDraft);
      toast.success("Store profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update store profile.");
    }
  };

  const handleSaveProduct = () => {
    if (!sellerRecord) {
      return;
    }

    try {
      const input = buildProductInput(productDraft, selectedProduct, sellerRecord.slug);
      saveSellerProduct(input);
      toast.success(productDraft.id ? "Product listing updated." : "Product listing created.");

      if (!productDraft.id) {
        setSelectedProductId("new");
        setProductDraft(createEmptyProductDraft(defaultCategory));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save product listing.");
    }
  };

  const handleQuickInventory = (productId: string, quantityDelta: number) => {
    try {
      adjustSellerInventory({ productId, quantityDelta });
      toast.success("Inventory updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update inventory.");
    }
  };

  const handleApplyInventoryDraft = (productId: string) => {
    const quantityDelta = Number(inventoryDeltaByProduct[productId] ?? "0");
    const note = inventoryNoteByProduct[productId]?.trim();

    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      toast.error("Enter a stock adjustment value before applying.");
      return;
    }

    const input: InventoryAdjustmentInput = { productId, quantityDelta, note };

    try {
      adjustSellerInventory(input);
      setInventoryDeltaByProduct((previous) => ({ ...previous, [productId]: "" }));
      setInventoryNoteByProduct((previous) => ({ ...previous, [productId]: "" }));
      toast.success("Inventory adjustment applied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to apply stock adjustment.");
    }
  };

  const handleOpenProductModal = (productId?: string) => {
    if (productId) {
      setSelectedProductId(productId);
    } else {
      setSelectedProductId("new");
      setProductDraft(createEmptyProductDraft(defaultCategory));
    }
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
  };

  const handleOpenStoreModal = () => {
    setIsStoreModalOpen(true);
  };

  const handleCloseStoreModal = () => {
    setIsStoreModalOpen(false);
  };

  const handleOpenInventoryModal = (productId: string) => {
    setSelectedInventoryProductId(productId);
    setInventoryModalDelta("");
    setInventoryModalNote("");
    setIsInventoryModalOpen(true);
  };

  const handleCloseInventoryModal = () => {
    setIsInventoryModalOpen(false);
    setSelectedInventoryProductId(null);
  };

  const handleSaveInventoryFromModal = () => {
    if (!selectedInventoryProductId) return;

    const quantityDelta = Number(inventoryModalDelta ?? "0");
    const note = inventoryModalNote.trim();

    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      toast.error("Enter a stock adjustment value before applying.");
      return;
    }

    const input: InventoryAdjustmentInput = {
      productId: selectedInventoryProductId,
      quantityDelta,
      note,
    };

    try {
      adjustSellerInventory(input);
      handleCloseInventoryModal();
      toast.success("Inventory adjustment applied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to apply stock adjustment.");
    }
  };

  const handleUpdateSellerOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    try {
      updateOrderStatus(orderId, nextStatus);
      toast.success(`Order moved to ${formatLabel(nextStatus)}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update seller order status.");
    }
  };

  const quickStats = sellerRecord
    ? activeTab === "earnings" && financeDashboard
      ? [
          {
            label: "Verified Net",
            value: formatCompactMoney(financeDashboard.summary.verifiedNet),
            tone: "success" as const,
          },
          {
            label: "Awaiting",
            value: formatCompactMoney(financeDashboard.summary.awaitingVerification),
            tone: "warning" as const,
          },
          {
            label: "Open Payouts",
            value: formatCompactMoney(
              financeDashboard.summary.readyForPayout +
                financeDashboard.summary.scheduledPayouts +
                financeDashboard.summary.processingPayouts +
                financeDashboard.summary.heldPayouts,
            ),
            tone: "default" as const,
          },
          {
            label: "Paid Out",
            value: formatCompactMoney(financeDashboard.summary.paidOut),
            tone: "success" as const,
          },
        ]
      : [
          {
            label: "Published",
            value: publishedProducts.length,
            tone: "success" as const,
          },
          {
            label: "Orders",
            value: liveOrderCount,
            tone: "warning" as const,
          },
          {
            label: "Low Stock",
            value: lowStockProducts.length,
            tone: lowStockProducts.length > 0 ? ("danger" as const) : ("success" as const),
          },
          {
            label: "Reviews",
            value: pendingReviews.length,
            tone: pendingReviews.length > 0 ? ("warning" as const) : ("default" as const),
          },
        ]
    : [];

  const tabMeta = sellerRecord
    ? {
        overview: {
          eyebrow: "Seller Overview",
          title: `${sellerRecord.name} operations overview`,
          description:
            "Track catalog health, low-stock pressure, live orders, and review activity from one cleaner workspace.",
        },
        store: {
          eyebrow: "Store Profile",
          title: "Brand, trust, and storefront details",
          description:
            "Keep your public store polished with stronger visuals, policies, and response-time details buyers can trust.",
        },
        products: {
          eyebrow: "Catalog Management",
          title: "Seller-owned product listings",
          description:
            "Add new parts, refresh content, and keep listings clear, fitment-friendly, and ready for marketplace visibility.",
        },
        inventory: {
          eyebrow: "Inventory Control",
          title: "Stock visibility and adjustments",
          description:
            "Monitor available units, low-stock risk, and quick manual inventory changes with mobile-friendly controls.",
        },
        orders: {
          eyebrow: "Order Desk",
          title: "Fulfilment-ready seller orders",
          description:
            "See payment visibility, shipping details, and the exact items assigned to your store before processing.",
        },
        earnings: {
          eyebrow: "Earnings",
          title: "Commissions, COD verification, and payouts",
          description:
            "Track what SpareKart deducted, what is scheduled for payout, and which delivered orders are still waiting on COD verification.",
        },
      }[activeTab]
    : null;

  const headerActions = sellerRecord ? (
    <>
      <Link
        href={`/seller/${sellerRecord.slug}`}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
      >
        <Eye className="h-4 w-4" />
        View Store
      </Link>
      {activeTab === "store" ? (
        <button
          type="button"
          onClick={handleOpenStoreModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <PencilLine className="h-4 w-4" />
          Edit Store
        </button>
      ) : null}
      {activeTab === "products" || activeTab === "overview" || activeTab === "inventory" ? (
        <button
          type="button"
          onClick={() => handleOpenProductModal()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      ) : null}
    </>
  ) : null;

  return (
    <AccessGuard
      allow={["SELLER"]}
      title="Seller Portal Only"
      description="Switch to a seller account to manage your SpareKart store, products, inventory, and marketplace orders."
    >
      {!sellerRecord ? (
        <div className="min-h-screen bg-surface px-4 py-10 sm:py-12">
          <div className="mx-auto max-w-2xl rounded-[30px] bg-card p-6 text-center shadow-[var(--shadow-premium)] sm:p-8">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-warning/15 text-warning-foreground">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-foreground">Store record unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your seller account is active, but a store record could not be loaded for this
              session.
            </p>
          </div>
        </div>
      ) : (
        <SellerShell
          seller={sellerRecord}
          tabs={dashboardTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as DashboardTab)}
          quickStats={quickStats}
        >
          <div className="space-y-6">
            {tabMeta ? (
              <AdminPageHeader
                eyebrow={tabMeta.eyebrow}
                title={tabMeta.title}
                description={tabMeta.description}
                actions={headerActions}
              />
            ) : null}

            {activeTab === "overview" ? (
              <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <SellerMetricCard
                  label="Published Products"
                  value={String(publishedProducts.length)}
                  helper="Live in your storefront"
                  tone="success"
                />
                <SellerMetricCard
                  label="Open Orders"
                  value={String(liveOrderCount)}
                  helper="Confirmed to shipped"
                  tone="warning"
                />
                <SellerMetricCard
                  label="Low Stock Alerts"
                  value={String(lowStockProducts.length)}
                  helper="Needs replenishment"
                  tone={lowStockProducts.length > 0 ? "danger" : "success"}
                />
                <SellerMetricCard
                  label="Store Rating"
                  value={storeRating.toFixed(1)}
                  helper={`${approvedReviews.length || sellerRecord.reviewCount} published reviews`}
                />
              </section>
            ) : null}

            {activeTab === "store" ? (
              <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <SellerMetricCard
                  label="Verification"
                  value={sellerRecord.verified ? "Verified" : "Pending"}
                  helper="Public trust status"
                  tone={sellerRecord.verified ? "success" : "warning"}
                />
                <SellerMetricCard
                  label="Store Tier"
                  value={sellerRecord.tier}
                  helper="Commercial profile"
                />
                <SellerMetricCard
                  label="Response Time"
                  value={sellerRecord.responseTime}
                  helper="Customer-facing promise"
                />
                <SellerMetricCard
                  label="Commission"
                  value={`${sellerRecord.commissionRate}%`}
                  helper="Marketplace share"
                />
              </section>
            ) : null}

            {activeTab === "products" ? (
              <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <SellerMetricCard
                  label="Catalog Size"
                  value={String(sellerProducts.length)}
                  helper="All seller-owned listings"
                />
                <SellerMetricCard
                  label="Published"
                  value={String(publishedProducts.length)}
                  helper="Visible in storefront"
                  tone="success"
                />
                <SellerMetricCard
                  label="Draft / Inactive"
                  value={String(
                    sellerProducts.filter((product) =>
                      ["DRAFT", "INACTIVE"].includes(product.moderationStatus),
                    ).length,
                  )}
                  helper="Needs seller action"
                  tone="warning"
                />
                <SellerMetricCard
                  label="Flagged"
                  value={String(
                    sellerProducts.filter((product) => product.moderationStatus === "FLAGGED")
                      .length,
                  )}
                  helper="Requires refresh"
                  tone="danger"
                />
              </section>
            ) : null}

            {activeTab === "inventory" ? (
              <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <SellerMetricCard
                  label="Inventory Units"
                  value={String(totalInventoryUnits)}
                  helper="Available across all listings"
                />
                <SellerMetricCard
                  label="Low Stock"
                  value={String(lowStockProducts.length)}
                  helper="At or below five units"
                  tone={lowStockProducts.length > 0 ? "danger" : "success"}
                />
                <SellerMetricCard
                  label="Out Of Stock"
                  value={String(
                    sellerProducts.filter(
                      (product) => (state.inventory[product.id]?.available ?? product.stock) === 0,
                    ).length,
                  )}
                  helper="Needs urgent replenishment"
                  tone="warning"
                />
                <SellerMetricCard
                  label="Published SKUs"
                  value={String(publishedProducts.length)}
                  helper="Live inventory-bearing listings"
                  tone="success"
                />
              </section>
            ) : null}

            {activeTab === "orders" ? (
              <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <SellerMetricCard
                  label="Total Orders"
                  value={String(orders.length)}
                  helper="All orders with your products"
                />
                <SellerMetricCard
                  label="Fulfilment Ready"
                  value={String(readyOrders.length)}
                  helper="Confirmed or processing"
                  tone="success"
                />
                <SellerMetricCard
                  label="Awaiting Payment"
                  value={String(
                    orders.filter((order) =>
                      ["AWAITING_PAYMENT_PROOF", "AWAITING_PAYMENT_VERIFICATION"].includes(
                        order.status,
                      ),
                    ).length,
                  )}
                  helper="Waiting on customer/admin"
                  tone="warning"
                />
                <SellerMetricCard
                  label="Shipped / Delivered"
                  value={String(
                    orders.filter((order) => ["SHIPPED", "DELIVERED"].includes(order.status))
                      .length,
                  )}
                  helper="Beyond fulfilment checkpoint"
                />
              </section>
            ) : null}

            {activeTab === "earnings" ? <SellerCommissionDashboard embedded /> : null}

            <div className="space-y-6">
              {activeTab === "overview" ? (
                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-6">
                    <DashboardSection
                      title="Operations Snapshot"
                      description="Keep the store profile, catalog, and fulfilment flow healthy across mobile and desktop."
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CompactInsight
                          icon={PackageCheck}
                          label="Products in catalog"
                          value={String(sellerProducts.length)}
                          helper={`${publishedProducts.length} published, ${sellerProducts.length - publishedProducts.length} awaiting work`}
                        />
                        <CompactInsight
                          icon={ClipboardList}
                          label="Ready to fulfil"
                          value={String(readyOrders.length)}
                          helper="Confirmed orders waiting on seller action"
                        />
                        <CompactInsight
                          icon={ShieldCheck}
                          label="Pending store reviews"
                          value={String(pendingReviews.length)}
                          helper="Queued for admin moderation"
                        />
                        <CompactInsight
                          icon={Boxes}
                          label="Inventory on hand"
                          value={String(totalInventoryUnits)}
                          helper="Available units across listed products"
                        />
                      </div>
                    </DashboardSection>

                    <DashboardSection
                      title="Recent Notifications"
                      description="Seller-facing alerts tied to payment verification, confirmed orders, and marketplace actions."
                    >
                      <NotificationFeed
                        items={notifications}
                        emptyLabel="No seller notifications yet."
                      />
                    </DashboardSection>

                    <DashboardSection
                      title="Latest Orders"
                      description="Fast access to the newest customer orders assigned to this store."
                    >
                      <div className="space-y-3">
                        {orders.slice(0, 3).map((order) => {
                          const payment = getPaymentById(state, order.paymentId);
                          const sellerItems = order.items.filter(
                            (item) => item.sellerSlug === sellerRecord.slug,
                          );

                          return (
                            <div
                              key={order.id}
                              className="rounded-[18px] border border-border/60 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-black text-foreground">
                                    {order.orderNumber}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {order.shippingAddress.fullName} · {order.shippingAddress.city}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <OrderStatusBadge status={order.status} />
                                  {payment ? <PaymentStatusBadge status={payment.status} /> : null}
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-card px-3 py-1 shadow-[var(--shadow-soft)]">
                                  {sellerItems.length} item{sellerItems.length > 1 ? "s" : ""}
                                </span>
                                <span className="rounded-full bg-card px-3 py-1 shadow-[var(--shadow-soft)]">
                                  {formatPKR(
                                    sellerItems.reduce(
                                      (sum, item) => sum + item.unitPrice * item.quantity,
                                      0,
                                    ),
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </DashboardSection>
                  </div>

                  <div className="space-y-6">
                    <DashboardSection
                      title="Low Stock Attention"
                      description="Products running low can be restocked directly from the inventory tab."
                    >
                      {lowStockProducts.length === 0 ? (
                        <EmptyPanel
                          title="Inventory looks healthy"
                          body="There are no low-stock products right now."
                        />
                      ) : (
                        <div className="space-y-3">
                          {lowStockProducts.slice(0, 5).map((product) => {
                            const available =
                              state.inventory[product.id]?.available ?? product.stock;
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => setActiveTab("inventory")}
                                className="flex w-full items-center gap-3 rounded-[18px] border border-border/60 p-4 text-left transition-colors hover:border-accent/40"
                              >
                                <OptimizedImage
                                  src={product.images[0]}
                                  alt={product.title}
                                  width={56}
                                  height={56}
                                  className="h-14 w-14 rounded-2xl object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 text-sm font-semibold text-foreground">
                                    {product.title}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {product.sku} · {formatLabel(product.category)}
                                  </div>
                                </div>
                                <div className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-destructive">
                                  {available} left
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </DashboardSection>

                    <DashboardSection
                      title="Store Health"
                      description="Customer trust and storefront quality signals that affect conversion."
                    >
                      <div className="space-y-3">
                        <HealthRow label="Store rating" value={`${storeRating.toFixed(1)} / 5`} />
                        <HealthRow
                          label="Published reviews"
                          value={String(approvedReviews.length || sellerRecord.reviewCount)}
                        />
                        <HealthRow label="Tier" value={sellerRecord.tier} />
                        <HealthRow
                          label="Payout hold"
                          value={sellerRecord.payoutHold ? "Enabled" : "Clear"}
                        />
                      </div>
                    </DashboardSection>

                    <DashboardSection
                      title="Public Storefront"
                      description="Preview the current public-facing store page customers see."
                    >
                      <Link
                        href={`/seller/${sellerRecord.slug}`}
                        className="block overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
                      >
                        <div className="relative h-36">
                          <OptimizedImage
                            src={sellerRecord.banner}
                            alt={sellerRecord.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 40vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
                        </div>
                        <div className="flex items-center gap-3 p-4">
                          <OptimizedImage
                            src={sellerRecord.logo}
                            alt={sellerRecord.name}
                            width={52}
                            height={52}
                            className="h-[52px] w-[52px] rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-foreground">
                              {sellerRecord.name}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {publishedProducts.length} products · {sellerRecord.city}
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-accent" />
                        </div>
                      </Link>
                    </DashboardSection>
                  </div>
                </div>
              ) : null}

              {activeTab === "store" && storeDraft ? (
                <DashboardSection
                  title="Store Profile"
                  description="Manage your public store information, visuals, and policies."
                  action={
                    <button
                      type="button"
                      onClick={handleOpenStoreModal}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                    >
                      <PencilLine className="h-4 w-4" />
                      Open Editor
                    </button>
                  }
                >
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-[18px] border border-border/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Store Name
                      </p>
                      <p className="mt-2 text-lg font-black text-foreground">{storeDraft.name}</p>
                    </div>
                    <div className="rounded-[18px] border border-border/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Tagline
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {storeDraft.tagline || "Not set"}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-border/60 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Response Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {storeDraft.responseTime}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[18px] border border-border/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                      Store Description
                    </p>
                    <p className="text-sm text-muted-foreground leading-6">
                      {storeDraft.description || "No description set"}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border-2 border-dashed border-border p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                        Logo
                      </p>
                      {storeDraft.logo ? (
                        <OptimizedImage
                          src={storeDraft.logo}
                          alt="Logo"
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-lg object-contain"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </div>
                    <div className="rounded-[24px] border-2 border-dashed border-border p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                        Banner
                      </p>
                      {storeDraft.banner ? (
                        <OptimizedImage
                          src={storeDraft.banner}
                          alt="Banner"
                          width={320}
                          height={64}
                          className="h-16 rounded-lg object-contain w-full"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </div>
                    <div className="rounded-[24px] bg-info/10 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-info mb-2">
                        Quick Tips
                      </p>
                      <p className="text-xs text-info/80">
                        Use the editor to update policies, social links, and visuals.
                      </p>
                    </div>
                  </div>
                </DashboardSection>
              ) : null}

              {activeTab === "products" ? (
                <OperationsPanel
                  title="Product catalog"
                  description="Table-first catalog management with status tabs, direct editing, stock actions, and pagination."
                >
                  <OperationsToolbar>
                    <div className="grid gap-2">
                      <OperationsTabs
                        active={productStatusFilter}
                        onChange={(value) => setProductStatusFilter(value as ProductFilterStatus)}
                        tabs={productStatuses.map((status) => ({
                          value: status,
                          label: status === "ALL" ? "All" : formatLabel(status),
                          count:
                            status === "ALL"
                              ? sellerProducts.length
                              : sellerProducts.filter(
                                  (product) => product.moderationStatus === status,
                                ).length,
                        }))}
                      />
                      <OperationsSearch
                        value={productQuery}
                        onChange={setProductQuery}
                        placeholder="Search title, brand, or SKU"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenProductModal()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      New Product
                    </button>
                  </OperationsToolbar>

                  <OperationsTable minWidth="860px">
                    <thead>
                      <tr>
                        <OperationsTh>Product</OperationsTh>
                        <OperationsTh>Status</OperationsTh>
                        <OperationsTh>Category</OperationsTh>
                        <OperationsTh className="text-right">Price</OperationsTh>
                        <OperationsTh className="text-right">Stock</OperationsTh>
                        <OperationsTh className="text-right">Actions</OperationsTh>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSellerProducts.map((product) => {
                        const available = state.inventory[product.id]?.available ?? product.stock;
                        return (
                          <OperationsRow key={product.id}>
                            <OperationsTd>
                              <div className="flex items-center gap-3">
                                <OptimizedImage
                                  src={product.images[0]}
                                  alt={product.title}
                                  width={44}
                                  height={44}
                                  className="h-11 w-11 rounded-xl object-cover"
                                />
                                <div className="min-w-0">
                                  <div className="line-clamp-1 font-black text-foreground">
                                    {product.title}
                                  </div>
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    {product.brand} · {product.sku}
                                  </div>
                                </div>
                              </div>
                            </OperationsTd>
                            <OperationsTd>
                              <StatusChip status={product.moderationStatus} />
                              {product.reviewRequired ? (
                                <div className="mt-1 text-[11px] font-semibold text-warning-foreground">
                                  Needs review
                                </div>
                              ) : null}
                            </OperationsTd>
                            <OperationsTd className="text-xs font-semibold text-muted-foreground">
                              {formatLabel(product.category)}
                            </OperationsTd>
                            <OperationsTd className="text-right font-black tabular-nums">
                              {formatPKR(product.price)}
                            </OperationsTd>
                            <OperationsTd className="text-right">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                  available === 0
                                    ? "bg-destructive/10 text-destructive"
                                    : available <= 5
                                      ? "bg-warning/15 text-warning-foreground"
                                      : "bg-success/10 text-success"
                                }`}
                              >
                                {available}
                              </span>
                            </OperationsTd>
                            <OperationsTd>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenProductModal(product.id)}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 text-xs font-bold"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenInventoryModal(product.id)}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 text-xs font-bold"
                                >
                                  Stock
                                </button>
                                <Link
                                  href={`/product/${product.slug}`}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 text-xs font-bold"
                                >
                                  View
                                </Link>
                              </div>
                            </OperationsTd>
                          </OperationsRow>
                        );
                      })}
                    </tbody>
                  </OperationsTable>

                  <OperationsMobileList>
                    {paginatedSellerProducts.map((product) => {
                      const available = state.inventory[product.id]?.available ?? product.stock;
                      return (
                        <OperationsMobileCard key={product.id}>
                          <div className="flex gap-3">
                            <OptimizedImage
                              src={product.images[0]}
                              alt={product.title}
                              width={54}
                              height={54}
                              className="h-14 w-14 rounded-xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-2 text-sm font-black text-foreground">
                                {product.title}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {product.brand} · {product.sku}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <StatusChip status={product.moderationStatus} />
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${
                                    available === 0
                                      ? "bg-destructive/10 text-destructive"
                                      : available <= 5
                                        ? "bg-warning/15 text-warning-foreground"
                                        : "bg-success/10 text-success"
                                  }`}
                                >
                                  {available} stock
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenProductModal(product.id)}
                              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInventoryModal(product.id)}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border/70 px-2 text-xs font-bold"
                            >
                              Stock
                            </button>
                            <Link
                              href={`/product/${product.slug}`}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-border/70 px-2 text-xs font-bold"
                            >
                              View
                            </Link>
                          </div>
                        </OperationsMobileCard>
                      );
                    })}
                  </OperationsMobileList>

                  {visibleProducts.length === 0 ? (
                    <div className="p-3">
                      <EmptyPanel
                        title="No products match this filter"
                        body="Adjust the search or status filter to see matching catalog items."
                        action={
                          <button
                            type="button"
                            onClick={() => handleOpenProductModal()}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                          >
                            <Plus className="h-4 w-4" />
                            Create First Product
                          </button>
                        }
                      />
                    </div>
                  ) : null}

                  <OperationsPager
                    page={sellerProductsPage}
                    totalPages={sellerProductsTotalPages}
                    totalItems={visibleProducts.length}
                    pageSize={SELLER_PRODUCTS_PER_PAGE}
                    onPageChange={setSellerProductsPage}
                  />
                </OperationsPanel>
              ) : null}

              {activeTab === "inventory" ? (
                <div className="space-y-6">
                  <DashboardSection
                    title="Inventory Controls"
                    description="Use quick actions for simple changes or apply an auditable manual adjustment with a note."
                  >
                    <div className="space-y-4">
                      {sellerProducts.map((product) => {
                        const available = state.inventory[product.id]?.available ?? product.stock;
                        return (
                          <div
                            key={product.id}
                            className="rounded-[18px] border border-border/60 p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex min-w-0 gap-3">
                                <OptimizedImage
                                  src={product.images[0]}
                                  alt={product.title}
                                  width={68}
                                  height={68}
                                  className="h-[68px] w-[68px] rounded-2xl object-cover"
                                />
                                <div className="min-w-0">
                                  <div className="line-clamp-2 text-sm font-black text-foreground">
                                    {product.title}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {product.sku} · {formatPKR(product.price)}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span
                                      className={`rounded-full px-3 py-1 font-bold uppercase tracking-[0.14em] ${
                                        available === 0
                                          ? "bg-destructive/10 text-destructive"
                                          : available <= 5
                                            ? "bg-warning/15 text-warning-foreground"
                                            : "bg-success/10 text-success"
                                      }`}
                                    >
                                      {available} available
                                    </span>
                                    <StatusChip status={product.moderationStatus} />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <button
                                  type="button"
                                  onClick={() => handleQuickInventory(product.id, -1)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                >
                                  <Minus className="h-4 w-4" />1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickInventory(product.id, -5)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                >
                                  <Minus className="h-4 w-4" />5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickInventory(product.id, 1)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                >
                                  <Plus className="h-4 w-4" />1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickInventory(product.id, 5)}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-card px-3 text-sm font-semibold shadow-[var(--shadow-soft)]"
                                >
                                  <Plus className="h-4 w-4" />5
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_auto]">
                              <input
                                type="number"
                                value={inventoryDeltaByProduct[product.id] ?? ""}
                                onChange={(event) =>
                                  setInventoryDeltaByProduct((previous) => ({
                                    ...previous,
                                    [product.id]: event.target.value,
                                  }))
                                }
                                placeholder="Custom delta"
                                className="h-11 rounded-xl bg-card px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                              />
                              <input
                                value={inventoryNoteByProduct[product.id] ?? ""}
                                onChange={(event) =>
                                  setInventoryNoteByProduct((previous) => ({
                                    ...previous,
                                    [product.id]: event.target.value,
                                  }))
                                }
                                placeholder="Adjustment note for audit trail"
                                className="h-11 rounded-xl bg-card px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyInventoryDraft(product.id)}
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </DashboardSection>
                </div>
              ) : null}

              {activeTab === "orders" ? (
                <OperationsWorkspace className="xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
                  <OperationsPanel
                    title="Seller order desk"
                    description="A fulfilment queue with status tabs, fast search, pagination, and one focused order inspector."
                  >
                    <OperationsToolbar>
                      <div className="grid gap-2">
                        <OperationsTabs
                          active={orderStatusFilter}
                          onChange={(value) => setOrderStatusFilter(value as OrderStatus | "ALL")}
                          tabs={orderStatusFilters.map((status) => ({
                            value: status,
                            label: status === "ALL" ? "All" : formatLabel(status),
                            count:
                              status === "ALL"
                                ? orders.length
                                : orders.filter((order) => order.status === status).length,
                          }))}
                        />
                        <OperationsSearch
                          value={orderQuery}
                          onChange={setOrderQuery}
                          placeholder="Search order number, customer, or city"
                        />
                      </div>
                      <OperationsSelect
                        value={orderStatusFilter}
                        onChange={(value) => setOrderStatusFilter(value as OrderStatus | "ALL")}
                        label="Status"
                      >
                        {orderStatusFilters.map((status) => (
                          <option key={status} value={status}>
                            {status === "ALL" ? "All statuses" : formatLabel(status)}
                          </option>
                        ))}
                      </OperationsSelect>
                    </OperationsToolbar>

                    <OperationsTable minWidth="820px">
                      <thead>
                        <tr>
                          <OperationsTh>Order</OperationsTh>
                          <OperationsTh>Customer</OperationsTh>
                          <OperationsTh>Store status</OperationsTh>
                          <OperationsTh>Payment</OperationsTh>
                          <OperationsTh className="text-right">Items</OperationsTh>
                          <OperationsTh className="text-right">Value</OperationsTh>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSellerOrders.map((order) => {
                          const payment = getPaymentById(state, order.paymentId);
                          const { fulfillment, sellerItems } = getSellerOrderView(
                            state,
                            order,
                            sellerRecord.slug,
                          );
                          const sellerOrderValue = sellerItems.reduce(
                            (sum, item) => sum + item.unitPrice * item.quantity,
                            0,
                          );

                          return (
                            <OperationsRow
                              key={order.id}
                              selected={selectedSellerOrderId === order.id}
                              onClick={() => setSelectedSellerOrderId(order.id)}
                            >
                              <OperationsTd>
                                <div className="font-black text-foreground">
                                  {order.orderNumber}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </div>
                              </OperationsTd>
                              <OperationsTd>
                                <div className="font-semibold text-foreground">
                                  {order.shippingAddress.fullName}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {order.shippingAddress.city}
                                </div>
                              </OperationsTd>
                              <OperationsTd>
                                {fulfillment ? (
                                  <OrderStatusBadge status={fulfillment.status} />
                                ) : (
                                  <OrderStatusBadge status={order.status} />
                                )}
                              </OperationsTd>
                              <OperationsTd>
                                {payment ? <PaymentStatusBadge status={payment.status} /> : null}
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {payment?.method.replaceAll("_", " ") ?? order.paymentMethod}
                                </div>
                              </OperationsTd>
                              <OperationsTd className="text-right font-bold tabular-nums">
                                {sellerItems.length}
                              </OperationsTd>
                              <OperationsTd className="text-right font-black tabular-nums text-foreground">
                                {formatPKR(sellerOrderValue)}
                              </OperationsTd>
                            </OperationsRow>
                          );
                        })}
                      </tbody>
                    </OperationsTable>

                    <OperationsMobileList>
                      {paginatedSellerOrders.map((order) => {
                        const payment = getPaymentById(state, order.paymentId);
                        const { fulfillment, sellerItems } = getSellerOrderView(
                          state,
                          order,
                          sellerRecord.slug,
                        );
                        const sellerOrderValue = sellerItems.reduce(
                          (sum, item) => sum + item.unitPrice * item.quantity,
                          0,
                        );

                        return (
                          <OperationsMobileCard
                            key={order.id}
                            selected={selectedSellerOrderId === order.id}
                            onClick={() => setSelectedSellerOrderId(order.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-foreground">
                                  {order.orderNumber}
                                </div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">
                                  {order.shippingAddress.fullName} · {order.shippingAddress.city}
                                </div>
                              </div>
                              <div className="text-right text-sm font-black tabular-nums text-foreground">
                                {formatPKR(sellerOrderValue)}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {fulfillment ? (
                                <OrderStatusBadge status={fulfillment.status} />
                              ) : (
                                <OrderStatusBadge status={order.status} />
                              )}
                              {payment ? <PaymentStatusBadge status={payment.status} /> : null}
                            </div>
                          </OperationsMobileCard>
                        );
                      })}
                    </OperationsMobileList>

                    {visibleOrders.length === 0 ? (
                      <div className="p-3">
                        <EmptyPanel
                          title="No matching orders"
                          body="Adjust the order filters to view relevant customer orders."
                        />
                      </div>
                    ) : null}

                    <OperationsPager
                      page={sellerOrdersPage}
                      totalPages={sellerOrdersTotalPages}
                      totalItems={visibleOrders.length}
                      pageSize={SELLER_ORDERS_PER_PAGE}
                      onPageChange={setSellerOrdersPage}
                    />
                  </OperationsPanel>

                  <OperationsDetailPanel
                    title={selectedSellerOrder ? selectedSellerOrder.orderNumber : "Order detail"}
                    subtitle={
                      selectedSellerOrder
                        ? `${selectedSellerOrder.shippingAddress.fullName} · ${selectedSellerOrder.shippingAddress.city}`
                        : "Choose an order from the queue."
                    }
                    meta={
                      selectedSellerOrder ? (
                        <>
                          {selectedSellerOrderView?.fulfillment ? (
                            <OrderStatusBadge status={selectedSellerOrderView.fulfillment.status} />
                          ) : (
                            <OrderStatusBadge status={selectedSellerOrder.status} />
                          )}
                          {selectedSellerPayment ? (
                            <PaymentStatusBadge status={selectedSellerPayment.status} />
                          ) : null}
                        </>
                      ) : null
                    }
                    empty={
                      <EmptyPanel
                        title="Select an order"
                        body="Open a row from the queue to inspect items, delivery, and seller actions."
                      />
                    }
                  >
                    {selectedSellerOrder && selectedSellerOrderView
                      ? (() => {
                          const { fulfillment, sellerItems, sellerSelection } =
                            selectedSellerOrderView;
                          return (
                            <div className="space-y-3">
                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                  <PackageCheck className="h-4 w-4 text-accent" />
                                  Items assigned to your store
                                </div>
                                <div className="mt-3 space-y-2">
                                  {sellerItems.map((item) => (
                                    <div
                                      key={`${selectedSellerOrder.id}-${item.productId}`}
                                      className="flex gap-3 rounded-xl border border-border/60 bg-card p-2.5"
                                    >
                                      <OptimizedImage
                                        src={item.image}
                                        alt={item.title}
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-xl object-cover"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="line-clamp-2 text-sm font-semibold text-foreground">
                                          {item.title}
                                        </div>
                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                          Qty {item.quantity} · SKU {item.sku}
                                        </div>
                                      </div>
                                      <div className="text-sm font-black tabular-nums text-foreground">
                                        {formatPKR(item.unitPrice * item.quantity)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="text-sm font-bold text-foreground">
                                  Fulfilment state
                                </div>
                                <div className="mt-2 rounded-xl border border-border/60 bg-card p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-semibold text-foreground">
                                        Your store status
                                      </div>
                                      <div className="mt-0.5 text-xs text-muted-foreground">
                                        Move forward only when payment is clear.
                                      </div>
                                    </div>
                                    {fulfillment ? (
                                      <OrderStatusBadge status={fulfillment.status} />
                                    ) : null}
                                  </div>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                  {selectedSellerPayment?.status === "PAID"
                                    ? "Payment is approved and this order is clear for seller fulfilment."
                                    : selectedSellerPayment?.status === "PROOF_SUBMITTED" ||
                                        selectedSellerPayment?.status === "UNDER_REVIEW"
                                      ? "Payment proof is under admin review. Hold fulfilment until confirmation."
                                      : selectedSellerPayment?.status === "REQUIRES_PROOF"
                                        ? "Customer still needs to upload payment proof."
                                        : selectedSellerPayment?.status === "REJECTED"
                                          ? "Customer must resubmit payment proof before the order can move forward."
                                          : "Cash on delivery order. Move it into processing when your team starts preparing it."}
                                </p>
                              </div>

                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="text-sm font-bold text-foreground">
                                  Fulfilment details
                                </div>
                                <div className="mt-2">
                                  <OperationsKeyValue
                                    label="Payment method"
                                    value={
                                      selectedSellerPayment?.method.replaceAll("_", " ") ??
                                      selectedSellerOrder.paymentMethod
                                    }
                                  />
                                  <OperationsKeyValue
                                    label="Shipping option"
                                    value={sellerSelection?.label ?? "Standard delivery"}
                                  />
                                  <OperationsKeyValue
                                    label="ETA"
                                    value={sellerSelection?.etaLabel ?? "As selected at checkout"}
                                  />
                                  <OperationsKeyValue
                                    label="Delivery phone"
                                    value={selectedSellerOrder.shippingAddress.phone}
                                  />
                                </div>
                              </div>

                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                  <Truck className="h-4 w-4 text-accent" />
                                  Shipping address
                                </div>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                  {selectedSellerOrder.shippingAddress.fullName}
                                  <br />
                                  {selectedSellerOrder.shippingAddress.addressLine}
                                  <br />
                                  {selectedSellerOrder.shippingAddress.city},{" "}
                                  {selectedSellerOrder.shippingAddress.province}{" "}
                                  {selectedSellerOrder.shippingAddress.postalCode}
                                </p>
                              </div>

                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                  <Truck className="h-4 w-4 text-accent" />
                                  Seller actions
                                </div>
                                {selectedSellerTransitions.length === 0 ? (
                                  <div className="mt-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
                                    This order is not ready for seller action yet. Admin payment
                                    verification or previous fulfilment steps must complete first.
                                  </div>
                                ) : (
                                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {selectedSellerTransitions.map((status) => (
                                      <button
                                        key={`${selectedSellerOrder.id}-${status}`}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateSellerOrderStatus(
                                            selectedSellerOrder.id,
                                            status,
                                          )
                                        }
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-black uppercase tracking-[0.1em]"
                                      >
                                        Move to {formatLabel(status)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="text-sm font-bold text-foreground">
                                  Seller progress across this order
                                </div>
                                <div className="mt-3">
                                  <SellerFulfillmentGrid
                                    state={state}
                                    fulfillments={selectedSellerOrder.sellerFulfillments}
                                    activeSellerSlug={sellerRecord.slug}
                                  />
                                </div>
                              </div>

                              <div className="rounded-[14px] border border-border/70 bg-background p-3">
                                <div className="text-sm font-bold text-foreground">
                                  Order timeline
                                </div>
                                <div className="mt-3">
                                  <OrderTimeline items={selectedSellerTimeline} />
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      : null}
                  </OperationsDetailPanel>
                </OperationsWorkspace>
              ) : null}
            </div>
          </div>
        </SellerShell>
      )}

      {storeDraft && (
        <StoreModal
          isOpen={isStoreModalOpen}
          onClose={handleCloseStoreModal}
          onSave={handleSaveStore}
          storeDraft={storeDraft}
          onDraftChange={setStoreDraft}
        />
      )}

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        onSave={handleSaveProduct}
        productDraft={productDraft}
        onDraftChange={setProductDraft}
        selectedProduct={selectedProduct}
        categories={state.managedCategories}
      />

      {selectedInventoryProductId && (
        <InventoryModal
          isOpen={isInventoryModalOpen}
          onClose={handleCloseInventoryModal}
          onSave={handleSaveInventoryFromModal}
          delta={inventoryModalDelta}
          onDeltaChange={setInventoryModalDelta}
          note={inventoryModalNote}
          onNoteChange={setInventoryModalNote}
          productTitle={
            sellerProducts.find((p) => p.id === selectedInventoryProductId)?.title || ""
          }
          currentStock={
            state.inventory[selectedInventoryProductId]?.available ||
            sellerProducts.find((p) => p.id === selectedInventoryProductId)?.stock ||
            0
          }
        />
      )}
    </AccessGuard>
  );
}

function SellerMetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/4 border-success/20"
      : tone === "warning"
        ? "bg-warning/5 border-warning/20"
        : tone === "danger"
          ? "bg-destructive/4 border-destructive/20"
          : "bg-transparent border-border/60";

  return (
    <div className={`rounded-[16px] border px-3 py-2.5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{helper}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-black tracking-tight text-foreground sm:text-[1.35rem]">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-border/60 bg-card p-3.5 sm:p-4">
      <div className="mb-3 flex flex-col gap-2.5 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black text-foreground sm:text-[1.05rem]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CompactInsight({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof PackageCheck;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[16px] border border-border/60 px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{label}</span>
          </div>
          <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{helper}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-black text-foreground sm:text-[1.35rem]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-border/60 px-3.5 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function StatusChip({ status }: { status: ProductModerationStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-success/10 text-success"
      : status === "FLAGGED"
        ? "bg-destructive/10 text-destructive"
        : status === "INACTIVE"
          ? "bg-warning/15 text-warning-foreground"
          : "bg-info/10 text-info";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tone}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-2.5 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground sm:text-right">{value}</span>
    </div>
  );
}

function EmptyPanel({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-border/70 px-4 py-7 text-center">
      <div className="text-base font-black text-foreground sm:text-lg">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
