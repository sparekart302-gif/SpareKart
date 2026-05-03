"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { useMarketplace } from "@/modules/marketplace/store";
import type { AppRole } from "@/modules/marketplace/types";

export function AccessGuard({
  allow,
  title,
  description,
  children,
}: {
  allow: AppRole[];
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { currentUser } = useMarketplace();

  if (!currentUser || !allow.includes(currentUser.role)) {
    return (
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-2xl rounded-[28px] bg-card p-6 text-center shadow-[var(--shadow-premium)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <Link
            href="/login"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Switch account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
