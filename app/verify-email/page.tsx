import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmailPage from "@/routes/verify-email";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Verify Email — SpareKart",
  description: "Confirm your SpareKart email address with a secure verification code.",
  openGraphDescription: "Verify your SpareKart email address securely.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPage />
    </Suspense>
  );
}

