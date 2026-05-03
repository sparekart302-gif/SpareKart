"use client";

import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, ChevronRight, Store, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { PageLayout } from "@/components/marketplace/PageLayout";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { SellerCard } from "@/components/marketplace/SellerCard";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { vehicles } from "@/data/marketplace";
import {
  getActiveMarketplaceCategories,
  getActiveMarketplaceProducts,
  getActiveMarketplaceSellers,
  getMarketplaceBrands,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";

function getCategoryThumbnail(
  categorySlug: string,
  products: ReturnType<typeof getActiveMarketplaceProducts>,
  sellers: ReturnType<typeof getActiveMarketplaceSellers>,
) {
  return (
    products.find((product) => product.category === categorySlug)?.images[0] ??
    sellers[0]?.logo ??
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&h=1200&q=80"
  );
}

export default function HomePage() {
  const { state } = useMarketplace();
  const products = getActiveMarketplaceProducts(state);
  const categories = getActiveMarketplaceCategories(state);
  const sellers = getActiveMarketplaceSellers(state);
  const brands = getMarketplaceBrands(state);
  const fallbackVisual =
    products[0]?.images[0] ??
    sellers[0]?.banner ??
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&h=900&q=80";
  const heroSlides = useMemo(
    () => [
      {
        eyebrow: "Brake essentials",
        title: "Premium braking parts from trusted marketplace sellers",
        description: "Pads, discs, calipers, and sensors ready for fast nationwide dispatch.",
        primaryCta: "Shop brakes",
        primaryHref: "/category/brakes",
        secondaryCta: "Browse sellers",
        secondaryHref: "/sellers",
        image: products.find((product) => product.category === "brakes")?.images[0] ?? fallbackVisual,
      },
      {
        eyebrow: "Engine care",
        title: "Filters, oils, and tune-up parts that fit with confidence",
        description:
          "Cleaner discovery for routine servicing, urgent replacements, and workshop demand.",
        primaryCta: "Explore engine parts",
        primaryHref: "/category/engine",
        secondaryCta: "Find exact fit",
        secondaryHref: "/compatibility",
        image: products.find((product) => product.category === "engine")?.images[0] ?? fallbackVisual,
      },
      {
        eyebrow: "Lighting upgrades",
        title: "Headlights and electrical parts with a more professional buying flow",
        description:
          "Compare verified stock, secure COD options, and clear product details in one place.",
        primaryCta: "Shop lighting",
        primaryHref: "/category/lighting",
        secondaryCta: "Shop all parts",
        secondaryHref: "/shop",
        image:
          products.find((product) => product.category === "lighting")?.images[0] ?? fallbackVisual,
      },
    ],
    [fallbackVisual, products],
  );
  const heroPromoCards = useMemo(
    () => [
      {
        label: "Trusted sellers",
        title: "Browse verified stores",
        href: "/sellers",
        image: sellers[0]?.banner ?? fallbackVisual,
      },
      {
        label: "Workshop picks",
        title: "Fast-moving service essentials",
        href: "/category/engine",
        image:
          products.find((product) => product.category === "engine")?.images[0] ?? fallbackVisual,
      },
    ],
    [fallbackVisual, products, sellers],
  );
  const desktopLeadCategory = categories.find((category) => category.slug === "engine") ?? categories[0];
  const desktopSecondaryCategories = categories.filter(
    (category) => category.slug !== desktopLeadCategory?.slug,
  );
  const [vBrand, setVBrand] = useState(vehicles[0].brand);
  const [vModel, setVModel] = useState(vehicles[0].models[0].name);
  const [vYear, setVYear] = useState<number>(vehicles[0].models[0].years[0]);
  const selectedBrand = vehicles.find((v) => v.brand === vBrand)!;
  const selectedModel =
    selectedBrand.models.find((m) => m.name === vModel) ?? selectedBrand.models[0];

  return (
    <PageLayout>
      <section className="relative overflow-hidden gradient-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 24%, oklch(0.72 0.19 50 / 0.34), transparent 34%), radial-gradient(circle at 84% 16%, oklch(0.54 0.18 292 / 0.24), transparent 30%)",
          }}
        />
        <div className="container relative mx-auto px-4 py-4 sm:py-5 lg:py-7">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(260px,1fr)] xl:gap-5">
            <HeroSlider slides={heroSlides} />
            <HeroPromoRail cards={heroPromoCards} />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-5 rounded-[28px] bg-surface p-4 shadow-[var(--shadow-premium)] sm:gap-6 sm:p-5 md:p-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
              <Wrench className="h-3.5 w-3.5" /> Vehicle Finder
            </div>
            <h2 className="mt-3 text-[1.7rem] font-black tracking-tight text-balance sm:mt-4 sm:text-3xl md:text-4xl">
              Find the exact fit for your car
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:mt-3">
              Keep vehicle selection separate from the hero and jump straight to parts matched to
              your make, model, and year.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Brand</label>
              <select
                value={vBrand}
                onChange={(e) => {
                  setVBrand(e.target.value);
                  const brand = vehicles.find((v) => v.brand === e.target.value)!;
                  setVModel(brand.models[0].name);
                  setVYear(brand.models[0].years[0]);
                }}
                className="mt-1 h-11 w-full rounded-xl bg-card px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.brand}>{vehicle.brand}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Model</label>
              <select
                value={vModel}
                onChange={(e) => {
                  setVModel(e.target.value);
                  const model = selectedBrand.models.find((item) => item.name === e.target.value)!;
                  setVYear(model.years[0]);
                }}
                className="mt-1 h-11 w-full rounded-xl bg-card px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {selectedBrand.models.map((model) => (
                  <option key={model.name}>{model.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Year</label>
              <select
                value={vYear}
                onChange={(e) => setVYear(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-xl bg-card px-3 text-sm font-medium shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {selectedModel.years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <Link
                to="/compatibility"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-accent text-sm font-bold text-primary hover:opacity-95 transition-opacity"
              >
                Find Parts <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent">
              Shop by category
            </div>
            <h2 className="mt-1 text-[1.7rem] font-black tracking-tight sm:text-3xl md:text-4xl">
              Browse faster, not longer
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Quick access to the most in-demand part groups without taking too much vertical space.
            </p>
          </div>
          <Link
            to="/shop"
            className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <MobileCategorySlider
          categories={categories}
          products={products}
          sellers={sellers}
        />

        <div className="hidden lg:grid lg:auto-rows-[132px] lg:grid-cols-4 lg:gap-4 xl:auto-rows-[144px]">
          {desktopLeadCategory ? (
            <CategoryFeatureCard
              category={desktopLeadCategory}
              products={products}
              sellers={sellers}
              featured
            />
          ) : null}
          {desktopSecondaryCategories.map((category) => (
            <CategoryFeatureCard
              key={category.slug}
              category={category}
              products={products}
              sellers={sellers}
            />
          ))}
        </div>
      </section>

      <ProductGridSection
        eyebrow={
          <>
            <TrendingUp className="h-3.5 w-3.5" /> Trending right now
          </>
        }
        title="Best-selling parts this week"
        description="Smaller marketplace-style product tiles, with two products per row on mobile for faster scanning."
        linkLabel="Shop all"
        items={products.slice(0, 10)}
      />

      <section className="container mx-auto px-4 py-10 sm:py-12 md:py-16">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <div className="relative overflow-hidden rounded-[26px] gradient-hero p-6 text-primary-foreground sm:rounded-3xl sm:p-8 md:p-10">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 80% 50%, oklch(0.72 0.19 50 / 0.5), transparent 50%)",
              }}
            />
            <div className="relative">
              <div className="text-xs font-bold uppercase tracking-widest text-accent">
                Service Specials
              </div>
              <h3 className="mt-2 max-w-xs text-2xl font-black sm:text-3xl">
                Up to 30% off engine oils & filters
              </h3>
              <p className="mt-3 max-w-sm text-sm opacity-80">
                Genuine Mobil 1, Shell, Bosch and Denso. While stocks last.
              </p>
              <Link
                to="/category/$slug"
                params={{ slug: "engine" }}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-primary hover:opacity-90 transition-opacity"
              >
                Shop deals <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[26px] bg-accent-soft/85 p-6 shadow-[var(--shadow-soft)] sm:rounded-3xl sm:p-8 md:p-10">
            <div className="text-xs font-bold uppercase tracking-widest text-accent">
              For Sellers
            </div>
            <h3 className="mt-2 max-w-xs text-2xl font-black text-primary sm:text-3xl">
              Open your store on SpareKart
            </h3>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Reach thousands of buyers across Pakistan. Zero monthly fee — pay only when you sell.
            </p>
            <Link
              to="/seller-onboarding"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Store className="h-4 w-4" /> Become a seller
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent">
              Top verified sellers
            </div>
            <h2 className="mt-1 text-[1.7rem] font-black tracking-tight sm:text-3xl md:text-4xl">
              Trusted by thousands
            </h2>
          </div>
          <Link
            to="/sellers"
            className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            All sellers <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {sellers.slice(0, 4).map((seller) => (
            <SellerCard key={seller.slug} seller={seller} />
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 sm:py-12 md:py-16">
        <div className="mb-5 text-center sm:mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-accent">
            Authentic brands
          </div>
          <h2 className="mt-1 text-[1.7rem] font-black tracking-tight sm:text-3xl md:text-4xl">
            Shop the brands you trust
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {brands.map((brand) => (
            <div
              key={brand.slug}
              className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-card px-4 text-sm font-bold text-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-accent sm:h-14 sm:px-6 sm:text-base"
            >
              {brand.name}
            </div>
          ))}
        </div>
      </section>

      <ProductGridSection
        eyebrow="Just landed"
        title="New arrivals"
        description="Fresh inventory from trusted stores in a denser, two-per-row mobile layout that feels cleaner and more professional."
        linkLabel="Browse all"
        items={products.slice(10, 20)}
      />
    </PageLayout>
  );
}

function HeroSlider({
  slides,
}: {
  slides: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    primaryHref: string;
    secondaryCta: string;
    secondaryHref: string;
    image: string;
  }[];
}) {
  const [heroApi, setHeroApi] = useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!heroApi) {
      return;
    }

    const syncActiveSlide = () => {
      setActiveSlide(heroApi.selectedScrollSnap());
    };

    syncActiveSlide();
    heroApi.on("select", syncActiveSlide);
    heroApi.on("reInit", syncActiveSlide);

    const autoplayId = window.setInterval(() => {
      heroApi.scrollNext();
    }, 5000);

    return () => {
      heroApi.off("select", syncActiveSlide);
      heroApi.off("reInit", syncActiveSlide);
      window.clearInterval(autoplayId);
    };
  }, [heroApi]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-w-0"
    >
      <Carousel setApi={setHeroApi} opts={{ align: "start", loop: true }} className="relative">
        <CarouselContent className="-ml-0">
          {slides.map((slide, index) => (
            <CarouselItem key={slide.title} className="pl-0">
              <div className="group relative min-h-[320px] overflow-hidden rounded-[30px] shadow-[var(--shadow-premium)] sm:min-h-[390px] sm:rounded-[34px] lg:min-h-[430px] xl:min-h-[470px]">
                <OptimizedImage
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 1024px) 100vw, 80vw"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary/88 via-primary/42 to-primary/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/82 via-primary/16 to-transparent" />

                <div className="relative flex min-h-[320px] h-full items-end p-5 sm:min-h-[390px] sm:p-7 lg:min-h-[430px] lg:p-8 xl:min-h-[470px] xl:p-10">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-accent backdrop-blur sm:text-[11px]">
                      {slide.eyebrow}
                    </div>
                    <h1 className="mt-4 max-w-2xl text-[1.9rem] font-black leading-[1.02] tracking-tight text-balance text-white sm:text-[2.5rem] lg:text-[3.2rem] xl:text-[3.55rem]">
                      {slide.title}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/82 sm:text-base sm:leading-7">
                      {slide.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={slide.primaryHref}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-primary transition-opacity hover:opacity-90"
                      >
                        {slide.primaryCta} <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={slide.secondaryHref}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-primary-foreground backdrop-blur transition-colors hover:bg-white/15"
                      >
                        {slide.secondaryCta}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="left-4 top-auto bottom-4 translate-y-0 border-white/20 bg-white/88 text-primary hover:bg-white disabled:opacity-50 xl:left-6 xl:bottom-6" />
        <CarouselNext className="right-4 top-auto bottom-4 translate-y-0 border-white/20 bg-white/88 text-primary hover:bg-white disabled:opacity-50 xl:right-6 xl:bottom-6" />
      </Carousel>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => heroApi?.scrollTo(index)}
              className={`h-2.5 rounded-full transition-all ${
                activeSlide === index ? "w-8 bg-accent" : "w-2.5 bg-white/35 hover:bg-white/55"
              }`}
            />
          ))}
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/72">
          {String(activeSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </div>
      </div>
    </motion.div>
  );
}

