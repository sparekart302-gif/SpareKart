import {
  DashboardStatsSkeleton,
  OrderTableSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-8">
      <DashboardStatsSkeleton />
      <OrderTableSkeleton rows={6} />
    </section>
  );
}
