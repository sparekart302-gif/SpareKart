import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { sellerHelpPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Seller Help — SpareKart",
  description: sellerHelpPage.metaDescription,
  openGraphDescription: sellerHelpPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={sellerHelpPage} />;
}
