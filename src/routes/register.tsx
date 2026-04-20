import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";
import { PageLayout } from "@/components/marketplace/PageLayout";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [
    { title: "Create Account — SpareKart" },
    { name: "description", content: "Create a free SpareKart account as a customer or open your own seller store." },
    { property: "og:title", content: "Create Account — SpareKart" },
    { property: "og:description", content: "Join SpareKart as a customer or seller." },
  ] }),
  component: Register,
});

function Register() {
  const [role, setRole] = useState<"customer" | "seller">("customer");
  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-16 max-w-lg">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-[var(--shadow-soft)]">
          <h1 className="text-3xl font-black tracking-tight">Join SpareKart</h1>
          <p className="text-sm text-muted-foreground mt-1">Pakistan's premium auto parts marketplace.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-2">
            {[
              { id: "customer" as const, label: "I'm a Customer", Icon: ShoppingBag },
              { id: "seller" as const, label: "Become a Seller", Icon: Store },
            ].map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)} className={`h-11 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${role === r.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                <r.Icon className="h-4 w-4" /> {r.label}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full name" placeholder="Ahmed Khan" />
              <Field label="Phone" placeholder="+92 300 1234567" />
            </div>
            <Field label="Email" placeholder="you@example.com" type="email" />
            {role === "seller" && (
              <>
                <Field label="Store name" placeholder="e.g. Karachi Auto Parts" />
                <Field label="City">
                  <select className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm focus:border-accent focus:outline-none">
                    <option>Karachi</option><option>Lahore</option><option>Islamabad</option><option>Rawalpindi</option><option>Faisalabad</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="Password" placeholder="••••••••" type="password" />
            <button className="w-full h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95">
              {role === "customer" ? "Create account" : "Apply to sell"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-accent font-bold hover:underline">Sign in</Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function Field({ label, placeholder, type = "text", children }: { label: string; placeholder?: string; type?: string; children?: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children ?? <input type={type} placeholder={placeholder} className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm focus:border-accent focus:outline-none" />}</div>
    </div>
  );
}