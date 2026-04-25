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

export function InventoryModal({
  isOpen,
  onClose,
  onSave,
  delta,
  onDeltaChange,
  note,
  onNoteChange,
  productTitle,
  currentStock,
  isSaving = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  delta: string;
  onDeltaChange: (delta: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  productTitle: string;
  currentStock: number;
  isSaving?: boolean;
}) {
  const parsedDelta = Number(delta) || 0;
  const newStock = currentStock + parsedDelta;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Inventory</DialogTitle>
          <DialogDescription>Update stock for: {productTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-4">
          {/* Current Stock */}
          <div className="rounded-2xl bg-surface p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Current Stock
            </div>
            <div className="mt-2 text-3xl font-black text-foreground">{currentStock}</div>
          </div>

          {/* Adjustment Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Adjustment (add or subtract)
            </label>
            <input
              type="number"
              value={delta}
              onChange={(e) => onDeltaChange(e.target.value)}
              placeholder="e.g., +10 or -5"
              className="h-12 w-full rounded-xl bg-surface px-4 text-lg font-semibold shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">
              {parsedDelta !== 0 ? (
                <>
                  New stock will be: <span className="font-bold text-foreground">{newStock}</span>
                </>
              ) : (
                "Enter a positive number to add stock or negative to remove."
              )}
            </p>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Reason for adjustment (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="e.g., Warehouse recount, damaged units, new shipment received"
              rows={3}
              className="w-full rounded-[16px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t px-6 py-4 flex gap-3 justify-end">
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
            disabled={isSaving || parsedDelta === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Updating..." : "Update Stock"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
