"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { mitApi, projectsApi } from "../../lib/api";
import Link from "next/link";
import { WorkflowActionSheet } from "../../components/mit/WorkflowActionSheet";
import { Plus } from "lucide-react";

const STEPS = ["DEV", "QA", "UAT", "MA"];
const stepColors: Record<string, string> = {
  DEV: "bg-blue-100 text-blue-700 border-blue-200",
  QA: "bg-yellow-100 text-yellow-700 border-yellow-200",
  UAT: "bg-orange-100 text-orange-700 border-orange-200",
  MA: "bg-green-100 text-green-700 border-green-200",
};

export default function MitBoardPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedMitId, setSelectedMitId] = useState<number | null>(null);
  const [projectFilter, setProjectFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mit-items", { projectId: projectFilter }],
    queryFn: () => mitApi.list({ limit: "200", ...(projectFilter ? { projectId: projectFilter } : {}) }),
  });
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  const items: any[] = data?.data?.items ?? [];
  const projects = projectsData?.data ?? [];

  const byStep = STEPS.reduce((acc, s) => {
    acc[s] = items.filter((m) => m.currentStepCode === s);
    return acc;
  }, {} as Record<string, any[]>);
  const noStep = items.filter((m) => !m.currentStepCode);

  return (
    <div className="p-6 max-w-full mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MIT Work Board</h1>
          <p className="text-slate-500 text-sm mt-1">{items.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="text-sm border rounded-md px-3 py-2" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
          </select>
          <div className="flex border rounded-md overflow-hidden">
            <button onClick={() => setView("kanban")} className={`px-3 py-1.5 text-sm ${view === "kanban" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Kanban</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>List</button>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New MIT
          </button>
        </div>
      </div>

      {isLoading && <div className="text-slate-400 py-10 text-center">Loading…</div>}

      {/* Kanban View */}
      {view === "kanban" && !isLoading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...STEPS, "NEW"].map((step) => {
            const colItems = step === "NEW" ? noStep : byStep[step] ?? [];
            return (
              <div key={step} className="w-72 shrink-0">
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border ${stepColors[step] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  <span className="text-sm font-semibold">{step}</span>
                  <span className="text-xs font-medium">{colItems.length}</span>
                </div>
                <div className="bg-white border border-t-0 rounded-b-lg min-h-48 divide-y">
                  {colItems.map((m: any) => (
                    <div key={m.id} className="p-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/mit/${m.id}`} className="text-sm font-medium text-blue-600 hover:underline leading-tight">{m.title}</Link>
                        <button
                          onClick={() => setSelectedMitId(m.id)}
                          className="text-xs text-slate-400 hover:text-slate-700 shrink-0 mt-0.5"
                          title="Workflow action"
                        >⚡</button>
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-1">{m.mitNo}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{m.currentStatus}</span>
                        {m.priority && <span className="text-xs text-slate-400">{m.priority}</span>}
                      </div>
                    </div>
                  ))}
                  {colItems.length === 0 && <p className="p-3 text-xs text-slate-300 text-center">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && !isLoading && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Step</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.mitNo}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/mit/${m.id}`} className="text-blue-600 hover:underline truncate block">{m.title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {m.currentStepCode && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium border ${stepColors[m.currentStepCode] ?? ""}`}>{m.currentStepCode}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600 text-xs">{m.currentStatus}</td>
                  <td className="px-4 py-3 capitalize text-slate-500 text-xs">{m.priority ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{m.plannedEndDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedMitId(m.id)} className="text-xs text-blue-600 hover:underline">Action</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No MIT items</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {selectedMitId && (
        <WorkflowActionSheet
          mitId={selectedMitId}
          currentUserId={1}
          onClose={() => setSelectedMitId(null)}
        />
      )}
    </div>
  );
}
