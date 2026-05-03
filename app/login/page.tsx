import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPage from "@/routes/login";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Sign In — SpareKart",
  description:
    "Sign in to your SpareKart account to track orders, manage addresses and shop faster.",
  openGraphDescription: "Sign in to your SpareKart marketplace account.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
