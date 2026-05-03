"use client";

import {
  Clock3,
  PackageCheck,
  Store,
  Truck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Package,
} from "lucide-react";
import { OrderStatusBadge } from "@/components/marketplace/StatusBadge";
import { getMarketplaceSellerBySlug } from "@/modules/marketplace/selectors";
import type { MarketplaceState, SellerOrderFulfillment } from "@/modules/marketplace/types";

function formatTimelineDate(value: string) {
  return new Date(value).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SellerFulfillmentGrid({
  state,
  fulfillments,
  activeSellerSlug,
}: {
  state: MarketplaceState;
  fulfillments: SellerOrderFulfillment[];
  activeSellerSlug?: string;
}) {
  if (fulfillments.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {fulfillments.map((fulfillment) => {
        const seller = getMarketplaceSellerBySlug(state, fulfillment.sellerSlug);
        const isActiveSeller = activeSellerSlug === fulfillment.sellerSlug;

        return (
          <div
            key={`${fulfillment.sellerSlug}-${fulfillment.updatedAt}`}
            className={`rounded-[12px] px-3 py-2 shadow-[var(--shadow-soft)] text-sm ${
              isActiveSeller ? "bg-accent-soft" : "bg-card"
            }`}
          >
            <div className="flex items-start gap-2 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Store className="h-3.5 w-3.5 text-accent" />
                  <span className="truncate">{seller?.name ?? fulfillment.sellerSlug}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  Updated {formatTimelineDate(fulfillment.updatedAt)}
                </div>
              </div>
              <OrderStatusBadge status={fulfillment.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrderTimeline({
  items,
}: {
  items: Array<{
    id: string;
    createdAt: string;
    title: string;
    detail: string;
    toStatus?: string;
    category?: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[12px] bg-card px-3 py-2 text-xs text-muted-foreground shadow-[var(--shadow-soft)]">
        No updates yet. Check back soon!
      </div>
    );
  }

  const getIconAndColor = (toStatus?: string, category?: string) => {
    switch (category) {
      case "success":
        return {
          Icon: CheckCircle2,
          bgColor: "bg-success/10",
          iconColor: "text-success",
          dotColor: "bg-success",
        };
      case "danger":
        return {
          Icon: AlertCircle,
          bgColor: "bg-danger/10",
          iconColor: "text-danger",
          dotColor: "bg-danger",
        };
      case "warning":
        if (toStatus === "SHIPPED") {
          return {
            Icon: Truck,
            bgColor: "bg-purple-500/10",
            iconColor: "text-purple-600",
            dotColor: "bg-purple-500",
          };
        }
        return {
          Icon: Clock3,
          bgColor: "bg-warning/10",
          iconColor: "text-warning",
          dotColor: "bg-warning",
        };
      default:
        if (toStatus === "CONFIRMED" || toStatus === "PROCESSING") {
          return {
            Icon: Package,
            bgColor: "bg-blue-500/10",
            iconColor: "text-blue-600",
            dotColor: "bg-blue-500",
          };
        }
        if (toStatus === "DELIVERED") {
          return {
            Icon: CheckCircle2,
            bgColor: "bg-success/10",
            iconColor: "text-success",
            dotColor: "bg-success",
          };
        }
        return {
          Icon: Clock3,
          bgColor: "bg-accent-soft",
          iconColor: "text-accent",
          dotColor: "bg-accent",
        };
    }
  };

  // Show only last 4 items in horizontal view, with last item being most recent
  const displayItems = items.slice(0, Math.min(4, items.length));

  return (
    <div className="relative">
      {/* Timeline horizontal line */}
      <div
        className="absolute left-0 right-0 top-2.5 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Timeline items - horizontal layout */}
      <div className="flex items-start gap-2 relative" style={{ zIndex: 1 }}>
        {displayItems.map((item, index) => {
          const { Icon, bgColor, iconColor, dotColor } = getIconAndColor(
            item.toStatus,
            item.category,
          );

          return (
            <div key={item.id} className="flex-1 flex flex-col items-center">
              {/* Timeline dot */}
              <div
                className={`h-7 w-7 rounded-full ${bgColor} border-2 ${dotColor.replace("bg-", "border-")} flex items-center justify-center mb-2 relative shadow-[var(--shadow-soft)]`}
                style={{ zIndex: 2 }}
              >
                <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
              </div>

              {/* Content box below dot */}
              <div className="text-center w-full">
                <div className="text-[11px] font-bold text-foreground leading-tight mb-0.5 line-clamp-1">
                  {item.title}
                </div>
                <div className="text-[9px] text-muted-foreground mb-1 line-clamp-2">
                  {item.detail}
                </div>
                <div className="text-[8px] text-muted-foreground font-medium">
                  {formatTimelineDate(item.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
