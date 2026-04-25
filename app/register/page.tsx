import type { Metadata } from "next";
import RegisterPage from "@/routes/register";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Create Account — SpareKart",
  description:
    "Create a free SpareKart account as a customer or open your own seller store.",
  openGraphDescription: "Join SpareKart as a customer or seller.",
});

export default function Page() {
  return <RegisterPage />;
}
