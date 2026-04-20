import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Star, BadgeCheck, MapPin, Calendar, Package, Clock, Truck, RotateCcw, ShieldCheck, MessageCircle } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { getSeller, getProductsBySeller, storeReviews, sellers, categories } from "@/data/marketplace";

export const Route = createFileRoute("/seller/$slug")({
  loader: ({ params }) => {
    const seller = sellers.find((s) => s.slug === params.slug);
    if (!seller) throw notFound();
    return { seller };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.seller.name} — ${loaderData.seller.tagline} | SpareKart` },
      { name: "description", content: loaderData.seller.description },
      { property: "og:title", content: `${loaderData.seller.name} — SpareKart` },
      { property: "og:description", content: loaderData.seller.description },
      { property: "og:image", content: loaderData.seller.banner },
    ] : [],
  }),
  notFoundComponent: () => (
    <PageLayout><div className="container mx-auto px-4 py-24 text-center"><h1 className="text-3xl font-bold">Seller not found</h1><Link to="/sellers" className="mt-4 inline-block text-accent font-semibold">Browse all sellers →</Link></div></PageLayout>
  ),
  component: SellerPage,
});

function SellerPage() {
  const { seller } = Route.useLoaderData();
  const items = getProductsBySeller(seller.slug);
  const reviews = storeReviews.filter((r) => r.sellerSlug === seller.slug);
  const [tab, setTab] = useState<"products" | "reviews" | "policies">("products");

  return (
    <PageLayout>
      {/* Banner */}
      <section className="relative">
        <div className="h-48 md:h-64 lg:h-72 overflow-hidden">
          <img src={seller.banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        <div className="container mx-auto px-4 -mt-20 relative">
          <div className="bg-card border border-border rounded-3xl p-6 lg:p-8 shadow-[var(--shadow-elevated)]">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <img src={seller.logo} alt={seller.name} className="h-24 w-24 lg:h-28 lg:w-28 rounded-2xl object-cover border-4 border-card shadow-[var(--shadow-soft)] -mt-16" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{seller.name}</h1>
                  {seller.verified && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-info/10 text-info text-xs font-bold"><BadgeCheck className="h-3.5 w-3.5" /> Verified Seller</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{seller.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <div className="flex items-center gap-1"><Star className="h-4 w-4 text-warning fill-current" /><span className="font-bold tabular-nums">{seller.rating}</span><span className="text-muted-foreground">({seller.reviewCount} reviews)</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Package className="h-4 w-4" /> {seller.productCount} products</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" /> {seller.city}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-4 w-4" /> Joined {new Date(seller.joined).getFullYear()}</div>
                  <div className="flex items-center gap-1.5 text-success font-semibold"><Clock className="h-4 w-4" /> {seller.responseTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary-hover">Follow store</button>
                <button className="h-11 px-5 rounded-xl border border-border bg-card font-semibold text-sm flex items-center gap-2 hover:bg-surface-2"><MessageCircle className="h-4 w-4" /> Message</button>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-3xl">{seller.description}</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Sellers", to: "/sellers" }, { label: seller.name }]} />
        <div className="border-b border-border flex gap-1 mt-2">
          {[
            { key: "products", label: `Products (${items.length})` },
            { key: "reviews", label: `Store Reviews (${seller.reviewCount})` },
            { key: "policies", label: "Policies" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`px-5 py-3 text-sm font-semibold relative transition-colors ${tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
              {tab === t.key && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent rounded-full" />}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "products" && (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.slice(0, 6).map((c) => (
                  <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-card border border-border hover:border-accent hover:text-accent">{c.name}</Link>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}

          {tab === "reviews" && (
            <div className="grid lg:grid-cols-[300px_1fr] gap-8">
              <div className="p-5 rounded-2xl bg-card border border-border h-fit">
                <div className="text-5xl font-black tabular-nums">{seller.rating}</div>
                <div className="flex text-warning mt-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(seller.rating) ? "fill-current" : ""}`} />)}</div>
                <div className="text-xs text-muted-foreground mt-1">{seller.reviewCount} reviews</div>
                <div className="mt-4 space-y-2">
                  {[{ label: "Service", v: 4.8 }, { label: "Delivery", v: 4.9 }, { label: "Communication", v: 4.7 }].map((m) => (
                    <div key={m.label} className="text-xs">
                      <div className="flex justify-between mb-1"><span className="text-muted-foreground">{m.label}</span><span className="font-bold tabular-nums">{m.v}</span></div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-success" style={{ width: `${(m.v / 5) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {reviews.map((r) => (
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "policies" && (
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl">
              {[
                { Icon: RotateCcw, title: "Returns", body: seller.policies.returns },
                { Icon: Truck, title: "Shipping", body: seller.policies.shipping },
                { Icon: ShieldCheck, title: "Warranty", body: seller.policies.warranty },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="p-5 rounded-2xl bg-card border border-border">
                  <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent grid place-items-center"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-3 font-bold">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}