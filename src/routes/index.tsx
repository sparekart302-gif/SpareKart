import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search, ArrowRight, ShieldCheck, Banknote, RotateCcw, BadgeCheck, Sparkles, TrendingUp, ChevronRight, Disc, Cog, Activity, Lightbulb, Zap, Car, Armchair, CircleDot, Store } from "lucide-react";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { categories, products, sellers, brands, vehicles, trustPillars } from "@/data/marketplace";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpareKart — Pakistan's Premium Auto Parts Marketplace" },
      { name: "description", content: "Shop genuine car spare parts from verified sellers across Pakistan. Brakes, engines, lighting, suspension and more — with COD, fitment guarantee and easy returns." },
      { property: "og:title", content: "SpareKart — Pakistan's Premium Auto Parts Marketplace" },
      { property: "og:description", content: "Genuine car parts from verified Pakistani sellers. COD nationwide. Fitment guarantee." },
    ],
  }),
  component: Home,
});

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Disc, Cog, Activity, Lightbulb, Zap, Car, Armchair, CircleDot, ShieldCheck, Banknote, RotateCcw, BadgeCheck,
};

function Home() {
  const [vBrand, setVBrand] = useState(vehicles[0].brand);
  const [vModel, setVModel] = useState(vehicles[0].models[0].name);
  const [vYear, setVYear] = useState<number>(vehicles[0].models[0].years[0]);
  const selectedBrand = vehicles.find((v) => v.brand === vBrand)!;
  const selectedModel = selectedBrand.models.find((m) => m.name === vModel) ?? selectedBrand.models[0];

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.72 0.19 50 / 0.4), transparent 40%), radial-gradient(circle at 80% 30%, oklch(0.55 0.18 290 / 0.3), transparent 40%)" }} />
        <div className="container mx-auto px-4 py-16 lg:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold mb-6">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Pakistan's #1 multi-vendor auto parts marketplace
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-balance">
                Genuine car parts.<br />
                <span className="bg-gradient-to-r from-accent to-orange-300 bg-clip-text text-transparent">Verified sellers.</span><br />
                Delivered nationwide.
              </h1>
              <p className="mt-6 text-lg opacity-85 max-w-xl text-balance">
                Shop from thousands of OEM and performance parts across 8+ verified stores. Cash on delivery, fitment guarantee, and 7-day easy returns.
              </p>

              <form onSubmit={(e) => e.preventDefault()} className="mt-8 flex items-center bg-card text-foreground rounded-2xl shadow-[var(--shadow-premium)] p-2 max-w-xl">
                <Search className="h-5 w-5 ml-3 text-muted-foreground" />
                <input placeholder="Search parts, brands, or part numbers…" className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none" />
                <button className="px-6 h-12 rounded-xl gradient-accent text-primary font-bold text-sm hover:opacity-95 transition-opacity">Search</button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm opacity-90">
                <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent" /> 8+ verified sellers</div>
                <div className="flex items-center gap-1.5"><Banknote className="h-4 w-4 text-accent" /> COD all over Pakistan</div>
                <div className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-accent" /> Fitment guaranteed</div>
              </div>
            </motion.div>

            {/* Compatibility selector card */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="lg:justify-self-end w-full max-w-md">
              <div className="bg-card text-foreground rounded-3xl p-6 shadow-[var(--shadow-premium)]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-accent font-bold">Find Parts For Your Car</div>
                    <h3 className="text-xl font-bold mt-0.5">Garage selector</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-accent-soft grid place-items-center"><Car className="h-5 w-5 text-accent" /></div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Brand</label>
                    <select value={vBrand} onChange={(e) => { setVBrand(e.target.value); const b = vehicles.find(v => v.brand === e.target.value)!; setVModel(b.models[0].name); setVYear(b.models[0].years[0]); }} className="w-full mt-1 h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                      {vehicles.map((v) => <option key={v.brand}>{v.brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Model</label>
                    <select value={vModel} onChange={(e) => { setVModel(e.target.value); const m = selectedBrand.models.find(x => x.name === e.target.value)!; setVYear(m.years[0]); }} className="w-full mt-1 h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                      {selectedBrand.models.map((m) => <option key={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Year</label>
                    <select value={vYear} onChange={(e) => setVYear(Number(e.target.value))} className="w-full mt-1 h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                      {selectedModel.years.map((y) => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <Link to="/compatibility" className="mt-2 h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity">
                    Find Parts <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust pillars */}
      <section className="border-y border-border bg-surface">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustPillars.map((p) => {
            const Icon = iconMap[p.icon];
            return (
              <div key={p.title} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-accent-soft grid place-items-center shrink-0">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-bold text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">Shop by category</div>
            <h2 className="text-3xl md:text-4xl font-black mt-1 tracking-tight">Browse what you need</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">View all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((c, i) => {
            const Icon = iconMap[c.icon];
            return (
              <motion.div key={c.slug} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <Link to="/category/$slug" params={{ slug: c.slug }} className="group block p-5 rounded-2xl bg-card border border-border hover-lift text-center">
                  <div className="h-14 w-14 mx-auto rounded-2xl gradient-surface border border-border grid place-items-center group-hover:bg-accent group-hover:text-primary group-hover:border-accent transition-all">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary" />
                  </div>
                  <div className="mt-3 text-sm font-bold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{c.productCount} items</div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trending products */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Trending right now</div>
            <h2 className="text-3xl md:text-4xl font-black mt-1 tracking-tight">Best-selling parts this week</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">Shop all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.slice(0, 10).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Promo banner */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl gradient-hero text-primary-foreground p-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, oklch(0.72 0.19 50 / 0.5), transparent 50%)" }} />
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-accent font-bold">Service Specials</div>
              <h3 className="text-3xl font-black mt-2 max-w-xs">Up to 30% off engine oils & filters</h3>
              <p className="mt-3 text-sm opacity-80 max-w-sm">Genuine Mobil 1, Shell, Bosch and Denso. While stocks last.</p>
              <Link to="/category/$slug" params={{ slug: "engine" }} className="mt-6 inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-accent text-primary font-bold text-sm hover:opacity-90 transition-opacity">Shop deals <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          <div className="rounded-3xl bg-accent-soft border border-accent/20 p-10 relative overflow-hidden">
            <div className="text-xs uppercase tracking-widest text-accent font-bold">For Sellers</div>
            <h3 className="text-3xl font-black mt-2 text-primary max-w-xs">Open your store on SpareKart</h3>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm">Reach thousands of buyers across Pakistan. Zero monthly fee — pay only when you sell.</p>
            <Link to="/seller-onboarding" className="mt-6 inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-hover transition-colors">
              <Store className="h-4 w-4" /> Become a seller
            </Link>
          </div>
        </div>
      </section>

      {/* Top sellers */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">Top verified sellers</div>
            <h2 className="text-3xl md:text-4xl font-black mt-1 tracking-tight">Trusted by thousands</h2>
          </div>
          <Link to="/sellers" className="text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">All sellers <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sellers.slice(0, 4).map((s) => <SellerCard key={s.slug} seller={s} />)}
        </div>
      </section>

      {/* Brands strip */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">Authentic brands</div>
          <h2 className="text-3xl md:text-4xl font-black mt-1 tracking-tight">Shop the brands you trust</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {brands.map((b) => (
            <div key={b.slug} className="px-6 h-14 rounded-xl bg-card border border-border flex items-center justify-center font-bold text-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer">
              {b.name}
            </div>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">Just landed</div>
            <h2 className="text-3xl md:text-4xl font-black mt-1 tracking-tight">New arrivals</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-accent hover:text-accent-hover flex items-center gap-1">Browse all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.slice(15, 25).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </PageLayout>
  );
}
