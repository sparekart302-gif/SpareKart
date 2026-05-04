"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { SlidersHorizontal, ChevronDown, Star, X } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMarketplace } from "@/modules/marketplace/store";
import {
  getActiveMarketplaceCategories,
  getActiveMarketplaceProducts,
  getActiveMarketplaceSellers,
  getMarketplaceBrands,
} from "@/modules/marketplace/selectors";

export default function ShopPage() {
  const { state } = useMarketplace();
  const products = getActiveMarketplaceProducts(state);
  const categories = getActiveMarketplaceCategories(state);
  const brands = getMarketplaceBrands(state);
  const sellers = getActiveMarketplaceSellers(state);
  const deferredProducts = useDeferredValue(products);
  const deferredInventory = useDeferredValue(state.inventory);
  const [sort, setSort] = useState("popular");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState(30000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  const filtered = useMemo(() => {
    let list = deferredProducts.slice();
    if (selectedCats.length) list = list.filter((p) => selectedCats.includes(p.category));
    if (selectedBrands.length) list = list.filter((p) => selectedBrands.includes(p.brand));
    if (selectedSellers.length) list = list.filter((p) => selectedSellers.includes(p.sellerSlug));
    list = list.filter((p) => p.price <= priceMax);
    if (inStockOnly) {
      list = list.filter(
        (product) => (deferredInventory[product.id]?.available ?? product.stock) > 0,
      );
    }
    if (minRating) list = list.filter((p) => p.rating >= minRating);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "newest") list.reverse();
    return list;
  }, [
    deferredInventory,
    deferredProducts,
    inStockOnly,
    minRating,
    priceMax,
    selectedBrands,
    selectedCats,
    selectedSellers,
    sort,
  ]);
  const isFiltering = deferredProducts !== products || deferredInventory !== state.inventory;

  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const resetFilters = () => {
    setSelectedCats([]);
    setSelectedBrands([]);
    setSelectedSellers([]);
    setPriceMax(30000);
    setInStockOnly(false);
    setMinRating(0);
  };

  const activeFilterCount =
    selectedCats.length +
    selectedBrands.length +
    selectedSellers.length +
    (priceMax < 30000 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minRating ? 1 : 0);

  const activeFilters = [
    ...selectedCats.map((slug) => ({
      key: `category-${slug}`,
      label: categories.find((category) => category.slug === slug)?.name ?? slug,
      onClear: () => toggle(selectedCats, setSelectedCats, slug),
    })),
    ...selectedBrands.map((brand) => ({
      key: `brand-${brand}`,
      label: brands.find((item) => item.name === brand)?.name ?? brand,
      onClear: () => toggle(selectedBrands, setSelectedBrands, brand),
    })),
    ...selectedSellers.map((slug) => ({
      key: `seller-${slug}`,
      label: sellers.find((seller) => seller.slug === slug)?.name ?? slug,
      onClear: () => toggle(selectedSellers, setSelectedSellers, slug),
    })),
    ...(priceMax < 30000
      ? [
          {
            key: "price",
            label: `Up to Rs. ${priceMax.toLocaleString()}`,
            onClear: () => setPriceMax(30000),
          },
        ]
      : []),
    ...(inStockOnly
      ? [
          {
            key: "stock",
            label: "In stock only",
            onClear: () => setInStockOnly(false),
          },
        ]
      : []),
    ...(minRating
      ? [
          {
            key: "rating",
            label: `${minRating}+ stars`,
            onClear: () => setMinRating(0),
          },
        ]
      : []),
  ];

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Shop All Parts" }]} />
      </div>

      <div className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-32 rounded-[28px] bg-card p-5 shadow-[var(--shadow-premium)]">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Refine by category, seller, price, and rating.
                  </p>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <ShopFiltersPanel
                categories={categories}
                brands={brands}
                sellers={sellers}
                selectedCats={selectedCats}
                selectedBrands={selectedBrands}
                selectedSellers={selectedSellers}
                priceMax={priceMax}
                inStockOnly={inStockOnly}
                minRating={minRating}
                toggleCategory={(slug) => toggle(selectedCats, setSelectedCats, slug)}
                toggleBrand={(brand) => toggle(selectedBrands, setSelectedBrands, brand)}
                toggleSeller={(slug) => toggle(selectedSellers, setSelectedSellers, slug)}
                setPriceMax={setPriceMax}
                setInStockOnly={setInStockOnly}
                setMinRating={setMinRating}
              />
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-surface p-3.5 shadow-[var(--shadow-soft)] sm:mb-6 sm:rounded-[24px] sm:p-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">All Auto Parts</h1>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {filtered.length}
                  </span>{" "}
                  products from {sellers.length} verified sellers
                </p>
                {isFiltering ? (
                  <p className="mt-1 text-xs font-semibold text-accent">Updating results...</p>
                ) : null}
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Sheet>
                  <SheetTrigger asChild>
                    <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-background px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-card lg:hidden">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-background p-0">
                    <div className="flex h-full flex-col">
                      <SheetHeader className="border-b border-border px-5 py-5">
                        <SheetTitle className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4" /> Filters
                        </SheetTitle>
                        <SheetDescription>
                          Narrow the catalog without sacrificing product space.
                        </SheetDescription>
                      </SheetHeader>

                      <div className="flex-1 overflow-y-auto px-5 py-5">
                        <ShopFiltersPanel
                          categories={categories}
                          brands={brands}
                          sellers={sellers}
                          selectedCats={selectedCats}
                          selectedBrands={selectedBrands}
                          selectedSellers={selectedSellers}
                          priceMax={priceMax}
                          inStockOnly={inStockOnly}
                          minRating={minRating}
                          toggleCategory={(slug) => toggle(selectedCats, setSelectedCats, slug)}
                          toggleBrand={(brand) => toggle(selectedBrands, setSelectedBrands, brand)}
                          toggleSeller={(slug) => toggle(selectedSellers, setSelectedSellers, slug)}
                          setPriceMax={setPriceMax}
                          setInStockOnly={setInStockOnly}
                          setMinRating={setMinRating}
                        />
                      </div>

                      <div className="border-t border-border px-5 py-4">
                        <div className="flex items-center gap-2">
                          <SheetClose asChild>
                            <button className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
                              Show {filtered.length} items
                            </button>
                          </SheetClose>
                          <button
                            onClick={resetFilters}
                            className="flex h-11 items-center justify-center rounded-xl bg-surface px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-background"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl bg-background pl-4 pr-10 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30 sm:w-auto sm:min-w-48"
                  >
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

            {activeFilters.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-6">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={filter.onClear}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft hover:text-accent"
                  >
                    {filter.label}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="gradient-surface rounded-[24px] p-10 text-center shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-16">
                <div className="mb-3 text-4xl sm:mb-4 sm:text-5xl">🔍</div>
                <h3 className="text-xl font-bold">No products match your filters</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Try clearing some filters or broadening your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} compact />
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:mt-12">
              {[1, 2, 3, "…", 8].map((n, i) => (
                <button
                  key={i}
                  className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold shadow-[var(--shadow-soft)] ${n === 1 ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-accent-soft hover:text-accent"}`}
                >
                  {n}
                </button>
              ))}
              <Link
                to="/shop"
                className="flex h-10 items-center rounded-xl bg-surface px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft hover:text-accent"
              >
                Next →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function ShopFiltersPanel({
  categories,
  brands,
  sellers,
  selectedCats,
  selectedBrands,
  selectedSellers,
  priceMax,
  inStockOnly,
  minRating,
  toggleCategory,
  toggleBrand,
  toggleSeller,
  setPriceMax,
  setInStockOnly,
  setMinRating,
}: {
  categories: ReturnType<typeof getActiveMarketplaceCategories>;
  brands: ReturnType<typeof getMarketplaceBrands>;
  sellers: ReturnType<typeof getActiveMarketplaceSellers>;
  selectedCats: string[];
  selectedBrands: string[];
  selectedSellers: string[];
  priceMax: number;
  inStockOnly: boolean;
  minRating: number;
  toggleCategory: (slug: string) => void;
  toggleBrand: (brand: string) => void;
  toggleSeller: (slug: string) => void;
  setPriceMax: (value: number) => void;
  setInStockOnly: (value: boolean) => void;
  setMinRating: (value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <FilterSection title="Category">
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {categories.map((category) => (
            <Checkbox
              key={category.slug}
              label={category.name}
              count={category.productCount}
              checked={selectedCats.includes(category.slug)}
              onChange={() => toggleCategory(category.slug)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price (PKR)">
        <div className="px-1">
          <input
            type="range"
            min={500}
            max={30000}
            step={500}
            value={priceMax}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="w-full accent-[oklch(0.72_0.19_50)]"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>Rs. 500</span>
            <span className="font-bold text-foreground">Up to Rs. {priceMax.toLocaleString()}</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Brand">
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {brands.map((brand) => (
            <Checkbox
              key={brand.slug}
              label={brand.name}
              checked={selectedBrands.includes(brand.name)}
              onChange={() => toggleBrand(brand.name)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Seller">
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {sellers.map((seller) => (
            <Checkbox
              key={seller.slug}
              label={seller.name}
              count={seller.productCount}
              checked={selectedSellers.includes(seller.slug)}
              onChange={() => toggleSeller(seller.slug)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Seller rating">
        <div className="space-y-1">
          {[4, 3, 0].map((rating) => (
            <button
              key={rating}
              onClick={() => setMinRating(rating)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                minRating === rating ? "bg-accent-soft text-foreground" : "hover:bg-surface"
              }`}
            >
              <div className="flex text-warning">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 ${index < rating ? "fill-current" : "text-border"}`}
                  />
                ))}
              </div>
              <span>{rating === 0 ? "All ratings" : `${rating}+ stars`}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Availability">
        <Checkbox
          label="In stock only"
          checked={inStockOnly}
          onChange={() => setInStockOnly(!inStockOnly)}
        />
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Checkbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-surface">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer accent-[oklch(0.72_0.19_50)]"
      />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      )}
    </label>
  );
}
