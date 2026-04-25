"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Truck } from "lucide-react";
import { AdminCompactStat, AdminScopeGate } from "@/components/admin/AdminCommon";
import { AdminEmptyState, AdminPageHeader, AdminPill } from "@/components/admin/AdminUI";
import {
  OperationsDetailPanel,
  OperationsKeyValue,
  OperationsMobileCard,
  OperationsMobileList,
  OperationsPager,
  OperationsPanel,
  OperationsRow,
  OperationsSearch,
  OperationsSelect,
  OperationsTable,
  OperationsTabs,
  OperationsTd,
  OperationsTh,
  OperationsToolbar,
  OperationsWorkspace,
} from "@/components/admin/OperationsUI";
import {
  OrderTimeline,
  SellerFulfillmentGrid,
} from "@/components/marketplace/OrderProgressUI";
import { getCommissionRowsForOrder, getCommissionSummary } from "@/modules/marketplace/admin-selectors";
import { getOrderTimeline } from "@/modules/marketplace/selectors";
import { getCODRemittanceByOrderId } from "@/modules/marketplace/settlements";
import { useMarketplace } from "@/modules/marketplace/store";
import type { MarketplaceOrder, OrderStatus, PaymentStatus } from "@/modules/marketplace/types";
import { formatPKR } from "@/data/marketplace";

const orderStatuses: Array<OrderStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "AWAITING_PAYMENT_PROOF",
  "AWAITING_PAYMENT_VERIFICATION",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
];

const ORDERS_PER_PAGE = 12;

