"use client";

import { useState, type ReactNode } from "react";
import { Check, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { PaymentProofSubmission } from "@/modules/marketplace/types";
import { uploadImageAsset } from "@/modules/uploads/client";

export function PaymentProofForm({
  maxSizeBytes,
  submitLabel,
  onSubmit,
}: {
  maxSizeBytes: number;
  submitLabel: string;
  onSubmit: (payload: PaymentProofSubmission) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentDateTime, setPaymentDateTime] = useState("");
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error("Select a payment proof screenshot first.");
      return;
    }

    if (selectedFile.size > maxSizeBytes) {
      toast.error("Payment proof exceeds the maximum allowed size.");
      return;
    }

    try {
      setIsUploading(true);
      const asset = await uploadImageAsset({
        file: selectedFile,
        kind: "payment-proof",
      });

      onSubmit({
        screenshotUrl: asset.url,
        screenshotName: asset.fileName,
        transactionReference,
        amountPaid: amountPaid ? Number(amountPaid) : undefined,
        paymentDateTime: paymentDateTime || undefined,
        note: note || undefined,
      });

      setSelectedFile(null);
      setTransactionReference("");
      setAmountPaid("");
      setPaymentDateTime("");
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload payment proof.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6">
      <div>
        <label className="text-sm font-bold">Upload payment proof</label>
        <p className="mt-1 text-xs text-muted-foreground">
          Screenshot or PDF receipt with transaction status, amount, and reference visible.
        </p>
      </div>

      <label
        className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all sm:p-8 ${selectedFile ? "border-success bg-success/5" : "border-border bg-surface hover:border-accent hover:bg-accent-soft"}`}
      >
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
        {selectedFile ? (
          <div className="space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15">
              <Check className="h-6 w-6 text-success" />
            </div>
            <div className="text-sm font-bold">{selectedFile.name}</div>
            <div className="text-xs text-muted-foreground">Click to replace the file</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm font-bold">Drop your screenshot here or click to browse</div>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> JPG, PNG, WEBP, or GIF
            </div>
          </div>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Transaction reference">
          <input
            value={transactionReference}
            onChange={(event) => setTransactionReference(event.target.value)}
            placeholder="Enter reference or trace ID"
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
        <Field label="Amount paid (optional)">
          <input
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            placeholder="e.g. 12400"
            inputMode="numeric"
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment date & time (optional)">
          <input
            type="datetime-local"
            value={paymentDateTime}
            onChange={(event) => setPaymentDateTime(event.target.value)}
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
        <Field label="Customer note (optional)">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything admin should know?"
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isUploading}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
      >
        {isUploading ? "Uploading proof..." : submitLabel}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
