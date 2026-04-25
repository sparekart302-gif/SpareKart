import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { SellerCard } from "@/components/marketplace/SellerCard";
import { sellers } from "@/data/marketplace";

export default function SellersPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "All Sellers" }]} />
      </div>
      <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">Marketplace community</div>
          <h1 className="mt-1 text-[2rem] font-black tracking-tight sm:text-3xl md:text-5xl">All verified sellers</h1>
          <p className="mt-3 text-muted-foreground text-balance">Every store on SpareKart is verified, rated, and held to our marketplace standards. Browse the people behind the parts.</p>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {sellers.map((s) => <SellerCard key={s.slug} seller={s} />)}
        </div>
      </section>
    </PageLayout>
  );
}
