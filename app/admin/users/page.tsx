import { Suspense } from "react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import AdminUsersPage from "@/routes/admin.users";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Users — SpareKart",
  description: "Manage customers, sellers, and staff accounts with role-aware controls.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminUsersPage />
    </Suspense>
  );
}
