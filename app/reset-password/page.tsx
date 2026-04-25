import type { Metadata } from "next";
import ResetPasswordPage from "@/routes/reset-password";

export const metadata: Metadata = {
  title: "Reset Password | SpareKart",
  description: "Choose a new password for your SpareKart account.",
};

export default function Page() {
  return <ResetPasswordPage />;
}
