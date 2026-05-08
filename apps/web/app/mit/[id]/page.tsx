"use client";
import { useQuery } from "@tanstack/react-query";
import { mitApi } from "../../../lib/api";
import Link from "next/link";
import { useState } from "react";
import { WorkflowActionSheet } from "../../../components/mit/WorkflowActionSheet";

export default function MitDetailPage({ params }: { params: { id: string } }) {
  const [showAction, setShowAction] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["mit-item", params.id],
    queryFn: () => mitApi.get(Number(params.id)),
  });
  const mit = data?.data;

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!mit) return <div className="p-6 text-red-500">MIT item not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/mit" className="hover:underline">MIT Board</Link>
        <span>/</span>
        <span className="font-mono text-slate-800">{mit.mitNo}</span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{mit.title}</h1>
            <div className="flex gap-3 mt-2 text-sm">
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{mit.currentStepCode ?? "—"}</span>
              <span className="capitalize text-slate-600">{mit.currentStatus}</span>
              {mit.priority && <span className="capitalize text-slate-500">{mit.priority}</span>}
            </div>
          </div>
          <button
            onClick={() => setShowAction(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Workflow Action ⚡
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Module:</span> <b>{mit.moduleName ?? "—"}</b></div>
          <div><span className="text-slate-500">Type:</span> <b>{mit.itemType}</b></div>
          <div><span className="text-slate-500">Planned End:</span> <b>{mit.plannedEndDate ?? "—"}</b></div>
          <div><span className="text-slate-500">Estimated Hours:</span> <b>{mit.estimatedHours ?? "—"}</b></div>
          <div><span className="text-slate-500">QA Completed:</span> <b>{mit.qaCompletedAt ? new Date(mit.qaCompletedAt).toLocaleString() : "—"}</b></div>
          <div><span className="text-slate-500">UAT Completed:</span> <b>{mit.uatCompletedAt ? new Date(mit.uatCompletedAt).toLocaleString() : "—"}</b></div>
          <div><span className="text-slate-500">Deployed:</span> <b>{mit.deployedAt ? new Date(mit.deployedAt).toLocaleString() : "—"}</b></div>
        </div>

        {mit.description && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
            <p className="text-sm text-slate-600">{mit.description}</p>
          </div>
        )}
      </div>

      {/* Step Assignments */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Step Assignments ({mit.assignments?.length ?? 0})</h2>
        <div className="space-y-2 text-sm">
          {(mit.assignments ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center gap-4 bg-slate-50 rounded px-3 py-2">
              <span className="font-mono text-xs text-slate-400">Step {a.stepId}</span>
              <span>User {a.assignedUserId}</span>
              <span className="capitalize">{a.assignedRole}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${a.assignmentStatus === "completed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{a.assignmentStatus}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Handoffs */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Handoffs ({mit.handoffs?.length ?? 0})</h2>
        <div className="space-y-2 text-sm">
          {(mit.handoffs ?? []).map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 bg-slate-50 rounded px-3 py-2">
              <span className="text-slate-500 text-xs">{new Date(h.handedOffAt).toLocaleString()}</span>
              <span>Step {h.fromStepId} → {h.toStepId}</span>
              <span className="text-xs capitalize">{h.handoffStatus}</span>
              {h.note && <span className="text-slate-400 text-xs">"{h.note}"</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Status History */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Status History</h2>
        <div className="space-y-2 text-sm">
          {(mit.history ?? []).map((h: any) => (
            <div key={h.id} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs">{new Date(h.changedAt).toLocaleString()}</span>
              <span className="text-slate-500">{h.oldStatus ?? "—"}</span>
              <span>→</span>
              <span className="font-medium">{h.newStatus}</span>
              {h.remark && <span className="text-slate-400 text-xs">({h.remark})</span>}
            </div>
          ))}
        </div>
      </div>

      {showAction && (
        <WorkflowActionSheet mitId={mit.id} currentUserId={1} onClose={() => setShowAction(false)} />
      )}
    </div>
  );
}
