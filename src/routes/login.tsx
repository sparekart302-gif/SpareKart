"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { ApiRequestError, loginWithEmail } from "@/modules/auth/client";
import { getRoleHomePath } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, refreshAuthSession } = useMarketplace();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const verificationState = searchParams.get("verified");
  const oauthState = searchParams.get("oauth");
  const verificationMessage = useMemo(() => {
    if (verificationState === "success") {
      return { tone: "success", text: "Your email has been verified. You can sign in now." };
    }

    if (verificationState === "failed" || verificationState === "missing") {
      return { tone: "danger", text: "That verification link is invalid or expired. Request a fresh code below." };
    }

    return null;
  }, [verificationState]);
  const oauthMessage = useMemo(() => {
    if (oauthState === "unavailable") {
      return {
        tone: "danger",
        text: "Google sign-in is not configured yet. Please use email and password for now.",
      };
    }

    if (oauthState === "access_denied") {
      return {
        tone: "danger",
        text: "Google sign-in was canceled before completion.",
      };
    }

    if (oauthState === "failed") {
      return {
        tone: "danger",
        text: "Google sign-in could not be completed. Please try again.",
      };
    }

    return null;
  }, [oauthState]);

  const currentSessionLabel = currentUser ? currentUser.role.replaceAll("_", " ") : "SIGNED OUT";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const user = await loginWithEmail({
        email: email.trim(),
        password,
      });

      await refreshAuthSession();
      toast.success(`Signed in as ${user.name}.`);
      router.push(getRoleHomePathForRole(user.role));
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "EMAIL_NOT_VERIFIED") {
        toast.error("Verify your email before signing in.");
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else {
        toast.error(error instanceof Error ? error.message : "Unable to sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <section className="container mx-auto max-w-6xl px-4 py-10 sm:py-12 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Account Access</div>
          <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-3xl">Sign in to SpareKart</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in with your verified email and password or continue with Google for faster account access.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-premium)]">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Email login</div>
            <h2 className="mt-2 text-2xl font-black">Secure sign in</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Customer, seller, and admin accounts can sign in here with verified email/password authentication.
            </p>

            {verificationMessage ? (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  verificationMessage.tone === "success"
                    ? "border border-success/20 bg-success/10 text-success-foreground"
                    : "border border-destructive/20 bg-destructive/10 text-destructive"
                }`}
              >
                {verificationMessage.text}
              </div>
            ) : null}
            {oauthMessage ? (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {oauthMessage.text}
              </div>
            ) : null}

            <a
              href="/api/auth/google"
              className="mt-5 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface sm:h-12"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-black text-[#4285F4] shadow-[var(--shadow-soft)]">
                G
              </span>
              Continue with Google
            </a>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/70" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Or use email
              </span>
              <div className="h-px flex-1 bg-border/70" />
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <Field label="Email">
                <div className="flex items-center rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-accent/30">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 flex-1 bg-transparent px-2 text-sm focus:outline-none"
                    required
                  />
                </div>
              </Field>
              <Field label="Password">
                <div className="flex items-center rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)] focus-within:ring-2 focus-within:ring-accent/30">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-11 flex-1 bg-transparent px-2 text-sm focus:outline-none"
                    required
                  />
                </div>
              </Field>

              <div className="flex items-center justify-between gap-3 text-sm">
                <Link href="/forgot-password" className="font-semibold text-accent hover:underline">
                  Forgot password?
                </Link>
                <Link href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="font-semibold text-accent hover:underline">
                  Verify email
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
              >
                {submitting ? "Signing in..." : "Sign in"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-premium)]">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Current session</div>
              <h2 className="mt-2 text-2xl font-black">{currentUser?.name ?? "No active session"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentUser?.email ?? "Sign in to manage orders, reviews, payouts, and account settings across SpareKart."}
              </p>
              <div className="mt-4 inline-flex rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                {currentSessionLabel}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href={getRoleHomePath(currentUser)} className="flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                  {currentUser ? "Open my portal" : "Open storefront"}
                </Link>
                <Link href="/" className="flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]">
                  Back to store
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] bg-card p-6 shadow-[var(--shadow-premium)]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Account support
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Need a new account or password help? Use the links below to register, verify your email, or recover access with OTP.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/register"
                  className="rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="text-sm font-bold text-foreground">Create account</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Register as a customer or start seller onboarding.
                  </div>
                </Link>
                <Link
                  href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                  className="rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="text-sm font-bold text-foreground">Verify email</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Enter your OTP code or request a fresh verification email.
                  </div>
                </Link>
                <Link
                  href="/forgot-password"
                  className="rounded-[24px] bg-surface p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="text-sm font-bold text-foreground">Reset password</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Recover access using the OTP sent to your email.
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function getRoleHomePathForRole(role: "CUSTOMER" | "SELLER" | "ADMIN" | "SUPER_ADMIN") {
  switch (role) {
    case "CUSTOMER":
      return "/account";
    case "SELLER":
      return "/seller/orders";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
