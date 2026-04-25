import type { Metadata } from "next";
import AdminProductsPage from "@/routes/admin.products";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Products — SpareKart",
  description: "Manage SpareKart products, categories, and merchandising status.",
});

export default function Page() {
  return <AdminProductsPage />;
}
