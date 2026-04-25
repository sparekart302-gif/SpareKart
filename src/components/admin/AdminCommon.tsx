"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { AdminEmptyState, AdminMetricCard, AdminPanel } from "@/components/admin/AdminUI";
import { canAccessAdminScope } from "@/modules/marketplace/permissions";
import type { AdminScope, MarketplaceUser } from "@/modules/marketplace/types";

export function AdminScopeGate({
  scope,
  currentUser,
  title,
  description,
  superAdminOnly = false,
  children,
}: {
  scope: AdminScope;
  currentUser: MarketplaceUser | undefined;
  title?: string;
  description?: string;
  superAdminOnly?: boolean;
  children: ReactNode;
}) {
  const hasAccess =
    !!currentUser &&
    canAccessAdminScope(currentUser, scope) &&
    (!superAdminOnly || currentUser.role === "SUPER_ADMIN");

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <AdminPanel>
      <AdminEmptyState
        title={title ?? "Access restricted"}
        body={
          description ??
          "Your current admin role does not include access to this workspace. Ask a super admin to update your access profile if needed."
        }
        action={
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <Lock className="h-3.5 w-3.5" />
            Restricted
          </div>
        }
      />
    </AdminPanel>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block rounded-[14px] border border-transparent">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {hint ? <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</div> : null}
      <div className="mt-1.5 [&_input]:min-h-10 [&_input]:rounded-xl [&_select]:min-h-10 [&_select]:rounded-xl [&_textarea]:rounded-xl">{children}</div>
    </label>
  );
}

export function AdminKeyValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-2.5 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground sm:text-right">{value}</div>
    </div>
  );
}

export function AdminCompactStat({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return <AdminMetricCard label={label} value={value} helper={helper} tone={tone} />;
}
