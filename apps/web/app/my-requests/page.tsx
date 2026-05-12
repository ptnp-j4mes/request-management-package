"use client";
import { useQuery } from "@tanstack/react-query";
import { requestsApi } from "../../lib/api";
import { StatusStepper } from "../../components/requests/StatusStepper";
import Link from "next/link";
import { Plus, Clock, CheckCircle, XCircle } from "lucide-react";

const typeColors: Record<string, string> = {
  bug: "bg-red-100 text-red-700",
  change_request: "bg-blue-100 text-blue-700",
  support: "bg-purple-100 text-purple-700",
  uat_finding: "bg-orange-100 text-orange-700",
};

const ACTIVE_STATUSES = [
  "submitted", "manager_approved", "ba_review", "waiting_estimate",
  "assigned_to_dev", "in_development", "ready_for_qa", "in_qa", "uat",
];
const DRAFT_STATUSES = ["draft"];
const DONE_STATUSES  = ["completed", "closed", "rejected"];

export default function MyRequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => requestsApi.list({ limit: "100" }),
  });

  const all: any[] = data?.data?.items ?? [];

  const draft    = all.filter((r) => DRAFT_STATUSES.includes(r.status));
  const active   = all.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const done     = all.filter((r) => DONE_STATUSES.includes(r.status));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">คำขอของฉัน</h1>
          <p className="text-slate-500 text-sm mt-1">ติดตามสถานะคำขอทั้งหมดของคุณ</p>
        </div>
        <Link
          href="/requests/new"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> ส่งคำขอใหม่
        </Link>
      </div>

      {isLoading && (
        <div className="text-slate-400 text-sm py-8 text-center">กำลังโหลด…</div>
      )}

      {!isLoading && all.length === 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-10 text-center">
          <p className="text-slate-400 text-sm">ยังไม่มีคำขอ</p>
          <Link href="/requests/new" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
            ส่งคำขอแรกของคุณ →
          </Link>
        </div>
      )}

      {/* Draft */}
      {draft.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" /> แบบร่าง ({draft.length})
          </h2>
          {draft.map((r) => <RequestCard key={r.id} request={r} />)}
        </section>
      )}

      {/* Active */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" /> กำลังดำเนินการ ({active.length})
          </h2>
          {active.map((r) => <RequestCard key={r.id} request={r} />)}
        </section>
      )}

      {/* Done */}
      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> เสร็จสิ้น / ปิด ({done.length})
          </h2>
          {done.map((r) => <RequestCard key={r.id} request={r} compact />)}
        </section>
      )}
    </div>
  );
}

function RequestCard({ request, compact = false }: { request: any; compact?: boolean }) {
  const isRejected  = request.status === "rejected";
  const isCompleted = request.status === "completed";
  const isClosed    = request.status === "closed";

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 space-y-3 ${compact ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-slate-400">{request.requestNo}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[request.requestType] ?? "bg-slate-100 text-slate-600"}`}>
              {request.requestType?.replace("_", " ")}
            </span>
            {request.priority && (
              <span className="text-xs text-slate-400 capitalize">{request.priority}</span>
            )}
          </div>
          <Link
            href={`/requests/${request.id}`}
            className="text-sm font-semibold text-slate-900 hover:text-blue-600 mt-1 block truncate"
          >
            {request.subject}
          </Link>
        </div>
        <div className="shrink-0">
          {isRejected  && <XCircle     className="h-5 w-5 text-red-400"   />}
          {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
          {isClosed    && <CheckCircle className="h-5 w-5 text-slate-400" />}
        </div>
      </div>

      {/* Status stepper — compact */}
      {!compact && (
        <StatusStepper status={request.status} showPercent={true} compact={true} />
      )}

      {compact && (
        <p className="text-xs text-slate-400">
          {isCompleted ? "✓ ดำเนินการเสร็จสิ้นแล้ว" :
           isClosed    ? "■ ปิดแล้ว" :
           isRejected  ? "✗ ถูกปฏิเสธ" : request.status}
          {request.updatedAt && ` · ${new Date(request.updatedAt).toLocaleDateString("th-TH")}`}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>อัปเดต: {request.updatedAt ? new Date(request.updatedAt).toLocaleString("th-TH") : "—"}</span>
        <Link href={`/requests/${request.id}`} className="text-blue-600 hover:underline">
          ดูรายละเอียด →
        </Link>
      </div>
    </div>
  );
}
