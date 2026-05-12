"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, requestsApi, mitApi, githubApi } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";
import { Check, RefreshCw, Github, GitBranch, GitMerge, GitPullRequest, ExternalLink, Users, Inbox, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { GlassCard } from "../../../components/ui/GlassCard";
import { GlassTable } from "../../../components/ui/GlassTable";
import { GlassBadge, statusColor } from "../../../components/ui/GlassBadge";
import { GlassButton } from "../../../components/ui/GlassButton";
import { GlassTabs } from "../../../components/ui/GlassTabs";
import { GlassInput } from "../../../components/ui/GlassInput";
import { GlassProgressBar } from "../../../components/ui/GlassProgressBar";
import { GlassStatCard } from "../../../components/ui/GlassStatCard";
import { EmptyState } from "../../../components/ui/EmptyState";

const TABS = [
  { id: "Progress",   label: "Overview" },
  { id: "Requests",   label: "Requests" },
  { id: "MIT Items",  label: "MIT Board" },
  { id: "UAT",        label: "UAT" },
  { id: "Meetings",   label: "Meetings" },
  { id: "Members",    label: "Members" },
  { id: "GitHub",     label: "GitHub" },
];

const MIT_STATUS_CONFIG: Record<string, { label: string; color: "green"|"blue"|"orange"|"slate" }> = {
  deployed:        { label: "Deployed",        color: "green"  },
  in_qa:           { label: "In QA",           color: "blue"   },
  ready_for_qa:    { label: "Ready for QA",    color: "blue"   },
  in_development:  { label: "In Development",  color: "orange" },
  assigned_to_dev: { label: "Assigned to Dev", color: "orange" },
  new:             { label: "New / Waiting",   color: "slate"  },
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Progress");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [settingsSaved, setSettingsSaved] = useState(false);
  // Branch state
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  // PR state
  const [showNewPr, setShowNewPr] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prHead, setPrHead] = useState("");
  const [prBase, setPrBase] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prState, setPrState] = useState<"open"|"closed">("open");
  const [mergeMethod, setMergeMethod] = useState("squash");

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
    queryFn: () => mitApi.list({ projectId: params.id, limit: "200" }),
    enabled: activeTab === "MIT Items" || activeTab === "Progress",
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

  const ghConnected = !!((ghSettingsData as any)?.data?.isConnected);

  const { data: commitsData, isLoading: commitsLoading, refetch: refetchCommits } = useQuery({
    queryKey: ["github-commits", params.id, selectedBranch],
    queryFn: () => githubApi.getProjectCommits(Number(params.id)),
    enabled: activeTab === "GitHub" && ghConnected,
    retry: false,
  });
  const { data: branchesData, isLoading: branchesLoading, refetch: refetchBranches } = useQuery({
    queryKey: ["github-branches", params.id],
    queryFn: () => githubApi.listBranches(Number(params.id)),
    enabled: activeTab === "GitHub" && ghConnected,
    retry: false,
  });
  const { data: pullsData, isLoading: pullsLoading, refetch: refetchPulls } = useQuery({
    queryKey: ["github-pulls", params.id, prState],
    queryFn: () => githubApi.listPulls(Number(params.id), prState),
    enabled: activeTab === "GitHub" && ghConnected,
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
  const createBranchMutation = useMutation({
    mutationFn: () => githubApi.createProjectBranch(Number(params.id), { branchName: newBranchName, baseBranch: baseBranch || undefined }),
    onSuccess: () => { setShowNewBranch(false); setNewBranchName(""); setBaseBranch(""); refetchBranches(); },
  });
  const deleteBranchMutation = useMutation({
    mutationFn: (name: string) => githubApi.deleteProjectBranch(Number(params.id), name),
    onSuccess: () => refetchBranches(),
  });
  const createPrMutation = useMutation({
    mutationFn: () => githubApi.createPull(Number(params.id), { title: prTitle, head: prHead, base: prBase || undefined, body: prBody || undefined }),
    onSuccess: () => { setShowNewPr(false); setPrTitle(""); setPrHead(""); setPrBase(""); setPrBody(""); refetchPulls(); },
  });
  const mergePrMutation = useMutation({
    mutationFn: (prNumber: number) => githubApi.mergePull(Number(params.id), prNumber, { mergeMethod }),
    onSuccess: () => { refetchPulls(); refetchBranches(); refetchCommits(); },
  });

  const project = projData?.data;
  const requests = reqData?.data?.items ?? [];
  const mitItems = mitData?.data?.items ?? [];
  const ghSettings = (ghSettingsData as any)?.data;
  const commits: any[] = commitsData?.data ?? [];
  const branches: any[] = branchesData?.data ?? [];
  const pulls: any[] = pullsData?.data ?? [];
  const canManageGitHub = hasAnyRole(["IT_MANAGER", "ADMIN"]);

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px] text-white/40 animate-pulse">Loading…</div>;
  if (!project) return <div className="flex items-center justify-center min-h-[400px] text-[#f87272]">Project not found</div>;

  const requestColumns = [
    { key: "requestNo", header: "No.", render: (v: any) => <span className="font-mono text-xs text-white/40">{v}</span> },
    { key: "subject", header: "Subject", render: (v: any, row: any) => (
      <Link href={`/requests/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors">{v}</Link>
    )},
    { key: "requestType", header: "Type", render: (v: any) => <span className="capitalize text-white/55 text-xs">{v?.replace(/_/g, " ")}</span> },
    { key: "status", header: "Status", render: (v: any) => <GlassBadge color={statusColor(v)} label={v?.replace(/_/g, " ")} /> },
    { key: "priority", header: "Priority", render: (v: any) => v ? <GlassBadge color="slate" label={v} /> : <span className="text-white/30">—</span> },
  ];

  const mitColumns = [
    { key: "mitNo", header: "No.", render: (v: any) => <span className="font-mono text-xs text-white/40">{v}</span> },
    { key: "title", header: "Title", render: (v: any, row: any) => (
      <Link href={`/mit/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors">{v}</Link>
    )},
    { key: "currentStepCode", header: "Step", render: (v: any) => v ? <span className="font-mono text-xs bg-white/[.08] px-1.5 py-0.5 rounded-xs">{v}</span> : <span className="text-white/30">—</span> },
    { key: "currentStatus", header: "Status", render: (v: any) => {
      const cfg = MIT_STATUS_CONFIG[v] ?? { label: v, color: "slate" as const };
      return <GlassBadge color={cfg.color} label={cfg.label} />;
    }},
    { key: "currentOwnerUserId", header: "Owner", render: (v: any) => <span className="text-white/55 text-xs">{v ?? "—"}</span> },
  ];

  const memberColumns = [
    { key: "fullName", header: "Name", render: (v: any) => <span className="font-medium text-white/85">{v}</span> },
    { key: "email", header: "Email", render: (v: any) => <span className="text-white/50 text-xs">{v ?? "—"}</span> },
    { key: "memberRole", header: "Role", render: (v: any) => <GlassBadge color="blue" label={v?.replace(/_/g, " ")} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={project.projectName}
        breadcrumb={["Projects", project.projectCode]}
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-white/40">{project.projectCode}</span>
            <GlassBadge color={project.status === "active" ? "green" : "slate"} label={project.status} />
            {project.customerName && <span className="text-xs text-white/40">{project.customerName}</span>}
          </div>
        }
      />

      <GlassTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "Progress" && (
        <ProjectProgress project={project} mitItems={mitItems} />
      )}

      {activeTab === "Requests" && (
        <GlassCard className="p-0">
          <GlassTable
            columns={requestColumns}
            rows={requests}
            empty={<EmptyState icon={<Inbox className="h-6 w-6" />} title="No requests for this project" />}
          />
        </GlassCard>
      )}

      {activeTab === "MIT Items" && (
        <GlassCard className="p-0">
          <GlassTable
            columns={mitColumns}
            rows={mitItems}
            empty={<EmptyState title="No MIT items" description="MIT items will appear here" />}
          />
        </GlassCard>
      )}

      {activeTab === "UAT" && (
        <GlassCard>
          <EmptyState
            title="UAT Cycles"
            description={<>See full UAT management at <Link href="/uat" className="text-[#4f9cf9]">UAT page</Link></>}
          />
        </GlassCard>
      )}

      {activeTab === "Meetings" && (
        <GlassCard>
          <EmptyState
            title="Meetings"
            description={<>Manage project meetings at <Link href={`/projects/${params.id}/meetings`} className="text-[#4f9cf9]">Meetings page →</Link></>}
          />
        </GlassCard>
      )}

      {activeTab === "Members" && (
        <GlassCard className="p-0">
          <div className="px-6 pt-6 pb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">Project Members ({(project.members ?? []).length})</h2>
          </div>
          <GlassTable
            columns={memberColumns}
            rows={project.members ?? []}
            empty={<EmptyState title="No members" description="Add members to this project" />}
          />
        </GlassCard>
      )}

      {activeTab === "GitHub" && (
        <div className="space-y-4">
          {/* ── Connection + Settings ── */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-white/60" />
                <div>
                  <h2 className="text-sm font-semibold text-white/80">GitHub Repository</h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    {ghSettings?.isConnected
                      ? <span className="text-[#36d399]">✓ {ghSettings.repoOwner}/{ghSettings.repoName} @ {ghSettings.defaultBranch}</span>
                      : "Not connected — OAuth token missing"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ghSettings?.isConnected && (
                  <a href={`https://github.com/${ghSettings.repoOwner}/${ghSettings.repoName}`} target="_blank" rel="noreferrer">
                    <GlassButton variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open on GitHub</GlassButton>
                  </a>
                )}
                {canManageGitHub && (
                  <GlassButton variant="secondary" size="sm" onClick={() => { window.location.href = githubApi.connectUrl(Number(params.id)); }}>
                    <Github className="h-3.5 w-3.5 mr-1.5" />
                    {ghSettings?.isConnected ? "Re-connect" : "Connect GitHub"}
                  </GlassButton>
                )}
              </div>
            </div>
            {canManageGitHub && (
              <div className="border-t border-white/[.07] pt-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <GlassInput label="Owner / Org" value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)} placeholder="e.g. ptnp-j4mes" />
                  <GlassInput label="Repository Name" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="e.g. my-project" />
                  <GlassInput label="Default Branch" value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} placeholder="main" />
                </div>
                <div className="flex items-center gap-3">
                  <GlassButton variant="primary" size="sm" loading={saveSettingsMutation.isPending} disabled={!repoOwner || !repoName} onClick={() => saveSettingsMutation.mutate()}>
                    Save Settings
                  </GlassButton>
                  {settingsSaved && <span className="text-xs text-[#36d399] flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span>}
                </div>
              </div>
            )}
          </GlassCard>

          {ghConnected && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ── Branches Panel ── */}
              <GlassCard className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-[#4f9cf9]" />
                    <h3 className="text-sm font-semibold text-white/80">Branches</h3>
                    {branches.length > 0 && <span className="text-xs text-white/35 bg-white/[.07] px-1.5 py-0.5 rounded-full">{branches.length}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <GlassButton variant="ghost" size="sm" onClick={() => refetchBranches()}><RefreshCw className="h-3 w-3" /></GlassButton>
                    {canManageGitHub && (
                      <GlassButton variant="primary" size="sm" onClick={() => setShowNewBranch(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />New Branch
                      </GlassButton>
                    )}
                  </div>
                </div>

                {showNewBranch && (
                  <div className="mb-3 rounded-xl border border-white/[.12] bg-white/[.05] p-3 space-y-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Create Branch</p>
                    <GlassInput label="Branch Name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="feat/my-feature" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Base Branch</span>
                      <select
                        value={baseBranch}
                        onChange={(e) => setBaseBranch(e.target.value)}
                        className="w-full rounded-xl border border-white/[.15] bg-white/[.08] px-3 py-2 text-sm text-white outline-none focus:border-[#4f9cf9]/50"
                      >
                        <option value="">Default ({ghSettings?.defaultBranch})</option>
                        {branches.map((b: any) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <GlassButton variant="primary" size="sm" loading={createBranchMutation.isPending} disabled={!newBranchName} onClick={() => createBranchMutation.mutate()}>
                        Create
                      </GlassButton>
                      <GlassButton variant="ghost" size="sm" onClick={() => { setShowNewBranch(false); setNewBranchName(""); setBaseBranch(""); }}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </GlassButton>
                    </div>
                    {createBranchMutation.isError && (
                      <p className="text-xs text-[#f87272]">{(createBranchMutation.error as any)?.message}</p>
                    )}
                  </div>
                )}

                {branchesLoading && <p className="text-white/40 text-sm animate-pulse py-4 text-center">Loading branches…</p>}
                <div className="divide-y divide-white/[.06] overflow-auto max-h-96">
                  {branches.map((b: any) => (
                    <div
                      key={b.name}
                      className={`flex items-center gap-2 py-2.5 px-1 rounded-lg cursor-pointer hover:bg-white/[.04] transition-colors group ${selectedBranch === b.name ? "bg-white/[.06]" : ""}`}
                      onClick={() => setSelectedBranch(b.name === selectedBranch ? "" : b.name)}
                    >
                      <GitBranch className="h-3.5 w-3.5 text-white/30 shrink-0" />
                      <span className="flex-1 text-sm text-white/80 font-mono truncate">{b.name}</span>
                      {b.isDefault && <span className="text-[10px] text-[#36d399] border border-[#36d399]/30 px-1.5 py-0.5 rounded-full shrink-0">default</span>}
                      {b.protected && <span className="text-[10px] text-[#fbbd23] border border-[#fbbd23]/30 px-1.5 py-0.5 rounded-full shrink-0">protected</span>}
                      <code className="text-[10px] text-white/25 font-mono shrink-0">{b.sha}</code>
                      {canManageGitHub && !b.isDefault && !b.protected && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete branch "${b.name}"?`)) deleteBranchMutation.mutate(b.name); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[#f87272]/70 hover:text-[#f87272]" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!branchesLoading && branches.length === 0 && (
                    <EmptyState title="No branches" description="Connect GitHub and configure the repo" />
                  )}
                </div>
              </GlassCard>

              {/* ── Pull Requests Panel ── */}
              <GlassCard className="flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="h-4 w-4 text-[#a78bfa]" />
                    <h3 className="text-sm font-semibold text-white/80">Pull Requests</h3>
                    {pulls.length > 0 && <span className="text-xs text-white/35 bg-white/[.07] px-1.5 py-0.5 rounded-full">{pulls.length}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={prState}
                      onChange={(e) => setPrState(e.target.value as "open"|"closed")}
                      className="rounded-lg border border-white/[.12] bg-white/[.07] px-2 py-1 text-xs text-white/70 outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                    <GlassButton variant="ghost" size="sm" onClick={() => refetchPulls()}><RefreshCw className="h-3 w-3" /></GlassButton>
                    {canManageGitHub && (
                      <GlassButton variant="primary" size="sm" onClick={() => { setShowNewPr(true); setPrHead(selectedBranch || ""); setPrBase(ghSettings?.defaultBranch || "main"); }}>
                        <Plus className="h-3.5 w-3.5 mr-1" />New PR
                      </GlassButton>
                    )}
                  </div>
                </div>

                {showNewPr && (
                  <div className="mb-3 rounded-xl border border-white/[.12] bg-white/[.05] p-3 space-y-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Create Pull Request</p>
                    <GlassInput label="Title" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="feat: add something awesome" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">From (head)</span>
                        <select value={prHead} onChange={(e) => setPrHead(e.target.value)} className="w-full rounded-xl border border-white/[.15] bg-white/[.08] px-3 py-2 text-sm text-white outline-none focus:border-[#a78bfa]/50">
                          <option value="">Select branch…</option>
                          {branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Into (base)</span>
                        <select value={prBase} onChange={(e) => setPrBase(e.target.value)} className="w-full rounded-xl border border-white/[.15] bg-white/[.08] px-3 py-2 text-sm text-white outline-none focus:border-[#a78bfa]/50">
                          {branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Description (optional)</span>
                      <textarea
                        value={prBody}
                        onChange={(e) => setPrBody(e.target.value)}
                        rows={3}
                        placeholder="Describe your changes…"
                        className="w-full rounded-xl border border-white/[.15] bg-white/[.08] px-3 py-2 text-sm text-white/80 outline-none resize-none placeholder:text-white/25 focus:border-[#a78bfa]/50"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <GlassButton variant="primary" size="sm" loading={createPrMutation.isPending} disabled={!prTitle || !prHead} onClick={() => createPrMutation.mutate()}>
                        Create PR
                      </GlassButton>
                      <GlassButton variant="ghost" size="sm" onClick={() => { setShowNewPr(false); setPrTitle(""); setPrHead(""); setPrBody(""); }}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </GlassButton>
                    </div>
                    {createPrMutation.isError && (
                      <p className="text-xs text-[#f87272]">{(createPrMutation.error as any)?.message}</p>
                    )}
                  </div>
                )}

                {pullsLoading && <p className="text-white/40 text-sm animate-pulse py-4 text-center">Loading PRs…</p>}
                <div className="divide-y divide-white/[.06] overflow-auto max-h-96">
                  {pulls.map((pr: any) => (
                    <div key={pr.number} className="py-3 px-1 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <GitPullRequest className={`h-4 w-4 shrink-0 mt-0.5 ${pr.state === "open" ? "text-[#36d399]" : "text-[#a78bfa]"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={pr.htmlUrl} target="_blank" rel="noreferrer" className="text-sm text-white/85 hover:text-[#4f9cf9] font-medium transition-colors truncate">
                              {pr.title}
                            </a>
                            {pr.draft && <span className="text-[10px] text-white/40 border border-white/20 px-1.5 py-0.5 rounded-full shrink-0">Draft</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-white/35">
                            <span className="font-mono">#{pr.number}</span>
                            <span>·</span>
                            <span className="font-mono text-[#4f9cf9]/80">{pr.head}</span>
                            <span className="text-white/25">→</span>
                            <span className="font-mono text-white/50">{pr.base}</span>
                            {pr.author && <><span>·</span><span>@{pr.author}</span></>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a href={pr.htmlUrl} target="_blank" rel="noreferrer">
                            <GlassButton variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></GlassButton>
                          </a>
                          {canManageGitHub && pr.state === "open" && (
                            <div className="flex items-center gap-1">
                              <select
                                value={mergeMethod}
                                onChange={(e) => setMergeMethod(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-lg border border-white/[.12] bg-white/[.07] px-1.5 py-1 text-xs text-white/60 outline-none"
                              >
                                <option value="squash">Squash</option>
                                <option value="merge">Merge</option>
                                <option value="rebase">Rebase</option>
                              </select>
                              <GlassButton
                                variant="primary" size="sm"
                                loading={mergePrMutation.isPending}
                                onClick={() => { if (confirm(`Merge PR #${pr.number}?`)) mergePrMutation.mutate(pr.number); }}
                              >
                                <GitMerge className="h-3.5 w-3.5 mr-1" />Merge
                              </GlassButton>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!pullsLoading && pulls.length === 0 && (
                    <EmptyState title={`No ${prState} pull requests`} description="Create a PR from a feature branch" />
                  )}
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── Commits ── */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-white/50" />
                <h2 className="text-sm font-semibold text-white/80">
                  Commits
                  {selectedBranch && <span className="ml-2 font-mono text-xs text-[#4f9cf9]/80">@ {selectedBranch}</span>}
                  {commits.length > 0 && <span className="ml-1 text-white/35 font-normal">({commits.length})</span>}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedBranch && (
                  <button onClick={() => setSelectedBranch("")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
                    <X className="h-3 w-3" /> Clear filter
                  </button>
                )}
                <GlassButton variant="ghost" size="sm" onClick={() => refetchCommits()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                </GlassButton>
              </div>
            </div>

            {commitsLoading && <p className="text-white/40 text-sm animate-pulse">Fetching commits…</p>}
            {!commitsLoading && !ghSettings?.isConnected && (
              <p className="text-[#fbbd23]/80 text-sm">Connect GitHub and save repo settings to view commits.</p>
            )}
            <div className="divide-y divide-white/[.06]">
              {commits.map((c: any) => (
                <div key={c.fullSha} className="flex items-start gap-3 py-3">
                  <code className="text-xs bg-white/[.07] px-1.5 py-0.5 rounded font-mono text-white/55 shrink-0 mt-0.5">{c.sha}</code>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{c.message}</p>
                    <p className="text-xs text-white/35 mt-0.5">
                      {c.githubUsername ? `@${c.githubUsername}` : c.author}
                      {c.committedAt && ` · ${new Date(c.committedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <a href={c.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <GlassButton variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></GlassButton>
                  </a>
                </div>
              ))}
              {!commitsLoading && ghSettings?.isConnected && commits.length === 0 && (
                <EmptyState title="No commits found" />
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function ProjectProgress({ project, mitItems }: { project: any; mitItems: any[] }) {
  const total      = mitItems.length;
  const deployed   = mitItems.filter((m) => m.currentStatus === "deployed").length;
  const inProgress = mitItems.filter((m) => ["in_development","assigned_to_dev","ready_for_qa","in_qa"].includes(m.currentStatus)).length;
  const overallPct = total > 0 ? Math.round((deployed / total) * 100) : 0;
  const mdSummary  = project.mdSummary;
  const mdPct      = mdSummary?.estimatedMd > 0 ? Math.round((mdSummary.allocatedMd / mdSummary.estimatedMd) * 100) : 0;

  const groups: Record<string, number> = {};
  for (const m of mitItems) groups[m.currentStatus] = (groups[m.currentStatus] ?? 0) + 1;

  const now        = new Date();
  const startDate  = project.startDate  ? new Date(project.startDate)  : null;
  const goLiveDate = project.goLiveDate ? new Date(project.goLiveDate) : null;
  const timelinePct = startDate && goLiveDate
    ? Math.round(((now.getTime() - startDate.getTime()) / (goLiveDate.getTime() - startDate.getTime())) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassStatCard label="Overall Progress" value={`${overallPct}%`} color="blue" description={`${deployed}/${total} items deployed`} />
        <GlassStatCard label="In Progress" value={inProgress} color="orange" description="Items being developed or tested" />
        <GlassStatCard label="Budget Used" value={mdSummary ? `${mdPct}%` : "—"} color={mdPct > 100 ? "red" : "green"} description={mdSummary ? `${mdSummary.allocatedMd} / ${mdSummary.estimatedMd} MD` : "No budget set"} />
      </div>

      {total > 0 && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-white/70 mb-4">MIT Items by Status</h3>
          <div className="space-y-3">
            {Object.entries(groups).map(([status, count]) => {
              const cfg = MIT_STATUS_CONFIG[status] ?? { label: status, color: "slate" as const };
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <GlassBadge color={cfg.color} label={cfg.label} />
                    <span className="text-white/45">{count} items ({pct}%)</span>
                  </div>
                  <GlassProgressBar value={pct} color={cfg.color === "green" ? "green" : cfg.color === "orange" ? "orange" : "blue"} />
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {timelinePct !== null && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Timeline</h3>
          <div className="flex justify-between text-xs text-white/45 mb-2">
            <span>Start: {project.startDate}</span>
            <span>Go Live: {project.goLiveDate}</span>
          </div>
          <GlassProgressBar value={Math.min(100, timelinePct)} color={timelinePct > 100 ? "orange" : "blue"} showLabel />
          {timelinePct > 100 && <p className="text-xs text-[#f87272] mt-1.5">เลยกำหนด go live แล้ว</p>}
        </GlassCard>
      )}

      {total === 0 && (
        <GlassCard>
          <EmptyState title="ยังไม่มี MIT items" description="เพิ่ม MIT items เพื่อดูความคืบหน้า" />
        </GlassCard>
      )}
    </div>
  );
}
