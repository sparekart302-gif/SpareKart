"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  Clock,
  Facebook,
  Globe,
  Instagram,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { MultipleImageUploadField } from "@/components/uploads/ImageUploadField";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { PageLayout, Breadcrumbs } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { type Seller } from "@/data/marketplace";
import { canUserReviewStore } from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import { buildSellerWhatsAppLink } from "@/modules/marketplace/whatsapp";

type SellerPageProps = {
  seller: Seller;
};

type TabKey = "store" | "products" | "reviews" | "policies";

export default function SellerPage({ seller }: SellerPageProps) {
  const { currentUser, state, submitStoreReview } = useMarketplace();
  const [tab, setTab] = useState<TabKey>("store");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [reviewDraft, setReviewDraft] = useState({
    title: "",
    body: "",
    rating: 5,
    orderNumber: "",
    contact: "",
    imageUrls: [] as string[],
  });

  const sellerRecord = state.sellersDirectory.find((item) => item.slug === seller.slug) ?? {
    ...seller,
    socialLinks: undefined,
  };

  const sellerProducts = state.managedProducts.filter(
    (product) =>
      product.sellerSlug === seller.slug &&
      product.moderationStatus === "ACTIVE" &&
      !product.deletedAt,
  );
  const sellerOrders = state.orders.filter((order) =>
    order.items.some((item) => item.sellerSlug === seller.slug),
  );
  const approvedReviews = state.managedStoreReviews
    .filter((review) => review.sellerSlug === seller.slug && review.moderationStatus === "APPROVED")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const pendingReviews = state.managedStoreReviews.filter(
    (review) => review.sellerSlug === seller.slug && review.moderationStatus === "PENDING",
  );

  const displayRating =
    approvedReviews.reduce((sum, review) => sum + review.rating, 0) /
      (approvedReviews.length || 1) || seller.rating;
  const displayReviewCount = approvedReviews.length || seller.reviewCount;
  const storeCategories = Array.from(
    new Map(
      sellerProducts.map((product) => {
        const category = state.managedCategories.find((item) => item.slug === product.category);
        return [product.category, category?.name ?? product.category];
      }),
    ).entries(),
  );
  const filteredProducts = useMemo(() => {
    return sellerProducts.filter((product) => {
      const searchable =
        `${product.title} ${product.brand} ${product.shortDescription}`.toLowerCase();
      return (
        (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
        (categoryFilter === "ALL" || product.category === categoryFilter)
      );
    });
  }, [categoryFilter, query, sellerProducts]);

  const isOwner = currentUser?.role === "SELLER" && currentUser.sellerSlug === sellerRecord.slug;
  const canSubmitReview =
    currentUser?.role === "CUSTOMER" &&
    canUserReviewStore(state, currentUser.id, sellerRecord.slug);
  const whatsappLink = buildSellerWhatsAppLink(sellerRecord.socialLinks?.whatsapp, {
    text: `Hi ${sellerRecord.name}, I want to ask about your products on SpareKart.`,
  });

  const handleMessageSeller = () => {
    if (!whatsappLink) {
      toast.error("This seller has not added a WhatsApp contact yet.");
      return;
    }

    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  };

  return (
    <PageLayout>
      <section className="relative overflow-hidden">
        <div className="relative h-[17rem] sm:h-[19rem] lg:h-[24rem]">
          <OptimizedImage
            src={sellerRecord.banner}
            alt={sellerRecord.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,25,0.18)_0%,rgba(8,15,25,0.72)_72%,rgba(248,250,252,1)_100%)]" />
        </div>

        <div className="container relative mx-auto -mt-20 px-4 sm:-mt-24">
          <div className="rounded-[30px] bg-card/96 p-4 shadow-[var(--shadow-premium)] backdrop-blur sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4 sm:gap-5">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border-4 border-card bg-card shadow-[var(--shadow-soft)] sm:h-24 sm:w-24">
                  <OptimizedImage
                    src={sellerRecord.logo}
                    alt={sellerRecord.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[1.6rem] font-black tracking-tight text-foreground sm:text-[2rem] lg:text-[2.4rem]">
                      {sellerRecord.name}
                    </h1>
                    {sellerRecord.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-info">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    {sellerRecord.tagline}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <div className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-current text-warning" />
                      <span className="font-black tabular-nums text-foreground">
                        {displayRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">({displayReviewCount} reviews)</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {sellerProducts.length} live products
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {sellerRecord.city}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(sellerRecord.joined).getFullYear()}
                    </div>
                    <div className="inline-flex items-center gap-1.5 font-semibold text-success">
                      <Clock className="h-4 w-4" />
                      {sellerRecord.responseTime}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {isOwner ? (
                  <Link
                    href="/seller/orders?tab=overview"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Open dashboard
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Follow store
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleMessageSeller}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message Seller
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[24px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  About this store
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[15px]">
                  {sellerRecord.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="Products Listed" value={String(sellerProducts.length)} />
                <MetricCard label="Orders Handled" value={String(sellerOrders.length)} />
                <MetricCard label="Store Rating" value={displayRating.toFixed(1)} />
                <MetricCard label="Customer Reviews" value={String(displayReviewCount)} />
              </div>
            </div>

            {sellerRecord.socialLinks ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {sellerRecord.socialLinks.website ? (
                  <ExternalChip
                    href={sellerRecord.socialLinks.website}
                    icon={Globe}
                    label="Website"
                  />
                ) : null}
                {sellerRecord.socialLinks.facebook ? (
                  <ExternalChip
                    href={sellerRecord.socialLinks.facebook}
                    icon={Facebook}
                    label="Facebook"
                  />
                ) : null}
                {sellerRecord.socialLinks.instagram ? (
                  <ExternalChip
                    href={sellerRecord.socialLinks.instagram}
                    icon={Instagram}
                    label="Instagram"
                  />
                ) : null}
                {whatsappLink ? (
                  <ExternalChip href={whatsappLink} icon={MessageCircle} label="WhatsApp" />
                ) : null}
              </div>
            ) : null}

            {isOwner && pendingReviews.length > 0 ? (
              <div className="mt-5 rounded-[22px] bg-warning/10 px-4 py-4 text-sm text-warning-foreground">
                {pendingReviews.length} new store review
                {pendingReviews.length > 1 ? "s are" : " is"} awaiting admin moderation.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 sm:py-8">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Sellers", to: "/sellers" },
            { label: sellerRecord.name },
          ]}
        />

        <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {[
            { key: "store", label: "Store" },
            { key: "products", label: `Products (${sellerProducts.length})` },
            { key: "reviews", label: `Reviews (${displayReviewCount})` },
            { key: "policies", label: "Policies" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as TabKey)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === item.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground shadow-[var(--shadow-soft)] hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {tab === "store" ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <section className="space-y-6">
                <StoreSection
                  title="Why customers buy from this store"
                  body={sellerRecord.description}
                />
                <StoreSection
                  title="Operational highlights"
                  body="SpareKart surfaces verified seller trust signals, fast response times, and product discovery that stays focused on fitment and confidence."
                />
              </section>

              <section className="space-y-6">
                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="text-lg font-black text-foreground">Store Performance</div>
                  <div className="mt-4 space-y-3">
                    <PerformanceRow label="Live products" value={String(sellerProducts.length)} />
                    <PerformanceRow label="Orders handled" value={String(sellerOrders.length)} />
                    <PerformanceRow label="Average rating" value={displayRating.toFixed(1)} />
                    <PerformanceRow label="Published reviews" value={String(displayReviewCount)} />
                  </div>
                </div>

                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="text-lg font-black text-foreground">Service Snapshot</div>
                  <div className="mt-4 space-y-3">
                    <ServiceBar label="Service" value={displayRating} />
                    <ServiceBar label="Delivery" value={Math.min(5, displayRating + 0.1)} />
                    <ServiceBar label="Communication" value={Math.max(4, displayRating - 0.1)} />
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {tab === "products" ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-[26px] bg-card p-4 shadow-[var(--shadow-premium)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
                <div className="flex items-center gap-2 rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search within this store"
                    className="h-11 w-full bg-transparent text-sm focus:outline-none"
                  />
                </div>
                <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                  <FilterChip
                    active={categoryFilter === "ALL"}
                    label="All categories"
                    onClick={() => setCategoryFilter("ALL")}
                  />
                  {storeCategories.map(([slug, name]) => (
                    <FilterChip
                      key={slug}
                      active={categoryFilter === slug}
                      label={name}
                      onClick={() => setCategoryFilter(slug)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-[26px] bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-premium)]">
                  No products matched this store filter.
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "reviews" ? (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="space-y-6">
                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="text-5xl font-black tracking-tight text-foreground">
                    {displayRating.toFixed(1)}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-warning">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < Math.round(displayRating) ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Based on {displayReviewCount} published customer reviews.
                  </div>
                  <div className="mt-5 space-y-3">
                    <ServiceBar label="Service" value={displayRating} />
                    <ServiceBar label="Delivery" value={Math.min(5, displayRating + 0.1)} />
                    <ServiceBar label="Communication" value={Math.max(4, displayRating - 0.1)} />
                  </div>
                </div>

                <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
                  <div className="text-lg font-black text-foreground">Leave a store review</div>
                  {currentUser?.role === "CUSTOMER" ? (
                    canSubmitReview ? (
                      <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setReviewDraft((previous) => ({ ...previous, rating: value }))
                              }
                              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
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
                            setReviewDraft((previous) => ({
                              ...previous,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Review title"
                          className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                        />
                        <textarea
                          value={reviewDraft.body}
                          onChange={(event) =>
                            setReviewDraft((previous) => ({
                              ...previous,
                              body: event.target.value,
                            }))
                          }
                          placeholder="Share your experience with this store"
                          className="min-h-32 w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                        />
                        <MultipleImageUploadField
                          label="Review images"
                          values={reviewDraft.imageUrls}
                          kind="review"
                          ownerHint={sellerRecord.slug}
                          onChange={(imageUrls) =>
                            setReviewDraft((previous) => ({ ...previous, imageUrls }))
                          }
                          helperText="Optional photos of packaging, delivery condition, or storefront experience."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              submitStoreReview({
                                sellerSlug: sellerRecord.slug,
                                title: reviewDraft.title,
                                body: reviewDraft.body,
                                rating: reviewDraft.rating,
                                imageUrls: reviewDraft.imageUrls,
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
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Unable to submit store review.",
                              );
                            }
                          }}
                          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                        >
                          Submit review
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-muted-foreground">
                        You can leave a store review after at least one delivered order from this
                        seller.
                      </div>
                    )
                  ) : currentUser ? (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Store reviews can be submitted from customer accounts only.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
                        Ordered as a guest? Verify your delivered order with the order number and
                        phone or email used at checkout.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setReviewDraft((previous) => ({ ...previous, rating: value }))
                            }
                            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
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
                          setReviewDraft((previous) => ({
                            ...previous,
                            contact: event.target.value,
                          }))
                        }
                        placeholder="Phone or email used for the order"
                        className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                      />
                      <input
                        value={reviewDraft.title}
                        onChange={(event) =>
                          setReviewDraft((previous) => ({
                            ...previous,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Review title"
                        className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                      />
                      <textarea
                        value={reviewDraft.body}
                        onChange={(event) =>
                          setReviewDraft((previous) => ({
                            ...previous,
                            body: event.target.value,
                          }))
                        }
                        placeholder="Share your experience with this store"
                        className="min-h-32 w-full rounded-[20px] bg-surface px-3 py-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                      />
                      <MultipleImageUploadField
                        label="Review images"
                        values={reviewDraft.imageUrls}
                        kind="review"
                        ownerHint={sellerRecord.slug}
                        onChange={(imageUrls) =>
                          setReviewDraft((previous) => ({ ...previous, imageUrls }))
                        }
                        helperText="Optional photos of packaging, delivery condition, or storefront experience."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            submitStoreReview({
                              sellerSlug: sellerRecord.slug,
                              title: reviewDraft.title,
                              body: reviewDraft.body,
                              rating: reviewDraft.rating,
                              imageUrls: reviewDraft.imageUrls,
                              orderLookup: {
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
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Unable to submit store review.",
                            );
                          }
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                      >
                        Submit guest review
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                {approvedReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">{review.author}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{review.date}</div>
                      </div>
                      <div className="flex items-center gap-1 text-warning">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-3.5 w-3.5 ${index < review.rating ? "fill-current" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    <h3 className="mt-3 text-sm font-black text-foreground">{review.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
                    {review.imageUrls?.length ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {review.imageUrls.map((imageUrl) => (
                          <div
                            key={imageUrl}
                            className="relative aspect-square overflow-hidden rounded-xl"
                          >
                            <OptimizedImage
                              src={imageUrl}
                              alt={review.title}
                              fill
                              sizes="120px"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {approvedReviews.length === 0 ? (
                  <div className="rounded-[26px] bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-premium)]">
                    Published store reviews will appear here after admin moderation.
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {tab === "policies" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <PolicyCard icon={ShieldCheck} title="Returns" body={sellerRecord.policies.returns} />
              <PolicyCard icon={Truck} title="Shipping" body={sellerRecord.policies.shipping} />
              <PolicyCard
                icon={ShieldCheck}
                title="Warranty"
                body={sellerRecord.policies.warranty}
              />
            </div>
          ) : null}
        </div>
      </section>
    </PageLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-card px-4 py-4 text-center shadow-[var(--shadow-soft)]">
      <div className="text-xl font-black tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StoreSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
      <div className="text-lg font-black text-foreground">{title}</div>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
    </div>
  );
}

function PerformanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-black text-foreground">{value}</span>
    </div>
  );
}

function ServiceBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(100, (value / 5) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface text-muted-foreground shadow-[var(--shadow-soft)]"
      }`}
    >
      {label}
    </button>
  );
}

function PolicyCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[26px] bg-card p-5 shadow-[var(--shadow-premium)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="mt-4 text-lg font-black text-foreground">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function ExternalChip({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
    >
      <Icon className="h-3.5 w-3.5 text-accent" />
      {label}
    </a>
  );
}
