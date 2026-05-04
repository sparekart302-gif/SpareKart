"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  X,
} from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { formatRating } from "@/lib/format-rating";
import { getActiveMarketplaceSellers } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function parseResponseHours(responseTime: string) {
  const match = responseTime.match(/(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export default function SellersPage() {
  const { state } = useMarketplace();
  const sellers = getActiveMarketplaceSellers(state);
  const deferredSellers = useDeferredValue(sellers);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [fastResponseOnly, setFastResponseOnly] = useState(false);

  const cities = useMemo(
    () =>
      Array.from(new Set(sellers.map((seller) => seller.city))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [sellers],
  );

  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();

    sellers.forEach((seller) => {
      counts.set(seller.city, (counts.get(seller.city) ?? 0) + 1);
    });

    return counts;
  }, [sellers]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let list = deferredSellers.slice();

    if (normalizedQuery) {
      list = list.filter((seller) =>
        `${seller.name} ${seller.tagline} ${seller.city} ${seller.description}`
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (selectedCities.length) {
      list = list.filter((seller) => selectedCities.includes(seller.city));
    }

    if (minRating > 0) {
      list = list.filter((seller) => seller.rating >= minRating);
    }

    if (verifiedOnly) {
      list = list.filter((seller) => seller.verified);
    }

    if (fastResponseOnly) {
      list = list.filter((seller) => parseResponseHours(seller.responseTime) <= 4);
    }

    switch (sort) {
      case "rating":
        list.sort(
          (left, right) => right.rating - left.rating || right.reviewCount - left.reviewCount,
        );
        break;
      case "reviews":
        list.sort(
          (left, right) => right.reviewCount - left.reviewCount || right.rating - left.rating,
        );
        break;
      case "catalog":
        list.sort(
          (left, right) => right.productCount - left.productCount || right.rating - left.rating,
        );
        break;
      case "fastest":
        list.sort(
          (left, right) =>
            parseResponseHours(left.responseTime) - parseResponseHours(right.responseTime) ||
            right.rating - left.rating,
        );
        break;
      case "newest":
        list.sort(
          (left, right) =>
            new Date(right.joined).getTime() - new Date(left.joined).getTime() ||
            right.rating - left.rating,
        );
        break;
      case "az":
        list.sort((left, right) => left.name.localeCompare(right.name));
        break;
      default:
        list.sort((left, right) => {
          const leftScore =
            (left.verified ? 2_000 : 0) +
            left.rating * 100 +
            left.reviewCount * 0.15 +
            left.productCount * 0.04 -
            parseResponseHours(left.responseTime) * 5;
          const rightScore =
            (right.verified ? 2_000 : 0) +
            right.rating * 100 +
            right.reviewCount * 0.15 +
            right.productCount * 0.04 -
            parseResponseHours(right.responseTime) * 5;

          return rightScore - leftScore;
        });
    }

    return list;
  }, [deferredSellers, fastResponseOnly, minRating, query, selectedCities, sort, verifiedOnly]);

  const isFiltering = deferredSellers !== sellers;
  const activeFilterCount =
    selectedCities.length +
    (query.trim() ? 1 : 0) +
    (minRating ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (fastResponseOnly ? 1 : 0);

  const averageRating = sellers.length
    ? sellers.reduce((sum, seller) => sum + seller.rating, 0) / sellers.length
    : 0;

  const activeFilters = [
    ...(query.trim()
      ? [
          {
            key: "query",
            label: `Search: ${query.trim()}`,
            onClear: () => setQuery(""),
          },
        ]
      : []),
    ...selectedCities.map((city) => ({
      key: `city-${city}`,
      label: city,
      onClear: () => toggleSelection(selectedCities, setSelectedCities, city),
    })),
    ...(minRating
      ? [
          {
            key: "rating",
            label: `${formatRating(minRating)}+ rated`,
            onClear: () => setMinRating(0),
          },
        ]
      : []),
    ...(verifiedOnly
      ? [
          {
            key: "verified",
            label: "Verified only",
            onClear: () => setVerifiedOnly(false),
          },
        ]
      : []),
    ...(fastResponseOnly
      ? [
          {
            key: "response",
            label: "Fast response",
            onClear: () => setFastResponseOnly(false),
          },
        ]
      : []),
  ];

  const resetFilters = () => {
    setQuery("");
    setSelectedCities([]);
    setMinRating(0);
    setVerifiedOnly(false);
    setFastResponseOnly(false);
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "All Sellers" }]} />
      </div>

      <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <div className="rounded-[28px] gradient-surface p-6 shadow-[var(--shadow-premium)] sm:p-8">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Marketplace community
            </div>
            <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-3xl md:text-5xl">
              All verified sellers
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Browse the people behind the parts. Compare store reputation, response time, city
              coverage, and catalog size before you dive into a seller storefront.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Store className="h-4.5 w-4.5 text-accent" />}
              label="Active stores"
              value={String(sellers.length)}
              detail="Verified marketplace sellers"
            />
            <MetricCard
              icon={<MapPin className="h-4.5 w-4.5 text-accent" />}
              label="Cities covered"
              value={String(cities.length)}
              detail="Local inventory across Pakistan"
            />
            <MetricCard
              icon={<Star className="h-4.5 w-4.5 text-warning" />}
              label="Average rating"
              value={formatRating(averageRating)}
              detail="Based on public seller reviews"
            />
            <MetricCard
              icon={<Clock3 className="h-4.5 w-4.5 text-accent" />}
              label="Fast-response stores"
              value={String(
                sellers.filter((seller) => parseResponseHours(seller.responseTime) <= 4).length,
              )}
              detail="Reply within 4 hours or less"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-32 rounded-[28px] bg-card p-5 shadow-[var(--shadow-premium)]">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 text-lg font-bold">
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Search by city, trust signals, and seller speed.
                  </p>
                </div>
                {activeFilterCount > 0 ? (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>

              <SellersFiltersPanel
                cities={cities}
                cityCounts={cityCounts}
                selectedCities={selectedCities}
                minRating={minRating}
                verifiedOnly={verifiedOnly}
                fastResponseOnly={fastResponseOnly}
                toggleCity={(city) => toggleSelection(selectedCities, setSelectedCities, city)}
                setMinRating={setMinRating}
                setVerifiedOnly={setVerifiedOnly}
                setFastResponseOnly={setFastResponseOnly}
              />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-surface p-3.5 shadow-[var(--shadow-soft)] sm:mb-6 sm:rounded-[24px] sm:p-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold tracking-tight">Trusted SpareKart stores</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">
                    {filtered.length}
                  </span>{" "}
                  sellers currently match your search
                </p>
                {isFiltering ? (
                  <p className="mt-1 text-xs font-semibold text-accent">Updating sellers...</p>
                ) : null}
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <div className="relative flex-1 lg:min-w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search store, city, or specialty"
                    className="h-10 w-full rounded-xl bg-background pl-10 pr-4 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-background px-4 text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-card lg:hidden">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 ? (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary">
                            {activeFilterCount}
                          </span>
                        ) : null}
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-background p-0">
                      <div className="flex h-full flex-col">
                        <SheetHeader className="border-b border-border px-5 py-5">
                          <SheetTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4" /> Seller filters
                          </SheetTitle>
                          <SheetDescription>
                            Narrow the seller directory without losing product space.
                          </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-5 py-5">
                          <SellersFiltersPanel
                            cities={cities}
                            cityCounts={cityCounts}
                            selectedCities={selectedCities}
                            minRating={minRating}
                            verifiedOnly={verifiedOnly}
                            fastResponseOnly={fastResponseOnly}
                            toggleCity={(city) =>
                              toggleSelection(selectedCities, setSelectedCities, city)
                            }
                            setMinRating={setMinRating}
                            setVerifiedOnly={setVerifiedOnly}
                            setFastResponseOnly={setFastResponseOnly}
                          />
                        </div>

                        <div className="border-t border-border px-5 py-4">
                          <div className="flex items-center gap-2">
                            <SheetClose asChild>
                              <button className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
                                Show {filtered.length} sellers
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

                  <div className="relative min-w-0 flex-1 sm:flex-none">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      className="h-10 w-full appearance-none rounded-xl bg-background pl-4 pr-10 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30 sm:min-w-48"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Highest rated</option>
                      <option value="reviews">Most reviewed</option>
                      <option value="catalog">Largest catalog</option>
                      <option value="fastest">Fastest response</option>
                      <option value="newest">Newest stores</option>
                      <option value="az">A to Z</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {activeFilters.length > 0 ? (
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
            ) : null}

            {filtered.length === 0 ? (
              <div className="rounded-[24px] gradient-surface p-10 text-center shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-16">
                <div className="mb-3 text-4xl sm:mb-4 sm:text-5xl">🏪</div>
                <h3 className="text-xl font-bold">No sellers match your filters</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try clearing a few filters or broadening the city or rating requirements.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={resetFilters}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                  >
                    Reset filters
                  </button>
                  <Link
                    to="/seller-onboarding"
                    className="rounded-xl bg-card px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-soft)] hover:bg-surface"
                  >
                    Become a seller
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((seller) => (
                  <SellerCard key={seller.slug} seller={seller} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function SellersFiltersPanel({
  cities,
  cityCounts,
  selectedCities,
  minRating,
  verifiedOnly,
  fastResponseOnly,
  toggleCity,
  setMinRating,
  setVerifiedOnly,
  setFastResponseOnly,
}: {
  cities: string[];
  cityCounts: Map<string, number>;
  selectedCities: string[];
  minRating: number;
  verifiedOnly: boolean;
  fastResponseOnly: boolean;
  toggleCity: (city: string) => void;
  setMinRating: (value: number) => void;
  setVerifiedOnly: (value: boolean) => void;
  setFastResponseOnly: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <FilterSection title="City">
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {cities.map((city) => (
            <Checkbox
              key={city}
              label={city}
              count={cityCounts.get(city)}
              checked={selectedCities.includes(city)}
              onChange={() => toggleCity(city)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Seller rating">
        <div className="space-y-1">
          {[
            { value: 4.5, label: "4.5 and up" },
            { value: 4, label: "4.0 and up" },
            { value: 0, label: "All ratings" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setMinRating(option.value)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                minRating === option.value ? "bg-accent-soft text-foreground" : "hover:bg-surface"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-current text-warning" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Seller standards">
        <div className="space-y-1">
          <Checkbox
            label="Verified sellers only"
            icon={<BadgeCheck className="h-3.5 w-3.5 text-info" />}
            checked={verifiedOnly}
            onChange={() => setVerifiedOnly(!verifiedOnly)}
          />
          <Checkbox
            label="Fast response (4 hours or less)"
            icon={<Clock3 className="h-3.5 w-3.5 text-accent" />}
            checked={fastResponseOnly}
            onChange={() => setFastResponseOnly(!fastResponseOnly)}
          />
        </div>
      </FilterSection>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft">{icon}</div>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
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
  icon,
}: {
  label: string;
  count?: number;
  checked?: boolean;
  onChange?: () => void;
  icon?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-surface">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer accent-[oklch(0.72_0.19_50)]"
      />
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      ) : null}
    </label>
  );
}

function toggleSelection(
  values: string[],
  setValues: (values: string[]) => void,
  nextValue: string,
) {
  setValues(
    values.includes(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue],
  );
}
