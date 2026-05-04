import type { Metadata } from "next";
import { ResourcePage } from "@/components/marketplace/ResourcePage";
import { returnsRefundsPage } from "@/content/resource-pages";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Returns & Refunds — SpareKart",
  description: returnsRefundsPage.metaDescription,
  openGraphDescription: returnsRefundsPage.metaDescription,
});

export default function Page() {
  return <ResourcePage content={returnsRefundsPage} />;
}
