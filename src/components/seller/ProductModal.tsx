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
import { MultipleImageUploadField } from "@/components/uploads/ImageUploadField";
import type { ManagedProduct } from "@/modules/marketplace/types";

type SellerProductDraft = {
  id?: string;
  title: string;
  slug: string;
  brand: string;
  category: string;
  sku: string;
  price: string;
  comparePrice: string;
  stock: string;
  badge: "" | NonNullable<ManagedProduct["badge"]>;
  images: string[];
  shortDescription: string;
  description: string;
  tags: string;
  specLines: string;
  compatibilityLines: string;
  status: "ACTIVE" | "DRAFT";
};

const productBadges: SellerProductDraft["badge"][] = [
  "",
  "best-seller",
  "new",
  "deal",
  "fast-shipping",
];

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  productDraft,
  onDraftChange,
  selectedProduct,
  categories,
  isSaving = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  productDraft: SellerProductDraft;
  onDraftChange: (draft: SellerProductDraft) => void;
  selectedProduct?: ManagedProduct;
  categories: Array<{ slug: string; name: string; active: boolean }>;
  isSaving?: boolean;
}) {
  const handleFieldChange = (field: keyof SellerProductDraft, value: string) => {
    onDraftChange({ ...productDraft, [field]: value });
  };

  const formatLabel = (value: string) => value.replaceAll("-", " ").replaceAll("_", " ");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-card pb-4 border-b">
          <DialogTitle className="text-2xl font-black">
            {selectedProduct ? "Edit Product" : "Create New Product"}
          </DialogTitle>
          <DialogDescription>
            {selectedProduct
              ? "Update your product details, pricing, and inventory information."
              : "Add a new product to your store with all the details customers need."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Basic Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Product title">
                <input
                  value={productDraft.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="e.g., Premium Brake Pads"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Product slug">
                <input
                  value={productDraft.slug}
                  onChange={(e) => handleFieldChange("slug", e.target.value)}
                  placeholder="premium-brake-pads"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Pricing & Inventory
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldShell label="Price (PKR)">
                <input
                  type="number"
                  value={productDraft.price}
                  onChange={(e) => handleFieldChange("price", e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Compare price">
                <input
                  type="number"
                  value={productDraft.comparePrice}
                  onChange={(e) => handleFieldChange("comparePrice", e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Stock quantity">
                <input
                  type="number"
                  value={productDraft.stock}
                  onChange={(e) => handleFieldChange("stock", e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Badge">
                <select
                  value={productDraft.badge}
                  onChange={(e) => handleFieldChange("badge", e.target.value as SellerProductDraft["badge"])}
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {productBadges.map((badge) => (
                    <option key={badge || "none"} value={badge}>
                      {badge ? formatLabel(badge) : "No badge"}
                    </option>
                  ))}
                </select>
              </FieldShell>
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Product Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldShell label="Brand">
                <input
                  value={productDraft.brand}
                  onChange={(e) => handleFieldChange("brand", e.target.value)}
                  placeholder="e.g., Toyota"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Category">
                <select
                  value={productDraft.category}
                  onChange={(e) => handleFieldChange("category", e.target.value)}
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {categories
                    .filter((cat) => cat.active)
                    .map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </FieldShell>
              <FieldShell label="SKU">
                <input
                  value={productDraft.sku}
                  onChange={(e) => handleFieldChange("sku", e.target.value)}
                  placeholder="e.g., SKU-12345"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </FieldShell>
              <FieldShell label="Status">
                <select
                  value={productDraft.status}
                  onChange={(e) => handleFieldChange("status", e.target.value as SellerProductDraft["status"])}
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="ACTIVE">Publish</option>
                  <option value="DRAFT">Save as draft</option>
                </select>
              </FieldShell>
            </div>
          </div>

          {/* Images */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Product Images
            </h3>
            <MultipleImageUploadField
              label="Product gallery"
              values={productDraft.images}
              kind="product"
              ownerHint={selectedProduct?.id || productDraft.slug || productDraft.title}
              onChange={(images) => onDraftChange({ ...productDraft, images })}
              helperText="Upload up to 4 product images. The first image is used as the main listing image."
              previewClassName="aspect-[4/3]"
            />
          </div>

          {/* Descriptions */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Descriptions
            </h3>
            <div className="space-y-4">
              <FieldShell label="Short description">
                <textarea
                  value={productDraft.shortDescription}
                  onChange={(e) => handleFieldChange("shortDescription", e.target.value)}
                  placeholder="Brief summary of your product (50-100 words)"
                  rows={3}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
              <FieldShell label="Full description">
                <textarea
                  value={productDraft.description}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  placeholder="Detailed product information, features, and specifications"
                  rows={5}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
            </div>
          </div>

          {/* Advanced */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent mb-4">
              Advanced Information
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <FieldShell label="Tags (comma-separated)">
                <textarea
                  value={productDraft.tags}
                  onChange={(e) => handleFieldChange("tags", e.target.value)}
                  placeholder="OEM, brake pads, Toyota, front axle"
                  rows={3}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
              <FieldShell label="Specifications (label: value)">
                <textarea
                  value={productDraft.specLines}
                  onChange={(e) => handleFieldChange("specLines", e.target.value)}
                  placeholder={"Material: Ceramic\nPosition: Front axle\nWarranty: 2 years"}
                  rows={3}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
            </div>
            <div className="mt-4">
              <FieldShell label="Vehicle Compatibility (brand; model; years)">
                <textarea
                  value={productDraft.compatibilityLines}
                  onChange={(e) => handleFieldChange("compatibilityLines", e.target.value)}
                  placeholder={"Toyota; Corolla; 2018, 2019, 2020\nHonda; Civic; 2017-2021"}
                  rows={3}
                  className="w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </FieldShell>
              <p className="mt-2 text-xs text-muted-foreground">
                Use one vehicle fitment per line. For year ranges, use dash (2017-2021). For multiple years, use commas (2018, 2019, 2020).
              </p>
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
            {isSaving ? "Saving..." : selectedProduct ? "Save Product" : "Create Product"}
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
