import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="text-xs text-muted-foreground py-4">
      {items.map((item, i) => (
        <span key={i}>
          {item.to ? <a href={item.to} className="hover:text-foreground transition-colors">{item.label}</a> : <span className="text-foreground font-medium">{item.label}</span>}
          {i < items.length - 1 && <span className="mx-2 opacity-50">/</span>}
        </span>
      ))}
    </nav>
  );
}