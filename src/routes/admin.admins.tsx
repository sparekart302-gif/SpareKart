"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminField, AdminScopeGate } from "@/components/admin/AdminCommon";
import { AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminUI";
import { getScopeLabel } from "@/modules/marketplace/admin-selectors";
import { useMarketplace } from "@/modules/marketplace/store";
import type { AdminScope, AdminUserInput } from "@/modules/marketplace/types";

const adminScopes: AdminScope[] = [
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

const blankAdmin: AdminUserInput = {
  name: "",
  email: "",
  phone: "",
  role: "ADMIN",
  status: "ACTIVE",
  adminTitle: "",
  adminScopes: ["dashboard", "orders", "payments"],
};

export default function AdminAdminsPage() {
  const { currentUser, state, saveUserRecord, deleteUserRecord } = useMarketplace();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draft, setDraft] = useState<AdminUserInput>(blankAdmin);

  const adminUsers = useMemo(
    () => state.users.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN"),
    [state.users],
  );

  const selectedUser = adminUsers.find((user) => user.id === selectedUserId);

  useEffect(() => {
    if (selectedUser) {
      setDraft({
        id: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        role: selectedUser.role,
        status: selectedUser.status,
        adminTitle: selectedUser.adminTitle ?? "",
        adminScopes:
          selectedUser.role === "SUPER_ADMIN" ? adminScopes : (selectedUser.adminScopes ?? []),
      });
      return;
    }

    setDraft(blankAdmin);
  }, [selectedUser]);

  return (
    <AdminScopeGate
      scope="admins"
      currentUser={currentUser}
      superAdminOnly
      title="Super admin workspace"
      description="Admin role management is restricted to the super admin because it controls privileged marketplace access."
    >
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Admin roles"
          title="Internal admin team and permission design"
          description="Create admin operators, assign focused scopes, and control privileged access to marketplace workflows."
          actions={
            <button
              type="button"
              onClick={() => {
                setSelectedUserId("");
                setDraft(blankAdmin);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              <ShieldPlus className="h-4 w-4" />
              New admin
            </button>
          }
        />

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <AdminPanel title="Admin team">
            <div className="space-y-3">
              {adminUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  className={`w-full rounded-[22px] p-4 text-left shadow-[var(--shadow-soft)] transition-colors ${
                    selectedUserId === user.id
                      ? "bg-accent-soft"
                      : "bg-surface hover:bg-accent-soft/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-foreground">{user.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {user.adminTitle ?? user.role}
                      </div>
                    </div>
                    <AdminPill tone={user.role === "SUPER_ADMIN" ? "info" : "success"}>
                      {user.role.replaceAll("_", " ")}
                    </AdminPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(user.role === "SUPER_ADMIN" ? adminScopes : (user.adminScopes ?? []))
                      .slice(0, 4)
                      .map((scope) => (
                        <AdminPill key={`${user.id}-${scope}`}>{getScopeLabel(scope)}</AdminPill>
                      ))}
                  </div>
                </button>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel title={draft.id ? "Edit admin access" : "Create admin access"}>
            <div className="space-y-4">
              <AdminField label="Full name">
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                />
              </AdminField>
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Email">
                  <input
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, email: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
                <AdminField label="Phone">
                  <input
                    value={draft.phone}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, phone: event.target.value }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  />
                </AdminField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Role">
                  <select
                    value={draft.role}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        role: event.target.value as "ADMIN" | "SUPER_ADMIN",
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super admin</option>
                  </select>
                </AdminField>
                <AdminField label="Status">
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        status: event.target.value as "ACTIVE" | "SUSPENDED" | "INVITED",
                      }))
                    }
                    className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INVITED">INVITED</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </AdminField>
              </div>
              <AdminField label="Admin title">
                <input
                  value={draft.adminTitle ?? ""}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, adminTitle: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl bg-surface px-3 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                />
              </AdminField>

              {draft.role === "ADMIN" ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Permission scopes
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {adminScopes.map((scope) => {
                      const active = draft.adminScopes?.includes(scope) ?? false;
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() =>
                            setDraft((previous) => ({
                              ...previous,
                              adminScopes: active
                                ? (previous.adminScopes ?? []).filter((item) => item !== scope)
                                : [...(previous.adminScopes ?? []), scope],
                            }))
                          }
                          className={`rounded-[18px] px-3 py-3 text-left text-sm font-semibold shadow-[var(--shadow-soft)] ${
                            active ? "bg-accent-soft text-primary" : "bg-surface text-foreground"
                          }`}
                        >
                          {getScopeLabel(scope)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] bg-accent-soft px-4 py-4 text-sm text-primary">
                  Super admins automatically receive full marketplace access.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      saveUserRecord(draft);
                      toast.success(draft.id ? "Admin updated." : "Admin created.");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to save admin.");
                    }
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Save admin
                </button>
                {draft.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        deleteUserRecord(draft.id!);
                        toast.success("Admin removed.");
                        setSelectedUserId("");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Unable to remove admin.",
                        );
                      }
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive/10 px-5 text-sm font-semibold text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete admin
                  </button>
                ) : null}
              </div>
            </div>
          </AdminPanel>
        </section>
      </div>
    </AdminScopeGate>
  );
}
