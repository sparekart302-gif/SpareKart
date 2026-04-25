"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Search, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { AdminCompactStat, AdminScopeGate } from "@/components/admin/AdminCommon";
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminUI";
import { PaymentStatusBadge, ProofStatusBadge } from "@/components/marketplace/StatusBadge";
import { formatPKR } from "@/data/marketplace";
import { cn } from "@/lib/utils";
import { getProofAttemptsForOrder } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type {
  MarketplaceOrder,
  PaymentProof,
  PaymentRecord,
} from "@/modules/marketplace/types";

type PaymentVerificationRow = {
  order: MarketplaceOrder;
  payment: PaymentRecord;
  customerName: string;
  customerPhone: string;
  activeProof?: PaymentProof;
};

type CODDraft = {
  deliveryPartnerName: string;
  deliveryPartnerPhone: string;
  screenshotUrl: string;
  screenshotName: string;
  transactionReference: string;
  amountPaid: string;
  paymentDateTime: string;
  note: string;
};

type CODDeskTab = "CAPTURE" | "REVIEW" | "HISTORY";

const emptyDraft: CODDraft = {
  deliveryPartnerName: "",
  deliveryPartnerPhone: "",
  screenshotUrl: "",
  screenshotName: "",
  transactionReference: "",
  amountPaid: "",
  paymentDateTime: "",
  note: "",
};

