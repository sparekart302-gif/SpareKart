import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { products, categories } from "@/data/marketplace";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [
    { title: "Search Results — SpareKart" },
    { name: "description", content: "Search across thousands of car spare parts from verified Pakistani sellers." },
    { property: "og:title", content: "Search — SpareKart" },
    { property: "og:description", content: "Search auto parts across SpareKart." },
  ] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("brake pads");
  const results = products.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.brand.toLowerCase().includes(q.toLowerCase()));
  const display = results.length ? results : products.slice(0, 10);

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Search" }]} />
      </div>
      <section className="container mx-auto px-4 pb-16">
        <form onSubmit={(e) => e.preventDefault()} className="flex items-center bg-card rounded-2xl border border-border focus-within:border-accent shadow-[var(--shadow-soft)] p-2 max-w-2xl">
          <SearchIcon className="h-5 w-5 ml-3 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts, brands, SKUs…" className="flex-1 bg-transparent px-3 h-11 text-sm focus:outline-none" />
          <button className="px-5 h-11 rounded-xl gradient-accent text-primary font-bold text-sm">Search</button>
        </form>

        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black">Results for "{q}"</h1>
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{results.length}</span> products found{results.length === 0 && " — showing popular alternatives"}</p>
          </div>
          {results.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-accent font-semibold"><Sparkles className="h-3.5 w-3.5" /> Did you mean: <button onClick={() => setQ("brake")} className="underline">brake</button>, <button onClick={() => setQ("oil filter")} className="underline">oil filter</button>?</div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.slice(0, 6).map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-card border border-border hover:border-accent hover:text-accent">{c.name}</Link>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {display.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </PageLayout>
  );
}