import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import HelpPage from "@/routes/help";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Help Centre — SpareKart",
  description:
    "Get help with your SpareKart orders, returns, payments and shipping. Friendly support for all customers.",
  openGraphDescription: "Help with orders, returns, payments and shipping.",
});

export default function Page() {
  return <HelpPage />;
}
