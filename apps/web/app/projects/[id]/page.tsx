"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, requestsApi, mitApi, githubApi } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";
import { Check, RefreshCw, Github, GitBranch, ExternalLink, Users, Inbox } from "lucide-react";
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
  const { data: commitsData, isLoading: commitsLoading, refetch: refetchCommits } = useQuery({
    queryKey: ["github-commits", params.id],
    queryFn: () => githubApi.getProjectCommits(Number(params.id)),
    enabled: activeTab === "GitHub" && !!(ghSettingsData as any)?.data?.isConnected,
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
  const ghSettings = (ghSettingsData as any)?.data;
  const commits: any[] = commitsData?.data ?? [];
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
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-white/60" />
                <div>
                  <h2 className="text-sm font-semibold text-white/80">GitHub Repository</h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    {ghSettings?.isConnected
                      ? <span className="text-[#36d399]">✓ Connected — {ghSettings.repoOwner}/{ghSettings.repoName} @ {ghSettings.defaultBranch}</span>
                      : "Not connected — OAuth token missing"}
                  </p>
                </div>
              </div>
              {canManageGitHub && (
                <a href={githubApi.connectUrl(Number(params.id))}>
                  <GlassButton variant="secondary" size="sm">
                    <Github className="h-3.5 w-3.5 mr-1.5" />
                    {ghSettings?.isConnected ? "Re-connect" : "Connect GitHub"}
                  </GlassButton>
                </a>
              )}
            </div>

            {canManageGitHub && (
              <div className="border-t border-white/[.07] pt-4 space-y-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Repository Settings</p>
                <div className="grid grid-cols-3 gap-3">
                  <GlassInput label="Owner / Org" value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)} placeholder="e.g. ptnp-j4mes" />
                  <GlassInput label="Repository Name" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="e.g. my-project" />
                  <GlassInput label="Default Branch" value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} placeholder="main" />
                </div>
                <div className="flex items-center gap-3">
                  <GlassButton
                    variant="primary" size="sm"
                    loading={saveSettingsMutation.isPending}
                    disabled={!repoOwner || !repoName}
                    onClick={() => saveSettingsMutation.mutate()}
                  >
                    Save Settings
                  </GlassButton>
                  {settingsSaved && <span className="text-xs text-[#36d399] flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span>}
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-white/50" />
                <h2 className="text-sm font-semibold text-white/80">Recent Commits {commits.length > 0 && <span className="text-white/35 font-normal">({commits.length})</span>}</h2>
              </div>
              <GlassButton variant="ghost" size="sm" onClick={() => refetchCommits()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </GlassButton>
            </div>

            {commitsLoading && <p className="text-white/40 text-sm animate-pulse">Fetching commits…</p>}
            {!commitsLoading && !ghSettings?.isConnected && (
              <p className="text-[#fbbd23]/80 text-sm">Connect GitHub and save repo settings to view commits.</p>
            )}

            <div className="divide-y divide-white/[.06]">
              {commits.map((c: any) => (
                <div key={c.fullSha} className="flex items-start gap-3 py-3">
                  <code className="text-xs bg-white/[.07] px-1.5 py-0.5 rounded-xs font-mono text-white/55 shrink-0 mt-0.5">{c.sha}</code>
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

      {/* Timeline */}
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
