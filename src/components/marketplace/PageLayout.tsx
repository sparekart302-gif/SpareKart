import type { ReactNode } from "react";
import { Link } from "@/components/navigation/Link";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-clip">
      <Navbar />
      <main className="flex-1 overflow-x-clip">{children}</main>
      <Footer />
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="py-3 text-[11px] text-muted-foreground sm:py-4 sm:text-xs">
      {items.map((item, i) => (
        <span key={i}>
          {item.to ? (
            <Link href={item.to} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-2 opacity-50">/</span>}
        </span>
      ))}
    </nav>
  );
}
