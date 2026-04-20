import { Link } from "@tanstack/react-router";
import { Star, BadgeCheck, MapPin, Package } from "lucide-react";
import type { Seller } from "@/data/marketplace";

export function SellerCard({ seller }: { seller: Seller }) {
  return (
    <Link
      to="/seller/$slug"
      params={{ slug: seller.slug }}
      className="group bg-card rounded-2xl border border-border overflow-hidden hover-lift block"
    >
      <div className="h-24 bg-surface-2 relative overflow-hidden">
        <img src={seller.banner} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="px-5 pb-5 -mt-8 relative">
        <div className="h-16 w-16 rounded-xl border-4 border-card bg-card overflow-hidden shadow-[var(--shadow-soft)]">
          <img src={seller.logo} alt={seller.name} className="h-full w-full object-cover" />
        </div>
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-foreground truncate group-hover:text-accent transition-colors">{seller.name}</h3>
              {seller.verified && <BadgeCheck className="h-4 w-4 text-info shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{seller.tagline}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-warning"><Star className="h-3.5 w-3.5 fill-current" /><span className="font-semibold text-foreground tabular-nums">{seller.rating}</span></span>
          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {seller.productCount}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {seller.city}</span>
        </div>
      </div>
    </Link>
  );
}