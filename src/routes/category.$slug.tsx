import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { categories, getProductsByCategory, brands, type Product, type Category } from "@/data/marketplace";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category, products: getProductsByCategory(params.slug) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.category.name} — Shop ${loaderData.category.name} Parts | SpareKart` },
      { name: "description", content: `${loaderData.category.description}. Shop ${loaderData.category.productCount}+ products from verified sellers in Pakistan.` },
      { property: "og:title", content: `${loaderData.category.name} — SpareKart` },
      { property: "og:description", content: loaderData.category.description },
    ] : [],
  }),
  notFoundComponent: () => (
    <PageLayout>
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Category not found</h1>
        <Link to="/shop" className="mt-4 inline-block text-accent font-semibold">Back to shop →</Link>
      </div>
    </PageLayout>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category, products: items } = Route.useLoaderData() as { category: Category; products: Product[] };

  return (
    <PageLayout>
      {/* Themed header */}
      <section className="gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Categories" }, { label: category.name }]} />
          <div className="flex flex-wrap items-end justify-between gap-6 mt-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">{category.name}</h1>
              <p className="mt-3 text-lg opacity-85 max-w-xl">{category.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {brands.slice(0, 6).map((b) => (
                  <span key={b.slug} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold">{b.name}</span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black tabular-nums text-accent">{items.length}</div>
              <div className="text-xs opacity-80 uppercase tracking-wider">products available</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        <div className="mt-16 bg-card border border-border rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold">Looking for something else?</h3>
          <p className="text-sm text-muted-foreground mt-2">Browse our full catalogue or use the compatibility selector to find parts for your specific car.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/shop" className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary-hover">Browse all products <ChevronRight className="h-4 w-4" /></Link>
            <Link to="/compatibility" className="h-11 px-6 rounded-lg bg-accent text-primary font-semibold text-sm flex items-center gap-2 hover:opacity-90">Find by car</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}