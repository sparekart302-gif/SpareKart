import type { Metadata } from "next";
import AdminReportsPage from "@/routes/admin.reports";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Reports — SpareKart",
  description: "View sales, customer, seller, and product analytics for SpareKart.",
});

export default function Page() {
  return <AdminReportsPage />;
}
