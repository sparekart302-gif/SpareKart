import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { termsOfServicePage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service — SpareKart",
  description: termsOfServicePage.metaDescription,
  openGraphDescription: termsOfServicePage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={termsOfServicePage} />;
}
