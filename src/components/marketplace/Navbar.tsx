"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  MapPin,
  Heart,
  ChevronDown,
  Store,
  Wrench,
  ShieldCheck,
  Package,
} from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { beginRouteProgress } from "@/components/navigation/RouteProgressBar";
import { BrandLogo } from "@/components/marketplace/BrandLogo";
import {
  getActiveMarketplaceCategories,
  getCartActorId,
  getCartQuantity,
  getRoleHomePath,
} from "@/modules/marketplace/selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const router = useRouter();
  const { state, currentUser } = useMarketplace();
  const categories = getActiveMarketplaceCategories(state);
  const cartActorId = getCartActorId(currentUser);
  const cartQuantity = cartActorId ? getCartQuantity(state, cartActorId) : 0;
  const accountHref = getRoleHomePath(currentUser);
  const accountLabel = !currentUser
    ? "Sign In"
    : currentUser.role === "CUSTOMER"
      ? "My Account"
      : currentUser.role === "SELLER"
        ? "Seller Portal"
        : "Admin Portal";
  const utilityLabel = !currentUser
    ? "Sign In"
    : currentUser.role === "CUSTOMER"
      ? "My Account"
      : "Open Dashboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (searchCategory !== "all") {
      params.set("category", searchCategory);
    }

    beginRouteProgress();
    router.push(params.size > 0 ? `/search?${params.toString()}` : "/search");
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-background/85 shadow-[var(--shadow-soft)]" : "bg-background"} border-b border-border`}
    >
      {/* Top utility bar */}
      <div className="hidden md:block bg-primary text-primary-foreground text-xs">
        <div className="container mx-auto px-4 h-9 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Deliver to{" "}
            <span className="font-semibold">All Pakistan</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/seller-onboarding" className="hover:text-accent transition-colors">
              Sell on SpareKart
            </Link>
            <Link to="/help" className="hover:text-accent transition-colors">
              Help
            </Link>
            <Link href={accountHref} className="hover:text-accent transition-colors">
              {utilityLabel}
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container relative mx-auto flex h-14 items-center gap-2.5 px-3 sm:px-4 md:h-16 lg:h-20 md:px-6 lg:px-8">
        <div className="md:hidden flex items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-soft)] transition-colors hover:bg-background"
                aria-label="Open menu"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm bg-background p-0">
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b border-border px-5 py-5">
                  <SheetTitle className="flex items-center justify-center text-center">
                    <BrandLogo
                      variant="full"
                      priority
                      className="text-[1.75rem] tracking-[0.18em] text-primary sm:text-[1.95rem]"
                    />
                  </SheetTitle>
                  <SheetDescription>
                    Browse categories, manage your account, and jump into the marketplace from one
                    place.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { href: accountHref, label: "Account", Icon: User },
                      { to: "/search", label: "Search", Icon: Search },
                      { to: "/cart", label: "Cart", Icon: ShoppingCart },
                      { to: "/seller-onboarding", label: "Sell", Icon: Store },
                    ].map(({ to, href, label, Icon }) => (
                      <SheetClose asChild key={to ?? href}>
                        <Link
                          to={to}
                          href={href}
                          className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft"
                        >
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-background shadow-[var(--shadow-soft)]">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="mt-3 text-sm font-semibold">{label}</div>
                        </Link>
                      </SheetClose>
                    ))}
                  </div>

                  <div className="rounded-2xl gradient-hero px-4 py-4 text-primary-foreground">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">Marketplace Promise</div>
                        <p className="mt-1 text-xs opacity-80">
                          Verified sellers, fitment support, and COD nationwide.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                      <Wrench className="h-3.5 w-3.5 text-accent" /> Popular Categories
                    </div>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <SheetClose asChild key={category.slug}>
                          <Link
                            to="/category/$slug"
                            params={{ slug: category.slug }}
                            className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-[var(--shadow-soft)] transition-colors hover:bg-accent-soft"
                          >
                            <div>
                              <div className="text-sm font-semibold">{category.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {category.description}
                              </div>
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground">
                              {category.productCount}
                            </div>
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Package className="h-4 w-4 text-accent" /> Quick Links
                    </div>
                    <div className="grid gap-2 text-sm">
                      <SheetClose asChild>
                        <Link
                          to="/shop"
                          className="rounded-xl px-3 py-2 hover:bg-card transition-colors"
                        >
                          Shop all parts
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/compatibility"
                          className="rounded-xl px-3 py-2 hover:bg-card transition-colors"
                        >
                          Find parts for your car
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/sellers"
                          className="rounded-xl px-3 py-2 hover:bg-card transition-colors"
                        >
                          Browse trusted sellers
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/help"
                          className="rounded-xl px-3 py-2 hover:bg-card transition-colors"
                        >
                          Help centre
                        </Link>
                      </SheetClose>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Link to="/" className="hidden md:flex shrink-0 transition-transform hover:scale-[1.02]">
          <BrandLogo
            variant="full"
            priority
            className="text-[1.65rem] tracking-[0.18em] text-primary lg:text-[1.95rem]"
          />
        </Link>

        {/* Search */}
        <form
          className="hidden w-full max-w-lg items-center rounded-xl bg-surface shadow-[var(--shadow-soft)] transition-all focus-within:shadow-[var(--shadow-glow)] md:flex md:mx-4 lg:max-w-2xl"
          onSubmit={handleSearchSubmit}
        >
          <select
            value={searchCategory}
            onChange={(event) => setSearchCategory(event.target.value)}
            className="bg-transparent text-sm font-medium px-4 py-3 border-r border-border focus:outline-none cursor-pointer"
          >
            <option value="all">All</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search brake pads, oil filter, headlights…"
            className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="h-full px-5 gradient-accent rounded-r-xl text-primary font-semibold flex items-center gap-2 hover:opacity-95 transition-opacity"
          >
            <Search className="h-4 w-4" /> <span className="hidden lg:inline">Search</span>
          </button>
        </form>

        <Link
          to="/"
          className="md:hidden absolute left-1/2 -translate-x-1/2 transition-transform hover:scale-[1.02]"
        >
          <BrandLogo
            variant="mark"
            priority
            className="text-[1.18rem] tracking-[0.14em] text-primary min-[420px]:text-[1.35rem]"
          />
        </Link>

        <div className="ml-auto flex items-center gap-1 md:gap-2 md:ml-0">
          <Link
            href={accountHref}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface transition-colors"
          >
            <User className="h-5 w-5" />
            <div className="text-left min-w-max">
              <div className="text-[9px] text-muted-foreground leading-none">
                {currentUser ? `Hello, ${currentUser.name.split(" ")[0]}` : "Guest"}
              </div>
              <div className="text-sm font-semibold leading-tight">{accountLabel}</div>
            </div>
          </Link>
          <div className="md:hidden flex items-center gap-1">
            <Link
              to="/search"
              className="grid h-9 w-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-soft)] transition-colors hover:bg-background"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Link>
            <Link
              href={accountHref}
              className="grid h-9 w-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-soft)] transition-colors hover:bg-background"
              aria-label="Account"
            >
              <User className="h-4 w-4" />
            </Link>
            <Link
              to="/cart"
              className="relative grid h-9 w-9 place-items-center rounded-xl bg-surface shadow-[var(--shadow-soft)] transition-colors hover:bg-background"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartQuantity > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full gradient-accent px-1 text-[9px] font-bold text-primary">
                  {cartQuantity}
                </span>
              )}
            </Link>
          </div>
          <Link
            to="/cart"
            className="relative hidden md:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface transition-colors"
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartQuantity > 0 && (
                <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full gradient-accent px-1 text-[11px] font-bold text-primary">
                  {cartQuantity}
                </span>
              )}
            </div>
            <span className="hidden lg:inline text-sm font-semibold min-w-max">Cart</span>
          </Link>
        </div>
      </div>

      {/* Categories nav */}
      <div className="hidden md:block border-t border-border bg-surface">
        <div className="container mx-auto flex h-12 items-center gap-2 overflow-visible px-6 lg:h-14 lg:px-8">
          <DropdownMenu
            modal={false}
            open={categoriesMenuOpen}
            onOpenChange={setCategoriesMenuOpen}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-full shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition-colors hover:text-accent whitespace-nowrap"
                aria-expanded={categoriesMenuOpen}
                aria-haspopup="menu"
              >
                <Menu className="h-4 w-4" /> All Categories
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    categoriesMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={8}
              className="w-72 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-premium)]"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Browse Categories
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-1 bg-border" />
              <DropdownMenuItem
                asChild
                className="rounded-xl px-3 py-2.5"
                onSelect={() => setCategoriesMenuOpen(false)}
              >
                <Link to="/shop" className="flex w-full items-center justify-between">
                  <span className="font-semibold text-foreground">Shop all parts</span>
                  <span className="text-xs text-muted-foreground">Full catalog</span>
                </Link>
              </DropdownMenuItem>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.slug}
                  asChild
                  className="rounded-xl px-3 py-2.5"
                  onSelect={() => setCategoriesMenuOpen(false)}
                >
                  <Link
                    to="/category/$slug"
                    params={{ slug: category.slug }}
                    className="flex w-full items-center justify-between gap-3"
                  >
                    <span className="font-medium text-foreground">{category.name}</span>
                    <span className="text-xs text-muted-foreground">{category.productCount}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="min-w-0 flex-1 overflow-x-auto scroll-smooth">
            <div className="flex h-full min-w-max items-center gap-1">
              <Link
                to="/shop"
                className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center transition-colors whitespace-nowrap"
              >
                Shop All
              </Link>
              <Link
                to="/compatibility"
                className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> Find Parts
              </Link>
              {categories.slice(0, 5).map((c, index) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className={`px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground items-center transition-colors whitespace-nowrap ${index < 3 ? "inline-flex" : "hidden xl:inline-flex"}`}
                >
                  {c.name}
                </Link>
              ))}
              <Link
                to="/sellers"
                className="px-3 h-full text-sm font-medium text-muted-foreground hover:text-foreground hidden lg:inline-flex items-center transition-colors whitespace-nowrap"
              >
                Top Sellers
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap pl-3 text-xs text-muted-foreground lg:flex">
            <Heart className="h-3.5 w-3.5 text-accent" /> Free shipping over Rs. 5,000
          </div>
        </div>
      </div>
    </header>
  );
}
