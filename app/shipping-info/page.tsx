import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { shippingInfoPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Shipping Information — SpareKart",
  description: shippingInfoPage.metaDescription,
  openGraphDescription: shippingInfoPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={shippingInfoPage} />;
}
