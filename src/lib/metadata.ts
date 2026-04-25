import type { Metadata } from "next";

type PageMetadataInput = {
  description: string;
  image?: string;
  openGraphDescription?: string;
  openGraphTitle?: string;
  title: string;
};

export function buildPageMetadata({
  description,
  image,
  openGraphDescription,
  openGraphTitle,
  title,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: openGraphTitle ?? title,
      description: openGraphDescription ?? description,
      images: image ? [{ url: image }] : undefined,
      siteName: "SpareKart",
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: openGraphTitle ?? title,
      description: openGraphDescription ?? description,
      images: image ? [image] : undefined,
    },
  };
}
