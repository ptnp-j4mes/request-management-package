"use client";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../../lib/api";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const projects = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} projects</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Code</th>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Customer</th>
              <th className="px-5 py-3 text-left">Start Date</th>
              <th className="px-5 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {projects.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs font-medium">{p.projectCode}</td>
                <td className="px-5 py-3">
                  <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline font-medium">{p.projectName}</Link>
                </td>
                <td className="px-5 py-3 text-slate-600">{p.customerName ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">{p.startDate ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && projects.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No projects found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
