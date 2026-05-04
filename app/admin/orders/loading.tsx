import { OrderTableSkeleton } from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <OrderTableSkeleton rows={8} />
    </section>
  );
}
