import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RouteScrollManager } from "@/components/navigation/RouteScrollManager";
import { Toaster } from "@/components/ui/sonner";
import { MarketplaceProvider } from "@/modules/marketplace/store";
import { getServerEnv } from "@/server/config/env";
import "../src/styles.css";

const siteUrl = getServerEnv().NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  applicationName: "SpareKart",
  metadataBase: new URL(siteUrl),
  title: "SpareKart — Pakistan's Premium Auto Parts Marketplace",
  description:
    "Shop genuine car spare parts from verified sellers across Pakistan. Brakes, engines, lighting, suspension and more — with COD, fitment guarantee and easy returns.",
  openGraph: {
    title: "SpareKart — Pakistan's Premium Auto Parts Marketplace",
    description:
      "Genuine car parts from verified Pakistani sellers. COD nationwide. Fitment guarantee.",
    siteName: "SpareKart",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: "#1a2342",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MarketplaceProvider>
          <RouteScrollManager />
          {children}
          <Toaster richColors position="top-right" />
        </MarketplaceProvider>
      </body>
    </html>
  );
}
