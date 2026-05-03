import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import AdminReviewsPage from "@/routes/admin.reviews";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Reviews — SpareKart",
  description: "Moderate product and store reviews across the SpareKart marketplace.",
});

export default function Page() {
  return <AdminReviewsPage />;
}
