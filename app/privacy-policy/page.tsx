import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { privacyPolicyPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy — SpareKart",
  description: privacyPolicyPage.metaDescription,
  openGraphDescription: privacyPolicyPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={privacyPolicyPage} />;
}
