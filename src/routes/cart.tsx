import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Minus, Plus, BadgeCheck, Tag, ShieldCheck, ArrowRight, Truck } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { products, sellers, sampleCart, formatPKR, getSeller } from "@/data/marketplace";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — SpareKart" },
      { name: "description", content: "Review your selected auto parts and proceed to secure checkout." },
      { property: "og:title", content: "Your Cart — SpareKart" },
      { property: "og:description", content: "Review your cart and check out securely." },
    ],
  }),
  component: Cart,
});

function Cart() {
  const [lines, setLines] = useState(sampleCart);

  const grouped = sellers
    .map((s) => ({
      seller: s,
      items: lines.map((l) => ({ line: l, product: products.find((p) => p.id === l.productId)! })).filter((x) => x.product?.sellerSlug === s.slug),
    }))
    .filter((g) => g.items.length > 0);

  const subtotal = lines.reduce((sum, l) => {
    const p = products.find((x) => x.id === l.productId);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
  const shipping = subtotal > 5000 ? 0 : grouped.length * 250;
  const total = subtotal + shipping;

  const updateQty = (id: string, delta: number) =>
    setLines((prev) => prev.map((l) => l.productId === id ? { ...l, qty: Math.max(1, l.qty + delta) } : l));
  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.productId !== id));

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Cart" }]} />
      </div>

      <section className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Your cart</h1>
          <span className="text-sm text-muted-foreground tabular-nums">{lines.length} items · from {grouped.length} sellers</span>
        </div>

        {lines.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
            <div className="text-5xl mb-3">🛒</div>
            <h2 className="text-2xl font-bold">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground mt-2">Find genuine parts for your car from Pakistan's top verified sellers.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-xl gradient-accent text-primary font-bold text-sm">Start shopping <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* Grouped by seller */}
            <div className="space-y-5">
              {grouped.map((g) => {
                const sellerSubtotal = g.items.reduce((s, i) => s + i.product.price * i.line.qty, 0);
                return (
                  <div key={g.seller.slug} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 bg-surface-2 flex items-center justify-between border-b border-border">
                      <Link to="/seller/$slug" params={{ slug: g.seller.slug }} className="flex items-center gap-3 group">
                        <img src={g.seller.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        <div>
                          <div className="font-bold text-sm flex items-center gap-1.5 group-hover:text-accent">{g.seller.name} {g.seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-info" />}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2"><Truck className="h-3 w-3" /> Ships from {g.seller.city}</div>
                        </div>
                      </Link>
                      <div className="text-sm text-muted-foreground">Seller subtotal: <span className="font-bold text-foreground tabular-nums">{formatPKR(sellerSubtotal)}</span></div>
                    </div>
                    {g.items.map(({ line, product }) => (
                      <div key={product.id} className="p-5 flex gap-4 border-b border-border last:border-0">
                        <Link to="/product/$slug" params={{ slug: product.slug }} className="shrink-0">
                          <img src={product.images[0]} alt="" className="h-24 w-24 rounded-xl object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <Link to="/product/$slug" params={{ slug: product.slug }} className="font-bold hover:text-accent line-clamp-2">{product.title}</Link>
                          <div className="text-xs text-muted-foreground mt-1">{product.brand} · SKU {product.sku}</div>
                          <div className="text-xs text-success font-semibold mt-1">In stock — ships in 1–2 days</div>
                          <div className="mt-auto pt-3 flex items-center justify-between">
                            <div className="inline-flex items-center border border-border rounded-lg">
                              <button onClick={() => updateQty(product.id, -1)} className="h-9 w-9 grid place-items-center hover:bg-surface-2"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-10 text-center text-sm font-bold tabular-nums">{line.qty}</span>
                              <button onClick={() => updateQty(product.id, 1)} className="h-9 w-9 grid place-items-center hover:bg-surface-2"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                            <button onClick={() => remove(product.id)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-black tabular-nums">{formatPKR(product.price * line.qty)}</div>
                          {product.comparePrice && <div className="text-xs text-muted-foreground line-through tabular-nums">{formatPKR(product.comparePrice * line.qty)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <aside className="lg:sticky lg:top-32 lg:self-start space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-black text-lg">Order summary</h2>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal ({lines.length} items)</dt><dd className="font-semibold tabular-nums">{formatPKR(subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Shipping ({grouped.length} sellers)</dt><dd className="font-semibold tabular-nums">{shipping === 0 ? <span className="text-success">FREE</span> : formatPKR(shipping)}</dd></div>
                  <div className="flex justify-between text-success"><dt>Marketplace discount</dt><dd className="font-semibold tabular-nums">– {formatPKR(0)}</dd></div>
                </dl>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-baseline">
                  <span className="font-black text-lg">Total</span>
                  <span className="font-black text-2xl tabular-nums">{formatPKR(total)}</span>
                </div>

                <div className="mt-5 flex gap-2">
                  <div className="flex-1 flex items-center bg-surface-2 rounded-lg px-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <input placeholder="Coupon code" className="flex-1 bg-transparent px-2 py-2.5 text-sm focus:outline-none" />
                  </div>
                  <button className="px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover">Apply</button>
                </div>

                <Link to="/checkout" className="mt-5 w-full h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95">
                  Proceed to checkout <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Secure marketplace checkout. COD available on all orders. 7-day easy returns from every verified seller.</span>
                </div>
              </div>

              {subtotal < 5000 && (
                <div className="bg-accent-soft border border-accent/20 rounded-xl p-4 text-sm">
                  <strong className="text-foreground">Almost there!</strong> Add <span className="font-bold tabular-nums">{formatPKR(5000 - subtotal)}</span> more to unlock <strong>FREE shipping</strong> across all sellers.
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </PageLayout>
  );
}