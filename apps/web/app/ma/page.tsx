"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export default function MaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-agreements"],
    queryFn: () => api.get<any>("/maintenance-agreements"),
  });
  const mas = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">MA Coverage</h1>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">ID</th>
              <th className="px-5 py-3 text-left">Project</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">Start</th>
              <th className="px-5 py-3 text-left">End</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {mas.map((ma: any) => (
              <tr key={ma.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs text-slate-400">#{ma.id}</td>
                <td className="px-5 py-3 font-mono text-xs">{ma.projectId}</td>
                <td className="px-5 py-3 capitalize">{ma.maType}</td>
                <td className="px-5 py-3">{ma.startDate}</td>
                <td className="px-5 py-3">{ma.endDate}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ma.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{ma.status}</span>
                </td>
              </tr>
            ))}
            {!isLoading && mas.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No maintenance agreements</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
