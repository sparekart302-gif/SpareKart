import type { Metadata } from "next";
import AdminAuditLogsPage from "@/routes/admin.audit-logs";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Audit Logs — SpareKart",
  description: "Search the audit trail for sensitive admin and marketplace actions.",
});

export default function Page() {
  return <AdminAuditLogsPage />;
}
