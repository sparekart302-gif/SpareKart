"use client";

import { useState } from "react";
import { ShoppingCart, Star, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/components/navigation/Link";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { type Product, formatPKR } from "@/data/marketplace";
import { formatRating } from "@/lib/format-rating";
import { useMarketplace } from "@/modules/marketplace/store";

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addToCart, currentUser, state } = useMarketplace();
  const [adding, setAdding] = useState(false);
  const seller = state.sellersDirectory.find((item) => item.slug === product.sellerSlug);
  const availableStock = state.inventory[product.id]?.available ?? product.stock;
  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;
  const stockState = availableStock === 0 ? "out" : availableStock <= 5 ? "low" : "in";
  const canAddToCart = !currentUser || currentUser.role === "CUSTOMER";

  const handleAddToCart = async () => {
    if (!canAddToCart) {
      toast.error("Seller and admin accounts cannot use the shopping cart.");
      return;
    }

    try {
      setAdding(true);
      await addToCart(product.id, 1);
      toast.success(`${product.title} added to cart.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add item to cart.");
    } finally {
      setAdding(false);
    }
  };

  if (compact) {
    return (
      <div className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] sm:rounded-2xl">
        {product.badge && (
          <span
            className={`absolute left-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider sm:left-2.5 sm:top-2.5 sm:px-2 sm:py-1 sm:text-[9px] ${
              product.badge === "deal"
                ? "bg-accent text-primary"
                : product.badge === "best-seller"
                  ? "bg-primary text-primary-foreground"
                  : product.badge === "new"
                    ? "bg-success text-success-foreground"
                    : "bg-info text-white"
            }`}
          >
            {product.badge.replace("-", " ")}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute right-2 top-2 z-10 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground sm:right-2.5 sm:top-2.5 sm:px-2 sm:py-1 sm:text-[10px]">
            -{discount}%
          </span>
        )}

        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="relative block aspect-square overflow-hidden bg-surface"
        >
          <OptimizedImage
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="flex flex-1 flex-col p-2.5 sm:p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span className="font-bold text-foreground">{product.brand}</span>
            <span>•</span>
            <span className="truncate">{product.sku}</span>
          </div>

          <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
            <h3 className="mt-1 min-h-[2.25rem] text-[12px] font-semibold leading-[1.125rem] line-clamp-2 transition-colors group-hover:text-accent sm:mt-1.5 sm:min-h-[2.5rem] sm:text-[13px] sm:leading-5">
              {product.title}
            </h3>
          </Link>

          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            <div className="flex items-center gap-0.5 text-warning">
              <Star className="h-3 w-3 fill-current" />
              <span className="font-semibold text-foreground tabular-nums">
                {formatRating(product.rating)}
              </span>
            </div>
            <span className="text-muted-foreground">({product.reviewCount})</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[15px] font-black text-foreground tabular-nums sm:text-base">
              {formatPKR(product.price)}
            </span>
            {product.comparePrice && (
              <span className="text-[11px] text-muted-foreground line-through tabular-nums">
                {formatPKR(product.comparePrice)}
              </span>
            )}
          </div>

          <div className="mt-2 text-[11px]">
            <span
              className={`font-medium ${stockState === "in" ? "text-success" : stockState === "low" ? "text-warning-foreground" : "text-destructive"}`}
            >
              {stockState === "in"
                ? "In stock"
                : stockState === "low"
                  ? `Only ${availableStock} left`
                  : "Out of stock"}
            </span>
          </div>

          <div className="mt-auto pt-2.5 sm:pt-3">
            <div className="mb-2 text-[11px] text-muted-foreground truncate">
              by{" "}
              <Link
                to="/seller/$slug"
                params={{ slug: seller?.slug ?? product.sellerSlug }}
                className="font-semibold text-foreground hover:text-accent"
              >
                {seller?.name ?? product.sellerSlug}
              </Link>
              {seller?.verified && <BadgeCheck className="ml-1 inline h-3.5 w-3.5 text-info" />}
            </div>
            <button
              onClick={() => void handleAddToCart()}
              disabled={availableStock === 0 || adding}
              title={
                !canAddToCart ? "Shopping cart is only for customers or guest checkout" : undefined
              }
              className="inline-flex h-[1.875rem] w-full items-center justify-center gap-1 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-8 sm:gap-1.5 sm:text-xs"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> {adding ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] sm:rounded-[28px]">
      {product.badge && (
        <span
          className={`absolute left-2.5 top-2.5 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px] ${
            product.badge === "deal"
              ? "bg-accent text-primary"
              : product.badge === "best-seller"
                ? "bg-primary text-primary-foreground"
                : product.badge === "new"
                  ? "bg-success text-success-foreground"
                  : "bg-info text-white"
          }`}
        >
          {product.badge.replace("-", " ")}
        </span>
      )}
      {discount > 0 && (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
          -{discount}%
        </span>
      )}

      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-surface"
      >
        <OptimizedImage
          src={product.images[0]}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-primary/25 to-transparent sm:h-24" />
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground">{product.brand}</span>
          <span>·</span>
          <span>{product.sku}</span>
        </div>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
          <h3 className="mt-1.5 min-h-[2.35rem] text-[13px] font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-accent sm:mt-2 sm:min-h-[2.5rem] sm:text-sm">
            {product.title}
          </h3>
        </Link>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 text-warning">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-semibold text-foreground tabular-nums">
                {formatRating(product.rating)}
              </span>
            </div>
            <span className="text-muted-foreground">({product.reviewCount})</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium ${
              stockState === "in"
                ? "bg-success/10 text-success"
                : stockState === "low"
                  ? "bg-warning/15 text-warning-foreground"
                  : "bg-destructive/10 text-destructive"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${stockState === "in" ? "bg-success" : stockState === "low" ? "bg-warning" : "bg-destructive"}`}
            />
            {stockState === "in"
              ? "In stock"
              : stockState === "low"
                ? `${availableStock} left`
                : "Out"}
          </span>
        </div>

        <Link
          to="/seller/$slug"
          params={{ slug: seller?.slug ?? product.sellerSlug }}
          className="mt-2.5 flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 transition-colors hover:bg-accent-soft sm:mt-3 sm:rounded-2xl sm:py-2.5"
        >
          <OptimizedImage
            src={seller?.logo ?? product.images[0]}
            alt={seller?.name ?? product.sellerSlug}
            width={32}
            height={32}
            className="h-8 w-8 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>Sold by</span>
              <span className="truncate font-semibold text-foreground">
                {seller?.name ?? product.sellerSlug}
              </span>
              {seller?.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-info" />}
            </div>
            <div className="text-[11px] text-muted-foreground">{seller?.city ?? "Seller"}</div>
          </div>
        </Link>

        <div className="mt-auto pt-3 sm:pt-4">
          <div className="flex items-end justify-between gap-2.5 border-t border-border pt-3 sm:gap-3 sm:pt-4">
            <div>
              <div className="text-base font-black text-foreground tabular-nums sm:text-lg">
                {formatPKR(product.price)}
              </div>
              {product.comparePrice && (
                <div className="text-xs text-muted-foreground line-through tabular-nums">
                  {formatPKR(product.comparePrice)}
                </div>
              )}
            </div>
            <button
              onClick={() => void handleAddToCart()}
              disabled={availableStock === 0 || adding}
              title={
                !canAddToCart ? "Shopping cart is only for customers or guest checkout" : undefined
              }
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
