"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  MapPin,
  Truck,
  CreditCard,
  FileCheck,
  ShieldCheck,
  Banknote,
  Building2,
  Smartphone,
  BadgeCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { CouponPanel } from "@/components/marketplace/CouponPanel";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/marketplace/StatusBadge";
import { PaymentProofForm } from "@/components/payments/PaymentProofForm";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { formatPKR } from "@/data/marketplace";
import {
  getCartActorId,
  getCartGroups,
  getCartQuantity,
  getCartTotals,
  getCustomerDefaultAddress,
  getOrderById,
  getPaymentById,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type {
  CheckoutSubmission,
  ManualPaymentMethod,
  PaymentMethod,
  PaymentProofSubmission,
  SellerShippingSelection,
  ShippingAddress,
  ShippingOptionId,
} from "@/modules/marketplace/types";

const steps = [
  { key: "address", label: "Address", Icon: MapPin },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "payment", label: "Payment", Icon: CreditCard },
  { key: "review", label: "Review", Icon: FileCheck },
] as const;

const paymentOptions: {
  id: PaymentMethod;
  label: string;
  desc: string;
  Icon: typeof Banknote;
  badge?: string;
}[] = [
  {
    id: "COD",
    Icon: Banknote,
    label: "Cash on Delivery",
    desc: "Pay in cash at delivery. SpareKart verifies the collected amount before seller payout release.",
    badge: "Always available",
  },
  {
    id: "BANK_TRANSFER",
    Icon: Building2,
    label: "Bank Transfer",
    desc: "Manual bank transfer with admin proof verification before confirmation.",
  },
  {
    id: "EASYPAISA",
    Icon: Smartphone,
    label: "Easypaisa",
    desc: "Send payment manually and upload proof for admin approval.",
  },
  {
    id: "JAZZCASH",
    Icon: Smartphone,
    label: "JazzCash",
    desc: "Manual wallet payment with proof review and confirmation flow.",
  },
];

function createShippingSelection(
  sellerSlug: string,
  optionId: ShippingOptionId,
): SellerShippingSelection {
  if (optionId === "EXPRESS") {
    return {
      sellerSlug,
      optionId,
      label: "Express delivery",
      etaLabel: "1–2 business days",
      price: 600,
    };
  }

  return {
    sellerSlug,
    optionId: "STANDARD",
    label: "Standard delivery",
    etaLabel: "3–5 business days",
    price: 250,
  };
}

function buildDefaultAddress(fullName: string, phone: string): ShippingAddress {
  return {
    fullName,
    phone,
    addressLine: "House 12, Street 5, Block A",
    city: "Karachi",
    province: "Sindh",
    postalCode: "74000",
  };
}

