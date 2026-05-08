"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { requestsApi, projectsApi } from "../../lib/api";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
          <p className="text-slate-500 text-sm mt-1">{total} total</p>
        </div>
        <Link href="/requests/new" className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search subject…"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select className="text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.projectId} onChange={(e) => setFilter("projectId", e.target.value)}>
          <option value="">All Projects</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
        </select>
        <select className="text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.requestType} onChange={(e) => setFilter("requestType", e.target.value)}>
          <option value="">All Types</option>
          {["bug", "feedback", "comment", "support", "user_question", "change_request", "uat_finding", "bot_request"].map((t) => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
        <select className="text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All Status</option>
          {["new", "open", "in_progress", "waiting", "resolved", "closed", "rejected"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">No.</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {requests.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.requestNo}</td>
                <td className="px-4 py-3 max-w-xs">
                  <Link href={`/requests/${r.id}`} className="text-blue-600 hover:underline truncate block">{r.subject}</Link>
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.projectId}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{r.requestType?.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">{r.status}</span>
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">{r.priority ?? "—"}</td>
              </tr>
            ))}
            {!isLoading && requests.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No requests found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border rounded-md disabled:opacity-40 hover:bg-slate-100">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 border rounded-md disabled:opacity-40 hover:bg-slate-100">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
