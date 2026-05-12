"use client";
import { useQuery } from "@tanstack/react-query";
import { mitApi, githubApi } from "../../../lib/api";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { WorkflowActionSheet } from "../../../components/mit/WorkflowActionSheet";

export default function MitDetailPage({ params }: { params: { id: string } }) {
  const [showAction, setShowAction] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["mit-item", params.id],
    queryFn: () => mitApi.get(Number(params.id)),
  });
  const mit = data?.data;

  const { data: commitsData, isLoading: commitsLoading } = useQuery({
    queryKey: ["mit-commits", params.id],
    queryFn: () => githubApi.getMitCommits(Number(params.id)),
    enabled: !!mit,
    retry: false,
  });
  const commits: any[] = commitsData?.data?.commits ?? [];
  const commitsError = commitsData?.success === false ? commitsData?.error : null;
  const queryClient = useQueryClient();

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

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!mit) return <div className="p-6 text-red-500">MIT item not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/mit" className="hover:underline">MIT Board</Link>
        <span>/</span>
        <span className="font-mono text-slate-800">{mit.mitNo}</span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{mit.title}</h1>
            <div className="flex gap-3 mt-2 text-sm">
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{mit.currentStepCode ?? "—"}</span>
              <span className="capitalize text-slate-600">{mit.currentStatus}</span>
              {mit.priority && <span className="capitalize text-slate-500">{mit.priority}</span>}
            </div>
          </div>
          <button
            onClick={() => setShowAction(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Workflow Action ⚡
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Module:</span> <b>{mit.moduleName ?? "—"}</b></div>
          <div><span className="text-slate-500">Type:</span> <b>{mit.itemType}</b></div>
          <div><span className="text-slate-500">Planned End:</span> <b>{mit.plannedEndDate ?? "—"}</b></div>
          <div><span className="text-slate-500">Estimated Hours:</span> <b>{mit.estimatedHours ?? "—"}</b></div>
          <div><span className="text-slate-500">QA Completed:</span> <b>{mit.qaCompletedAt ? new Date(mit.qaCompletedAt).toLocaleString() : "—"}</b></div>
          <div><span className="text-slate-500">UAT Completed:</span> <b>{mit.uatCompletedAt ? new Date(mit.uatCompletedAt).toLocaleString() : "—"}</b></div>
          <div><span className="text-slate-500">Deployed:</span> <b>{mit.deployedAt ? new Date(mit.deployedAt).toLocaleString() : "—"}</b></div>
        </div>

        {mit.description && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
            <p className="text-sm text-slate-600">{mit.description}</p>
          </div>
        )}
      </div>

      {/* Step Assignments */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Step Assignments ({mit.assignments?.length ?? 0})</h2>
        <div className="space-y-2 text-sm">
          {(mit.assignments ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center gap-4 bg-slate-50 rounded px-3 py-2">
              <span className="font-mono text-xs text-slate-400">Step {a.stepId}</span>
              <span>User {a.assignedUserId}</span>
              <span className="capitalize">{a.assignedRole}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${a.assignmentStatus === "completed" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{a.assignmentStatus}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Handoffs */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Handoffs ({mit.handoffs?.length ?? 0})</h2>
        <div className="space-y-2 text-sm">
          {(mit.handoffs ?? []).map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 bg-slate-50 rounded px-3 py-2">
              <span className="text-slate-500 text-xs">{new Date(h.handedOffAt).toLocaleString()}</span>
              <span>Step {h.fromStepId} → {h.toStepId}</span>
              <span className="text-xs capitalize">{h.handoffStatus}</span>
              {h.note && <span className="text-slate-400 text-xs">"{h.note}"</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Status History */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Status History</h2>
        <div className="space-y-2 text-sm">
          {(mit.history ?? []).map((h: any) => (
            <div key={h.id} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs">{new Date(h.changedAt).toLocaleString()}</span>
              <span className="text-slate-500">{h.oldStatus ?? "—"}</span>
              <span>→</span>
              <span className="font-medium">{h.newStatus}</span>
              {h.remark && <span className="text-slate-400 text-xs">({h.remark})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Git Operations */}
      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Git Operations</h2>

        {/* Branch */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-500 w-16">Branch:</span>
          {mit.githubBranchName ? (
            <>
              <code className="text-sm bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">
                {mit.githubBranchName}
              </code>
              <button
                onClick={() => deleteBranchMutation.mutate()}
                disabled={deleteBranchMutation.isPending}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                {deleteBranchMutation.isPending ? "Deleting…" : "Delete Branch"}
              </button>
              {deleteBranchMutation.isError && (
                <span className="text-xs text-red-600">{(deleteBranchMutation.error as any)?.message}</span>
              )}
            </>
          ) : (
            <>
              <span className="text-sm text-slate-400">No branch linked</span>
              <button
                onClick={() => createBranchMutation.mutate()}
                disabled={createBranchMutation.isPending}
                className="px-3 py-1 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-700 disabled:opacity-50"
              >
                {createBranchMutation.isPending
                  ? "Creating…"
                  : `Create Branch (mit/${mit.mitNo.toLowerCase()})`}
              </button>
              {createBranchMutation.isError && (
                <span className="text-xs text-red-600">{(createBranchMutation.error as any)?.message}</span>
              )}
            </>
          )}
        </div>

        {/* Pull Request */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-500 w-16">PR:</span>
          {mit.githubPrNumber ? (
            <>
              <a
                href={mit.githubPrUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                #{mit.githubPrNumber} View PR ↗
              </a>
              <button
                onClick={() => mergePrMutation.mutate()}
                disabled={mergePrMutation.isPending}
                className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
              >
                {mergePrMutation.isPending ? "Merging…" : "Merge PR"}
              </button>
              {mergePrMutation.isError && (
                <span className="text-xs text-red-600">{(mergePrMutation.error as any)?.message}</span>
              )}
              {mergePrMutation.isSuccess && (
                <span className="text-xs text-green-600">✓ Merged</span>
              )}
            </>
          ) : mit.githubBranchName ? (
            <>
              <span className="text-sm text-slate-400">No PR yet</span>
              <button
                onClick={() => createPrMutation.mutate()}
                disabled={createPrMutation.isPending}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {createPrMutation.isPending ? "Creating…" : "Create PR"}
              </button>
              {createPrMutation.isError && (
                <span className="text-xs text-red-600">{(createPrMutation.error as any)?.message}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-400">Create a branch first</span>
          )}
        </div>
      </div>

      {/* GitHub Commits */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">
            GitHub Commits
            {commits.length > 0 && (
              <span className="ml-2 text-sm text-slate-400 font-normal">
                ({commits.length}) — filtered by @{commitsData?.data?.filterBy ?? "all"}
              </span>
            )}
          </h2>
          {commitsData?.data?.repo && (
            <span className="font-mono text-xs text-slate-400">
              {commitsData.data.repo} @ {commitsData.data.branch}
            </span>
          )}
        </div>

        {commitsLoading && <p className="text-slate-400 text-sm">Fetching commits…</p>}

        {!commitsLoading && commitsError && (
          <p className="text-amber-600 text-sm">{commitsError}</p>
        )}

        {!commitsLoading && !commitsError && commits.length === 0 && (
          <p className="text-slate-400 text-sm">
            No commits found.{" "}
            {!commitsData?.data?.filterBy && "Set a GitHub username on the assigned developer's profile to filter commits."}
          </p>
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

      {showAction && (
        <WorkflowActionSheet mitId={mit.id} currentUserId={1} onClose={() => setShowAction(false)} />
      )}
    </div>
  );
}
