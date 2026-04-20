import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, MapPin, Truck, CreditCard, FileCheck, Upload, ShieldCheck, Banknote, Building2, Smartphone, BadgeCheck, ArrowRight, Image as ImageIcon } from "lucide-react";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { products, sellers, sampleCart, formatPKR, getSeller } from "@/data/marketplace";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — SpareKart" },
      { name: "description", content: "Complete your secure marketplace order. Cash on Delivery, Bank Transfer, Easypaisa and JazzCash supported." },
      { property: "og:title", content: "Checkout — SpareKart" },
      { property: "og:description", content: "Secure checkout with COD, Bank Transfer, Easypaisa and JazzCash." },
    ],
  }),
  component: Checkout,
});

const steps = [
  { key: "address", label: "Address", Icon: MapPin },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "payment", label: "Payment", Icon: CreditCard },
  { key: "review", label: "Review", Icon: FileCheck },
];

function Checkout() {
  const [step, setStep] = useState(0);
  const [payMethod, setPayMethod] = useState<"cod" | "bank" | "easypaisa" | "jazzcash">("cod");
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);

  const lineItems = sampleCart.map((l) => ({ line: l, product: products.find((p) => p.id === l.productId)! }));
  const grouped = sellers.map((s) => ({ seller: s, items: lineItems.filter((i) => i.product.sellerSlug === s.slug) })).filter((g) => g.items.length > 0);
  const subtotal = lineItems.reduce((s, i) => s + i.product.price * i.line.qty, 0);
  const shipping = subtotal > 5000 ? 0 : grouped.length * 250;
  const total = subtotal + shipping;

  const onProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setProofFile(f.name);
  };

  if (placed) {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-20 max-w-2xl text-center">
          <div className="h-20 w-20 mx-auto rounded-full bg-success/15 grid place-items-center"><Check className="h-10 w-10 text-success" /></div>
          <h1 className="mt-6 text-3xl md:text-4xl font-black tracking-tight">Order placed successfully!</h1>
          <p className="mt-3 text-muted-foreground">Order <span className="font-bold text-foreground">#SK-{Math.floor(Math.random() * 90000) + 10000}</span> has been received. {payMethod !== "cod" && "Your payment proof is being verified — we'll update you within 24 hours."}</p>
          <div className="mt-8 bg-card border border-border rounded-2xl p-6 text-left">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold tabular-nums">{formatPKR(total)}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">Payment</span><span className="font-bold uppercase">{payMethod}</span></div>
            <div className="flex justify-between mt-1"><span className="text-muted-foreground">Sellers</span><span className="font-bold tabular-nums">{grouped.length}</span></div>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center">Back to home</Link>
            <Link to="/shop" className="h-11 px-6 rounded-xl border border-border bg-card font-semibold text-sm flex items-center">Continue shopping</Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Secure checkout</h1>
        {/* Stepper */}
        <div className="mt-8 flex items-center gap-2 max-w-3xl">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div className={`h-10 w-10 rounded-full grid place-items-center text-sm font-bold transition-colors ${i < step ? "bg-success text-success-foreground" : i === step ? "gradient-accent text-primary" : "bg-surface-2 text-muted-foreground"}`}>
                {i < step ? <Check className="h-5 w-5" /> : <s.Icon className="h-4 w-4" />}
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Step {i + 1}</div>
                <div className={`text-sm font-bold ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-success" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {step === 0 && <AddressStep />}
            {step === 1 && <ShippingStep grouped={grouped} />}
            {step === 2 && <PaymentStep method={payMethod} setMethod={setPayMethod} proofFile={proofFile} onProof={onProof} />}
            {step === 3 && <ReviewStep grouped={grouped} method={payMethod} />}

            <div className="flex justify-between">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="h-11 px-6 rounded-xl border border-border bg-card font-semibold text-sm disabled:opacity-40">Back</button>
              {step < 3 ? (
                <button onClick={() => setStep(step + 1)} className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary-hover">Continue <ArrowRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={() => setPlaced(true)} className="h-11 px-8 rounded-xl gradient-accent text-primary font-bold text-sm flex items-center gap-2 hover:opacity-95">Place order <Check className="h-4 w-4" /></button>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-black text-lg">Order summary</h2>
              <div className="mt-4 max-h-72 overflow-y-auto pr-1 space-y-3">
                {lineItems.map(({ line, product }) => (
                  <div key={product.id} className="flex gap-3 text-sm">
                    <img src={product.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{product.title}</div>
                      <div className="text-xs text-muted-foreground">Qty {line.qty} · {getSeller(product.sellerSlug).name}</div>
                    </div>
                    <div className="font-bold tabular-nums">{formatPKR(product.price * line.qty)}</div>
                  </div>
                ))}
              </div>
              <dl className="mt-5 pt-5 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold tabular-nums">{formatPKR(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="font-semibold tabular-nums">{shipping === 0 ? <span className="text-success">FREE</span> : formatPKR(shipping)}</dd></div>
                <div className="flex justify-between pt-3 mt-2 border-t border-border"><dt className="font-black">Total</dt><dd className="font-black text-xl tabular-nums">{formatPKR(total)}</dd></div>
              </dl>
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span>Your order is split across {grouped.length} verified sellers and protected by SpareKart's marketplace guarantee.</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}

function AddressStep() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <h2 className="font-black text-xl">Delivery address</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full name" placeholder="Ahmed Khan" />
        <Field label="Phone" placeholder="+92 300 1234567" />
      </div>
      <Field label="Address line" placeholder="House 12, Street 5, Block A" />
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="City">
          <select className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
            <option>Karachi</option><option>Lahore</option><option>Islamabad</option><option>Rawalpindi</option><option>Faisalabad</option><option>Peshawar</option><option>Multan</option><option>Quetta</option>
          </select>
        </Field>
        <Field label="Province">
          <select className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-accent focus:outline-none">
            <option>Sindh</option><option>Punjab</option><option>Khyber Pakhtunkhwa</option><option>Balochistan</option><option>ICT</option>
          </select>
        </Field>
        <Field label="Postal code" placeholder="74000" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[oklch(0.72_0.19_50)]" defaultChecked /> Save as default delivery address
      </label>
    </div>
  );
}

function ShippingStep({ grouped }: { grouped: { seller: ReturnType<typeof getSeller>; items: { line: typeof sampleCart[number]; product: typeof products[number] }[] }[] }) {
  return (
    <div className="space-y-4">
      <h2 className="font-black text-xl">Shipping per seller</h2>
      {grouped.map((g) => (
        <div key={g.seller.slug} className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={g.seller.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <div className="font-bold text-sm flex items-center gap-1.5">{g.seller.name} <BadgeCheck className="h-3.5 w-3.5 text-info" /></div>
                <div className="text-xs text-muted-foreground">{g.items.length} items · ships from {g.seller.city}</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { id: "std", label: "Standard delivery", time: "3–5 business days", price: 250, default: true },
              { id: "exp", label: "Express delivery", time: "1–2 business days", price: 600 },
            ].map((opt) => (
              <label key={opt.id} className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${opt.default ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-border-strong"}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name={`ship-${g.seller.slug}`} defaultChecked={opt.default} className="h-4 w-4 accent-[oklch(0.72_0.19_50)]" />
                  <div>
                    <div className="font-bold text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.time}</div>
                  </div>
                </div>
                <div className="font-bold tabular-nums">{formatPKR(opt.price)}</div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentStep({ method, setMethod, proofFile, onProof }: {
  method: "cod" | "bank" | "easypaisa" | "jazzcash";
  setMethod: (m: "cod" | "bank" | "easypaisa" | "jazzcash") => void;
  proofFile: string | null;
  onProof: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const methods = [
    { id: "cod" as const, Icon: Banknote, label: "Cash on Delivery", desc: "Pay when your order arrives. Always available across Pakistan.", badge: "Most popular" },
    { id: "bank" as const, Icon: Building2, label: "Bank Transfer", desc: "Transfer from any Pakistani bank account.", badge: null },
    { id: "easypaisa" as const, Icon: Smartphone, label: "Easypaisa", desc: "Pay via Easypaisa mobile wallet.", badge: null },
    { id: "jazzcash" as const, Icon: Smartphone, label: "JazzCash", desc: "Pay via JazzCash mobile wallet.", badge: null },
  ];

  const instructions: Record<string, { title: string; lines: string[] }> = {
    bank: { title: "Bank Transfer Details", lines: ["Account Title: SpareKart (Pvt) Ltd", "Bank: Meezan Bank", "Account #: 0123-4567-8901-234", "IBAN: PK36 MEZN 0001 2345 6789 0123"] },
    easypaisa: { title: "Easypaisa Details", lines: ["Account Title: SpareKart", "Mobile #: 0345 1234567", "Reference: Use your order number"] },
    jazzcash: { title: "JazzCash Details", lines: ["Account Title: SpareKart", "Mobile #: 0301 9876543", "Reference: Use your order number"] },
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-black text-xl">Payment method</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {methods.map((m) => (
            <label key={m.id} className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === m.id ? "border-accent bg-accent-soft shadow-[var(--shadow-glow)]" : "border-border bg-card hover:border-border-strong"}`}>
              <input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-1 h-4 w-4 accent-[oklch(0.72_0.19_50)]" />
              <div className="flex-1">
                <div className="flex items-center gap-2"><m.Icon className="h-4 w-4" /><span className="font-bold text-sm">{m.label}</span>{m.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent text-primary">{m.badge}</span>}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {method !== "cod" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-info" /> {instructions[method].title}</h3>
            <p className="text-sm text-muted-foreground mt-1">Please transfer the exact total amount and upload your payment proof below. Your order will be confirmed within 24 hours after verification.</p>
          </div>
          <div className="rounded-xl bg-surface-2 border border-border p-5 space-y-2 text-sm">
            {instructions[method].lines.map((l, i) => (
              <div key={i} className={`flex justify-between ${i === 0 ? "font-bold" : ""}`}>
                <span className="text-muted-foreground">{l.split(":")[0]}{l.includes(":") ? ":" : ""}</span>
                <span className="font-mono tabular-nums">{l.split(":").slice(1).join(":").trim() || l}</span>
              </div>
            ))}
          </div>

          {/* Uploader */}
          <div>
            <label className="text-sm font-bold">Upload payment proof</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Screenshot or photo of your transaction receipt. JPG, PNG or PDF up to 5 MB.</p>
            <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${proofFile ? "border-success bg-success/5" : "border-border bg-surface-2 hover:border-accent hover:bg-accent-soft"}`}>
              <input type="file" accept="image/*,.pdf" onChange={onProof} className="hidden" />
              {proofFile ? (
                <div className="space-y-2">
                  <div className="h-12 w-12 mx-auto rounded-full bg-success/15 grid place-items-center"><Check className="h-6 w-6 text-success" /></div>
                  <div className="text-sm font-bold">{proofFile}</div>
                  <div className="text-xs text-muted-foreground">Click to replace</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-12 w-12 mx-auto rounded-full bg-card border border-border grid place-items-center"><Upload className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="text-sm font-bold">Drop your proof here or click to browse</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Secure encrypted upload</div>
                </div>
              )}
            </label>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-info/5 border border-info/20 rounded-lg p-3">
            <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <span>Your payment proof is encrypted and only visible to SpareKart's verification team. Sellers never see your financial details.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ grouped, method }: { grouped: { seller: ReturnType<typeof getSeller>; items: { line: typeof sampleCart[number]; product: typeof products[number] }[] }[]; method: string }) {
  return (
    <div className="space-y-4">
      <h2 className="font-black text-xl">Review your order</h2>
      <div className="bg-card border border-border rounded-2xl p-5 text-sm">
        <div className="font-bold mb-2">Delivery to</div>
        <div className="text-muted-foreground">Ahmed Khan · +92 300 1234567 · House 12, Street 5, Block A, Karachi 74000, Sindh</div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 text-sm">
        <div className="font-bold mb-2">Payment</div>
        <div className="text-muted-foreground uppercase">{method}</div>
      </div>
      {grouped.map((g) => {
        const sub = g.items.reduce((s, i) => s + i.product.price * i.line.qty, 0);
        return (
          <div key={g.seller.slug} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3"><img src={g.seller.logo} alt="" className="h-9 w-9 rounded-lg object-cover" /><div><div className="font-bold text-sm">{g.seller.name}</div><div className="text-xs text-muted-foreground">{g.items.length} items</div></div></div>
              <div className="text-sm font-bold tabular-nums">{formatPKR(sub)}</div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {g.items.map(({ line, product }) => (
                <div key={product.id} className="flex justify-between"><span className="text-muted-foreground">{product.title} × {line.qty}</span><span className="tabular-nums">{formatPKR(product.price * line.qty)}</span></div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, placeholder, children }: { label: string; placeholder?: string; children?: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children ?? <input placeholder={placeholder} className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm focus:border-accent focus:outline-none" />}</div>
    </div>
  );
}