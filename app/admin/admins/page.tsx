import type { Metadata } from "next";
import AdminAdminsPage from "@/routes/admin.admins";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Roles — SpareKart",
  description: "Manage SpareKart admin accounts and privileged access scopes.",
});

export default function Page() {
  return <AdminAdminsPage />;
}
