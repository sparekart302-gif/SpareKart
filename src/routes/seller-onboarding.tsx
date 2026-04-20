import { createFileRoute, Link } from "@tanstack/react-router";
import { Store, TrendingUp, ShieldCheck, Banknote, ArrowRight, Check } from "lucide-react";
import { PageLayout } from "@/components/marketplace/PageLayout";

export const Route = createFileRoute("/seller-onboarding")({
  head: () => ({ meta: [
    { title: "Sell on SpareKart — Open Your Auto Parts Store" },
    { name: "description", content: "Reach thousands of auto parts buyers across Pakistan. Zero monthly fees, easy onboarding, full marketplace support." },
    { property: "og:title", content: "Sell on SpareKart" },
    { property: "og:description", content: "Open your auto parts store on Pakistan's premium marketplace." },
  ] }),
  component: SellerOnboarding,
});

function SellerOnboarding() {
  return (
    <PageLayout>
      <section className="gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
              <Store className="h-3.5 w-3.5 text-accent" /> For Sellers
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-balance">Grow your auto parts business with SpareKart.</h1>
            <p className="mt-5 opacity-85 text-lg max-w-xl">Reach thousands of verified buyers across Pakistan. Zero monthly fees — pay only when you sell. Full marketplace support, simple onboarding, fast payouts.</p>
            <div className="mt-7 flex gap-3">
              <Link to="/register" className="h-12 px-6 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center gap-2 hover:opacity-95">Apply to sell <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/sellers" className="h-12 px-6 rounded-xl bg-white/10 backdrop-blur border border-white/20 font-bold text-sm flex items-center gap-2 hover:bg-white/15">Browse stores</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: TrendingUp, title: "10,000+", desc: "Monthly buyers" },
              { Icon: Store, title: "8+ stores", desc: "Already selling" },
              { Icon: Banknote, title: "Weekly", desc: "Fast payouts" },
              { Icon: ShieldCheck, title: "0%", desc: "Monthly fee" },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
                <s.Icon className="h-6 w-6 text-accent" />
                <div className="mt-3 text-2xl font-black tabular-nums">{s.title}</div>
                <div className="text-xs opacity-80">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">How it works</div>
          <h2 className="text-3xl md:text-4xl font-black mt-2">Start selling in 3 steps</h2>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {[
            { n: "01", title: "Apply", desc: "Fill out our seller application with your business details. Approval in 2–3 business days." },
            { n: "02", title: "List your products", desc: "Use our seller dashboard to upload your inventory with rich photos, specs and compatibility." },
            { n: "03", title: "Start earning", desc: "Receive orders, ship to customers, get paid weekly. Our team is here to support you every step." },
          ].map((s) => (
            <div key={s.n} className="p-6 rounded-2xl bg-card border border-border hover-lift">
              <div className="text-5xl font-black text-accent tabular-nums">{s.n}</div>
              <h3 className="mt-3 font-bold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto bg-card border border-border rounded-2xl p-6">
          <h3 className="font-black text-xl">What you get</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {["Branded store page with custom banner & logo", "Full inventory & order management dashboard", "Marketplace-wide promotions and traffic", "Customer chat, reviews and ratings", "Weekly payouts via bank transfer", "Dedicated seller support team"].map((b) => (
              <li key={b} className="flex items-start gap-2"><Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {b}</li>
            ))}
          </ul>
          <Link to="/register" className="mt-6 w-full h-12 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center justify-center gap-2">Apply to become a seller <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </PageLayout>
  );
}