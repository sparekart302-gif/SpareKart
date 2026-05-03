import type { Metadata } from "next";
import ProductPage from "@/routes/product.$slug";
import { buildPageMetadata } from "@/lib/metadata";
import {
  findMarketplaceProductBySlug,
  findMarketplaceSellerBySlug,
} from "@/server/marketplace/persistence";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await findMarketplaceProductBySlug(slug);

  if (!product) {
    return buildPageMetadata({
      title: "Product Details — SpareKart",
      description: "Browse SpareKart product details, fitment, pricing, and seller information.",
    });
  }

  return buildPageMetadata({
    title: `${product.title} — ${product.brand} | SpareKart`,
    description: product.shortDescription,
    openGraphTitle: product.title,
    openGraphDescription: product.shortDescription,
    image: product.images[0],
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const product = await findMarketplaceProductBySlug(slug);
  const seller = product ? await findMarketplaceSellerBySlug(product.sellerSlug) : undefined;

  return (
    <ProductPage
      slug={slug}
      product={product ?? undefined}
      seller={seller ?? undefined}
    />
  );
}
