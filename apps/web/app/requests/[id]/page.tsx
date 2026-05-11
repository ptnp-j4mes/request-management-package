"use client";
import { useQuery } from "@tanstack/react-query";
import { requestsApi } from "../../../lib/api";
import { RequestActions } from "../../../components/requests/RequestActions";
import { StatusStepper } from "../../../components/requests/StatusStepper";
import Link from "next/link";

const typeColors: Record<string, string> = {
  bug: "bg-red-100 text-red-700",
  change_request: "bg-blue-100 text-blue-700",
  support: "bg-purple-100 text-purple-700",
  uat_finding: "bg-orange-100 text-orange-700",
};

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["request", params.id],
    queryFn: () => requestsApi.get(Number(params.id)),
    refetchOnWindowFocus: true,
  });
  const request = data?.data;

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!request) return <div className="p-6 text-red-500">Request not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/requests" className="hover:underline">Requests</Link>
        <span>/</span>
        <span className="text-slate-800 font-mono">{request.requestNo}</span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{request.subject}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[request.requestType] ?? "bg-slate-100 text-slate-700"}`}>
                {request.requestType?.replace("_", " ")}
              </span>
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">{request.status}</span>
              {request.priority && <span className="text-xs text-slate-500">Priority: <b>{request.priority}</b></span>}
            </div>
          </div>
          <span className="font-mono text-xs text-slate-400 shrink-0">{request.requestNo}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Channel:</span> <span className="font-medium capitalize">{request.channel}</span></div>
          <div><span className="text-slate-500">Urgency:</span> <span className="font-medium capitalize">{request.urgency ?? "—"}</span></div>
          <div><span className="text-slate-500">Assigned Team:</span> <span className="font-medium">{request.assignedTeam ?? "—"}</span></div>
          <div><span className="text-slate-500">Opened:</span> <span className="font-medium">{new Date(request.openedAt).toLocaleString()}</span></div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.description}</p>
        </div>
      </div>

      {/* Status Stepper */}
      <StatusStepper status={request.status} showPercent={true} />

      {/* Workflow Actions */}
      <RequestActions request={request} />

      {/* Comments */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Comments ({request.comments?.length ?? 0})</h2>
        <div className="space-y-3">
          {(request.comments ?? []).map((c: any) => (
            <div key={c.id} className="bg-slate-50 rounded-md p-3 text-sm">
              <p className="text-slate-500 text-xs mb-1">{new Date(c.createdAt).toLocaleString()}</p>
              <p className="text-slate-700">{c.commentText}</p>
            </div>
          ))}
          {(request.comments ?? []).length === 0 && <p className="text-slate-400 text-sm">No comments yet</p>}
        </div>
      </div>

      {/* Status History */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Status History ({request.history?.length ?? 0})</h2>
        <div className="space-y-2">
          {(request.history ?? []).map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 text-sm">
              <span className="text-slate-400 text-xs">{new Date(h.changedAt).toLocaleString()}</span>
              <span className="text-slate-500">{h.oldStatus ?? "—"}</span>
              <span className="text-slate-400">→</span>
              <span className="font-medium text-slate-800">{h.newStatus}</span>
              {h.remark && <span className="text-slate-400 text-xs">({h.remark})</span>}
            </div>
          ))}
          {(request.history ?? []).length === 0 && <p className="text-slate-400 text-sm">No status changes</p>}
        </div>
      </div>
    </div>
  );
}
