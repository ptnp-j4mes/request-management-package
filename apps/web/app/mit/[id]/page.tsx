"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mitApi, githubApi } from "../../../lib/api";
import Link from "next/link";
import { useState } from "react";
import { WorkflowActionSheet } from "../../../components/mit/WorkflowActionSheet";
import { GitBranch, GitPullRequest, ExternalLink, RefreshCw, Trash2, Zap, ChevronRight, Clock } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { GlassCard } from "../../../components/ui/GlassCard";
import { GlassBadge } from "../../../components/ui/GlassBadge";
import { GlassButton } from "../../../components/ui/GlassButton";
import { EmptyState } from "../../../components/ui/EmptyState";

const STEP_COLORS: Record<string, "blue"|"yellow"|"orange"|"green"|"slate"> = {
  DEV: "blue", QA: "yellow", UAT: "orange", MA: "green",
};
const STATUS_COLOR: Record<string, "blue"|"green"|"orange"|"slate"> = {
  deployed: "green", in_qa: "blue", ready_for_qa: "blue",
  in_development: "orange", assigned_to_dev: "orange", new: "slate",
};

export default function MitDetailPage({ params }: { params: { id: string } }) {
  const [showAction, setShowAction] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["mit-item", params.id],
    queryFn: () => mitApi.get(Number(params.id)),
  });
  const mit = data?.data;

  const { data: commitsData, isLoading: commitsLoading, refetch: refetchCommits } = useQuery({
    queryKey: ["mit-commits", params.id],
    queryFn: () => githubApi.getMitCommits(Number(params.id)),
    enabled: !!mit,
    retry: false,
  });
  const commits: any[] = commitsData?.data?.commits ?? [];
  const commitsError = commitsData?.success === false ? commitsData?.error : null;

  const createBranchMutation = useMutation({
    mutationFn: () => githubApi.createBranch(Number(params.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mit-item", params.id] }),
  });
  const createPrMutation = useMutation({
    mutationFn: () => githubApi.createPr(Number(params.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mit-item", params.id] }),
  });
  const mergePrMutation = useMutation({
    mutationFn: () => githubApi.mergePr(Number(params.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mit-item", params.id] }),
  });
  const deleteBranchMutation = useMutation({
    mutationFn: () => githubApi.deleteBranch(Number(params.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mit-item", params.id] }),
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px] text-white/40 animate-pulse">Loading…</div>;
  if (!mit) return <div className="flex items-center justify-center min-h-[400px] text-[#f87272]">MIT item not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={mit.title}
        breadcrumb={["MIT Board", mit.mitNo]}
        actions={
          <div className="flex items-center gap-2">
            {mit.currentStepCode && <GlassBadge color={STEP_COLORS[mit.currentStepCode] ?? "slate"} label={mit.currentStepCode} />}
            <GlassBadge color={STATUS_COLOR[mit.currentStatus] ?? "slate"} label={mit.currentStatus?.replace(/_/g, " ")} dot />
            {mit.priority && <GlassBadge color="slate" label={mit.priority} />}
            <GlassButton variant="primary" size="sm" onClick={() => setShowAction(true)}>
              <Zap className="h-3.5 w-3.5 mr-1.5" /> Workflow Action
            </GlassButton>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Main — left 2/3 */}
        <div className="col-span-2 space-y-6">
          {/* Details */}
          <GlassCard>
            <h2 className="text-sm font-semibold text-white/70 mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["Module", mit.moduleName ?? "—"],
                ["Type", mit.itemType],
                ["Planned End", mit.plannedEndDate ?? "—"],
                ["Est. Hours", mit.estimatedHours ?? "—"],
                ["QA Done", mit.qaCompletedAt ? new Date(mit.qaCompletedAt).toLocaleDateString() : "—"],
                ["UAT Done", mit.uatCompletedAt ? new Date(mit.uatCompletedAt).toLocaleDateString() : "—"],
                ["Deployed", mit.deployedAt ? new Date(mit.deployedAt).toLocaleDateString() : "—"],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="text-white/40 w-28 shrink-0">{label}</span>
                  <span className="text-white/80 font-medium">{val}</span>
                </div>
              ))}
            </div>
            {mit.description && (
              <div className="border-t border-white/[.06] mt-4 pt-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-white/70 leading-relaxed">{mit.description}</p>
              </div>
            )}
          </GlassCard>

          {/* GitHub Panel */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-4 w-4 text-[#4f9cf9]" />
              <h2 className="text-sm font-semibold text-white/70">GitHub</h2>
            </div>

            {/* Branch */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-xs text-white/40 w-14 shrink-0">Branch</span>
              {mit.githubBranchName ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs bg-white/[.07] px-2 py-1 rounded-xs font-mono text-[#4f9cf9]">
                    {mit.githubBranchName}
                  </code>
                  <GlassButton
                    variant="danger"
                    size="sm"
                    loading={deleteBranchMutation.isPending}
                    onClick={() => deleteBranchMutation.mutate()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </GlassButton>
                </div>
              ) : (
                <GlassButton
                  variant="secondary"
                  size="sm"
                  loading={createBranchMutation.isPending}
                  onClick={() => createBranchMutation.mutate()}
                >
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  Create Branch (mit/{mit.mitNo?.toLowerCase()})
                </GlassButton>
              )}
              {createBranchMutation.isError && <span className="text-xs text-[#f87272]">{(createBranchMutation.error as any)?.message}</span>}
            </div>

            {/* PR */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-white/40 w-14 shrink-0">PR</span>
              {mit.githubPrNumber ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={mit.githubPrUrl ?? "#"} target="_blank" rel="noreferrer">
                    <GlassButton variant="ghost" size="sm">
                      <GitPullRequest className="h-3.5 w-3.5 mr-1.5" /> #{mit.githubPrNumber} View PR
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </GlassButton>
                  </a>
                  <GlassButton
                    variant="success"
                    size="sm"
                    loading={mergePrMutation.isPending}
                    onClick={() => mergePrMutation.mutate()}
                  >
                    Merge PR
                  </GlassButton>
                </div>
              ) : mit.githubBranchName ? (
                <GlassButton
                  variant="primary"
                  size="sm"
                  loading={createPrMutation.isPending}
                  onClick={() => createPrMutation.mutate()}
                >
                  <GitPullRequest className="h-3.5 w-3.5 mr-1.5" /> Create PR
                </GlassButton>
              ) : (
                <span className="text-xs text-white/30">Create a branch first</span>
              )}
              {createPrMutation.isError && <span className="text-xs text-[#f87272]">{(createPrMutation.error as any)?.message}</span>}
              {mergePrMutation.isError && <span className="text-xs text-[#f87272]">{(mergePrMutation.error as any)?.message}</span>}
            </div>

            {/* Commits */}
            <div className="border-t border-white/[.07] mt-4 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Commits {commits.length > 0 && `(${commits.length})`}
                  {commitsData?.data?.filterBy && <span className="ml-1 normal-case font-normal">@{commitsData.data.filterBy}</span>}
                </h3>
                <GlassButton variant="ghost" size="sm" onClick={() => refetchCommits()}>
                  <RefreshCw className="h-3 w-3" />
                </GlassButton>
              </div>

              {commitsLoading && <p className="text-white/35 text-xs animate-pulse">Fetching commits…</p>}
              {!commitsLoading && commitsError && <p className="text-[#fbbd23]/80 text-xs">{commitsError}</p>}
              {!commitsLoading && !commitsError && commits.length === 0 && (
                <p className="text-white/30 text-xs">No commits found.</p>
              )}

              <div className="divide-y divide-white/[.05] space-y-0">
                {commits.map((c: any) => (
                  <div key={c.fullSha} className="flex items-start gap-3 py-2.5">
                    <code className="text-xs bg-white/[.06] px-1.5 py-0.5 rounded-xs font-mono text-white/45 shrink-0">{c.sha}</code>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/75 truncate">{c.message}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        {c.githubUsername ? `@${c.githubUsername}` : c.author}
                        {c.committedAt && ` · ${new Date(c.committedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <a href={c.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <GlassButton variant="ghost" size="sm"><ExternalLink className="h-3 w-3" /></GlassButton>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar — right 1/3 */}
        <div className="space-y-6">
          {/* Assignments */}
          <GlassCard>
            <h2 className="text-sm font-semibold text-white/70 mb-3">Assignments ({mit.assignments?.length ?? 0})</h2>
            <div className="space-y-2 text-sm">
              {(mit.assignments ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-xs bg-white/[.04] px-3 py-2 border border-white/[.06]">
                  <div>
                    <span className="text-white/60 capitalize text-xs">{a.assignedRole}</span>
                    <span className="text-white/35 text-xs ml-2">User {a.assignedUserId}</span>
                  </div>
                  <GlassBadge color={a.assignmentStatus === "completed" ? "green" : "slate"} label={a.assignmentStatus} />
                </div>
              ))}
              {(mit.assignments ?? []).length === 0 && <p className="text-white/30 text-xs">No assignments</p>}
            </div>
          </GlassCard>

          {/* Handoffs */}
          <GlassCard>
            <h2 className="text-sm font-semibold text-white/70 mb-3">Handoffs ({mit.handoffs?.length ?? 0})</h2>
            <div className="space-y-2 text-xs">
              {(mit.handoffs ?? []).map((h: any) => (
                <div key={h.id} className="rounded-xs bg-white/[.04] px-3 py-2 border border-white/[.06]">
                  <div className="flex items-center gap-1.5 text-white/60">
                    <span>Step {h.fromStepId}</span>
                    <ChevronRight className="h-3 w-3 text-white/30" />
                    <span className="text-white/80">{h.toStepId}</span>
                    <GlassBadge color="slate" label={h.handoffStatus} />
                  </div>
                  {h.note && <p className="text-white/35 mt-1">{h.note}</p>}
                </div>
              ))}
              {(mit.handoffs ?? []).length === 0 && <p className="text-white/30">No handoffs</p>}
            </div>
          </GlassCard>

          {/* Status History */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-white/40" />
              <h2 className="text-sm font-semibold text-white/70">Status History</h2>
            </div>
            <div className="space-y-2 text-xs">
              {(mit.history ?? []).map((h: any) => (
                <div key={h.id}>
                  <div className="flex items-center gap-1.5 text-white/60">
                    <span className="text-white/30">{h.oldStatus ?? "—"}</span>
                    <ChevronRight className="h-3 w-3 text-white/25" />
                    <span className="font-medium text-white/80">{h.newStatus}</span>
                  </div>
                  <p className="text-white/25 mt-0.5">{new Date(h.changedAt).toLocaleString()}</p>
                </div>
              ))}
              {(mit.history ?? []).length === 0 && <p className="text-white/30">No history</p>}
            </div>
          </GlassCard>
        </div>
      </div>

      {showAction && (
        <WorkflowActionSheet mitId={mit.id} currentUserId={1} onClose={() => setShowAction(false)} />
      )}
    </div>
  );
}
