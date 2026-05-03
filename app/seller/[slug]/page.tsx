import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SellerPage from "@/routes/seller.$slug";
import { buildPageMetadata } from "@/lib/metadata";
import { findMarketplaceSellerBySlug } from "@/server/marketplace/persistence";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const seller = await findMarketplaceSellerBySlug(slug);

  if (!seller) {
    return buildPageMetadata({
      title: "Seller Not Found — SpareKart",
      description: "The requested seller could not be found.",
    });
  }

  return buildPageMetadata({
    title: `${seller.name} — ${seller.tagline} | SpareKart`,
    description: seller.description,
    openGraphTitle: `${seller.name} — SpareKart`,
    openGraphDescription: seller.description,
    image: seller.banner,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const seller = await findMarketplaceSellerBySlug(slug);

  if (!seller) {
    notFound();
  }

  return <SellerPage seller={seller} />;
}
