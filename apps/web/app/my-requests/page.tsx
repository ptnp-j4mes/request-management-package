"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requestsApi } from "../../lib/api";
import Link from "next/link";
import { Plus, Clock, CheckCircle, XCircle, Inbox, AlertTriangle } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassTabs } from "../../components/ui/GlassTabs";
import { GlassStepper } from "../../components/ui/GlassStepper";
import { EmptyState } from "../../components/ui/EmptyState";

const REQUEST_STEPS = [
  "draft","submitted","manager_approved","ba_review","waiting_estimate",
  "assigned_to_dev","in_development","ready_for_qa","in_qa","uat","completed",
];
const STEP_LABELS = ["Draft","Submitted","Approved","BA","Estimate","Assign Dev","In Dev","Ready QA","In QA","UAT","Done"];

function requestStepperSteps(status: string) {
  const idx = REQUEST_STEPS.indexOf(status);
  return STEP_LABELS.map((label, i) => ({
    label,
    status: i < idx ? "done" : i === idx ? "active" : "pending",
  })) as { label: string; status: "done" | "active" | "pending" }[];
}

const TYPE_COLOR: Record<string, "red" | "blue" | "purple" | "orange" | "slate"> = {
  bug: "red",
  change_request: "blue",
  support: "purple",
  uat_finding: "orange",
};

const ACTIVE_STATUSES = [
  "submitted","manager_approved","ba_review","waiting_estimate",
  "assigned_to_dev","in_development","ready_for_qa","in_qa","uat",
];

const TABS = [
  { id: "all",    label: "All" },
  { id: "draft",  label: "Draft" },
  { id: "active", label: "Active" },
  { id: "uat",    label: "UAT" },
  { id: "done",   label: "Done" },
];

export default function MyRequestsPage() {
  const [tab, setTab] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-requests"],
    queryFn: () => requestsApi.list({ limit: "100" }),
  });

  const all: any[] = data?.data?.items ?? [];
  const uatWaiting = all.filter((r) => r.status === "uat");

  const filtered = all.filter((r) => {
    if (tab === "all")    return true;
    if (tab === "draft")  return r.status === "draft";
    if (tab === "active") return ACTIVE_STATUSES.includes(r.status);
    if (tab === "uat")    return r.status === "uat";
    if (tab === "done")   return ["completed","closed","rejected"].includes(r.status);
    return true;
  });

  const tabsWithCount = TABS.map((t) => ({
    ...t,
    count: t.id === "all" ? all.length
         : t.id === "draft"  ? all.filter((r) => r.status === "draft").length
         : t.id === "active" ? all.filter((r) => ACTIVE_STATUSES.includes(r.status)).length
         : t.id === "uat"    ? uatWaiting.length
         : all.filter((r) => ["completed","closed","rejected"].includes(r.status)).length,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="คำขอของฉัน"
        subtitle="ติดตามสถานะคำขอทั้งหมดของคุณ"
        actions={
          <Link href="/requests/new">
            <GlassButton variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> ส่งคำขอใหม่
            </GlassButton>
          </Link>
        }
      />

      {uatWaiting.length > 0 && (
        <GlassCard variant="amber" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#fbbd23] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white/90">
                {uatWaiting.length} คำขอรอการ UAT Approve จากคุณ
              </p>
              <p className="text-xs text-white/50 mt-0.5">กรุณาตรวจสอบและ Approve เมื่อทดสอบผ่านแล้ว</p>
            </div>
          </div>
          <GlassButton variant="ghost" size="sm" onClick={() => setTab("uat")}>ดู UAT →</GlassButton>
        </GlassCard>
      )}

      <GlassTabs tabs={tabsWithCount} active={tab} onChange={setTab} />

      {isLoading && (
        <GlassCard>
          <div className="py-8 text-center text-white/40 text-sm animate-pulse">กำลังโหลด…</div>
        </GlassCard>
      )}

      {!isLoading && filtered.length === 0 && (
        <GlassCard>
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="ไม่มีคำขอในหมวดนี้"
            description="ส่งคำขอใหม่เพื่อเริ่มต้น"
            action={
              <Link href="/requests/new">
                <GlassButton variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" /> ส่งคำขอใหม่
                </GlassButton>
              </Link>
            }
          />
        </GlassCard>
      )}

      <div className="space-y-3">
        {filtered.map((r) => (
          <RequestCard key={r.id} request={r} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: any }) {
  const isRejected  = request.status === "rejected";
  const isCompleted = request.status === "completed";
  const isClosed    = request.status === "closed";
  const isDone = isRejected || isCompleted || isClosed;
  const isUat = request.status === "uat";

  return (
    <GlassCard hover className={isDone ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-white/35">{request.requestNo}</span>
            <GlassBadge color={TYPE_COLOR[request.requestType] ?? "slate"} label={request.requestType?.replace("_", " ")} />
            {request.priority && <GlassBadge color="slate" label={request.priority} />}
            {isUat && <GlassBadge color="orange" label="รอ UAT" dot />}
          </div>
          <Link
            href={`/requests/${request.id}`}
            className="text-sm font-semibold text-white/85 hover:text-[#4f9cf9] transition-colors block truncate"
          >
            {request.subject}
          </Link>
        </div>
        <div className="shrink-0 mt-0.5">
          {isRejected  && <XCircle     className="h-5 w-5 text-[#f87272]"  />}
          {isCompleted && <CheckCircle className="h-5 w-5 text-[#36d399]"  />}
          {isClosed    && <CheckCircle className="h-5 w-5 text-white/35"   />}
        </div>
      </div>

      {!isDone && <GlassStepper steps={requestStepperSteps(request.status)} compact />}

      {isDone && (
        <p className="text-xs text-white/35 mt-1">
          {isCompleted ? "✓ ดำเนินการเสร็จสิ้นแล้ว" :
           isClosed    ? "■ ปิดแล้ว" :
           isRejected  ? "✗ ถูกปฏิเสธ" : request.status}
          {request.updatedAt && ` · ${new Date(request.updatedAt).toLocaleDateString("th-TH")}`}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 text-xs text-white/35">
        <span>อัปเดต: {request.updatedAt ? new Date(request.updatedAt).toLocaleString("th-TH") : "—"}</span>
        <Link href={`/requests/${request.id}`} className="text-[#4f9cf9] hover:text-[#4f9cf9]/80 transition-colors">
          ดูรายละเอียด →
        </Link>
      </div>
    </GlassCard>
  );
}
