"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Link } from "@/components/navigation/Link";
import { AdminScopeGate } from "@/components/admin/AdminCommon";
import { AdminEmptyState, AdminPageHeader, AdminPill } from "@/components/admin/AdminUI";
import {
  OperationsDetailPanel,
  OperationsKeyValue,
  OperationsMobileCard,
  OperationsMobileList,
  OperationsPager,
  OperationsPanel,
  OperationsRow,
  OperationsSearch,
  OperationsSelect,
  OperationsTable,
  OperationsTabs,
  OperationsTd,
  OperationsTh,
  OperationsToolbar,
  OperationsWorkspace,
} from "@/components/admin/OperationsUI";
import { UserManagementDialog } from "@/components/admin/UserManagementDialog";
import { getUserOrderHistory, getUserPaymentHistory } from "@/modules/marketplace/admin-selectors";
import { canAccessAdminScope } from "@/modules/marketplace/permissions";
import { useMarketplace } from "@/modules/marketplace/store";
import type { AdminUserInput, AppRole, UserStatus, MarketplaceUser } from "@/modules/marketplace/types";

const userRoleOptions: AppRole[] = ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN"];
const userStatusOptions: UserStatus[] = ["ACTIVE", "SUSPENDED", "INVITED"];

const blankUser: AdminUserInput = {
  name: "",
  email: "",
  phone: "",
  role: "CUSTOMER",
  status: "ACTIVE",
  adminScopes: [],
};

const USERS_PER_PAGE = 12;

