import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { BrandLogo } from "@/components/marketplace/BrandLogo";

export function Footer() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground sm:mt-20">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-4 sm:col-span-2 lg:col-span-2 sm:space-y-5">
            <Link
              to="/"
              className="inline-flex w-full justify-center text-center transition-transform hover:scale-[1.02] sm:w-auto sm:justify-start sm:text-left"
            >
              <BrandLogo
                variant="full"
                className="text-[2rem] tracking-[0.22em] text-primary-foreground sm:text-[2.3rem]"
              />
            </Link>
            <p className="max-w-md text-sm leading-relaxed opacity-80">
              Pakistan's premium destination for genuine car spare parts from verified sellers across the country. Shop with confidence — backed by our fitment guarantee and easy returns.
            </p>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-accent" /> +92 317 0397996</div>
              <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-accent" /> sparekart302@gmail.com</div>
              <div className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-accent" /> Narowal · Punjab · Pakistan</div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-accent hover:text-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              <li><Link to="/shop" className="hover:text-accent">All Products</Link></li>
              <li><Link to="/category/$slug" params={{ slug: "brakes" }} className="hover:text-accent">Brakes</Link></li>
              <li><Link to="/category/$slug" params={{ slug: "engine" }} className="hover:text-accent">Engine</Link></li>
              <li><Link to="/category/$slug" params={{ slug: "lighting" }} className="hover:text-accent">Lighting</Link></li>
              <li><Link to="/category/$slug" params={{ slug: "tyres-wheels" }} className="hover:text-accent">Tyres & Wheels</Link></li>
              <li><Link to="/compatibility" className="hover:text-accent">Find Parts</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">For Sellers</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              <li><Link to="/seller-onboarding" className="hover:text-accent">Become a Seller</Link></li>
              <li><Link to="/sellers" className="hover:text-accent">Browse Stores</Link></li>
              <li><a href="#" className="hover:text-accent">Seller Policies</a></li>
              <li><a href="#" className="hover:text-accent">Pricing & Fees</a></li>
              <li><a href="#" className="hover:text-accent">Seller Help</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider">Help & Trust</h4>
            <ul className="space-y-2.5 text-sm opacity-80">
              <li><Link to="/help" className="hover:text-accent">Help Centre</Link></li>
              <li><a href="#" className="hover:text-accent">Returns & Refunds</a></li>
              <li><a href="#" className="hover:text-accent">Shipping Info</a></li>
              <li><a href="#" className="hover:text-accent">Payment Methods</a></li>
              <li><a href="#" className="hover:text-accent">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-accent">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-white/10 pt-6 md:mt-12 md:grid-cols-2 md:items-center md:pt-8">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <ShieldCheck className="h-5 w-5 text-accent" /> Secure marketplace · Verified sellers · COD across Pakistan
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <span className="text-xs opacity-70">We accept:</span>
            {["COD", "Bank Transfer", "Easypaisa", "JazzCash"].map((m) => (
              <span key={m} className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-white/10">{m}</span>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-xs opacity-60">
          © {new Date().getFullYear()} SpareKart. All rights reserved. A premium multi-vendor marketplace.
        </div>
      </div>
    </footer>
  );
}
