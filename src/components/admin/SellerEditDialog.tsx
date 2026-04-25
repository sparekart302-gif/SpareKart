"use client";

import { ShieldCheck } from "lucide-react";
import { AdminField } from "@/components/admin/AdminCommon";
import { SingleImageUploadField } from "@/components/uploads/ImageUploadField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SellerRecord, SellerStatus, SellerTier } from "@/modules/marketplace/types";

const sellerStatuses: SellerStatus[] = [
  "ACTIVE",
  "PENDING_APPROVAL",
  "FLAGGED",
  "SUSPENDED",
  "REJECTED",
];

const sellerTiers: SellerTier[] = ["STANDARD", "PRO", "ENTERPRISE"];

export function SellerEditDialog({
  open,
  draft,
  canConfigureCommercialTerms,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  draft: SellerRecord | null;
  canConfigureCommercialTerms: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (next: SellerRecord) => void;
  onSave: () => void;
}) {
  if (!draft) {
    return null;
  }

  const update = <K extends keyof SellerRecord>(key: K, value: SellerRecord[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">
            Edit Seller Governance
          </DialogTitle>
          <DialogDescription>
            Update status, compliance notes, payout settings, and seller permissions without leaving the queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                Seller record
              </div>
              <h2 className="mt-1 text-xl font-black text-foreground">{draft.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.city} · {draft.slug} · {draft.tagline}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Operational edit
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Status">
                  <select
                    value={draft.status}
                    onChange={(event) => update("status", event.target.value as SellerStatus)}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  >
                    {sellerStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Verified Store">
                  <select
                    value={draft.verified ? "yes" : "no"}
                    onChange={(event) => update("verified", event.target.value === "yes")}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  >
                    <option value="yes">Verified</option>
                    <option value="no">Unverified</option>
                  </select>
                </AdminField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Tier">
                  <select
                    value={draft.tier}
                    onChange={(event) => update("tier", event.target.value as SellerTier)}
                    disabled={!canConfigureCommercialTerms}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none disabled:opacity-60"
                  >
                    {sellerTiers.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Commission Rate">
                  <input
                    type="number"
                    value={draft.commissionRate}
                    onChange={(event) => update("commissionRate", Number(event.target.value) || 0)}
                    disabled={!canConfigureCommercialTerms}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none disabled:opacity-60"
                  />
                </AdminField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Payout Hold">
                  <select
                    value={draft.payoutHold ? "yes" : "no"}
                    onChange={(event) => update("payoutHold", event.target.value === "yes")}
                    disabled={!canConfigureCommercialTerms}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none disabled:opacity-60"
                  >
                    <option value="no">No hold</option>
                    <option value="yes">Hold payouts</option>
                  </select>
                </AdminField>
                <AdminField label="Response Time">
                  <input
                    value={draft.responseTime}
                    onChange={(event) => update("responseTime", event.target.value)}
                    className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  />
                </AdminField>
              </div>

              <AdminField label="Approval Note" hint="Shared admin note for approval or follow-up context.">
                <textarea
                  value={draft.approvalNote ?? ""}
                  onChange={(event) => update("approvalNote", event.target.value || undefined)}
                  className="min-h-24 w-full rounded-[18px] border border-border/60 bg-background px-3 py-3 text-sm focus:outline-none"
                />
              </AdminField>

              <AdminField label="Flagged Reason" hint="Explain why this seller needs moderation or intervention.">
                <textarea
                  value={draft.flaggedReason ?? ""}
                  onChange={(event) => update("flaggedReason", event.target.value || undefined)}
                  className="min-h-24 w-full rounded-[18px] border border-border/60 bg-background px-3 py-3 text-sm focus:outline-none"
                />
              </AdminField>
            </section>

            <section className="space-y-4">
              <div className="rounded-[18px] border border-border/60 p-4">
                <div className="text-sm font-black text-foreground">Brand assets</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <SingleImageUploadField
                    label="Store logo"
                    value={draft.logo}
                    kind="store-logo"
                    ownerHint={draft.slug}
                    onChange={(logo) => update("logo", logo)}
                    helperText="Admin-controlled store logo used in cards, product pages, and trust surfaces."
                    previewClassName="aspect-square"
                  />
                  <SingleImageUploadField
                    label="Store banner"
                    value={draft.banner}
                    kind="store-banner"
                    ownerHint={draft.slug}
                    onChange={(banner) => update("banner", banner)}
                    helperText="Wide seller cover image for storefront presentation."
                    previewClassName="aspect-[16/9]"
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-border/60 p-4">
                <div className="text-sm font-black text-foreground">Permission profile</div>
                <div className="mt-3 grid gap-2">
                  <PermissionToggleRow
                    label="Featured products"
                    description="Allow seller to request promoted placements."
                    active={draft.permissions.canFeatureProducts}
                    disabled={!canConfigureCommercialTerms}
                    onToggle={() =>
                      update("permissions", {
                        ...draft.permissions,
                        canFeatureProducts: !draft.permissions.canFeatureProducts,
                      })
                    }
                  />
                  <PermissionToggleRow
                    label="Campaign participation"
                    description="Allow seller to join marketplace campaigns."
                    active={draft.permissions.canRunCampaigns}
                    disabled={!canConfigureCommercialTerms}
                    onToggle={() =>
                      update("permissions", {
                        ...draft.permissions,
                        canRunCampaigns: !draft.permissions.canRunCampaigns,
                      })
                    }
                  />
                  <AdminField label="Max Products">
                    <input
                      type="number"
                      value={draft.permissions.maxProducts}
                      onChange={(event) =>
                        update("permissions", {
                          ...draft.permissions,
                          maxProducts: Number(event.target.value) || 0,
                        })
                      }
                      disabled={!canConfigureCommercialTerms}
                      className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none disabled:opacity-60"
                    />
                  </AdminField>
                </div>
              </div>

              <div className="rounded-[18px] border border-border/60 p-4">
                <div className="text-sm font-black text-foreground">Quality checklist</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ChecklistRow label="Brand assets" active={Boolean(draft.logo && draft.banner)} />
                  <ChecklistRow label="Store description" active={draft.description.trim().length > 60} />
                  <ChecklistRow
                    label="Policy coverage"
                    active={Boolean(draft.policies.returns && draft.policies.shipping && draft.policies.warranty)}
                  />
                  <ChecklistRow label="Trust signals" active={draft.verified && draft.rating >= 4} />
                </div>
              </div>

              <div className="rounded-[18px] border border-border/60 p-4">
                <div className="text-sm font-black text-foreground">Seller context</div>
                <div className="mt-3 divide-y divide-border/60">
                  <SummaryRow label="City" value={draft.city} />
                  <SummaryRow label="Joined" value={draft.joined} />
                  <SummaryRow label="Rating" value={`${draft.rating.toFixed(1)} / 5`} />
                  <SummaryRow label="Review count" value={String(draft.reviewCount)} />
                  <SummaryRow label="Last active" value={draft.lastActiveAt ? new Date(draft.lastActiveAt).toLocaleString() : "No recent session"} />
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
            onClick={onSave}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Save seller
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionToggleRow({
  label,
  description,
  active,
  disabled,
  onToggle,
}: {
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex items-start justify-between gap-3 rounded-[16px] border border-border/60 px-3.5 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </div>
      <span
        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
          active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
        }`}
      >
        {active ? "On" : "Off"}
      </span>
    </button>
  );
}

function ChecklistRow({ label, active }: { label: string; active: boolean }) {
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
