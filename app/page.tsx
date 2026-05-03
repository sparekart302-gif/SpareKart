import type { Metadata } from "next";
import HomePage from "@/routes/index";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "SpareKart — Pakistan's Premium Auto Parts Marketplace",
  description:
    "Shop genuine car spare parts from verified sellers across Pakistan. Brakes, engines, lighting, suspension and more — with COD, fitment guarantee and easy returns.",
  openGraphDescription:
    "Genuine car parts from verified Pakistani sellers. COD nationwide. Fitment guarantee.",
});

export default function Page() {
  return <HomePage />;
}
