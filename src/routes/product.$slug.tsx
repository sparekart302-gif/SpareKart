"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  BadgeCheck,
  Heart,
  Share2,
  ShoppingCart,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  Minus,
  Plus,
  MessageCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { MultipleImageUploadField } from "@/components/uploads/ImageUploadField";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { beginRouteProgress } from "@/components/navigation/RouteProgressBar";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { formatPKR, type Product, type Seller } from "@/data/marketplace";
import { formatRating } from "@/lib/format-rating";
import { canUserReviewProduct } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import { buildSellerWhatsAppLink } from "@/modules/marketplace/whatsapp";

type ProductPageProps = {
  slug?: string;
  product?: Product;
  seller?: Seller;
};

export default function ProductPage({
  slug,
  product: initialProduct,
  seller: initialSeller,
}: ProductPageProps) {
  const router = useRouter();
  const { addToCart, currentUser, hydrated, state, submitProductReview, toggleWishlist } =
    useMarketplace();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs" | "compat" | "ship">("desc");
  const [cartAction, setCartAction] = useState<{
    productId: string;
    mode: "add" | "buy";
  } | null>(null);
  const [reviewDraft, setReviewDraft] = useState({
    title: "",
    body: "",
    rating: 5,
    orderNumber: "",
    contact: "",
    imageUrls: [] as string[],
  });

  const product = useMemo(() => {
    if (slug) {
      return state.managedProducts.find((candidate) => candidate.slug === slug) ?? initialProduct;
    }

    if (initialProduct) {
      return (
        state.managedProducts.find((candidate) => candidate.id === initialProduct.id) ??
        initialProduct
      );
    }

    return undefined;
  }, [initialProduct, slug, state.managedProducts]);

  const seller = useMemo(() => {
    if (!product) {
      return initialSeller;
    }

    return (
      state.sellersDirectory.find((candidate) => candidate.slug === product.sellerSlug) ??
      initialSeller
    );
  }, [initialSeller, product, state.sellersDirectory]);

  const reviews = useMemo(
    () =>
      product
        ? state.managedProductReviews
            .filter(
              (review) => review.productId === product.id && review.moderationStatus === "APPROVED",
            )
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [],
    [product, state.managedProductReviews],
  );
  const sReviews = useMemo(
    () =>
      seller
        ? state.managedStoreReviews
            .filter(
              (review) =>
                review.sellerSlug === seller.slug && review.moderationStatus === "APPROVED",
            )
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [],
    [seller, state.managedStoreReviews],
  );
  const related = useMemo(
    () =>
      product
        ? state.managedProducts
            .filter(
              (candidate) =>
                candidate.category === product.category &&
                candidate.id !== product.id &&
                candidate.moderationStatus === "ACTIVE" &&
                !candidate.deletedAt,
            )
            .slice(0, 5)
        : [],
    [product, state.managedProducts],
  );
  const otherSellers = useMemo(
    () =>
      product
        ? state.managedProducts
            .filter(
              (candidate) =>
                candidate.category === product.category &&
                candidate.id !== product.id &&
                candidate.sellerSlug !== product.sellerSlug &&
                candidate.moderationStatus === "ACTIVE" &&
                !candidate.deletedAt,
            )
            .slice(0, 3)
        : [],
    [product, state.managedProducts],
  );

  useEffect(() => {
    setActiveImg(0);
    setQty(1);
  }, [product?.id]);

  if (!product || !seller) {
    return (
      <PageLayout>
        <section className="container mx-auto px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-2xl rounded-[30px] bg-card p-6 text-center shadow-[var(--shadow-premium)] sm:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {hydrated ? "Product unavailable" : "Loading product"}
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {hydrated ? "This product could not be found." : "Opening product details..."}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {hydrated
                ? "The product may have been removed, unpublished, or is still syncing in this local marketplace session."
                : "Please wait while SpareKart loads the current marketplace catalog."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/shop"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Browse products
              </Link>
              <Link
                href="/sellers"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
              >
                Explore sellers
              </Link>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;
  const availableStock = state.inventory[product.id]?.available ?? product.stock;
  const stockState = availableStock === 0 ? "out" : availableStock <= 5 ? "low" : "in";
  const wishlistProductIds =
    currentUser?.role === "CUSTOMER"
      ? (state.customerAccounts[currentUser.id]?.wishlistProductIds ?? [])
      : [];
  const isSavedInWishlist = wishlistProductIds.includes(product.id);
  const canPurchase = !currentUser || currentUser.role === "CUSTOMER";
  const canSubmitLoggedInReview =
    currentUser?.role === "CUSTOMER" && canUserReviewProduct(state, currentUser.id, product.id);
  const productRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : product.rating;
  const productReviewCount = reviews.length || product.reviewCount;
  const productReviewMetrics =
    reviews.length > 0
      ? {
          fitment: reviews.reduce((sum, review) => sum + review.fitment, 0) / reviews.length,
          quality: reviews.reduce((sum, review) => sum + review.quality, 0) / reviews.length,
          value: reviews.reduce((sum, review) => sum + review.value, 0) / reviews.length,
        }
      : { fitment: 4.7, quality: 4.6, value: 4.5 };

  const handleAddToCart = async (targetProduct: Product, quantity = 1, goToCheckout = false) => {
    if (!canPurchase) {
      toast.error("Seller and admin accounts cannot use the shopping cart.");
      return;
    }

    try {
      setCartAction({
        productId: targetProduct.id,
        mode: goToCheckout ? "buy" : "add",
      });
      await addToCart(targetProduct.id, quantity);
      toast.success(`${targetProduct.title} added to cart.`);

      if (goToCheckout) {
        beginRouteProgress();
        router.push("/checkout");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add item to cart.");
    } finally {
      setCartAction(null);
    }
  };

  const handleSubmitReview = async () => {
    try {
      await submitProductReview({
        productId: product.id,
        title: reviewDraft.title,
        body: reviewDraft.body,
        rating: reviewDraft.rating,
        imageUrls: reviewDraft.imageUrls,
        orderLookup:
          currentUser?.role === "CUSTOMER"
            ? undefined
            : {
                orderNumber: reviewDraft.orderNumber,
                contact: reviewDraft.contact,
              },
      });
      toast.success("Review submitted and sent for admin moderation.");
      setReviewDraft({
        title: "",
        body: "",
        rating: 5,
        orderNumber: "",
        contact: "",
        imageUrls: [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit review.");
    }
  };

  const handleToggleWishlist = async () => {
    if (currentUser?.role !== "CUSTOMER") {
      toast.error("Switch to a customer account to save wishlist items.");
      return;
    }

    try {
      await toggleWishlist(product.id);
      toast.success(isSavedInWishlist ? "Removed from wishlist." : "Saved to wishlist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update wishlist.");
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Shop", to: "/shop" },
            { label: product.brand },
            { label: product.title },
          ]}
        />
      </div>

      <section className="container mx-auto px-4 pb-10 sm:pb-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="grid gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-10">
              {/* Gallery */}
              <div className="min-w-0">
                <div className="group overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-elevated)] sm:rounded-[32px]">
                  <div className="relative aspect-square">
                    <OptimizedImage
                      src={product.images[activeImg]}
                      alt={product.title}
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 40vw"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`relative aspect-square overflow-hidden rounded-xl transition-all ${i === activeImg ? "ring-2 ring-accent shadow-[var(--shadow-glow)]" : "bg-surface shadow-[var(--shadow-soft)] hover:-translate-y-0.5"}`}
                    >
                      <OptimizedImage
                        src={img}
                        alt={`${product.title} preview ${i + 1}`}
                        fill
                        sizes="(max-width: 768px) 25vw, 120px"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
                  <span className="font-bold text-foreground">{product.brand}</span>
                  <span className="hidden sm:inline">·</span>
                  <span>SKU: {product.sku}</span>
                  {product.badge && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {product.badge}
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-[1.8rem] font-black tracking-tight text-balance sm:text-3xl md:text-[2rem] xl:text-[2.6rem]">
                  {product.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mt-4">
                  <div className="flex items-center gap-1">
                    <div className="flex text-warning">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.floor(productRating) ? "fill-current" : ""}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold tabular-nums">
                      {formatRating(productRating)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({productReviewCount} reviews)
                    </span>
                  </div>
                  <Link
                    to="/seller/$slug"
                    params={{ slug: seller.slug }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-accent"
                  >
                    Sold by {seller.name}
                    {seller.verified && <BadgeCheck className="h-4 w-4 text-info" />}
                  </Link>
                  <button className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </button>
                </div>

                <div className="mt-5 lg:hidden">
                  <PurchasePanel
                    product={product}
                    qty={qty}
                    discount={discount}
                    isSavedInWishlist={isSavedInWishlist}
                    availableStock={availableStock}
                    stockState={stockState}
                    onDecrease={() => setQty((current) => Math.max(1, current - 1))}
                    onIncrease={() =>
                      setQty((current) => Math.min(Math.max(availableStock, 1), current + 1))
                    }
                    onBuyNow={() => void handleAddToCart(product, qty, true)}
                    onAddToCart={() => void handleAddToCart(product, qty)}
                    buyingNow={cartAction?.productId === product.id && cartAction.mode === "buy"}
                    addingToCart={cartAction?.productId === product.id && cartAction.mode === "add"}
                    onToggleWishlist={() => void handleToggleWishlist()}
                  />
                </div>

                <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-muted-foreground sm:mt-5 sm:text-[15px] sm:leading-7">
                  {product.shortDescription}
                </p>

                <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-[20px] bg-surface p-3.5 shadow-[var(--shadow-soft)] sm:rounded-[22px] sm:p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Availability
                    </div>
                    <div
                      className={`mt-2 text-sm font-bold ${stockState === "in" ? "text-success" : stockState === "low" ? "text-warning-foreground" : "text-destructive"}`}
                    >
                      {stockState === "in"
                        ? "Ready to dispatch"
                        : stockState === "low"
                          ? `Only ${availableStock} left`
                          : "Out of stock"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Marketplace fitment support included
                    </div>
                  </div>
                  <div className="rounded-[20px] bg-surface p-3.5 shadow-[var(--shadow-soft)] sm:rounded-[22px] sm:p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Seller
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                      <span className="truncate">{seller.name}</span>
                      {seller.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-info" />}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {seller.city} · {seller.responseTime}
                    </div>
                  </div>
                  <div className="rounded-[20px] bg-surface p-3.5 shadow-[var(--shadow-soft)] sm:rounded-[22px] sm:p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Delivery
                    </div>
                    <div className="mt-2 text-sm font-bold text-foreground">
                      Free over Rs. 5,000
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Nationwide dispatch in 2–5 business days
                    </div>
                  </div>
                </div>

                {/* Compatibility quick view */}
                <div className="mt-5 rounded-[22px] bg-success/10 p-3.5 shadow-[var(--shadow-soft)] sm:mt-6 sm:rounded-[26px] sm:p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-success">
                    <BadgeCheck className="h-4 w-4" /> Verified fitment for:
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.compatibility.map((c) => (
                      <span
                        key={`${c.brand}-${c.model}-${c.years[0]}-${c.years[c.years.length - 1]}`}
                        className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]"
                      >
                        {c.brand} {c.model} ({c.years[0]}–{c.years[c.years.length - 1]})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-7 sm:mt-8">
                  <div className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:flex sm:flex-wrap sm:gap-2 sm:pb-4">
                    {[
                      { key: "desc", label: "Description" },
                      { key: "specs", label: "Specifications" },
                      { key: "compat", label: "Compatibility" },
                      { key: "ship", label: "Shipping & Returns" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key as typeof tab)}
                        className={`rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all sm:px-4 sm:py-3 sm:text-sm ${tab === t.key ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "bg-surface text-muted-foreground shadow-[var(--shadow-soft)] hover:text-foreground"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[24px] bg-surface p-4 text-sm leading-relaxed shadow-[var(--shadow-soft)] sm:mt-5 sm:p-5 md:rounded-[28px] md:p-6">
                    {tab === "desc" && (
                      <div className="space-y-3 break-words whitespace-pre-line text-muted-foreground">
                        {product.description}
                      </div>
                    )}
                    {tab === "specs" && (
                      <div className="space-y-3">
                        {product.specs.map((s) => (
                          <div
                            key={s.label}
                            className="grid gap-1 rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-soft)] sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-4"
                          >
                            <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                              {s.label}
                            </div>
                            <div className="font-semibold break-words">{s.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {tab === "compat" && (
                      <div className="space-y-3">
                        {product.compatibility.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-soft)]"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold break-words">
                                {c.brand} {c.model}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Years: {c.years.join(", ")}
                              </div>
                            </div>
                            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                          </div>
                        ))}
                      </div>
                    )}
                    {tab === "ship" && (
                      <div className="space-y-4 text-muted-foreground">
                        <div className="flex gap-3">
                          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                          <div>
                            <div className="font-semibold text-foreground">Nationwide delivery</div>
                            Delivered in 2–5 business days across Pakistan. Free over Rs. 5,000.
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                          <div>
                            <div className="font-semibold text-foreground">7-day easy returns</div>
                            Wrong fitment? Return for full refund within 7 days.
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                          <div>
                            <div className="font-semibold text-foreground">Seller warranty</div>
                            {seller.policies.warranty}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase card */}
          <aside className="hidden space-y-4 lg:sticky lg:top-32 lg:block lg:self-start">
            <PurchasePanel
              product={product}
              qty={qty}
              discount={discount}
              isSavedInWishlist={isSavedInWishlist}
              availableStock={availableStock}
              stockState={stockState}
              onDecrease={() => setQty((current) => Math.max(1, current - 1))}
              onIncrease={() =>
                setQty((current) => Math.min(Math.max(availableStock, 1), current + 1))
              }
              onBuyNow={() => void handleAddToCart(product, qty, true)}
              onAddToCart={() => void handleAddToCart(product, qty)}
              buyingNow={cartAction?.productId === product.id && cartAction.mode === "buy"}
              addingToCart={cartAction?.productId === product.id && cartAction.mode === "add"}
              onToggleWishlist={() => void handleToggleWishlist()}
            />
            <SellerPanel seller={seller} product={product} />
          </aside>
        </div>
      </section>

      {/* Product Reviews block (separate) */}
      <section className="container mx-auto border-t border-border px-4 py-10 sm:py-12">
        <div className="grid gap-6 sm:gap-10 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-accent font-bold">
              Product Reviews
            </div>
            <h2 className="mt-1 text-[1.8rem] font-black sm:text-3xl">Verified buyer feedback</h2>
            <div className="mt-5 rounded-[24px] bg-surface p-4 shadow-[var(--shadow-soft)] sm:mt-6 sm:rounded-[26px] sm:p-5">
              <div className="text-4xl font-black tabular-nums text-foreground sm:text-5xl">
                {formatRating(productRating)}
              </div>
              <div className="flex text-warning mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(productRating) ? "fill-current" : ""}`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Based on {productReviewCount} verified reviews
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Fitment", value: productReviewMetrics.fitment },
                  { label: "Quality", value: productReviewMetrics.quality },
                  { label: "Value", value: productReviewMetrics.value },
                ].map((m) => (
                  <div key={m.label} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-bold tabular-nums">{formatRating(m.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${(m.value / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5">
              <div className="text-sm font-black text-foreground">Write a review</div>
              {currentUser?.role === "CUSTOMER" ? (
                canSubmitLoggedInReview ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setReviewDraft((previous) => ({ ...previous, rating: value }))
                          }
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${
                            reviewDraft.rating === value
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface text-muted-foreground shadow-[var(--shadow-soft)]"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <input
                      value={reviewDraft.title}
                      onChange={(event) =>
                        setReviewDraft((previous) => ({ ...previous, title: event.target.value }))
                      }
                      placeholder="Review title"
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                    <textarea
                      value={reviewDraft.body}
                      onChange={(event) =>
                        setReviewDraft((previous) => ({ ...previous, body: event.target.value }))
                      }
                      placeholder="Tell other buyers about fitment, quality, and packaging."
                      className="min-h-28 w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                    <MultipleImageUploadField
                      label="Review images"
                      values={reviewDraft.imageUrls}
                      kind="review"
                      ownerHint={product.id}
                      onChange={(imageUrls) =>
                        setReviewDraft((previous) => ({ ...previous, imageUrls }))
                      }
                      helperText="Optional evidence of fitment, packaging, or product quality."
                    />
                    <button
                      type="button"
                      onClick={() => void handleSubmitReview()}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                    >
                      Submit review
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                    You need a delivered order for this product before you can leave a review.
                  </div>
                )
              ) : currentUser ? (
                <div className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                  Reviews can only be submitted from customer accounts.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                    Ordered as a guest? Verify your delivered order with the order number and phone
                    or email used at checkout.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setReviewDraft((previous) => ({ ...previous, rating: value }))
                        }
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${
                          reviewDraft.rating === value
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface text-muted-foreground shadow-[var(--shadow-soft)]"
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <input
                    value={reviewDraft.orderNumber}
                    onChange={(event) =>
                      setReviewDraft((previous) => ({
                        ...previous,
                        orderNumber: event.target.value,
                      }))
                    }
                    placeholder="Order number (e.g. SK-00012)"
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                  <input
                    value={reviewDraft.contact}
                    onChange={(event) =>
                      setReviewDraft((previous) => ({ ...previous, contact: event.target.value }))
                    }
                    placeholder="Phone or email used for the order"
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                  <input
                    value={reviewDraft.title}
                    onChange={(event) =>
                      setReviewDraft((previous) => ({ ...previous, title: event.target.value }))
                    }
                    placeholder="Review title"
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                  <textarea
                    value={reviewDraft.body}
                    onChange={(event) =>
                      setReviewDraft((previous) => ({ ...previous, body: event.target.value }))
                    }
                    placeholder="Share your product experience."
                    className="min-h-28 w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                  <MultipleImageUploadField
                    label="Review images"
                    values={reviewDraft.imageUrls}
                    kind="review"
                    ownerHint={product.id}
                    onChange={(imageUrls) =>
                      setReviewDraft((previous) => ({ ...previous, imageUrls }))
                    }
                    helperText="Optional evidence of fitment, packaging, or product quality."
                  />
                  <button
                    type="button"
                    onClick={() => void handleSubmitReview()}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Submit guest review
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent-soft text-accent font-bold grid place-items-center text-sm">
                      {r.author[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                        {r.author}{" "}
                        {r.verified && <BadgeCheck className="h-3.5 w-3.5 text-success" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.date} · Verified buyer</div>
                    </div>
                  </div>
                  <div className="flex text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                </div>
                <h4 className="mt-3 font-bold">{r.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                {r.imageUrls?.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {r.imageUrls.map((imageUrl) => (
                      <div
                        key={imageUrl}
                        className="relative aspect-square overflow-hidden rounded-xl"
                      >
                        <OptimizedImage
                          src={imageUrl}
                          alt={r.title}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    Fitment{" "}
                    <strong className="text-foreground tabular-nums">
                      {formatRating(r.fitment)}/5
                    </strong>
                  </span>
                  <span>
                    Quality{" "}
                    <strong className="text-foreground tabular-nums">
                      {formatRating(r.quality)}/5
                    </strong>
                  </span>
                  <span>
                    Value{" "}
                    <strong className="text-foreground tabular-nums">
                      {formatRating(r.value)}/5
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Store reputation block (separate) */}
      <section className="container mx-auto border-t border-border px-4 py-10 sm:py-12">
        <div className="grid gap-6 sm:gap-10 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-accent font-bold">
              Seller Reputation
            </div>
            <h2 className="mt-1 text-[1.8rem] font-black sm:text-3xl">About this store</h2>
            <p className="text-sm text-muted-foreground mt-3">
              Independent reviews of{" "}
              <span className="font-semibold text-foreground">{seller.name}</span>'s service,
              delivery and communication.
            </p>
            <div className="mt-5 rounded-[24px] bg-surface p-4 shadow-[var(--shadow-soft)] sm:mt-6 sm:rounded-[26px] sm:p-5">
              <div className="text-4xl font-black tabular-nums sm:text-5xl">
                {formatRating(seller.rating)}
              </div>
              <div className="flex text-warning mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(seller.rating) ? "fill-current" : ""}`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {seller.reviewCount} store reviews
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Service", value: 4.8 },
                  { label: "Delivery", value: 4.9 },
                  { label: "Communication", value: 4.7 },
                ].map((m) => (
                  <div key={m.label} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-bold tabular-nums">{formatRating(m.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${(m.value / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            {sReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-[24px] bg-card p-4 shadow-[var(--shadow-soft)] sm:rounded-[26px] sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-info/10 text-info font-bold grid place-items-center text-sm">
                      {r.author[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm">{r.author}</div>
                      <div className="text-xs text-muted-foreground">{r.date}</div>
                    </div>
                  </div>
                  <div className="flex text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                </div>
                <h4 className="mt-3 font-bold">{r.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                {r.imageUrls?.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {r.imageUrls.map((imageUrl) => (
                      <div
                        key={imageUrl}
                        className="relative aspect-square overflow-hidden rounded-xl"
                      >
                        <OptimizedImage
                          src={imageUrl}
                          alt={r.title}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    Service{" "}
                    <strong className="text-foreground tabular-nums">
                      {formatRating(r.service)}/5
                    </strong>
                  </span>
                  <span>
                    Delivery{" "}
                    <strong className="text-foreground tabular-nums">
                      {formatRating(r.delivery)}/5
                    </strong>
                  </span>
                  <span>
                    Communication{" "}
                    <strong className="text-foreground tabular-nums">
                      {formatRating(r.communication)}/5
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other sellers offering this part */}
      <section className="container mx-auto border-t border-border px-4 py-10 sm:py-12">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-accent font-bold">
              Compare offers
            </div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              Other sellers offering similar parts
            </h2>
          </div>
        </div>
        <div className="space-y-2">
          {otherSellers.map((p) => {
            const s = state.sellersDirectory.find((candidate) => candidate.slug === p.sellerSlug);
            const offerStock = state.inventory[p.id]?.available ?? p.stock;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-[22px] bg-surface p-3.5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:gap-4 sm:rounded-[24px] sm:p-4"
              >
                <OptimizedImage
                  src={p.images[0]}
                  alt={p.title}
                  width={64}
                  height={64}
                  className="h-14 w-14 rounded-lg object-cover sm:h-16 sm:w-16"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="font-bold text-sm hover:text-accent line-clamp-1"
                  >
                    {p.title}
                  </Link>
                  <Link
                    to="/seller/$slug"
                    params={{ slug: s?.slug ?? p.sellerSlug }}
                    className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Sold by{" "}
                    <span className="font-semibold text-foreground">{s?.name ?? p.sellerSlug}</span>{" "}
                    {s?.verified && <BadgeCheck className="h-3 w-3 text-info" />}
                    <span className="text-warning ml-2 flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current" />{" "}
                      <span className="text-foreground font-semibold tabular-nums">
                        {formatRating(s?.rating ?? p.rating)}
                      </span>
                    </span>
                  </Link>
                </div>
                <div className="w-full text-left sm:w-auto sm:text-right">
                  <div className="text-lg font-black tabular-nums">{formatPKR(p.price)}</div>
                  <button
                    onClick={() => void handleAddToCart(p)}
                    disabled={offerStock === 0 || cartAction?.productId === p.id}
                    className="mt-1 h-9 rounded-lg px-4 text-xs font-bold text-primary transition-opacity disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground gradient-accent"
                  >
                    {offerStock === 0
                      ? "Out of stock"
                      : cartAction?.productId === p.id
                        ? "Adding..."
                        : "Add to cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Related */}
      <section className="container mx-auto border-t border-border px-4 py-10 sm:py-12">
        <h2 className="mb-5 text-xl font-black sm:mb-6 sm:text-2xl md:text-3xl">
          You may also like
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}

function PurchasePanel({
  product,
  qty,
  discount,
  isSavedInWishlist,
  availableStock,
  stockState,
  onDecrease,
  onIncrease,
  onBuyNow,
  onAddToCart,
  buyingNow,
  addingToCart,
  onToggleWishlist,
}: {
  product: Product;
  qty: number;
  discount: number;
  isSavedInWishlist: boolean;
  availableStock: number;
  stockState: "out" | "low" | "in";
  onDecrease: () => void;
  onIncrease: () => void;
  onBuyNow: () => void;
  onAddToCart: () => void;
  buyingNow: boolean;
  addingToCart: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <div className="rounded-[26px] bg-card p-4 shadow-[var(--shadow-premium)] sm:rounded-[30px] sm:p-5">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-black tabular-nums sm:text-3xl">
          {formatPKR(product.price)}
        </span>
        {product.comparePrice && (
          <span className="text-sm text-muted-foreground line-through tabular-nums">
            {formatPKR(product.comparePrice)}
          </span>
        )}
      </div>
      {discount > 0 && (
        <div className="mt-1 text-xs font-bold text-destructive">
          You save {formatPKR((product.comparePrice ?? 0) - product.price)} ({discount}% off)
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${stockState === "in" ? "bg-success" : stockState === "low" ? "bg-warning" : "bg-destructive"}`}
        />
        <span
          className={`font-bold ${stockState === "in" ? "text-success" : stockState === "low" ? "text-warning-foreground" : "text-destructive"}`}
        >
          {stockState === "in"
            ? "In stock — ships today"
            : stockState === "low"
              ? `Only ${availableStock} left in stock`
              : "Currently out of stock"}
        </span>
      </div>

      <div className="mt-5">
        <label className="text-xs font-semibold text-muted-foreground">Quantity</label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl bg-surface shadow-[var(--shadow-soft)]">
            <button
              onClick={onDecrease}
              disabled={qty <= 1}
              className="grid h-10 w-10 place-items-center hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-bold tabular-nums">{qty}</span>
            <button
              onClick={onIncrease}
              disabled={availableStock === 0 || qty >= availableStock}
              className="grid h-10 w-10 place-items-center hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            Total:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {formatPKR(product.price * qty)}
            </span>
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <button
          onClick={onBuyNow}
          disabled={availableStock === 0 || buyingNow || addingToCart}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12"
        >
          {buyingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{" "}
          {buyingNow ? "Preparing checkout..." : "Buy Now"}
        </button>
        <button
          onClick={onAddToCart}
          disabled={availableStock === 0 || buyingNow || addingToCart}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-12"
        >
          {addingToCart ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4" />
          )}{" "}
          {addingToCart ? "Adding to cart..." : "Add to Cart"}
        </button>
        <button
          onClick={onToggleWishlist}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
            isSavedInWishlist
              ? "bg-accent text-primary shadow-[var(--shadow-glow)]"
              : "bg-surface text-foreground hover:bg-background"
          }`}
        >
          <Heart className={`h-4 w-4 ${isSavedInWishlist ? "fill-current" : ""}`} />
          {isSavedInWishlist ? "Saved to wishlist" : "Save for later"}
        </button>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-border pt-5 text-xs">
        <div className="flex gap-2">
          <Truck className="h-4 w-4 shrink-0 text-accent" />
          <span>
            <span className="font-semibold">Free delivery</span> on orders over Rs. 5,000
          </span>
        </div>
        <div className="flex gap-2">
          <RotateCcw className="h-4 w-4 shrink-0 text-accent" />
          <span>7-day easy returns</span>
        </div>
        <div className="flex gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
          <span>Fitment guarantee from SpareKart</span>
        </div>
      </div>
    </div>
  );
}

function SellerPanel({ seller, product }: { seller: Seller; product: Product }) {
  const whatsappLink = buildSellerWhatsAppLink(seller.socialLinks?.whatsapp, {
    text: `Hi ${seller.name}, I'm interested in ${product.title} on SpareKart.`,
  });

  const handleMessageSeller = () => {
    if (!whatsappLink) {
      toast.error("This seller has not added a WhatsApp contact yet.");
      return;
    }

    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-[26px] bg-surface p-4 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 sm:rounded-[30px] sm:p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        Sold by
      </div>
      <Link to="/seller/$slug" params={{ slug: seller.slug }} className="mt-2 block">
        <div className="flex items-center gap-3">
          <OptimizedImage
            src={seller.logo}
            alt={seller.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate font-bold">{seller.name}</div>
              {seller.verified && <BadgeCheck className="h-4 w-4 text-info" />}
            </div>
            <div className="text-xs text-muted-foreground">{seller.tagline}</div>
          </div>
        </div>
      </Link>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-background p-2 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-center gap-0.5 text-sm font-black tabular-nums">
            <Star className="h-3 w-3 fill-current text-warning" />
            {formatRating(seller.rating)}
          </div>
          <div className="text-[10px] text-muted-foreground">Rating</div>
        </div>
        <div className="rounded-xl bg-background p-2 shadow-[var(--shadow-soft)]">
          <div className="text-sm font-black tabular-nums">{seller.productCount}</div>
          <div className="text-[10px] text-muted-foreground">Products</div>
        </div>
        <div className="rounded-xl bg-background p-2 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-center gap-1 text-sm font-black">
            <Clock className="h-3 w-3" />
            2h
          </div>
          <div className="text-[10px] text-muted-foreground">Response</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to="/seller/$slug"
          params={{ slug: seller.slug }}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-background text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors hover:bg-card"
        >
          View store
        </Link>
        <button
          type="button"
          onClick={handleMessageSeller}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95"
        >
          <MessageCircle className="h-4 w-4" />
          Message Seller
        </button>
      </div>
    </div>
  );
}
