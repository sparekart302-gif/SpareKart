"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Store,
  TrendingUp,
  Users2,
  WalletCards,
} from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { AdminScopeGate } from "@/components/admin/AdminCommon";
import { AdminMiniBars, AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminUI";
import {
  getAdminDashboardSummary,
  getAdminNotifications,
  getAdminQuickActions,
  getCatalogGrowthSeries,
  getMonthlySalesSeries,
  getOrderStatusDistribution,
  getRecentAdminActivity,
} from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";

export default function AdminDashboardPage() {
  const { currentUser, state } = useMarketplace();
  const summary = getAdminDashboardSummary(state);
  const quickActions = getAdminQuickActions(state);
  const recentActivity = getRecentAdminActivity(state);
  const salesSeries = getMonthlySalesSeries(state);
  const catalogSeries = getCatalogGrowthSeries(state);
  const orderDistribution = getOrderStatusDistribution(state);
  const notifications = getAdminNotifications(state, currentUser?.id);
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const urgentCount =
    summary.pendingPayments +
    summary.pendingSellerApprovals +
    summary.lowStockCount +
    summary.flaggedReviews +
    summary.flaggedProducts;
  const operationsQueues = [
    {
      label: "Payment verification",
      value: summary.pendingPayments,
      helper: "Manual/COD review items",
      href: "/admin/payments",
      tone: "warning" as const,
      Icon: CreditCard,
    },
    {
      label: "Seller approvals",
      value: summary.pendingSellerApprovals,
      helper: "Stores waiting on governance",
      href: "/admin/sellers",
      tone: "info" as const,
      Icon: Store,
    },
    {
      label: "Low stock pressure",
      value: summary.lowStockCount,
      helper: "SKUs at replenishment risk",
      href: "/admin/inventory",
      tone: "danger" as const,
      Icon: AlertTriangle,
    },
    {
      label: "Moderation flags",
      value: summary.flaggedReviews + summary.flaggedProducts,
      helper: "Reviews/products needing action",
      href: "/admin/reviews",
      tone: "default" as const,
      Icon: ShieldCheck,
    },
  ];

  return (
    <AdminScopeGate scope="dashboard" currentUser={currentUser}>
      <div className="space-y-3">
        <AdminPageHeader
          eyebrow="Admin dashboard"
          title="Marketplace command center"
          description="Monitor revenue, operational queues, seller approvals, inventory pressure, and moderation from a tighter mobile-first control workspace."
          actions={
            <>
              <Link
                href="/admin/payments"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Verify payments
              </Link>
              <Link
                href="/admin/sellers"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-surface px-4 text-sm font-semibold shadow-[var(--shadow-soft)]"
              >
                Review sellers
              </Link>
            </>
          }
        />

        <section>
          <div className="overflow-hidden rounded-[18px] border border-primary/15 bg-primary text-primary-foreground shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:p-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Live marketplace
                </div>
                <div className="mt-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
                    Total captured revenue
                  </div>
                  <div className="mt-1 break-words text-[2rem] font-black leading-none tracking-[-0.06em] sm:text-[2.65rem]">
                    {formatCompactPKR(summary.totalRevenue)}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-white/62">
                    Full value: {formatPKR(summary.totalRevenue)}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <HeroMiniMetric
                    label="Commission"
                    value={formatCompactPKR(summary.platformCommissionRevenue)}
                  />
                  <HeroMiniMetric label="Urgent tasks" value={formatCompactNumber(urgentCount)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3">
                <CommandMetric
                  label="Orders"
                  value={formatCompactNumber(summary.totalOrders)}
                  helper="Marketplace total"
                  Icon={PackageCheck}
                />
                <CommandMetric
                  label="Active sellers"
                  value={formatCompactNumber(summary.activeSellers)}
                  helper="Approved stores"
                  Icon={BadgeCheck}
                  tone="success"
                />
                <CommandMetric
                  label="Live products"
                  value={formatCompactNumber(summary.activeProducts)}
                  helper="Visible listings"
                  Icon={Store}
                />
                <CommandMetric
                  label="Customers"
                  value={formatCompactNumber(summary.totalUsers)}
                  helper="Registered users"
                  Icon={Users2}
                />
                <CommandMetric
                  label="Coupons"
                  value={formatCompactNumber(summary.activeCoupons)}
                  helper="Active campaigns"
                  Icon={WalletCards}
                />
                <CommandMetric
                  label="Open queues"
                  value={formatCompactNumber(urgentCount)}
                  helper="Needs review"
                  Icon={AlertTriangle}
                  tone={urgentCount > 0 ? "warning" : "success"}
                />
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.06] p-3 sm:p-4">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                    Priority actions
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-white/78">
                    Daily queue shortcuts are now part of the main command center.
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
                  {quickActions.slice(0, 5).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group inline-flex h-10 items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/10 px-3 text-sm font-bold text-white transition-colors hover:bg-white/15 xl:min-w-[170px]"
                    >
                      <span className="min-w-0 truncate">{item.label}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/12 px-2 py-1 text-[11px] font-black">
                        {item.count}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationsQueues.map((item) => (
            <QueueCard key={item.label} {...item} />
          ))}
        </section>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <AdminPanel
            title="Sales performance"
            description="Six-month revenue and order movement."
            className="min-h-full"
          >
            <div className="grid gap-4 p-0 lg:grid-cols-2">
              <AdminMiniBars
                rows={salesSeries.map((entry) => ({
                  label: `${entry.label} revenue`,
                  value: entry.revenue,
                  tone: "success",
                }))}
                valueFormatter={(value) => formatPKR(value)}
              />
              <AdminMiniBars
                rows={salesSeries.map((entry) => ({
                  label: `${entry.label} orders`,
                  value: entry.orders,
                  tone: "warning",
                }))}
              />
            </div>
          </AdminPanel>

          <div className="grid gap-3">
            <AdminPanel title="Order status mix" description="Current order pipeline distribution.">
              {orderDistribution.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Order distribution will appear once marketplace orders are created.
                </div>
              ) : (
                <AdminMiniBars
                  rows={orderDistribution.map((entry) => ({
                    label: entry.status.replaceAll("_", " "),
                    value: entry.count,
                    tone:
                      entry.status === "DELIVERED"
                        ? "success"
                        : entry.status === "CANCELED"
                          ? "danger"
                          : entry.status === "AWAITING_PAYMENT_VERIFICATION"
                            ? "warning"
                            : "info",
                  }))}
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="Live signals"
              description="Key marketplace pressure points right now."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <SignalRow
                  label="Users"
                  value={formatCompactNumber(summary.totalUsers)}
                  Icon={Users2}
                />
                <SignalRow
                  label="Approvals"
                  value={formatCompactNumber(summary.pendingSellerApprovals)}
                  Icon={Store}
                />
                <SignalRow
                  label="Payments"
                  value={formatCompactNumber(summary.pendingPayments)}
                  Icon={CreditCard}
                />
                <SignalRow
                  label="Moderation"
                  value={formatCompactNumber(summary.flaggedReviews + summary.flaggedProducts)}
                  Icon={ShieldCheck}
                />
              </div>
            </AdminPanel>
          </div>
        </section>

        <section
          className={`grid gap-3 ${isSuperAdmin ? "xl:grid-cols-[0.95fr_1.05fr_0.9fr]" : "xl:grid-cols-2"}`}
        >
          <AdminPanel
            title="Catalog growth"
            description="New catalog supply and seller applications."
          >
            <AdminMiniBars
              rows={catalogSeries.map((entry) => ({
                label: `${entry.label} catalog`,
                value: entry.newProducts + entry.sellerApplications,
                tone: "info",
              }))}
            />
          </AdminPanel>

          {isSuperAdmin && (
            <AdminPanel
              title="Recent activity"
              description="Auditable admin and marketplace events."
            >
              <div className="divide-y divide-border/60">
                {recentActivity.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No audit activity yet.</div>
                ) : (
                  recentActivity.map((entry) => (
                    <div key={entry.id} className="px-0 py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminPill tone="info">{entry.action.replaceAll("_", " ")}</AdminPill>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-foreground">
                        {entry.actor?.name ?? "System action"}
                      </div>
                      {entry.note ? (
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{entry.note}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </AdminPanel>
          )}

          <AdminPanel
            title="Admin notifications"
            description="Updates routed to the active admin session."
          >
            <div className="divide-y divide-border/60">
              {notifications.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent admin notifications.</div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="px-0 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-background">
                        <Bell className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">
                          {notification.title}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </section>
      </div>
    </AdminScopeGate>
  );
}

function formatPKR(value: number) {
  return `Rs. ${value.toLocaleString("en-PK")}`;
}

function formatCompactPKR(value: number) {
  if (value >= 10000000) {
    return `Rs. ${(value / 10000000).toFixed(1)}Cr`;
  }

  if (value >= 100000) {
    return `Rs. ${(value / 100000).toFixed(1)}L`;
  }

  if (value >= 1000) {
    return `Rs. ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return formatPKR(value);
}

function formatCompactNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return String(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function HeroMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/12 bg-white/10 px-3 py-2.5">
      <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/58">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black tabular-nums text-white">{value}</div>
    </div>
  );
}

function CommandMetric({
  label,
  value,
  helper,
  Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  Icon: typeof Users2;
  tone?: "default" | "success" | "warning";
}) {
  const iconClass =
    tone === "success"
      ? "text-emerald-200"
      : tone === "warning"
        ? "text-amber-200"
        : "text-white/72";

  return (
    <div className="min-w-0 bg-primary px-3 py-3.5 sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/55">
            {label}
          </div>
          <div className="mt-1 truncate text-[1.35rem] font-black leading-none tracking-[-0.05em] tabular-nums text-white sm:text-[1.55rem]">
            {value}
          </div>
          <div className="mt-1 truncate text-[11px] font-semibold text-white/55">{helper}</div>
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      </div>
    </div>
  );
}

function QueueCard({
  label,
  value,
  helper,
  href,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  helper: string;
  href: string;
  tone: "default" | "warning" | "danger" | "info";
  Icon: typeof Users2;
}) {
  const toneClass =
    tone === "warning"
      ? "border-warning/25 bg-warning/5 text-warning-foreground"
      : tone === "danger"
        ? "border-destructive/25 bg-destructive/5 text-destructive"
        : tone === "info"
          ? "border-info/25 bg-info/5 text-info"
          : "border-border/70 bg-card text-foreground";

  return (
    <Link
      href={href}
      className={`group rounded-[16px] border p-3 transition-colors hover:border-accent/40 hover:bg-accent-soft/25 ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-black uppercase tracking-[0.15em] opacity-75">
            {label}
          </div>
          <div className="mt-1 text-2xl font-black leading-none tracking-[-0.05em] tabular-nums text-foreground">
            {formatCompactNumber(value)}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{helper}</div>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-current/15 bg-background/65">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function SignalRow({ label, value, Icon }: { label: string; value: string; Icon: typeof Users2 }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-background px-3 py-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border/60 bg-card">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-base font-black tabular-nums text-foreground">{value}</div>
      </div>
    </div>
  );
}
