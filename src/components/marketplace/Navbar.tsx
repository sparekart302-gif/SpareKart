import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, ShoppingCart, User, Menu, MapPin, Heart, ChevronDown } from "lucide-react";
import { categories } from "@/data/marketplace";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-background/85 shadow-[var(--shadow-soft)]" : "bg-background"} border-b border-border`}>
      {/* Top utility bar */}
      <div className="hidden md:block bg-primary text-primary-foreground text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-between">
          <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Deliver to <span className="font-semibold">All Pakistan</span></div>
          <div className="flex items-center gap-5">
            <Link to="/seller-onboarding" className="hover:text-accent transition-colors">Sell on SpareKart</Link>
            <Link to="/help" className="hover:text-accent transition-colors">Help</Link>
            <Link to="/login" className="hover:text-accent transition-colors">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container mx-auto px-4 h-16 lg:h-20 flex items-center gap-3 lg:gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl gradient-accent grid place-items-center shadow-[var(--shadow-glow)] group-hover:scale-105 transition-transform">
            <span className="font-black text-primary text-lg">S</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-xl lg:text-2xl font-black tracking-tight text-primary leading-none">SpareKart</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Auto Parts Marketplace</div>
          </div>
        </Link>

        {/* Search */}
        <form
          className="flex-1 max-w-2xl hidden md:flex items-center bg-surface-2 rounded-xl border border-border focus-within:border-accent focus-within:shadow-[var(--shadow-glow)] transition-all"
          onSubmit={(e) => e.preventDefault()}
        >
          <select className="bg-transparent text-sm font-medium px-4 py-3 border-r border-border focus:outline-none cursor-pointer">
            <option>All</option>
            {categories.slice(0, 5).map((c) => <option key={c.slug}>{c.name}</option>)}
          </select>
          <input
            placeholder="Search brake pads, oil filter, headlights…"
            className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <button className="h-full px-5 gradient-accent rounded-r-xl text-primary font-semibold flex items-center gap-2 hover:opacity-95 transition-opacity">
            <Search className="h-4 w-4" /> <span className="hidden lg:inline">Search</span>
          </button>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          <Link to="/login" className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors">
            <User className="h-5 w-5" />
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground leading-none">Hello, Sign in</div>
              <div className="text-sm font-semibold leading-tight">Account</div>
            </div>
          </Link>
          <Link to="/cart" className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full gradient-accent text-primary text-[11px] font-bold grid place-items-center">4</span>
            </div>
            <span className="hidden lg:inline text-sm font-semibold">Cart</span>
          </Link>
          <button className="md:hidden p-2 rounded-lg hover:bg-surface-2"><Menu className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Categories nav */}
      <div className="hidden md:block border-t border-border bg-surface">
        <div className="container mx-auto px-4 h-11 flex items-center gap-1 overflow-x-auto">
          <button
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
            className="relative flex items-center gap-1.5 px-3 h-full text-sm font-semibold hover:text-accent transition-colors"
          >
            <Menu className="h-4 w-4" /> All Categories <ChevronDown className="h-3.5 w-3.5" />
            {megaOpen && (
              <div className="absolute top-full left-0 w-[680px] bg-card rounded-b-xl border border-border shadow-[var(--shadow-premium)] p-6 grid grid-cols-2 gap-1 z-50 text-left">
                {categories.map((c) => (
                  <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors">
                    <div className="text-sm font-semibold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.description}</div>
                  </Link>
                ))}
              </div>
            )}
          </button>
          <Link to="/shop" className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center transition-colors">Shop All</Link>
          <Link to="/compatibility" className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Find Parts For Your Car
          </Link>
          {categories.slice(0, 5).map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center transition-colors whitespace-nowrap">
              {c.name}
            </Link>
          ))}
          <Link to="/sellers" className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center transition-colors">Top Sellers</Link>
          <div className="ml-auto text-xs text-muted-foreground hidden lg:flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-accent" /> Free shipping over Rs. 5,000</div>
        </div>
      </div>
    </header>
  );
}