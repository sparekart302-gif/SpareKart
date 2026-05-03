"use client";

import { ShieldCheck } from "lucide-react";
import { AdminField } from "@/components/admin/AdminCommon";
import { MultipleImageUploadField } from "@/components/uploads/ImageUploadField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ManagedCategory,
  ManagedProductInput,
  ProductModerationStatus,
} from "@/modules/marketplace/types";

const moderationStatuses: ProductModerationStatus[] = ["ACTIVE", "DRAFT", "FLAGGED", "INACTIVE"];

export function ProductModerationDialog({
  open,
  draft,
  tagInput,
  categories,
  sellerName,
  onOpenChange,
  onDraftChange,
  onTagInputChange,
  onSave,
  onFlag,
}: {
  open: boolean;
  draft: ManagedProductInput | null;
  tagInput: string;
  categories: ManagedCategory[];
  sellerName?: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (next: ManagedProductInput) => void;
  onTagInputChange: (value: string) => void;
  onSave: () => void;
  onFlag: () => void;
}) {
  if (!draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">
            Product Moderation
          </DialogTitle>
          <DialogDescription>
            Adjust marketplace visibility, category mapping, and discovery tags without editing
            seller-owned pricing or inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                Seller-owned listing
              </div>
              <h2 className="mt-1 text-xl font-black text-foreground">{draft.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sellerName ?? draft.sellerSlug} · {draft.brand} · {draft.sku}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Marketplace controls
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Moderation status">
                  <select
                    value={draft.moderationStatus}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        moderationStatus: event.target.value as ProductModerationStatus,
                      })
                    }
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  >
                    {moderationStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </AdminField>

                <AdminField label="Review required">
                  <select
                    value={draft.reviewRequired ? "yes" : "no"}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        reviewRequired: event.target.value === "yes",
                      })
                    }
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </AdminField>
              </div>

              <AdminField label="Category">
                <select
                  value={draft.category}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      category: event.target.value,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </AdminField>

              <AdminField
                label="Discovery tags"
                hint="Comma-separated search and taxonomy support tags."
              >
                <input
                  value={tagInput}
                  onChange={(event) => onTagInputChange(event.target.value)}
                  placeholder="brake, pads, toyota, corolla"
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                />
              </AdminField>

              <AdminField
                label="Commission override (%)"
                hint="Optional product-level override. Leave empty to use the category rate."
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draft.commissionRateOverride ?? ""}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      commissionRateOverride: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Use category rate"
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                />
              </AdminField>

              <MultipleImageUploadField
                label="Product gallery"
                values={draft.images}
                kind="product"
                ownerHint={draft.id || draft.slug || draft.title}
                onChange={(images) =>
                  onDraftChange({
                    ...draft,
                    images,
                  })
                }
                helperText="Replace or clean up listing imagery during moderation. First image remains the main card image."
                previewClassName="aspect-[4/3]"
              />
            </section>

            <section className="space-y-4">
              <div className="rounded-[18px] border border-border/60 p-4">
                <div className="text-sm font-black text-foreground">Listing health</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <HealthChip label="Images" active={draft.images.length > 0} />
                  <HealthChip
                    label="Category mapped"
                    active={Boolean(
                      categories.find((category) => category.slug === draft.category),
                    )}
                  />
                  <HealthChip label="Discovery tags" active={normalizeTags(tagInput).length >= 2} />
                  <HealthChip label="Badge set" active={Boolean(draft.badge)} />
                </div>
              </div>

              <div className="rounded-[18px] border border-border/60 p-4">
                <div className="text-sm font-black text-foreground">Seller-controlled data</div>
                <div className="mt-3 divide-y divide-border/60">
                  <SummaryRow label="Price" value={String(draft.price)} />
                  <SummaryRow label="Stock" value={String(draft.stock)} />
                  <SummaryRow label="Slug" value={draft.slug} />
                  <SummaryRow label="Badge" value={draft.badge ?? "No badge"} />
                  <SummaryRow label="Tag count" value={String(normalizeTags(tagInput).length)} />
                  <SummaryRow
                    label="Commission"
                    value={
                      draft.commissionRateOverride
                        ? `${draft.commissionRateOverride}% override`
                        : "Category default"
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t border-border bg-card px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border/60 px-5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onFlag}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-destructive/10 px-5 text-sm font-semibold text-destructive"
          >
            Flag product
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Save changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HealthChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`rounded-[14px] border px-3 py-2 text-sm font-semibold ${
        active
          ? "border-success/20 bg-success/5 text-success"
          : "border-border/60 text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
