import { Store, TrendingUp, ShieldCheck, Banknote, ArrowRight, Check } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";

export default function SellerOnboardingPage() {
  return (
    <PageLayout>
      <section className="container mx-auto px-4 pb-8 sm:pb-10">
        <div className="grid items-center gap-5 rounded-[28px] gradient-hero px-4 py-8 text-primary-foreground shadow-[var(--shadow-premium)] sm:px-6 sm:py-12 lg:grid-cols-2 lg:gap-10 lg:rounded-[36px] lg:px-8 lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Store className="h-3.5 w-3.5 text-accent" /> For Sellers
            </div>
            <h1 className="mt-4 text-[2rem] font-black tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-6xl">
              Grow your auto parts business with SpareKart.
            </h1>
            <p className="mt-4 max-w-xl text-sm opacity-85 sm:mt-5 sm:text-lg">
              Reach thousands of verified buyers across Pakistan. Zero monthly fees, full
              marketplace support, and fast payouts.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
              <Link
                to="/register"
                className="flex h-11 items-center justify-center gap-2 rounded-xl gradient-accent px-6 text-sm font-bold text-primary hover:opacity-95 sm:h-12"
              >
                Apply to sell <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sellers"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-6 text-sm font-bold backdrop-blur hover:bg-white/15 sm:h-12"
              >
                Browse stores
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { Icon: TrendingUp, title: "10,000+", desc: "Monthly buyers" },
              { Icon: Store, title: "8+ stores", desc: "Already selling" },
              { Icon: Banknote, title: "Weekly", desc: "Fast payouts" },
              { Icon: ShieldCheck, title: "0%", desc: "Monthly fee" },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-[20px] bg-white/10 p-4 backdrop-blur sm:rounded-[24px] sm:p-5"
              >
                <s.Icon className="h-6 w-6 text-accent" />
                <div className="mt-3 text-xl font-black tabular-nums sm:text-2xl">{s.title}</div>
                <div className="text-xs opacity-80">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 sm:py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">
            How it works
          </div>
          <h2 className="mt-2 text-[1.9rem] font-black sm:text-3xl md:text-4xl">
            Start selling in 3 steps
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Apply",
              desc: "Fill out our seller application with your business details. Approval in 2–3 business days.",
            },
            {
              n: "02",
              title: "List your products",
              desc: "Use our seller dashboard to upload your inventory with rich photos, specs and compatibility.",
            },
            {
              n: "03",
              title: "Start earning",
              desc: "Receive orders, ship to customers, get paid weekly. Our team is here to support you every step.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-[24px] bg-surface p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] sm:rounded-[26px] sm:p-6"
            >
              <div className="text-4xl font-black text-accent tabular-nums sm:text-5xl">{s.n}</div>
              <h3 className="mt-3 font-bold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)] sm:mt-12 sm:rounded-[30px] sm:p-6">
          <h3 className="font-black text-xl">What you get</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              "Branded store page with custom banner & logo",
              "Full inventory & order management dashboard",
              "Marketplace-wide promotions and traffic",
              "Customer chat, reviews and ratings",
              "Weekly payouts via bank transfer",
              "Dedicated seller support team",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
          <Link
            to="/register"
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary sm:h-12"
          >
            Apply to become a seller <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
