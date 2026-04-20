import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { PageLayout } from "@/components/marketplace/PageLayout";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Sign In — SpareKart" },
    { name: "description", content: "Sign in to your SpareKart account to track orders, manage addresses and shop faster." },
    { property: "og:title", content: "Sign In — SpareKart" },
    { property: "og:description", content: "Sign in to your SpareKart marketplace account." },
  ] }),
  component: Login,
});

function Login() {
  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-[var(--shadow-soft)]">
          <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to continue shopping on SpareKart.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <div className="mt-1 flex items-center bg-surface-2 rounded-lg px-3 border border-border focus-within:border-accent">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input type="email" placeholder="you@example.com" className="flex-1 bg-transparent px-2 h-11 text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-accent font-semibold hover:underline">Forgot?</Link>
              </div>
              <div className="mt-1 flex items-center bg-surface-2 rounded-lg px-3 border border-border focus-within:border-accent">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input type="password" placeholder="••••••••" className="flex-1 bg-transparent px-2 h-11 text-sm focus:outline-none" />
              </div>
            </div>
            <button className="w-full h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95">Sign in <ArrowRight className="h-4 w-4" /></button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            New to SpareKart? <Link to="/register" className="text-accent font-bold hover:underline">Create an account</Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}