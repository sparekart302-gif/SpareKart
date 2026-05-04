import {
  PageHeaderSkeleton,
  ProductGridSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto space-y-8 px-4 py-8">
      <PageHeaderSkeleton />
      <ProductGridSkeleton count={8} compact />
    </section>
  );
}
