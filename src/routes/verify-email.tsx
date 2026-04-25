"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { resendVerificationCode, verifyEmailCode } from "@/modules/auth/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && code.trim().length === 6,
    [email, code],
  );

  useEffect(() => {
    if (!autoSubmitted && email && code.length === 6) {
      setAutoSubmitted(true);
      void (async () => {
        try {
          await verifyEmailCode({ email, code });
          toast.success("Email verified successfully.");
          router.push(`/login?verified=success&email=${encodeURIComponent(email)}`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to verify email.");
        }
      })();
    }
  }, [autoSubmitted, code, email, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await verifyEmailCode({
        email: email.trim(),
        code: code.trim(),
      });
      toast.success("Email verified successfully.");
      router.push(`/login?verified=success&email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <section className="container mx-auto max-w-md px-4 py-10 sm:py-12 md:py-14">
        <div className="mb-5 text-center sm:mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Verification</div>
          <h1 className="text-[2rem] font-black tracking-tight sm:text-3xl">Verify your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code sent to your inbox to activate your account.</p>
        </div>
        <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-8">
          <div className="mb-5 flex items-center justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
              <MailCheck className="h-5 w-5" />
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-1 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Verification code</label>
              <div className="mt-2 flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await resendVerificationCode(email.trim());
                    toast.success(result.alreadyVerified ? "This email is already verified." : "A fresh verification code has been sent.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to resend code.");
                  }
                }}
                className="font-semibold text-accent hover:underline"
              >
                Resend code
              </button>
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Back to sign in
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
            >
              {submitting ? "Verifying..." : "Verify email"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </PageLayout>
  );
}

