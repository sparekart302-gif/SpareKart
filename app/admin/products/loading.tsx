import { ProductGridSkeleton } from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <ProductGridSkeleton count={10} compact />
    </section>
  );
}
