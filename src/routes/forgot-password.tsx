import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ArrowRight } from "lucide-react";
import { PageLayout } from "@/components/marketplace/PageLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Reset Password — SpareKart" },
    { name: "description", content: "Reset your SpareKart account password securely." },
    { property: "og:title", content: "Reset Password — SpareKart" },
    { property: "og:description", content: "Reset your password securely." },
  ] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-[var(--shadow-soft)]">
          <h1 className="text-3xl font-black tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">We'll email you a secure link to reset your password.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <div className="mt-1 flex items-center bg-surface-2 rounded-lg px-3 border border-border focus-within:border-accent">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input type="email" placeholder="you@example.com" className="flex-1 bg-transparent px-2 h-11 text-sm focus:outline-none" />
              </div>
            </div>
            <button className="w-full h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95">Send reset link <ArrowRight className="h-4 w-4" /></button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remembered? <Link to="/login" className="text-accent font-bold hover:underline">Back to sign in</Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}