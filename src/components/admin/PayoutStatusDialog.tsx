"use client";

import { useEffect, useState } from "react";
import { AdminField, AdminKeyValue } from "@/components/admin/AdminCommon";
import { AdminPill } from "@/components/admin/AdminUI";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  describePayoutRecordDestination,
  formatPayoutLabel,
} from "@/modules/marketplace/payout-display";
import type {
  PayoutStatus,
  SellerPayout,
} from "@/modules/marketplace/types";

const payoutStatuses: PayoutStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSING",
  "HELD",
  "PAID",
  "FAILED",
  "CANCELED",
];

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

export function PayoutStatusDialog({
  open,
  payout,
  sellerName,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  payout: SellerPayout | null;
  sellerName?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    payoutId: string;
    status: PayoutStatus;
    adminNotes?: string;
    transactionReference?: string;
  }) => void;
}) {
  const [status, setStatus] = useState<PayoutStatus>("DRAFT");
  const [adminNotes, setAdminNotes] = useState("");
  const [transactionReference, setTransactionReference] = useState("");

  useEffect(() => {
    if (!payout) {
      return;
    }

    setStatus(payout.status);
    setAdminNotes(payout.adminNotes ?? payout.rejectedReason ?? payout.holdReason ?? "");
    setTransactionReference(payout.transactionReference ?? "");
  }, [payout]);

  if (!payout) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">
            Manage payout
          </DialogTitle>
          <DialogDescription>
            Approve, hold, reject, or complete a seller payout after reviewing the settlement details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/60 bg-surface px-4 py-3">
            <div>
              <div className="text-sm font-black text-foreground">{sellerName ?? payout.sellerSlug}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {payout.id} · {formatPayoutLabel(payout.requestType ?? "AUTO_SCHEDULED")}
              </div>
            </div>
            <AdminPill tone={getPayoutTone(payout.status)}>{formatPayoutLabel(payout.status)}</AdminPill>
          </div>

          <div className="rounded-[18px] border border-border/60 p-4">
            <div className="text-sm font-black text-foreground">Settlement snapshot</div>
            <div className="mt-3 divide-y divide-border/60">
              <AdminKeyValue label="Net amount" value={payout.netAmount.toLocaleString("en-PK")} />
              <AdminKeyValue label="Commission deducted" value={payout.totalCommissionDeducted.toLocaleString("en-PK")} />
              <AdminKeyValue label="Orders" value={String(payout.orderIds.length)} />
              <AdminKeyValue label="Destination" value={describePayoutRecordDestination(payout)} />
              <AdminKeyValue label="Method" value={formatPayoutLabel(payout.payoutMethod)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Payout status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PayoutStatus)}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
              >
                {payoutStatuses.map((item) => (
                  <option key={item} value={item}>
                    {formatPayoutLabel(item)}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Transaction reference">
              <input
                value={transactionReference}
                onChange={(event) => setTransactionReference(event.target.value)}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                placeholder="Bank transfer or settlement reference"
              />
            </AdminField>
          </div>

          <AdminField
            label="Admin note"
            hint="Use this for rejection reasons, hold reasons, or payout processing notes."
          >
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              className="min-h-28 w-full rounded-[18px] border border-border/60 bg-background px-3 py-3 text-sm focus:outline-none"
            />
          </AdminField>
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
            onClick={() =>
              onSave({
                payoutId: payout.id,
                status,
                adminNotes: adminNotes.trim() || undefined,
                transactionReference: transactionReference.trim() || undefined,
              })
            }
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Save payout
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
