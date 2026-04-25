import type { Metadata } from "next";
import AdminCouponsPage from "@/routes/admin.coupons";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Coupons — SpareKart",
  description: "Create and manage discount campaigns and coupon usage limits.",
});

export default function Page() {
  return <AdminCouponsPage />;
}
