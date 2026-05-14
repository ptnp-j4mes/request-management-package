"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { requestsApi, githubApi } from "../../../lib/api";
import { projectCommandCenterApi } from "../../../lib/project-command-center-api";
import {
  BarChart2, CheckSquare, Layers, TestTube, ShieldAlert,
  Users, BarChart, Settings, Github, Inbox, Plus, Unlink,
  CheckCircle2, Circle, Zap, AlertTriangle, Clock, ArrowRight,
  GitBranch, GitPullRequest, GitMerge, ExternalLink, RefreshCw, Trash2, X, Check,
} from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { GlassCard } from "../../../components/ui/GlassCard";
import { GlassStatCard } from "../../../components/ui/GlassStatCard";
import { GlassTabs } from "../../../components/ui/GlassTabs";
import { GlassBadge } from "../../../components/ui/GlassBadge";
import { GlassButton } from "../../../components/ui/GlassButton";
import { GlassInput, GlassTextarea, GlassSelect } from "../../../components/ui/GlassInput";
import { GlassProgressBar } from "../../../components/ui/GlassProgressBar";
import { EmptyState } from "../../../components/ui/EmptyState";

type TabKey = "overview" | "requests" | "tasks" | "mit" | "uat" | "risks" | "members" | "reports" | "settings" | "github" | "meetings";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "overview",  label: "Overview",               icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { key: "requests",  label: "Requests",               icon: <Inbox className="h-3.5 w-3.5" /> },
  { key: "tasks",     label: "Tasks / Checklist",      icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { key: "mit",       label: "MIT Items",              icon: <Layers className="h-3.5 w-3.5" /> },
  { key: "uat",       label: "UAT",                    icon: <TestTube className="h-3.5 w-3.5" /> },
  { key: "risks",     label: "Risks / Issues",         icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  { key: "members",   label: "Members",                icon: <Users className="h-3.5 w-3.5" /> },
  { key: "reports",   label: "Reports",                icon: <BarChart className="h-3.5 w-3.5" /> },
  { key: "settings",  label: "Settings / Status",      icon: <Settings className="h-3.5 w-3.5" /> },
  { key: "github",    label: "GitHub",                 icon: <Github className="h-3.5 w-3.5" /> },
  { key: "meetings",  label: "Meetings",               icon: <Clock className="h-3.5 w-3.5" /> },
];

function healthColor(status?: string): "green" | "red" | "orange" {
  if (status === "green") return "green";
  if (status === "red") return "red";
  return "orange";
}

export default function ProjectCommandCenterPage() {
  const params = useParams<{ id: string }>();
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const projectId = Number(params.id);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskSummary, setTaskSummary] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newRequestSubject, setNewRequestSubject] = useState("");
  const [newRequestDescription, setNewRequestDescription] = useState("");
  const [newRequestType, setNewRequestType] = useState("change_request");
  const [linkRequestId, setLinkRequestId] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [nextStatus, setNextStatus] = useState("active");
  const [message, setMessage] = useState<string | null>(null);
  const canManageProject = !!user?.roles?.some((role: string) => ["ADMIN", "IT_MANAGER", "BA", "FULLSTACK"].includes(role));
  const canManageRequestLinks = !!user?.roles?.some((role: string) => ["ADMIN", "IT_MANAGER"].includes(role));

  // ── GitHub state ──────────────────────────────────────────────────────────
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [showNewPr, setShowNewPr] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prHead, setPrHead] = useState("");
  const [prBase, setPrBase] = useState("");
  const [prBody, setPrBody] = useState("");
  const [prState, setPrState] = useState<"open" | "closed">("open");
  const [mergeMethod, setMergeMethod] = useState("squash");
  const canManageGitHub = hasAnyRole(["IT_MANAGER", "ADMIN"]);

  // ── GitHub queries ────────────────────────────────────────────────────────
  const { data: ghSettingsData } = useQuery({
    queryKey: ["github-settings", projectId],
    queryFn: () => githubApi.getSettings(projectId),
    enabled: activeTab === "github",
    onSuccess: (d: any) => {
      if (d?.data) {
        setRepoOwner(d.data.repoOwner ?? "");
        setRepoName(d.data.repoName ?? "");
        setDefaultBranch(d.data.defaultBranch ?? "main");
      }
    },
  } as any);
  const ghSettings = (ghSettingsData as any)?.data;
  const ghConnected = !!ghSettings?.isConnected;

  const { data: branchesData, isLoading: branchesLoading, refetch: refetchBranches } = useQuery({
    queryKey: ["github-branches", projectId],
    queryFn: () => githubApi.listBranches(projectId),
    enabled: activeTab === "github" && ghConnected,
    retry: false,
  });
  const { data: pullsData, isLoading: pullsLoading, refetch: refetchPulls } = useQuery({
    queryKey: ["github-pulls", projectId, prState],
    queryFn: () => githubApi.listPulls(projectId, prState),
    enabled: activeTab === "github" && ghConnected,
    retry: false,
  });
  const { data: commitsData, isLoading: commitsLoading, refetch: refetchCommits } = useQuery({
    queryKey: ["github-commits", projectId, selectedBranch],
    queryFn: () => githubApi.getProjectCommits(projectId),
    enabled: activeTab === "github" && ghConnected,
    retry: false,
  });

  // ── GitHub mutations ──────────────────────────────────────────────────────
  const saveSettingsMutation = useMutation({
    mutationFn: () => githubApi.updateSettings(projectId, { repoOwner, repoName, defaultBranch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-settings", projectId] });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    },
  });
  const createBranchMutation = useMutation({
    mutationFn: () => githubApi.createProjectBranch(projectId, { branchName: newBranchName, baseBranch: baseBranch || undefined }),
    onSuccess: () => { setShowNewBranch(false); setNewBranchName(""); setBaseBranch(""); refetchBranches(); },
  });
  const deleteBranchMutation = useMutation({
    mutationFn: (name: string) => githubApi.deleteProjectBranch(projectId, name),
    onSuccess: () => refetchBranches(),
  });
  const createPrMutation = useMutation({
    mutationFn: () => githubApi.createPull(projectId, { title: prTitle, head: prHead, base: prBase || undefined, body: prBody || undefined }),
    onSuccess: () => { setShowNewPr(false); setPrTitle(""); setPrHead(""); setPrBase(""); setPrBody(""); refetchPulls(); },
  });
  const mergePrMutation = useMutation({
    mutationFn: (prNumber: number) => githubApi.mergePull(projectId, prNumber, { mergeMethod }),
    onSuccess: () => { refetchPulls(); refetchBranches(); refetchCommits(); },
  });

  const branches: any[] = (branchesData as any)?.data ?? [];
  const pulls: any[] = (pullsData as any)?.data ?? [];
  const commits: any[] = (commitsData as any)?.data ?? [];

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const projectRes = await import("../../../lib/api").then(({ projectsApi }) => projectsApi.get(projectId));
      const nextProject = projectRes.data ?? projectRes;
      setProject(nextProject);
      setNextStatus(nextProject?.status ?? "active");

      const [summaryRes, healthRes, requestsRes, tasksRes, approvedRequestsRes] = await Promise.allSettled([
        projectCommandCenterApi.progressSummary(projectId),
        projectCommandCenterApi.health(projectId),
        projectCommandCenterApi.requests(projectId),
        projectCommandCenterApi.tasks(projectId),
        requestsApi.list({ status: "approved", limit: "100" }),
      ]);

      const partialFailures: string[] = [];

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
        partialFailures.push("summary");
      }

      if (healthRes.status === "fulfilled") {
        setHealth(healthRes.value.data);
      } else {
        setHealth(null);
        partialFailures.push("health");
      }

      if (requestsRes.status === "fulfilled") {
        setRequests(requestsRes.value.data ?? []);
      } else {
        setRequests([]);
        partialFailures.push("requests");
      }

      if (tasksRes.status === "fulfilled") {
        setTasks(tasksRes.value.data?.items ?? []);
        setTaskSummary(tasksRes.value.data?.summary ?? null);
      } else {
        setTasks([]);
        setTaskSummary(null);
        partialFailures.push("tasks");
      }

      if (approvedRequestsRes.status === "fulfilled") {
        setAvailableRequests((approvedRequestsRes.value.data?.items ?? []).filter((request: any) => !request.projectId || request.projectId === projectId));
      } else {
        setAvailableRequests([]);
      }

      if (partialFailures.length > 0) {
        setMessage(`Project loaded with partial data (${partialFailures.join(", ")} unavailable).`);
      }
    } catch (error: any) {
      setProject(null);
      setMessage(error.message ?? "Unable to load project workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) void load();
  }, [projectId]);

  const groupedTasks = useMemo(() => {
    return tasks.reduce<Record<string, any[]>>((acc, task) => {
      const key = task.moduleName || task.featureName || "Ungrouped";
      acc[key] = acc[key] ?? [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  async function createTask() {
    if (!newTaskTitle.trim()) return;
    await projectCommandCenterApi.createTask(projectId, { title: newTaskTitle.trim(), taskType: "checklist", status: "todo" });
    setNewTaskTitle("");
    await load();
  }

  async function toggleTask(task: any) {
    if (task.status === "done") await projectCommandCenterApi.reopenTask(task.id);
    else await projectCommandCenterApi.completeTask(task.id);
    await load();
  }

  async function updateStatus() {
    const res = await projectCommandCenterApi.updateStatus(projectId, { status: nextStatus, note: statusNote });
    const warnings = res.data?.warnings?.length ? ` Warnings: ${res.data.warnings.join(" ")}` : "";
    setMessage(`Project status updated.${warnings}`);
    await load();
  }

  async function createRequest() {
    if (!newRequestSubject.trim() || !newRequestDescription.trim()) return;
    await requestsApi.create({
      projectId,
      channel: "portal",
      requestType: newRequestType,
      subject: newRequestSubject.trim(),
      description: newRequestDescription.trim(),
    });
    setNewRequestSubject("");
    setNewRequestDescription("");
    setNewRequestType("change_request");
    await load();
  }

  async function linkExistingRequest() {
    if (!linkRequestId.trim()) return;
    await requestsApi.update(Number(linkRequestId), { projectId });
    setLinkRequestId("");
    await load();
  }

  async function unlinkRequest(requestId: number) {
    await requestsApi.unlinkProject(requestId);
    await load();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px] text-white/40 animate-pulse">
      Loading project…
    </div>
  );
  if (!project) return (
    <div className="flex items-center justify-center min-h-[400px] text-[#f87272]">
      Project not found.
    </div>
  );

  const tabsWithCounts = TABS.map((t) => ({
    id: t.key,
    label: t.label,
    icon: t.icon,
    count: t.key === "requests" && requests.length > 0 ? requests.length
         : t.key === "tasks" && tasks.length > 0 ? tasks.length
         : undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={project.projectName}
        breadcrumb={["Projects", project.projectCode]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-white/40 bg-white/[.06] border border-white/[.10] px-2.5 py-1 rounded-full">
              {project.projectCode}
            </span>
            {health?.status && (
              <GlassBadge
                color={healthColor(health.status)}
                label={health.status}
                dot
                pulse={health.status === "green"}
              />
            )}
            <GlassBadge
              color={project.status === "active" ? "green" : "slate"}
              label={project.status}
            />
            {project.customerName && (
              <span className="flex items-center gap-1.5 text-xs text-white/55 bg-white/[.06] border border-white/[.10] px-2.5 py-1 rounded-full">
                <Users className="h-3 w-3 text-white/35" />
                {project.customerName}
              </span>
            )}
          </div>
        }
      />

      {message && (
        <GlassCard variant="amber">
          <p className="text-sm text-[#fbbd23]/90">{message}</p>
        </GlassCard>
      )}

      <GlassTabs tabs={tabsWithCounts} active={activeTab} onChange={(id) => setActiveTab(id as TabKey)} />

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassStatCard
              label="Overall Progress"
              value={`${summary?.progressPercent ?? 0}%`}
              color="blue"
              icon={<BarChart2 className="h-5 w-5" />}
              description="MIT + task completion"
            />
            <GlassStatCard
              label="Requests"
              value={summary?.requestCount ?? 0}
              color="purple"
              icon={<Inbox className="h-5 w-5" />}
              description="Linked intake items"
            />
            <GlassStatCard
              label="MIT Completed"
              value={`${summary?.mit?.completed ?? 0}/${summary?.mit?.total ?? 0}`}
              color="cyan"
              icon={<Layers className="h-5 w-5" />}
              description={`${summary?.mit?.deployed ?? 0} deployed`}
            />
            <GlassStatCard
              label="Tasks Completed"
              value={`${summary?.tasks?.completed ?? 0}/${summary?.tasks?.total ?? 0}`}
              color="green"
              icon={<CheckSquare className="h-5 w-5" />}
              description={`${summary?.tasks?.blocked ?? 0} blocked`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassStatCard
              label="UAT Pass Rate"
              value={summary?.uat?.passRate === null || summary?.uat?.passRate === undefined ? "N/A" : `${summary.uat.passRate}%`}
              color="orange"
              icon={<TestTube className="h-5 w-5" />}
              description={`${summary?.uat?.pass ?? 0} pass · ${summary?.uat?.fail ?? 0} fail · ${summary?.uat?.blocked ?? 0} blocked`}
            />
            <GlassStatCard
              label="Open Defects"
              value={summary?.openDefects ?? 0}
              color={summary?.openDefects > 0 ? "red" : "green"}
              icon={<AlertTriangle className="h-5 w-5" />}
              description={`${summary?.criticalHighDefects ?? 0} critical/high`}
            />
            <GlassStatCard
              label="Go-live Readiness"
              value={summary?.goLiveReadiness ?? "—"}
              color={summary?.goLiveReadiness === "ready" ? "green" : "orange"}
              icon={<Zap className="h-5 w-5" />}
              description={summary?.upcomingMilestone?.name ? `Next: ${summary.upcomingMilestone.name}` : "No upcoming milestone"}
            />
          </div>

          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/80">Health Score</h2>
              <span className={`text-3xl font-bold ${health?.status === "green" ? "text-[#36d399]" : health?.status === "red" ? "text-[#f87272]" : "text-[#fb923c]"}`}>
                {health?.score ?? 0}
              </span>
            </div>
            <GlassProgressBar
              value={health?.score ?? 0}
              color={health?.status === "green" ? "green" : health?.status === "red" ? "red" : "orange"}
            />
            {(health?.reasons ?? []).length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {(health.reasons ?? []).map((reason: string) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-white/55">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/30 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── Requests ── */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {canManageProject && (
            <GlassCard>
              <h2 className="text-sm font-semibold text-white/80 mb-1">Create New Request</h2>
              <p className="text-xs text-white/40 mb-4">Submit a new request directly linked to this project.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <GlassInput
                    label="Subject"
                    value={newRequestSubject}
                    onChange={(e) => setNewRequestSubject(e.target.value)}
                    placeholder="Request subject"
                  />
                  <GlassSelect
                    label="Type"
                    value={newRequestType}
                    onChange={(e) => setNewRequestType(e.target.value)}
                    options={[
                      { value: "change_request", label: "Change Request" },
                      { value: "bug", label: "Bug" },
                      { value: "support", label: "Support" },
                      { value: "feedback", label: "Feedback" },
                      { value: "uat_finding", label: "UAT Finding" },
                    ]}
                  />
                </div>
                <GlassTextarea
                  label="Description"
                  value={newRequestDescription}
                  onChange={(e) => setNewRequestDescription(e.target.value)}
                  placeholder="Describe the request…"
                  rows={3}
                />
                <GlassButton variant="primary" size="sm" onClick={createRequest}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create Request
                </GlassButton>
              </div>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-0">
              <div className="px-6 pt-5 pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35">Linked Requests</h3>
              </div>
              <div className="divide-y divide-white/[.06]">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[.03] transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link href={`/requests/${request.id}`} className="block text-sm font-medium text-white/80 hover:text-[#4f9cf9] truncate transition-colors">
                        {request.subject}
                      </Link>
                      <p className="text-xs text-white/35 mt-0.5 truncate">
                        <span className="font-mono">{request.requestNo}</span>
                        {" · "}{request.requestType?.replace(/_/g, " ")}
                        {request.priority ? ` · ${request.priority}` : ""}
                        {request.createdAt ? ` · ${new Date(request.createdAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <GlassBadge color="slate" label={request.status} />
                      {canManageRequestLinks && (
                        <GlassButton variant="ghost" size="sm" onClick={() => void unlinkRequest(request.id)}>
                          <Unlink className="h-3.5 w-3.5" />
                        </GlassButton>
                      )}
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <div className="px-6 py-8">
                    <EmptyState icon={<Inbox className="h-5 w-5" />} title="No linked requests" description="Create or link requests to this project." />
                  </div>
                )}
              </div>
            </GlassCard>

            {canManageRequestLinks && (
              <GlassCard>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35 mb-4">Link Approved Request</h3>
                <GlassSelect
                  label="Select Request"
                  value={linkRequestId}
                  onChange={(e) => setLinkRequestId(e.target.value)}
                  options={[
                    { value: "", label: "Select request to link…" },
                    ...availableRequests.map((r) => ({ value: String(r.id), label: `${r.requestNo} · ${r.subject}` })),
                  ]}
                />
                <p className="text-xs text-white/35 mt-2 mb-4">Only approved requests without a project are shown.</p>
                <GlassButton variant="secondary" size="sm" disabled={!linkRequestId} onClick={linkExistingRequest}>
                  Link Request
                </GlassButton>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      {/* ── Tasks / Checklist ── */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <GlassCard>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white/80">Tasks / Checklist</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {taskSummary?.done ?? 0}/{taskSummary?.total ?? 0} done · {taskSummary?.percent ?? 0}% complete
                </p>
              </div>
              {taskSummary?.total > 0 && (
                <div className="w-48">
                  <GlassProgressBar value={taskSummary?.percent ?? 0} color="green" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <GlassInput
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New checklist item…"
                onKeyDown={(e) => e.key === "Enter" && void createTask()}
              />
              <GlassButton variant="primary" size="sm" onClick={createTask} disabled={!newTaskTitle.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </GlassButton>
            </div>
          </GlassCard>

          {Object.entries(groupedTasks).map(([group, groupTasks]) => (
            <GlassCard key={group} className="p-0">
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35">{group}</h3>
                <span className="text-xs text-white/35">
                  {groupTasks.filter((t) => t.status === "done").length}/{groupTasks.length}
                </span>
              </div>
              <div className="divide-y divide-white/[.06]">
                {groupTasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-center justify-between gap-3 px-6 py-3 hover:bg-white/[.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void toggleTask(task)}
                        className="shrink-0 text-white/40 hover:text-[#36d399] transition-colors"
                      >
                        {task.status === "done"
                          ? <CheckCircle2 className="h-4 w-4 text-[#36d399]" />
                          : <Circle className="h-4 w-4" />
                        }
                      </button>
                      <div>
                        <p className={`text-sm ${task.status === "done" ? "line-through text-white/30" : "text-white/80 font-medium"}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {task.taskType}
                          {task.priority ? ` · ${task.priority}` : ""}
                          {task.assignedUserFullName ? ` · ${task.assignedUserFullName}` : ""}
                        </p>
                      </div>
                    </div>
                    <GlassBadge
                      color={task.status === "done" ? "green" : task.status === "blocked" ? "red" : "slate"}
                      label={task.status}
                    />
                  </label>
                ))}
              </div>
            </GlassCard>
          ))}

          {tasks.length === 0 && (
            <GlassCard>
              <EmptyState icon={<CheckSquare className="h-5 w-5" />} title="No tasks yet" description="Add checklist items above to track progress." />
            </GlassCard>
          )}
        </div>
      )}

      {/* ── Settings / Status ── */}
      {activeTab === "settings" && (
        <GlassCard>
          <h2 className="text-sm font-semibold text-white/80 mb-4">Project Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-end">
            <GlassSelect
              label="New Status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              options={[
                { value: "active", label: "active" },
                { value: "on_hold", label: "on_hold" },
                { value: "completed", label: "completed" },
                { value: "cancelled", label: "cancelled" },
              ]}
            />
            <GlassInput
              label="Reason / Note"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Reason for status change…"
            />
            <GlassButton variant="primary" onClick={updateStatus}>
              Update Status
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* ── GitHub ── */}
      {activeTab === "github" && (
        <div className="space-y-4">
          {/* Connection + Settings */}
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
                  <GlassButton variant="secondary" size="sm" onClick={() => { window.location.href = githubApi.connectUrl(projectId); }}>
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
              {/* Branches Panel */}
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
                        {branches.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>)}
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
                      {b.name === ghSettings?.defaultBranch && <span className="text-[10px] text-[#36d399] border border-[#36d399]/30 px-1.5 py-0.5 rounded-full shrink-0">default</span>}
                      {b.protected && <span className="text-[10px] text-[#fbbd23] border border-[#fbbd23]/30 px-1.5 py-0.5 rounded-full shrink-0">protected</span>}
                      <code className="text-[10px] text-white/25 font-mono shrink-0">{(b.commitSha ?? "").slice(0, 7)}</code>
                      {canManageGitHub && b.name !== ghSettings?.defaultBranch && !b.protected && (
                        <button
                          type="button"
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

              {/* Pull Requests Panel */}
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
                      onChange={(e) => setPrState(e.target.value as "open" | "closed")}
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

          {/* Commits */}
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
                  <button type="button" onClick={() => setSelectedBranch("")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
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
            <div className="h-[500px] overflow-y-auto divide-y divide-white/[.06]">
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
                  {c.htmlUrl && (
                    <a href={c.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <GlassButton variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></GlassButton>
                    </a>
                  )}
                </div>
              ))}
              {!commitsLoading && ghSettings?.isConnected && commits.length === 0 && (
                <EmptyState title="No commits found" />
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Meetings ── */}
      {activeTab === "meetings" && (
        <Link href={`/projects/${projectId}/meetings`} className="block group">
          <GlassCard className="flex items-center gap-5 transition hover:bg-white/[.10] cursor-pointer">
            <div className="h-14 w-14 shrink-0 rounded-2xl border border-white/[.12] bg-white/[.06] flex items-center justify-center group-hover:border-white/20 group-hover:bg-white/10 transition">
              <Clock className="h-7 w-7 text-white/50 group-hover:text-white/80 transition" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white/80 group-hover:text-white transition">Project Meetings</h3>
              <p className="text-sm text-white/35 mt-0.5">Meeting schedule, bot recordings, transcripts และ summaries</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/25 group-hover:text-white/55 group-hover:translate-x-1 transition shrink-0" />
          </GlassCard>
        </Link>
      )}

      {/* ── Stub tabs ── */}
      {(["mit", "uat", "risks", "members", "reports"] as TabKey[]).includes(activeTab) && (
        <GlassCard className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-white/[.06] border border-white/[.10] flex items-center justify-center">
            {TABS.find((t) => t.key === activeTab)?.icon && (
              <span className="text-white/40 [&>svg]:h-6 [&>svg]:w-6">
                {TABS.find((t) => t.key === activeTab)!.icon}
              </span>
            )}
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-semibold text-white/70">
              {TABS.find((t) => t.key === activeTab)?.label}
            </h3>
            <p className="text-sm text-white/35">
              This section is being prepared. Existing module pages will be embedded here.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
