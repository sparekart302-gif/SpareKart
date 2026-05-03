"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import {
  AdminCompactStat,
  AdminField,
  AdminKeyValue,
  AdminScopeGate,
} from "@/components/admin/AdminCommon";
import { AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminUI";
import {
  OperationsDetailPanel,
  OperationsMobileCard,
  OperationsMobileList,
  OperationsPager,
  OperationsPanel,
  OperationsRow,
  OperationsSearch,
  OperationsTable,
  OperationsTd,
  OperationsTh,
  OperationsToolbar,
  OperationsWorkspace,
} from "@/components/admin/OperationsUI";
import {
  getManagedInventoryRows,
  getSellerRecordBySlug,
} from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import { formatPKR } from "@/data/marketplace";

const INVENTORY_PER_PAGE = 12;

export default function AdminInventoryPage() {
  const { currentUser, state, adjustInventoryRecord } = useMarketplace();
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    return getManagedInventoryRows(state).filter(({ product }) => {
      const searchable =
        `${product.title} ${product.sku} ${product.brand} ${product.sellerSlug}`.toLowerCase();
      return !query.trim() || searchable.includes(query.trim().toLowerCase());
    });
  }, [query, state]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedProductId("");
      return;
    }

    if (!rows.some((row) => row.product.id === selectedProductId)) {
      setSelectedProductId(rows[0].product.id);
    }
  }, [rows, selectedProductId]);

  const selectedRow = rows.find((row) => row.product.id === selectedProductId);
  const selectedSeller = selectedRow
    ? getSellerRecordBySlug(state, selectedRow.product.sellerSlug)
    : undefined;
  const lowStockCount = rows.filter(
    (row) => row.inventory.available > 0 && row.inventory.available <= 5,
  ).length;
  const outOfStockCount = rows.filter((row) => row.inventory.available === 0).length;
  const affectedSellers = new Set(
    rows.filter((row) => row.inventory.available <= 5).map((row) => row.product.sellerSlug),
  ).size;
  const totalPages = Math.max(Math.ceil(rows.length / INVENTORY_PER_PAGE), 1);
  const paginatedRows = rows.slice((page - 1) * INVENTORY_PER_PAGE, page * INVENTORY_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <AdminScopeGate scope="inventory" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Inventory oversight"
          title="Seller inventory monitoring and stock integrity"
          description="Track stock risk across seller catalogs, surface low-stock alerts, and apply auditable integrity corrections only when a verified marketplace discrepancy requires intervention."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat
            label="Tracked SKUs"
            value={String(rows.length)}
            helper="Seller-owned inventory records"
          />
          <AdminCompactStat
            label="Low stock"
            value={String(lowStockCount)}
            helper="At or below 5 units"
            tone="warning"
          />
          <AdminCompactStat
            label="Out of stock"
            value={String(outOfStockCount)}
            helper="Need replenishment"
            tone="danger"
          />
          <AdminCompactStat
            label="Affected sellers"
            value={String(affectedSellers)}
            helper="Sellers with stock pressure"
          />
        </section>

        <OperationsWorkspace>
          <OperationsPanel
            title="Cross-seller stock monitor"
            description="Admins monitor platform stock integrity, while sellers remain the primary owners of inventory updates."
          >
            <OperationsToolbar>
              <OperationsSearch
                value={query}
                onChange={setQuery}
                placeholder="Search by product, SKU, brand, or seller"
              />
              <div className="text-xs font-semibold text-muted-foreground lg:text-right">
                {rows.length} tracked records
              </div>
            </OperationsToolbar>

            <OperationsTable minWidth="760px">
              <thead>
                <tr>
                  <OperationsTh>Product</OperationsTh>
                  <OperationsTh>Seller</OperationsTh>
                  <OperationsTh>Available</OperationsTh>
                  <OperationsTh className="text-right">Stock value</OperationsTh>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(({ product, inventory }) => {
                  const seller = getSellerRecordBySlug(state, product.sellerSlug);
                  return (
                    <OperationsRow
                      key={product.id}
                      selected={selectedProductId === product.id}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <OperationsTd>
                        <div className="font-semibold text-foreground">{product.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{product.sku}</div>
                      </OperationsTd>
                      <OperationsTd>
                        <div className="text-sm font-semibold text-foreground">
                          {seller?.name ?? product.sellerSlug}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {seller?.city ?? "Seller record"}
                        </div>
                      </OperationsTd>
                      <OperationsTd>
                        <AdminPill
                          tone={
                            inventory.available === 0
                              ? "danger"
                              : inventory.available <= 5
                                ? "warning"
                                : "success"
                          }
                        >
                          {inventory.available}
                        </AdminPill>
                      </OperationsTd>
                      <OperationsTd className="text-right font-black tabular-nums">
                        {formatPKR(product.price * inventory.available)}
                      </OperationsTd>
                    </OperationsRow>
                  );
                })}
              </tbody>
            </OperationsTable>

            <OperationsMobileList>
              {paginatedRows.map(({ product, inventory }) => {
                const seller = getSellerRecordBySlug(state, product.sellerSlug);
                return (
                  <OperationsMobileCard
                    key={product.id}
                    selected={selectedProductId === product.id}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-black text-foreground">
                          {product.title}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {seller?.name ?? product.sellerSlug} · {product.sku}
                        </div>
                      </div>
                      <AdminPill
                        tone={
                          inventory.available === 0
                            ? "danger"
                            : inventory.available <= 5
                              ? "warning"
                              : "success"
                        }
                      >
                        {inventory.available}
                      </AdminPill>
                    </div>
                    <div className="mt-2 text-xs font-bold text-muted-foreground">
                      Stock value: {formatPKR(product.price * inventory.available)}
                    </div>
                  </OperationsMobileCard>
                );
              })}
            </OperationsMobileList>

            <OperationsPager
              page={page}
              totalPages={totalPages}
              totalItems={rows.length}
              pageSize={INVENTORY_PER_PAGE}
              onPageChange={setPage}
            />
          </OperationsPanel>

          <OperationsDetailPanel
            title={selectedRow ? selectedRow.product.title : "Inventory detail"}
            subtitle={
              selectedRow
                ? `${selectedSeller?.name ?? selectedRow.product.sellerSlug} · ${selectedRow.product.sku}`
                : "Select a stock record to inspect and correct."
            }
            meta={
              selectedRow ? (
                <>
                  <AdminPill
                    tone={
                      selectedRow.inventory.available === 0
                        ? "danger"
                        : selectedRow.inventory.available <= 5
                          ? "warning"
                          : "success"
                    }
                  >
                    {selectedRow.inventory.available} available
                  </AdminPill>
                  <AdminPill>{selectedRow.product.category}</AdminPill>
                  <AdminPill tone="info">{selectedRow.product.brand}</AdminPill>
                </>
              ) : null
            }
          >
            <div className="space-y-3">
              <AdminPanel
                title="Selected inventory record"
                description="Inventory ownership stays with the seller. Admin edits should only correct verified integrity issues."
              >
                {!selectedRow ? (
                  <div className="text-sm text-muted-foreground">
                    Select a product to inspect stock health and audit history.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <AdminKeyValue
                        label="Seller"
                        value={selectedSeller?.name ?? selectedRow.product.sellerSlug}
                      />
                      <AdminKeyValue
                        label="Seller status"
                        value={selectedSeller?.status.replaceAll("_", " ") ?? "Unknown"}
                      />
                      <AdminKeyValue
                        label="Current stock"
                        value={String(selectedRow.inventory.available)}
                      />
                      <AdminKeyValue
                        label="Unit price"
                        value={formatPKR(selectedRow.product.price)}
                      />
                      <AdminKeyValue
                        label="Stock value"
                        value={formatPKR(
                          selectedRow.product.price * selectedRow.inventory.available,
                        )}
                      />
                      <AdminKeyValue
                        label="Last update"
                        value={
                          selectedRow.inventory.updatedAt
                            ? new Date(selectedRow.inventory.updatedAt).toLocaleString()
                            : "Seeded inventory"
                        }
                      />
                    </div>
                  </div>
                )}
              </AdminPanel>

              <AdminPanel
                title="Integrity correction"
                description="Use only when investigating a verified discrepancy. Every correction is logged for audit review."
              >
                {!selectedRow ? (
                  <div className="text-sm text-muted-foreground">
                    Select a product before applying a stock correction.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-[14px] bg-warning/10 px-3 py-2 text-xs leading-5 text-warning-foreground">
                      Sellers manage their own inventory. Admin corrections should be exceptional
                      and tied to a documented marketplace integrity issue.
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[0.42fr_1fr]">
                      <AdminField label="Quantity delta">
                        <input
                          type="number"
                          value={delta}
                          onChange={(event) => setDelta(Number(event.target.value) || 0)}
                          className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:outline-none"
                        />
                      </AdminField>
                      <AdminField label="Reason note" hint="Required for audit clarity.">
                        <input
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm focus:outline-none"
                        />
                      </AdminField>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          adjustInventoryRecord({
                            productId: selectedRow.product.id,
                            quantityDelta: delta,
                            note,
                          });
                          toast.success("Inventory integrity correction saved.");
                          setDelta(0);
                          setNote("");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Unable to save inventory correction.",
                          );
                        }
                      }}
                      disabled={delta === 0 || !note.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Save correction
                    </button>
                  </div>
                )}
              </AdminPanel>

              <AdminPanel title="Recent stock movements">
                <div className="space-y-2">
                  {state.inventoryMovements
                    .filter(
                      (movement) => !selectedProductId || movement.productId === selectedProductId,
                    )
                    .slice()
                    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                    .slice(0, 6)
                    .map((movement) => {
                      const product = state.managedProducts.find(
                        (item) => item.id === movement.productId,
                      );
                      return (
                        <div
                          key={movement.id}
                          className="rounded-xl border border-border/60 bg-background px-3 py-2"
                        >
                          <div className="text-sm font-bold text-foreground">
                            {product?.title ?? movement.productId}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {movement.reason.replaceAll("_", " ")} ·{" "}
                            {new Date(movement.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-foreground">
                            {movement.beforeQty} → {movement.afterQty} (
                            {movement.quantityDelta > 0 ? "+" : ""}
                            {movement.quantityDelta})
                          </div>
                        </div>
                      );
                    })}
                </div>
              </AdminPanel>

              <AdminPanel title="Low-stock seller alerts">
                <div className="space-y-2">
                  {rows
                    .filter((row) => row.inventory.available <= 5)
                    .slice(0, 6)
                    .map((row) => {
                      const seller = getSellerRecordBySlug(state, row.product.sellerSlug);
                      return (
                        <div
                          key={row.product.id}
                          className="rounded-xl border border-border/60 bg-background px-3 py-2"
                        >
                          <div className="flex items-start gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                              {row.inventory.available === 0 ? (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              ) : (
                                <Store className="h-4 w-4 text-warning" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="line-clamp-2 text-sm font-bold text-foreground">
                                {row.product.title}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {seller?.name ?? row.product.sellerSlug} · {row.inventory.available}{" "}
                                left
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </AdminPanel>
            </div>
          </OperationsDetailPanel>
        </OperationsWorkspace>
      </div>
    </AdminScopeGate>
  );
}
