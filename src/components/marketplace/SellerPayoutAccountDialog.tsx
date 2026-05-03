"use client";

import { AdminField } from "@/components/admin/AdminCommon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPayoutLabel, getPayoutMethodOptions } from "@/modules/marketplace/payout-display";
import type { SellerPayoutAccountInput } from "@/modules/marketplace/types";

const scheduleOptions = ["MANUAL_REQUEST", "WEEKLY", "MONTHLY"] as const;
const accountTypeOptions = [
  "CURRENT",
  "SAVINGS",
  "BUSINESS",
  "MOBILE_WALLET",
  "DIGITAL_WALLET",
] as const;

export function SellerPayoutAccountDialog({
  open,
  draft,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  draft: SellerPayoutAccountInput;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: SellerPayoutAccountInput) => void;
  onSave: () => void;
}) {
  const update = <K extends keyof SellerPayoutAccountInput>(
    key: K,
    value: SellerPayoutAccountInput[K],
  ) => {
    onDraftChange({ ...draft, [key]: value });
  };

  const resetMethodFields = (method: SellerPayoutAccountInput["method"]) => {
    onDraftChange({
      method,
      schedulePreference: draft.schedulePreference,
      accountType: draft.accountType,
      accountTitle: "",
      accountNumber: "",
      bankName: "",
      iban: "",
      branchCode: "",
      mobileWalletProvider: "",
      easyPaisaNumber: "",
      jazzCashNumber: "",
      paypalEmail: "",
      walletId: "",
      notes: draft.notes ?? "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">
            Seller payout account
          </DialogTitle>
          <DialogDescription>
            Save the settlement destination SpareKart should use when releasing your earnings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Payout method">
              <select
                value={draft.method}
                onChange={(event) =>
                  resetMethodFields(event.target.value as SellerPayoutAccountInput["method"])
                }
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
              >
                {getPayoutMethodOptions().map((method) => (
                  <option key={method} value={method}>
                    {formatPayoutLabel(method)}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Payout schedule">
              <select
                value={draft.schedulePreference}
                onChange={(event) =>
                  update(
                    "schedulePreference",
                    event.target.value as SellerPayoutAccountInput["schedulePreference"],
                  )
                }
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
              >
                {scheduleOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatPayoutLabel(option)}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Account type">
              <select
                value={draft.accountType ?? "CURRENT"}
                onChange={(event) =>
                  update(
                    "accountType",
                    event.target.value as NonNullable<SellerPayoutAccountInput["accountType"]>,
                  )
                }
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
              >
                {accountTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatPayoutLabel(option)}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField
              label="Internal note"
              hint="Optional note for finance review or payout preference."
            >
              <input
                value={draft.notes ?? ""}
                onChange={(event) => update("notes", event.target.value)}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                placeholder="Preferred payout instruction"
              />
            </AdminField>
          </div>

          {draft.method === "BANK_TRANSFER" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Account title">
                <input
                  value={draft.accountTitle ?? ""}
                  onChange={(event) => update("accountTitle", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="Store or account holder name"
                />
              </AdminField>
              <AdminField label="Bank name">
                <input
                  value={draft.bankName ?? ""}
                  onChange={(event) => update("bankName", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="Meezan Bank"
                />
              </AdminField>
              <AdminField label="Account number">
                <input
                  value={draft.accountNumber ?? ""}
                  onChange={(event) => update("accountNumber", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="Account number"
                />
              </AdminField>
              <AdminField label="IBAN">
                <input
                  value={draft.iban ?? ""}
                  onChange={(event) => update("iban", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="PK12BANK0000000000000000"
                />
              </AdminField>
              <AdminField label="Branch code">
                <input
                  value={draft.branchCode ?? ""}
                  onChange={(event) => update("branchCode", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="0012"
                />
              </AdminField>
            </div>
          ) : null}

          {draft.method === "EASYPAISA" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Account title">
                <input
                  value={draft.accountTitle ?? ""}
                  onChange={(event) => update("accountTitle", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="Store or account holder name"
                />
              </AdminField>
              <AdminField label="Easypaisa number">
                <input
                  value={draft.easyPaisaNumber ?? ""}
                  onChange={(event) => update("easyPaisaNumber", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="03xx1234567"
                />
              </AdminField>
              <AdminField label="Wallet provider">
                <input
                  value={draft.mobileWalletProvider ?? ""}
                  onChange={(event) => update("mobileWalletProvider", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="Easypaisa"
                />
              </AdminField>
            </div>
          ) : null}

          {draft.method === "JAZZCASH" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Account title">
                <input
                  value={draft.accountTitle ?? ""}
                  onChange={(event) => update("accountTitle", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="Store or account holder name"
                />
              </AdminField>
              <AdminField label="JazzCash number">
                <input
                  value={draft.jazzCashNumber ?? ""}
                  onChange={(event) => update("jazzCashNumber", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="03xx1234567"
                />
              </AdminField>
              <AdminField label="Wallet provider">
                <input
                  value={draft.mobileWalletProvider ?? ""}
                  onChange={(event) => update("mobileWalletProvider", event.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                  placeholder="JazzCash"
                />
              </AdminField>
            </div>
          ) : null}

          {draft.method === "PAYPAL" ? (
            <AdminField label="PayPal email">
              <input
                value={draft.paypalEmail ?? ""}
                onChange={(event) => update("paypalEmail", event.target.value)}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                placeholder="seller@example.com"
              />
            </AdminField>
          ) : null}

          {draft.method === "WALLET" ? (
            <AdminField label="Wallet ID">
              <input
                value={draft.walletId ?? ""}
                onChange={(event) => update("walletId", event.target.value)}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none"
                placeholder="Wallet identifier"
              />
            </AdminField>
          ) : null}
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
            Save payout details
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
