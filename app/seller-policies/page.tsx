import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { sellerPoliciesPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Seller Policies — SpareKart",
  description: sellerPoliciesPage.metaDescription,
  openGraphDescription: sellerPoliciesPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={sellerPoliciesPage} />;
}
