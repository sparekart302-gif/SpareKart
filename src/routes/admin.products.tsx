"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, PencilLine, Search } from "lucide-react";
import { toast } from "sonner";
import { CategoryManagementDialog } from "@/components/admin/CategoryManagementDialog";
import { ProductModerationDialog } from "@/components/admin/ProductModerationDialog";
import { AdminCompactStat, AdminField, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { getSellerRecordBySlug } from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type {
  ManagedCategoryInput,
  ManagedProduct,
  ManagedProductInput,
  ProductModerationStatus,
} from "@/modules/marketplace/types";
import { formatPKR } from "@/data/marketplace";

const productStatuses: ProductModerationStatus[] = ["ACTIVE", "DRAFT", "FLAGGED", "INACTIVE"];

export default function AdminProductsPage() {
  const { currentUser, state, saveCategoryRecord, deleteCategoryRecord, saveProductRecord } =
    useMarketplace();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ProductModerationStatus | "ALL">("ALL");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ManagedProductInput | null>(null);
  const [tagInput, setTagInput] = useState("");

  const filteredProducts = useMemo(() => {
    return state.managedProducts
      .filter((product) => {
        const searchable =
          `${product.title} ${product.sku} ${product.brand} ${product.sellerSlug}`.toLowerCase();
        return (
          !product.deletedAt &&
          (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
          (categoryFilter === "ALL" || product.category === categoryFilter) &&
          (statusFilter === "ALL" || product.moderationStatus === statusFilter)
        );
      })
      .sort((left, right) => {
        const leftWeight = left.moderationStatus === "FLAGGED" ? 0 : left.reviewRequired ? 1 : 2;
        const rightWeight = right.moderationStatus === "FLAGGED" ? 0 : right.reviewRequired ? 1 : 2;
        return leftWeight - rightWeight || left.title.localeCompare(right.title);
      });
  }, [categoryFilter, query, state.managedProducts, statusFilter]);

  const editingProduct =
    state.managedProducts.find(
      (product) => product.id === editingProductId && !product.deletedAt,
    ) ?? null;
  const editingSeller = editingProduct
    ? getSellerRecordBySlug(state, editingProduct.sellerSlug)
    : undefined;

  useEffect(() => {
    setProductDraft(editingProduct ? { ...editingProduct } : null);
    setTagInput(editingProduct ? editingProduct.tags.join(", ") : "");
  }, [editingProduct]);

  const stats = {
    activeProducts: state.managedProducts.filter(
      (product) => product.moderationStatus === "ACTIVE" && !product.deletedAt,
    ).length,
    flaggedProducts: state.managedProducts.filter(
      (product) => product.moderationStatus === "FLAGGED",
    ).length,
    reviewRequired: state.managedProducts.filter((product) => product.reviewRequired).length,
    sellerOwnedCatalogs: new Set(state.managedProducts.map((product) => product.sellerSlug)).size,
  };

  const openModeration = (product: ManagedProduct) => {
    setEditingProductId(product.id);
    setProductDraft({ ...product });
    setTagInput(product.tags.join(", "));
  };

  const handleCloseModeration = () => {
    setEditingProductId(null);
    setProductDraft(null);
    setTagInput("");
  };

  const handleSaveProductDraft = () => {
    if (!productDraft) {
      return;
    }

    try {
      saveProductRecord({
        ...productDraft,
        tags: normalizedTags(tagInput),
      });
      toast.success("Product moderation settings updated.");
      handleCloseModeration();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update product moderation settings.",
      );
    }
  };

  const handleFlagProduct = () => {
    if (!productDraft) {
      return;
    }

    try {
      saveProductRecord({
        ...productDraft,
        tags: normalizedTags(tagInput),
        moderationStatus: "FLAGGED",
        reviewRequired: true,
      });
      toast.success("Product flagged for seller review.");
      handleCloseModeration();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to flag product.");
    }
  };

  return (
    <AdminScopeGate scope="products" currentUser={currentUser}>
      <div className="space-y-3">
        <AdminPageHeader
          eyebrow="Product oversight"
          title="Seller-owned catalog moderation"
          description="Browse products as cards, open moderation instantly, and avoid the old select-then-scroll admin flow."
          actions={
            <Link
              href="/admin/sellers"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-semibold"
            >
              Review seller stores
            </Link>
          }
        />

        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat
            label="Live listings"
            value={String(stats.activeProducts)}
            helper="Visible seller products"
          />
          <AdminCompactStat
            label="Flagged"
            value={String(stats.flaggedProducts)}
            helper="Need moderation action"
            tone="danger"
          />
          <AdminCompactStat
            label="Review required"
            value={String(stats.reviewRequired)}
            helper="Seller fixes pending"
            tone="warning"
          />
          <AdminCompactStat
            label="Seller catalogs"
            value={String(stats.sellerOwnedCatalogs)}
            helper="Distinct seller feeds"
          />
        </section>

        <AdminPanel
          title="Category taxonomy"
          description="Manage product categories and keep naming consistent across seller listings."
          action={
            <button
              type="button"
              onClick={() => setIsCategoryDialogOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Manage categories
            </button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {state.managedCategories.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No categories yet. Create one to get started.
              </div>
            ) : (
              state.managedCategories.map((category) => (
                <div
                  key={category.slug}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5"
                >
                  <span className="text-[11px] font-semibold text-foreground">{category.name}</span>
                  {!category.active && (
                    <span className="text-[10px] text-muted-foreground">(Hidden)</span>
                  )}
                </div>
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Marketplace listings"
          description="Product cards with direct moderation actions and fast links to detail and storefront views."
        >
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.55fr_0.45fr]">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, SKU, brand, or seller"
                className="h-11 w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
            >
              <option value="ALL">All categories</option>
              {state.managedCategories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ProductModerationStatus | "ALL")
              }
              className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
            >
              <option value="ALL">All states</option>
              {productStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-4">
              <AdminEmptyState
                title="No matching products"
                body="Adjust the search or filters to review different listings."
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const seller = getSellerRecordBySlug(state, product.sellerSlug);
                const categoryName =
                  state.managedCategories.find((item) => item.slug === product.category)?.name ??
                  product.category;

                return (
                  <ProductAdminCard
                    key={product.id}
                    product={product}
                    sellerName={seller?.name ?? product.sellerSlug}
                    categoryName={categoryName}
                    stock={state.inventory[product.id]?.available ?? product.stock}
                    onModerate={() => openModeration(product)}
                  />
                );
              })}
            </div>
          )}
        </AdminPanel>

        <CategoryManagementDialog
          open={isCategoryDialogOpen}
          categories={state.managedCategories}
          onOpenChange={setIsCategoryDialogOpen}
          saveCategoryRecord={saveCategoryRecord}
          deleteCategoryRecord={deleteCategoryRecord}
        />

        <ProductModerationDialog
          open={!!editingProductId}
          draft={productDraft}
          tagInput={tagInput}
          categories={state.managedCategories}
          sellerName={editingSeller?.name}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseModeration();
            }
          }}
          onDraftChange={setProductDraft}
          onTagInputChange={setTagInput}
          onSave={handleSaveProductDraft}
          onFlag={handleFlagProduct}
        />
      </div>
    </AdminScopeGate>
  );
}