export default function CheckoutPage() {
  const { state, currentUser, placeOrder } = useMarketplace();
  const cartActorId = getCartActorId(currentUser);
  const isGuestCheckout = !currentUser;
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [proofDraft, setProofDraft] = useState<PaymentProofSubmission | undefined>();
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const defaultAddress = useMemo(
    () =>
      (currentUser ? getCustomerDefaultAddress(state, currentUser.id) : undefined) ??
      buildDefaultAddress(currentUser?.name ?? "", currentUser?.phone ?? ""),
    [currentUser, state],
  );
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(defaultAddress);
  const [shippingSelections, setShippingSelections] = useState<
    Record<string, SellerShippingSelection>
  >({});

  const grouped = useMemo(
    () => (cartActorId ? getCartGroups(state, cartActorId) : []),
    [cartActorId, state],
  );
  const sellerSlugs = useMemo(() => grouped.map((group) => group.seller.slug), [grouped]);
  const cartQuantity = useMemo(
    () => (cartActorId ? getCartQuantity(state, cartActorId) : 0),
    [cartActorId, state],
  );

  useEffect(() => {
    setShippingAddress((previous) =>
      previous.fullName === defaultAddress.fullName && previous.phone === defaultAddress.phone
        ? previous
        : defaultAddress,
    );
  }, [defaultAddress]);

  useEffect(() => {
    setShippingSelections((previous) => {
      let changed = false;
      const nextSelections: Record<string, SellerShippingSelection> = {};

      sellerSlugs.forEach((sellerSlug) => {
        const existingSelection = previous[sellerSlug];

        if (existingSelection) {
          nextSelections[sellerSlug] = existingSelection;
          return;
        }

        nextSelections[sellerSlug] = createShippingSelection(sellerSlug, "STANDARD");
        changed = true;
      });

      if (!changed && Object.keys(previous).length === sellerSlugs.length) {
        return previous;
      }

      return nextSelections;
    });
  }, [sellerSlugs]);

  useEffect(() => {
    if (paymentMethod === "COD") {
      setProofDraft(undefined);
    }
  }, [paymentMethod]);

  const shippingPriceMap = useMemo(
    () =>
      Object.fromEntries(
        Object.values(shippingSelections).map((selection) => [
          selection.sellerSlug,
          selection.price,
        ]),
      ),
    [shippingSelections],
  );

  const totals = cartActorId
    ? getCartTotals(state, cartActorId, shippingPriceMap)
    : {
        subtotal: 0,
        discount: 0,
        shipping: 0,
        total: 0,
        appliedCoupon: undefined,
        appliedCouponCode: "",
        invalidCouponReason: undefined,
      };

  const createdOrder = placedOrderId ? getOrderById(state, placedOrderId) : undefined;
  const createdPayment = createdOrder ? getPaymentById(state, createdOrder.paymentId) : undefined;

  const canContinueAddress =
    shippingAddress.fullName.trim() &&
    shippingAddress.phone.trim() &&
    shippingAddress.addressLine.trim() &&
    shippingAddress.city.trim() &&
    shippingAddress.province.trim() &&
    shippingAddress.postalCode.trim() &&
    (!isGuestCheckout || guestEmail.trim().length === 0 || guestEmail.includes("@"));
  const canContinueShipping = grouped.every((group) => !!shippingSelections[group.seller.slug]);

  const currentManualInstructions =
    paymentMethod === "COD"
      ? undefined
      : state.paymentSettings.manualInstructions[paymentMethod as ManualPaymentMethod];

  const handlePlaceOrder = async () => {
    if (cartQuantity === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    try {
      setPlacingOrder(true);
      const payload: CheckoutSubmission = {
        checkoutMode: isGuestCheckout ? "GUEST" : "CUSTOMER",
        guestEmail: isGuestCheckout ? guestEmail.trim() || undefined : undefined,
        shippingAddress,
        sellerShippingSelections: Object.values(shippingSelections),
        paymentMethod,
        paymentProof: paymentMethod === "COD" ? undefined : proofDraft,
      };

      const orderId = await placeOrder(payload);
      setPlacedOrderId(orderId);
      toast.success(
        paymentMethod === "COD"
          ? isGuestCheckout
            ? "Guest COD order confirmed. Keep your order number for tracking."
            : "COD order confirmed for fulfilment."
          : proofDraft
            ? "Order created and payment proof submitted."
            : isGuestCheckout
              ? "Guest order created. Use order tracking to upload proof later."
              : "Order created. Upload proof from My Orders when ready.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const setShippingOption = (sellerSlug: string, optionId: ShippingOptionId) => {
    setShippingSelections((previous) => ({
      ...previous,
      [sellerSlug]: createShippingSelection(sellerSlug, optionId),
    }));
  };

  if (currentUser && currentUser.role !== "CUSTOMER") {
    return (
      <PageLayout>
        <div className="container mx-auto max-w-2xl px-4 py-10 sm:py-12">
          <div className="rounded-[28px] bg-card p-6 text-center shadow-[var(--shadow-premium)]">
            <h1 className="text-2xl font-black">Checkout is for shoppers only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seller and admin sessions cannot place marketplace orders. Switch to a customer
              account or continue shopping as a signed-out guest.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Switch account
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
              >
                Back to store
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {createdOrder && createdPayment ? (
        <CheckoutSuccess order={createdOrder} payment={createdPayment} />
      ) : (
        <section className="container mx-auto px-4 py-6 sm:py-8">
          <h1 className="text-[2rem] font-black tracking-tight sm:text-3xl md:text-4xl">
            Secure checkout
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            COD orders move straight into seller fulfilment, but SpareKart verifies the collected
            cash after delivery before releasing seller payouts. Manual methods stay inventory-safe
            until admin approval.
          </p>
          {!currentUser ? (
            <div className="mt-4 rounded-[20px] border border-info/15 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
              You are checking out as a guest. We will use your phone and optional email for order
              tracking, proof submission, and delivered-order reviews.
            </div>
          ) : null}

          <div className="mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:mt-8 sm:flex sm:items-center sm:gap-2">
            {steps.map((entry, index) => (
              <div
                key={entry.key}
                className="flex items-center gap-2 rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)] sm:flex-1 sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none"
              >
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition-colors ${index < step ? "bg-success text-success-foreground" : index === step ? "gradient-accent text-primary" : "bg-surface-2 text-muted-foreground"}`}
                >
                  {index < step ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <entry.Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </div>
                  <div
                    className={`text-[13px] font-bold sm:text-sm ${index <= step ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {entry.label}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`hidden h-0.5 flex-1 sm:block ${index < step ? "bg-success" : "bg-border"}`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8 lg:mt-10">
            <div className="space-y-6">
              <CouponPanel
                compact
                title="Checkout coupon"
                description="Discounts applied here also work when you arrive from Buy Now."
              />

              {step === 0 && (
                <AddressStep
                  value={shippingAddress}
                  onChange={setShippingAddress}
                  contactEmail={guestEmail}
                  onContactEmailChange={setGuestEmail}
                  isGuestCheckout={isGuestCheckout}
                />
              )}
              {step === 1 && (
                <ShippingStep
                  groups={grouped}
                  selections={shippingSelections}
                  onSelect={setShippingOption}
                />
              )}
              {step === 2 && (
                <PaymentStep
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  proofDraft={proofDraft}
                  setProofDraft={setProofDraft}
                  maxProofSizeBytes={state.paymentSettings.proofMaxSizeBytes}
                  manualInstructions={currentManualInstructions}
                />
              )}
              {step === 3 && (
                <ReviewStep
                  groups={grouped}
                  shippingAddress={shippingAddress}
                  guestEmail={guestEmail}
                  isGuestCheckout={isGuestCheckout}
                  shippingSelections={shippingSelections}
                  paymentMethod={paymentMethod}
                  paymentProofReady={!!proofDraft}
                  totals={totals}
                />
              )}

              <div className="flex gap-3 justify-between">
                <button
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                  className="flex-1 h-11 rounded-xl bg-surface px-6 text-sm font-semibold shadow-[var(--shadow-soft)] disabled:opacity-40 sm:flex-none"
                >
                  Back
                </button>
                {step < 3 ? (
                  <button
                    onClick={() => {
                      if (step === 0 && !canContinueAddress) {
                        toast.error("Complete the delivery address first.");
                        return;
                      }

                      if (step === 1 && !canContinueShipping) {
                        toast.error("Select shipping for each seller first.");
                        return;
                      }

                      setStep((current) => current + 1);
                    }}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:flex-none"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => void handlePlaceOrder()}
                    disabled={placingOrder}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl gradient-accent px-8 text-sm font-bold text-primary hover:opacity-95 sm:flex-none"
                  >
                    {placingOrder ? "Preparing checkout..." : "Place order"}
                    {placingOrder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-6">
                <h2 className="font-black text-lg">Order summary</h2>
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {grouped.flatMap((group) =>
                    group.items.map(({ line, product }) => (
                      <div key={product.id} className="flex gap-3 text-sm">
                        <OptimizedImage
                          src={product.images[0]}
                          alt={product.title}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 font-semibold">{product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Qty {line.qty} ·{" "}
                            {group.seller.name}
                          </div>
                        </div>
                        <div className="font-bold tabular-nums">
                          {formatPKR(product.price * line.qty)}
                        </div>
                      </div>
                    )),
                  )}
                </div>
                <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-semibold tabular-nums">{formatPKR(totals.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping</dt>
                    <dd className="font-semibold tabular-nums">
                      {totals.shipping === 0 ? (
                        <span className="text-success">FREE</span>
                      ) : (
                        formatPKR(totals.shipping)
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between text-success">
                    <dt>
                      {totals.appliedCoupon
                        ? `Coupon (${totals.appliedCoupon.code})`
                        : "Coupon savings"}
                    </dt>
                    <dd className="font-semibold tabular-nums">– {formatPKR(totals.discount)}</dd>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-border pt-3">
                    <dt className="font-black">Total</dt>
                    <dd className="text-xl font-black tabular-nums">{formatPKR(totals.total)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    Manual payments confirm after admin approval. COD orders can be fulfilled
                    immediately, but their cash settlement is still verified by SpareKart after
                    delivery.
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}
    </PageLayout>
  );
}

function CheckoutSuccess({
  order,
  payment,
}: {
  order: NonNullable<ReturnType<typeof getOrderById>>;
  payment: NonNullable<ReturnType<typeof getPaymentById>>;
}) {
  const title =
    payment.method === "COD"
      ? "Order confirmed successfully!"
      : payment.status === "PROOF_SUBMITTED"
        ? "Payment proof submitted"
        : "Order created, proof still required";

  const description =
    payment.method === "COD"
      ? `${order.orderNumber} is confirmed for fulfilment. SpareKart will verify the collected COD cash after delivery before seller payout release.`
      : payment.status === "PROOF_SUBMITTED"
        ? `${order.orderNumber} is waiting for admin verification before it becomes confirmed.`
        : order.customerType === "GUEST"
          ? `${order.orderNumber} is waiting for payment proof. Upload it later from order tracking with your phone or email.`
          : `${order.orderNumber} is waiting for payment proof. Upload it from My Orders whenever you're ready.`;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-14 text-center sm:py-20">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15">
        <Check className="h-10 w-10 text-success" />
      </div>
      <h1 className="mt-6 text-[2rem] font-black tracking-tight sm:text-3xl md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <div className="mt-8 rounded-[24px] bg-surface p-5 text-left shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Order number
            </div>
            <div className="mt-1 text-lg font-black text-foreground">{order.orderNumber}</div>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={payment.status} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment method</span>
            <span className="font-semibold">
              {payment.instructionsSnapshot?.label ?? payment.method.replaceAll("_", " ")}
            </span>
          </div>
          {order.appliedCoupon ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coupon</span>
              <span className="font-semibold text-success">
                {order.appliedCoupon.code} · – {formatPKR(order.appliedCoupon.discountAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold tabular-nums">{formatPKR(order.totals.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sellers</span>
            <span className="font-semibold tabular-nums">
              {new Set(order.items.map((item) => item.sellerSlug)).size}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={order.customerType === "GUEST" ? "/order-tracking" : "/account/orders"}
          className="flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {order.customerType === "GUEST" ? "Track this order" : "View my orders"}
        </Link>
        <Link
          href="/"
          className="flex h-11 items-center justify-center rounded-xl bg-surface px-6 text-sm font-semibold shadow-[var(--shadow-soft)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

function AddressStep({
  value,
  onChange,
  contactEmail,
  onContactEmailChange,
  isGuestCheckout,
}: {
  value: ShippingAddress;
  onChange: (value: ShippingAddress) => void;
  contactEmail: string;
  onContactEmailChange: (value: string) => void;
  isGuestCheckout: boolean;
}) {
  const updateField = <Key extends keyof ShippingAddress>(
    key: Key,
    fieldValue: ShippingAddress[Key],
  ) => onChange({ ...value, [key]: fieldValue });

  return (
    <div className="space-y-4 rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6">
      <h2 className="font-black text-xl">Delivery address</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <input
            value={value.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
        <Field label="Phone">
          <input
            value={value.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>
      {isGuestCheckout ? (
        <Field label="Email for tracking updates (optional)">
          <input
            value={contactEmail}
            onChange={(event) => onContactEmailChange(event.target.value)}
            placeholder="guest@example.com"
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      ) : null}
      <Field label="Address line">
        <input
          value={value.addressLine}
          onChange={(event) => updateField("addressLine", event.target.value)}
          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City">
          <input
            value={value.city}
            onChange={(event) => updateField("city", event.target.value)}
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
        <Field label="Province">
          <input
            value={value.province}
            onChange={(event) => updateField("province", event.target.value)}
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
        <Field label="Postal code">
          <input
            value={value.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
            className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>
    </div>
  );
}

function ShippingStep({
  groups,
  selections,
  onSelect,
}: {
  groups: ReturnType<typeof getCartGroups>;
  selections: Record<string, SellerShippingSelection>;
  onSelect: (sellerSlug: string, optionId: ShippingOptionId) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-black text-xl">Shipping per seller</h2>
      {groups.map((group) => {
        const selected =
          selections[group.seller.slug] ?? createShippingSelection(group.seller.slug, "STANDARD");
        return (
          <div
            key={group.seller.slug}
            className="rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <OptimizedImage
                  src={group.seller.logo}
                  alt={group.seller.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    {group.seller.name}{" "}
                    {group.seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-info" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {group.items.length} items · ships from {group.seller.city}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {(["STANDARD", "EXPRESS"] as ShippingOptionId[]).map((optionId) => {
                const option = createShippingSelection(group.seller.slug, optionId);
                return (
                  <label
                    key={optionId}
                    className={`flex cursor-pointer flex-col gap-3 rounded-xl p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${selected.optionId === optionId ? "border-2 border-accent bg-accent-soft shadow-[var(--shadow-soft)]" : "bg-surface shadow-[var(--shadow-soft)] hover:bg-background"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`ship-${group.seller.slug}`}
                        checked={selected.optionId === optionId}
                        onChange={() => onSelect(group.seller.slug, optionId)}
                        className="h-4 w-4 accent-[oklch(0.72_0.19_50)]"
                      />
                      <div>
                        <div className="font-bold text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.etaLabel}</div>
                      </div>
                    </div>
                    <div className="font-bold tabular-nums">{formatPKR(option.price)}</div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentStep({
  paymentMethod,
  setPaymentMethod,
  proofDraft,
  setProofDraft,
  maxProofSizeBytes,
  manualInstructions,
}: {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  proofDraft?: PaymentProofSubmission;
  setProofDraft: (value: PaymentProofSubmission | undefined) => void;
  maxProofSizeBytes: number;
  manualInstructions?: {
    label: string;
    summary: string;
    accountTitle: string;
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    walletNumber?: string;
    note: string;
    guidelines: string[];
    referenceHint: string;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6">
        <h2 className="font-black text-xl">Payment method</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {paymentOptions.map((option) => (
            <label
              key={option.id}
              className={`relative flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition-all ${paymentMethod === option.id ? "border-2 border-accent bg-accent-soft shadow-[var(--shadow-glow)]" : "bg-surface shadow-[var(--shadow-soft)] hover:bg-background"}`}
            >
              <input
                type="radio"
                name="pay"
                checked={paymentMethod === option.id}
                onChange={() => setPaymentMethod(option.id)}
                className="mt-1 h-4 w-4 accent-[oklch(0.72_0.19_50)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <option.Icon className="h-4 w-4" />
                  <span className="font-bold text-sm">{option.label}</span>
                  {option.badge && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {option.badge}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {paymentMethod !== "COD" && manualInstructions && (
        <>
          <div className="space-y-5 rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black">
                <ShieldCheck className="h-5 w-5 text-info" /> {manualInstructions.label}{" "}
                instructions
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{manualInstructions.summary}</p>
            </div>
            <div className="space-y-2 rounded-2xl bg-surface p-4 text-sm shadow-[var(--shadow-soft)] sm:p-5">
              <InstructionRow label="Account title" value={manualInstructions.accountTitle} />
              {manualInstructions.bankName && (
                <InstructionRow label="Bank" value={manualInstructions.bankName} />
              )}
              {manualInstructions.accountNumber && (
                <InstructionRow
                  label="Account number"
                  value={manualInstructions.accountNumber}
                  monospace
                />
              )}
              {manualInstructions.iban && (
                <InstructionRow label="IBAN" value={manualInstructions.iban} monospace />
              )}
              {manualInstructions.walletNumber && (
                <InstructionRow
                  label="Wallet number"
                  value={manualInstructions.walletNumber}
                  monospace
                />
              )}
              <InstructionRow label="Reference" value={manualInstructions.referenceHint} />
            </div>
            <div className="rounded-2xl bg-info/5 p-4 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">Verification note</div>
              <p className="mt-1">{manualInstructions.note}</p>
              <ul className="mt-3 space-y-1">
                {manualInstructions.guidelines.map((guideline) => (
                  <li key={guideline}>• {guideline}</li>
                ))}
              </ul>
            </div>
          </div>

          {proofDraft ? (
            <div className="rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">Payment proof ready for this checkout</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {proofDraft.screenshotName} · Ref {proofDraft.transactionReference}
                  </div>
                </div>
                <button
                  onClick={() => setProofDraft(undefined)}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  Replace proof
                </button>
              </div>
            </div>
          ) : (
            <PaymentProofForm
              maxSizeBytes={maxProofSizeBytes}
              submitLabel="Save proof for this order"
              onSubmit={(payload) => {
                setProofDraft(payload);
                toast.success("Payment proof attached to this checkout.");
              }}
            />
          )}

          <div className="rounded-[24px] bg-accent-soft/80 p-4 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
            <strong className="text-foreground">Flexible submission:</strong> you can place the
            order now without proof, then upload or resubmit it later from your order tracking
            screen.
          </div>
        </>
      )}
    </div>
  );
}

function ReviewStep({
  groups,
  shippingAddress,
  guestEmail,
  isGuestCheckout,
  shippingSelections,
  paymentMethod,
  paymentProofReady,
  totals,
}: {
  groups: ReturnType<typeof getCartGroups>;
  shippingAddress: ShippingAddress;
  guestEmail: string;
  isGuestCheckout: boolean;
  shippingSelections: Record<string, SellerShippingSelection>;
  paymentMethod: PaymentMethod;
  paymentProofReady: boolean;
  totals: ReturnType<typeof getCartTotals>;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-black text-xl">Review your order</h2>
      <div className="rounded-[24px] bg-card p-4 text-sm shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5">
        <div className="mb-2 font-bold">Delivery to</div>
        <div className="text-muted-foreground">
          {shippingAddress.fullName} · {shippingAddress.phone} · {shippingAddress.addressLine},{" "}
          {shippingAddress.city} {shippingAddress.postalCode}, {shippingAddress.province}
        </div>
        {isGuestCheckout ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Tracking contact: {guestEmail || "Phone lookup only"}
          </div>
        ) : null}
      </div>
      <div className="rounded-[24px] bg-card p-4 text-sm shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5">
        <div className="mb-2 font-bold">Payment</div>
        <div className="text-muted-foreground uppercase">{paymentMethod.replaceAll("_", " ")}</div>
        {paymentMethod !== "COD" && (
          <div className="mt-2 text-xs text-muted-foreground">
            {paymentProofReady
              ? "Proof will be submitted with this order."
              : "Proof can be submitted later from order tracking if you place the order now."}
          </div>
        )}
      </div>
      {groups.map((group) => {
        const subTotal = group.items.reduce(
          (sum, item) => sum + item.product.price * item.line.qty,
          0,
        );
        const shipping = shippingSelections[group.seller.slug];
        return (
          <div
            key={group.seller.slug}
            className="rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="min-w-0">
                <div className="text-sm font-bold">{group.seller.name}</div>
                <div className="text-xs text-muted-foreground">
                  {group.items.length} items · {shipping?.label ?? "Standard delivery"}
                </div>
              </div>
              <div className="text-sm font-bold tabular-nums">{formatPKR(subTotal)}</div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {group.items.map(({ line, product }) => (
                <div key={product.id} className="flex gap-3 justify-between">
                  <span className="min-w-0 text-muted-foreground">
                    {product.title} × {line.qty}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPKR(product.price * line.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div className="rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatPKR(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="tabular-nums">
              {totals.shipping === 0 ? "FREE" : formatPKR(totals.shipping)}
            </span>
          </div>
          <div className="flex justify-between text-success">
            <span>
              {totals.appliedCoupon ? `Coupon (${totals.appliedCoupon.code})` : "Coupon savings"}
            </span>
            <span className="tabular-nums">– {formatPKR(totals.discount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-semibold text-muted-foreground">Grand total</span>
            <span className="font-black tabular-nums">{formatPKR(totals.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InstructionRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={monospace ? "font-mono tabular-nums" : "font-semibold"}>{value}</span>
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
