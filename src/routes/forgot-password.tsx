"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { confirmPasswordResetCode, requestPasswordResetEmail } from "@/modules/auth/client";
import { useMarketplace } from "@/modules/marketplace/store";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuthSession } = useMarketplace();
  const initialEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<"request" | "confirm">(initialEmail ? "confirm" : "request");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmitOtp = useMemo(
    () => code.trim().length === 6 && password.length >= 8 && password === confirmPassword,
    [code, password, confirmPassword],
  );

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await requestPasswordResetEmail(email.trim());
      toast.success("Password reset OTP sent if the account exists.");
      setStep("confirm");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send OTP.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const user = await confirmPasswordResetCode({
        email: email.trim(),
        code: code.trim(),
        password,
      });

      await refreshAuthSession();
      toast.success("Password updated successfully.");
      router.push(user.role === "CUSTOMER" ? "/account" : user.role === "SELLER" ? "/seller/orders" : "/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <section className="container mx-auto max-w-md px-4 py-10 sm:py-12 md:py-14">
        <div className="mb-5 text-center sm:mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Recovery</div>
          <h1 className="text-[2rem] font-black tracking-tight sm:text-3xl">Reset password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Request an OTP, then confirm it with your new password.</p>
        </div>
        <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-8">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-soft)]">
            {[
              { key: "request" as const, label: "1. Get OTP" },
              { key: "confirm" as const, label: "2. Confirm" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStep(item.key)}
                className={`h-10 rounded-xl text-xs font-bold transition-all sm:text-sm ${step === item.key ? "bg-card text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {step === "request" ? (
            <form className="space-y-4" onSubmit={handleRequest}>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email</label>
                <div className="mt-1 flex items-center rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-accent/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 flex-1 bg-transparent px-2 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
              >
                {submitting ? "Sending OTP..." : "Send OTP"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleConfirm}>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email</label>
                <div className="mt-1 flex items-center rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)]">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 flex-1 bg-transparent px-2 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">OTP code</label>
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
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Enter the 6-digit code from your email.</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await requestPasswordResetEmail(email.trim());
                        toast.success("A fresh OTP has been sent.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Unable to resend OTP.");
                      }
                    }}
                    className="font-semibold text-accent hover:underline"
                  >
                    Resend
                  </button>
                </div>
              </div>

              <Field
                label="New password"
                icon={LockKeyhole}
                value={password}
                onChange={setPassword}
                placeholder="Enter your new password"
              />
              <Field
                label="Confirm password"
                icon={KeyRound}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat your new password"
              />
              <button
                type="submit"
                disabled={submitting || !canSubmitOtp}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
              >
                {submitting ? "Resetting password..." : "Confirm reset"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it? <Link to="/login" className="font-bold text-accent hover:underline">Back to sign in</Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: typeof LockKeyhole;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-accent/30">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-11 flex-1 bg-transparent px-2 text-sm focus:outline-none"
          minLength={8}
          required
        />
      </div>
    </div>
  );
}

