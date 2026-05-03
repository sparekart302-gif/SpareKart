"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminScope, AdminUserInput, AppRole, UserStatus } from "@/modules/marketplace/types";
import { getScopeLabel } from "@/modules/marketplace/admin-selectors";
import { canAccessAdminScope } from "@/modules/marketplace/permissions";
import type { MarketplaceUser } from "@/modules/marketplace/types";

const userRoleOptions: AppRole[] = ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"];
const userStatusOptions: UserStatus[] = ["ACTIVE", "SUSPENDED", "INVITED"];
const adminScopeOptions: AdminScope[] = [
  "dashboard",
  "users",
  "sellers",
  "products",
  "payments",
  "orders",
  "inventory",
  "reviews",
  "coupons",
  "reports",
  "audit",
  "settings",
  "admins",
];

const blankUser: AdminUserInput = {
  name: "",
  email: "",
  phone: "",
  role: "CUSTOMER",
  status: "ACTIVE",
  adminScopes: [],
};

export function UserManagementDialog({
  open,
  user,
  currentUser,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean;
  user: AdminUserInput | null;
  currentUser?: MarketplaceUser;
  onOpenChange: (open: boolean) => void;
  onSave: (user: AdminUserInput) => void;
  onDelete: (userId: string) => void;
}) {
  const [draft, setDraft] = useState<AdminUserInput>(user || blankUser);
  const canManageAdmins = canAccessAdminScope(currentUser, "admins");

  const handleSave = () => {
    try {
      onSave(draft);
      toast.success(draft.id ? "User updated." : "User created.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save user.");
    }
  };

  const handleDelete = () => {
    if (!draft.id) return;
    try {
      onDelete(draft.id);
      toast.success("User deleted.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl font-black tracking-tight">
            {draft.id ? "Edit user" : "Create user"}
          </DialogTitle>
          <DialogDescription>Update account role, access, and lifecycle state.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Full name
            </div>
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Email
              </div>
              <input
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Phone
              </div>
              <input
                value={draft.phone}
                onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Role
              </div>
              <select
                value={draft.role}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    role: event.target.value as AppRole,
                    adminScopes: event.target.value === "ADMIN" ? (prev.adminScopes ?? []) : [],
                  }))
                }
                className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              >
                {userRoleOptions
                  .filter((role) => canManageAdmins || (role !== "ADMIN" && role !== "SUPER_ADMIN"))
                  .map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </div>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, status: event.target.value as UserStatus }))
                }
                className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              >
                {userStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {draft.role === "SELLER" ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Seller slug
              </div>
              <input
                value={draft.sellerSlug ?? ""}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, sellerSlug: event.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              />
            </div>
          ) : null}

          {draft.role === "ADMIN" || draft.role === "SUPER_ADMIN" ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Admin title
              </div>
              <input
                value={draft.adminTitle ?? ""}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, adminTitle: event.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              />
            </div>
          ) : null}

          {draft.role === "ADMIN" && canManageAdmins ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Admin access
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {adminScopeOptions.map((scope) => {
                  const active = draft.adminScopes?.includes(scope) ?? false;
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          adminScopes: active
                            ? (prev.adminScopes ?? []).filter((item) => item !== scope)
                            : [...(prev.adminScopes ?? []), scope],
                        }))
                      }
                      className={`rounded-[12px] px-3 py-2.5 text-sm shadow-[var(--shadow-soft)] ${
                        active ? "bg-accent-soft text-primary" : "bg-surface text-foreground"
                      }`}
                    >
                      {getScopeLabel(scope)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {draft.id ? "Save changes" : "Create user"}
            </button>
            {draft.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 text-sm font-semibold text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
