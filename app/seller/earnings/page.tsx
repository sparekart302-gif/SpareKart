import type { Metadata } from "next";
import { Suspense } from "react";
import SellerOrdersPage from "@/routes/seller.orders";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Earnings & Payouts — SpareKart Seller",
  description:
    "Track seller earnings, commissions, settlement status, payout account verification, and payout history.",
  openGraphDescription: "SpareKart seller earnings and payout dashboard.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SellerOrdersPage initialTab="earnings" />
    </Suspense>
  );
}
