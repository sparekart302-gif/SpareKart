"use client";

import { Bell } from "lucide-react";
import type { NotificationRecord } from "@/modules/marketplace/types";

export function NotificationFeed({
  items,
  emptyLabel,
}: {
  items: NotificationRecord[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {items.map((notification) => (
        <div key={notification.id} className="px-0 py-3 first:pt-0 last:pb-0">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 bg-background">
              <Bell className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{notification.title}</h3>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{notification.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