export function CODPaymentVerificationPanel({
  orders,
  paymentsMap,
  embedded = false,
}: {
  orders: MarketplaceOrder[];
  paymentsMap: Map<string, PaymentRecord>;
  embedded?: boolean;
}) {
  const { currentUser, state, submitCODProof, approveProof, rejectProof } = useMarketplace();
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [activeTab, setActiveTab] = useState<CODDeskTab>("CAPTURE");
  const [draft, setDraft] = useState<CODDraft>(emptyDraft);
  const [adminNote, setAdminNote] = useState("");

  const verificationRows = useMemo<PaymentVerificationRow[]>(() => {
    return orders
      .map((order) => {
        const payment = paymentsMap.get(order.paymentId);

        if (!payment || payment.method !== "COD") {
          return null;
        }

        if (payment.status === "PENDING" && order.status !== "DELIVERED") {
          return null;
        }

        const customer = state.users.find((user) => user.id === order.customerUserId);
        const proofs = getProofAttemptsForOrder(state, order.id);

        return {
          order,
          payment,
          customerName: customer?.name ?? "Unknown",
          customerPhone: customer?.phone ?? "Unknown",
          activeProof: proofs.find((proof) => proof.id === payment.activeProofId) ?? proofs[0],
        };
      })
      .filter(Boolean)
      .filter((row) => {
        const searchable = `${row!.order.orderNumber} ${row!.customerName} ${row!.customerPhone}`.toLowerCase();
        return !query.trim() || searchable.includes(query.trim().toLowerCase());
      })
      .sort(
        (left, right) =>
          new Date(right!.order.createdAt).getTime() - new Date(left!.order.createdAt).getTime(),
      ) as PaymentVerificationRow[];
  }, [orders, paymentsMap, query, state]);

  useEffect(() => {
    if (!verificationRows.length) {
      setSelectedOrderId("");
      return;
    }

    if (!verificationRows.some((row) => row.order.id === selectedOrderId)) {
      setSelectedOrderId(verificationRows[0].order.id);
    }
  }, [selectedOrderId, verificationRows]);

  const selectedRow = verificationRows.find((row) => row.order.id === selectedOrderId);
  const selectedProofAttempts = selectedRow ? getProofAttemptsForOrder(state, selectedRow.order.id) : [];

  useEffect(() => {
    if (!selectedRow) {
      setDraft(emptyDraft);
      setAdminNote("");
      setActiveTab("CAPTURE");
      return;
    }

    const activeProof = selectedRow.activeProof;

    setDraft({
      deliveryPartnerName: activeProof?.deliveryPartnerName ?? "",
      deliveryPartnerPhone: activeProof?.deliveryPartnerPhone ?? "",
      screenshotUrl: activeProof?.screenshotUrl ?? "",
      screenshotName: activeProof?.screenshotName ?? "",
      transactionReference: activeProof?.transactionReference ?? "",
      amountPaid: activeProof?.amountPaid ? String(activeProof.amountPaid) : String(selectedRow.order.totals.total),
      paymentDateTime: activeProof?.paymentDateTime ?? "",
      note: activeProof?.note ?? "",
    });
    setAdminNote(activeProof?.adminNote ?? "");
    setActiveTab(activeProof ? (selectedRow.payment.status === "UNDER_REVIEW" ? "REVIEW" : "HISTORY") : "CAPTURE");
  }, [selectedRow]);

  const pendingCount = verificationRows.filter((row) => row.payment.status === "PENDING").length;
  const underReviewCount = verificationRows.filter((row) => row.payment.status === "UNDER_REVIEW").length;
  const approvedCount = verificationRows.filter((row) => row.payment.status === "PAID").length;
  const rejectedCount = verificationRows.filter((row) => row.payment.status === "REJECTED").length;

  const handleFileUpload = async (file?: File) => {
    if (!file) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });

    setDraft((previous) => ({
      ...previous,
      screenshotUrl: dataUrl,
      screenshotName: file.name,
    }));
  };

  const handleSubmitProof = async () => {
    if (!selectedRow) {
      return;
    }

    try {
      submitCODProof(selectedRow.order.id, {
        deliveryPartnerName: draft.deliveryPartnerName,
        deliveryPartnerPhone: draft.deliveryPartnerPhone,
        screenshotUrl: draft.screenshotUrl,
        screenshotName: draft.screenshotName,
        transactionReference: draft.transactionReference,
        amountPaid: draft.amountPaid ? Number(draft.amountPaid) : undefined,
        paymentDateTime: draft.paymentDateTime || undefined,
        note: draft.note || undefined,
      });
      setActiveTab("REVIEW");
      toast.success("COD collection proof submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit COD proof.");
    }
  };

  const handleReviewProof = (decision: "APPROVE" | "REJECT") => {
    if (!selectedRow?.activeProof) {
      toast.error("Submit a COD collection proof first.");
      return;
    }

    try {
      if (decision === "APPROVE") {
        approveProof({ proofId: selectedRow.activeProof.id, adminNote });
        toast.success("COD payment approved.");
        return;
      }

      rejectProof({ proofId: selectedRow.activeProof.id, adminNote });
      toast.success("COD payment rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to review COD proof.");
    }
  };

  return (
    <AdminScopeGate scope="payments" currentUser={currentUser}>
      <div className="space-y-4">
        {!embedded ? (
          <AdminPageHeader
            eyebrow="Cash on delivery"
            title="COD settlement verification"
            description="Capture delivery cash receipts, review settlement proof, and release seller earnings only after SpareKart verifies the collected amount."
          />
        ) : null}

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat label="Awaiting receipt" value={String(pendingCount)} helper="Delivered, not captured" tone="warning" />
          <AdminCompactStat label="Under review" value={String(underReviewCount)} helper="Waiting for admin decision" />
          <AdminCompactStat label="Verified COD" value={String(approvedCount)} helper="Cash booked successfully" tone="success" />
          <AdminCompactStat label="Rejected" value={String(rejectedCount)} helper="Needs a fresh proof" tone="danger" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <AdminPanel
            title="Settlement queue"
            description="Review delivered COD orders without bouncing around the page."
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search order, customer, or phone"
                className="h-10 w-full bg-transparent text-sm focus:outline-none"
              />
            </div>

            <div className="mt-3 -mx-3 sm:-mx-4">
              {verificationRows.length === 0 ? (
                <div className="px-3 pb-1 pt-1 sm:px-4">
                  <AdminEmptyState title="No COD settlements found" body="There are no COD orders available in the current filter." />
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {verificationRows.map((row) => (
                    <button
                      key={row.order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(row.order.id)}
                      className={cn(
                        "w-full px-3 py-3.5 text-left transition-colors sm:px-4",
                        row.order.id === selectedOrderId ? "bg-accent-soft/60" : "hover:bg-surface",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold text-foreground">{row.order.orderNumber}</div>
                            {row.activeProof ? <ProofStatusBadge status={row.activeProof.status} /> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{row.customerName}</span>
                            <span>{formatPKR(row.order.totals.total)}</span>
                            <span>{row.order.status.replaceAll("_", " ")}</span>
                          </div>
                        </div>
                        <PaymentStatusBadge status={row.payment.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <AdminPill tone="info">{row.activeProof ? `Attempt ${row.activeProof.attemptNumber}` : "Capture receipt"}</AdminPill>
                        {row.activeProof?.transactionReference ? <AdminPill>{row.activeProof.transactionReference}</AdminPill> : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </AdminPanel>

          <AdminPanel title="Settlement detail" description="Keep the full decision flow in one focused workspace." className="h-fit">
            {!selectedRow ? (
              <AdminEmptyState title="Select a COD order" body="Choose a row from the queue to capture or review its settlement proof." />
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-black tracking-tight text-foreground">{selectedRow.order.orderNumber}</div>
                      <PaymentStatusBadge status={selectedRow.payment.status} />
                      {selectedRow.activeProof ? <ProofStatusBadge status={selectedRow.activeProof.status} /> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{selectedRow.customerName}</span>
                      <span>{selectedRow.customerPhone}</span>
                      <span>{formatPKR(selectedRow.payment.amountDue)}</span>
                    </div>
                  </div>
                  <AdminPill tone={selectedRow.order.status === "DELIVERED" ? "success" : "warning"}>
                    {selectedRow.order.status.replaceAll("_", " ")}
                  </AdminPill>
                </div>

                <div className="grid gap-3 border-b border-border/60 py-3 sm:grid-cols-2 xl:grid-cols-4">
                  <CompactMeta label="Settlement state" value={selectedRow.payment.status.replaceAll("_", " ")} />
                  <CompactMeta label="Customer due" value={formatPKR(selectedRow.order.totals.total)} />
                  <CompactMeta label="Seller count" value={String(selectedRow.order.sellerFulfillments.length)} />
                  <CompactMeta label="Attempts" value={String(selectedProofAttempts.length)} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(["CAPTURE", "REVIEW", "HISTORY"] as CODDeskTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                        activeTab === tab ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab === "CAPTURE" ? "Capture proof" : tab === "REVIEW" ? "Review" : "Attempt history"}
                    </button>
                  ))}
                </div>

                {activeTab === "CAPTURE" ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_15rem]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CompactField label="Delivery partner">
                        <input
                          value={draft.deliveryPartnerName}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, deliveryPartnerName: event.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                        />
                      </CompactField>
                      <CompactField label="Partner phone">
                        <input
                          value={draft.deliveryPartnerPhone}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, deliveryPartnerPhone: event.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                        />
                      </CompactField>
                      <CompactField label="Transaction reference">
                        <input
                          value={draft.transactionReference}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, transactionReference: event.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                        />
                      </CompactField>
                      <CompactField label="Amount collected">
                        <input
                          type="number"
                          value={draft.amountPaid}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, amountPaid: event.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                        />
                      </CompactField>
                      <CompactField label="Collection time" className="sm:col-span-2">
                        <input
                          type="datetime-local"
                          value={draft.paymentDateTime}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, paymentDateTime: event.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
                        />
                      </CompactField>
                      <CompactField label="Internal note" className="sm:col-span-2">
                        <textarea
                          value={draft.note}
                          onChange={(event) =>
                            setDraft((previous) => ({ ...previous, note: event.target.value }))
                          }
                          className="min-h-20 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:outline-none"
                        />
                      </CompactField>
                      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                        <div className="text-xs text-muted-foreground">
                          Submit the delivery partner receipt before admin review begins.
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmitProof}
                          disabled={selectedRow.payment.status === "UNDER_REVIEW"}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Submit COD proof
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[18px] border border-border/60 bg-surface p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Receipt preview</div>
                      <div className="overflow-hidden rounded-[16px] border border-border/60 bg-background">
                        {draft.screenshotUrl ? (
                          <div className="relative aspect-square">
                            <OptimizedImage
                              src={draft.screenshotUrl}
                              alt={draft.screenshotName || "COD receipt"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1280px) 100vw, 20rem"
                            />
                          </div>
                        ) : (
                          <div className="grid aspect-square place-items-center px-4 text-center text-xs text-muted-foreground">
                            Upload the delivery receipt or settlement screenshot.
                          </div>
                        )}
                      </div>
                      <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background px-3 text-sm font-semibold text-foreground">
                        <Upload className="h-4 w-4 text-accent" />
                        {draft.screenshotName || "Upload receipt"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => handleFileUpload(event.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                {activeTab === "REVIEW" ? (
                  <div className="mt-3 grid gap-3 xl:grid-cols-[15rem_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-[18px] border border-border/60 bg-surface">
                        {selectedRow.activeProof?.screenshotUrl ? (
                          <div className="relative aspect-square">
                            <OptimizedImage
                              src={selectedRow.activeProof.screenshotUrl}
                              alt={`${selectedRow.order.orderNumber} COD proof`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1280px) 100vw, 20rem"
                            />
                          </div>
                        ) : (
                          <div className="grid aspect-square place-items-center px-4 text-center text-xs text-muted-foreground">
                            No receipt uploaded yet.
                          </div>
                        )}
                      </div>
                      <div className="rounded-[18px] border border-border/60 bg-surface p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Latest proof</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedRow.activeProof ? <ProofStatusBadge status={selectedRow.activeProof.status} /> : <AdminPill>No proof</AdminPill>}
                          <PaymentStatusBadge status={selectedRow.payment.status} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid gap-3 rounded-[18px] border border-border/60 bg-surface p-3 sm:grid-cols-2">
                        <CompactMeta label="Delivery partner" value={selectedRow.activeProof?.deliveryPartnerName ?? "Not added"} />
                        <CompactMeta label="Partner phone" value={selectedRow.activeProof?.deliveryPartnerPhone ?? "Not added"} />
                        <CompactMeta label="Reference" value={selectedRow.activeProof?.transactionReference ?? "Not added"} />
                        <CompactMeta
                          label="Amount paid"
                          value={
                            selectedRow.activeProof?.amountPaid
                              ? formatPKR(selectedRow.activeProof.amountPaid)
                              : "Not added"
                          }
                        />
                        <CompactMeta
                          label="Collected at"
                          value={
                            selectedRow.activeProof?.paymentDateTime
                              ? new Date(selectedRow.activeProof.paymentDateTime).toLocaleString()
                              : "Not added"
                          }
                        />
                        <CompactMeta
                          label="Submitted"
                          value={
                            selectedRow.activeProof
                              ? new Date(selectedRow.activeProof.createdAt).toLocaleString()
                              : "Awaiting proof"
                          }
                        />
                      </div>

                      <CompactField label="Admin review note">
                        <textarea
                          value={adminNote}
                          onChange={(event) => setAdminNote(event.target.value)}
                          className="min-h-24 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:outline-none"
                        />
                      </CompactField>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/60 bg-surface p-3">
                        <div className="text-xs text-muted-foreground">
                          Approving the proof books revenue and unlocks seller payout scheduling.
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={selectedRow.payment.status !== "UNDER_REVIEW" || !selectedRow.activeProof}
                            onClick={() => handleReviewProof("APPROVE")}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-success px-4 text-sm font-semibold text-success-foreground disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={selectedRow.payment.status !== "UNDER_REVIEW" || !selectedRow.activeProof}
                            onClick={() => handleReviewProof("REJECT")}
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

                {activeTab === "HISTORY" ? (
                  <div className="mt-3 overflow-hidden rounded-[18px] border border-border/60 bg-surface">
                    {selectedProofAttempts.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">No COD proof attempts yet.</div>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {selectedProofAttempts.map((proof) => (
                          <div key={proof.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-semibold text-foreground">
                                    {proof.transactionReference}
                                  </div>
                                  <ProofStatusBadge status={proof.status} />
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  <span>Attempt {proof.attemptNumber}</span>
                                  <span>{proof.deliveryPartnerName ?? "Delivery partner"}</span>
                                  <span>{new Date(proof.createdAt).toLocaleString()}</span>
                                </div>
                                {proof.adminNote ? (
                                  <div className="mt-2 text-sm text-muted-foreground">{proof.adminNote}</div>
                                ) : null}
                              </div>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </AdminPanel>
        </section>
      </div>
    </AdminScopeGate>
  );
}

function CompactField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function CompactMeta({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
