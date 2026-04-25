import { ChevronRight } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { brands, type Product, type Category } from "@/data/marketplace";

type CategoryPageProps = {
  category: Category;
  items: Product[];
};

export default function CategoryPage({ category, items }: CategoryPageProps) {
  return (
    <PageLayout>
      <section className="container mx-auto px-4 pb-6 sm:pb-8">
        <div className="rounded-[28px] bg-surface px-4 py-5 shadow-[var(--shadow-soft)] sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Categories" }, { label: category.name }]} />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4 sm:mt-4 sm:gap-6">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Category</div>
              <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-4xl md:text-5xl">{category.name}</h1>
              <p className="mt-2.5 max-w-xl text-sm text-muted-foreground sm:mt-3 sm:text-base md:text-lg">{category.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {brands.slice(0, 6).map((b) => (
                  <span key={b.slug} className="rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">{b.name}</span>
                ))}
              </div>
            </div>
            <div className="w-full rounded-[22px] bg-card px-5 py-4 text-left shadow-[var(--shadow-soft)] sm:w-auto sm:px-6 sm:py-5 sm:text-right">
              <div className="text-2xl font-black tabular-nums text-accent sm:text-3xl">{items.length}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">products available</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((p) => <ProductCard key={p.id} product={p} compact />)}
        </div>

        <div className="mt-10 rounded-[26px] gradient-surface p-5 text-center shadow-[var(--shadow-soft)] sm:mt-16 sm:rounded-[30px] sm:p-8">
          <h3 className="text-xl font-bold">Looking for something else?</h3>
          <p className="text-sm text-muted-foreground mt-2">Browse our full catalogue or use the compatibility selector to find parts for your specific car.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/shop" className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary-hover">Browse all products <ChevronRight className="h-4 w-4" /></Link>
            <Link to="/compatibility" className="h-11 px-6 rounded-lg bg-accent text-primary font-semibold text-sm flex items-center gap-2 hover:opacity-90">Find by car</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
