import {
  CheckoutSummarySkeleton,
  ProductGridSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-3">
            <div className="aspect-square animate-pulse rounded-[32px] bg-surface-2/75" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-xl bg-surface-2/75"
                />
              ))}
            </div>
          </div>
          <CheckoutSummarySkeleton />
        </div>
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded-full bg-surface-2/75" />
          <div className="h-4 w-full animate-pulse rounded-full bg-surface-2/75" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-surface-2/75" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-surface-2/75" />
        </div>
      </div>
      <div className="mt-10">
        <ProductGridSkeleton count={5} compact />
      </div>
    </section>
  );
}
