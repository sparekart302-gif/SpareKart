"use client";

import { type ReactNode } from "react";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SingleImageUploadField } from "@/components/uploads/ImageUploadField";
import type { SellerStoreProfileInput } from "@/modules/marketplace/types";

export function StoreModal({
  isOpen,
  onClose,
  onSave,
  storeDraft,
  onDraftChange,
  isSaving = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  storeDraft: SellerStoreProfileInput | null;
  onDraftChange: (draft: SellerStoreProfileInput) => void;
  isSaving?: boolean;
}) {
  if (!storeDraft) return null;

  const handleChange = <K extends keyof SellerStoreProfileInput>(
    field: K,
    value: SellerStoreProfileInput[K],
  ) => {
    onDraftChange({ ...storeDraft, [field]: value });
  };

  const handleSocialChange = (
    field: keyof NonNullable<SellerStoreProfileInput["socialLinks"]>,
    value: string,
  ) => {
    onDraftChange({
      ...storeDraft,
      socialLinks: {
        ...storeDraft.socialLinks,
        [field]: value,
      },
    });
  };

  const handlePolicyChange = (field: keyof SellerStoreProfileInput["policies"], value: string) => {
    onDraftChange({
      ...storeDraft,
      policies: {
        ...storeDraft.policies,
        [field]: value,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-card pb-4 border-b">
          <DialogTitle className="text-2xl font-black">Edit Store Profile</DialogTitle>
          <DialogDescription>
            Keep your public-facing brand, visuals, and contact touchpoints polished.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6">
          {/* Store Identity */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Store Identity
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Store name">
                <input
                  value={storeDraft.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="City">
                <input
                  value={storeDraft.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Tagline">
                <input
                  value={storeDraft.tagline}
                  onChange={(e) => handleChange("tagline", e.target.value)}
                  placeholder="e.g., Premium spare parts for your vehicle"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Response time">
                <input
                  value={storeDraft.responseTime}
                  onChange={(e) => handleChange("responseTime", e.target.value)}
                  placeholder="e.g., 2 hours"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
            </div>
          </div>

          {/* Visuals */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Store Visuals
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <SingleImageUploadField
                label="Store logo"
                value={storeDraft.logo}
                kind="store-logo"
                ownerHint={storeDraft.name}
                onChange={(logo) => handleChange("logo", logo)}
                helperText="Upload a square brand mark for seller cards, product pages, and trust badges."
                previewClassName="aspect-square"
              />
              <SingleImageUploadField
                label="Store banner"
                value={storeDraft.banner}
                kind="store-banner"
                ownerHint={storeDraft.name}
                onChange={(banner) => handleChange("banner", banner)}
                helperText="Upload a wide cover image for the store page hero."
                previewClassName="aspect-[16/8]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Store Description
            </h3>
            <FieldShell label="About your store">
              <textarea
                value={storeDraft.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Tell customers about your store, experience, and what makes you unique..."
                rows={5}
                className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </FieldShell>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Social & Contact Links
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Website">
                <input
                  value={storeDraft.socialLinks?.website ?? ""}
                  onChange={(e) => handleSocialChange("website", e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="WhatsApp">
                <input
                  value={storeDraft.socialLinks?.whatsapp ?? ""}
                  onChange={(e) => handleSocialChange("whatsapp", e.target.value)}
                  placeholder="03001234567 or https://wa.me/923001234567"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Instagram">
                <input
                  value={storeDraft.socialLinks?.instagram ?? ""}
                  onChange={(e) => handleSocialChange("instagram", e.target.value)}
                  placeholder="@yourinstagram"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Facebook">
                <input
                  value={storeDraft.socialLinks?.facebook ?? ""}
                  onChange={(e) => handleSocialChange("facebook", e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Store Policies
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              These policies are displayed to customers during checkout and on product pages.
            </p>
            <div className="space-y-4">
              <FieldShell label="Return & Refund Policy">
                <textarea
                  value={storeDraft.policies.returns}
                  onChange={(e) => handlePolicyChange("returns", e.target.value)}
                  placeholder="Describe your return policy, timeframe, and conditions..."
                  rows={4}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
              <FieldShell label="Shipping Policy">
                <textarea
                  value={storeDraft.policies.shipping}
                  onChange={(e) => handlePolicyChange("shipping", e.target.value)}
                  placeholder="Describe your shipping methods, delivery times, and costs..."
                  rows={4}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
              <FieldShell label="Warranty Policy">
                <textarea
                  value={storeDraft.policies.warranty}
                  onChange={(e) => handlePolicyChange("warranty", e.target.value)}
                  placeholder="Describe your warranty coverage, terms, and conditions..."
                  rows={4}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)] hover:bg-card transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Store"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
