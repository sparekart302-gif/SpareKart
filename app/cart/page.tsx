import type { Metadata } from "next";
import CartPage from "@/routes/cart";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Your Cart — SpareKart",
  description:
    "Review your selected auto parts and proceed to secure checkout.",
  openGraphDescription: "Review your cart and check out securely.",
});

export default function Page() {
  return <CartPage />;
}
