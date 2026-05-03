import type { Metadata } from "next";
import ShopPage from "@/routes/shop";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Shop All Auto Parts — SpareKart",
  description:
    "Browse thousands of car spare parts from verified Pakistani sellers. Filter by brand, model, year, price and more.",
  openGraphDescription: "Browse thousands of car spare parts from verified Pakistani sellers.",
});

export default function Page() {
  return <ShopPage />;
}
