import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import AdminUserDetailPage from "@/routes/admin.users.$userId";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export const metadata: Metadata = buildPageMetadata({
  title: "Admin User Detail — SpareKart",
  description: "View user account profile, payments, and order history.",
});

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  return <AdminUserDetailPage userId={userId} />;
}
