import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { pricingFeesPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing & Fees — SpareKart",
  description: pricingFeesPage.metaDescription,
  openGraphDescription: pricingFeesPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={pricingFeesPage} />;
}
