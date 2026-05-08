"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { workloadApi } from "../../lib/api";
import { StatCard } from "../../components/dashboard/StatCard";

export default function WorkloadPage() {
  const [tab, setTab] = useState<"user" | "project" | "overdue">("user");

  const { data: byUser } = useQuery({ queryKey: ["workload-by-user"], queryFn: workloadApi.byUser });
  const { data: byProject } = useQuery({ queryKey: ["workload-by-project"], queryFn: workloadApi.byProject });
  const { data: overdue } = useQuery({ queryKey: ["workload-overdue"], queryFn: workloadApi.overdue });

  const users = byUser?.data ?? [];
  const projects = byProject?.data ?? [];
  const overdueItems = overdue?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Workload Report</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {[{ key: "user", label: "By User" }, { key: "project", label: "By Project" }, { key: "overdue", label: `Overdue (${overdueItems.length})` }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "user" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-right">On Hand</th>
                <th className="px-5 py-3 text-right">Waiting Test</th>
                <th className="px-5 py-3 text-right">Waiting UAT</th>
                <th className="px-5 py-3 text-right">Deployed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u: any) => (
                <tr key={u.userId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">{u.fullName}</td>
                  <td className="px-5 py-3 text-slate-500">{u.roleName ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-medium">{u.onHand}</td>
                  <td className="px-5 py-3 text-right text-yellow-700">{u.waitingTest}</td>
                  <td className="px-5 py-3 text-right text-orange-700">{u.waitingUat}</td>
                  <td className="px-5 py-3 text-right text-green-700">{u.deployed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "project" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Project</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">On Hand</th>
                <th className="px-5 py-3 text-right">Waiting Test</th>
                <th className="px-5 py-3 text-right">Waiting UAT</th>
                <th className="px-5 py-3 text-right">Deployed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p: any) => (
                <tr key={p.projectId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">
                    <span className="font-mono text-xs mr-2 text-slate-400">{p.projectCode}</span>
                    {p.projectName}
                  </td>
                  <td className="px-5 py-3 text-right">{p.total}</td>
                  <td className="px-5 py-3 text-right font-medium">{p.onHand}</td>
                  <td className="px-5 py-3 text-right text-yellow-700">{p.waitingTest}</td>
                  <td className="px-5 py-3 text-right text-orange-700">{p.waitingUat}</td>
                  <td className="px-5 py-3 text-right text-green-700">{p.deployed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "overdue" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">No.</th>
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Step</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Planned End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overdueItems.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-red-600">{m.mitNo}</td>
                  <td className="px-5 py-3">{m.title}</td>
                  <td className="px-5 py-3 font-mono text-xs">{m.currentStepCode ?? "—"}</td>
                  <td className="px-5 py-3 capitalize">{m.currentStatus}</td>
                  <td className="px-5 py-3 text-red-600 font-medium">{m.plannedEndDate}</td>
                </tr>
              ))}
              {overdueItems.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No overdue items 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
