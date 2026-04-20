import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star, BadgeCheck } from "lucide-react";
import { type Product, formatPKR, getSeller } from "@/data/marketplace";

export function ProductCard({ product }: { product: Product }) {
  const seller = getSeller(product.sellerSlug);
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;
  const stockState = product.stock === 0 ? "out" : product.stock <= 5 ? "low" : "in";

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover-lift relative flex flex-col">
      {product.badge && (
        <span className={`absolute top-3 left-3 z-10 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
          product.badge === "deal" ? "bg-accent text-primary"
          : product.badge === "best-seller" ? "bg-primary text-primary-foreground"
          : product.badge === "new" ? "bg-success text-success-foreground"
          : "bg-info text-white"
        }`}>
          {product.badge.replace("-", " ")}
        </span>
      )}
      {discount > 0 && (
        <span className="absolute top-3 right-3 z-10 text-[11px] font-bold px-2 py-1 rounded-md bg-destructive text-destructive-foreground">
          -{discount}%
        </span>
      )}

      <Link to="/product/$slug" params={{ slug: product.slug }} className="block aspect-square bg-surface-2 overflow-hidden relative">
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <button className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-card/90 backdrop-blur grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-primary">
          <Heart className="h-4 w-4" />
        </button>
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{product.brand}</span>
          <span>·</span>
          <span>{product.sku}</span>
        </div>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-accent transition-colors min-h-[2.5rem]">
            {product.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-0.5 text-warning">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="font-semibold text-foreground tabular-nums">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">({product.reviewCount})</span>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-lg font-black text-foreground tabular-nums">{formatPKR(product.price)}</span>
          {product.comparePrice && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">{formatPKR(product.comparePrice)}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${stockState === "in" ? "bg-success" : stockState === "low" ? "bg-warning" : "bg-destructive"}`} />
          <span className={`font-medium ${stockState === "in" ? "text-success" : stockState === "low" ? "text-warning-foreground" : "text-destructive"}`}>
            {stockState === "in" ? "In stock" : stockState === "low" ? `Only ${product.stock} left` : "Out of stock"}
          </span>
        </div>

        <Link to="/seller/$slug" params={{ slug: seller.slug }} className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 pt-2 border-t border-border hover:text-foreground transition-colors">
          Sold by <span className="font-semibold text-foreground">{seller.name}</span>
          {seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-info" />}
        </Link>

        <button className="mt-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors">
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </button>
      </div>
    </div>
  );
}