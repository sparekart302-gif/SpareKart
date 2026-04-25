"use client";

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
  describePayoutAccountDestination,
  formatPayoutLabel,
  maskSensitiveValue,
} from "@/modules/marketplace/payout-display";
import type {
  SellerPayoutAccountReviewInput,
  SellerRecord,
} from "@/modules/marketplace/types";

function getTone(status: string) {
  if (status === "VERIFIED") {
    return "success" as const;
  }

  if (status === "REJECTED") {
    return "danger" as const;
  }

  return "warning" as const;
}

export function PayoutAccountReviewDialog({
  open,
  seller,
  draft,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  seller: SellerRecord | null;
  draft: SellerPayoutAccountReviewInput;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: SellerPayoutAccountReviewInput) => void;
  onSave: () => void;
}) {
  if (!seller?.payoutAccount) {
    return null;
  }

  const payoutAccount = seller.payoutAccount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">
            Review payout account
          </DialogTitle>
          <DialogDescription>
            Verify the seller settlement destination before approving payout requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/60 bg-surface px-4 py-3">
            <div>
              <div className="text-sm font-black text-foreground">{seller.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {seller.slug} · {formatPayoutLabel(payoutAccount.method)}
              </div>
            </div>
            <AdminPill tone={getTone(payoutAccount.status)}>
              {formatPayoutLabel(payoutAccount.status)}
            </AdminPill>
          </div>

          <div className="rounded-[18px] border border-border/60 p-4">
            <div className="text-sm font-black text-foreground">Destination details</div>
            <div className="mt-3 divide-y divide-border/60">
              <AdminKeyValue label="Destination" value={describePayoutAccountDestination(payoutAccount)} />
              <AdminKeyValue label="Schedule" value={formatPayoutLabel(payoutAccount.schedulePreference)} />
              {payoutAccount.accountTitle ? (
                <AdminKeyValue label="Account title" value={payoutAccount.accountTitle} />
              ) : null}
              {payoutAccount.bankName ? (
                <AdminKeyValue label="Bank" value={payoutAccount.bankName} />
              ) : null}
              {payoutAccount.iban ? (
                <AdminKeyValue label="IBAN" value={maskSensitiveValue(payoutAccount.iban, 4, 4)} />
              ) : null}
              {payoutAccount.paypalEmail ? (
                <AdminKeyValue label="PayPal" value={maskSensitiveValue(payoutAccount.paypalEmail, 2, 9)} />
              ) : null}
              {payoutAccount.adminNote ? (
                <AdminKeyValue label="Latest admin note" value={payoutAccount.adminNote} />
              ) : null}
              {payoutAccount.rejectionReason ? (
                <AdminKeyValue label="Previous rejection" value={payoutAccount.rejectionReason} />
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Decision">
              <select
                value={draft.status}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    status: event.target.value as SellerPayoutAccountReviewInput["status"],
                  })
                }
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
              >
                <option value="VERIFIED">Verify</option>
                <option value="REJECTED">Reject</option>
              </select>
            </AdminField>

            <div className="rounded-[18px] border border-border/60 bg-surface px-4 py-3 text-sm text-muted-foreground">
              Verified accounts can receive payouts. Rejected accounts block seller payout requests until updated.
            </div>
          </div>

          <AdminField
            label="Admin note"
            hint="Explain the verification decision or tell the seller what must be corrected."
          >
            <textarea
              value={draft.adminNote ?? ""}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  adminNote: event.target.value,
                })
              }
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
            onClick={onSave}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Save review
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
