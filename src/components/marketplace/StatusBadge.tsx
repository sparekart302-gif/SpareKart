"use client";

import type { OrderStatus, PaymentProofStatus, PaymentStatus } from "@/modules/marketplace/types";

const orderStatusClasses: Record<OrderStatus, string> = {
  PENDING: "bg-surface text-foreground",
  AWAITING_PAYMENT_PROOF: "bg-warning/15 text-warning-foreground",
  AWAITING_PAYMENT_VERIFICATION: "bg-info/10 text-info",
  CONFIRMED: "bg-success/10 text-success",
  PROCESSING: "bg-accent-soft text-accent",
  SHIPPED: "bg-primary/10 text-primary",
  DELIVERED: "bg-success text-success-foreground",
  CANCELED: "bg-destructive/10 text-destructive",
  RETURNED: "bg-destructive/10 text-destructive",
};

const paymentStatusClasses: Record<PaymentStatus, string> = {
  PENDING: "bg-warning/15 text-warning-foreground",
  REQUIRES_PROOF: "bg-warning/15 text-warning-foreground",
  PROOF_SUBMITTED: "bg-info/10 text-info",
  UNDER_REVIEW: "bg-info/10 text-info",
  PAID: "bg-success/10 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
  FAILED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-surface text-foreground",
};

const proofStatusClasses: Record<PaymentProofStatus, string> = {
  SUBMITTED: "bg-info/10 text-info",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

const labelMap: Record<string, string> = {
  AWAITING_PAYMENT_PROOF: "Awaiting Proof",
  AWAITING_PAYMENT_VERIFICATION: "Awaiting Verification",
  PROOF_SUBMITTED: "Proof Submitted",
  UNDER_REVIEW: "Under Review",
};

function formatStatus(value: string) {
  return labelMap[value] ?? value.replaceAll("_", " ");
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${orderStatusClasses[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${paymentStatusClasses[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

export function ProofStatusBadge({ status }: { status: PaymentProofStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${proofStatusClasses[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}
