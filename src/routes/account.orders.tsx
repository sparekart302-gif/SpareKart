"use client";

import {
  Bell,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  PackageCheck,
  ReceiptText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { AccessGuard } from "@/components/marketplace/AccessGuard";
import { SellerFulfillmentGrid } from "@/components/marketplace/OrderProgressUI";
import { OrderStatusBadge, ProofStatusBadge } from "@/components/marketplace/StatusBadge";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { PaymentProofForm } from "@/components/payments/PaymentProofForm";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { formatPKR } from "@/data/marketplace";
import { canUploadProof } from "@/modules/marketplace/permissions";
import {
  getNotificationsForUser,
  getOrdersForCustomer,
  getPaymentById,
  getProofAttemptsForOrder,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { MarketplaceOrder, PaymentProof, PaymentRecord } from "@/modules/marketplace/types";

type OrderStateTone = "danger" | "info" | "success" | "warning";

export default function AccountOrdersPage() {
  const { currentUser, state, submitProof } = useMarketplace();
  const orders = currentUser ? getOrdersForCustomer(state, currentUser.id) : [];
  const notifications = currentUser
    ? getNotificationsForUser(state, currentUser.id).slice(0, 3)
    : [];

  const awaitingActionCount = orders.filter((order) => {
    const payment = getPaymentById(state, order.paymentId);
    return payment?.status === "REQUIRES_PROOF" || payment?.status === "REJECTED";
  }).length;

  const activeOrdersCount = orders.filter((order) =>
    ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status),
  ).length;

  return (
    <PageLayout>
      <AccessGuard
        allow={["CUSTOMER"]}
        title="Customer Orders Only"
        description="Switch to a customer account to upload payment proof and track your own orders."
      >
        <div className="container mx-auto px-4">
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              { label: "My Account", to: "/account" },
              { label: "Orders" },
            ]}
          />
        </div>

        <section className="container mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Orders</h1>
              <p className="mt-1 text-sm text-muted-foreground">Track your orders and deliveries</p>
            </div>
            <Link
              href="/shop"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Continue shopping
            </Link>
          </div>

          {/* Stats row - minimal */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-[110px] rounded-lg bg-background px-3 py-2 border border-border/40">
              <div className="text-lg font-black text-foreground">{orders.length}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Orders
              </div>
            </div>
            <div className="flex-1 min-w-[110px] rounded-lg bg-background px-3 py-2 border border-border/40">
              <div className="text-lg font-black text-foreground">{awaitingActionCount}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Need action
              </div>
            </div>
            <div className="flex-1 min-w-[110px] rounded-lg bg-background px-3 py-2 border border-border/40">
              <div className="text-lg font-black text-foreground">{activeOrdersCount}</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                Active
              </div>
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-2.5 rounded-lg bg-accent/5 px-3 py-2 border border-accent/20"
                >
                  <Bell className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground">{notification.title}</div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                      {notification.message}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatOrderDate(notification.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {orders.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent/10 text-accent mb-3">
                <ReceiptText className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold">No orders yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your orders will appear here once placed
              </p>
              <Link
                href="/shop"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-0 border border-border/40 rounded-lg overflow-hidden bg-card">
              {orders.map((order) => {
                const payment = getPaymentById(state, order.paymentId)!;
                const proofs = getProofAttemptsForOrder(state, order.id);
                const latestProof = proofs[0];
                const canSubmit = currentUser ? canUploadProof(currentUser, order, payment) : false;
                const stateSummary = getOrderStateSummary(order, payment);
                // Remove timeline from order tracking - use only current status
                const totalQuantity = getItemCount(order);
                const primaryItem = order.items[0];
                const primarySeller = state.sellersDirectory.find(
                  (seller) => seller.slug === primaryItem.sellerSlug,
                );
                const sellerCount = new Set(order.items.map((item) => item.sellerSlug)).size;
                const remainingItemsCount = order.items.length - 1;

                return (
                  <details
                    key={order.id}
                    className="group border-b border-border/40 last:border-b-0"
                  >
                    {/* Summary row - Shopify-like */}
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-background/50 transition-colors [&::-webkit-details-marker]:hidden">
                      <div className="flex-1 grid grid-cols-4 gap-4 items-center text-sm">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-muted-foreground">
                            {order.orderNumber}
                          </div>
                          <div className="mt-0.5 text-xs text-foreground">
                            {formatOrderDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="hidden sm:block">
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="hidden md:block text-xs text-muted-foreground">
                          {totalQuantity} items
                        </div>
                        <div className="text-right">
                          <div className="font-black tabular-nums text-sm">
                            {formatPKR(order.totals.total)}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 shrink-0" />
                    </summary>

                    {/* Expanded details */}
                    <div className="border-t border-border/40 bg-background/40 px-4 py-4 space-y-3">
                      {/* Main product preview */}
                      <div className="flex gap-2.5">
                        <OptimizedImage
                          src={primaryItem.image}
                          alt={primaryItem.title}
                          width={48}
                          height={48}
                          className="h-11 w-11 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground line-clamp-1">
                            {primaryItem.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Qty {primaryItem.quantity} ·{" "}
                            {primarySeller?.name ?? primaryItem.sellerSlug}
                          </div>
                          {remainingItemsCount > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              +{remainingItemsCount} more from this order
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status and payment info row */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground font-semibold">Status</div>
                          <div className="mt-1">
                            <OrderStatusBadge status={order.status} />
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-semibold">Payment</div>
                          <div className="mt-1">
                            <MetaPill label={getPaymentLabel(payment)} />
                          </div>
                        </div>
                      </div>

                      {/* Current state message */}
                      <div
                        className={`flex items-start gap-2.5 rounded-lg p-3 ${
                          stateSummary.tone === "danger"
                            ? "bg-destructive/5"
                            : stateSummary.tone === "warning"
                              ? "bg-warning/5"
                              : stateSummary.tone === "success"
                                ? "bg-success/5"
                                : "bg-accent/5"
                        }`}
                      >
                        <stateSummary.Icon className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold">{stateSummary.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {stateSummary.detail}
                          </div>
                        </div>
                      </div>

                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">
                              {canSubmit
                                ? payment.status === "REJECTED"
                                  ? "Resubmit proof"
                                  : "Upload payment proof"
                                : "View order details"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {canSubmit
                                ? "Screenshot, reference, and payment details"
                                : payment.instructionsSnapshot
                                  ? "Items, payment instructions, and proof history"
                                  : "Items and order history"}
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="space-y-4 border-t border-border p-4 mt-3">
                          {canSubmit && (
                            <PaymentProofForm
                              maxSizeBytes={state.paymentSettings.proofMaxSizeBytes}
                              submitLabel={
                                payment.status === "REJECTED"
                                  ? "Resubmit payment proof"
                                  : "Submit payment proof"
                              }
                              onSubmit={(payload) => {
                                void (async () => {
                                  try {
                                    await submitProof(order.id, payload);
                                    toast.success("Payment proof submitted successfully.");
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : "Unable to submit payment proof.",
                                    );
                                  }
                                })();
                              }}
                            />
                          )}

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-sm font-bold">
                                <PackageCheck className="h-4 w-4 text-accent" />
                                Order items
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sellerCount} sellers
                              </div>
                            </div>
                            <div className="space-y-3">
                              {order.items.map((item) => {
                                const seller = state.sellersDirectory.find(
                                  (candidate) => candidate.slug === item.sellerSlug,
                                );
                                return (
                                  <div
                                    key={`${order.id}-${item.productId}`}
                                    className="flex gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]"
                                  >
                                    <OptimizedImage
                                      src={item.image}
                                      alt={item.title}
                                      width={56}
                                      height={56}
                                      className="h-14 w-14 rounded-xl object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="line-clamp-2 text-sm font-semibold text-foreground">
                                        {item.title}
                                      </div>
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        Qty {item.quantity} · {seller?.name ?? item.sellerSlug}
                                      </div>
                                    </div>
                                    <div className="text-sm font-bold tabular-nums">
                                      {formatPKR(item.unitPrice * item.quantity)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {payment.instructionsSnapshot && (
                            <div className="space-y-3">
                              <div className="text-sm font-bold">Payment instructions</div>
                              <div className="grid gap-2 text-sm">
                                <InstructionRow
                                  label="Method"
                                  value={payment.instructionsSnapshot.label}
                                />
                                <InstructionRow
                                  label="Account title"
                                  value={payment.instructionsSnapshot.accountTitle}
                                />
                                {payment.instructionsSnapshot.bankName && (
                                  <InstructionRow
                                    label="Bank"
                                    value={payment.instructionsSnapshot.bankName}
                                  />
                                )}
                                {payment.instructionsSnapshot.accountNumber && (
                                  <InstructionRow
                                    label="Account no."
                                    value={payment.instructionsSnapshot.accountNumber}
                                    monospace
                                  />
                                )}
                                {payment.instructionsSnapshot.iban && (
                                  <InstructionRow
                                    label="IBAN"
                                    value={payment.instructionsSnapshot.iban}
                                    monospace
                                  />
                                )}
                                {payment.instructionsSnapshot.walletNumber && (
                                  <InstructionRow
                                    label="Wallet no."
                                    value={payment.instructionsSnapshot.walletNumber}
                                    monospace
                                  />
                                )}
                                <InstructionRow
                                  label="Reference"
                                  value={payment.instructionsSnapshot.referenceHint}
                                />
                              </div>
                              <div className="rounded-2xl bg-card px-3 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                                {payment.instructionsSnapshot.note}
                              </div>
                            </div>
                          )}

                          {proofs.length > 0 && (
                            <div className="space-y-3">
                              <div className="text-sm font-bold">Proof history</div>
                              <div className="space-y-3">
                                {proofs.map((proof) => (
                                  <ProofAttemptCard key={proof.id} proof={proof} />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="text-sm font-bold">Seller progress</div>
                            <SellerFulfillmentGrid
                              state={state}
                              fulfillments={order.sellerFulfillments}
                            />
                          </div>
                        </div>
                      </details>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </AccessGuard>
    </PageLayout>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-card px-3 py-3 text-center shadow-[var(--shadow-soft)]">
      <div className="text-[1.1rem] font-black tabular-nums text-foreground sm:text-[1.25rem]">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-[var(--shadow-soft)]">
      {label}
    </div>
  );
}

function ProofAttemptCard({ proof }: { proof: PaymentProof }) {
  return (
    <div className="rounded-[18px] bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProofStatusBadge status={proof.status} />
        <span className="text-[11px] text-muted-foreground">
          Attempt {proof.attemptNumber} · {formatOrderDate(proof.createdAt)}
        </span>
      </div>

      <div className="mt-2.5 flex gap-3">
        <OptimizedImage
          src={proof.screenshotUrl}
          alt={`Payment proof ${proof.attemptNumber}`}
          width={56}
          height={56}
          className="h-14 w-14 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{proof.screenshotName}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Ref: {proof.transactionReference}
          </div>
          {proof.amountPaid !== undefined && (
            <div className="mt-1 text-xs text-muted-foreground">
              Amount: {formatPKR(proof.amountPaid)}
            </div>
          )}
        </div>
      </div>

      {proof.adminNote && <p className="mt-3 text-sm text-muted-foreground">{proof.adminNote}</p>}
    </div>
  );
}

function InstructionRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[16px] bg-card px-3 py-2.5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className={monospace ? "font-mono text-sm tabular-nums" : "text-sm font-semibold"}>
        {value}
      </span>
    </div>
  );
}

function HistoryIcon() {
  return (
    <div className="grid h-8 w-8 place-items-center rounded-xl bg-card shadow-[var(--shadow-soft)]">
      <Clock3 className="h-4 w-4 text-accent" />
    </div>
  );
}

function getItemCount(order: MarketplaceOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPaymentLabel(payment: PaymentRecord) {
  if (payment.method === "COD") {
    return "Cash on delivery";
  }

  return payment.instructionsSnapshot?.label ?? payment.method.replaceAll("_", " ");
}

function getOrderStateSummary(order: MarketplaceOrder, payment: PaymentRecord) {
  if (order.status === "CANCELED" || order.status === "RETURNED") {
    return {
      title: order.status === "RETURNED" ? "Order returned" : "Order canceled",
      detail:
        order.status === "RETURNED"
          ? "This order has been marked returned. Check the timeline for the latest finance update."
          : "This order or one of its seller fulfilments was canceled. Check the timeline for the latest note.",
      tone: "danger" as OrderStateTone,
      Icon: CircleAlert,
    };
  }

  if (order.status === "DELIVERED") {
    return {
      title: "Order delivered",
      detail:
        "Your order has been marked delivered. Review the timeline for the latest seller update.",
      tone: "success" as OrderStateTone,
      Icon: PackageCheck,
    };
  }

  if (order.status === "SHIPPED") {
    return {
      title: "Order shipped",
      detail: "Your seller has shipped at least one fulfillment for this order.",
      tone: "info" as OrderStateTone,
      Icon: PackageCheck,
    };
  }

  if (order.status === "PROCESSING") {
    return {
      title: "Seller is preparing your order",
      detail: "The store has started processing this order for dispatch.",
      tone: "info" as OrderStateTone,
      Icon: PackageCheck,
    };
  }

  if (payment.method === "COD" && payment.status === "PENDING") {
    return {
      title: "Cash on delivery order",
      detail:
        "Your order is moving through fulfilment. SpareKart will verify the collected cash after delivery before seller payout is released.",
      tone: "info" as OrderStateTone,
      Icon: CreditCard,
    };
  }

  if (payment.method === "COD" && payment.status === "UNDER_REVIEW") {
    return {
      title: "COD collection under review",
      detail: "SpareKart is reviewing the delivery cash receipt before closing the payment.",
      tone: "warning" as OrderStateTone,
      Icon: Clock3,
    };
  }

  if (payment.method === "COD" && payment.status === "REJECTED") {
    return {
      title: "COD settlement needs review",
      detail:
        "The delivery cash receipt needs another admin check. Your order history remains available while SpareKart resolves it.",
      tone: "danger" as OrderStateTone,
      Icon: CircleAlert,
    };
  }

  if (payment.method === "COD" && payment.status === "PAID") {
    return {
      title: "COD payment verified",
      detail: "SpareKart has verified the collected cash for this delivered order.",
      tone: "success" as OrderStateTone,
      Icon: CreditCard,
    };
  }

  if (payment.status === "REQUIRES_PROOF") {
    return {
      title: "Payment proof required",
      detail: "Upload a screenshot to send this order for admin verification.",
      tone: "warning" as OrderStateTone,
      Icon: Upload,
    };
  }

  if (payment.status === "REJECTED") {
    return {
      title: "Proof needs resubmission",
      detail: "The last proof was rejected. Submit a new proof to continue.",
      tone: "danger" as OrderStateTone,
      Icon: CircleAlert,
    };
  }

  if (payment.status === "FAILED" || payment.status === "REFUNDED") {
    return {
      title: payment.status === "REFUNDED" ? "Payment refunded" : "Payment failed",
      detail:
        payment.status === "REFUNDED"
          ? "This order payment was refunded. Check the timeline for the latest financial note."
          : "This payment failed and the order cannot continue until the issue is resolved.",
      tone: "danger" as OrderStateTone,
      Icon: CircleAlert,
    };
  }

  if (payment.status === "PROOF_SUBMITTED") {
    return {
      title: "Payment under review",
      detail: "Admin is reviewing your proof before confirming the order.",
      tone: "info" as OrderStateTone,
      Icon: Clock3,
    };
  }

  if (payment.status === "PAID" || order.status === "CONFIRMED") {
    return {
      title: "Payment approved",
      detail: "Your order is confirmed and ready for seller processing.",
      tone: "success" as OrderStateTone,
      Icon: PackageCheck,
    };
  }

  return {
    title: "Order in progress",
    detail: "We’re tracking the next update for this order.",
    tone: "info" as OrderStateTone,
    Icon: Clock3,
  };
}

function getStateSummaryClasses(tone: OrderStateTone) {
  const toneMap: Record<OrderStateTone, string> = {
    danger: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
  };

  return toneMap[tone];
}
