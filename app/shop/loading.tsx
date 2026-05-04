import {
  PageHeaderSkeleton,
  ProductGridSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-8">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden lg:block rounded-[28px] bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="space-y-3">
            <div className="h-4 w-28 animate-pulse rounded-full bg-surface-2/75" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface-2/75" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface-2/75" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface-2/75" />
          </div>
        </div>
        <ProductGridSkeleton count={10} compact />
      </div>
    </section>
  );
}
