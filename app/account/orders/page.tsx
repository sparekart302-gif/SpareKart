import type { Metadata } from "next";
import AccountOrdersPage from "@/routes/account.orders";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "My Orders — SpareKart",
  description:
    "Track your SpareKart orders, upload manual payment proof, and follow admin verification status.",
  openGraphDescription:
    "Track orders, upload payment proof, and monitor manual payment verification.",
});

export default function Page() {
  return <AccountOrdersPage />;
}
