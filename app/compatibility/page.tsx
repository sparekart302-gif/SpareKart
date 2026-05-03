import type { Metadata } from "next";
import CompatibilityPage from "@/routes/compatibility";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Find Parts For Your Car — SpareKart",
  description:
    "Use our smart compatibility selector to find car spare parts that fit your exact make, model and year. Toyota, Honda, Suzuki, Hyundai, KIA and more.",
  openGraphDescription: "Find spare parts that fit your exact car. Toyota, Honda, Suzuki and more.",
});

export default function Page() {
  return <CompatibilityPage />;
}
