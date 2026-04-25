import type { Metadata } from "next";
import AdminOrdersPage from "@/routes/admin.orders";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Orders — SpareKart",
  description: "Monitor and manage SpareKart orders, fulfillment, and invoices.",
});

export default function Page() {
  return <AdminOrdersPage />;
}
