import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import AdminSellerDetailPage from "@/routes/admin.sellers.$slug";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Seller Detail — SpareKart",
  description: "Inspect seller performance, policies, and marketplace activity.",
});

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <AdminSellerDetailPage slug={slug} />;
}
