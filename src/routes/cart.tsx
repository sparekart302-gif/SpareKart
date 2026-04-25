"use client";

import { Trash2, Minus, Plus, BadgeCheck, ShieldCheck, ArrowRight, Truck } from "lucide-react";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { CouponPanel } from "@/components/marketplace/CouponPanel";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { formatPKR } from "@/data/marketplace";
import { getCartActorId, getCartGroups, getCartQuantity, getCartTotals } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

export default function CartPage() {
  const { currentUser, state, updateCartQty, removeFromCart } = useMarketplace();
  const cartActorId = getCartActorId(currentUser);
  const grouped = cartActorId ? getCartGroups(state, cartActorId) : [];
  const cartQuantity = cartActorId ? getCartQuantity(state, cartActorId) : 0;
  const totals = cartActorId
    ? getCartTotals(state, cartActorId)
    : {
        subtotal: 0,
        discount: 0,
        shipping: 0,
        total: 0,
        appliedCoupon: undefined,
        appliedCouponCode: "",
        invalidCouponReason: undefined,
      };
  const freeShippingThreshold = state.systemSettings.shipping.freeShippingThreshold;

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Cart" }]} />
      </div>

      <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[2rem] font-black tracking-tight sm:text-3xl md:text-4xl">Your cart</h1>
          <span className="text-sm text-muted-foreground tabular-nums">{cartQuantity} items · from {grouped.length} sellers</span>
        </div>

        {cartQuantity === 0 ? (
          <div className="gradient-surface rounded-[26px] p-10 text-center shadow-[var(--shadow-soft)] sm:rounded-[30px] sm:p-16">
            <div className="mb-3 text-4xl sm:text-5xl">🛒</div>
            <h2 className="text-2xl font-bold">Your cart is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Find genuine parts for your car from Pakistan's top verified sellers.</p>
            <Link to="/shop" className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl gradient-accent px-6 text-sm font-bold text-primary">Start shopping <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
            <div className="space-y-4 sm:space-y-5">
              {grouped.map((group) => {
                const sellerSubtotal = group.items.reduce((sum, item) => sum + item.product.price * item.line.qty, 0);
                return (
                  <div key={group.seller.slug} className="overflow-hidden rounded-[24px] bg-card shadow-[var(--shadow-soft)] sm:rounded-[28px]">
                    <div className="flex flex-col gap-3 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <Link to="/seller/$slug" params={{ slug: group.seller.slug }} className="group flex items-center gap-3">
                        <OptimizedImage src={group.seller.logo} alt={group.seller.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold group-hover:text-accent">{group.seller.name} {group.seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-info" />}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Truck className="h-3 w-3" /> Ships from {group.seller.city}</div>
                        </div>
                      </Link>
                      <div className="text-sm text-muted-foreground">Seller subtotal: <span className="font-bold text-foreground tabular-nums">{formatPKR(sellerSubtotal)}</span></div>
                    </div>
                    {group.items.map(({ line, product, availableStock }) => (
                      <div key={product.id} className="flex flex-col gap-3 border-t border-border/70 p-4 first:border-t-0 sm:flex-row sm:gap-4 sm:p-5">
                        <Link to="/product/$slug" params={{ slug: product.slug }} className="shrink-0">
                          <OptimizedImage src={product.images[0]} alt={product.title} width={96} height={96} className="h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <Link to="/product/$slug" params={{ slug: product.slug }} className="line-clamp-2 font-bold hover:text-accent">{product.title}</Link>
                          <div className="mt-1 text-xs text-muted-foreground">{product.brand} · SKU {product.sku}</div>
                          <div className={`mt-1 text-xs font-semibold ${availableStock > 0 ? "text-success" : "text-destructive"}`}>
                            {availableStock > 0 ? `${availableStock} available for checkout` : "Currently out of stock"}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-auto sm:pt-3">
                            <div className="inline-flex items-center rounded-xl bg-surface shadow-[var(--shadow-soft)]">
                              <button onClick={() => updateCartQty(product.id, line.qty - 1)} className="grid h-9 w-9 place-items-center hover:bg-background"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-10 text-center text-sm font-bold tabular-nums">{line.qty}</span>
                              <button onClick={() => updateCartQty(product.id, line.qty + 1)} className="grid h-9 w-9 place-items-center hover:bg-background"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                            <button onClick={() => removeFromCart(product.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                          </div>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <div className="text-lg font-black tabular-nums">{formatPKR(product.price * line.qty)}</div>
                          {product.comparePrice && <div className="text-xs text-muted-foreground line-through tabular-nums">{formatPKR(product.comparePrice * line.qty)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-6">
                <h2 className="font-black text-lg">Order summary</h2>
                {!currentUser ? (
                  <div className="mt-3 rounded-2xl border border-info/15 bg-info/5 px-3 py-3 text-xs text-muted-foreground">
                    Guest checkout is available. You can place the order without signing in and track it later using your order number and phone or email.
                  </div>
                ) : null}
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal ({cartQuantity} items)</dt><dd className="font-semibold tabular-nums">{formatPKR(totals.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Shipping ({grouped.length} sellers)</dt><dd className="font-semibold tabular-nums">{totals.shipping === 0 ? <span className="text-success">FREE</span> : formatPKR(totals.shipping)}</dd></div>
                  <div className="flex justify-between text-success">
                    <dt>{totals.appliedCoupon ? `Coupon (${totals.appliedCoupon.code})` : "Coupon savings"}</dt>
                    <dd className="font-semibold tabular-nums">– {formatPKR(totals.discount)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                  <span className="font-black text-lg">Total</span>
                  <span className="text-2xl font-black tabular-nums">{formatPKR(totals.total)}</span>
                </div>

                <CouponPanel
                  compact
                  className="mt-5"
                  title="Apply coupon"
                  description="Use a live SpareKart promo code before checkout."
                />

                <Link to="/checkout" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95">
                  Proceed to checkout <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>Secure marketplace checkout. COD stays available, while manual payments are confirmed only after admin verification.</span>
                </div>
              </div>

              {totals.subtotal < freeShippingThreshold && (
                <div className="rounded-[22px] bg-accent-soft/80 p-4 text-sm shadow-[var(--shadow-soft)] sm:rounded-[24px]">
                  <strong className="text-foreground">Almost there!</strong> Add <span className="font-bold tabular-nums">{formatPKR(freeShippingThreshold - totals.subtotal)}</span> more to unlock <strong>FREE shipping</strong> across all sellers.
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
