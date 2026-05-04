import { cn } from "@/lib/utils";

function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-2/75", className)} />;
}

export function BrandedPageLoader({
  title = "Loading SpareKart...",
  message = "Finding the right parts...",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section className="container mx-auto flex min-h-[55vh] items-center px-4 py-12">
      <div className="mx-auto max-w-xl rounded-[32px] bg-card p-8 text-center shadow-[var(--shadow-premium)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero text-lg font-black tracking-[0.22em] text-primary-foreground">
          SK
        </div>
        <div className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-accent">
          SpareKart
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 overflow-hidden rounded-full bg-surface-2">
          <div className="h-2 w-2/3 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    </section>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock className="h-3 w-28 rounded-full" />
      <SkeletonBlock className="h-10 w-full max-w-xl" />
      <SkeletonBlock className="h-4 w-full max-w-2xl" />
      <SkeletonBlock className="h-4 w-4/5 max-w-xl" />
    </div>
  );
}

export function ProductCardSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] bg-card shadow-[var(--shadow-soft)]",
        compact && "rounded-2xl",
      )}
    >
      <SkeletonBlock className="aspect-square rounded-none" />
      <div className="space-y-3 p-3 sm:p-4">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-4/5" />
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 10,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} compact={compact} />
      ))}
    </div>
  );
}

export function SellerCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] bg-card p-4 shadow-[var(--shadow-soft)]">
      <SkeletonBlock className="h-36 rounded-[22px]" />
      <div className="mt-4 flex items-start gap-3">
        <SkeletonBlock className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="w-full space-y-2">
          <SkeletonBlock className="h-5 w-2/3" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SellerGridSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SellerCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DashboardStatsSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)]"
        >
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-4 h-9 w-24" />
          <SkeletonBlock className="mt-3 h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

export function OrderTableSkeleton({
  rows = 6,
}: {
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] bg-card shadow-[var(--shadow-soft)]">
      <div className="border-b border-border px-5 py-4">
        <SkeletonBlock className="h-6 w-40" />
      </div>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-[22px] bg-surface p-4 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr]"
          >
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutSummarySkeleton() {
  return (
    <div className="rounded-[28px] bg-card p-5 shadow-[var(--shadow-soft)]">
      <SkeletonBlock className="h-6 w-36" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-4 w-full" />
        ))}
      </div>
      <SkeletonBlock className="mt-6 h-11 w-full rounded-xl" />
    </div>
  );
}

export function FormSkeleton({
  fields = 4,
}: {
  fields?: number;
}) {
  return (
    <div className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="mt-6 h-11 w-full rounded-xl" />
    </div>
  );
}
