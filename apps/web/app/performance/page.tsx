"use client";
import { useQuery } from "@tanstack/react-query";
import { performanceApi } from "../../lib/api";

export default function PerformancePage() {
  const { data, isLoading } = useQuery({ queryKey: ["performance-monthly"], queryFn: performanceApi.monthly });
  const rows = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Performance Dashboard</h1>
      <p className="text-slate-500 text-sm">Monthly performance snapshot by user and project.</p>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Project</th>
              <th className="px-5 py-3 text-left">Period</th>
              <th className="px-5 py-3 text-right">Assigned</th>
              <th className="px-5 py-3 text-right">Completed</th>
              <th className="px-5 py-3 text-right">Overdue</th>
              <th className="px-5 py-3 text-right">Avg Hours</th>
              <th className="px-5 py-3 text-right">Total Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium">{r.fullName}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.projectCode ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{r.yearNo}-{String(r.monthNo).padStart(2, "0")}</td>
                <td className="px-5 py-3 text-right">{r.assignedCount}</td>
                <td className="px-5 py-3 text-right text-green-700">{r.completedCount}</td>
                <td className="px-5 py-3 text-right text-red-600">{r.overdueCount}</td>
                <td className="px-5 py-3 text-right">{r.avgResolutionHours ?? "—"}</td>
                <td className="px-5 py-3 text-right">{r.totalActualHours ?? "—"}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No performance data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
