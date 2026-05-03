"use client";

import { useState, type ReactNode } from "react";
import { Car, Search, ArrowRight } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { vehicles } from "@/data/marketplace";
import {
  getActiveMarketplaceCategories,
  getActiveMarketplaceProducts,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

export default function CompatibilityPage() {
  const { state } = useMarketplace();
  const products = getActiveMarketplaceProducts(state);
  const categories = getActiveMarketplaceCategories(state);
  const [brand, setBrand] = useState(vehicles[0].brand);
  const [model, setModel] = useState(vehicles[0].models[0].name);
  const [year, setYear] = useState<number>(vehicles[0].models[0].years[0]);
  const [engine, setEngine] = useState(vehicles[0].models[0].engines[0]);
  const [submitted, setSubmitted] = useState(true);

  const selBrand = vehicles.find((v) => v.brand === brand)!;
  const selModel = selBrand.models.find((m) => m.name === model) ?? selBrand.models[0];

  const matches = submitted
    ? products.filter((p) =>
        p.compatibility.some(
          (c) => c.brand === brand && c.model === model && c.years.includes(year),
        ),
      )
    : [];
  const display = matches.length ? matches : products.slice(0, 12);

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Find Parts For Your Car" }]} />
      </div>

      <section className="container mx-auto px-4 pb-4">
        <div className="rounded-[28px] bg-surface p-4 shadow-[var(--shadow-premium)] sm:p-6 lg:rounded-[34px] lg:p-10">
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_420px] lg:gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
                <Car className="h-3.5 w-3.5 text-accent" /> Smart Compatibility Engine
              </div>
              <h1 className="mt-3 text-[1.9rem] font-black tracking-tight text-balance sm:mt-4 sm:text-3xl md:text-5xl">
                Find parts that fit your car perfectly.
              </h1>
              <p className="mt-3 max-w-md text-sm text-balance text-muted-foreground sm:mt-4 sm:text-base">
                Select your vehicle and we'll show only parts that are guaranteed to fit. Backed by
                our fitment guarantee.
              </p>
            </div>
            <div className="rounded-[24px] bg-card p-4 text-foreground shadow-[var(--shadow-elevated)] sm:rounded-[28px] sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Brand">
                  <select
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      const b = vehicles.find((v) => v.brand === e.target.value)!;
                      setModel(b.models[0].name);
                      setYear(b.models[0].years[0]);
                      setEngine(b.models[0].engines[0]);
                    }}
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {vehicles.map((v) => (
                      <option key={v.brand}>{v.brand}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Model">
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      const m = selBrand.models.find((x) => x.name === e.target.value)!;
                      setYear(m.years[0]);
                      setEngine(m.engines[0]);
                    }}
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {selBrand.models.map((m) => (
                      <option key={m.name}>{m.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Year">
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {selModel.years.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Engine">
                  <select
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {selModel.engines.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <button
                onClick={() => setSubmitted(true)}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary transition-opacity hover:opacity-95 sm:h-12"
              >
                <Search className="h-4 w-4" /> Find compatible parts
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        {submitted && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
            <div>
              <h2 className="text-[1.6rem] font-black tracking-tight sm:text-2xl">
                Parts for {brand} {model} {year}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {matches.length > 0 ? (
                  <>
                    <span className="font-semibold text-foreground tabular-nums">
                      {matches.length}
                    </span>{" "}
                    compatible parts found
                  </>
                ) : (
                  <span>No exact matches yet — showing popular parts instead.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 5).map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {display.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-[24px] bg-accent-soft/80 p-4 shadow-[var(--shadow-soft)] sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:rounded-[28px] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-accent text-primary grid place-items-center">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold">Not sure what fits?</div>
              <div className="text-sm text-muted-foreground">
                Chat with a verified seller for free fitment advice.
              </div>
            </div>
          </div>
          <Link
            to="/sellers"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:w-auto"
          >
            Browse sellers <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageLayout>
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
