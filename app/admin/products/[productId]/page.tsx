import type { Metadata } from "next";
import AdminProductDetailPage from "@/routes/admin.products.$productId";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Product Detail — SpareKart",
  description: "View product merchandising, catalog performance, and review signals.",
});

export default async function Page({ params }: PageProps) {
  const { productId } = await params;
  return <AdminProductDetailPage productId={productId} />;
}
