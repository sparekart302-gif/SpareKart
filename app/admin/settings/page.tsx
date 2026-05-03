import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import AdminSettingsPage from "@/routes/admin.settings";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Settings — SpareKart",
  description:
    "Configure marketplace shipping, payments, notifications, and seller platform behavior.",
});

export default function Page() {
  return <AdminSettingsPage />;
}
