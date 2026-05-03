"use client";

import { useEffect, useState } from "react";
import { ExternalLink, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { SellerEditDialog } from "@/components/admin/SellerEditDialog";
import { AdminCompactStat, AdminKeyValue, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import {
  getCommissionRowsForSeller,
  getCommissionSummary,
  getOrdersForSellerRecord,
  getProductsForSellerRecord,
  getSellerRevenue,
} from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { SellerRecord, SellerStatus } from "@/modules/marketplace/types";
import { formatPKR } from "@/data/marketplace";

export default function AdminSellerDetailPage({ slug }: { slug: string }) {
  const { currentUser, state } = useMarketplace();
  const seller = state.sellersDirectory.find((item) => item.slug === slug);

  return (
    <AdminScopeGate scope="sellers" currentUser={currentUser}>
      {!seller ? (
        <AdminEmptyState
          title="Seller not found"
          body="This seller record is not available in the current marketplace state."
          action={
            <Link
              href="/admin/sellers"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Back to sellers
            </Link>
          }
        />
      ) : (
        <SellerDetailContent slug={slug} />
      )}
    </AdminScopeGate>
  );
}

function SellerDetailContent({ slug }: { slug: string }) {
  const { currentUser, state, saveSellerRecord } = useMarketplace();
  const seller = state.sellersDirectory.find((item) => item.slug === slug)!;
  const orders = getOrdersForSellerRecord(state, slug);
  const products = getProductsForSellerRecord(state, slug);
  const revenue = getSellerRevenue(state, slug);
  const commissionSummary = getCommissionSummary(state, slug);
  const commissionRows = getCommissionRowsForSeller(state, slug);
  const pendingOrders = orders.filter((order) => !["DELIVERED", "CANCELED"].includes(order.status));
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<SellerRecord | null>(seller);
  const canConfigureCommercialTerms = currentUser?.role === "SUPER_ADMIN";

  useEffect(() => {
    setDraft(seller);
  }, [seller]);

  const handleSaveDraft = () => {
    if (!draft) {
      return;
    }

    try {
      saveSellerRecord(draft);
      toast.success("Seller record updated.");
      setEditOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update seller.");
    }
  };

  return (
    <div className="space-y-3">
      <AdminPageHeader
        eyebrow="Seller detail"
        title={seller.name}
        description="Compact seller view for governance, commercial terms, operational activity, and storefront quality."
        actions={
          <>
            <Link
              href="/admin/sellers"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-semibold"
            >
              Back to sellers
            </Link>
            <button
              type="button"
              onClick={() => {
                setDraft(seller);
                setEditOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <PencilLine className="h-4 w-4" />
              Edit seller
            </button>
          </>
        }
      />

      <AdminPanel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <OptimizedImage
              src={seller.logo}
              alt={seller.name}
              width={64}
              height={64}
              className="h-16 w-16 rounded-[20px] object-cover"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {seller.city}
              </div>
              <h1 className="mt-1 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {seller.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{seller.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill status={seller.status} />
                <AdminPill tone="info">{seller.tier}</AdminPill>
                <AdminPill tone={seller.verified ? "success" : "warning"}>
                  {seller.verified ? "Verified" : "Unverified"}
                </AdminPill>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/seller/${seller.slug}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-semibold"
            >
              <ExternalLink className="h-4 w-4" />
              Open storefront
            </Link>
          </div>
        </div>
      </AdminPanel>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCompactStat
          label="Revenue"
          value={formatPKR(revenue)}
          helper="Seller-attributed value"
          tone="success"
        />
        <AdminCompactStat
          label="Products"
          value={String(products.length)}
          helper="Linked catalog items"
        />
        <AdminCompactStat
          label="Open orders"
          value={String(pendingOrders.length)}
          helper="Still in fulfilment flow"
          tone="warning"
        />
        <AdminCompactStat
          label="Platform commission"
          value={formatPKR(commissionSummary.totalCommission)}
          helper="Marketplace share"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4">
          <AdminPanel
            title="Governance summary"
            description="Operational and commercial controls for this seller record."
          >
            <div className="divide-y divide-border/60">
              <AdminKeyValue label="Joined" value={seller.joined} />
              <AdminKeyValue label="Response time" value={seller.responseTime} />
              <AdminKeyValue
                label="Rating"
                value={`${seller.rating.toFixed(1)} / 5 from ${seller.reviewCount} reviews`}
              />
              <AdminKeyValue label="Commission rate" value={`${seller.commissionRate}%`} />
              <AdminKeyValue
                label="Payout hold"
                value={seller.payoutHold ? "Enabled" : "Not active"}
              />
              <AdminKeyValue
                label="Last active"
                value={
                  seller.lastActiveAt
                    ? new Date(seller.lastActiveAt).toLocaleString()
                    : "No recent session"
                }
              />
            </div>

            {seller.approvalNote ? (
              <div className="mt-4 rounded-[16px] border border-border/60 px-3.5 py-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Approval note:</span>{" "}
                {seller.approvalNote}
              </div>
            ) : null}

            {seller.flaggedReason ? (
              <div className="mt-3 rounded-[16px] border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                <span className="font-semibold">Flag reason:</span> {seller.flaggedReason}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel title="Policies and permissions">
            <div className="divide-y divide-border/60">
              <AdminKeyValue label="Returns policy" value={seller.policies.returns} />
              <AdminKeyValue label="Shipping policy" value={seller.policies.shipping} />
              <AdminKeyValue label="Warranty policy" value={seller.policies.warranty} />
              <AdminKeyValue
                label="Feature products"
                value={seller.permissions.canFeatureProducts ? "Enabled" : "Disabled"}
              />
              <AdminKeyValue
                label="Run campaigns"
                value={seller.permissions.canRunCampaigns ? "Enabled" : "Disabled"}
              />
              <AdminKeyValue label="Max products" value={String(seller.permissions.maxProducts)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ReviewChip label="Logo uploaded" active={Boolean(seller.logo)} />
              <ReviewChip label="Banner uploaded" active={Boolean(seller.banner)} />
              <ReviewChip
                label="Policy coverage"
                active={Boolean(
                  seller.policies.returns && seller.policies.shipping && seller.policies.warranty,
                )}
              />
              <ReviewChip
                label="Branding approved"
                active={seller.status === "ACTIVE" && seller.verified}
              />
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-4">
          <AdminPanel
            title="Operational activity"
            description="Latest marketplace orders routed to this seller."
          >
            {orders.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No orders routed to this seller yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {orders.slice(0, 6).map((order) => {
                  const sellerItems = order.items.filter((item) => item.sellerSlug === slug);
                  return (
                    <div key={order.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            {order.orderNumber}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()} · {sellerItems.length}{" "}
                            seller items
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-foreground">
                            {formatPKR(
                              sellerItems.reduce(
                                (sum, item) => sum + item.unitPrice * item.quantity,
                                0,
                              ),
                            )}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {order.status.replaceAll("_", " ")}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Commission ledger"
            description="Order-wise marketplace commission tracked for this seller."
          >
            {commissionRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No commission ledger rows yet for this seller.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {commissionRows.slice(0, 6).map((row) => (
                  <div
                    key={`${row.orderId}-${row.sellerSlug}`}
                    className="py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-foreground">{row.orderNumber}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.customerName} · {row.status.replaceAll("_", " ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-foreground">
                          {formatPKR(row.commissionAmount)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {row.commissionRate}% commission
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Catalog overview"
            description="Products currently live under this seller record."
          >
            {products.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active products linked to this seller.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {products.slice(0, 6).map((product) => (
                  <Link
                    key={product.id}
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:text-accent first:pt-0 last:pb-0"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border/60">
                      <OptimizedImage
                        src={product.images[0]}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-bold text-foreground">
                        {product.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {product.sku} · {product.stock} in stock
                      </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                      Open
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </AdminPanel>
        </div>
      </section>

      <SellerEditDialog
        open={editOpen}
        draft={draft}
        canConfigureCommercialTerms={canConfigureCommercialTerms}
        onOpenChange={(open) => {
          if (!open) {
            setDraft(seller);
          }
          setEditOpen(open);
        }}
        onDraftChange={setDraft}
        onSave={handleSaveDraft}
      />
    </div>
  );
}

function ReviewChip({ label, active }: { label: string; active: boolean }) {
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

function StatusPill({ status }: { status: SellerStatus }) {
  const tone =
    status === "ACTIVE"
      ? "success"
      : status === "FLAGGED" || status === "REJECTED"
        ? "danger"
        : status === "PENDING_APPROVAL"
          ? "warning"
          : "default";

  return <AdminPill tone={tone}>{status.replaceAll("_", " ")}</AdminPill>;
}