function ProductAdminCard({
  product,
  sellerName,
  categoryName,
  stock,
  onModerate,
}: {
  product: ManagedProduct;
  sellerName: string;
  categoryName: string;
  stock: number;
  onModerate: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-card p-2.5 sm:p-3">
      <div className="relative overflow-hidden rounded-[16px] border border-border/60">
        <OptimizedImage
          src={product.images[0]}
          alt={product.title}
          width={320}
          height={280}
          className="aspect-[1.08/1] w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <StatusPill status={product.moderationStatus} />
        </div>
      </div>

      <div className="mt-2.5">
        <div className="line-clamp-2 text-[13px] font-black text-foreground sm:text-sm">
          {product.title}
        </div>
        <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{sellerName}</div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <InlineChip>{categoryName}</InlineChip>
        {product.reviewRequired ? <InlineChip tone="warning">Needs review</InlineChip> : null}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
        <div className="rounded-[14px] border border-border/60 px-2.5 py-2">
          <div className="font-bold text-foreground">{formatPKR(product.price)}</div>
          <div className="mt-0.5 text-muted-foreground">Price</div>
        </div>
        <div className="rounded-[14px] border border-border/60 px-2.5 py-2">
          <div className="font-bold text-foreground">{stock}</div>
          <div className="mt-0.5 text-muted-foreground">Stock</div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onModerate}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground sm:text-sm"
        >
          <PencilLine className="h-4 w-4" />
          Edit
        </button>
        <Link
          href={`/admin/products/${product.id}`}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 px-3 text-xs font-semibold sm:text-sm"
        >
          Detail
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{product.sku}</span>
        <Link
          href={`/product/${product.slug}`}
          className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-accent"
        >
          View
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function InlineChip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        tone === "warning"
          ? "bg-warning/10 text-warning-foreground"
          : "border border-border/60 text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: ProductModerationStatus }) {
  const tone = status === "ACTIVE" ? "success" : status === "FLAGGED" ? "danger" : "warning";

  return <AdminPill tone={tone}>{status}</AdminPill>;
}

function normalizedTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
