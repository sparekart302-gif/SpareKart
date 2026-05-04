import {
  CheckoutSummarySkeleton,
  FormSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <FormSkeleton fields={5} />
        <CheckoutSummarySkeleton />
      </div>
    </section>
  );
}
