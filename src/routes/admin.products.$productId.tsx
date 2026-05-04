"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { ProductModerationDialog } from "@/components/admin/ProductModerationDialog";
import { AdminCompactStat, AdminKeyValue, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getManagedProductById,
  getProductPerformance,
  getSellerRecordBySlug,
} from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { ManagedProductInput, ProductModerationStatus } from "@/modules/marketplace/types";
import { formatPKR } from "@/data/marketplace";
import { formatRating } from "@/lib/format-rating";

export default function AdminProductDetailPage({ productId }: { productId: string }) {
  const { currentUser, state } = useMarketplace();
  const product = getManagedProductById(state, productId);

  return (
    <AdminScopeGate scope="products" currentUser={currentUser}>
      {!product ? (
        <AdminEmptyState
          title="Product not found"
          body="This product detail screen could not find the requested item."
          action={
            <Link
              href="/admin/products"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Back to products
            </Link>
          }
        />
      ) : (
        <ProductDetailContent productId={productId} />
      )}
    </AdminScopeGate>
  );
}

function ProductDetailContent({ productId }: { productId: string }) {
  const { state, saveProductRecord } = useMarketplace();
  const product = getManagedProductById(state, productId)!;
  const performance = getProductPerformance(state).find((entry) => entry.product.id === productId);
  const seller = getSellerRecordBySlug(state, product.sellerSlug);
  const productReviews = state.managedProductReviews.filter(
    (review) => review.productId === productId,
  );
  const categoryName =
    state.managedCategories.find((category) => category.slug === product.category)?.name ??
    product.category;

  const [draft, setDraft] = useState<ManagedProductInput>(product);
  const [tagInput, setTagInput] = useState(product.tags.join(", "));
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setDraft(product);
    setTagInput(product.tags.join(", "));
  }, [product]);

  const handleSave = () => {
    try {
      saveProductRecord({
        ...draft,
        tags: normalizeTags(tagInput),
      });
      toast.success("Product moderation updated.");
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save moderation changes.");
    }
  };

  const handleFlag = () => {
    try {
      saveProductRecord({
        ...draft,
        tags: normalizeTags(tagInput),
        moderationStatus: "FLAGGED",
        reviewRequired: true,
      });
      toast.success("Product flagged for seller correction.");
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to flag product.");
    }
  };

  return (
    <div className="space-y-3">
      <AdminPageHeader
        eyebrow="Product detail"
        title={product.title}
        description="Compact admin view for moderation, taxonomy, seller ownership, and review signals."
        actions={
          <>
            <Link
              href="/admin/products"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-semibold"
            >
              Back to products
            </Link>
            <button
              type="button"
              onClick={() => {
                setDraft(product);
                setTagInput(product.tags.join(", "));
                setEditOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <PencilLine className="h-4 w-4" />
              Moderate
            </button>
          </>
        }
      />

      <AdminPanel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <OptimizedImage
            src={product.images[0]}
            alt={product.title}
            width={96}
            height={96}
            className="h-24 w-24 rounded-[24px] object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={product.moderationStatus} />
              <AdminPill tone="info">{product.brand}</AdminPill>
              <AdminPill tone="info">{categoryName}</AdminPill>
              {product.reviewRequired ? (
                <AdminPill tone="warning">Review required</AdminPill>
              ) : null}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {seller ? (
                <>
                  Seller:{" "}
                  <Link
                    href={`/admin/sellers/${seller.slug}`}
                    className="font-semibold text-accent hover:underline"
                  >
                    {seller.name}
                  </Link>
                </>
              ) : (
                <>Seller: {product.sellerSlug}</>
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{product.shortDescription}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/product/${product.slug}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-semibold"
              >
                <ExternalLink className="h-4 w-4" />
                Product page
              </Link>
              <Link
                href="/admin/reviews"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-semibold"
              >
                <Eye className="h-4 w-4" />
                Review queue
              </Link>
            </div>
          </div>
        </div>
      </AdminPanel>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCompactStat
          label="Revenue"
          value={formatPKR(performance?.revenue ?? 0)}
          helper="Attributed sales value"
          tone="success"
        />
        <AdminCompactStat
          label="Units sold"
          value={String(performance?.units ?? 0)}
          helper="Historical order units"
        />
        <AdminCompactStat
          label="Reviews"
          value={String(productReviews.length)}
          helper="Review records"
        />
        <AdminCompactStat
          label="Rating"
          value={formatRating(product.rating)}
          helper="Storefront rating"
        />
      </section>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[18px] bg-surface p-1 shadow-[var(--shadow-soft)]">
          <TabsTrigger
            value="overview"
            className="rounded-2xl px-3 py-2 text-xs font-semibold sm:text-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="catalog"
            className="rounded-2xl px-3 py-2 text-xs font-semibold sm:text-sm"
          >
            Catalog Data
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-2xl px-3 py-2 text-xs font-semibold sm:text-sm"
          >
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <AdminPanel
              title="Listing summary"
              description="Core seller-owned and admin-controlled fields."
            >
              <div className="divide-y divide-border/60">
                <AdminKeyValue label="SKU" value={product.sku} />
                <AdminKeyValue label="Category" value={categoryName} />
                <AdminKeyValue label="Seller price" value={formatPKR(product.price)} />
                <AdminKeyValue
                  label="Seller stock"
                  value={String(state.inventory[product.id]?.available ?? product.stock)}
                />
                <AdminKeyValue
                  label="Review required"
                  value={product.reviewRequired ? "Yes" : "No"}
                />
                <AdminKeyValue
                  label="Compatibility rows"
                  value={String(product.compatibility.length)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ChecklistChip label="Images" active={product.images.length > 0} />
                <ChecklistChip label="Specs" active={product.specs.length > 0} />
                <ChecklistChip label="Tags" active={product.tags.length >= 2} />
                <ChecklistChip label="Badge" active={Boolean(product.badge)} />
              </div>
            </AdminPanel>

            <div className="space-y-4">
              <AdminPanel
                title="Seller and performance"
                description="Marketplace activity and seller trust context."
              >
                <div className="divide-y divide-border/60">
                  <AdminKeyValue label="Seller" value={seller?.name ?? product.sellerSlug} />
                  <AdminKeyValue label="Seller verified" value={seller?.verified ? "Yes" : "No"} />
                  <AdminKeyValue label="Revenue" value={formatPKR(performance?.revenue ?? 0)} />
                  <AdminKeyValue label="Units sold" value={String(performance?.units ?? 0)} />
                  <AdminKeyValue label="Tag count" value={String(product.tags.length)} />
                </div>
              </AdminPanel>

              <AdminPanel
                title="Merchandising copy"
                description="Scrollable copy review without stretching the page."
              >
                <div className="space-y-3">
                  <div className="rounded-[16px] border border-border/60 px-3.5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Short description
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{product.shortDescription}</p>
                  </div>
                  <div className="rounded-[16px] border border-border/60 px-3.5 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Full description
                    </div>
                    <div className="mt-2 max-h-44 overflow-y-auto pr-1 text-sm leading-6 text-muted-foreground">
                      {product.description}
                    </div>
                  </div>
                </div>
              </AdminPanel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="mt-0">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <AdminPanel title="Specifications">
              {product.specs.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No structured specifications stored.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {product.specs.map((spec) => (
                    <AdminKeyValue key={spec.label} label={spec.label} value={spec.value} />
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Compatibility matrix">
              {product.compatibility.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No compatibility data is stored for this product.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {product.compatibility.map((entry, index) => (
                    <div
                      key={`${entry.brand}-${entry.model}-${index}`}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="text-sm font-semibold text-foreground">
                        {entry.brand} {entry.model}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Years: {entry.years.join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-0">
          <AdminPanel
            title="Recent review snapshots"
            description="Latest moderation-relevant reviews for this product."
          >
            {productReviews.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                This product has no review records in moderation yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {productReviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-foreground">{review.author}</div>
                      <AdminPill
                        tone={
                          review.moderationStatus === "APPROVED"
                            ? "success"
                            : review.moderationStatus === "FLAGGED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {review.moderationStatus}
                      </AdminPill>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-muted-foreground">
                      {review.title}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </TabsContent>
      </Tabs>

      <ProductModerationDialog
        open={editOpen}
        draft={draft}
        tagInput={tagInput}
        categories={state.managedCategories}
        sellerName={seller?.name}
        onOpenChange={(open) => {
          if (!open) {
            setDraft(product);
            setTagInput(product.tags.join(", "));
          }
          setEditOpen(open);
        }}
        onDraftChange={setDraft}
        onTagInputChange={setTagInput}
        onSave={handleSave}
        onFlag={handleFlag}
      />
    </div>
  );
}

function ChecklistChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
        active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function StatusPill({ status }: { status: ProductModerationStatus }) {
  const tone = status === "ACTIVE" ? "success" : status === "FLAGGED" ? "danger" : "warning";

  return <AdminPill tone={tone}>{status}</AdminPill>;
}

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
