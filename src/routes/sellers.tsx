import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { sellers } from "@/data/marketplace";

export const Route = createFileRoute("/sellers")({
  head: () => ({
    meta: [
      { title: "Top Verified Sellers — SpareKart" },
      { name: "description", content: "Browse all verified auto parts sellers on SpareKart. Trusted stores from Karachi, Lahore, Islamabad and across Pakistan." },
      { property: "og:title", content: "Top Verified Sellers — SpareKart" },
      { property: "og:description", content: "Verified auto parts sellers across Pakistan." },
    ],
  }),
  component: SellersPage,
});

function SellersPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "All Sellers" }]} />
      </div>
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">Marketplace community</div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-1">All verified sellers</h1>
          <p className="mt-3 text-muted-foreground text-balance">Every store on SpareKart is verified, rated, and held to our marketplace standards. Browse the people behind the parts.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sellers.map((s) => <SellerCard key={s.slug} seller={s} />)}
        </div>
      </section>
    </PageLayout>
  );
}