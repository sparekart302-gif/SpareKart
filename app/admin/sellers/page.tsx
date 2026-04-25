import type { Metadata } from "next";
import AdminSellersPage from "@/routes/admin.sellers";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Sellers — SpareKart",
  description: "Review, approve, and govern SpareKart seller storefronts.",
});

export default function Page() {
  return <AdminSellersPage />;
}
