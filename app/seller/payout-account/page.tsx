import type { Metadata } from "next";
import { Suspense } from "react";
import SellerOrdersPage from "@/routes/seller.orders";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Payout Account — SpareKart Seller",
  description:
    "Add or update seller payout bank, wallet, and account details for SpareKart settlement releases.",
  openGraphDescription: "SpareKart seller payout account settings.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerOrdersPage initialTab="earnings" />
    </Suspense>
  );
}
