"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, PencilLine, Search } from "lucide-react";
import { toast } from "sonner";
import { SellerEditDialog } from "@/components/admin/SellerEditDialog";
import { AdminCompactStat, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import {
  getCommissionSummary,
  getOrdersForSellerRecord,
  getProductsForSellerRecord,
  getSellerRevenue,
} from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { SellerRecord, SellerStatus } from "@/modules/marketplace/types";
import { formatPKR } from "@/data/marketplace";

const sellerStatuses: SellerStatus[] = [
  "ACTIVE",
  "PENDING_APPROVAL",
  "FLAGGED",
  "SUSPENDED",
  "REJECTED",
];

export default function AdminSellersPage() {
  const { currentUser, state, saveSellerRecord } = useMarketplace();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SellerStatus | "ALL">("ALL");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<SellerRecord | null>(null);
  const canConfigureCommercialTerms = currentUser?.role === "SUPER_ADMIN";

  const filteredSellers = useMemo(() => {
    return state.sellersDirectory
      .filter((seller) => {
        const searchable = `${seller.name} ${seller.city} ${seller.slug}`.toLowerCase();
        return (
          (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
          (statusFilter === "ALL" || seller.status === statusFilter)
        );
      })
      .sort((left, right) => {
        const leftWeight =
          left.status === "PENDING_APPROVAL" ? 0 : left.status === "FLAGGED" ? 1 : 2;
        const rightWeight =
          right.status === "PENDING_APPROVAL" ? 0 : right.status === "FLAGGED" ? 1 : 2;
        return leftWeight - rightWeight || left.name.localeCompare(right.name);
      });
  }, [query, state.sellersDirectory, statusFilter]);

  const sellerMetricsBySlug = useMemo(() => {
    return Object.fromEntries(
      filteredSellers.map((seller) => {
        const orders = getOrdersForSellerRecord(state, seller.slug);
        const products = getProductsForSellerRecord(state, seller.slug);
        const revenue = getSellerRevenue(state, seller.slug);
        const commission = getCommissionSummary(state, seller.slug).totalCommission;

        return [
          seller.slug,
          {
            orders: orders.length,
            products: products.length,
            revenue,
          },
        ];
      }),
    );
  }, [filteredSellers, state]);

  const editingSeller =
    state.sellersDirectory.find((seller) => seller.slug === editingSlug) ?? null;

  useEffect(() => {
    setDraft(editingSeller);
  }, [editingSeller]);

  const summary = {
    total: state.sellersDirectory.length,
    pending: state.sellersDirectory.filter((seller) => seller.status === "PENDING_APPROVAL").length,
    flagged: state.sellersDirectory.filter((seller) => seller.status === "FLAGGED").length,
    active: state.sellersDirectory.filter((seller) => seller.status === "ACTIVE").length,
    platformCommission: getCommissionSummary(state).totalCommission,
  };

  const handleOpenEditor = (seller: SellerRecord) => {
    setEditingSlug(seller.slug);
    setDraft({ ...seller });
  };

  const handleCloseEditor = () => {
    setEditingSlug(null);
    setDraft(null);
  };

  const handleSaveDraft = () => {
    if (!draft) {
      return;
    }

    try {
      saveSellerRecord(draft);
      toast.success("Seller record updated.");
      handleCloseEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update seller.");
    }
  };

  return (
    <AdminScopeGate
      scope="sellers"
      currentUser={currentUser}
      title="Seller operations restricted"
      description="Only admins with seller-management access can review store applications and update seller status."
    >
      <div className="space-y-3">
        <AdminPageHeader
          eyebrow="Seller management"
          title="Seller approvals and store governance"
          description="Review stores as cards, open editing in a popup, and avoid the old select-then-scroll pattern."
          actions={
            <Link
              href="/admin/reports"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-semibold"
            >
              Seller analytics
            </Link>
          }
        />

        <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat
            label="Seller accounts"
            value={String(summary.total)}
            helper="All store records"
          />
          <AdminCompactStat
            label="Pending"
            value={String(summary.pending)}
            helper="Awaiting review"
            tone="warning"
          />
          <AdminCompactStat
            label="Flagged"
            value={String(summary.flagged)}
            helper="Need intervention"
            tone="danger"
          />
          <AdminCompactStat
            label="Platform commission"
            value={formatPKR(summary.platformCommission)}
            helper="Marketplace share"
            tone="success"
          />
        </section>

        <AdminPanel
          title="Seller directory"
          description="Store cards with direct edit, detail, and storefront actions."
        >
          <div className="grid gap-3 lg:grid-cols-[1.1fr_220px]">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search seller name, city, or slug"
                className="h-11 w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SellerStatus | "ALL")}
              className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
            >
              <option value="ALL">All statuses</option>
              {sellerStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {filteredSellers.length === 0 ? (
            <div className="mt-4">
              <AdminEmptyState
                title="No matching sellers"
                body="Adjust the search query or status filter to see matching stores."
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredSellers.map((seller) => {
                const metrics = sellerMetricsBySlug[seller.slug] ?? {
                  orders: 0,
                  products: 0,
                  revenue: 0,
                };

                return (
                  <SellerAdminCard
                    key={seller.slug}
                    seller={seller}
                    orders={metrics.orders}
                    products={metrics.products}
                    revenue={metrics.revenue}
                    onEdit={() => handleOpenEditor(seller)}
                  />
                );
              })}
            </div>
          )}
        </AdminPanel>

        <SellerEditDialog
          open={!!editingSlug}
          draft={draft}
          canConfigureCommercialTerms={canConfigureCommercialTerms}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditor();
            }
          }}
          onDraftChange={setDraft}
          onSave={handleSaveDraft}
        />
      </div>
    </AdminScopeGate>
  );
}

