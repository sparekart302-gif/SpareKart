"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCompactStat, AdminScopeGate } from "@/components/admin/AdminCommon";
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
  OperationsTd,
  OperationsTh,
  OperationsToolbar,
  OperationsWorkspace,
} from "@/components/admin/OperationsUI";
import { useMarketplace } from "@/modules/marketplace/store";

const LOGS_PER_PAGE = 14;

export default function AdminAuditLogsPage() {
  const { currentUser, state } = useMarketplace();
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [selectedLogId, setSelectedLogId] = useState("");
  const [page, setPage] = useState(1);

  const actions = Array.from(new Set(state.auditTrail.map((entry) => entry.action))).sort();

  const filteredLogs = useMemo(() => {
    return state.auditTrail
      .filter((entry) => {
        const actor = state.users.find((user) => user.id === entry.actorUserId);
        const searchable = `${entry.action} ${entry.note ?? ""} ${actor?.name ?? ""}`.toLowerCase();
        return (!query.trim() || searchable.includes(query.trim().toLowerCase())) &&
          (actionFilter === "ALL" || entry.action === actionFilter);
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [actionFilter, query, state.auditTrail, state.users]);

  const totalPages = Math.max(Math.ceil(filteredLogs.length / LOGS_PER_PAGE), 1);
  const paginatedLogs = filteredLogs.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);
  const selectedLog = filteredLogs.find((entry) => entry.id === selectedLogId);
  const selectedActor = selectedLog
    ? state.users.find((user) => user.id === selectedLog.actorUserId)
    : undefined;

  useEffect(() => {
    setPage(1);
  }, [actionFilter, query]);

  useEffect(() => {
    if (!filteredLogs.length) {
      setSelectedLogId("");
      return;
    }

    if (!filteredLogs.some((entry) => entry.id === selectedLogId)) {
      setSelectedLogId(filteredLogs[0].id);
    }
  }, [filteredLogs, selectedLogId]);

  return (
    <AdminScopeGate scope="audit" currentUser={currentUser}>
      <div className="space-y-4">
        <AdminPageHeader
          eyebrow="Audit logs"
          title="Admin action history and compliance trail"
          description="Search every sensitive marketplace action by event type, operator, and timestamp for auditability and operational review."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminCompactStat label="Events" value={String(state.auditTrail.length)} helper="All recorded actions" />
          <AdminCompactStat label="Today" value={String(state.auditTrail.filter((entry) => entry.createdAt.startsWith(new Date().toISOString().slice(0, 10))).length)} helper="Events in current UTC day" />
          <AdminCompactStat label="Admins" value={String(new Set(state.auditTrail.map((entry) => entry.actorUserId)).size)} helper="Distinct actors" />
          <AdminCompactStat label="Filtered" value={String(filteredLogs.length)} helper="Matching current search" />
        </section>

        <OperationsWorkspace>
          <OperationsPanel title="Audit stream" description="Filter high-volume action logs, then inspect event metadata in the side panel.">
            <OperationsToolbar>
              <OperationsSearch
                value={query}
                onChange={setQuery}
                placeholder="Search by action, note, or actor"
              />
              <OperationsSelect value={actionFilter} onChange={setActionFilter}>
                <option value="ALL">All actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action.replaceAll("_", " ")}
                  </option>
                ))}
              </OperationsSelect>
            </OperationsToolbar>

            <OperationsTable minWidth="720px">
              <thead>
                <tr>
                  <OperationsTh>Event</OperationsTh>
                  <OperationsTh>Actor</OperationsTh>
                  <OperationsTh>Role</OperationsTh>
                  <OperationsTh>Timestamp</OperationsTh>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((entry) => {
                  const actor = state.users.find((user) => user.id === entry.actorUserId);
                  return (
                    <OperationsRow
                      key={entry.id}
                      selected={entry.id === selectedLogId}
                      onClick={() => setSelectedLogId(entry.id)}
                    >
                      <OperationsTd>
                        <div className="flex flex-wrap items-center gap-2">
                          <AdminPill tone="info">{entry.action.replaceAll("_", " ")}</AdminPill>
                        </div>
                        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{entry.note ?? "No note recorded"}</div>
                      </OperationsTd>
                      <OperationsTd>
                        <div className="font-semibold text-foreground">{actor?.name ?? "System"}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{actor?.email ?? "Automated event"}</div>
                      </OperationsTd>
                      <OperationsTd>
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          {entry.actorRole.replaceAll("_", " ")}
                        </span>
                      </OperationsTd>
                      <OperationsTd className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </OperationsTd>
                    </OperationsRow>
                  );
                })}
              </tbody>
            </OperationsTable>

            <OperationsMobileList>
              {paginatedLogs.map((entry) => {
                const actor = state.users.find((user) => user.id === entry.actorUserId);
                return (
                  <OperationsMobileCard
                    key={entry.id}
                    selected={entry.id === selectedLogId}
                    onClick={() => setSelectedLogId(entry.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <AdminPill tone="info">{entry.action.replaceAll("_", " ")}</AdminPill>
                        <div className="mt-2 truncate text-sm font-bold text-foreground">{actor?.name ?? "System"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-right text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        {entry.actorRole.replaceAll("_", " ")}
                      </div>
                    </div>
                    {entry.note ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{entry.note}</p> : null}
                  </OperationsMobileCard>
                );
              })}
            </OperationsMobileList>

            {filteredLogs.length === 0 ? (
              <div className="p-3">
                <AdminEmptyState title="No audit logs found" body="Try adjusting your search or action filter." />
              </div>
            ) : null}

            <OperationsPager
              page={page}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              pageSize={LOGS_PER_PAGE}
              onPageChange={setPage}
            />
          </OperationsPanel>

          <OperationsDetailPanel
            title={selectedLog ? selectedLog.action.replaceAll("_", " ") : "Audit detail"}
            subtitle={selectedLog ? `Recorded ${new Date(selectedLog.createdAt).toLocaleString()}` : "Choose an event from the audit stream."}
            meta={selectedLog ? <AdminPill tone="info">{selectedLog.actorRole.replaceAll("_", " ")}</AdminPill> : null}
            empty={<AdminEmptyState title="Select an event" body="Pick an audit row to inspect actor, timestamp, and note details." />}
          >
            {selectedLog ? (
              <div className="space-y-3">
                <div className="rounded-[14px] border border-border/70 bg-background p-3">
                  <OperationsKeyValue label="Actor" value={selectedActor?.name ?? "System"} />
                  <OperationsKeyValue label="Email" value={selectedActor?.email ?? "Automated event"} />
                  <OperationsKeyValue label="Role" value={selectedLog.actorRole.replaceAll("_", " ")} />
                  <OperationsKeyValue label="Event ID" value={selectedLog.id} />
                </div>
                <div className="rounded-[14px] border border-border/70 bg-background p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Audit note</div>
                  <p className="mt-2 text-sm leading-6 text-foreground/80">{selectedLog.note ?? "No note was stored with this audit event."}</p>
                </div>
              </div>
            ) : null}
          </OperationsDetailPanel>
        </OperationsWorkspace>
      </div>
    </AdminScopeGate>
  );
}
