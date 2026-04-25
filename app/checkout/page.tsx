import type { Metadata } from "next";
import CheckoutPage from "@/routes/checkout";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout — SpareKart",
  description:
    "Complete your secure marketplace order. Cash on Delivery, Bank Transfer, Easypaisa and JazzCash supported.",
  openGraphDescription:
    "Secure checkout with COD, Bank Transfer, Easypaisa and JazzCash.",
});

export default function Page() {
  return <CheckoutPage />;
}
