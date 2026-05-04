import { BrandedPageLoader } from "@/components/loading/MarketplaceSkeletons";

export default function Loading() {
  return (
    <BrandedPageLoader
      title="Loading SpareKart..."
      message="Finding the right parts for you."
    />
  );
}
