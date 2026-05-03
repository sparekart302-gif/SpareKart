"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type OperationsTab = {
  value: string;
  label: string;
  count?: number;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function OperationsWorkspace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function OperationsPanel({
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
    <section
      className={cn(
        "overflow-hidden rounded-[16px] border border-border/70 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-col gap-2 border-b border-border/70 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="truncate text-sm font-black tracking-[-0.01em] text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function OperationsToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 border-b border-border/70 bg-card/95 p-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/82",
        className,
      )}
    >
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">{children}</div>
    </div>
  );
}

export function OperationsSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background px-3",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
      />
    </label>
  );
}

export function OperationsSelect({
  value,
  onChange,
  children,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1", className)}>
      {label ? (
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm font-semibold outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function OperationsTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: OperationsTab[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1", className)}>
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-[0.1em] transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:bg-muted/50",
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  isActive ? "bg-white/20 text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function OperationsTable({
  children,
  minWidth = "760px",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function OperationsMobileList({ children }: { children: ReactNode }) {
  return <div className="grid gap-2.5 p-2.5 md:hidden">{children}</div>;
}

export function OperationsMobileCard({
  selected,
  children,
  onClick,
}: {
  selected?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  const className = cn(
    "w-full rounded-[14px] border bg-background p-3 text-left transition-colors",
    selected ? "border-primary/50 bg-accent-soft/50" : "border-border/70 hover:bg-muted/40",
  );

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (onClick as any)();
          }
        }}
        className={cn(className, "cursor-pointer")}
      >
        {children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

export function OperationsTh({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-border/70 bg-muted/30 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function OperationsTd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-border/60 px-3 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

export function OperationsRow({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors last:[&_td]:border-b-0",
        onClick ? "cursor-pointer hover:bg-muted/40" : "",
        selected ? "bg-accent-soft/45" : "",
      )}
    >
      {children}
    </tr>
  );
}

export function OperationsPager({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 px-3 py-2.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Showing <span className="font-bold text-foreground">{start}</span>-
        <span className="font-bold text-foreground">{end}</span> of{" "}
        <span className="font-bold text-foreground">{totalItems}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <span className="rounded-lg bg-muted px-2 py-1 font-bold text-foreground">
          {page}/{Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function OperationsDetailPanel({
  title,
  subtitle,
  meta,
  actions,
  children,
  empty,
  className,
}: {
  title?: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "overflow-hidden rounded-[16px] border border-border/70 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)] xl:sticky xl:top-[70px] xl:max-h-[calc(100vh-92px)]",
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/70 bg-muted/20 px-3 py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-foreground sm:text-base">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
              {meta ? <div className="mt-2 flex flex-wrap gap-1.5">{meta}</div> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="max-h-[inherit] overflow-y-auto p-3.5">{children ?? empty}</div>
    </aside>
  );
}

export function OperationsKeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-b-0">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right text-xs font-bold text-foreground sm:text-sm">
        {value}
      </span>
    </div>
  );
}

export function OperationsMiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-2.5 py-2">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-foreground">{value}</div>
    </div>
  );
}
