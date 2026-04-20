import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Car, Search, ArrowRight } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { vehicles, products, categories } from "@/data/marketplace";

export const Route = createFileRoute("/compatibility")({
  head: () => ({
    meta: [
      { title: "Find Parts For Your Car — SpareKart" },
      { name: "description", content: "Use our smart compatibility selector to find car spare parts that fit your exact make, model and year. Toyota, Honda, Suzuki, Hyundai, KIA and more." },
      { property: "og:title", content: "Find Parts For Your Car — SpareKart" },
      { property: "og:description", content: "Find spare parts that fit your exact car. Toyota, Honda, Suzuki and more." },
    ],
  }),
  component: Compatibility,
});

function Compatibility() {
  const [brand, setBrand] = useState(vehicles[0].brand);
  const [model, setModel] = useState(vehicles[0].models[0].name);
  const [year, setYear] = useState<number>(vehicles[0].models[0].years[0]);
  const [engine, setEngine] = useState(vehicles[0].models[0].engines[0]);
  const [submitted, setSubmitted] = useState(true);

  const selBrand = vehicles.find((v) => v.brand === brand)!;
  const selModel = selBrand.models.find((m) => m.name === model) ?? selBrand.models[0];

  const matches = submitted
    ? products.filter((p) => p.compatibility.some((c) => c.brand === brand && c.model === model && c.years.includes(year)))
    : [];
  const display = matches.length ? matches : products.slice(0, 12);

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Find Parts For Your Car" }]} />
      </div>

      {/* Hero selector */}
      <section className="container mx-auto px-4">
        <div className="rounded-3xl gradient-hero text-primary-foreground p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 30%, oklch(0.72 0.19 50 / 0.5), transparent 50%)" }} />
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold">
                <Car className="h-3.5 w-3.5 text-accent" /> Smart Compatibility Engine
              </div>
              <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight text-balance">Find parts that fit your car perfectly.</h1>
              <p className="mt-4 opacity-85 text-balance max-w-md">Select your vehicle and we'll show only parts that are guaranteed to fit. Backed by our fitment guarantee.</p>
            </div>
            <div className="bg-card text-foreground rounded-2xl p-6 shadow-[var(--shadow-premium)]">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand">
                  <select value={brand} onChange={(e) => { setBrand(e.target.value); const b = vehicles.find(v => v.brand === e.target.value)!; setModel(b.models[0].name); setYear(b.models[0].years[0]); setEngine(b.models[0].engines[0]); }} className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                    {vehicles.map((v) => <option key={v.brand}>{v.brand}</option>)}
                  </select>
                </Field>
                <Field label="Model">
                  <select value={model} onChange={(e) => { setModel(e.target.value); const m = selBrand.models.find(x => x.name === e.target.value)!; setYear(m.years[0]); setEngine(m.engines[0]); }} className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                    {selBrand.models.map((m) => <option key={m.name}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Year">
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                    {selModel.years.map((y) => <option key={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="Engine">
                  <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
                    {selModel.engines.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </Field>
              </div>
              <button onClick={() => setSubmitted(true)} className="w-full mt-4 h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity">
                <Search className="h-4 w-4" /> Find compatible parts
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 py-12">
        {submitted && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Parts for {brand} {model} {year}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {matches.length > 0 ? <><span className="font-semibold text-foreground tabular-nums">{matches.length}</span> compatible parts found</> : <span>No exact matches yet — showing popular parts instead.</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 5).map((c) => (
                <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-card border border-border hover:border-accent hover:text-accent transition-colors">{c.name}</Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {display.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        <div className="mt-12 rounded-2xl bg-accent-soft border border-accent/20 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-accent text-primary grid place-items-center"><Car className="h-6 w-6" /></div>
            <div>
              <div className="font-bold">Not sure what fits?</div>
              <div className="text-sm text-muted-foreground">Chat with a verified seller for free fitment advice.</div>
            </div>
          </div>
          <Link to="/sellers" className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary-hover">Browse sellers <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </PageLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}