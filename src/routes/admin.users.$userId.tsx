"use client";

import { Mail, Phone, ShieldCheck, ShoppingBag, Star, Store } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { AdminCompactStat, AdminKeyValue, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import {
  getScopeLabel,
  getUserOrderHistory,
  getUserPaymentHistory,
  getUserReviewHistory,
} from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import { formatPKR } from "@/data/marketplace";
import { formatRating } from "@/lib/format-rating";

export default function AdminUserDetailPage({ userId }: { userId: string }) {
  const { currentUser, state } = useMarketplace();
  const user = state.users.find((item) => item.id === userId);

  return (
    <AdminScopeGate
      scope="users"
      currentUser={currentUser}
      title="User detail unavailable"
      description="This user workspace is limited to admins who can manage user accounts."
    >
      {!user ? (
        <AdminEmptyState
          title="User not found"
          body="The requested user could not be found in the current marketplace state."
          action={
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Back to users
            </Link>
          }
        />
      ) : (
        <UserDetailContent userId={userId} />
      )}
    </AdminScopeGate>
  );
}

function UserDetailContent({ userId }: { userId: string }) {
  const { state } = useMarketplace();
  const user = state.users.find((item) => item.id === userId)!;
  const orders = getUserOrderHistory(state, user.id);
  const payments = getUserPaymentHistory(state, user.id);
  const reviews = getUserReviewHistory(state, user.name);
  const account = state.customerAccounts[user.id];
  const manualPayments = payments.filter((payment) => payment.method !== "COD");
  const totalSpend = orders.reduce((sum, order) => sum + order.totals.total, 0);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="User detail"
        title={user.name}
        description="Account profile, purchase behavior, payment history, and review footprint in one admin view."
        actions={
          <>
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
            >
              Back to users
            </Link>
            <Link
              href={`/admin/users?focus=${user.id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Open editor
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCompactStat
          label="Orders"
          value={String(orders.length)}
          helper="Marketplace orders placed"
        />
        <AdminCompactStat
          label="Spend"
          value={formatPKR(totalSpend)}
          helper="Total order value"
          tone="success"
        />
        <AdminCompactStat
          label="Manual payments"
          value={String(manualPayments.length)}
          helper="Proof-based orders"
          tone="warning"
        />
        <AdminCompactStat
          label="Reviews"
          value={String(reviews.product.length + reviews.store.length)}
          helper="Product and store reviews"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <AdminPanel title="Account profile">
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight text-foreground">{user.name}</div>
              <div className="flex flex-wrap gap-2">
                <AdminPill
                  tone={
                    user.role.includes("ADMIN")
                      ? "info"
                      : user.role === "SELLER"
                        ? "warning"
                        : "default"
                  }
                >
                  {user.role.replaceAll("_", " ")}
                </AdminPill>
                <AdminPill
                  tone={
                    user.status === "ACTIVE"
                      ? "success"
                      : user.status === "SUSPENDED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {user.status}
                </AdminPill>
              </div>
            </div>

            <div className="mt-5 space-y-1">
              <AdminKeyValue
                label="Email"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accent" />
                    {user.email}
                  </span>
                }
              />
              <AdminKeyValue
                label="Phone"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-accent" />
                    {user.phone}
                  </span>
                }
              />
              <AdminKeyValue label="Joined" value={formatDate(user.createdAt)} />
              <AdminKeyValue
                label="Last login"
                value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "No session activity"}
              />
              {user.adminTitle ? (
                <AdminKeyValue label="Admin title" value={user.adminTitle} />
              ) : null}
              {user.sellerSlug ? (
                <AdminKeyValue
                  label="Seller store"
                  value={
                    <Link
                      href={`/admin/sellers/${user.sellerSlug}`}
                      className="text-accent hover:underline"
                    >
                      {user.sellerSlug}
                    </Link>
                  }
                />
              ) : null}
            </div>
          </AdminPanel>

          {user.adminScopes?.length ? (
            <AdminPanel title="Admin scopes">
              <div className="flex flex-wrap gap-2">
                {user.adminScopes.map((scope) => (
                  <AdminPill key={scope} tone="info">
                    {getScopeLabel(scope)}
                  </AdminPill>
                ))}
              </div>
            </AdminPanel>
          ) : null}

          {account ? (
            <AdminPanel title="Customer profile">
              <div className="space-y-1">
                <AdminKeyValue label="City" value={account.city} />
                <AdminKeyValue
                  label="Saved vehicles"
                  value={String(account.savedVehicles.length)}
                />
                <AdminKeyValue label="Addresses" value={String(account.addresses.length)} />
                <AdminKeyValue
                  label="Wishlist items"
                  value={String(account.wishlistProductIds.length)}
                />
              </div>
            </AdminPanel>
          ) : null}
        </div>

        <div className="space-y-4">
          <AdminPanel
            title="Order history"
            description="Most recent order activity for this account."
          >
            {orders.length === 0 ? (
              <AdminEmptyState
                title="No orders yet"
                body="This user has not placed any marketplace orders yet."
              />
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[22px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-foreground">{order.orderNumber}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)} · {order.items.length} items
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-foreground">
                          {formatPKR(order.totals.total)}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          {order.status.replaceAll("_", " ")}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.items.slice(0, 3).map((item) => (
                        <span
                          key={`${order.id}-${item.productId}`}
                          className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
                        >
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <section className="grid gap-4 lg:grid-cols-2">
            <AdminPanel title="Payment history">
              {payments.length === 0 ? (
                <div className="text-sm text-muted-foreground">No payments recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {payments.slice(0, 6).map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[20px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            {payment.method.replaceAll("_", " ")}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(payment.updatedAt)}
                          </div>
                        </div>
                        <AdminPill
                          tone={
                            payment.status === "PAID"
                              ? "success"
                              : payment.status === "REJECTED"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {payment.status.replaceAll("_", " ")}
                        </AdminPill>
                      </div>
                      <div className="mt-3 text-sm font-semibold text-foreground">
                        {formatPKR(payment.amountDue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel title="Review footprint">
              <div className="grid gap-3 sm:grid-cols-2">
                <ReviewBox
                  label="Product reviews"
                  value={String(reviews.product.length)}
                  Icon={ShoppingBag}
                />
                <ReviewBox
                  label="Store reviews"
                  value={String(reviews.store.length)}
                  Icon={Store}
                />
                <ReviewBox
                  label="Verified reviews"
                  value={String(reviews.product.filter((review) => review.verified).length)}
                  Icon={ShieldCheck}
                />
                <ReviewBox
                  label="Avg. rating"
                  value={formatRating(averageRating([...reviews.product, ...reviews.store]))}
                  Icon={Star}
                />
              </div>
            </AdminPanel>
          </section>
        </div>
      </section>
    </div>
  );
}

function averageRating(reviews: { rating: number }[]) {
  return reviews.reduce((sum, review) => sum + review.rating, 0) / (reviews.length || 1);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function ReviewBox({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof ShoppingBag;
}) {
  return (
    <div className="rounded-[20px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-[var(--shadow-soft)]">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="mt-3 text-xl font-black text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
