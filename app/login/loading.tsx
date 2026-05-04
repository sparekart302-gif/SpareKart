import { FormSkeleton } from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <FormSkeleton fields={3} />
        <FormSkeleton fields={3} />
      </div>
    </section>
  );
}
