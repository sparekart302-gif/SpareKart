import { ChevronDown, HelpCircle, Truck, RotateCcw, CreditCard, ShieldCheck } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";

const faqs = [
  { q: "How does Cash on Delivery work?", a: "Place your order, choose COD, and pay our courier in cash when your parcel arrives. Available across all major cities in Pakistan." },
  { q: "What if a part doesn't fit my car?", a: "Every part on SpareKart is backed by our fitment guarantee. If it doesn't fit, return it within 7 days for a full refund or free replacement." },
  { q: "How long does delivery take?", a: "Standard delivery is 3–5 business days nationwide. Express delivery (1–2 days) is available from most sellers in metropolitan areas." },
  { q: "How do I upload payment proof?", a: "After choosing Bank Transfer, Easypaisa or JazzCash at checkout, you'll see a secure upload area. Drop a screenshot or photo of your receipt and we'll verify within 24 hours." },
  { q: "Are all sellers verified?", a: "Yes. Every seller on SpareKart is vetted by our trust team and continuously monitored through buyer ratings and reviews." },
  { q: "How do I become a seller?", a: "Visit our Become a Seller page to apply. Approval typically takes 2–3 business days." },
];

export default function HelpPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Help Centre" }]} />
      </div>
      <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">We're here to help</div>
          <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-3xl md:text-5xl">How can we help you?</h1>
          <p className="mt-3 text-muted-foreground">Find answers to common questions, or reach out to our support team anytime.</p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-4">
          {[
            { Icon: Truck, title: "Shipping" },
            { Icon: RotateCcw, title: "Returns" },
            { Icon: CreditCard, title: "Payments" },
            { Icon: ShieldCheck, title: "Trust & Safety" },
          ].map((c) => (
            <div key={c.title} className="cursor-pointer rounded-[20px] bg-surface p-4 text-center shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] sm:rounded-[24px] sm:p-5">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent sm:h-12 sm:w-12"><c.Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" /></div>
              <div className="mt-2.5 text-[13px] font-bold sm:mt-3 sm:text-sm">{c.title}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl sm:mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-[1.6rem] font-black sm:mb-5 sm:text-2xl"><HelpCircle className="h-5 w-5 text-accent sm:h-6 sm:w-6" /> Frequently asked questions</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <details key={i} className="group overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-soft)]">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-bold sm:p-5">
                  {f.q}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground sm:px-5 sm:pb-5">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
