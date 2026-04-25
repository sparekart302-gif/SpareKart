"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";

export default function ResetPasswordPage() {
  return (
    <PageLayout>
      <section className="container mx-auto max-w-md px-4 py-10 sm:py-12 md:py-14">
        <div className="rounded-[26px] bg-card p-6 text-center shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Password reset now uses OTP</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the recovery screen, request a fresh OTP, and confirm the 6-digit code with your new password.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl gradient-accent px-5 text-sm font-bold text-primary"
          >
            Open recovery screen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

