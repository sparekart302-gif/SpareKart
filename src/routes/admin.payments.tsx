"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CODPaymentVerificationPanel } from "@/components/admin/CODPaymentVerificationPanel";
import { AdminCompactStat, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { OrderTimeline, SellerFulfillmentGrid } from "@/components/marketplace/OrderProgressUI";
import { PaymentStatusBadge } from "@/components/marketplace/StatusBadge";
import { Link } from "@/components/navigation/Link";
import { formatPKR } from "@/data/marketplace";
import { cn } from "@/lib/utils";
import { getCommissionRowsForOrder } from "@/modules/marketplace/admin-selectors";
import { getOrderTimeline } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { PaymentMethod, PaymentProofStatus } from "@/modules/marketplace/types";

const reviewStatusOptions: Array<PaymentProofStatus | "ALL"> = [
  "ALL",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];
const paymentMethodOptions: Array<Exclude<PaymentMethod, "COD"> | "ALL"> = [
  "ALL",
  "BANK_TRANSFER",
  "EASYPAISA",
  "JAZZCASH",
];

type DeskView = "MANUAL" | "COD";
type ManualDetailTab = "REVIEW" | "ORDER" | "ACTIVITY";

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();
  const { currentUser, state, approveProof, rejectProof } = useMarketplace();
  const [activeDesk, setActiveDesk] = useState<DeskView>("MANUAL");
  const [detailTab, setDetailTab] = useState<ManualDetailTab>("REVIEW");
  const [proofStatusFilter, setProofStatusFilter] = useState<PaymentProofStatus | "ALL">(
    "SUBMITTED",
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selectedProofId, setSelectedProofId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const sellerFilter = searchParams.get("seller");
  const deskFilter = searchParams.get("desk");
  const sellerRecord = sellerFilter
    ? state.sellersDirectory.find((seller) => seller.slug === sellerFilter)
    : undefined;

  const scopedOrders = useMemo(
    () =>
      sellerFilter
        ? state.orders.filter((order) =>
            order.items.some((item) => item.sellerSlug === sellerFilter),
          )
        : state.orders,
    [sellerFilter, state.orders],
  );

  const manualProofs = useMemo(
    () =>
      state.paymentProofs.filter((proof) => {
        if (proof.paymentMethod === "COD") {
          return false;
        }

        if (!sellerFilter) {
          return true;
        }

        const order = scopedOrders.find((item) => item.id === proof.orderId);
        return Boolean(order);
      }),
    [scopedOrders, sellerFilter, state.paymentProofs],
  );

  const codScopedOrders = useMemo(
    () =>
      scopedOrders.filter((order) => {
        const payment = state.payments.find((item) => item.id === order.paymentId);
        return payment?.method === "COD";
      }),
    [scopedOrders, state.payments],
  );

  const filteredProofs = useMemo(() => {
    return manualProofs
      .filter((proof) => {
        const order = scopedOrders.find((item) => item.id === proof.orderId);
        const payment = state.payments.find((item) => item.id === proof.paymentId);
        const customer = order
          ? state.users.find((user) => user.id === order.customerUserId)
          : undefined;
        const searchable =
          `${order?.orderNumber ?? ""} ${customer?.name ?? ""} ${customer?.email ?? ""} ${proof.transactionReference}`.toLowerCase();

        return (
          (proofStatusFilter === "ALL" || proof.status === proofStatusFilter) &&
          (paymentMethodFilter === "ALL" || payment?.method === paymentMethodFilter) &&
          (!query.trim() || searchable.includes(query.trim().toLowerCase()))
        );
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [
    manualProofs,
    paymentMethodFilter,
    proofStatusFilter,
    query,
    scopedOrders,
    state.payments,
    state.users,
  ]);

  useEffect(() => {
    if (deskFilter === "COD" || deskFilter === "MANUAL") {
      setActiveDesk(deskFilter);
    }
  }, [deskFilter]);

  useEffect(() => {
    if (!filteredProofs.length) {
      setSelectedProofId("");
      return;
    }

    if (!filteredProofs.some((proof) => proof.id === selectedProofId)) {
      setSelectedProofId(filteredProofs[0].id);
    }
  }, [filteredProofs, selectedProofId]);

  const selectedProof = filteredProofs.find((proof) => proof.id === selectedProofId);
  const selectedOrder = selectedProof
    ? state.orders.find((order) => order.id === selectedProof.orderId)
    : undefined;
  const selectedPayment = selectedProof
    ? state.payments.find((payment) => payment.id === selectedProof.paymentId)
    : undefined;
  const selectedCustomer = selectedOrder
    ? state.users.find((user) => user.id === selectedOrder.customerUserId)
    : undefined;
  const selectedCommissionRows = selectedOrder
    ? getCommissionRowsForOrder(state, selectedOrder.id)
    : [];
  const proofAttempts = selectedOrder
    ? state.paymentProofs
        .filter((proof) => proof.orderId === selectedOrder.id)
        .sort((left, right) => right.attemptNumber - left.attemptNumber)
    : [];
  const auditTrail = selectedOrder
    ? state.auditTrail
        .filter(
          (entry) => entry.orderId === selectedOrder.id || entry.paymentId === selectedPayment?.id,
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 8)
    : [];
  const orderTimeline = selectedOrder ? getOrderTimeline(state, selectedOrder.id).slice(0, 8) : [];

  useEffect(() => {
    setAdminNote(selectedProof?.adminNote ?? "");
    setDetailTab("REVIEW");
  }, [selectedProof?.adminNote, selectedProofId]);

  const pendingCount = manualProofs.filter((proof) => proof.status === "SUBMITTED").length;
  const approvedCount = manualProofs.filter((proof) => proof.status === "APPROVED").length;
  const rejectedCount = manualProofs.filter((proof) => proof.status === "REJECTED").length;
  const codAwaitingReceiptCount = state.orders.filter((order) => {
    const payment = state.payments.find((item) => item.id === order.paymentId);
    return (
      payment?.method === "COD" && payment.status === "PENDING" && order.status === "DELIVERED"
    );
  }).length;
  const codUnderReviewCount = state.payments.filter(
    (payment) => payment.method === "COD" && payment.status === "UNDER_REVIEW",
  ).length;
  const verifiedCount = state.payments.filter((payment) => payment.status === "PAID").length;

  return (
    <AdminScopeGate scope="payments" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Payments"
          title="Payment verification desk"
          description="Review bank transfers and COD settlements from one compact operations workspace, with less scrolling and faster decisions."
          actions={
            <div className="flex flex-wrap gap-2">
              {sellerRecord ? (
                <>
                  <div className="inline-flex items-center rounded-full border border-border/60 bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Filtered to {sellerRecord.name}
                  </div>
                  <Link
                    href="/admin/payments"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 bg-card px-3.5 text-sm font-semibold"
                  >
                    Clear filter
                  </Link>
                </>
              ) : null}
              <div className="inline-flex rounded-2xl border border-border/60 bg-surface p-1">
                <DeskToggle
                  label="Manual proofs"
                  active={activeDesk === "MANUAL"}
                  onClick={() => setActiveDesk("MANUAL")}
                />
                <DeskToggle
                  label="COD settlements"
                  active={activeDesk === "COD"}
                  onClick={() => setActiveDesk("COD")}
                />
              </div>
            </div>
          }
        />

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat
            label="Manual pending"
            value={String(pendingCount)}
            helper="Proofs waiting for review"
            tone="warning"
          />
          <AdminCompactStat
            label="COD review"
            value={String(codAwaitingReceiptCount + codUnderReviewCount)}
            helper="Receipt capture and review desk"
          />
          <AdminCompactStat
            label="Verified payments"
            value={String(verifiedCount)}
            helper="Released into marketplace flow"
            tone="success"
          />
          <AdminCompactStat
            label="Rejected"
            value={String(rejectedCount)}
            helper="Customers need to resubmit"
            tone="danger"
          />
        </section>

        {activeDesk === "COD" ? (
          <CODPaymentVerificationPanel
            orders={scopedOrders}
            paymentsMap={new Map(state.payments.map((payment) => [payment.id, payment]))}
            embedded
          />
        ) : (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <AdminPanel
              title="Manual verification queue"
              description="Slim review rows, fast filters, and no oversized queue cards."
              className="overflow-hidden"
            >
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.46fr)_minmax(0,0.46fr)]">
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search order, customer, or reference"
                    className="h-10 w-full bg-transparent text-sm focus:outline-none"
                  />
                </div>
                <select
                  value={proofStatusFilter}
                  onChange={(event) =>
                    setProofStatusFilter(event.target.value as PaymentProofStatus | "ALL")
                  }
                  className="h-10 rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                >
                  {reviewStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "ALL" ? "All proof states" : status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={paymentMethodFilter}
                  onChange={(event) =>
                    setPaymentMethodFilter(event.target.value as PaymentMethod | "ALL")
                  }
                  className="h-10 rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                >
                  {paymentMethodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method === "ALL" ? "All methods" : method.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <InlineStat label="Pending" value={String(pendingCount)} tone="warning" />
                <InlineStat label="Approved" value={String(approvedCount)} tone="success" />
                <InlineStat label="Rejected" value={String(rejectedCount)} tone="danger" />
              </div>

              <div className="mt-3 -mx-3 sm:-mx-4">
                {filteredProofs.length === 0 ? (
                  <div className="px-3 py-1 sm:px-4">
                    <AdminEmptyState
                      title="No proofs found"
                      body="No manual payment proofs match the current search or filters."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredProofs.map((proof) => {
                      const order = state.orders.find((item) => item.id === proof.orderId);
                      const payment = state.payments.find((item) => item.id === proof.paymentId);
                      const customer = order
                        ? state.users.find((user) => user.id === order.customerUserId)
                        : undefined;

                      return (
                        <button
                          key={proof.id}
                          type="button"
                          onClick={() => setSelectedProofId(proof.id)}
                          className={cn(
                            "w-full px-3 py-3.5 text-left transition-colors sm:px-4",
                            selectedProofId === proof.id ? "bg-accent-soft/60" : "hover:bg-surface",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {order?.orderNumber ?? "Unknown order"}
                                </div>
                                <ProofTone status={proof.status} />
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                <span>{customer?.name ?? "Unknown customer"}</span>
                                <span>{payment?.method.replaceAll("_", " ")}</span>
                                <span>{proof.transactionReference}</span>
                              </div>
                            </div>
                            {payment ? <PaymentTone status={payment.status} /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </AdminPanel>

            <AdminPanel
              title="Proof detail"
              description="Keep the review, order context, and activity inside one focused panel."
              className="h-fit"
            >
              {!selectedProof || !selectedOrder || !selectedPayment || !selectedCustomer ? (
                <AdminEmptyState
                  title="Select a proof"
                  body="Choose a row from the queue to inspect its screenshot, notes, and order context."
                />
              ) : (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black tracking-tight text-foreground">
                          {selectedOrder.orderNumber}
                        </div>
                        <ProofTone status={selectedProof.status} />
                        <PaymentStatusBadge status={selectedPayment.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{selectedCustomer.name}</span>
                        <span>{selectedCustomer.email}</span>
                        <span>{selectedPayment.method.replaceAll("_", " ")}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        downloadInvoice(selectedOrder, selectedPayment, selectedCustomer)
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface px-3.5 text-sm font-semibold"
                    >
                      <Download className="h-4 w-4" />
                      Invoice
                    </button>
                  </div>

                  <div className="grid gap-3 border-b border-border/60 py-3 sm:grid-cols-2 xl:grid-cols-4">
                    <CompactMeta
                      label="Order total"
                      value={formatPKR(selectedOrder.totals.total)}
                    />
                    <CompactMeta
                      label="Amount paid"
                      value={
                        selectedProof.amountPaid
                          ? formatPKR(selectedProof.amountPaid)
                          : "Not provided"
                      }
                    />
                    <CompactMeta label="Attempts" value={String(proofAttempts.length)} />
                    <CompactMeta
                      label="Commission"
                      value={formatPKR(
                        selectedCommissionRows.reduce((sum, row) => sum + row.commissionAmount, 0),
                      )}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["REVIEW", "ORDER", "ACTIVITY"] as ManualDetailTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDetailTab(tab)}
                        className={cn(
                          "inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                          detailTab === tab
                            ? "bg-foreground text-background"
                            : "bg-surface text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tab === "REVIEW"
                          ? "Review"
                          : tab === "ORDER"
                            ? "Order context"
                            : "Activity"}
                      </button>
                    ))}
                  </div>

                  {detailTab === "REVIEW" ? (
                    <div className="mt-3 grid gap-3 xl:grid-cols-[15rem_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-[18px] border border-border/60 bg-surface">
                          <div className="relative aspect-square">
                            <OptimizedImage
                              src={selectedProof.screenshotUrl}
                              alt={`${selectedOrder.orderNumber} payment proof`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1280px) 100vw, 20rem"
                            />
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-[18px] border border-border/60 bg-surface">
                          <div className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Attempts
                          </div>
                          <div className="divide-y divide-border/60">
                            {proofAttempts.map((attempt) => (
                              <div key={attempt.id} className="px-3 py-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-sm font-semibold text-foreground">
                                    {attempt.transactionReference}
                                  </div>
                                  <ProofTone status={attempt.status} />
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  Attempt {attempt.attemptNumber}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid gap-3 rounded-[18px] border border-border/60 bg-surface p-3 sm:grid-cols-2">
                          <CompactMeta
                            label="Reference"
                            value={selectedProof.transactionReference}
                          />
                          <CompactMeta
                            label="Method"
                            value={selectedPayment.method.replaceAll("_", " ")}
                          />
                          <CompactMeta
                            label="Submitted"
                            value={new Date(selectedProof.createdAt).toLocaleString()}
                          />
                          <CompactMeta
                            label="Customer note"
                            value={
                              selectedProof.note?.trim() ? selectedProof.note : "No note added"
                            }
                          />
                        </div>

                        <CompactField label="Admin note">
                          <textarea
                            value={adminNote}
                            onChange={(event) => setAdminNote(event.target.value)}
                            className="min-h-24 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:outline-none"
                          />
                        </CompactField>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/60 bg-surface p-3">
                          <div className="text-xs text-muted-foreground">
                            Approving the proof confirms the order and hands fulfilment back to the
                            seller.
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  approveProof({ proofId: selectedProof.id, adminNote });
                                  toast.success("Payment proof approved.");
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to approve proof.",
                                  );
                                }
                              }}
                              disabled={selectedProof.status !== "SUBMITTED"}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-success px-4 text-sm font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  rejectProof({ proofId: selectedProof.id, adminNote });
                                  toast.success("Payment proof rejected.");
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to reject proof.",
                                  );
                                }
                              }}
                              disabled={selectedProof.status !== "SUBMITTED"}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "ORDER" ? (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                        <div className="rounded-[18px] border border-border/60 bg-surface p-3">
                          <div className="text-sm font-semibold text-foreground">
                            Seller handoff
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Sellers only take over after the manual proof is approved.
                          </div>
                          <div className="mt-3">
                            <SellerFulfillmentGrid
                              state={state}
                              fulfillments={selectedOrder.sellerFulfillments}
                            />
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-border/60 bg-surface p-3">
                          <div className="text-sm font-semibold text-foreground">
                            Commission split
                          </div>
                          <div className="mt-3 divide-y divide-border/60">
                            {selectedCommissionRows.map((row) => (
                              <div
                                key={`${row.orderId}-${row.sellerSlug}`}
                                className="py-3 first:pt-0 last:pb-0"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground">
                                      {row.sellerName}
                                    </div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                      {formatPKR(row.grossAmount)} gross
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
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-border/60 bg-surface p-3">
                        <div className="text-sm font-semibold text-foreground">Order timeline</div>
                        <div className="mt-3">
                          <OrderTimeline items={orderTimeline} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "ACTIVITY" ? (
                    <div className="mt-3 overflow-hidden rounded-[18px] border border-border/60 bg-surface">
                      {auditTrail.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-muted-foreground">
                          No audit activity recorded yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {auditTrail.map((entry) => {
                            const actor = state.users.find((user) => user.id === entry.actorUserId);
                            return (
                              <div key={entry.id} className="px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground">
                                      {entry.action.replaceAll("_", " ")}
                                    </div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                      {actor?.name ?? "System"} ·{" "}
                                      {new Date(entry.createdAt).toLocaleString()}
                                    </div>
                                    {entry.note ? (
                                      <div className="mt-2 text-sm text-muted-foreground">
                                        {entry.note}
                                      </div>
                                    ) : null}
                                  </div>
                                  <AdminPill>{entry.actorRole}</AdminPill>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </AdminPanel>
          </section>
        )}
      </div>
    </AdminScopeGate>
  );
}

function DeskToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-xl px-3 text-sm font-semibold transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function InlineStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneClasses =
    tone === "warning"
      ? "bg-warning/10 text-warning-foreground"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-surface text-foreground";

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", toneClasses)}>{value}</span>
    </div>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function CompactMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ProofTone({ status }: { status: PaymentProofStatus }) {
  const tone = status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";
  return <AdminPill tone={tone}>{status}</AdminPill>;
}

function PaymentTone({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "success"
      : status === "REJECTED"
        ? "danger"
        : status === "UNDER_REVIEW" || status === "PROOF_SUBMITTED"
          ? "warning"
          : "default";

  return <AdminPill tone={tone}>{status.replaceAll("_", " ")}</AdminPill>;
}

function downloadInvoice(
  order: {
    orderNumber: string;
    status: string;
    totals: { subtotal: number; shipping: number; total: number };
    items: { title: string; quantity: number; unitPrice: number }[];
  },
  payment: { method: string; status: string },
  customer: { name: string; email: string },
) {
  if (typeof window === "undefined") {
    return;
  }

  const body = [
    `Invoice: ${order.orderNumber}`,
    `Customer: ${customer.name}`,
    `Email: ${customer.email}`,
    `Payment method: ${payment.method}`,
    `Payment status: ${payment.status}`,
    `Order status: ${order.status}`,
    "",
    "Items:",
    ...order.items.map((item) => `- ${item.title} | ${item.quantity} x ${item.unitPrice}`),
    "",
    `Subtotal: ${order.totals.subtotal}`,
    `Shipping: ${order.totals.shipping}`,
    `Total: ${order.totals.total}`,
  ].join("\n");

  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${order.orderNumber}.txt`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
