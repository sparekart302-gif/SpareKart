"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { signupWithEmail } from "@/modules/auth/client";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    storeName: "",
    city: "Karachi",
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await signupWithEmail({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        role: role === "customer" ? "CUSTOMER" : "SELLER",
        sellerProfile:
          role === "seller"
            ? {
                storeName: form.storeName.trim(),
                city: form.city,
              }
            : undefined,
      });

      toast.success("Verification code sent to your email.");
      router.push(`/verify-email?email=${encodeURIComponent(result.user.email)}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create account."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <section className="container mx-auto max-w-lg px-4 py-10 sm:py-12 md:py-14">
        <div className="mb-5 text-center sm:mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
            Create Account
          </div>

          <h1 className="text-[2rem] font-black tracking-tight sm:text-3xl">
            Join SpareKart
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Create your account, then verify your email before signing in.
          </p>
        </div>

        <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-8">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-soft)]">
            {[
              { id: "customer" as const, label: "I'm a Customer", Icon: ShoppingBag },
              { id: "seller" as const, label: "Become a Seller", Icon: Store },
            ].map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setRole(entry.id)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-bold transition-all sm:h-11 sm:gap-2 sm:text-sm ${
                  role === entry.id
                    ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground"
                }`}
              >
                <entry.Icon className="h-4 w-4" />
                {entry.label}
              </button>
            ))}
          </div>

          {role === "customer" ? (
            <>
              <a
                href="/api/auth/google"
                className="mt-5 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface sm:h-12"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-black text-[#4285F4] shadow-[var(--shadow-soft)]">
                  G
                </span>
                Create account with Google
              </a>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Or continue with email
                </span>
                <div className="h-px flex-1 bg-border/70" />
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-border/70 bg-surface px-4 py-3 text-sm text-muted-foreground">
              Seller onboarding uses email and password so we can collect store
              details first. After setup, you can use the same verified email
              for sign-in.
            </div>
          )}

          <form className="mt-5 space-y-4 sm:mt-6" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  placeholder="Ahmed Khan"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  required
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, phone: event.target.value }))
                  }
                  placeholder="+92 300 1234567"
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  required
                />
              </Field>
            </div>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, email: event.target.value }))
                }
                placeholder="you@example.com"
                className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                required
              />
            </Field>

            {role === "seller" && (
              <>
                <Field label="Store name">
                  <input
                    value={form.storeName}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        storeName: event.target.value,
                      }))
                    }
                    placeholder="Karachi Auto Parts"
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                    required
                  />
                </Field>

                <Field label="City">
                  <select
                    value={form.city}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, city: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option>Karachi</option>
                    <option>Lahore</option>
                    <option>Islamabad</option>
                    <option>Rawalpindi</option>
                    <option>Faisalabad</option>
                  </select>
                </Field>
              </>
            )}

            <Field label="Password">
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, password: event.target.value }))
                }
                placeholder="Choose a strong password"
                className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
                required
                minLength={8}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
            >
              {submitting
                ? "Creating account..."
                : role === "customer"
                  ? "Create account"
                  : "Apply to sell"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-accent hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}