import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
          <div className="col-span-2 lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl gradient-accent grid place-items-center"><span className="font-black text-primary text-lg">S</span></div>
              <div>
                <div className="text-2xl font-black tracking-tight">SpareKart</div>
                <div className="text-[10px] uppercase tracking-widest opacity-70">Auto Parts Marketplace</div>
              </div>
            </div>
            <p className="text-sm opacity-80 max-w-md leading-relaxed">
              Pakistan's premium destination for genuine car spare parts from verified sellers across the country. Shop with confidence — backed by our fitment guarantee and easy returns.
            </p>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-accent" /> +92 21 111 SPARE (77273)</div>
              <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-accent" /> support@sparekart.pk</div>
              <div className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-accent" /> Karachi · Lahore · Islamabad</div>
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

        <div className="mt-12 pt-8 border-t border-white/10 grid md:grid-cols-2 gap-4 items-center">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <ShieldCheck className="h-5 w-5 text-accent" /> Secure marketplace · Verified sellers · COD across Pakistan
          </div>
          <div className="flex items-center gap-3 md:justify-end">
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