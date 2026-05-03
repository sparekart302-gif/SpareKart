import type { Metadata } from "next";
import OrderTrackingPage from "@/routes/order-tracking";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Order Tracking — SpareKart",
  description:
    "Track SpareKart guest orders with order number and phone or email, upload proof, and follow delivery progress.",
});

export default function Page() {
  return <OrderTrackingPage />;
}
