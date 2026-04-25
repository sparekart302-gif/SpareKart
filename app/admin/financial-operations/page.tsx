import type { Metadata } from "next";
import { Suspense } from "react";
import AdminReportsPage from "@/routes/admin.reports";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Financial Operations — SpareKart Admin",
  description:
    "Run COD remittance, seller settlements, payout approvals, and marketplace commission reporting from one compact finance command center.",
  openGraphDescription:
    "SpareKart admin financial operations command center for remittance, settlements, payouts, and reports.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminReportsPage />
    </Suspense>
  );
}
