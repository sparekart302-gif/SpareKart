import type { Metadata } from "next";
import AccountPage from "@/routes/account";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "My Account — SpareKart",
  description:
    "Manage your SpareKart customer profile, saved addresses, garage, wishlist, preferences, and order shortcuts.",
  openGraphDescription:
    "SpareKart customer account hub for profile, addresses, vehicles, wishlist, and settings.",
});

export default function Page() {
  return <AccountPage />;
}
