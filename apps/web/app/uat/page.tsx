"use client";
import { useQuery } from "@tanstack/react-query";
import { uatApi } from "../../lib/api";
import Link from "next/link";

export default function UatPage() {
  const { data, isLoading } = useQuery({ queryKey: ["uat-cycles"], queryFn: uatApi.cycles });
  const cycles = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">UAT Management</h1>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Cycle Name</th>
              <th className="px-5 py-3 text-left">Project</th>
              <th className="px-5 py-3 text-left">Start</th>
              <th className="px-5 py-3 text-left">End</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {cycles.map((c: any) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/uat/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.cycleName}</Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{c.projectId}</td>
                <td className="px-5 py-3 text-slate-600">{c.startDate ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{c.endDate ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    c.status === "active" ? "bg-green-100 text-green-700" :
                    c.status === "completed" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>{c.status}</span>
                </td>
              </tr>
            ))}
            {!isLoading && cycles.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No UAT cycles</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
