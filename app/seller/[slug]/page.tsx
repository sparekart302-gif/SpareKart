import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SellerPage from "@/routes/seller.$slug";
import { sellers } from "@/data/marketplace";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const seller = sellers.find((item) => item.slug === slug);

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
  const seller = sellers.find((item) => item.slug === slug);

  if (!seller) {
    notFound();
  }

  return <SellerPage seller={seller} />;
}
