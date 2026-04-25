import { Star, BadgeCheck, MapPin, Package } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import type { Seller } from "@/data/marketplace";

export function SellerCard({ seller }: { seller: Seller }) {
  return (
    <Link
      to="/seller/$slug"
      params={{ slug: seller.slug }}
      className="group block overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] sm:rounded-[26px]"
    >
      <div className="relative h-20 overflow-hidden bg-surface-2 sm:h-24">
        <OptimizedImage src={seller.banner} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="h-full w-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="relative -mt-7 px-4 pb-4 sm:-mt-8 sm:px-5 sm:pb-5">
        <div className="relative h-14 w-14 overflow-hidden rounded-xl border-4 border-card bg-card shadow-[var(--shadow-soft)] sm:h-16 sm:w-16">
          <OptimizedImage src={seller.logo} alt={seller.name} fill sizes="64px" className="h-full w-full object-cover" />
        </div>
        <div className="mt-2.5 flex items-start justify-between gap-2 sm:mt-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-accent">{seller.name}</h3>
              {seller.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-info sm:h-4 sm:w-4" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">{seller.tagline}</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:mt-3 sm:text-xs">
          <span className="flex items-center gap-1 text-warning"><Star className="h-3.5 w-3.5 fill-current" /><span className="font-semibold text-foreground tabular-nums">{seller.rating}</span></span>
          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {seller.productCount}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {seller.city}</span>
        </div>
      </div>
    </Link>
  );
}
