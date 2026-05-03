import type { Metadata } from "next";
import SearchPage from "@/routes/search";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Search Results — SpareKart",
  description: "Search across thousands of car spare parts from verified Pakistani sellers.",
  openGraphTitle: "Search — SpareKart",
  openGraphDescription: "Search auto parts across SpareKart.",
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const queryFromUrl =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q
      : (resolvedSearchParams.q?.[0] ?? "");
  const categoryFromUrl =
    typeof resolvedSearchParams.category === "string"
      ? resolvedSearchParams.category
      : (resolvedSearchParams.category?.[0] ?? "all");

  return <SearchPage queryFromUrl={queryFromUrl} categoryFromUrl={categoryFromUrl} />;
}
