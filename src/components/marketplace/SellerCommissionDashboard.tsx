"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, Clock3, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminCompactStat, AdminField } from "@/components/admin/AdminCommon";
import { AdminMiniBars, AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminUI";
import { SellerPayoutAccountDialog } from "@/components/marketplace/SellerPayoutAccountDialog";
import { formatPKR } from "@/data/marketplace";
import { cn } from "@/lib/utils";
import { getSellerPaymentDashboardData } from "@/modules/marketplace/payment-reporting";
import {
  describePayoutAccountDestination,
  describePayoutRecordDestination,
  formatPayoutLabel,
} from "@/modules/marketplace/payout-display";
import { getEffectiveSettlementStatus } from "@/modules/marketplace/settlements";
import { useMarketplace } from "@/modules/marketplace/store";
import type { SellerPayoutAccount, SellerPayoutAccountInput } from "@/modules/marketplace/types";

function createPayoutAccountDraft(account?: SellerPayoutAccount): SellerPayoutAccountInput {
  return {
    method: account?.method ?? "BANK_TRANSFER",
    schedulePreference: account?.schedulePreference ?? "MANUAL_REQUEST",
    accountType: account?.accountType ?? "CURRENT",
    accountTitle: account?.accountTitle ?? "",
    accountNumber: account?.accountNumber ?? "",
    bankName: account?.bankName ?? "",
    iban: account?.iban ?? "",
    branchCode: account?.branchCode ?? "",
    mobileWalletProvider: account?.mobileWalletProvider ?? "",
    easyPaisaNumber: account?.easyPaisaNumber ?? "",
    jazzCashNumber: account?.jazzCashNumber ?? "",
    paypalEmail: account?.paypalEmail ?? "",
    walletId: account?.walletId ?? "",
    notes: account?.notes ?? "",
  };
}

export function SellerCommissionDashboard({ embedded = false }: { embedded?: boolean }) {
  const { currentUser, state, updateSellerPayoutAccount, requestPayout } = useMarketplace();

  const sellerSlug = currentUser?.sellerSlug;
  const sellerRecord = useMemo(
    () =>
      sellerSlug ? state.sellersDirectory.find((seller) => seller.slug === sellerSlug) : undefined,
    [sellerSlug, state.sellersDirectory],
  );

  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState<SellerPayoutAccountInput>(() =>
    createPayoutAccountDraft(sellerRecord?.payoutAccount),
  );
  const [requestNote, setRequestNote] = useState("");

  useEffect(() => {
    setAccountDraft(createPayoutAccountDraft(sellerRecord?.payoutAccount));
  }, [sellerRecord]);

  if (!sellerSlug || !sellerRecord) {
    return (
      <div className="rounded-[20px] bg-accent-soft/30 p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-bold">Not a seller</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch to a seller account to view commissions, payout details, and settlements.
        </p>
      </div>
    );
  }

  const payoutAccount = sellerRecord.payoutAccount;
  const dashboard = getSellerPaymentDashboardData(state, sellerSlug);
  const watchlist = dashboard.orderRows
    .filter((row) => row.verificationState !== "VERIFIED")
    .slice(0, 6);
  const openPayout = dashboard.payouts.find((payout) =>
    [
      "DRAFT",
      "PENDING_APPROVAL",
      "APPROVED",
      "PROCESSING",
      "HELD",
      "PENDING",
      "SCHEDULED",
    ].includes(payout.status),
  );
  const settlementRows = state.sellerSettlements
    .filter((settlement) => settlement.sellerSlug === sellerSlug)
    .map((settlement) => ({
      ...settlement,
      settlementStatus: getEffectiveSettlementStatus(state, settlement),
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const requestableAmount =
    openPayout &&
    openPayout.requestType !== "SELLER_REQUEST" &&
    ["DRAFT", "PENDING", "SCHEDULED"].includes(openPayout.status)
      ? openPayout.netAmount
      : dashboard.summary.readyForPayout;

  const payoutBlocker = (() => {
    if (!payoutAccount) {
      return "Add payout account details before requesting a settlement.";
    }

    if (payoutAccount.status !== "VERIFIED") {
      return "Your payout account must be verified by SpareKart before funds can be released.";
    }

    if (sellerRecord.payoutHold) {
      return "Payouts are currently on hold for this store.";
    }

    if (openPayout?.requestType === "SELLER_REQUEST") {
      return `A payout request is already ${formatPayoutLabel(openPayout.status).toLowerCase()}.`;
    }

    if (openPayout && ["APPROVED", "PROCESSING", "HELD"].includes(openPayout.status)) {
      return `An existing payout is already ${formatPayoutLabel(openPayout.status).toLowerCase()}.`;
    }

    if (requestableAmount < state.payoutCycleConfig.minimumPayoutAmount) {
      return `Minimum payout threshold is ${formatPKR(state.payoutCycleConfig.minimumPayoutAmount)}.`;
    }

    return null;
  })();

  const canRequestPayout = !payoutBlocker;

  const handleSavePayoutAccount = async () => {
    try {
      await updateSellerPayoutAccount(accountDraft);
      setAccountDialogOpen(false);
      toast.success("Payout details saved and sent for admin review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save payout account.");
    }
  };

  const handleRequestPayout = async () => {
    try {
      await requestPayout({ note: requestNote.trim() || undefined });
      setRequestNote("");
      toast.success("Payout request submitted for admin approval.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request payout.");
    }
  };

  return (
    <>
      <div className="space-y-4">
        {!embedded ? (
          <AdminPageHeader
            eyebrow="Your earnings"
            title="Payments, commissions, and seller payouts"
            description="Track verified earnings, manage your payout destination, and request seller settlements without leaving the dashboard."
          />
        ) : null}

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <AdminCompactStat
            label="Gross sales"
            value={formatPKR(dashboard.summary.grossSales)}
            helper="Customer order value"
          />
          <AdminCompactStat
            label="SpareKart commission"
            value={formatPKR(dashboard.summary.platformCommission)}
            helper="Marketplace deduction"
            tone="warning"
          />
          <AdminCompactStat
            label="Verified net"
            value={formatPKR(dashboard.summary.verifiedNet)}
            helper="Cleared after verification"
            tone="success"
          />
          <AdminCompactStat
            label="Ready for payout"
            value={formatPKR(requestableAmount)}
            helper="Available for request"
            tone="success"
          />
          <AdminCompactStat
            label="Open payouts"
            value={formatPKR(
              dashboard.summary.scheduledPayouts +
                dashboard.summary.processingPayouts +
                dashboard.summary.heldPayouts,
            )}
            helper="Scheduled, processing, held"
          />
          <AdminCompactStat
            label="Paid out"
            value={formatPKR(dashboard.summary.paidOut)}
            helper="Transferred to your account"
            tone="success"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <AdminPanel
            title="Settlement account"
            description="This is the payout destination SpareKart will use when releasing your earnings."
            action={
              <button
                type="button"
                onClick={() => setAccountDialogOpen(true)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 bg-card px-4 text-sm font-semibold"
              >
                {payoutAccount ? "Edit details" : "Add payout details"}
              </button>
            }
          >
            {payoutAccount ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/60 bg-surface px-4 py-3">
                  <div>
                    <div className="text-sm font-black text-foreground">
                      {formatPayoutLabel(payoutAccount.method)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {describePayoutAccountDestination(payoutAccount)}
                    </div>
                  </div>
                  <AdminPill tone={getAccountTone(payoutAccount.status)}>
                    {formatPayoutLabel(payoutAccount.status)}
                  </AdminPill>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <InfoTile
                    icon={<Landmark className="h-4 w-4 text-accent" />}
                    label="Schedule"
                    value={formatPayoutLabel(payoutAccount.schedulePreference)}
                  />
                  <InfoTile
                    icon={<Clock3 className="h-4 w-4 text-accent" />}
                    label="Last update"
                    value={formatDateTime(payoutAccount.updatedAt)}
                  />
                  <InfoTile
                    icon={<ShieldCheck className="h-4 w-4 text-accent" />}
                    label="Review state"
                    value={formatPayoutLabel(payoutAccount.status)}
                  />
                </div>

                {payoutAccount.adminNote ? (
                  <StatusNotice tone={payoutAccount.status === "REJECTED" ? "danger" : "info"}>
                    {payoutAccount.adminNote}
                  </StatusNotice>
                ) : null}

                {payoutAccount.rejectionReason ? (
                  <StatusNotice tone="danger">{payoutAccount.rejectionReason}</StatusNotice>
                ) : null}

                <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-3 text-xs text-muted-foreground">
                  Sensitive payout details are masked in the dashboard. Final encryption and secure
                  storage should be enforced in the backend service layer before deployment.
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                No payout destination is saved yet. Add a bank, wallet, or transfer destination to
                start receiving seller settlements.
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Payout request desk"
            description="Request a payout once your verified balance clears the minimum threshold."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <FlowBox
                label="Available now"
                value={formatPKR(requestableAmount)}
                helper={
                  openPayout?.requestType !== "SELLER_REQUEST" && openPayout
                    ? "Already grouped in payout queue"
                    : "Verified and cleared"
                }
                tone="success"
              />
              <FlowBox
                label="Minimum threshold"
                value={formatPKR(state.payoutCycleConfig.minimumPayoutAmount)}
                helper="Required to request payout"
              />
              <FlowBox
                label="Current open payout"
                value={openPayout ? formatPayoutLabel(openPayout.status) : "None"}
                helper={
                  openPayout
                    ? describePayoutRecordDestination(openPayout)
                    : "No payout currently in flight"
                }
                tone={openPayout ? "warning" : "default"}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.86fr)]">
              <AdminField
                label="Payout request note"
                hint="Optional context for finance operations, for example the preferred payout cycle or bank reference notes."
              >
                <textarea
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  className="min-h-28 w-full rounded-[18px] border border-border/60 bg-background px-3 py-3 text-sm focus:outline-none"
                  placeholder="Add a note for the admin payout team..."
                />
              </AdminField>

              <div className="space-y-3 rounded-[18px] border border-border/60 bg-surface px-4 py-4">
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 h-4 w-4 text-accent" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {canRequestPayout ? "Ready to request" : "Action blocked"}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      {payoutBlocker ??
                        `You can now request ${formatPKR(requestableAmount)} for manual release.`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRequestPayout}
                  disabled={!canRequestPayout}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {openPayout?.requestType !== "SELLER_REQUEST" && openPayout
                    ? "Request manual release"
                    : "Request payout"}
                </button>

                {dashboard.summary.nextPayoutDate ? (
                  <div className="text-xs text-muted-foreground">
                    Next scheduled payout cycle: {formatDate(dashboard.summary.nextPayoutDate)}
                  </div>
                ) : null}
              </div>
            </div>
          </AdminPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <AdminPanel
            title="Funds flow"
            description="A clearer view of where seller money is sitting right now."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <FlowBox
                label="Customer sales"
                value={formatPKR(dashboard.summary.grossSales)}
                helper="All assigned order value"
              />
              <FlowBox
                label="Awaiting verification"
                value={formatPKR(dashboard.summary.awaitingVerification)}
                helper={`${dashboard.summary.codAwaitingVerificationCount} COD, ${dashboard.summary.manualAwaitingVerificationCount} manual`}
                tone="warning"
              />
              <FlowBox
                label="Verified seller net"
                value={formatPKR(dashboard.summary.verifiedNet)}
                helper="Cleared after proof review"
                tone="success"
              />
              <FlowBox
                label="Platform kept"
                value={formatPKR(dashboard.summary.platformCommission)}
                helper="Commission deducted"
              />
              <FlowBox
                label="Paid to you"
                value={formatPKR(dashboard.summary.paidOut)}
                helper={
                  dashboard.summary.nextPayoutDate
                    ? `Next cycle ${formatDate(dashboard.summary.nextPayoutDate)}`
                    : "No payout date yet"
                }
                tone="success"
              />
            </div>
          </AdminPanel>

          <AdminPanel
            title="Payout tracker"
            description="Scheduled and historical payout cycles for this store."
          >
            {dashboard.payouts.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                No payouts have been created yet. Delivered, paid orders will land here once they
                clear the holding period.
              </div>
            ) : (
              <div className="space-y-2">
                {dashboard.payouts.slice(0, 6).map((payout) => (
                  <div
                    key={payout.id}
                    className="rounded-[16px] border border-border/60 bg-surface px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-foreground">
                            {formatPKR(payout.netAmount)}
                          </div>
                          <AdminPill tone={getPayoutTone(payout.status)}>
                            {formatPayoutLabel(payout.status)}
                          </AdminPill>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{payout.orderIds.length} orders</span>
                          <span>{describePayoutRecordDestination(payout)}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        {formatPayoutLabel(payout.requestType ?? "AUTO_SCHEDULED")}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>Commission: {formatPKR(payout.totalCommissionDeducted)}</span>
                      {payout.transactionReference ? (
                        <span>Ref: {payout.transactionReference}</span>
                      ) : null}
                      {payout.paidAt ? <span>Paid {formatDate(payout.paidAt)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <AdminPanel
            title="Order earnings ledger"
            description="Per-order gross, commission, verification state, and payout state."
          >
            {dashboard.orderRows.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                No seller earnings have been generated yet.
              </div>
            ) : (
              <div className="max-h-[36rem] overflow-y-auto">
                <div className="divide-y divide-border/60">
                  {dashboard.orderRows.map((row) => (
                    <div key={row.orderId} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-foreground">
                              {row.orderNumber}
                            </div>
                            <AdminPill tone={getVerificationTone(row.verificationState)}>
                              {formatPayoutLabel(row.verificationState)}
                            </AdminPill>
                            <AdminPill tone={getFundsTone(row.fundsState)}>
                              {formatPayoutLabel(row.fundsState)}
                            </AdminPill>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{formatPayoutLabel(row.paymentMethod)}</span>
                            <span>{formatPayoutLabel(row.orderStatus)}</span>
                            <span>{formatDate(row.createdAt)}</span>
                            {row.paymentProofStatus ? (
                              <span>Proof {formatPayoutLabel(row.paymentProofStatus)}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-foreground">
                            {formatPKR(row.sellerNetAmount)}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {formatPKR(row.grossAmount)} gross
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-4">
                        <LedgerChip label="Commission" value={formatPKR(row.commissionAmount)} />
                        <LedgerChip label="Rate" value={`${row.commissionRate.toFixed(1)}%`} />
                        <LedgerChip label="Payment" value={formatPayoutLabel(row.paymentStatus)} />
                        <LedgerChip
                          label="Payout"
                          value={
                            row.payoutStatus === "UNSCHEDULED"
                              ? "Not created"
                              : formatPayoutLabel(row.payoutStatus)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AdminPanel>

          <div className="space-y-4">
            <AdminPanel
              title="Settlement breakdown"
              description="Item-level net payable entries powering your payout balance."
            >
              {settlementRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No settlement ledger entries yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {settlementRows.slice(0, 6).map((settlement) => (
                    <div
                      key={settlement.id}
                      className="rounded-[16px] border border-border/60 bg-surface px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {settlement.productTitle}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{settlement.orderId.replace("order-", "Order ")}</span>
                            <span>{formatPayoutLabel(settlement.productCategory)}</span>
                            <span>{formatPayoutLabel(settlement.financialSourceType)}</span>
                          </div>
                        </div>
                        <AdminPill tone={getSettlementTone(settlement.settlementStatus)}>
                          {formatPayoutLabel(settlement.settlementStatus)}
                        </AdminPill>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <LedgerChip label="Gross" value={formatPKR(settlement.grossSaleAmount)} />
                        <LedgerChip
                          label="Commission"
                          value={formatPKR(settlement.commissionAmount)}
                        />
                        <LedgerChip label="Net" value={formatPKR(settlement.netPayableAmount)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel
              title="Commission by category"
              description="How category-level commission is shaping your net earnings."
            >
              {dashboard.categoryRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No category-level commissions yet.
                </div>
              ) : (
                <AdminMiniBars
                  rows={dashboard.categoryRows.slice(0, 6).map((row) => ({
                    label: `${formatPayoutLabel(row.category)} - ${row.commissionRate.toFixed(0)}%`,
                    value: row.sellerNetAmount,
                    tone: "success",
                  }))}
                  valueFormatter={(value) => formatPKR(value)}
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="Verification watchlist"
              description="Orders still waiting on COD or manual payment clearance."
            >
              {watchlist.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  All current seller orders are verified.
                </div>
              ) : (
                <div className="space-y-2">
                  {watchlist.map((row) => (
                    <div
                      key={row.orderId}
                      className="rounded-[16px] border border-border/60 bg-surface px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {row.orderNumber}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {formatPayoutLabel(row.paymentMethod)} -{" "}
                            {formatPayoutLabel(row.verificationState)}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {formatPKR(row.sellerNetAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>
        </section>
      </div>

      <SellerPayoutAccountDialog
        open={accountDialogOpen}
        draft={accountDraft}
        onOpenChange={setAccountDialogOpen}
        onDraftChange={setAccountDraft}
        onSave={handleSavePayoutAccount}
      />
    </>
  );
}

function FlowBox({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border px-3 py-3",
        tone === "warning"
          ? "border-warning/25 bg-warning/5"
          : tone === "success"
            ? "border-success/20 bg-success/5"
            : "border-border/60 bg-surface",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-base font-black text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{helper}</div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-border/60 bg-surface px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function StatusNotice({ children, tone = "info" }: { children: string; tone?: "info" | "danger" }) {
  return (
    <div
      className={cn(
        "rounded-[16px] border px-4 py-3 text-sm",
        tone === "danger"
          ? "border-destructive/20 bg-destructive/5 text-destructive"
          : "border-info/20 bg-info/5 text-info",
      )}
    >
      {children}
    </div>
  );
}

function LedgerChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function getAccountTone(status?: string) {
  if (status === "VERIFIED") {
    return "success" as const;
  }

  if (status === "REJECTED") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getVerificationTone(state: string) {
  if (state === "VERIFIED") {
    return "success" as const;
  }

  if (state === "REJECTED") {
    return "danger" as const;
  }

  if (state === "UNDER_REVIEW") {
    return "info" as const;
  }

  return "warning" as const;
}

function getFundsTone(state: string) {
  if (state === "PAID_OUT") {
    return "success" as const;
  }

  if (state === "CANCELED" || state === "HELD") {
    return "danger" as const;
  }

  if (state === "PROCESSING_PAYOUT" || state === "SCHEDULED_PAYOUT") {
    return "info" as const;
  }

  return "warning" as const;
}

function getPayoutTone(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "HELD" || status === "FAILED" || status === "CANCELED") {
    return "danger" as const;
  }

  if (status === "APPROVED" || status === "PROCESSING") {
    return "info" as const;
  }

  return "warning" as const;
}

function getSettlementTone(status: string) {
  if (status === "PAID_OUT" || status === "READY_FOR_SETTLEMENT") {
    return "success" as const;
  }

  if (status === "ON_HOLD" || status === "FAILED") {
    return "danger" as const;
  }

  if (status === "IN_PAYOUT_QUEUE" || status === "PAYOUT_PROCESSING") {
    return "info" as const;
  }

  return "warning" as const;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
