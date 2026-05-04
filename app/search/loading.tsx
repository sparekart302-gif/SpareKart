import {
  FormSkeleton,
  ProductGridSkeleton,
} from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-8">
      <FormSkeleton fields={2} />
      <ProductGridSkeleton count={10} compact />
    </section>
  );
}