export default function AdminUsersPage() {
  const { currentUser, state, saveUserRecord, deleteUserRecord } = useMarketplace();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<AdminUserInput | null>(null);
  const [page, setPage] = useState(1);

  const canManageAdmins = canAccessAdminScope(currentUser, "admins");

  const filteredUsers = useMemo(() => {
    return state.users
      .filter((user) => {
        const searchable = `${user.name} ${user.email} ${user.phone}`.toLowerCase();
        return (
          (!query.trim() || searchable.includes(query.toLowerCase())) &&
          (roleFilter === "ALL" || user.role === roleFilter) &&
          (statusFilter === "ALL" || user.status === statusFilter)
        );
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [query, roleFilter, state.users, statusFilter]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId);
  const selectedUserOrders = selectedUser ? getUserOrderHistory(state, selectedUser.id) : [];
  const selectedUserPayments = selectedUser ? getUserPaymentHistory(state, selectedUser.id) : [];
  const totalPages = Math.max(Math.ceil(filteredUsers.length / USERS_PER_PAGE), 1);
  const paginatedUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId && filteredUsers.some((user) => user.id === focusId)) {
      setSelectedUserId(focusId);
    }
  }, [filteredUsers, searchParams]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter]);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId("");
      return;
    }

    if (!filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  const handleEditUser = (user: MarketplaceUser) => {
    setModalUser({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      sellerSlug: user.sellerSlug,
      adminTitle: user.adminTitle,
      adminScopes: user.adminScopes ?? [],
    });
    setModalOpen(true);
  };

  const handleSaveUser = (user: AdminUserInput) => {
    saveUserRecord(user);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserRecord(userId);
    setSelectedUserId("");
  };

  return (
    <AdminScopeGate scope="users" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="User management"
          title="Users, roles, and account access"
          description="Manage customers, sellers, and internal staff with clear role-based controls, lifecycle status, and quick access to account history."
          actions={
            <button
              type="button"
              onClick={() => {
                setModalUser(blankUser);
                setModalOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              <UserPlus className="h-4 w-4" />
              New user
            </button>
          }
        />

        <OperationsWorkspace>
          <OperationsPanel title="User directory" description="Table-first management with role tabs, filters, pagination, and contextual actions.">
            <OperationsToolbar>
              <div className="grid gap-2">
                <OperationsTabs
                  active={roleFilter}
                  onChange={(value) => setRoleFilter(value as AppRole | "ALL")}
                  tabs={[
                    { value: "ALL", label: "All", count: state.users.length },
                    ...userRoleOptions.map((role) => ({
                      value: role,
                      label: role.replaceAll("_", " "),
                      count: state.users.filter((user) => user.role === role).length,
                    })),
                  ]}
                />
                <OperationsSearch value={query} onChange={setQuery} placeholder="Search by name, email, or phone" />
              </div>
              <OperationsSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as UserStatus | "ALL")}
                label="Status"
              >
                <option value="ALL">All statuses</option>
                {userStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </OperationsSelect>
            </OperationsToolbar>

            <OperationsTable minWidth="760px">
              <thead>
                <tr>
                  <OperationsTh>User</OperationsTh>
                  <OperationsTh>Role</OperationsTh>
                  <OperationsTh>Status</OperationsTh>
                  <OperationsTh>Joined</OperationsTh>
                  <OperationsTh className="text-right">Actions</OperationsTh>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <OperationsRow
                    key={user.id}
                    selected={user.id === selectedUserId}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <OperationsTd>
                      <div className="font-semibold text-foreground">{user.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{user.email}</div>
                    </OperationsTd>
                    <OperationsTd>
                      <AdminPill tone={user.role.includes("ADMIN") ? "info" : user.role === "SELLER" ? "warning" : "default"}>
                        {user.role.replaceAll("_", " ")}
                      </AdminPill>
                    </OperationsTd>
                    <OperationsTd>
                      <AdminPill tone={user.status === "ACTIVE" ? "success" : user.status === "SUSPENDED" ? "danger" : "warning"}>
                        {user.status}
                      </AdminPill>
                    </OperationsTd>
                    <OperationsTd className="whitespace-nowrap text-xs text-muted-foreground">{formatShortDate(user.createdAt)}</OperationsTd>
                    <OperationsTd>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditUser(user);
                          }}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 text-xs font-bold"
                        >
                          Edit
                        </button>
                        <Link
                          href={`/admin/users/${user.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 text-xs font-bold"
                        >
                          Detail
                        </Link>
                      </div>
                    </OperationsTd>
                  </OperationsRow>
                ))}
              </tbody>
            </OperationsTable>

            <OperationsMobileList>
              {paginatedUsers.map((user) => (
                <OperationsMobileCard
                  key={user.id}
                  selected={user.id === selectedUserId}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-foreground">{user.name}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{user.email}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <AdminPill tone={user.role.includes("ADMIN") ? "info" : user.role === "SELLER" ? "warning" : "default"}>
                          {user.role.replaceAll("_", " ")}
                        </AdminPill>
                        <AdminPill tone={user.status === "ACTIVE" ? "success" : user.status === "SUSPENDED" ? "danger" : "warning"}>
                          {user.status}
                        </AdminPill>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditUser(user);
                      }}
                      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border/70 px-3 text-xs font-bold"
                    >
                      Edit
                    </button>
                  </div>
                </OperationsMobileCard>
              ))}
            </OperationsMobileList>

            {filteredUsers.length === 0 ? (
              <div className="p-3">
                <AdminEmptyState title="No users found" body="Try adjusting your search or filters." />
              </div>
            ) : null}

            <OperationsPager
              page={page}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              pageSize={USERS_PER_PAGE}
              onPageChange={setPage}
            />
          </OperationsPanel>

          <OperationsDetailPanel
            title={selectedUser ? selectedUser.name : "User detail"}
            subtitle={selectedUser ? selectedUser.email : "Open a user from the directory."}
            meta={
              selectedUser ? (
                <>
                  <AdminPill>{selectedUser.role.replaceAll("_", " ")}</AdminPill>
                  <AdminPill tone={selectedUser.status === "ACTIVE" ? "success" : "danger"}>{selectedUser.status}</AdminPill>
                </>
              ) : null
            }
            actions={
              selectedUser ? (
                <button
                  type="button"
                  onClick={() => handleEditUser(selectedUser)}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
                >
                  Edit
                </button>
              ) : null
            }
            empty={<AdminEmptyState title="Pick a user" body="Open a user from the table to see order and payment history." />}
          >
            {selectedUser ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <SummaryBox label="Orders" value={String(selectedUserOrders.length)} />
                  <SummaryBox label="Payments" value={String(selectedUserPayments.length)} />
                </div>
                <div className="rounded-[14px] border border-border/70 bg-background p-3">
                  <OperationsKeyValue label="Phone" value={selectedUser.phone} />
                  <OperationsKeyValue label="Joined" value={formatShortDate(selectedUser.createdAt)} />
                  <OperationsKeyValue label="Seller slug" value={selectedUser.sellerSlug ?? "Not linked"} />
                  <OperationsKeyValue label="Admin title" value={selectedUser.adminTitle ?? "Not assigned"} />
                </div>
                <Link
                  href={`/admin/users/${selectedUser.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border/70 text-sm font-bold"
                >
                  Open full account profile
                </Link>
              </div>
            ) : null}
          </OperationsDetailPanel>
        </OperationsWorkspace>

        <UserManagementDialog
          open={modalOpen}
          user={modalUser}
          currentUser={currentUser}
          onOpenChange={setModalOpen}
          onSave={handleSaveUser}
          onDelete={handleDeleteUser}
        />
      </div>
    </AdminScopeGate>
  );
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-surface px-4 py-4 text-center shadow-[var(--shadow-soft)]">
      <div className="text-xl font-black tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
