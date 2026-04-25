import { Suspense } from "react";
import type { Metadata } from "next";
import AdminPaymentsPage from "@/routes/admin.payments";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Payment Review — SpareKart",
  description:
    "Review manual payment proofs, approve or reject submissions, and manage verified order workflow.",
  openGraphDescription:
    "SpareKart admin queue for manual payment verification and order confirmation.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPaymentsPage />
    </Suspense>
  );
}
