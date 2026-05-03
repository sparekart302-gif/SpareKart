import { Suspense } from "react";
import type { Metadata } from "next";
import ForgotPasswordPage from "@/routes/forgot-password";
import { buildPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Reset Password — SpareKart",
  description: "Reset your SpareKart account password securely.",
  openGraphDescription: "Reset your password securely.",
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
