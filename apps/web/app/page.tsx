"use client";
import { useQuery } from "@tanstack/react-query";
import { workloadApi, requestsApi } from "../lib/api";
import { StatCard } from "../components/dashboard/StatCard";
import { ClipboardList, Inbox, Zap, CheckCircle, Clock, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { StatusStepper } from "../components/requests/StatusStepper";

const INTERNAL_ROLES = ["ADMIN", "IT_MANAGER", "BA", "APPROVER", "DEVELOPER", "QA", "FULLSTACK"];

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

  // Pending approval count for IT_MANAGER/ADMIN
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

  // ── External User (REQUESTER only) dashboard ─────────────────────────────
  if (isExternalOnly) {
    const activeRequests = allRequests.filter((r) =>
      !["completed", "closed", "rejected", "draft"].includes(r.status)
    );
    const doneRequests = allRequests.filter((r) =>
      ["completed", "closed"].includes(r.status)
    );
    const uatWaiting = allRequests.filter((r) => r.status === "uat");

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">สวัสดี, {user?.name} 👋</h1>
            <p className="text-slate-500 text-sm mt-1">ภาพรวมคำขอของคุณ</p>
          </div>
          <Link
            href="/requests/new"
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> ส่งคำขอใหม่
          </Link>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="กำลังดำเนินการ" value={activeRequests.length} color="blue" icon={<Clock className="h-5 w-5" />} description="Active requests" />
          <StatCard label="รอ UAT" value={uatWaiting.length} color="orange" icon={<Inbox className="h-5 w-5" />} description="Waiting for your UAT" />
          <StatCard label="เสร็จสิ้น" value={doneRequests.length} color="green" icon={<CheckCircle className="h-5 w-5" />} description="Completed" />
        </div>

        {/* UAT waiting alert */}
        {uatWaiting.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-800">
                🔔 {uatWaiting.length} คำขอรอการ UAT Approve จากคุณ
              </p>
              <p className="text-xs text-orange-600 mt-0.5">กรุณาตรวจสอบและ Approve เมื่อทดสอบผ่านแล้ว</p>
            </div>
            <Link href="/my-requests" className="text-sm text-orange-700 font-medium hover:underline shrink-0">
              ดูทั้งหมด →
            </Link>
          </div>
        )}

        {/* Active requests with stepper */}
        {activeRequests.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">คำขอที่กำลังดำเนินการ</h2>
              <Link href="/my-requests" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {activeRequests.slice(0, 5).map((r: any) => (
                <div key={r.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/requests/${r.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 truncate">
                      {r.subject}
                    </Link>
                    <span className="font-mono text-xs text-slate-400 shrink-0">{r.requestNo}</span>
                  </div>
                  <StatusStepper status={r.status} showPercent compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {allRequests.length === 0 && (
          <div className="bg-white rounded-lg border shadow-sm p-10 text-center">
            <p className="text-slate-400 text-sm">ยังไม่มีคำขอ</p>
            <Link href="/requests/new" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
              ส่งคำขอแรกของคุณ →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Internal user dashboard (default) ─────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Workload snapshot across all projects</p>
        </div>
        {/* Pending approval alert for IT_MANAGER/ADMIN/APPROVER */}
        {pendingApprovalCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm text-amber-800">
              <b>{pendingApprovalCount}</b> requests รออนุมัติ
            </span>
            <Link href="/requests?status=submitted" className="text-xs text-amber-700 font-medium hover:underline">
              ดู →
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="On Hand" value={totalOnHand} color="blue" icon={<ClipboardList className="h-5 w-5" />} description="Active items" />
        <StatCard label="Waiting Test" value={totalWaitingTest} color="yellow" icon={<Clock className="h-5 w-5" />} description="QA queue" />
        <StatCard label="Waiting UAT" value={totalWaitingUat} color="orange" icon={<Clock className="h-5 w-5" />} description="UAT queue" />
        <StatCard label="Deployed" value={totalDeployed} color="green" icon={<CheckCircle className="h-5 w-5" />} description="Done" />
        <StatCard label="Overdue" value={overdueCount} color="red" icon={<AlertTriangle className="h-5 w-5" />} description="Past deadline" />
        <StatCard label="Pending Handoffs" value={pendingCount} color="yellow" icon={<Zap className="h-5 w-5" />} description="Awaiting accept" />
      </div>

      {/* Workload by User table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Workload by User</h2>
          <Link href="/workload" className="text-sm text-blue-600 hover:underline">View full report →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-right">On Hand</th>
                <th className="px-5 py-3 text-right">Waiting Test</th>
                <th className="px-5 py-3 text-right">Waiting UAT</th>
                <th className="px-5 py-3 text-right">Deployed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workloadUsers.map((u: any) => (
                <tr key={u.userId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                  <td className="px-5 py-3 text-right">{u.onHand}</td>
                  <td className="px-5 py-3 text-right text-yellow-700">{u.waitingTest}</td>
                  <td className="px-5 py-3 text-right text-orange-700">{u.waitingUat}</td>
                  <td className="px-5 py-3 text-right text-green-700">{u.deployed}</td>
                </tr>
              ))}
              {workloadUsers.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Requests</h2>
          <Link href="/requests" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">No.</th>
                <th className="px-5 py-3 text-left">Subject</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRequests.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.requestNo}</td>
                  <td className="px-5 py-3">
                    <Link href={`/requests/${r.id}`} className="text-blue-600 hover:underline">{r.subject}</Link>
                  </td>
                  <td className="px-5 py-3 capitalize">{r.requestType?.replace("_", " ")}</td>
                  <td className="px-5 py-3 capitalize">{r.status}</td>
                  <td className="px-5 py-3 capitalize">{r.priority ?? "—"}</td>
                </tr>
              ))}
              {!allRequests.length && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
