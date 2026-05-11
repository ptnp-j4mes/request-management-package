"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, requestsApi, mitApi, githubApi } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";

const tabs = ["Requests", "MIT Items", "UAT", "MA", "Members", "GitHub"];

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Requests");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [settingsSaved, setSettingsSaved] = useState(false);

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
  const { data: ghSettingsData } = useQuery({
    queryKey: ["github-settings", params.id],
    queryFn: () => githubApi.getSettings(Number(params.id)),
    enabled: activeTab === "GitHub",
    onSuccess: (d: any) => {
      if (d?.data) {
        setRepoOwner(d.data.repoOwner ?? "");
        setRepoName(d.data.repoName ?? "");
        setDefaultBranch(d.data.defaultBranch ?? "main");
      }
    },
  } as any);
  const { data: commitsData, isLoading: commitsLoading, refetch: refetchCommits } = useQuery({
    queryKey: ["github-commits", params.id],
    queryFn: () => githubApi.getProjectCommits(Number(params.id)),
    enabled: activeTab === "GitHub" && !!ghSettingsData?.data?.isConnected,
    retry: false,
  });
  const saveSettingsMutation = useMutation({
    mutationFn: () => githubApi.updateSettings(Number(params.id), { repoOwner, repoName, defaultBranch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-settings", params.id] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    },
  });

  const project = projData?.data;
  const requests = reqData?.data?.items ?? [];
  const mitItems = mitData?.data?.items ?? [];
  const ghSettings = ghSettingsData?.data;
  const commits: any[] = commitsData?.data ?? [];
  const canManageGitHub = hasAnyRole(["IT_MANAGER", "ADMIN"]);

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

      {activeTab === "GitHub" && (
        <div className="space-y-4">
          {/* Connection status */}
          <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">GitHub Repository</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {ghSettings?.isConnected
                    ? <span className="text-green-600 font-medium">✓ Connected</span>
                    : <span className="text-amber-600">Not connected — OAuth token missing</span>}
                  {ghSettings?.repoOwner && ghSettings?.repoName && (
                    <span className="ml-2 font-mono text-slate-700">
                      {ghSettings.repoOwner}/{ghSettings.repoName} @ {ghSettings.defaultBranch}
                    </span>
                  )}
                </p>
              </div>
              {canManageGitHub && (
                <a
                  href={githubApi.connectUrl(Number(params.id))}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-700 transition-colors"
                >
                  {ghSettings?.isConnected ? "Re-connect GitHub" : "Connect GitHub"}
                </a>
              )}
            </div>

            {/* Repo settings form */}
            {canManageGitHub && (
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Repository Settings</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Owner / Org</label>
                    <input
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      placeholder="e.g. ptnp-j4mes"
                      className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Repository name</label>
                    <input
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="e.g. my-project"
                      className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Default branch</label>
                    <input
                      value={defaultBranch}
                      onChange={(e) => setDefaultBranch(e.target.value)}
                      placeholder="main"
                      className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveSettingsMutation.mutate()}
                    disabled={!repoOwner || !repoName || saveSettingsMutation.isPending}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saveSettingsMutation.isPending ? "Saving…" : "Save Settings"}
                  </button>
                  {settingsSaved && <span className="text-sm text-green-600">✓ Saved</span>}
                  {saveSettingsMutation.isError && (
                    <span className="text-sm text-red-600">{(saveSettingsMutation.error as any)?.message}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Commits table */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">
                Recent Commits
                {commits.length > 0 && <span className="text-slate-400 font-normal ml-2 text-sm">({commits.length})</span>}
              </h2>
              <button
                onClick={() => refetchCommits()}
                className="text-xs text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {commitsLoading && <p className="text-slate-400 text-sm">Fetching commits…</p>}
            {!commitsLoading && !ghSettings?.isConnected && (
              <p className="text-amber-600 text-sm">Connect GitHub and save repo settings to view commits.</p>
            )}
            {!commitsLoading && ghSettings?.isConnected && commits.length === 0 && (
              <p className="text-slate-400 text-sm">No commits found.</p>
            )}

            <div className="divide-y divide-slate-100">
              {commits.map((c: any) => (
                <div key={c.fullSha} className="flex items-start gap-3 py-3">
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600 shrink-0 mt-0.5">
                    {c.sha}
                  </code>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{c.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.githubUsername ? `@${c.githubUsername}` : c.author}
                      {c.committedAt && ` · ${new Date(c.committedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <a
                    href={c.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
