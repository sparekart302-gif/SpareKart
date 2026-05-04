import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { paymentMethodsPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Payment Methods — SpareKart",
  description: paymentMethodsPage.metaDescription,
  openGraphDescription: paymentMethodsPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={paymentMethodsPage} />;
}
