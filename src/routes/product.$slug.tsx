import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Star, BadgeCheck, Heart, Share2, ShoppingCart, Zap, Truck, RotateCcw, ShieldCheck, Minus, Plus, MessageCircle, Clock } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { getProduct, getSeller, products, productReviews, storeReviews, formatPKR, type Product, type Seller } from "@/data/marketplace";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    const seller = getSeller(product.sellerSlug);
    return { product, seller };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.product.title} — ${loaderData.product.brand} | SpareKart` },
      { name: "description", content: loaderData.product.shortDescription },
      { property: "og:title", content: loaderData.product.title },
      { property: "og:description", content: loaderData.product.shortDescription },
      { property: "og:image", content: loaderData.product.images[0] },
      { property: "og:type", content: "product" },
    ] : [],
  }),
  notFoundComponent: () => (
    <PageLayout><div className="container mx-auto px-4 py-24 text-center"><h1 className="text-3xl font-bold">Product not found</h1><Link to="/shop" className="mt-4 inline-block text-accent font-semibold">Back to shop →</Link></div></PageLayout>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product, seller } = Route.useLoaderData() as { product: Product; seller: Seller };
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs" | "compat" | "ship">("desc");

  const reviews = productReviews.filter((r) => r.productId === product.id);
  const sReviews = storeReviews.filter((r) => r.sellerSlug === seller.slug);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 5);
  const otherSellers = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
  const discount = product.comparePrice ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0;

  const stockState = product.stock === 0 ? "out" : product.stock <= 5 ? "low" : "in";

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[
          { label: "Home", to: "/" },
          { label: "Shop", to: "/shop" },
          { label: product.brand },
          { label: product.title },
        ]} />
      </div>

      <section className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-[1fr_1.1fr_360px] gap-8">
          {/* Gallery */}
          <div>
            <div className="aspect-square bg-card border border-border rounded-2xl overflow-hidden group">
              <img src={product.images[activeImg]} alt={product.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${i === activeImg ? "border-accent shadow-[var(--shadow-glow)]" : "border-border hover:border-border-strong"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{product.brand}</span>
              <span>·</span>
              <span>SKU: {product.sku}</span>
              {product.badge && <span className="px-2 py-0.5 rounded-md bg-accent text-primary text-[10px] font-bold uppercase">{product.badge}</span>}
            </div>
            <h1 className="mt-2 text-3xl lg:text-4xl font-black tracking-tight text-balance">{product.title}</h1>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="flex text-warning">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current" : ""}`} />)}
                </div>
                <span className="text-sm font-bold tabular-nums">{product.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <button className="text-sm text-accent font-semibold hover:underline flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{product.shortDescription}</p>

            {/* Compatibility quick view */}
            <div className="mt-6 p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 text-sm font-bold text-success">
                <BadgeCheck className="h-4 w-4" /> Verified fitment for:
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.compatibility.map((c, i) => (
                  <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-card border border-border">
                    {c.brand} {c.model} ({c.years[0]}–{c.years[c.years.length - 1]})
                  </span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 border-b border-border flex gap-1">
              {[
                { key: "desc", label: "Description" },
                { key: "specs", label: "Specifications" },
                { key: "compat", label: "Compatibility" },
                { key: "ship", label: "Shipping & Returns" },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`px-4 py-3 text-sm font-semibold relative transition-colors ${tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                  {tab === t.key && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />}
                </button>
              ))}
            </div>
            <div className="mt-6 text-sm leading-relaxed">
              {tab === "desc" && <div className="space-y-3 text-muted-foreground whitespace-pre-line">{product.description}</div>}
              {tab === "specs" && (
                <table className="w-full text-sm">
                  <tbody>
                    {product.specs.map((s) => (
                      <tr key={s.label} className="border-b border-border">
                        <td className="py-3 text-muted-foreground w-40">{s.label}</td>
                        <td className="py-3 font-semibold">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === "compat" && (
                <div className="space-y-2">
                  {product.compatibility.map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-2">
                      <div>
                        <div className="font-semibold">{c.brand} {c.model}</div>
                        <div className="text-xs text-muted-foreground">Years: {c.years.join(", ")}</div>
                      </div>
                      <BadgeCheck className="h-5 w-5 text-success" />
                    </div>
                  ))}
                </div>
              )}
              {tab === "ship" && (
                <div className="space-y-4 text-muted-foreground">
                  <div className="flex gap-3"><Truck className="h-5 w-5 text-accent shrink-0 mt-0.5" /><div><div className="font-semibold text-foreground">Nationwide delivery</div>Delivered in 2–5 business days across Pakistan. Free over Rs. 5,000.</div></div>
                  <div className="flex gap-3"><RotateCcw className="h-5 w-5 text-accent shrink-0 mt-0.5" /><div><div className="font-semibold text-foreground">7-day easy returns</div>Wrong fitment? Return for full refund within 7 days.</div></div>
                  <div className="flex gap-3"><ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" /><div><div className="font-semibold text-foreground">Seller warranty</div>{seller.policies.warranty}</div></div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase card */}
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black tabular-nums">{formatPKR(product.price)}</span>
                {product.comparePrice && <span className="text-sm text-muted-foreground line-through tabular-nums">{formatPKR(product.comparePrice)}</span>}
              </div>
              {discount > 0 && <div className="mt-1 text-xs font-bold text-destructive">You save {formatPKR((product.comparePrice ?? 0) - product.price)} ({discount}% off)</div>}

              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${stockState === "in" ? "bg-success" : stockState === "low" ? "bg-warning" : "bg-destructive"}`} />
                <span className={`font-bold ${stockState === "in" ? "text-success" : stockState === "low" ? "text-warning-foreground" : "text-destructive"}`}>
                  {stockState === "in" ? "In stock — ships today" : stockState === "low" ? `Only ${product.stock} left in stock` : "Currently out of stock"}
                </span>
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold text-muted-foreground">Quantity</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="inline-flex items-center border border-border rounded-lg">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 grid place-items-center hover:bg-surface-2"><Minus className="h-4 w-4" /></button>
                    <span className="w-12 text-center font-bold tabular-nums">{qty}</span>
                    <button onClick={() => setQty(qty + 1)} className="h-10 w-10 grid place-items-center hover:bg-surface-2"><Plus className="h-4 w-4" /></button>
                  </div>
                  <span className="text-xs text-muted-foreground">Total: <span className="font-bold text-foreground tabular-nums">{formatPKR(product.price * qty)}</span></span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button className="w-full h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity">
                  <Zap className="h-4 w-4" /> Buy Now
                </button>
                <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors">
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </button>
                <button className="w-full h-11 rounded-xl bg-surface-2 text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                  <Heart className="h-4 w-4" /> Save for later
                </button>
              </div>

              <div className="mt-5 pt-5 border-t border-border space-y-2.5 text-xs">
                <div className="flex gap-2"><Truck className="h-4 w-4 text-accent shrink-0" /><span><span className="font-semibold">Free delivery</span> on orders over Rs. 5,000</span></div>
                <div className="flex gap-2"><RotateCcw className="h-4 w-4 text-accent shrink-0" /><span>7-day easy returns</span></div>
                <div className="flex gap-2"><ShieldCheck className="h-4 w-4 text-accent shrink-0" /><span>Fitment guarantee from SpareKart</span></div>
              </div>
            </div>

            {/* Sold by */}
            <Link to="/seller/$slug" params={{ slug: seller.slug }} className="block bg-card border border-border rounded-2xl p-5 hover:border-accent transition-colors">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Sold by</div>
              <div className="mt-2 flex items-center gap-3">
                <img src={seller.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="font-bold truncate">{seller.name}</div>
                    {seller.verified && <BadgeCheck className="h-4 w-4 text-info" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{seller.tagline}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-surface-2">
                  <div className="text-sm font-black tabular-nums flex items-center justify-center gap-0.5"><Star className="h-3 w-3 text-warning fill-current" />{seller.rating}</div>
                  <div className="text-[10px] text-muted-foreground">Rating</div>
                </div>
                <div className="p-2 rounded-lg bg-surface-2">
                  <div className="text-sm font-black tabular-nums">{seller.productCount}</div>
                  <div className="text-[10px] text-muted-foreground">Products</div>
                </div>
                <div className="p-2 rounded-lg bg-surface-2">
                  <div className="text-sm font-black flex items-center justify-center gap-1"><Clock className="h-3 w-3" />2h</div>
                  <div className="text-[10px] text-muted-foreground">Response</div>
                </div>
              </div>
              <button className="mt-3 w-full h-10 rounded-lg border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-2"><MessageCircle className="h-4 w-4" /> Chat with seller</button>
            </Link>
          </aside>
        </div>
      </section>

      {/* Product Reviews block (separate) */}
      <section className="container mx-auto px-4 py-12 border-t border-border">
        <div className="grid lg:grid-cols-[300px_1fr] gap-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">Product Reviews</div>
            <h2 className="text-3xl font-black mt-1">Verified buyer feedback</h2>
            <div className="mt-6 p-5 rounded-2xl bg-card border border-border">
              <div className="text-5xl font-black tabular-nums text-foreground">{product.rating.toFixed(1)}</div>
              <div className="flex text-warning mt-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current" : ""}`} />)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Based on {product.reviewCount} verified reviews</div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Fitment", value: 4.7 },
                  { label: "Quality", value: 4.6 },
                  { label: "Value", value: 4.5 },
                ].map((m) => (
                  <div key={m.label} className="text-xs">
                    <div className="flex justify-between mb-1"><span className="text-muted-foreground">{m.label}</span><span className="font-bold tabular-nums">{m.value}</span></div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(m.value / 5) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent-soft text-accent font-bold grid place-items-center text-sm">{r.author[0]}</div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5">{r.author} {r.verified && <BadgeCheck className="h-3.5 w-3.5 text-success" />}</div>
                      <div className="text-xs text-muted-foreground">{r.date} · Verified buyer</div>
                    </div>
                  </div>
                  <div className="flex text-warning">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`} />)}
                  </div>
                </div>
                <h4 className="mt-3 font-bold">{r.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                  <span>Fitment <strong className="text-foreground tabular-nums">{r.fitment}/5</strong></span>
                  <span>Quality <strong className="text-foreground tabular-nums">{r.quality}/5</strong></span>
                  <span>Value <strong className="text-foreground tabular-nums">{r.value}/5</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store reputation block (separate) */}
      <section className="container mx-auto px-4 py-12 border-t border-border">
        <div className="grid lg:grid-cols-[300px_1fr] gap-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">Seller Reputation</div>
            <h2 className="text-3xl font-black mt-1">About this store</h2>
            <p className="text-sm text-muted-foreground mt-3">Independent reviews of <span className="font-semibold text-foreground">{seller.name}</span>'s service, delivery and communication.</p>
            <div className="mt-6 p-5 rounded-2xl bg-card border border-border">
              <div className="text-5xl font-black tabular-nums">{seller.rating}</div>
              <div className="flex text-warning mt-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(seller.rating) ? "fill-current" : ""}`} />)}</div>
              <div className="text-xs text-muted-foreground mt-1">{seller.reviewCount} store reviews</div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Service", value: 4.8 },
                  { label: "Delivery", value: 4.9 },
                  { label: "Communication", value: 4.7 },
                ].map((m) => (
                  <div key={m.label} className="text-xs">
                    <div className="flex justify-between mb-1"><span className="text-muted-foreground">{m.label}</span><span className="font-bold tabular-nums">{m.value}</span></div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-success" style={{ width: `${(m.value / 5) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {sReviews.map((r) => (
              <div key={r.id} className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-info/10 text-info font-bold grid place-items-center text-sm">{r.author[0]}</div>
                    <div>
                      <div className="font-bold text-sm">{r.author}</div>
                      <div className="text-xs text-muted-foreground">{r.date}</div>
                    </div>
                  </div>
                  <div className="flex text-warning">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`} />)}</div>
                </div>
                <h4 className="mt-3 font-bold">{r.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                  <span>Service <strong className="text-foreground tabular-nums">{r.service}/5</strong></span>
                  <span>Delivery <strong className="text-foreground tabular-nums">{r.delivery}/5</strong></span>
                  <span>Communication <strong className="text-foreground tabular-nums">{r.communication}/5</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other sellers offering this part */}
      <section className="container mx-auto px-4 py-12 border-t border-border">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">Compare offers</div>
            <h2 className="text-2xl font-black mt-1">Other sellers offering similar parts</h2>
          </div>
        </div>
        <div className="space-y-2">
          {otherSellers.map((p) => {
            const s = getSeller(p.sellerSlug);
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <img src={p.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="font-bold text-sm hover:text-accent line-clamp-1">{p.title}</Link>
                  <Link to="/seller/$slug" params={{ slug: s.slug }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mt-0.5">
                    Sold by <span className="font-semibold text-foreground">{s.name}</span> {s.verified && <BadgeCheck className="h-3 w-3 text-info" />}
                    <span className="text-warning ml-2 flex items-center gap-0.5"><Star className="h-3 w-3 fill-current" /> <span className="text-foreground font-semibold tabular-nums">{s.rating}</span></span>
                  </Link>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black tabular-nums">{formatPKR(p.price)}</div>
                  <button className="mt-1 h-9 px-4 rounded-lg gradient-accent text-primary text-xs font-bold">Add to cart</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Related */}
      <section className="container mx-auto px-4 py-12 border-t border-border">
        <h2 className="text-2xl md:text-3xl font-black mb-6">You may also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </PageLayout>
  );
}