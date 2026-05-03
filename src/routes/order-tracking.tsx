"use client";

import { useMemo, useState } from "react";
import { CreditCard, FileCheck, Package, Search, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { Breadcrumbs, PageLayout } from "@/components/marketplace/PageLayout";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/marketplace/StatusBadge";
import { PaymentProofForm } from "@/components/payments/PaymentProofForm";
import { formatPKR } from "@/data/marketplace";
import {
  getLatestProofForOrder,
  getOrderTimeline,
  getPaymentById,
  lookupOrderByReference,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

export default function OrderTrackingPage() {
  const { state, submitProofByLookup } = useMarketplace();
  const [lookupDraft, setLookupDraft] = useState({ orderNumber: "", contact: "" });
  const [submittedLookup, setSubmittedLookup] = useState<typeof lookupDraft | null>(null);

  const order = useMemo(
    () => (submittedLookup ? lookupOrderByReference(state, submittedLookup) : undefined),
    [state, submittedLookup],
  );
  const payment = order ? getPaymentById(state, order.paymentId) : undefined;
  const latestProof = order ? getLatestProofForOrder(state, order.id) : undefined;
  const timeline = order ? getOrderTimeline(state, order.id).slice(0, 6) : [];

  const handleLookup = () => {
    const nextLookup = {
      orderNumber: lookupDraft.orderNumber.trim().toUpperCase(),
      contact: lookupDraft.contact.trim(),
    };

    if (!nextLookup.orderNumber || !nextLookup.contact) {
      toast.error("Enter your order number and phone or email first.");
      return;
    }

    setSubmittedLookup(nextLookup);

    if (!lookupOrderByReference(state, nextLookup)) {
      toast.error("No order matched that order number and contact.");
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Order Tracking" }]} />
      </div>

      <section className="container mx-auto px-4 pb-10 pt-6 sm:pb-12 sm:pt-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-[28px] bg-card p-5 shadow-[var(--shadow-premium)] sm:p-6">
            <div className="max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Guest order tracking
              </div>
              <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-3xl">
                Track an order without logging in
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Use your SpareKart order number and the phone or email used at checkout to view
                delivery progress, upload payment proof, and unlock review access after delivery.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={lookupDraft.orderNumber}
                onChange={(event) =>
                  setLookupDraft((previous) => ({ ...previous, orderNumber: event.target.value }))
                }
                placeholder="Order number (e.g. SK-00012)"
                className="h-11 rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              />
              <input
                value={lookupDraft.contact}
                onChange={(event) =>
                  setLookupDraft((previous) => ({ ...previous, contact: event.target.value }))
                }
                placeholder="Phone or email"
                className="h-11 rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleLookup}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                <Search className="h-4 w-4" />
                Track order
              </button>
            </div>
          </div>

          {submittedLookup && !order ? (
            <div className="rounded-[26px] bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
              We could not match that order. Double-check the order number and the phone or email
              used during checkout.
            </div>
          ) : null}

          {order && payment ? (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="space-y-6">
                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        Order reference
                      </div>
                      <div className="mt-1 text-2xl font-black text-foreground">
                        {order.orderNumber}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Placed on {new Date(order.createdAt).toLocaleString("en-PK")}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <StatCard label="Items" value={String(order.items.length)} />
                    <StatCard
                      label="Sellers"
                      value={String(new Set(order.items.map((item) => item.sellerSlug)).size)}
                    />
                    <StatCard label="Total" value={formatPKR(order.totals.total)} />
                  </div>

                  <div className="mt-5 rounded-[20px] bg-surface p-4 shadow-[var(--shadow-soft)]">
                    <div className="text-sm font-bold text-foreground">Delivery address</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {order.shippingAddress.fullName} · {order.shippingAddress.phone}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {order.shippingAddress.addressLine}, {order.shippingAddress.city}{" "}
                      {order.shippingAddress.postalCode}, {order.shippingAddress.province}
                    </div>
                    {order.customerEmail ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {order.customerEmail}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="flex items-center gap-2 text-lg font-black text-foreground">
                    <Package className="h-5 w-5 text-accent" />
                    Order items
                  </div>
                  <div className="mt-4 space-y-3">
                    {order.items.map((item) => {
                      const product = state.managedProducts.find(
                        (entry) => entry.id === item.productId,
                      );
                      const seller = state.sellersDirectory.find(
                        (candidate) => candidate.slug === item.sellerSlug,
                      );
                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-[20px] bg-surface p-3 shadow-[var(--shadow-soft)]"
                        >
                          <OptimizedImage
                            src={item.image}
                            alt={item.title}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            {product ? (
                              <Link
                                to="/product/$slug"
                                params={{ slug: product.slug }}
                                className="line-clamp-2 text-sm font-semibold text-foreground hover:text-accent"
                              >
                                {item.title}
                              </Link>
                            ) : (
                              <div className="line-clamp-2 text-sm font-semibold text-foreground">
                                {item.title}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-muted-foreground">
                              Qty {item.quantity} · {seller?.name ?? item.sellerSlug}
                            </div>
                            {order.status === "DELIVERED" && product ? (
                              <div className="mt-2">
                                <Link
                                  to="/product/$slug"
                                  params={{ slug: product.slug }}
                                  className="text-xs font-semibold text-accent hover:underline"
                                >
                                  Leave product review
                                </Link>
                              </div>
                            ) : null}
                          </div>
                          <div className="text-sm font-bold tabular-nums">
                            {formatPKR(item.unitPrice * item.quantity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {order.status === "DELIVERED" ? (
                    <div className="mt-4 rounded-[20px] bg-accent-soft/70 px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                      Delivered orders can now be reviewed. You can leave a store review from the
                      seller page and product reviews from each product page.
                    </div>
                  ) : null}
                </div>
              </section>

              <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="flex items-center gap-2 text-lg font-black text-foreground">
                    <Truck className="h-5 w-5 text-accent" />
                    Tracking timeline
                  </div>
                  <div className="mt-4 space-y-3">
                    {timeline.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[20px] bg-surface p-3 shadow-[var(--shadow-soft)]"
                      >
                        <div className="text-sm font-semibold text-foreground">{entry.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{entry.detail}</div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString("en-PK")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="flex items-center gap-2 text-lg font-black text-foreground">
                    <CreditCard className="h-5 w-5 text-accent" />
                    Payment details
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <InfoRow
                      label="Method"
                      value={
                        payment.instructionsSnapshot?.label ?? payment.method.replaceAll("_", " ")
                      }
                    />
                    <InfoRow label="Amount due" value={formatPKR(payment.amountDue)} />
                    <InfoRow label="Current status" value={payment.status.replaceAll("_", " ")} />
                  </div>

                  {payment.instructionsSnapshot ? (
                    <div className="mt-4 rounded-[20px] bg-surface p-4 text-sm shadow-[var(--shadow-soft)]">
                      <div className="font-bold text-foreground">
                        {payment.instructionsSnapshot.label} instructions
                      </div>
                      <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                        <InfoRow
                          label="Account title"
                          value={payment.instructionsSnapshot.accountTitle}
                        />
                        {payment.instructionsSnapshot.bankName ? (
                          <InfoRow label="Bank" value={payment.instructionsSnapshot.bankName} />
                        ) : null}
                        {payment.instructionsSnapshot.accountNumber ? (
                          <InfoRow
                            label="Account no."
                            value={payment.instructionsSnapshot.accountNumber}
                            monospace
                          />
                        ) : null}
                        {payment.instructionsSnapshot.iban ? (
                          <InfoRow
                            label="IBAN"
                            value={payment.instructionsSnapshot.iban}
                            monospace
                          />
                        ) : null}
                        {payment.instructionsSnapshot.walletNumber ? (
                          <InfoRow
                            label="Wallet"
                            value={payment.instructionsSnapshot.walletNumber}
                            monospace
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {latestProof ? (
                    <div className="mt-4 rounded-[20px] bg-surface p-4 shadow-[var(--shadow-soft)]">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <FileCheck className="h-4 w-4 text-accent" />
                        Latest proof submission
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Ref {latestProof.transactionReference} · attempt {latestProof.attemptNumber}
                      </div>
                      {latestProof.adminNote ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Admin note: {latestProof.adminNote}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {payment.method !== "COD" &&
                  (payment.status === "REQUIRES_PROOF" || payment.status === "REJECTED") &&
                  submittedLookup ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[20px] bg-info/5 px-4 py-3 text-sm text-muted-foreground">
                        Upload a transfer screenshot to move this order into admin review.
                      </div>
                      <PaymentProofForm
                        maxSizeBytes={state.paymentSettings.proofMaxSizeBytes}
                        submitLabel={
                          payment.status === "REJECTED"
                            ? "Resubmit payment proof"
                            : "Submit payment proof"
                        }
                        onSubmit={(proof) => {
                          void (async () => {
                            try {
                              await submitProofByLookup(submittedLookup, proof);
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
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="flex items-center gap-2 text-lg font-black text-foreground">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                    Next actions
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <div>
                      Keep your order number saved for future tracking and review verification.
                    </div>
                    <div>
                      If the order uses manual payment, upload proof here whenever it is requested.
                    </div>
                    <div>
                      After delivery, use the linked product and store pages to leave verified
                      reviews.
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </PageLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-foreground">{value}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={monospace ? "font-mono text-foreground" : "font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}
