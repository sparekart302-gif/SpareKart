"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminField } from "@/components/admin/AdminCommon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ManagedCategory, ManagedCategoryInput } from "@/modules/marketplace/types";

export function CategoryManagementDialog({
  open,
  categories,
  onOpenChange,
  saveCategoryRecord,
  deleteCategoryRecord,
}: {
  open: boolean;
  categories: ManagedCategory[];
  onOpenChange: (open: boolean) => void;
  saveCategoryRecord: (category: ManagedCategoryInput) => Promise<void>;
  deleteCategoryRecord: (slug: string) => Promise<void>;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ManagedCategoryInput | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectCategory = (category: ManagedCategory) => {
    setSelectedCategory({ ...category, commissionRate: category.commissionRate ?? 12 });
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedCategory({
      slug: "",
      name: "",
      icon: "",
      description: "",
      productCount: 0,
      active: true,
      commissionRate: 12,
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    try {
      await saveCategoryRecord(selectedCategory);
      toast.success(isCreating ? "Category created." : "Category saved.");
      setSelectedCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save category.");
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      await deleteCategoryRecord(selectedCategory.slug);
      toast.success("Category deleted.");
      setSelectedCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete category.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">Category Taxonomy</DialogTitle>
          <DialogDescription>
            Manage category naming, visibility, and descriptions across all seller listings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              Add category
            </button>

            <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2.5">
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => handleSelectCategory(category)}
                  className={`rounded-lg px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
                    selectedCategory?.slug === category.slug
                      ? "bg-accent-soft text-primary"
                      : "hover:bg-surface text-foreground"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {selectedCategory ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Category name">
                    <input
                      value={selectedCategory.name}
                      onChange={(event) =>
                        setSelectedCategory((prev) =>
                          prev ? { ...prev, name: event.target.value } : prev,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                    />
                  </AdminField>

                  <AdminField label="Slug">
                    <input
                      value={selectedCategory.slug}
                      onChange={(event) =>
                        setSelectedCategory((prev) =>
                          prev ? { ...prev, slug: event.target.value } : prev,
                        )
                      }
                      disabled={!isCreating}
                      className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none disabled:opacity-50"
                    />
                  </AdminField>

                  <AdminField label="Icon (emoji)">
                    <input
                      value={selectedCategory.icon}
                      onChange={(event) =>
                        setSelectedCategory((prev) =>
                          prev ? { ...prev, icon: event.target.value } : prev,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                    />
                  </AdminField>

                  <AdminField label="Visible">
                    <select
                      value={selectedCategory.active ? "yes" : "no"}
                      onChange={(event) =>
                        setSelectedCategory((prev) =>
                          prev ? { ...prev, active: event.target.value === "yes" } : prev,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                    >
                      <option value="yes">Visible</option>
                      <option value="no">Hidden</option>
                    </select>
                  </AdminField>

                  <AdminField label="Commission rate (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={selectedCategory.commissionRate}
                      onChange={(event) =>
                        setSelectedCategory((prev) =>
                          prev
                            ? { ...prev, commissionRate: Number(event.target.value) || 0 }
                            : prev,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                    />
                  </AdminField>
                </div>

                <AdminField label="Description">
                  <textarea
                    value={selectedCategory.description}
                    onChange={(event) =>
                      setSelectedCategory((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev,
                      )
                    }
                    className="min-h-20 w-full rounded-[18px] border border-border/60 bg-background px-3 py-3 text-sm focus:outline-none"
                  />
                </AdminField>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    {isCreating ? "Create category" : "Save changes"}
                  </button>
                  {!isCreating && (
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-4 text-sm font-semibold text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center rounded-[18px] border border-dashed border-border/70 py-12 text-center">
                <div className="text-sm text-muted-foreground">
                  Select a category or create a new one to edit.
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
