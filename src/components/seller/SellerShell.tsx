"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Eye, Home, LogOut, Menu } from "lucide-react";
import { BrandLogo } from "@/components/marketplace/BrandLogo";
import { OptimizedImage } from "@/components/media/OptimizedImage";
import { Link } from "@/components/navigation/Link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMarketplace } from "@/modules/marketplace/store";
import type { SellerRecord } from "@/modules/marketplace/types";

type SellerShellTab = {
  key: string;
  label: string;
  description?: string;
  Icon: LucideIcon;
};

type SellerShellStat = {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger";
};

export function SellerShell({
  seller,
  tabs,
  activeTab,
  onTabChange,
  quickStats,
  children,
}: {
  seller: SellerRecord;
  tabs: readonly SellerShellTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  quickStats: readonly SellerShellStat[];
  children: ReactNode;
}) {
  const router = useRouter();
  const { currentUser, logout } = useMarketplace();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = tabs.find((item) => item.key === activeTab) ?? tabs[0];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border/70 px-4 py-3.5">
        <Link href="/" className="inline-flex items-center">
          <BrandLogo className="text-[1.28rem] tracking-[0.14em] text-primary" />
        </Link>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Seller Workspace
        </p>
      </div>

      <div className="border-b border-border/70 px-3 py-3">
        <div className="rounded-[16px] border border-border/70 bg-muted/20 p-2.5">
          <div className="flex items-start gap-2.5">
            <OptimizedImage
              src={seller.logo}
              alt={seller.name}
              width={56}
              height={56}
              className="h-11 w-11 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black tracking-[-0.01em] text-foreground">
                {seller.name}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {seller.city} · {seller.responseTime}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <span className="rounded-full border border-border/60 bg-card px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                  {seller.tier}
                </span>
                <span className="rounded-full border border-accent/15 bg-accent-soft px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-accent">
                  {seller.status.replaceAll("_", " ")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {quickStats.slice(0, 4).map((stat) => (
              <QuickStat key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {tabs.map(({ key, label, description, Icon }) => {
          const active = activeTab === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={`group flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{label}</div>
                {description ? (
                  <div
                    className={`mt-0.5 truncate text-[11px] ${active ? "text-primary-foreground/72" : "text-muted-foreground"}`}
                  >
                    {description}
                  </div>
                ) : null}
              </div>
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 ${active ? "opacity-90" : "opacity-0 group-hover:opacity-40"}`}
              />
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border/70 px-3 py-3">
        <div className="rounded-[16px] border border-border/70 bg-muted/20 p-2.5">
          <div className="truncate text-sm font-black text-foreground">
            {currentUser?.name ?? seller.name}
          </div>
          <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            Seller account
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Link
              href={`/seller/${seller.slug}`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card px-2 text-xs font-bold"
            >
              <Eye className="h-3.5 w-3.5" />
              Store
            </Link>
            <Link
              href="/"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card px-2 text-xs font-bold"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="col-span-2 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-2 text-xs font-bold text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-foreground lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen lg:h-screen">
        <aside className="hidden h-screen w-[252px] shrink-0 border-r border-border/70 bg-card lg:block">
          {sidebarContent}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-card/96 backdrop-blur">
            <div className="flex h-[52px] items-center gap-3 px-3.5 py-2 sm:px-4 lg:px-5">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl lg:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open seller menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Seller Navigation</SheetTitle>
                    <SheetDescription>
                      Mobile navigation for the seller dashboard workspace.
                    </SheetDescription>
                  </SheetHeader>
                  {sidebarContent}
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black tracking-tight text-foreground">
                  {activeItem?.label ?? "Seller Dashboard"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {seller.name} · marketplace operations
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
                  {seller.tier} Seller
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/15"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3.5 py-3.5 sm:px-4 lg:min-h-0 lg:overflow-y-auto lg:px-5 lg:py-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, tone = "default" }: SellerShellStat) {
  const toneClasses =
    tone === "success"
      ? "bg-success/8 border-success/15"
      : tone === "warning"
        ? "bg-warning/10 border-warning/15"
        : tone === "danger"
          ? "bg-destructive/8 border-destructive/15"
          : "bg-card border-border/70";

  return (
    <div className={`rounded-[10px] border px-2 py-1.5 ${toneClasses}`}>
      <div className="text-sm font-black tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
