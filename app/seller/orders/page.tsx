import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { Suspense } from "react";
import SellerOrdersPage from "@/routes/seller.orders";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Seller Dashboard — SpareKart",
  description:
    "Manage SpareKart store profile, products, inventory, and seller-side order operations from one dashboard.",
  openGraphDescription:
    "Seller workspace for SpareKart store operations, product listings, inventory, and order visibility.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerOrdersPage />
    </Suspense>
  );
}
