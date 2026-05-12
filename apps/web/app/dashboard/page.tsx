"use client";
import { useQuery } from "@tanstack/react-query";
import { workloadApi, requestsApi } from "../../lib/api";
import { ClipboardList, Inbox, Zap, CheckCircle, Clock, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { GlassStatCard } from "../../components/ui/GlassStatCard";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge, statusColor, priorityColor } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassStepper } from "../../components/ui/GlassStepper";
import { EmptyState } from "../../components/ui/EmptyState";

const INTERNAL_ROLES = ["ADMIN", "IT_MANAGER", "BA", "APPROVER", "DEVELOPER", "QA", "FULLSTACK"];

const REQUEST_STEPS = [
  "draft","submitted","manager_approved","ba_review","waiting_estimate",
  "assigned_to_dev","in_development","ready_for_qa","in_qa","uat","completed",
];

function requestStepperSteps(status: string) {
  const labels = ["Draft","Submitted","Approved","BA Review","Estimate","Dev","In Dev","Ready QA","In QA","UAT","Done"];
  const idx = REQUEST_STEPS.indexOf(status);
  return labels.map((label, i) => ({
    label,
    status: i < idx ? "done" : i === idx ? "active" : "pending",
  })) as { label: string; status: "done" | "active" | "pending" }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isExternalOnly = !!user && user.roles.includes("REQUESTER") && !user.roles.some((r) => INTERNAL_ROLES.includes(r));

  const { data: workloadByUser } = useQuery({
    queryKey: ["workload-by-user"], queryFn: workloadApi.byUser, enabled: !isExternalOnly,
  });
  const { data: overdueData } = useQuery({
    queryKey: ["workload-overdue"], queryFn: workloadApi.overdue, enabled: !isExternalOnly,
  });
  const { data: pendingHandoffs } = useQuery({
    queryKey: ["pending-handoffs"], queryFn: workloadApi.pendingHandoffs, enabled: !isExternalOnly,
  });
  const { data: requests } = useQuery({
    queryKey: ["requests", { limit: isExternalOnly ? "20" : "5" }],
    queryFn: () => requestsApi.list({ limit: isExternalOnly ? "20" : "5" }),
  });
  const { data: pendingApprovalData } = useQuery({
    queryKey: ["requests-submitted"],
    queryFn: () => requestsApi.list({ status: "submitted", limit: "100" }),
    enabled: !!(user?.roles.some((r) => ["IT_MANAGER", "ADMIN", "APPROVER"].includes(r))),
  });

  const workloadUsers = workloadByUser?.data ?? [];
  const totalOnHand      = workloadUsers.reduce((s: number, u: any) => s + u.onHand, 0);
  const totalWaitingTest = workloadUsers.reduce((s: number, u: any) => s + u.waitingTest, 0);
  const totalWaitingUat  = workloadUsers.reduce((s: number, u: any) => s + u.waitingUat, 0);
  const totalDeployed    = workloadUsers.reduce((s: number, u: any) => s + u.deployed, 0);
  const overdueCount   = overdueData?.data?.length ?? 0;
  const pendingCount   = pendingHandoffs?.data?.length ?? 0;
  const pendingApprovalCount = pendingApprovalData?.data?.total ?? pendingApprovalData?.data?.items?.length ?? 0;
  const allRequests: any[] = requests?.data?.items ?? [];

  // ── External User (REQUESTER only) ───────────────────────────────────────
  if (isExternalOnly) {
    const activeRequests = allRequests.filter((r) =>
      !["completed", "closed", "rejected", "draft"].includes(r.status)
    );
    const doneRequests = allRequests.filter((r) => ["completed", "closed"].includes(r.status));
    const uatWaiting = allRequests.filter((r) => r.status === "uat");

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title={`สวัสดี, ${user?.name}`}
          subtitle="ภาพรวมคำขอของคุณ"
          actions={
            <Link href="/requests/new">
              <GlassButton variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> ส่งคำขอใหม่
              </GlassButton>
            </Link>
          }
        />

        <div className="grid grid-cols-3 gap-4">
          <GlassStatCard label="กำลังดำเนินการ" value={activeRequests.length} color="blue" icon={<Clock className="h-5 w-5" />} description="Active requests" />
          <GlassStatCard label="รอ UAT" value={uatWaiting.length} color="orange" icon={<Inbox className="h-5 w-5" />} description="Waiting for your UAT" />
          <GlassStatCard label="เสร็จสิ้น" value={doneRequests.length} color="green" icon={<CheckCircle className="h-5 w-5" />} description="Completed" />
        </div>

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
            <Link href="/my-requests">
              <GlassButton variant="ghost" size="sm">ดูทั้งหมด →</GlassButton>
            </Link>
          </GlassCard>
        )}

        {activeRequests.length > 0 && (
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/80">คำขอที่กำลังดำเนินการ</h2>
              <Link href="/my-requests" className="text-xs text-[#4f9cf9] hover:text-[#4f9cf9]/80 transition-colors">ดูทั้งหมด →</Link>
            </div>
            <div className="divide-y divide-white/[.06]">
              {activeRequests.slice(0, 5).map((r: any) => (
                <div key={r.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/requests/${r.id}`} className="text-sm font-medium text-white/85 hover:text-[#4f9cf9] truncate transition-colors">
                      {r.subject}
                    </Link>
                    <span className="font-mono text-xs text-white/35 shrink-0">{r.requestNo}</span>
                  </div>
                  <GlassStepper steps={requestStepperSteps(r.status)} compact />
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {allRequests.length === 0 && (
          <GlassCard>
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="ยังไม่มีคำขอ"
              description="ส่งคำขอแรกของคุณเพื่อเริ่มต้น"
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
      </div>
    );
  }

  // ── Internal user dashboard ────────────────────────────────────────────────
  const workloadColumns = [
    { key: "fullName", header: "Name", render: (v: any) => <span className="font-medium text-white/85">{v}</span> },
    { key: "onHand", header: "On Hand", className: "text-right", render: (v: any) => <span className="text-white/70">{v}</span> },
    { key: "waitingTest", header: "Waiting Test", className: "text-right", render: (v: any) => <span className="text-[#fbbd23]/80">{v}</span> },
    { key: "waitingUat", header: "Waiting UAT", className: "text-right", render: (v: any) => <span className="text-[#fb923c]/80">{v}</span> },
    { key: "deployed", header: "Deployed", className: "text-right", render: (v: any) => <span className="text-[#36d399]/80">{v}</span> },
  ];

  const requestColumns = [
    { key: "requestNo", header: "No.", render: (v: any) => <span className="font-mono text-xs text-white/40">{v}</span> },
    { key: "subject", header: "Subject", render: (v: any, row: any) => (
      <Link href={`/requests/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors truncate max-w-[240px] block">{v}</Link>
    )},
    { key: "requestType", header: "Type", render: (v: any) => <span className="capitalize text-white/55 text-xs">{v?.replace("_", " ")}</span> },
    { key: "status", header: "Status", render: (v: any) => <GlassBadge color={statusColor(v)} label={v?.replace(/_/g, " ")} /> },
    { key: "priority", header: "Priority", render: (v: any) => v ? <GlassBadge color={priorityColor(v)} label={v} /> : <span className="text-white/30">—</span> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Workload snapshot across all projects"
        actions={
          pendingApprovalCount > 0 ? (
            <GlassCard variant="amber" className="flex items-center gap-3 py-2 px-4">
              <AlertTriangle className="h-4 w-4 text-[#fbbd23] shrink-0" />
              <span className="text-sm text-white/80">
                <b className="text-white">{pendingApprovalCount}</b> requests รออนุมัติ
              </span>
              <Link href="/requests?status=submitted" className="text-xs text-[#fbbd23] hover:text-[#fbbd23]/80 font-medium transition-colors">
                ดู →
              </Link>
            </GlassCard>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlassStatCard label="On Hand" value={totalOnHand} color="blue" icon={<ClipboardList className="h-5 w-5" />} description="Active items" />
        <GlassStatCard label="Waiting Test" value={totalWaitingTest} color="yellow" icon={<Clock className="h-5 w-5" />} description="QA queue" />
        <GlassStatCard label="Waiting UAT" value={totalWaitingUat} color="orange" icon={<Clock className="h-5 w-5" />} description="UAT queue" />
        <GlassStatCard label="Deployed" value={totalDeployed} color="green" icon={<CheckCircle className="h-5 w-5" />} description="Done" />
        <GlassStatCard label="Overdue" value={overdueCount} color="red" icon={<AlertTriangle className="h-5 w-5" />} description="Past deadline" />
        <GlassStatCard label="Pending Handoffs" value={pendingCount} color="yellow" icon={<Zap className="h-5 w-5" />} description="Awaiting accept" />
      </div>

      {/* Workload by User */}
      <GlassCard className="p-0">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">Workload by User</h2>
          <Link href="/workload" className="text-xs text-[#4f9cf9] hover:text-[#4f9cf9]/80 transition-colors">View full report →</Link>
        </div>
        <GlassTable
          columns={workloadColumns}
          rows={workloadUsers}
          empty={<EmptyState title="No workload data" description="No active items found" />}
        />
      </GlassCard>

      {/* Recent Requests */}
      <GlassCard className="p-0">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">Recent Requests</h2>
          <Link href="/requests" className="text-xs text-[#4f9cf9] hover:text-[#4f9cf9]/80 transition-colors">View all →</Link>
        </div>
        <GlassTable
          columns={requestColumns}
          rows={allRequests}
          empty={<EmptyState title="No requests" description="No recent requests found" />}
        />
      </GlassCard>
    </div>
  );
}
