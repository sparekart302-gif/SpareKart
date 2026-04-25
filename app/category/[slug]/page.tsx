import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryPage from "@/routes/category.$slug";
import { categories, getProductsByCategory } from "@/data/marketplace";
import { buildPageMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    return buildPageMetadata({
      title: "Category Not Found — SpareKart",
      description: "The requested category could not be found.",
    });
  }

  return buildPageMetadata({
    title: `${category.name} — Shop ${category.name} Parts | SpareKart`,
    description: `${category.description}. Shop ${category.productCount}+ products from verified sellers in Pakistan.`,
    openGraphTitle: `${category.name} — SpareKart`,
    openGraphDescription: category.description,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  return <CategoryPage category={category} items={getProductsByCategory(slug)} />;
}
