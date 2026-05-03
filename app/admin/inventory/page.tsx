import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import AdminInventoryPage from "@/routes/admin.inventory";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Inventory — SpareKart",
  description: "Track stock levels, low-stock alerts, and inventory adjustments.",
});

export default function Page() {
  return <AdminInventoryPage />;
}