function SellerAdminCard({
  seller,
  orders,
  products,
  revenue,
  onEdit,
}: {
  seller: SellerRecord;
  orders: number;
  products: number;
  revenue: number;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-card p-2.5 sm:p-3">
      <div className="relative overflow-hidden rounded-[16px] border border-border/60">
        <OptimizedImage
          src={seller.banner || seller.logo}
          alt={seller.name}
          width={320}
          height={180}
          className="aspect-video w-full object-cover"
        />
        <div className="absolute left-2 top-2">
          <StatusPill status={seller.status} />
        </div>
      </div>

      <div className="mt-2.5">
        <div className="line-clamp-2 text-[13px] font-black text-foreground sm:text-sm">
          {seller.name}
        </div>
        <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{seller.city}</div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <InlineChip tone={seller.verified ? "success" : "warning"}>
          {seller.verified ? "Verified" : "Unverified"}
        </InlineChip>
        <InlineChip>{seller.tier}</InlineChip>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px] sm:text-xs">
        <div className="rounded-[14px] border border-border/60 px-2.5 py-2">
          <div className="font-bold text-foreground">{orders}</div>
          <div className="mt-0.5 text-muted-foreground">Orders</div>
        </div>
        <div className="rounded-[14px] border border-border/60 px-2.5 py-2">
          <div className="font-bold text-foreground">{products}</div>
          <div className="mt-0.5 text-muted-foreground">Products</div>
        </div>
        <div className="rounded-[14px] border border-border/60 px-2.5 py-2">
          <div className="truncate font-bold text-foreground">{formatPKR(revenue)}</div>
          <div className="mt-0.5 text-muted-foreground">Revenue</div>
        </div>
      </div>

      {seller.flaggedReason ? (
        <div className="mt-2.5 rounded-[14px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive sm:text-xs">
          {seller.flaggedReason}
        </div>
      ) : null}

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground sm:text-sm"
        >
          <PencilLine className="h-4 w-4" />
          Edit
        </button>
        <Link
          href={`/admin/sellers/${seller.slug}`}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 px-3 text-xs font-semibold sm:text-sm"
        >
          Detail
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">{seller.slug}</span>
        <Link
          href={`/seller/${seller.slug}`}
          className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-accent"
        >
          Store
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
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const classes =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-warning/10 text-warning-foreground"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "border border-border/60 text-muted-foreground";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>
      {children}
    </span>
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
