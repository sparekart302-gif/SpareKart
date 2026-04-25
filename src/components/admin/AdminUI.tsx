"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-border/70 bg-card/95 px-3.5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">{eyebrow}</div>
        ) : null}
        <h1 className="mt-0.5 text-[1.35rem] font-black tracking-[-0.03em] text-foreground sm:text-[1.65rem] lg:text-[1.85rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
      </div>
        {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[18px] border border-border/70 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)]", className)}>
      {title || description || action ? (
        <div className="flex flex-col gap-2 border-b border-border/70 bg-muted/20 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-black tracking-[-0.01em] text-foreground sm:text-base">{title}</h2> : null}
            {description ? <p className="mt-0.5 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-3.5 sm:p-4">{children}</div>
    </section>
  );
}

export function AdminMetricCard({
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
  const toneClasses =
    tone === "success"
      ? "border-success/25 bg-success/5 before:bg-success"
      : tone === "warning"
        ? "border-warning/25 bg-warning/5 before:bg-warning"
        : tone === "danger"
          ? "border-destructive/25 bg-destructive/5 before:bg-destructive"
          : "border-border/70 bg-card before:bg-accent";

  return (
    <div className={cn("relative overflow-hidden rounded-[14px] border px-3 py-2.5 before:absolute before:inset-y-2.5 before:left-0 before:w-1 before:rounded-r-full", toneClasses)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate pl-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
          {helper ? <div className="mt-0.5 hidden max-w-[14rem] truncate pl-1.5 text-[11px] text-muted-foreground sm:block">{helper}</div> : null}
        </div>
        <div className="min-w-0 shrink-0 overflow-hidden text-right">
          <div className="max-w-[9rem] truncate text-base font-black tabular-nums tracking-[-0.03em] text-foreground sm:text-lg">{value}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
      <div className="text-sm font-black text-foreground sm:text-base">{title}</div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">{body}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClasses =
    tone === "success"
      ? "border-success/20 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/20 bg-warning/15 text-warning-foreground"
        : tone === "danger"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : tone === "info"
            ? "border-info/20 bg-info/10 text-info"
            : "border-border/60 bg-background text-foreground";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]", toneClasses)}>
      {children}
    </span>
  );
}

export function AdminMiniBars({
  rows,
  valueFormatter = (value: number) => String(value),
}: {
  rows: { label: string; value: number; tone?: string }[];
  valueFormatter?: (value: number) => string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-muted-foreground">{row.label}</span>
            <span className="font-bold tabular-nums text-foreground">{valueFormatter(row.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface">
            <div
              className={cn(
                "h-full rounded-full",
                row.tone === "success"
                  ? "bg-success"
                  : row.tone === "warning"
                    ? "bg-warning"
                    : row.tone === "danger"
                      ? "bg-destructive"
                      : "bg-accent",
              )}
              style={{ width: `${Math.max((row.value / maxValue) * 100, 6)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
