import type { Metadata } from "next";
import SellerOnboardingPage from "@/routes/seller-onboarding";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Sell on SpareKart — Open Your Auto Parts Store",
  description:
    "Reach thousands of auto parts buyers across Pakistan. Zero monthly fees, easy onboarding, full marketplace support.",
  openGraphTitle: "Sell on SpareKart",
  openGraphDescription: "Open your auto parts store on Pakistan's premium marketplace.",
});

export default function Page() {
  return <SellerOnboardingPage />;
}
