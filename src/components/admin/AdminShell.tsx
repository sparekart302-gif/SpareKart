"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  TicketPercent,
  Users2,
} from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { BrandLogo } from "@/components/marketplace/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getAdminDashboardSummary } from "@/modules/marketplace/admin-selectors";
import { canAccessAdminScope, isAdmin } from "@/modules/marketplace/permissions";
import { useMarketplace } from "@/modules/marketplace/store";
import type { AdminScope } from "@/modules/marketplace/types";

type NavItem = {
  href: string;
  label: string;
  scope: AdminScope;
  group: "Workspace" | "Operations" | "Growth" | "System";
  Icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    scope: "dashboard",
    group: "Workspace",
    Icon: LayoutDashboard,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    scope: "orders",
    group: "Operations",
    Icon: ClipboardList,
  },
  {
    href: "/admin/payments",
    label: "Payments",
    scope: "payments",
    group: "Operations",
    Icon: CreditCard,
  },
  {
    href: "/admin/financial-operations",
    label: "Financial Ops",
    scope: "reports",
    group: "Operations",
    Icon: BarChart3,
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    scope: "inventory",
    group: "Operations",
    Icon: Package,
  },
  { href: "/admin/sellers", label: "Sellers", scope: "sellers", group: "Growth", Icon: Store },
  {
    href: "/admin/products",
    label: "Products",
    scope: "products",
    group: "Growth",
    Icon: ShoppingBag,
  },
  {
    href: "/admin/reviews",
    label: "Reviews",
    scope: "reviews",
    group: "Growth",
    Icon: ShieldCheck,
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    scope: "coupons",
    group: "Growth",
    Icon: TicketPercent,
  },
  { href: "/admin/users", label: "Users", scope: "users", group: "System", Icon: Users2 },
  { href: "/admin/audit-logs", label: "Audit Logs", scope: "audit", group: "System", Icon: Boxes },
  {
    href: "/admin/settings",
    label: "Settings",
    scope: "settings",
    group: "System",
    Icon: Settings,
  },
  {
    href: "/admin/admins",
    label: "Admin Roles",
    scope: "admins",
    group: "System",
    Icon: ShieldCheck,
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, state } = useMarketplace();

  const summary = useMemo(() => getAdminDashboardSummary(state), [state]);
  const visibleItems = navItems.filter((item) => canAccessAdminScope(currentUser, item.scope));
  const activeItem = visibleItems.find(
    (item) =>
      pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)),
  );
  const groupedItems = (["Workspace", "Operations", "Growth", "System"] as const)
    .map((group) => ({
      group,
      items: visibleItems.filter((item) => item.group === group),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!currentUser || !isAdmin(currentUser)) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[32px] bg-card p-8 text-center shadow-[var(--shadow-premium)]">
          <div className="mx-auto inline-flex rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Admin Access
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground">
            Admin portal only
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign in with an admin or super-admin account to access SpareKart marketplace operations.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Go to login
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-surface px-5 text-sm font-semibold shadow-[var(--shadow-soft)]"
            >
              Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const SidebarContent = (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border/70 px-4 py-3.5">
        <Link href="/admin" className="inline-flex items-center">
          <BrandLogo className="text-[1.28rem] tracking-[0.14em] text-primary" />
        </Link>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
          Marketplace Control
        </p>
      </div>

      <div className="border-b border-border/70 px-3 py-3">
        <div className="rounded-[16px] border border-border/70 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Ops queue
            </div>
            <div className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-black text-accent">
              Live
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <QuickCount label="Payments" value={summary.pendingPayments} />
            <QuickCount label="Sellers" value={summary.pendingSellerApprovals} />
            <QuickCount label="Stock" value={summary.lowStockCount} />
            <QuickCount label="Flags" value={summary.flaggedProducts + summary.flaggedReviews} />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {groupedItems.map(({ group, items }) => (
          <div key={group}>
            <div className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {group}
            </div>
            <div className="space-y-0.5">
              {items.map(({ href, label, Icon }) => {
                const active =
                  pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 ${active ? "opacity-90" : "opacity-0 group-hover:opacity-40"}`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/70 px-3 py-3">
        <div className="rounded-[16px] border border-border/70 bg-muted/20 p-2.5">
          <div className="truncate text-sm font-black text-foreground">{currentUser.name}</div>
          <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {currentUser.adminTitle ?? currentUser.role.replaceAll("_", " ")}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Link
              href="/"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 bg-card px-2 text-xs font-bold"
            >
              Store
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-2 text-xs font-bold text-destructive"
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
          {SidebarContent}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-card/96 backdrop-blur">
            <div className="flex h-[52px] items-center gap-3 px-3.5 py-2 sm:px-4 lg:px-5">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl lg:hidden">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open admin menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Admin navigation</SheetTitle>
                    <SheetDescription>
                      Open the SpareKart admin sidebar and switch between marketplace control
                      screens.
                    </SheetDescription>
                  </SheetHeader>
                  {SidebarContent}
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black tracking-tight text-foreground">
                  {activeItem?.label ?? "SpareKart Admin"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {activeItem?.group ?? "Marketplace"} · secure marketplace operations
                </div>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
                {currentUser.role.replaceAll("_", " ")}
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

function QuickCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-border/60 bg-card px-2 py-1.5">
      <div className="text-sm font-black tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
