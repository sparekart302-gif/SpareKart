import {
  CheckoutSummarySkeleton,
  ProductGridSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ProductGridSkeleton count={4} compact />
        <CheckoutSummarySkeleton />
      </div>
    </section>
  );
}
