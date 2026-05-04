"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { beginRouteProgress } from "@/components/navigation/RouteProgressBar";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import {
  getActiveMarketplaceCategories,
  getActiveMarketplaceProducts,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

type SearchPageProps = {
  queryFromUrl?: string;
  categoryFromUrl?: string;
};

export default function SearchPage({
  queryFromUrl = "",
  categoryFromUrl = "all",
}: SearchPageProps) {
  const { state } = useMarketplace();
  const products = getActiveMarketplaceProducts(state);
  const categories = getActiveMarketplaceCategories(state);
  const router = useRouter();
  const [q, setQ] = useState(queryFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);

  useEffect(() => {
    setQ(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  const results = useMemo(() => {
    const normalizedQuery = queryFromUrl.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.title.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

      const matchesCategory =
        !categoryFromUrl || categoryFromUrl === "all" || product.category === categoryFromUrl;

      return matchesQuery && matchesCategory;
    });
  }, [categoryFromUrl, queryFromUrl]);

  const display =
    results.length > 0
      ? results
      : queryFromUrl || (categoryFromUrl && categoryFromUrl !== "all")
        ? products.slice(0, 10)
        : products.slice(0, 12);
  const activeCategory = categories.find((category) => category.slug === categoryFromUrl);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const trimmedQuery = q.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }

    beginRouteProgress();
    router.push(params.size > 0 ? `/search?${params.toString()}` : "/search");
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Search" }]} />
      </div>
      <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <form
          onSubmit={handleSubmit}
          className="flex max-w-2xl flex-col gap-2 rounded-[22px] bg-surface p-2 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-accent/30 sm:flex-row sm:items-center sm:rounded-[24px]"
        >
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="h-11 rounded-xl bg-background/70 px-3 text-sm font-medium focus:outline-none sm:w-44"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-xl bg-background/70 sm:flex-1 sm:bg-transparent">
            <SearchIcon className="ml-3 h-4.5 w-4.5 text-muted-foreground sm:h-5 sm:w-5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search parts, brands, SKUs…"
              className="h-11 flex-1 bg-transparent px-3 text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl gradient-accent px-5 text-sm font-bold text-primary sm:px-6"
          >
            Search
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-6">
          <div>
            <h1 className="text-[1.7rem] font-black sm:text-2xl">
              {queryFromUrl
                ? `Results for "${queryFromUrl}"`
                : activeCategory
                  ? activeCategory.name
                  : "Search catalog"}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{results.length}</span>{" "}
              products found
              {activeCategory ? ` in ${activeCategory.name}` : ""}
              {results.length === 0 &&
                (queryFromUrl || activeCategory) &&
                " — showing popular alternatives"}
            </p>
          </div>
          {results.length === 0 && (queryFromUrl || activeCategory) && (
            <div className="flex items-center gap-2 text-xs text-accent font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Did you mean:
              <button
                type="button"
                onClick={() => {
                  beginRouteProgress();
                  router.push("/search?q=brake");
                }}
                className="underline"
              >
                brake
              </button>
              ,
              <button
                type="button"
                onClick={() => {
                  beginRouteProgress();
                  router.push("/search?q=oil%20filter");
                }}
                className="underline"
              >
                oil filter
              </button>
              ?
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.slice(0, 6).map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                beginRouteProgress();
                router.push(`/search?category=${encodeURIComponent(c.slug)}`);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)] transition-colors ${
                categoryFromUrl === c.slug
                  ? "bg-accent text-primary"
                  : "bg-surface hover:bg-accent-soft hover:text-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
          {(queryFromUrl || activeCategory) && (
            <Link
              to="/search"
              className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-surface hover:text-foreground"
            >
              Clear search
            </Link>
          )}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {display.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
