"use client";
import { useQuery } from "@tanstack/react-query";
import { workloadApi, requestsApi, mitApi } from "../lib/api";
import { StatCard } from "../components/dashboard/StatCard";
import { ClipboardList, Inbox, Zap, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: workloadByUser } = useQuery({ queryKey: ["workload-by-user"], queryFn: workloadApi.byUser });
  const { data: overdueData } = useQuery({ queryKey: ["workload-overdue"], queryFn: workloadApi.overdue });
  const { data: pendingHandoffs } = useQuery({ queryKey: ["pending-handoffs"], queryFn: workloadApi.pendingHandoffs });
  const { data: requests } = useQuery({ queryKey: ["requests", { limit: 5 }], queryFn: () => requestsApi.list({ limit: "5" }) });

  const users = workloadByUser?.data ?? [];
  const totalOnHand = users.reduce((s: number, u: any) => s + u.onHand, 0);
  const totalWaitingTest = users.reduce((s: number, u: any) => s + u.waitingTest, 0);
  const totalWaitingUat = users.reduce((s: number, u: any) => s + u.waitingUat, 0);
  const totalDeployed = users.reduce((s: number, u: any) => s + u.deployed, 0);
  const overdueCount = overdueData?.data?.length ?? 0;
  const pendingCount = pendingHandoffs?.data?.length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Workload snapshot across all projects</p>
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
              {users.map((u: any) => (
                <tr key={u.userId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                  <td className="px-5 py-3 text-right">{u.onHand}</td>
                  <td className="px-5 py-3 text-right text-yellow-700">{u.waitingTest}</td>
                  <td className="px-5 py-3 text-right text-orange-700">{u.waitingUat}</td>
                  <td className="px-5 py-3 text-right text-green-700">{u.deployed}</td>
                </tr>
              ))}
              {users.length === 0 && (
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
              {(requests?.data?.items ?? []).map((r: any) => (
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
              {!(requests?.data?.items?.length) && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
