import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, HelpCircle, Truck, RotateCcw, CreditCard, ShieldCheck } from "lucide-react";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: "Help Centre — SpareKart" },
    { name: "description", content: "Get help with your SpareKart orders, returns, payments and shipping. Friendly support for all customers." },
    { property: "og:title", content: "Help Centre — SpareKart" },
    { property: "og:description", content: "Help with orders, returns, payments and shipping." },
  ] }),
  component: Help,
});

const faqs = [
  { q: "How does Cash on Delivery work?", a: "Place your order, choose COD, and pay our courier in cash when your parcel arrives. Available across all major cities in Pakistan." },
  { q: "What if a part doesn't fit my car?", a: "Every part on SpareKart is backed by our fitment guarantee. If it doesn't fit, return it within 7 days for a full refund or free replacement." },
  { q: "How long does delivery take?", a: "Standard delivery is 3–5 business days nationwide. Express delivery (1–2 days) is available from most sellers in metropolitan areas." },
  { q: "How do I upload payment proof?", a: "After choosing Bank Transfer, Easypaisa or JazzCash at checkout, you'll see a secure upload area. Drop a screenshot or photo of your receipt and we'll verify within 24 hours." },
  { q: "Are all sellers verified?", a: "Yes. Every seller on SpareKart is vetted by our trust team and continuously monitored through buyer ratings and reviews." },
  { q: "How do I become a seller?", a: "Visit our Become a Seller page to apply. Approval typically takes 2–3 business days." },
];

function Help() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Help Centre" }]} />
      </div>
      <section className="container mx-auto px-4 pb-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-accent font-bold">We're here to help</div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">How can we help you?</h1>
          <p className="mt-3 text-muted-foreground">Find answers to common questions, or reach out to our support team anytime.</p>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { Icon: Truck, title: "Shipping" },
            { Icon: RotateCcw, title: "Returns" },
            { Icon: CreditCard, title: "Payments" },
            { Icon: ShieldCheck, title: "Trust & Safety" },
          ].map((c) => (
            <div key={c.title} className="p-5 rounded-2xl bg-card border border-border text-center hover-lift cursor-pointer">
              <div className="h-12 w-12 mx-auto rounded-xl bg-accent-soft text-accent grid place-items-center"><c.Icon className="h-5 w-5" /></div>
              <div className="mt-3 font-bold text-sm">{c.title}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-5 flex items-center gap-2"><HelpCircle className="h-6 w-6 text-accent" /> Frequently asked questions</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <details key={i} className="group bg-card border border-border rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-sm">
                  {f.q}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}