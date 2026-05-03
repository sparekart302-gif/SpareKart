"use client";

import { useEffect, useState } from "react";
import { BadgePercent, CheckCircle2, TicketPercent, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatPKR } from "@/data/marketplace";
import { getCartActorId, getCartCouponState } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

type CouponPanelProps = {
  className?: string;
  title?: string;
  description?: string;
  compact?: boolean;
};

export function CouponPanel({
  className = "",
  title = "Coupons and discounts",
  description = "Apply a SpareKart coupon before you place the order.",
  compact = false,
}: CouponPanelProps) {
  const { currentUser, state, applyCouponCode, removeCouponCode } = useMarketplace();
  const [code, setCode] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [manualMessageTone, setManualMessageTone] = useState<"error" | "success" | "idle">("idle");
  const cartActorId = getCartActorId(currentUser);
  const canUseCoupons = !currentUser || currentUser.role === "CUSTOMER";
  const couponState =
    canUseCoupons && cartActorId
      ? getCartCouponState(state, cartActorId)
      : { status: "none" as const, code: "", discount: 0, eligibleSubtotal: 0 };

  useEffect(() => {
    setCode(canUseCoupons ? couponState.code : "");
  }, [canUseCoupons, couponState.code]);

  useEffect(() => {
    if (couponState.status === "applied") {
      setManualMessage("");
      setManualMessageTone("idle");
    }
  }, [couponState.status]);

  if (!canUseCoupons || !cartActorId) {
    return null;
  }

  const handleApply = async (nextCode = code) => {
    const normalizedCode = nextCode.trim().toUpperCase();
    const preview = getCartCouponState(state, cartActorId, normalizedCode);

    if (!normalizedCode) {
      setManualMessage("Enter a coupon code first.");
      setManualMessageTone("error");
      return;
    }

    if (preview.status !== "applied") {
      setManualMessage(preview.reason ?? "This coupon could not be applied.");
      setManualMessageTone("error");
      return;
    }

    try {
      await applyCouponCode(normalizedCode);
      setManualMessage(`${preview.coupon.code} applied successfully.`);
      setManualMessageTone("success");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to apply coupon.");
    }
  };

  const handleRemove = async () => {
    try {
      await removeCouponCode();
      setCode("");
      setManualMessage("");
      setManualMessageTone("idle");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove coupon.");
    }
  };

  return (
    <div
      className={`rounded-[22px] border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[24px] ${
        compact ? "space-y-3" : "space-y-4"
      } ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <TicketPercent className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">{title}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center rounded-xl border border-border/60 bg-surface px-3 shadow-[var(--shadow-soft)]">
          <BadgePercent className="h-4 w-4 text-muted-foreground" />
          <input
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              if (manualMessageTone !== "idle") {
                setManualMessage("");
                setManualMessageTone("idle");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleApply();
              }
            }}
            placeholder="Enter coupon code"
            className="h-11 flex-1 bg-transparent px-2 text-sm uppercase tracking-[0.12em] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleApply()}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground sm:flex-none"
          >
            Apply
          </button>
          {couponState.code ? (
            <button
              type="button"
              onClick={() => void handleRemove()}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {manualMessageTone !== "idle" && couponState.status !== "applied" ? (
        <div
          className={`rounded-[16px] px-3 py-2 text-xs font-medium ${
            manualMessageTone === "error"
              ? "border border-destructive/15 bg-destructive/5 text-destructive"
              : "border border-success/20 bg-success/5 text-success"
          }`}
        >
          {manualMessage}
        </div>
      ) : null}

      {couponState.status === "applied" ? (
        <div className="rounded-[18px] border border-success/20 bg-success/5 px-3 py-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">
                {couponState.coupon.code} applied
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                You are saving {formatPKR(couponState.discount)} on this order.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {couponState.status === "invalid" ? (
        <div className="rounded-[18px] border border-destructive/15 bg-destructive/5 px-3 py-3">
          <div className="flex items-start gap-2.5">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground">Coupon unavailable</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{couponState.reason}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
