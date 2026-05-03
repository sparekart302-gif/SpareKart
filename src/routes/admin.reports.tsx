"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminCompactStat, AdminScopeGate } from "@/components/admin/AdminCommon";
import { PayoutAccountReviewDialog } from "@/components/admin/PayoutAccountReviewDialog";
import { PayoutStatusDialog } from "@/components/admin/PayoutStatusDialog";
import { AdminMiniBars, AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminUI";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/components/navigation/Link";
import { formatPKR } from "@/data/marketplace";
import { cn } from "@/lib/utils";
import { getCommissionRows } from "@/modules/marketplace/admin-selectors";
import {
  getAdminPaymentDashboardData,
  type AdminSellerPaymentSummaryRow,
  type PaymentDashboardRange,
} from "@/modules/marketplace/payment-reporting";
import {
  describePayoutAccountDestination,
  describePayoutRecordDestination,
  formatPayoutLabel,
} from "@/modules/marketplace/payout-display";
import { getEffectiveSettlementStatus } from "@/modules/marketplace/settlements";
import { useMarketplace } from "@/modules/marketplace/store";
import type {
  CODRemittance,
  SellerPayoutAccountReviewInput,
  SellerPayout,
  SellerRecord,
  SellerSettlement,
} from "@/modules/marketplace/types";

type FinanceDesk = "QUEUE" | "COD" | "PAYOUTS" | "HISTORY";

export default function AdminReportsPage() {
  const {
    currentUser,
    state,
    createPayoutBatch,
    reviewCODRemittance,
    reviewSellerPayoutAccount,
    updatePayoutRecord,
  } = useMarketplace();
  const [sellerFilter, setSellerFilter] = useState<string>("ALL");
  const [rangeFilter, setRangeFilter] = useState<PaymentDashboardRange>("ALL");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedSellerSlug, setSelectedSellerSlug] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<SellerPayoutAccountReviewInput>({
    sellerSlug: "",
    status: "VERIFIED",
    adminNote: "",
  });
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [activeDesk, setActiveDesk] = useState<FinanceDesk>("QUEUE");
  const [sellerDetailSlug, setSellerDetailSlug] = useState<string | null>(null);
  const [financeQuery, setFinanceQuery] = useState("");
  const [selectedSettlementIds, setSelectedSettlementIds] = useState<string[]>([]);
  const normalizedFinanceQuery = financeQuery.trim().toLowerCase();

  const paymentDashboard = useMemo(
    () => getAdminPaymentDashboardData(state, rangeFilter),
    [rangeFilter, state],
  );

  const visibleSellerRows = useMemo(() => {
    const sellerRows =
      sellerFilter === "ALL"
        ? paymentDashboard.sellerRows
        : paymentDashboard.sellerRows.filter((row) => row.sellerSlug === sellerFilter);

    if (!normalizedFinanceQuery) {
      return sellerRows;
    }

    return sellerRows.filter((row) => {
      const seller = state.sellersDirectory.find((entry) => entry.slug === row.sellerSlug);
      const sellerText = `${row.sellerName} ${row.sellerSlug} ${seller?.city ?? ""} ${seller?.payoutAccount?.status ?? ""}`;
      const relatedSettlementText = state.sellerSettlements
        .filter((settlement) => settlement.sellerSlug === row.sellerSlug)
        .map(
          (settlement) =>
            `${settlement.orderId} ${settlement.productTitle} ${settlement.settlementStatus}`,
        )
        .join(" ");
      const relatedPayoutText = state.sellerPayouts
        .filter((payout) => payout.sellerSlug === row.sellerSlug)
        .map((payout) => `${payout.id} ${payout.status} ${payout.transactionReference ?? ""}`)
        .join(" ");
      const relatedRemittanceText = state.codRemittances
        .filter((remittance) => remittance.sellerSlugs.includes(row.sellerSlug))
        .map(
          (remittance) =>
            `${remittance.orderId} ${remittance.status} ${remittance.remittanceReference ?? ""}`,
        )
        .join(" ");

      return matchesFinanceText(
        `${sellerText} ${relatedSettlementText} ${relatedPayoutText} ${relatedRemittanceText}`,
        normalizedFinanceQuery,
      );
    });
  }, [
    normalizedFinanceQuery,
    paymentDashboard.sellerRows,
    sellerFilter,
    state.codRemittances,
    state.sellerPayouts,
    state.sellerSettlements,
    state.sellersDirectory,
  ]);

  const visibleSummary = useMemo(
    () =>
      visibleSellerRows.reduce(
        (summary, row) => {
          summary.grossSales += row.grossSales;
          summary.platformCommission += row.platformCommission;
          summary.netAfterCommission += row.netAfterCommission;
          summary.awaitingVerification += row.awaitingVerification;
          summary.openPayouts +=
            row.readyForPayout + row.scheduledPayouts + row.processingPayouts + row.heldPayouts;
          summary.paidOut += row.paidOut;
          return summary;
        },
        {
          grossSales: 0,
          platformCommission: 0,
          netAfterCommission: 0,
          awaitingVerification: 0,
          openPayouts: 0,
          paidOut: 0,
        },
      ),
    [visibleSellerRows],
  );

  const visibleCommissionRows = useMemo(() => {
    const rows = getCommissionRows(state).filter((row) => matchesRange(row.createdAt, rangeFilter));

    return (sellerFilter === "ALL" ? rows : rows.filter((row) => row.sellerSlug === sellerFilter))
      .filter((row) =>
        normalizedFinanceQuery
          ? matchesFinanceText(
              `${row.orderId} ${row.orderNumber} ${row.sellerName} ${row.customerName} ${row.status}`,
              normalizedFinanceQuery,
            )
          : true,
      )
      .slice(0, 10);
  }, [normalizedFinanceQuery, rangeFilter, sellerFilter, state]);

  const visiblePayouts = useMemo(() => {
    const payouts = state.sellerPayouts
      .filter((payout) => matchesRange(payout.updatedAt, rangeFilter))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return (
      sellerFilter === "ALL"
        ? payouts
        : payouts.filter((payout) => payout.sellerSlug === sellerFilter)
    )
      .filter((payout) => {
        if (!normalizedFinanceQuery) {
          return true;
        }

        const seller = state.sellersDirectory.find((entry) => entry.slug === payout.sellerSlug);
        return matchesFinanceText(
          `${payout.id} ${payout.status} ${payout.sellerSlug} ${seller?.name ?? ""} ${payout.transactionReference ?? ""} ${payout.orderIds.join(" ")}`,
          normalizedFinanceQuery,
        );
      })
      .slice(0, activeDesk === "HISTORY" ? 40 : 12);
  }, [
    activeDesk,
    normalizedFinanceQuery,
    rangeFilter,
    sellerFilter,
    state.sellerPayouts,
    state.sellersDirectory,
  ]);

  const visibleRemittances = useMemo(
    () =>
      state.codRemittances
        .filter((remittance) => {
          if (sellerFilter === "ALL") {
            return true;
          }

          return remittance.sellerSlugs.includes(sellerFilter);
        })
        .filter((remittance) => {
          if (!normalizedFinanceQuery) {
            return true;
          }

          const order = state.orders.find((entry) => entry.id === remittance.orderId);
          const sellers = state.sellersDirectory
            .filter((seller) => remittance.sellerSlugs.includes(seller.slug))
            .map((seller) => seller.name)
            .join(" ");

          return matchesFinanceText(
            `${remittance.id} ${remittance.orderId} ${order?.orderNumber ?? ""} ${remittance.status} ${remittance.remittanceReference ?? ""} ${sellers}`,
            normalizedFinanceQuery,
          );
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [
      normalizedFinanceQuery,
      sellerFilter,
      state.codRemittances,
      state.orders,
      state.sellersDirectory,
    ],
  );

  const visibleSettlementRows = useMemo(
    () =>
      state.sellerSettlements
        .filter((settlement) => {
          if (sellerFilter !== "ALL" && settlement.sellerSlug !== sellerFilter) {
            return false;
          }

          return matchesRange(settlement.updatedAt, rangeFilter);
        })
        .filter((settlement) => {
          if (!normalizedFinanceQuery) {
            return true;
          }

          const seller = state.sellersDirectory.find(
            (entry) => entry.slug === settlement.sellerSlug,
          );
          const order = state.orders.find((entry) => entry.id === settlement.orderId);
          const effectiveStatus = getEffectiveSettlementStatus(state, settlement);

          return matchesFinanceText(
            `${settlement.id} ${settlement.orderId} ${order?.orderNumber ?? ""} ${settlement.productTitle} ${settlement.productCategory} ${settlement.financialSourceType} ${effectiveStatus} ${seller?.name ?? ""} ${settlement.sellerSlug}`,
            normalizedFinanceQuery,
          );
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 14),
    [normalizedFinanceQuery, rangeFilter, sellerFilter, state],
  );

  const payoutAccountRows = useMemo(() => {
    const sellers = state.sellersDirectory.filter((seller) =>
      sellerFilter === "ALL" ? Boolean(seller.payoutAccount) : seller.slug === sellerFilter,
    );

    return sellers
      .filter((seller) => seller.payoutAccount)
      .filter((seller) =>
        normalizedFinanceQuery
          ? matchesFinanceText(
              `${seller.name} ${seller.slug} ${seller.payoutAccount?.status ?? ""} ${seller.payoutAccount?.method ?? ""} ${describePayoutAccountDestination(seller.payoutAccount)}`,
              normalizedFinanceQuery,
            )
          : true,
      )
      .sort((left, right) => {
        const leftPriority = getAccountPriority(left.payoutAccount?.status);
        const rightPriority = getAccountPriority(right.payoutAccount?.status);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [normalizedFinanceQuery, sellerFilter, state.sellersDirectory]);

  const selectedSeller =
    selectedSellerSlug === null
      ? null
      : (state.sellersDirectory.find((seller) => seller.slug === selectedSellerSlug) ?? null);
  const selectedPayout =
    selectedPayoutId === null
      ? null
      : (state.sellerPayouts.find((payout) => payout.id === selectedPayoutId) ?? null);
  const selectedFinanceSeller =
    sellerDetailSlug === null
      ? null
      : (state.sellersDirectory.find((seller) => seller.slug === sellerDetailSlug) ?? null);
  const selectedFinanceRow =
    sellerDetailSlug === null
      ? null
      : (paymentDashboard.sellerRows.find((row) => row.sellerSlug === sellerDetailSlug) ?? null);
  const selectedFinanceSettlements =
    sellerDetailSlug === null
      ? []
      : state.sellerSettlements
          .filter((settlement) => settlement.sellerSlug === sellerDetailSlug)
          .map((settlement) => ({
            ...settlement,
            settlementStatus: getEffectiveSettlementStatus(state, settlement),
          }))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const selectedFinancePayouts =
    sellerDetailSlug === null
      ? []
      : state.sellerPayouts
          .filter((payout) => payout.sellerSlug === sellerDetailSlug)
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const selectedFinanceRemittances =
    sellerDetailSlug === null
      ? []
      : state.codRemittances
          .filter((remittance) => remittance.sellerSlugs.includes(sellerDetailSlug))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const deskCounts = {
    QUEUE: visibleSellerRows.filter((row) => row.awaitingVerification > 0 || row.readyForPayout > 0)
      .length,
    COD: visibleRemittances.filter((remittance) =>
      [
        "DELIVERED_AWAITING_COLLECTION_CONFIRMATION",
        "CASH_COLLECTED_BY_PARTNER",
        "REMITTED_TO_MARKETPLACE",
        "ISSUE_FLAGGED",
      ].includes(remittance.status),
    ).length,
    PAYOUTS: visiblePayouts.filter((payout) =>
      ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCESSING", "HELD", "FAILED"].includes(
        payout.status,
      ),
    ).length,
    HISTORY: visiblePayouts.length,
  };

  const handleOpenAccountReview = (seller: SellerRecord) => {
    setSelectedSellerSlug(seller.slug);
    setReviewDraft({
      sellerSlug: seller.slug,
      status: seller.payoutAccount?.status === "REJECTED" ? "REJECTED" : "VERIFIED",
      adminNote: seller.payoutAccount?.adminNote ?? seller.payoutAccount?.rejectionReason ?? "",
    });
    setReviewDialogOpen(true);
  };

  const handleSaveAccountReview = () => {
    try {
      reviewSellerPayoutAccount(reviewDraft);
      setReviewDialogOpen(false);
      toast.success("Seller payout account review saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to review payout account.");
    }
  };

  const handleSavePayout = (input: {
    payoutId: string;
    status: Parameters<typeof updatePayoutRecord>[0]["status"];
    adminNotes?: string;
    transactionReference?: string;
  }) => {
    if (input.status === "PAID" && !input.transactionReference) {
      toast.error("Add a payout transaction reference before marking as paid.");
      return;
    }

    if (["FAILED", "HELD"].includes(input.status) && !input.adminNotes) {
      toast.error("Add an admin note when holding or rejecting a payout.");
      return;
    }

    try {
      updatePayoutRecord(input);
      setPayoutDialogOpen(false);
      toast.success(`Payout moved to ${formatPayoutLabel(input.status).toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update payout.");
    }
  };

  const handleCreateSellerBatch = (sellerSlug: string) => {
    try {
      createPayoutBatch({
        sellerSlug,
        settlementIds: [],
        requestType: "ADMIN_BATCH",
      });
      toast.success("Payout batch created from eligible settlements.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create payout batch.");
    }
  };

  const handleCreateSelectedSettlementBatch = () => {
    const selectedSettlements = state.sellerSettlements.filter((settlement) =>
      selectedSettlementIds.includes(settlement.id),
    );
    const sellerSlugs = Array.from(
      new Set(selectedSettlements.map((settlement) => settlement.sellerSlug)),
    );

    if (selectedSettlements.length === 0) {
      toast.error("Select at least one ready settlement first.");
      return;
    }

    if (sellerSlugs.length !== 1) {
      toast.error("Create one payout batch per seller. Select settlements from a single seller.");
      return;
    }

    try {
      createPayoutBatch({
        sellerSlug: sellerSlugs[0],
        settlementIds: selectedSettlementIds,
        requestType: "ADMIN_BATCH",
      });
      setSelectedSettlementIds([]);
      setActiveDesk("PAYOUTS");
      toast.success("Selected settlements were grouped into a payout batch.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create payout batch.");
    }
  };

  const handleToggleSettlementSelection = (settlementId: string) => {
    setSelectedSettlementIds((current) =>
      current.includes(settlementId)
        ? current.filter((id) => id !== settlementId)
        : [...current, settlementId],
    );
  };

  const handleQuickPayoutUpdate = (
    payout: SellerPayout,
    status: Parameters<typeof updatePayoutRecord>[0]["status"],
  ) => {
    try {
      updatePayoutRecord({
        payoutId: payout.id,
        status,
        adminNotes:
          status === "APPROVED"
            ? "Approved from Financial Operations quick action."
            : status === "PROCESSING"
              ? "Marked as processing from Financial Operations quick action."
              : undefined,
      });
      toast.success(`Payout moved to ${formatPayoutLabel(status).toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update payout.");
    }
  };

  const handleRemittanceAction = (
    remittanceId: string,
    status: "REMITTANCE_CONFIRMED" | "ISSUE_FLAGGED",
  ) => {
    try {
      reviewCODRemittance({
        remittanceId,
        status,
        adminNote:
          status === "REMITTANCE_CONFIRMED"
            ? "Confirmed from admin settlement board."
            : "Flagged from admin settlement board for manual review.",
      });
      toast.success(
        status === "REMITTANCE_CONFIRMED"
          ? "COD remittance confirmed."
          : "COD remittance flagged for review.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update COD remittance.");
    }
  };

  return (
    <AdminScopeGate scope="reports" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Finance operations"
          title="Financial Operations"
          description="Run COD remittance, settlement batching, payout approval, account verification, and reporting from one compact operations desk."
          actions={
            <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-[minmax(14rem,18rem)_minmax(12rem,14rem)_minmax(10rem,12rem)]">
              <input
                value={financeQuery}
                onChange={(event) => setFinanceQuery(event.target.value)}
                placeholder="Search seller, order, payout, ref..."
                className="h-10 rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none sm:col-span-2 xl:col-span-1"
              />
              <select
                value={sellerFilter}
                onChange={(event) => setSellerFilter(event.target.value)}
                className="h-10 rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
              >
                <option value="ALL">All sellers</option>
                {state.sellersDirectory.map((seller) => (
                  <option key={seller.slug} value={seller.slug}>
                    {seller.name}
                  </option>
                ))}
              </select>
              <select
                value={rangeFilter}
                onChange={(event) => setRangeFilter(event.target.value as PaymentDashboardRange)}
                className="h-10 rounded-xl border border-border/60 bg-surface px-3 text-sm focus:outline-none"
              >
                <option value="ALL">All time</option>
                <option value="30D">Last 30 days</option>
                <option value="90D">Last 90 days</option>
                <option value="365D">Last 12 months</option>
              </select>
            </div>
          }
        />

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <AdminCompactStat
            label="Gross sales"
            value={formatPKR(visibleSummary.grossSales)}
            helper="Customer payments across sellers"
          />
          <AdminCompactStat
            label="SpareKart commission"
            value={formatPKR(visibleSummary.platformCommission)}
            helper="Platform revenue kept"
            tone="warning"
          />
          <AdminCompactStat
            label="Seller net"
            value={formatPKR(visibleSummary.netAfterCommission)}
            helper="After commission deduction"
          />
          <AdminCompactStat
            label="Awaiting verification"
            value={formatPKR(visibleSummary.awaitingVerification)}
            helper="Still blocked on proof approval"
            tone="warning"
          />
          <AdminCompactStat
            label="Open payout queue"
            value={formatPKR(visibleSummary.openPayouts)}
            helper="Ready, scheduled, processing, held"
          />
          <AdminCompactStat
            label="Paid out"
            value={formatPKR(visibleSummary.paidOut)}
            helper="Already released to sellers"
            tone="success"
          />
        </section>

        <FinanceDeskTabs activeDesk={activeDesk} counts={deskCounts} onChange={setActiveDesk} />

        {activeDesk === "QUEUE" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <AdminPanel
              title="Seller settlement board"
              description="Per-seller view of payment verification backlog, net due after commission, and payout progress."
            >
              {visibleSellerRows.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No seller settlement data matches the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleSellerRows.map((row) => (
                    <SellerFinanceRow
                      key={row.sellerSlug}
                      row={row}
                      onOpenDetails={() => setSellerDetailSlug(row.sellerSlug)}
                      onCreateBatch={() => handleCreateSellerBatch(row.sellerSlug)}
                    />
                  ))}
                </div>
              )}
            </AdminPanel>

            <div className="space-y-4">
              <AdminPanel
                title="Proof queues"
                description="Operational counts for payment verification work."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FlowMetric
                    label="Manual proof queue"
                    value={String(paymentDashboard.summary.manualProofQueue)}
                    helper="Bank transfer, Easypaisa, JazzCash"
                    tone="warning"
                  />
                  <FlowMetric
                    label="COD queue"
                    value={String(paymentDashboard.summary.codProofQueue)}
                    helper="Receipt capture and admin review"
                    tone="warning"
                  />
                </div>
              </AdminPanel>

              <AdminPanel
                title="Funds by payment method"
                description="How each payment rail contributes to seller dues and SpareKart commissions."
              >
                <AdminMiniBars
                  rows={paymentDashboard.paymentMethodRows
                    .filter((row) => row.orderCount > 0)
                    .map((row) => ({
                      label: `${formatPayoutLabel(row.method)} - ${row.orderCount} orders`,
                      value: row.sellerNet,
                      tone: row.method === "COD" ? "warning" : "success",
                    }))}
                  valueFormatter={(value) => formatPKR(value)}
                />

                <div className="mt-3 space-y-2">
                  {paymentDashboard.paymentMethodRows
                    .filter((row) => row.orderCount > 0)
                    .map((row) => (
                      <div
                        key={row.method}
                        className="rounded-[16px] border border-border/60 bg-surface px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {formatPayoutLabel(row.method)}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {row.orderCount} orders - {formatPKR(row.grossSales)} gross
                            </div>
                          </div>
                          <AdminPill tone={row.awaitingVerification > 0 ? "warning" : "success"}>
                            {row.awaitingVerification > 0 ? "Needs review" : "Healthy"}
                          </AdminPill>
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <MetricTile
                            label="Commission"
                            value={formatPKR(row.platformCommission)}
                          />
                          <MetricTile
                            label="Awaiting"
                            value={formatPKR(row.awaitingVerification)}
                          />
                          <MetricTile label="Paid out" value={formatPKR(row.paidOut)} />
                        </div>
                      </div>
                    ))}
                </div>
              </AdminPanel>
            </div>
          </section>
        ) : null}

        {activeDesk === "COD" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <AdminPanel
              title="COD remittance management"
              description="Orders delivered on cash-on-delivery that still need remittance confirmation or issue handling."
            >
              {visibleRemittances.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No COD remittance records match the selected seller filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleRemittances.slice(0, 10).map((remittance) => {
                    const order = state.orders.find((entry) => entry.id === remittance.orderId);
                    return (
                      <div
                        key={remittance.id}
                        className="rounded-[16px] border border-border/60 bg-surface px-4 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-foreground">
                                {order?.orderNumber ?? remittance.orderId}
                              </div>
                              <AdminPill tone={getRemittanceTone(remittance.status)}>
                                {formatPayoutLabel(remittance.status)}
                              </AdminPill>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span>Expected {formatPKR(remittance.expectedAmount)}</span>
                              <span>
                                Received{" "}
                                {formatPKR(remittance.receivedAmount ?? remittance.expectedAmount)}
                              </span>
                              {remittance.remittanceReference ? (
                                <span>Ref {remittance.remittanceReference}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemittanceAction(remittance.id, "REMITTANCE_CONFIRMED")
                              }
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemittanceAction(remittance.id, "ISSUE_FLAGGED")}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-warning/25 bg-warning/5 px-3 text-xs font-semibold text-warning"
                            >
                              Flag issue
                            </button>
                            <Link
                              href={`/admin/payments?desk=COD${sellerFilter !== "ALL" ? `&seller=${encodeURIComponent(sellerFilter)}` : ""}`}
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold"
                            >
                              Open desk
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminPanel>

            <AdminPanel
              title="Settlement ledger"
              description="The payable ledger that drives seller liabilities, payout batches, and payout history."
              action={
                <button
                  type="button"
                  onClick={handleCreateSelectedSettlementBatch}
                  disabled={selectedSettlementIds.length === 0}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create payout ({selectedSettlementIds.length})
                </button>
              }
            >
              {visibleSettlementRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No settlement rows match the selected filters.
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleSettlementRows.map((settlement) =>
                    (() => {
                      const effectiveStatus = getEffectiveSettlementStatus(state, settlement);
                      const selectable =
                        effectiveStatus === "READY_FOR_SETTLEMENT" && !settlement.payoutId;
                      const sellerName =
                        state.sellersDirectory.find((entry) => entry.slug === settlement.sellerSlug)
                          ?.name ?? settlement.sellerSlug;
                      return (
                        <div
                          key={settlement.id}
                          className="rounded-[16px] border border-border/60 bg-surface px-3 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <input
                                type="checkbox"
                                checked={selectedSettlementIds.includes(settlement.id)}
                                disabled={!selectable}
                                onChange={() => handleToggleSettlementSelection(settlement.id)}
                                className="mt-1 h-4 w-4 rounded border-border disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Select ${settlement.productTitle} for payout`}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">
                                  {settlement.productTitle}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  <span>{settlement.orderId.replace("order-", "Order ")}</span>
                                  <span>{sellerName}</span>
                                  <span>{formatPayoutLabel(settlement.financialSourceType)}</span>
                                </div>
                              </div>
                            </div>
                            <AdminPill tone={getSettlementTone(effectiveStatus)}>
                              {formatPayoutLabel(effectiveStatus)}
                            </AdminPill>
                          </div>
                          {effectiveStatus !== settlement.settlementStatus ? (
                            <div className="mt-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-[11px] text-muted-foreground">
                              This settlement is financially cleared now. The stored status will
                              update when the next payout or remittance action runs.
                            </div>
                          ) : null}
                          <div className="mt-2 grid gap-2 sm:grid-cols-4">
                            <MetricTile
                              label="Gross"
                              value={formatPKR(settlement.grossSaleAmount)}
                            />
                            <MetricTile
                              label="Commission"
                              value={formatPKR(settlement.commissionAmount)}
                            />
                            <MetricTile label="Fees" value={formatPKR(settlement.feeAmount)} />
                            <MetricTile
                              label="Net"
                              value={formatPKR(settlement.netPayableAmount)}
                            />
                          </div>
                        </div>
                      );
                    })(),
                  )}
                </div>
              )}
            </AdminPanel>
          </section>
        ) : null}

        {activeDesk === "PAYOUTS" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
            <AdminPanel
              title="Seller payout accounts"
              description="Verify seller settlement destinations before approving or processing payout requests."
            >
              {payoutAccountRows.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No payout accounts have been submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutAccountRows.map((seller) => (
                    <PayoutAccountRow
                      key={seller.slug}
                      seller={seller}
                      onReview={() => handleOpenAccountReview(seller)}
                    />
                  ))}
                </div>
              )}
            </AdminPanel>

            <AdminPanel
              title="Payout control desk"
              description="Approve, hold, or complete seller payout requests after finance checks."
            >
              {visiblePayouts.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No payout records are available for the selected seller or time range.
                </div>
              ) : (
                <div className="space-y-3">
                  {visiblePayouts.map((payout) => {
                    const seller = state.sellersDirectory.find(
                      (entry) => entry.slug === payout.sellerSlug,
                    );

                    return (
                      <div
                        key={payout.id}
                        className="rounded-[16px] border border-border/60 bg-surface px-4 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-foreground">
                                {seller?.name ?? payout.sellerSlug}
                              </div>
                              <AdminPill tone={getPayoutTone(payout.status)}>
                                {formatPayoutLabel(payout.status)}
                              </AdminPill>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span>{payout.orderIds.length} orders</span>
                              <span>{describePayoutRecordDestination(payout)}</span>
                              <span>
                                {formatPayoutLabel(payout.requestType ?? "AUTO_SCHEDULED")}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-foreground">
                              {formatPKR(payout.netAmount)}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {formatPKR(payout.totalCommissionDeducted)} commission
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {["DRAFT", "PENDING_APPROVAL"].includes(payout.status) ? (
                            <button
                              type="button"
                              onClick={() => handleQuickPayoutUpdate(payout, "APPROVED")}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-success px-3 text-xs font-semibold text-success-foreground"
                            >
                              Approve
                            </button>
                          ) : null}
                          {payout.status === "APPROVED" ? (
                            <button
                              type="button"
                              onClick={() => handleQuickPayoutUpdate(payout, "PROCESSING")}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-info px-3 text-xs font-semibold text-white"
                            >
                              Start transfer
                            </button>
                          ) : null}
                          {payout.status === "PROCESSING" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayoutId(payout.id);
                                setPayoutDialogOpen(true);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
                            >
                              Mark paid
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayoutId(payout.id);
                              setPayoutDialogOpen(true);
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold"
                          >
                            Manage payout
                          </button>
                          {payout.transactionReference ? (
                            <span className="inline-flex h-9 items-center rounded-xl border border-border/60 px-3 text-xs text-muted-foreground">
                              Ref: {payout.transactionReference}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminPanel>
          </section>
        ) : null}

        {activeDesk === "HISTORY" ? (
          <AdminPanel
            title="Commission ledger snapshot"
            description="Order-level commission deductions and seller net amounts."
          >
            {visibleCommissionRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No commission rows match the selected filters.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleCommissionRows.map((row) => (
                  <div
                    key={`${row.orderId}-${row.sellerSlug}`}
                    className="rounded-[16px] border border-border/60 bg-surface px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {row.orderNumber}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{row.sellerName}</span>
                          <span>{row.customerName}</span>
                          <span>{formatDate(row.createdAt)}</span>
                        </div>
                      </div>
                      <AdminPill tone={getLedgerTone(row.status)}>{row.status}</AdminPill>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      <MetricTile label="Gross" value={formatPKR(row.grossAmount)} />
                      <MetricTile label="Commission" value={formatPKR(row.commissionAmount)} />
                      <MetricTile label="Net" value={formatPKR(row.sellerNetAmount)} />
                      <MetricTile label="Rate" value={`${row.commissionRate.toFixed(1)}%`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        ) : null}
      </div>

      <PayoutAccountReviewDialog
        open={reviewDialogOpen}
        seller={selectedSeller}
        draft={reviewDraft}
        onOpenChange={setReviewDialogOpen}
        onDraftChange={setReviewDraft}
        onSave={handleSaveAccountReview}
      />

      <PayoutStatusDialog
        open={payoutDialogOpen}
        payout={selectedPayout}
        sellerName={
          selectedPayout
            ? state.sellersDirectory.find((seller) => seller.slug === selectedPayout.sellerSlug)
                ?.name
            : undefined
        }
        onOpenChange={setPayoutDialogOpen}
        onSave={handleSavePayout}
      />

      <SellerFinancialDialog
        open={sellerDetailSlug !== null}
        seller={selectedFinanceSeller}
        row={selectedFinanceRow}
        settlements={selectedFinanceSettlements}
        payouts={selectedFinancePayouts}
        remittances={selectedFinanceRemittances}
        onOpenChange={(open) => {
          if (!open) {
            setSellerDetailSlug(null);
          }
        }}
        onReviewAccount={() => {
          if (selectedFinanceSeller) {
            handleOpenAccountReview(selectedFinanceSeller);
          }
        }}
        onCreateBatch={() => {
          if (selectedFinanceSeller) {
            handleCreateSellerBatch(selectedFinanceSeller.slug);
          }
        }}
      />
    </AdminScopeGate>
  );
}

function FinanceDeskTabs({
  activeDesk,
  counts,
  onChange,
}: {
  activeDesk: FinanceDesk;
  counts: Record<FinanceDesk, number>;
  onChange: (desk: FinanceDesk) => void;
}) {
  const desks: Array<{
    key: FinanceDesk;
    label: string;
    helper: string;
  }> = [
    {
      key: "QUEUE",
      label: "Daily queue",
      helper: "seller dues and action items",
    },
    {
      key: "COD",
      label: "COD + ledger",
      helper: "cash receipt and settlement rows",
    },
    {
      key: "PAYOUTS",
      label: "Payout desk",
      helper: "approve, hold, and mark paid",
    },
    {
      key: "HISTORY",
      label: "History",
      helper: "commission and payout reporting",
    },
  ];

  return (
    <div className="sticky top-[58px] z-20 -mx-1 rounded-[22px] border border-border/60 bg-background/95 p-1.5 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
        {desks.map((desk) => {
          const active = activeDesk === desk.key;

          return (
            <button
              key={desk.key}
              type="button"
              onClick={() => onChange(desk.key)}
              className={cn(
                "flex min-h-14 items-center justify-between gap-3 rounded-[18px] px-3 py-2 text-left transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "bg-card text-foreground hover:bg-surface",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{desk.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[11px]",
                    active ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {desk.helper}
                </span>
              </span>
              <span
                className={cn(
                  "grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black tabular-nums",
                  active ? "bg-white/14 text-primary-foreground" : "bg-accent-soft text-accent",
                )}
              >
                {counts[desk.key]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SellerFinancialDialog({
  open,
  seller,
  row,
  settlements,
  payouts,
  remittances,
  onOpenChange,
  onReviewAccount,
  onCreateBatch,
}: {
  open: boolean;
  seller: SellerRecord | null;
  row: AdminSellerPaymentSummaryRow | null;
  settlements: SellerSettlement[];
  payouts: SellerPayout[];
  remittances: CODRemittance[];
  onOpenChange: (open: boolean) => void;
  onReviewAccount: () => void;
  onCreateBatch: () => void;
}) {
  const readySettlements = settlements.filter(
    (settlement) => settlement.settlementStatus === "READY_FOR_SETTLEMENT",
  );
  const openPayouts = payouts.filter((payout) =>
    ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PROCESSING", "HELD", "FAILED"].includes(
      payout.status,
    ),
  );
  const latestRemittance = remittances[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[min(96vw,980px)] max-w-none overflow-y-auto rounded-[26px] p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle>
            {seller ? `${seller.name} financial detail` : "Seller financial detail"}
          </DialogTitle>
          <DialogDescription>
            Account verification, settlement ledger, payout history, and COD remittance status in
            one review panel.
          </DialogDescription>
        </DialogHeader>

        {!seller || !row ? (
          <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Seller finance data is not available for this selection.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <MetricTile label="Gross" value={formatPKR(row.grossSales)} />
              <MetricTile label="Commission" value={formatPKR(row.platformCommission)} />
              <MetricTile label="Ready" value={formatPKR(row.readyForPayout)} />
              <MetricTile label="Processing" value={formatPKR(row.processingPayouts)} />
              <MetricTile label="Paid" value={formatPKR(row.paidOut)} />
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[18px] border border-border/60 bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-foreground">Payout account</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {seller.payoutAccount
                        ? describePayoutAccountDestination(seller.payoutAccount)
                        : "No payout account submitted"}
                    </div>
                  </div>
                  <AdminPill tone={getAccountTone(seller.payoutAccount?.status)}>
                    {formatPayoutLabel(seller.payoutAccount?.status ?? "NOT_SUBMITTED")}
                  </AdminPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onReviewAccount}
                    disabled={!seller.payoutAccount}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Review account
                  </button>
                  <button
                    type="button"
                    onClick={onCreateBatch}
                    disabled={readySettlements.length === 0}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create payout
                  </button>
                </div>
              </div>

              <div className="rounded-[18px] border border-border/60 bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-foreground">COD remittance</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {latestRemittance
                        ? `${formatPKR(latestRemittance.receivedAmount ?? latestRemittance.expectedAmount)} received / ${formatPKR(latestRemittance.expectedAmount)} expected`
                        : "No COD remittance records for this seller"}
                    </div>
                  </div>
                  {latestRemittance ? (
                    <AdminPill tone={getRemittanceTone(latestRemittance.status)}>
                      {formatPayoutLabel(latestRemittance.status)}
                    </AdminPill>
                  ) : null}
                </div>
                {latestRemittance?.adminNote ? (
                  <div className="mt-2 rounded-xl bg-card px-3 py-2 text-xs text-muted-foreground">
                    {latestRemittance.adminNote}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-[18px] border border-border/60 bg-card p-3">
                <div className="mb-2 text-sm font-black text-foreground">Recent settlements</div>
                <div className="space-y-2">
                  {settlements.slice(0, 6).map((settlement) => {
                    return (
                      <div
                        key={settlement.id}
                        className="flex items-start justify-between gap-3 rounded-xl bg-surface px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-foreground">
                            {settlement.productTitle}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatPKR(settlement.netPayableAmount)} net ·{" "}
                            {formatPKR(settlement.commissionAmount)} commission
                          </div>
                        </div>
                        <AdminPill tone={getSettlementTone(settlement.settlementStatus)}>
                          {formatPayoutLabel(settlement.settlementStatus)}
                        </AdminPill>
                      </div>
                    );
                  })}
                  {settlements.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No settlement rows yet.</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[18px] border border-border/60 bg-card p-3">
                <div className="mb-2 text-sm font-black text-foreground">Payout history</div>
                <div className="space-y-2">
                  {payouts.slice(0, 6).map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-surface px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {payout.id}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatPKR(payout.netAmount)} · {describePayoutRecordDestination(payout)}
                        </div>
                      </div>
                      <AdminPill tone={getPayoutTone(payout.status)}>
                        {formatPayoutLabel(payout.status)}
                      </AdminPill>
                    </div>
                  ))}
                  {payouts.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No payout records yet.</div>
                  ) : null}
                  {openPayouts.length > 0 ? (
                    <div className="rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
                      {openPayouts.length} payout record{openPayouts.length === 1 ? "" : "s"} still
                      require finance action.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SellerFinanceRow({
  row,
  onOpenDetails,
  onCreateBatch,
}: {
  row: AdminSellerPaymentSummaryRow;
  onOpenDetails: () => void;
  onCreateBatch: () => void;
}) {
  const openPayoutAmount =
    row.readyForPayout + row.scheduledPayouts + row.processingPayouts + row.heldPayouts;

  return (
    <div className="rounded-[16px] border border-border/60 bg-surface px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{row.sellerName}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{row.orderCount} orders</span>
            {row.nextPayoutDate ? (
              <span>Next cycle {formatDate(row.nextPayoutDate)}</span>
            ) : (
              <span>No cycle scheduled</span>
            )}
          </div>
        </div>
        <AdminPill
          tone={
            row.awaitingVerification > 0 ? "warning" : openPayoutAmount > 0 ? "info" : "success"
          }
        >
          {row.awaitingVerification > 0
            ? "Verification pending"
            : openPayoutAmount > 0
              ? "Payout open"
              : "Balanced"}
        </AdminPill>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-5">
        <MetricTile label="Gross" value={formatPKR(row.grossSales)} />
        <MetricTile label="Commission" value={formatPKR(row.platformCommission)} />
        <MetricTile label="Awaiting" value={formatPKR(row.awaitingVerification)} />
        <MetricTile label="Open payout" value={formatPKR(openPayoutAmount)} />
        <MetricTile label="Paid out" value={formatPKR(row.paidOut)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenDetails}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold"
        >
          Seller finance detail
        </button>
      </div>

      {row.awaitingVerification > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-warning/20 bg-warning/5 px-3 py-2.5">
          <div className="text-xs text-muted-foreground">
            Verification is pending for this seller. Open the payment desk to approve or reject
            proofs.
          </div>
          <Link
            href={`/admin/payments?desk=MANUAL&seller=${encodeURIComponent(row.sellerSlug)}`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background"
          >
            Review payments
          </Link>
        </div>
      ) : row.readyForPayout > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-success/20 bg-success/5 px-3 py-2.5">
          <div className="text-xs text-muted-foreground">
            Verified settlements are ready. Create a payout batch directly from the settlement
            ledger.
          </div>
          <button
            type="button"
            onClick={onCreateBatch}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background"
          >
            Create payout batch
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PayoutAccountRow({ seller, onReview }: { seller: SellerRecord; onReview: () => void }) {
  const payoutAccount = seller.payoutAccount!;

  return (
    <div className="rounded-[16px] border border-border/60 bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-foreground">{seller.name}</div>
            <AdminPill tone={getAccountTone(payoutAccount.status)}>
              {formatPayoutLabel(payoutAccount.status)}
            </AdminPill>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{formatPayoutLabel(payoutAccount.method)}</span>
            <span>{describePayoutAccountDestination(payoutAccount)}</span>
            <span>{formatPayoutLabel(payoutAccount.schedulePreference)}</span>
          </div>
          {payoutAccount.adminNote ? (
            <div className="mt-2 text-xs text-muted-foreground">{payoutAccount.adminNote}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onReview}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border/60 bg-card px-3 text-xs font-semibold"
        >
          Review
        </button>
      </div>
    </div>
  );
}

function FlowMetric({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border px-3 py-3",
        tone === "warning" ? "border-warning/25 bg-warning/5" : "border-border/60 bg-surface",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{helper}</div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function getLedgerTone(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "CANCELED") {
    return "danger" as const;
  }

  if (status === "READY") {
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

function getRemittanceTone(status: string) {
  if (status === "REMITTANCE_CONFIRMED") {
    return "success" as const;
  }

  if (status === "ISSUE_FLAGGED") {
    return "danger" as const;
  }

  if (status === "REMITTED_TO_MARKETPLACE" || status === "CASH_COLLECTED_BY_PARTNER") {
    return "info" as const;
  }

  return "warning" as const;
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

function getAccountPriority(status?: string) {
  if (status === "PENDING_REVIEW") {
    return 0;
  }

  if (status === "REJECTED") {
    return 1;
  }

  if (status === "UNVERIFIED") {
    return 2;
  }

  if (status === "NOT_SUBMITTED") {
    return 3;
  }

  return 4;
}

function matchesFinanceText(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function matchesRange(dateString: string, range: PaymentDashboardRange) {
  if (range === "ALL") {
    return true;
  }

  const now = Date.now();
  const target = new Date(dateString).getTime();
  const days = range === "30D" ? 30 : range === "90D" ? 90 : 365;

  return target >= now - days * 24 * 60 * 60 * 1000;
}