export default function AdminOrdersPage() {
  const { currentUser, state } = useMarketplace();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(() => {
    return state.orders
      .filter((order) => {
        const customer = state.users.find((user) => user.id === order.customerUserId);
        const searchable = `${order.orderNumber} ${customer?.name ?? ""} ${customer?.email ?? ""} ${order.items.map((item) => item.title).join(" ")}`.toLowerCase();
        return (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
          (statusFilter === "ALL" || order.status === statusFilter);
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [query, state.orders, state.users, statusFilter]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId("");
      return;
    }
    if (!filteredOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId);
  const selectedPayment = selectedOrder ? state.payments.find((payment) => payment.id === selectedOrder.paymentId) : undefined;
  const selectedCustomer = selectedOrder ? state.users.find((user) => user.id === selectedOrder.customerUserId) : undefined;
  const selectedCommissionRows = selectedOrder ? getCommissionRowsForOrder(state, selectedOrder.id) : [];
  const selectedSettlements = selectedOrder
    ? state.sellerSettlements.filter((settlement) => settlement.orderId === selectedOrder.id)
    : [];
  const selectedPayouts = selectedOrder
    ? state.sellerPayouts.filter((payout) => payout.orderIds.includes(selectedOrder.id))
    : [];
  const selectedRemittance = selectedOrder
    ? getCODRemittanceByOrderId(state, selectedOrder.id)
    : undefined;
  const selectedTimeline = selectedOrder ? getOrderTimeline(state, selectedOrder.id).slice(0, 8) : [];
  const commissionSummary = getCommissionSummary(state);
  const totalPages = Math.max(Math.ceil(filteredOrders.length / ORDERS_PER_PAGE), 1);
  const paginatedOrders = filteredOrders.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE);
  const totals = {
    total: state.orders.length,
    active: state.orders.filter((order) => !["DELIVERED", "CANCELED"].includes(order.status)).length,
    awaitingVerification: state.orders.filter((order) => order.status === "AWAITING_PAYMENT_VERIFICATION").length,
    delivered: state.orders.filter((order) => order.status === "DELIVERED").length,
    commission: commissionSummary.totalCommission,
  };

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  return (
    <AdminScopeGate scope="orders" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Order management"
          title="Order operations and fulfilment oversight"
          description="Search the marketplace order pipeline, inspect seller handoffs, and monitor lifecycle progress without taking over seller-owned shipping actions."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat label="All orders" value={String(totals.total)} helper="Marketplace total" />
          <AdminCompactStat label="Open orders" value={String(totals.active)} helper="Still active in the pipeline" tone="warning" />
          <AdminCompactStat label="Awaiting verification" value={String(totals.awaitingVerification)} helper="Manual payment orders" />
          <AdminCompactStat label="Commission tracked" value={formatPKR(totals.commission)} helper="Marketplace share across orders" tone="success" />
        </section>

        <OperationsWorkspace>
          <OperationsPanel title="Order queue" description="Status-first order operations with search, pagination, and side-panel inspection.">
            <OperationsToolbar>
              <div className="grid gap-2">
                <OperationsTabs
                  active={statusFilter}
                  onChange={(value) => setStatusFilter(value as OrderStatus | "ALL")}
                  tabs={orderStatuses.map((status) => ({
                    value: status,
                    label: status === "ALL" ? "All" : status.replaceAll("_", " "),
                    count:
                      status === "ALL"
                        ? state.orders.length
                        : state.orders.filter((order) => order.status === status).length,
                  }))}
                />
                <OperationsSearch value={query} onChange={setQuery} placeholder="Search orders, customers, or products" />
              </div>
              <OperationsSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as OrderStatus | "ALL")}
                label="Status"
              >
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : status.replaceAll("_", " ")}
                  </option>
                ))}
              </OperationsSelect>
            </OperationsToolbar>

            <OperationsTable minWidth="860px">
              <thead>
                <tr>
                  <OperationsTh>Order</OperationsTh>
                  <OperationsTh>Customer</OperationsTh>
                  <OperationsTh>Primary status</OperationsTh>
                  <OperationsTh>Payment</OperationsTh>
                  <OperationsTh className="text-right">Total</OperationsTh>
                  <OperationsTh className="text-right">Commission</OperationsTh>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const payment = state.payments.find((item) => item.id === order.paymentId);
                  const customer = state.users.find((user) => user.id === order.customerUserId);
                  const commissionAmount = getCommissionRowsForOrder(state, order.id).reduce(
                    (sum, row) => sum + row.commissionAmount,
                    0,
                  );

                  return (
                    <OperationsRow
                      key={order.id}
                      selected={selectedOrderId === order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <OperationsTd>
                        <div className="font-black text-foreground">{order.orderNumber}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</div>
                      </OperationsTd>
                      <OperationsTd>
                        <div className="font-semibold text-foreground">{customer?.name ?? "Customer"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{customer?.email ?? order.shippingAddress.city}</div>
                      </OperationsTd>
                      <OperationsTd>
                        <OrderTone status={order.status} />
                      </OperationsTd>
                      <OperationsTd>
                        <div className="flex flex-col gap-1">
                          {payment ? <PaymentTone status={payment.status} /> : null}
                          <span className="text-xs text-muted-foreground">{payment?.method.replaceAll("_", " ") ?? order.paymentMethod}</span>
                        </div>
                      </OperationsTd>
                      <OperationsTd className="text-right font-black tabular-nums text-foreground">{formatPKR(order.totals.total)}</OperationsTd>
                      <OperationsTd className="text-right font-semibold tabular-nums text-muted-foreground">{formatPKR(commissionAmount)}</OperationsTd>
                    </OperationsRow>
                  );
                })}
              </tbody>
            </OperationsTable>

            <OperationsMobileList>
              {paginatedOrders.map((order) => {
                const payment = state.payments.find((item) => item.id === order.paymentId);
                const customer = state.users.find((user) => user.id === order.customerUserId);
                return (
                  <OperationsMobileCard
                    key={order.id}
                    selected={selectedOrderId === order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-foreground">{order.orderNumber}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{customer?.name ?? order.shippingAddress.fullName}</div>
                      </div>
                      <div className="text-right text-sm font-black tabular-nums text-foreground">{formatPKR(order.totals.total)}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <OrderTone status={order.status} />
                      {payment ? <PaymentTone status={payment.status} /> : null}
                    </div>
                  </OperationsMobileCard>
                );
              })}
            </OperationsMobileList>

            {filteredOrders.length === 0 ? (
              <div className="p-3">
                <AdminEmptyState title="No orders found" body="Try adjusting the search or status filter." />
              </div>
            ) : null}

            <OperationsPager
              page={page}
              totalPages={totalPages}
              totalItems={filteredOrders.length}
              pageSize={ORDERS_PER_PAGE}
              onPageChange={setPage}
            />
          </OperationsPanel>

          <OperationsDetailPanel
            title={selectedOrder ? selectedOrder.orderNumber : "Order detail"}
            subtitle={
              selectedCustomer
                ? `${selectedCustomer.name} · ${selectedCustomer.email}`
                : "Select an order to inspect payment, seller fulfilment, and financial state."
            }
            meta={
              selectedOrder && selectedPayment ? (
                <>
                  <OrderTone status={selectedOrder.status} />
                  <PaymentTone status={selectedPayment.status} />
                </>
              ) : null
            }
            actions={
              selectedOrder && selectedPayment && selectedCustomer ? (
                <button
                  type="button"
                  onClick={() => downloadInvoice(selectedOrder, selectedPayment, selectedCustomer)}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border/70 px-3 text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Invoice
                </button>
              ) : null
            }
            empty={<AdminEmptyState title="Select an order" body="Choose an order from the queue to open operational details." />}
          >
            {!selectedOrder || !selectedPayment || !selectedCustomer ? (
              null
            ) : (
              <div className="space-y-4">
                <section className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[14px] border border-border/70 bg-background p-3">
                    <div className="text-sm font-bold text-foreground">Shipping and customer</div>
                    <div className="mt-2">
                      <OperationsKeyValue label="Customer" value={selectedCustomer.name} />
                      <OperationsKeyValue label="Phone" value={selectedCustomer.phone} />
                      <OperationsKeyValue label="Address" value={`${selectedOrder.shippingAddress.addressLine}, ${selectedOrder.shippingAddress.city}`} />
                      <OperationsKeyValue label="Province" value={selectedOrder.shippingAddress.province} />
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-border/70 bg-background p-3">
                    <div className="text-sm font-bold text-foreground">Payment and totals</div>
                    <div className="mt-2">
                      <OperationsKeyValue label="Payment method" value={selectedPayment.method.replaceAll("_", " ")} />
                      <OperationsKeyValue label="Payment status" value={selectedPayment.status.replaceAll("_", " ")} />
                      <OperationsKeyValue
                        label="COD remittance"
                        value={selectedRemittance ? selectedRemittance.status.replaceAll("_", " ") : "Not applicable"}
                      />
                      <OperationsKeyValue label="Subtotal" value={formatPKR(selectedOrder.totals.subtotal)} />
                      <OperationsKeyValue label="Shipping" value={formatPKR(selectedOrder.totals.shipping)} />
                      <OperationsKeyValue label="Total" value={formatPKR(selectedOrder.totals.total)} />
                      <OperationsKeyValue
                        label="Platform commission"
                        value={formatPKR(
                          selectedCommissionRows.reduce((sum, row) => sum + row.commissionAmount, 0),
                        )}
                      />
                    </div>
                  </div>
                </section>

                <div className="rounded-[14px] border border-border/70 bg-background p-3">
                  <div className="text-sm font-bold text-foreground">Items in this order</div>
                  <div className="mt-2 space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={`${selectedOrder.id}-${item.productId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3 py-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{item.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.brand} · {item.sku} · {item.sellerSlug}
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold text-foreground">
                          {item.quantity} × {formatPKR(item.unitPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <section className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[14px] border border-border/70 bg-background p-3">
                    <div className="text-sm font-bold text-foreground">Commission breakdown</div>
                    <div className="mt-2 space-y-2">
                      {selectedCommissionRows.map((row) => (
                        <div key={`${row.orderId}-${row.sellerSlug}`} className="rounded-xl border border-border/60 bg-card px-3 py-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground">{row.sellerName}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatPKR(row.grossAmount)} gross · {row.status.replaceAll("_", " ")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-foreground">{formatPKR(row.commissionAmount)}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{row.commissionRate}% commission</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-border/70 bg-background p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Truck className="h-4 w-4 text-accent" />
                      Seller fulfilment handoff
                    </div>
                    <div className="mt-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
                      Admins verify payments and monitor progress. Sellers own the transition from confirmed to processing, shipped, delivered, or canceled.
                    </div>
                    <div className="mt-4">
                      <SellerFulfillmentGrid
                        state={state}
                        fulfillments={selectedOrder.sellerFulfillments}
                      />
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[14px] border border-border/70 bg-background p-3">
                    <div className="text-sm font-bold text-foreground">Settlement ledger</div>
                    <div className="mt-2 space-y-2">
                      {selectedSettlements.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No settlement entries created yet.
                        </div>
                      ) : (
                        selectedSettlements.map((settlement) => (
                          <div
                            key={settlement.id}
                            className="rounded-xl border border-border/60 bg-card px-3 py-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {settlement.productTitle}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {settlement.sellerSlug} · {settlement.financialSourceType}
                                </div>
                              </div>
                              <AdminPill tone={getSettlementTone(settlement.settlementStatus)}>
                                {settlement.settlementStatus.replaceAll("_", " ")}
                              </AdminPill>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-4">
                              <MetricStat label="Gross" value={formatPKR(settlement.grossSaleAmount)} />
                              <MetricStat label="Commission" value={formatPKR(settlement.commissionAmount)} />
                              <MetricStat label="Fees" value={formatPKR(settlement.feeAmount)} />
                              <MetricStat label="Net" value={formatPKR(settlement.netPayableAmount)} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-border/70 bg-background p-3">
                    <div className="text-sm font-bold text-foreground">Payout linkage</div>
                    <div className="mt-2 space-y-2">
                      {selectedPayouts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No payout batch is linked to this order yet.
                        </div>
                      ) : (
                        selectedPayouts.map((payout) => (
                          <div
                            key={payout.id}
                            className="rounded-xl border border-border/60 bg-card px-3 py-2"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-foreground">{payout.id}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {payout.sellerSlug} · {payout.payoutMethod?.replaceAll("_", " ") ?? "Payout destination pending"}
                                </div>
                              </div>
                              <AdminPill tone={getPayoutTone(payout.status)}>
                                {payout.status.replaceAll("_", " ")}
                              </AdminPill>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              <MetricStat label="Net payout" value={formatPKR(payout.netAmount)} />
                              <MetricStat label="Commission" value={formatPKR(payout.totalCommissionDeducted)} />
                              <MetricStat label="Reference" value={payout.transactionReference ?? "Not recorded"} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                <div className="rounded-[14px] border border-border/70 bg-background p-3">
                  <div className="text-sm font-bold text-foreground">Order timeline</div>
                  <div className="mt-4">
                    <OrderTimeline items={selectedTimeline} />
                  </div>
                </div>
              </div>
            )}
          </OperationsDetailPanel>
        </OperationsWorkspace>
      </div>
    </AdminScopeGate>
  );
}

function OrderTone({ status }: { status: OrderStatus }) {
  const tone =
    status === "DELIVERED"
      ? "success"
      : status === "CANCELED" || status === "RETURNED"
        ? "danger"
        : status === "AWAITING_PAYMENT_VERIFICATION"
          ? "warning"
          : "info";
  return <AdminPill tone={tone}>{status.replaceAll("_", " ")}</AdminPill>;
}

function PaymentTone({ status }: { status: PaymentStatus }) {
  const tone =
    status === "PAID"
      ? "success"
      : status === "REJECTED" || status === "FAILED" || status === "REFUNDED"
        ? "danger"
        : status === "UNDER_REVIEW" || status === "PROOF_SUBMITTED"
          ? "warning"
          : "default";
  return <AdminPill tone={tone}>{status.replaceAll("_", " ")}</AdminPill>;
}

function downloadInvoice(order: MarketplaceOrder, payment: { method: string; status: string }, customer: { name: string; email: string }) {
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

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
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

function getPayoutTone(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "FAILED" || status === "HELD" || status === "CANCELED") {
    return "danger" as const;
  }

  if (status === "APPROVED" || status === "PROCESSING") {
    return "info" as const;
  }

  return "warning" as const;
}
