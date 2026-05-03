import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import SellersPage from "@/routes/sellers";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Top Verified Sellers — SpareKart",
  description:
    "Browse all verified auto parts sellers on SpareKart. Trusted stores from Karachi, Lahore, Islamabad and across Pakistan.",
  openGraphDescription: "Verified auto parts sellers across Pakistan.",
});

export default function Page() {
  return <SellersPage />;
}
