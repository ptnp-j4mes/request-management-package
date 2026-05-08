"use client";
import { useQuery } from "@tanstack/react-query";
import { projectsApi, requestsApi, mitApi, uatApi } from "../../../lib/api";
import Link from "next/link";
import { useState } from "react";

const tabs = ["Requests", "MIT Items", "UAT", "MA", "Members"];

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("Requests");
  const { data: projData, isLoading } = useQuery({
    queryKey: ["project", params.id],
    queryFn: () => projectsApi.get(Number(params.id)),
  });
  const { data: reqData } = useQuery({
    queryKey: ["requests", { projectId: params.id }],
    queryFn: () => requestsApi.list({ projectId: params.id, limit: "50" }),
    enabled: activeTab === "Requests",
  });
  const { data: mitData } = useQuery({
    queryKey: ["mit-items", { projectId: params.id }],
    queryFn: () => mitApi.list({ projectId: params.id, limit: "50" }),
    enabled: activeTab === "MIT Items",
  });

  const project = projData?.data;
  const requests = reqData?.data?.items ?? [];
  const mitItems = mitData?.data?.items ?? [];

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!project) return <div className="p-6 text-red-500">Project not found</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/projects" className="hover:underline">Projects</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">{project.projectCode}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{project.projectName}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
          <span>Code: <b className="text-slate-800">{project.projectCode}</b></span>
          <span>Customer: <b className="text-slate-800">{project.customerName ?? "—"}</b></span>
          <span>Start: <b className="text-slate-800">{project.startDate ?? "—"}</b></span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${project.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "Requests" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.requestNo}</td>
                  <td className="px-4 py-3">
                    <Link href={`/requests/${r.id}`} className="text-blue-600 hover:underline">{r.subject}</Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{r.requestType?.replace("_", " ")}</td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3 capitalize">{r.priority ?? "—"}</td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No requests</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "MIT Items" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">No.</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Step</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mitItems.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.mitNo}</td>
                  <td className="px-4 py-3">
                    <Link href={`/mit/${m.id}`} className="text-blue-600 hover:underline">{m.title}</Link>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{m.currentStepCode ?? "—"}</span></td>
                  <td className="px-4 py-3 capitalize text-slate-600">{m.currentStatus}</td>
                  <td className="px-4 py-3 text-slate-600">{m.currentOwnerUserId ?? "—"}</td>
                </tr>
              ))}
              {mitItems.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No MIT items</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "UAT" && (
        <div className="bg-white rounded-lg border shadow-sm p-5 text-slate-500 text-sm">
          UAT cycles for this project — see <Link href="/uat" className="text-blue-600 hover:underline">UAT Management</Link>
        </div>
      )}

      {activeTab === "MA" && (
        <div className="bg-white rounded-lg border shadow-sm p-5 text-slate-500 text-sm">
          Maintenance agreements — see <Link href="/ma" className="text-blue-600 hover:underline">MA Coverage</Link>
        </div>
      )}

      {activeTab === "Members" && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(project.members ?? []).map((m: any) => (
                <tr key={m.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{m.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{m.email ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{m.memberRole}</td>
                </tr>
              ))}
              {(project.members ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No members</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
