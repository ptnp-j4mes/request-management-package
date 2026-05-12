"use client";

import { type ElementType, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, GitBranch, GitCommit, GitPullRequest, RefreshCw, Users } from "lucide-react";
import { gitReportsApi, projectsApi } from "../../../../lib/api";

type ProjectOption = {
  id: number;
  projectCode?: string;
  projectName?: string;
};

type ActorRow = {
  actor: string;
  commitCount: number;
  prOpenedCount: number;
  prMergedCount: number;
  lastActivityAt: string | null;
};

type CommitRow = {
  sha: string;
  fullSha: string;
  message: string;
  authorName?: string | null;
  authorEmail?: string | null;
  authorGithub?: string | null;
  committerName?: string | null;
  committerGithub?: string | null;
  committedAt?: string | null;
  htmlUrl?: string | null;
};

type PullRequestRow = {
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  authorGithub?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedAt?: string | null;
  mergedAt?: string | null;
  mergedByGithub?: string | null;
  headBranch?: string | null;
  baseBranch?: string | null;
  htmlUrl?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-white p-8 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function GitReportByProjectPage() {
  const [projectId, setProjectId] = useState("");
  const [branch, setBranch] = useState("");
  const [prState, setPrState] = useState<"open" | "closed" | "all">("all");

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const projects = (projectsData?.data ?? []) as ProjectOption[];

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === projectId),
    [projectId, projects],
  );

  const reportQuery = useQuery({
    queryKey: ["git-report-by-project", projectId, branch, prState],
    enabled: !!projectId,
    queryFn: () =>
      gitReportsApi.byProject({
        projectId,
        branch,
        prState,
        perPage: 50,
        prLimit: 50,
      }),
  });

  const report = reportQuery.data?.data;
  const commits = (report?.commits ?? []) as CommitRow[];
  const pullRequests = (report?.pullRequests ?? []) as PullRequestRow[];
  const actors = (report?.actors ?? []) as ActorRow[];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span>Git</span>
            <span>/</span>
            <span className="font-medium text-slate-800">By Project</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Git Report by Project</h1>
          <p className="mt-1 text-sm text-slate-500">
            ดู commit, pull request และสรุปว่าใครเป็นคนอัป GitHub ของแต่ละ project
          </p>
        </div>

        <button
          type="button"
          onClick={() => reportQuery.refetch()}
          disabled={!projectId || reportQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project</label>
            <select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setBranch("");
              }}
              disabled={loadingProjects}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{loadingProjects ? "Loading projects..." : "Select project..."}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode ?? project.id} — {project.projectName ?? "Untitled"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
            <input
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder={report?.repo?.defaultBranch ?? "main"}
              className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">PR State</label>
            <select
              value={prState}
              onChange={(event) => setPrState(event.target.value as "open" | "closed" | "all")}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">all</option>
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </div>
        </div>

        {selectedProject && (
          <p className="mt-3 text-xs text-slate-500">
            Selected: <span className="font-mono text-slate-700">{selectedProject.projectCode}</span>{" "}
            {selectedProject.projectName}
          </p>
        )}
      </div>

      {!projectId && (
        <EmptyState
          title="Select project to start"
          description="เลือก project ที่ตั้งค่า GitHub repo ไว้แล้ว เพื่อดู commit และ pull request"
        />
      )}

      {reportQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(reportQuery.error as Error)?.message ?? "Failed to load Git report"}
        </div>
      )}

      {reportQuery.isLoading && projectId && (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading GitHub report...
        </div>
      )}

      {report && (
        <>
          <div className="rounded-lg border bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Repository</p>
                <p className="mt-1 font-mono text-lg font-semibold">{report.repo.fullName}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-700 px-3 py-1">
                  branch: <span className="font-mono">{report.repo.branch}</span>
                </span>
                <span className="rounded-full bg-slate-700 px-3 py-1">
                  token: {report.repo.tokenSource}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={GitCommit} label="Commits" value={report.summary.commitCount} note="latest commits from selected branch" />
            <StatCard icon={GitPullRequest} label="Pull Requests" value={report.summary.prCount} note={`state filter: ${prState}`} />
            <StatCard icon={GitPullRequest} label="Open PRs" value={report.summary.openPrCount} note="currently open" />
            <StatCard icon={GitBranch} label="Merged PRs" value={report.summary.mergedPrCount} note="merged pull requests" />
            <StatCard icon={Users} label="Contributors" value={report.summary.actorCount} note="committers and PR actors" />
          </div>

          <section className="rounded-lg border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <h2 className="font-semibold text-slate-900">Who uploaded Git?</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                รวมจำนวน commit, PR opened และ PR merged แยกตาม GitHub actor
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Actor</th>
                    <th className="px-5 py-3">Commits</th>
                    <th className="px-5 py-3">PR opened</th>
                    <th className="px-5 py-3">PR merged</th>
                    <th className="px-5 py-3">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {actors.map((actor) => (
                    <tr key={actor.actor} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">@{actor.actor}</td>
                      <td className="px-5 py-3 text-slate-700">{actor.commitCount}</td>
                      <td className="px-5 py-3 text-slate-700">{actor.prOpenedCount}</td>
                      <td className="px-5 py-3 text-slate-700">{actor.prMergedCount}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(actor.lastActivityAt)}</td>
                    </tr>
                  ))}
                  {actors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No actor activity found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-lg border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold text-slate-900">Latest Commits</h2>
                <p className="mt-1 text-sm text-slate-500">แสดงคน commit / author / เวลา / message</p>
              </div>
              <div className="divide-y">
                {commits.map((commit) => (
                  <div key={commit.fullSha} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <a
                          href={commit.htmlUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                        >
                          {commit.sha}
                        </a>
                        <p className="mt-1 truncate font-medium text-slate-900">{commit.message}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {formatDate(commit.committedAt)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                      <div>
                        Author:{" "}
                        <span className="font-medium text-slate-700">
                          {commit.authorGithub ? `@${commit.authorGithub}` : commit.authorName ?? commit.authorEmail ?? "unknown"}
                        </span>
                      </div>
                      <div>
                        Committer:{" "}
                        <span className="font-medium text-slate-700">
                          {commit.committerGithub ? `@${commit.committerGithub}` : commit.committerName ?? "unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {commits.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400">No commits found</div>
                )}
              </div>
            </section>

            <section className="rounded-lg border bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold text-slate-900">Pull Requests</h2>
                <p className="mt-1 text-sm text-slate-500">แสดงคนเปิด PR, branch, status และคน merge</p>
              </div>
              <div className="divide-y">
                {pullRequests.map((pr) => (
                  <div key={pr.number} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <a
                          href={pr.htmlUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          #{pr.number} {pr.title}
                        </a>
                        <p className="mt-1 text-xs text-slate-500">
                          {pr.headBranch} → {pr.baseBranch}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                          pr.mergedAt
                            ? "bg-purple-100 text-purple-700"
                            : pr.state === "open"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {pr.mergedAt ? "merged" : pr.state}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                      <div>
                        Opened by:{" "}
                        <span className="font-medium text-slate-700">
                          {pr.authorGithub ? `@${pr.authorGithub}` : "unknown"}
                        </span>
                      </div>
                      <div>
                        Merged by:{" "}
                        <span className="font-medium text-slate-700">
                          {pr.mergedByGithub ? `@${pr.mergedByGithub}` : pr.mergedAt ? "unknown" : "—"}
                        </span>
                      </div>
                      <div>Created: {formatDate(pr.createdAt)}</div>
                      <div>Merged: {formatDate(pr.mergedAt)}</div>
                    </div>
                  </div>
                ))}

                {pullRequests.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400">No pull requests found</div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
