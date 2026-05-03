"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Search, Ticket } from "lucide-react";
import { toast } from "sonner";
import { AdminCompactStat, AdminField, AdminScopeGate } from "@/components/admin/AdminCommon";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminUI";
import { getCouponUsageRows } from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { CouponInput, CouponScope, CouponType } from "@/modules/marketplace/types";
import { formatPKR } from "@/data/marketplace";

const couponTypes: CouponType[] = ["FIXED", "PERCENTAGE"];
const couponScopes: CouponScope[] = ["ORDER", "CATEGORY"];

const blankCoupon: CouponInput = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  scope: "ORDER",
  value: 10,
  minOrderAmount: 0,
  usageLimit: 100,
  active: true,
  maxDiscountAmount: undefined,
  eligibleCategorySlugs: [],
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
};

export default function AdminCouponsPage() {
  const { currentUser, state, saveCouponRecord, deleteCouponRecord } = useMarketplace();
  const [query, setQuery] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [draft, setDraft] = useState<CouponInput>(blankCoupon);

  const couponRows = useMemo(() => {
    return getCouponUsageRows(state)
      .filter((coupon) => {
        const searchable = `${coupon.code} ${coupon.description}`.toLowerCase();
        return !query.trim() || searchable.includes(query.trim().toLowerCase());
      })
      .sort((left, right) => left.code.localeCompare(right.code));
  }, [query, state]);

  const selectedCoupon = couponRows.find((coupon) => coupon.id === selectedCouponId);

  useEffect(() => {
    if (selectedCoupon) {
      setDraft({
        id: selectedCoupon.id,
        code: selectedCoupon.code,
        description: selectedCoupon.description,
        type: selectedCoupon.type,
        scope: selectedCoupon.scope,
        value: selectedCoupon.value,
        maxDiscountAmount: selectedCoupon.maxDiscountAmount,
        minOrderAmount: selectedCoupon.minOrderAmount,
        usageLimit: selectedCoupon.usageLimit,
        usageCount: selectedCoupon.usageCount,
        active: selectedCoupon.active,
        expiresAt: selectedCoupon.expiresAt.slice(0, 10),
        usedByUserIds: selectedCoupon.usedByUserIds,
        eligibleCategorySlugs: selectedCoupon.eligibleCategorySlugs ?? [],
        createdAt: selectedCoupon.createdAt,
      });
      return;
    }

    setDraft(blankCoupon);
  }, [selectedCoupon]);

  const activeCount = state.coupons.filter((coupon) => coupon.active).length;
  const expiredCount = state.coupons.filter(
    (coupon) => new Date(coupon.expiresAt) < new Date(),
  ).length;
  const usageCount = state.coupons.reduce((sum, coupon) => sum + coupon.usageCount, 0);

  return (
    <AdminScopeGate scope="coupons" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Coupons"
          title="Campaign codes and redemption controls"
          description="Create discount codes, supervise coupon usage, and keep campaign limits cleanly under control."
          actions={
            <button
              type="button"
              onClick={() => {
                setSelectedCouponId("");
                setDraft(blankCoupon);
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              New coupon
            </button>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat
            label="Active coupons"
            value={String(activeCount)}
            helper="Currently enabled"
            tone="success"
          />
          <AdminCompactStat
            label="Expired"
            value={String(expiredCount)}
            helper="Past expiry date"
            tone="warning"
          />
          <AdminCompactStat
            label="Total redemptions"
            value={String(usageCount)}
            helper="Recorded coupon uses"
          />
          <AdminCompactStat
            label="Campaigns"
            value={String(state.coupons.length)}
            helper="Stored discount codes"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <AdminPanel title="Coupon directory">
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 shadow-[var(--shadow-soft)]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search codes or campaign descriptions"
                className="h-11 w-full bg-transparent text-sm focus:outline-none"
              />
            </div>

            <div className="mt-4 space-y-3">
              {couponRows.map((coupon) => (
                <button
                  key={coupon.id}
                  type="button"
                  onClick={() => setSelectedCouponId(coupon.id)}
                  className={`w-full rounded-[22px] p-4 text-left shadow-[var(--shadow-soft)] transition-colors ${
                    selectedCouponId === coupon.id
                      ? "bg-accent-soft"
                      : "bg-surface hover:bg-accent-soft/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-foreground">{coupon.code}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{coupon.description}</div>
                    </div>
                    <AdminPill tone={coupon.active ? "success" : "default"}>
                      {coupon.active ? "Active" : "Disabled"}
                    </AdminPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminPill>{coupon.type}</AdminPill>
                    <AdminPill tone="info">{coupon.scope}</AdminPill>
                    <AdminPill tone="info">
                      {coupon.usageCount}/{coupon.usageLimit} used
                    </AdminPill>
                  </div>
                </button>
              ))}
            </div>
          </AdminPanel>

          <div className="space-y-4">
            <AdminPanel title={draft.id ? "Edit coupon" : "Create coupon"}>
              <div className="space-y-4">
                <AdminField label="Code">
                  <input
                    value={draft.code}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
                <AdminField label="Description">
                  <input
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, description: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Type">
                    <select
                      value={draft.type}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          type: event.target.value as CouponType,
                        }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    >
                      {couponTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                  <AdminField label="Scope">
                    <select
                      value={draft.scope}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          scope: event.target.value as CouponScope,
                          eligibleCategorySlugs:
                            event.target.value === "CATEGORY"
                              ? (previous.eligibleCategorySlugs ?? [])
                              : [],
                        }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    >
                      {couponScopes.map((scope) => (
                        <option key={scope} value={scope}>
                          {scope}
                        </option>
                      ))}
                    </select>
                  </AdminField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Value">
                    <input
                      type="number"
                      value={draft.value}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          value: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                  </AdminField>
                  <AdminField label="Maximum discount">
                    <input
                      type="number"
                      value={draft.maxDiscountAmount ?? ""}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          maxDiscountAmount: event.target.value
                            ? Number(event.target.value) || undefined
                            : undefined,
                        }))
                      }
                      placeholder="Optional cap"
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                  </AdminField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Minimum order amount">
                    <input
                      type="number"
                      value={draft.minOrderAmount}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          minOrderAmount: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                  </AdminField>
                  <AdminField label="Usage limit">
                    <input
                      type="number"
                      value={draft.usageLimit}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          usageLimit: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                  </AdminField>
                </div>
                {draft.scope === "CATEGORY" ? (
                  <AdminField label="Eligible categories">
                    <div className="flex flex-wrap gap-2 rounded-[20px] bg-surface p-3 shadow-[var(--shadow-soft)]">
                      {state.managedCategories
                        .filter((category) => category.active)
                        .map((category) => {
                          const isSelected = (draft.eligibleCategorySlugs ?? []).includes(
                            category.slug,
                          );

                          return (
                            <button
                              key={category.slug}
                              type="button"
                              onClick={() =>
                                setDraft((previous) => {
                                  const current = previous.eligibleCategorySlugs ?? [];
                                  const next = isSelected
                                    ? current.filter((slug) => slug !== category.slug)
                                    : [...current, category.slug];

                                  return {
                                    ...previous,
                                    eligibleCategorySlugs: next,
                                  };
                                })
                              }
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? "bg-accent text-primary"
                                  : "bg-card text-muted-foreground shadow-[var(--shadow-soft)]"
                              }`}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                    </div>
                  </AdminField>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="Expiry date">
                    <input
                      type="date"
                      value={draft.expiresAt}
                      onChange={(event) =>
                        setDraft((previous) => ({ ...previous, expiresAt: event.target.value }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    />
                  </AdminField>
                  <AdminField label="Status">
                    <select
                      value={draft.active ? "active" : "disabled"}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          active: event.target.value === "active",
                        }))
                      }
                      className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </AdminField>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        saveCouponRecord(draft);
                        toast.success(draft.id ? "Coupon updated." : "Coupon created.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Unable to save coupon.",
                        );
                      }
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Save coupon
                  </button>
                  {draft.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          deleteCouponRecord(draft.id!);
                          toast.success("Coupon deleted.");
                          setSelectedCouponId("");
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Unable to delete coupon.",
                          );
                        }
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-destructive/10 px-5 text-sm font-semibold text-destructive"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </AdminPanel>

            <AdminPanel title="Usage visibility">
              {!selectedCoupon ? (
                <AdminEmptyState
                  title="Choose a coupon"
                  body="Select a campaign to inspect who redeemed it and how often."
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <UsageMetric
                      label="Redemptions"
                      value={String(selectedCoupon.usageCount)}
                      Icon={Ticket}
                    />
                    <UsageMetric
                      label="Usage limit"
                      value={String(selectedCoupon.usageLimit)}
                      Icon={BadgePercent}
                    />
                    <UsageMetric
                      label="Discount"
                      value={
                        selectedCoupon.type === "PERCENTAGE"
                          ? `${selectedCoupon.value}%`
                          : formatPKR(selectedCoupon.value)
                      }
                      Icon={Ticket}
                    />
                  </div>
                  <div className="rounded-[22px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]">
                    <div className="text-sm font-bold text-foreground">
                      Customers who used this code
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCoupon.customers.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No customer redemptions yet.
                        </div>
                      ) : (
                        selectedCoupon.customers.map((customer) => (
                          <span
                            key={customer!.id}
                            className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-[var(--shadow-soft)]"
                          >
                            {customer!.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </AdminPanel>
          </div>
        </section>
      </div>
    </AdminScopeGate>
  );
}

function UsageMetric({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof Ticket;
}) {
  return (
    <div className="rounded-[20px] bg-surface px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-[var(--shadow-soft)]">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="mt-3 text-xl font-black text-foreground">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
