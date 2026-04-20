
# SpareKart — Premium Multi-Vendor Auto Parts Marketplace (v1: Visual Shell)

A stunning, light & clean, marketplace-first frontend for **SpareKart** — Pakistan's premium destination for car spare parts from verified sellers. This v1 is a fully clickable visual shell with rich mock data (no backend, no auth), priced in **PKR (Rs.)**, designed to feel as polished as top Shopify Plus themes with the trust architecture of Amazon.

## Brand & Design System

**Aesthetic:** Light marketplace foundation — crisp whites, soft slate surfaces, deep navy primary (`oklch ~0.25 0.08 260`), with a precision **signal-orange accent** (`oklch ~0.72 0.19 50`) for CTAs, badges, and merchandising highlights. Success green for in-stock, amber for low-stock, red for out-of-stock.

**Typography:** Modern geometric sans (Inter/Geist family) — tight headings, comfortable body, tabular numerals for prices and dashboards.

**Components:** Soft shadows, refined 1px borders, generous spacing, rounded-xl cards, subtle hover lift, image zoom on product cards, sticky translucent navbar with blur, polished skeletons, elegant empty states.

**Motion:** Subtle fade-up section reveals, smooth hover transitions, refined dropdown/sheet animations, image zoom on product hover. Never gimmicky.

## Pages in v1

1. **Home** — Hero with smart search + vehicle compatibility selector (Brand → Model → Year), featured categories grid, trending products carousel, top verified sellers row, "Shop by Brand" logos strip, trust pillars (Verified Sellers, COD, Easy Returns, Fitment Guarantee), seller CTA banner, premium footer.

2. **Shop / Listing** — Sticky filter sidebar (category, brand, model, year, price range, availability, seller, seller rating, shipping), top sort bar, responsive product grid with seller name + verified badge on every card, quick-view, pagination.

3. **Category Page** — Same listing engine, themed header per category (Brakes, Engine, Suspension, Lighting, Electrical, Body, Interior, Tyres & Wheels).

4. **Compatibility Browse** — Dedicated "Find Parts For Your Car" page with prominent Brand/Model/Year/Engine selector and matching results.

5. **Product Detail** — Premium image gallery with zoom + thumbnails, title/SKU/brand, PKR pricing with discount strikethrough, stock status, compatibility table, **"Sold by [Store]" trust card** (logo, rating, response time, verified badge, link to store), quantity selector, Add to Cart + Buy Now, tabs for Description / Specs / Compatibility / Shipping & Returns, **separate Product Reviews block** (fitment, quality, value), **separate Store Reputation block** (service, delivery, communication), "Other sellers offering this part" section, related products.

6. **Seller Store Page** — Branded store banner, logo, verified badge, rating + total reviews, joined date, location, store description, in-store category nav, product grid filtered to that seller, store reviews tab, store policies.

7. **Search Results** — Query-aware listing with suggestions, did-you-mean, filters.

8. **Cart** — Line items grouped **by seller** (marketplace-true), per-seller subtotals, shipping estimates per seller, coupon field, order summary, secure checkout CTA.

9. **Checkout** — Multi-step (Address → Shipping → Payment → Review): address form with Pakistan fields (province, city), shipping per seller, **payment method picker** (COD / Bank Transfer / Easypaisa / JazzCash) with beautifully designed instructions panel + **payment proof uploader** (drag-drop, preview, reassuring secure messaging), final review with per-seller breakdown, order placed confirmation screen.

10. **Auth shells** — Login, Register (Customer / Become a Seller toggle), Forgot Password — visually polished, non-functional in v1.

## Mock Data Depth

- ~40 realistic auto parts (brake pads, oil filters, headlights, suspension kits, batteries, alternators, etc.) with proper specs and compatibility (Toyota Corolla, Honda Civic, Suzuki Mehran/Alto, Hyundai, KIA, etc.)
- 8–10 seller stores with logos, ratings, locations across Karachi/Lahore/Islamabad
- Categories, brands (Bosch, Denso, NGK, Brembo, KYB, Exide…), reviews (both product and store), banners

## Reusable Component Library

Navbar (sticky, search-forward), MegaMenu category nav, ProductCard (with seller chip), SellerCard, StoreBanner, ReviewCard (Product variant + Store variant), FilterSidebar, SortDropdown, ProductGallery, PurchaseCard, CompatibilitySelector, QuantityStepper, OrderSummary, PaymentProofUploader, StatusBadge, TrustBadge, EmptyState, Skeletons, Footer.

## Out of Scope for v1 (planned for next phases)

Auth, real backend, customer dashboard, seller dashboard, admin panel, real payment proof verification, real reviews submission. The visual shell will be structured so these layer in cleanly next.

## Deliverable

A fully clickable, beautifully designed, mobile-responsive marketplace front-end on TanStack Start with separate routes per page (SSR + SEO ready), unique `<head>` metadata per route, and a cohesive premium design system ready for stakeholder review and the next build phase.