function HeroPromoRail({
  cards,
}: {
  cards: {
    label: string;
    title: string;
    href: string;
    image: string;
  }[];
}) {
  return (
    <div className="hidden lg:grid lg:grid-rows-2 lg:gap-4">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className="group relative min-h-[208px] overflow-hidden rounded-[28px] shadow-[var(--shadow-premium)]"
        >
          <OptimizedImage
            src={card.image}
            alt={card.title}
            fill
            sizes="20vw"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/86 via-primary/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-transparent to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              {card.label}
            </div>
            <div className="mt-2 text-lg font-black leading-tight text-white">{card.title}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-foreground">
              Explore <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CategoryFeatureCard({
  category,
  featured = false,
  products,
  sellers,
}: {
  category: ReturnType<typeof getActiveMarketplaceCategories>[number];
  products: ReturnType<typeof getActiveMarketplaceProducts>;
  sellers: ReturnType<typeof getActiveMarketplaceSellers>;
  featured?: boolean;
}) {
  return (
    <Link
      to="/category/$slug"
      params={{ slug: category.slug }}
      className={`group relative overflow-hidden rounded-[24px] shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] ${
        featured ? "min-h-[280px] lg:col-span-2 lg:row-span-2" : "min-h-[132px] xl:min-h-[144px]"
      }`}
    >
      <OptimizedImage
        src={getCategoryThumbnail(category.slug, products, sellers)}
        alt={category.name}
        fill
        sizes={featured ? "(max-width: 1024px) 100vw, 40vw" : "(max-width: 1024px) 50vw, 20vw"}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/84 via-primary/28 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/36 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div
          className={`font-black tracking-tight text-white ${
            featured ? "text-[1.6rem] sm:text-[1.9rem]" : "text-base xl:text-lg"
          }`}
        >
          {category.name}
        </div>
      </div>
    </Link>
  );
}

function MobileCategorySlider({
  categories,
  products,
  sellers,
}: {
  categories: ReturnType<typeof getActiveMarketplaceCategories>;
  products: ReturnType<typeof getActiveMarketplaceProducts>;
  sellers: ReturnType<typeof getActiveMarketplaceSellers>;
}) {
  return (
    <div className="lg:hidden">
      <div className="overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2.5 pr-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.04 }}
              className="w-[122px] flex-none snap-start sm:w-[138px]"
            >
              <Link
                to="/category/$slug"
                params={{ slug: category.slug }}
                className="group block overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="relative aspect-square overflow-hidden">
                  <OptimizedImage
                    src={getCategoryThumbnail(category.slug, products, sellers)}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 122px, 138px"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/22 via-transparent to-transparent" />
                </div>
                <div className="px-2.5 py-2">
                  <div className="truncate text-xs font-bold leading-4 text-foreground sm:text-sm">
                    {category.name}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductGridSection({
  eyebrow,
  title,
  description,
  linkLabel,
  items,
}: {
  eyebrow: ReactNode;
  title: string;
  description: string;
  linkLabel: string;
  items: ReturnType<typeof getActiveMarketplaceProducts>;
}) {
  return (
    <section className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-[1.7rem] font-black tracking-tight sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Link
          to="/shop"
          className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
        >
          {linkLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} compact />
        ))}
      </div>
    </section>
  );
}
