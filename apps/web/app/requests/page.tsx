"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { requestsApi, projectsApi } from "../../lib/api";
import Link from "next/link";
import { Plus, Search, Inbox } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge, statusColor, priorityColor } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassInput, GlassSelect } from "../../components/ui/GlassInput";
import { EmptyState } from "../../components/ui/EmptyState";

const REQUEST_TYPES = ["bug","feedback","comment","support","user_question","change_request","uat_finding","bot_request"];
const REQUEST_STATUSES = [
  "draft","submitted","manager_approved","ba_review","waiting_estimate",
  "assigned_to_dev","in_development","ready_for_qa","in_qa","uat","completed","closed","rejected",
];

export default function RequestsPage() {
  const [filters, setFilters] = useState({ projectId: "", requestType: "", status: "", search: "" });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["requests", filters, page],
    queryFn: () => requestsApi.list({ ...filters, page: String(page), limit: "20" }),
  });
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  const requests = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;
  const projects = projectsData?.data ?? [];

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const columns = [
    { key: "requestNo", header: "No.", render: (v: any) => <span className="font-mono text-xs text-white/40">{v}</span> },
    { key: "subject", header: "Subject", render: (v: any, row: any) => (
      <Link href={`/requests/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors truncate max-w-[280px] block">{v}</Link>
    )},
    { key: "projectCode", header: "Project", render: (_: any, row: any) => (
      <span className="font-mono text-xs text-white/50">{row.projectCode ?? row.projectId ?? "—"}</span>
    )},
    { key: "requestType", header: "Type", render: (v: any) => (
      <span className="capitalize text-white/55 text-xs">{v?.replace(/_/g, " ")}</span>
    )},
    { key: "status", header: "Status", render: (v: any) => <GlassBadge color={statusColor(v)} label={v?.replace(/_/g, " ")} /> },
    { key: "priority", header: "Priority", render: (v: any) => v ? <GlassBadge color={priorityColor(v)} label={v} /> : <span className="text-white/30">—</span> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="All Requests"
        subtitle={`${total} total requests`}
        actions={
          <Link href="/requests/new">
            <GlassButton variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New Request
            </GlassButton>
          </Link>
        }
      />

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35 pointer-events-none" />
            <input
              className="glass-input w-full pl-9 pr-3 py-2 text-sm rounded-xs"
              placeholder="Search subject…"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>
          <GlassSelect
            value={filters.projectId}
            onChange={(e) => setFilter("projectId", e.target.value)}
            options={[
              { value: "", label: "All Projects" },
              ...projects.map((p: any) => ({ value: p.id, label: p.projectCode })),
            ]}
          />
          <GlassSelect
            value={filters.requestType}
            onChange={(e) => setFilter("requestType", e.target.value)}
            options={[
              { value: "", label: "All Types" },
              ...REQUEST_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") })),
            ]}
          />
          <GlassSelect
            value={filters.status}
            onChange={(e) => setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All Status" },
              ...REQUEST_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
            ]}
          />
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="p-0">
        <GlassTable
          columns={columns}
          rows={requests}
          loading={isLoading}
          empty={
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="No requests found"
              description="Try adjusting your filters"
            />
          }
        />
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/45">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </GlassButton>
            <GlassButton variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </GlassButton>
          </div>
        </div>
      )}
    </div>
  );
}
