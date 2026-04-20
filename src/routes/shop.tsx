import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, Grid3x3, List, Star } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { products, categories, brands, sellers } from "@/data/marketplace";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All Auto Parts — SpareKart" },
      { name: "description", content: "Browse thousands of car spare parts from verified Pakistani sellers. Filter by brand, model, year, price and more." },
      { property: "og:title", content: "Shop All Auto Parts — SpareKart" },
      { property: "og:description", content: "Browse thousands of car spare parts from verified Pakistani sellers." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [sort, setSort] = useState("popular");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(30000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const filtered = useMemo(() => {
    let list = products.slice();
    if (selectedCats.length) list = list.filter((p) => selectedCats.includes(p.category));
    if (selectedBrands.length) list = list.filter((p) => selectedBrands.includes(p.brand));
    if (selectedSellers.length) list = list.filter((p) => selectedSellers.includes(p.sellerSlug));
    list = list.filter((p) => p.price <= priceMax);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    if (minRating) list = list.filter((p) => p.rating >= minRating);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "newest") list.reverse();
    return list;
  }, [selectedCats, selectedBrands, selectedSellers, priceMax, inStockOnly, minRating, sort]);

  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Shop All Parts" }]} />
      </div>

      <div className="container mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Filter sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto pr-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</h2>
              <button onClick={() => { setSelectedCats([]); setSelectedBrands([]); setSelectedSellers([]); setPriceMax(30000); setInStockOnly(false); setMinRating(0); }} className="text-xs text-accent font-semibold hover:underline">Clear all</button>
            </div>

            <FilterGroup title="Category">
              {categories.map((c) => (
                <Checkbox key={c.slug} label={c.name} count={c.productCount} checked={selectedCats.includes(c.slug)} onChange={() => toggle(selectedCats, setSelectedCats, c.slug)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Price (PKR)">
              <div className="px-1">
                <input type="range" min={500} max={30000} step={500} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full accent-[oklch(0.72_0.19_50)]" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground tabular-nums">
                  <span>Rs. 500</span>
                  <span className="font-bold text-foreground">Up to Rs. {priceMax.toLocaleString()}</span>
                </div>
              </div>
            </FilterGroup>

            <FilterGroup title="Brand">
              {brands.map((b) => (
                <Checkbox key={b.slug} label={b.name} checked={selectedBrands.includes(b.name)} onChange={() => toggle(selectedBrands, setSelectedBrands, b.name)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Seller">
              {sellers.map((s) => (
                <Checkbox key={s.slug} label={s.name} count={s.productCount} checked={selectedSellers.includes(s.slug)} onChange={() => toggle(selectedSellers, setSelectedSellers, s.slug)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Seller rating">
              {[4, 3, 0].map((r) => (
                <button key={r} onClick={() => setMinRating(r)} className={`flex items-center gap-2 w-full text-sm py-1.5 px-2 rounded-md ${minRating === r ? "bg-accent-soft text-foreground" : "hover:bg-surface-2"}`}>
                  <div className="flex text-warning">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r ? "fill-current" : "text-border"}`} />)}</div>
                  <span>{r === 0 ? "All ratings" : `${r}+ stars`}</span>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title="Availability">
              <Checkbox label="In stock only" checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} />
              <Checkbox label="Free shipping" />
              <Checkbox label="Same-day dispatch" />
            </FilterGroup>
          </aside>

          {/* Results */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-card border border-border rounded-xl p-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">All Auto Parts</h1>
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> products from {sellers.length} verified sellers</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-surface-2">
                  <button className="p-1.5 rounded-md bg-card shadow-sm"><Grid3x3 className="h-4 w-4" /></button>
                  <button className="p-1.5 rounded-md text-muted-foreground"><List className="h-4 w-4" /></button>
                </div>
                <div className="relative">
                  <select value={sort} onChange={(e) => setSort(e.target.value)} className="appearance-none h-10 pl-4 pr-10 rounded-lg border border-border bg-card text-sm font-medium focus:border-accent focus:outline-none">
                    <option value="popular">Most Popular</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold">No products match your filters</h3>
                <p className="text-sm text-muted-foreground mt-2">Try clearing some filters or broadening your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-12 flex items-center justify-center gap-2">
              {[1, 2, 3, "…", 8].map((n, i) => (
                <button key={i} className={`h-10 min-w-10 px-3 rounded-lg text-sm font-semibold ${n === 1 ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-accent"}`}>{n}</button>
              ))}
              <Link to="/shop" className="h-10 px-4 rounded-lg text-sm font-semibold bg-card border border-border hover:border-accent flex items-center">Next →</Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Checkbox({ label, count, checked, onChange }: { label: string; count?: number; checked?: boolean; onChange?: () => void }) {
  return (
    <label className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-surface-2 cursor-pointer text-sm">
      <input type="checkbox" checked={!!checked} onChange={onChange} className="h-4 w-4 accent-[oklch(0.72_0.19_50)] cursor-pointer" />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
    </label>
  );
}