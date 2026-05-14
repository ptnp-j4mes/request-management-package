"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { projectCommandCenterApi } from "../../../lib/project-command-center-api";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function ExecutivePortfolioPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectCommandCenterApi.executivePortfolio()
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message ?? "Unable to load executive dashboard"));
  }, []);

  if (error) return <main className="p-8 text-rose-600">{error}</main>;
  if (!data) return <main className="p-8 text-slate-500">Loading executive dashboard...</main>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Executive Portfolio Dashboard</h1>
          <p className="text-sm text-slate-500">Portfolio health, delivery risk, UAT defects, and blocked work.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total projects" value={data.cards.totalProjects} />
          <Stat label="Active" value={data.cards.activeProjects} />
          <Stat label="On hold" value={data.cards.onHoldProjects} />
          <Stat label="Completed" value={data.cards.completedProjects} />
          <Stat label="Open UAT defects" value={data.cards.openUatDefects} />
          <Stat label="Blocked work" value={data.cards.blockedWork} />
          <Stat label="Pending approvals" value={data.cards.pendingApprovals} />
          <Stat label="Projects at risk" value={data.projectsAtRisk.length} />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Health distribution</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">Green: {data.health.green}</div>
            <div className="rounded-xl bg-amber-50 p-4 text-amber-700">Yellow: {data.health.yellow}</div>
            <div className="rounded-xl bg-rose-50 p-4 text-rose-700">Red: {data.health.red}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Portfolio projects</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Project</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th>Progress</th>
                  <th>Open defects</th>
                  <th>Blocked</th>
                  <th>Go-live</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.projects.map((project: any) => (
                  <tr key={project.projectId}>
                    <td className="py-3">
                      <Link className="font-medium text-blue-600" href={`/projects/${project.projectId}`}>{project.projectCode} · {project.projectName}</Link>
                    </td>
                    <td>{project.status}</td>
                    <td>{project.healthStatus} ({project.healthScore})</td>
                    <td>{project.progressPercent}%</td>
                    <td>{project.openDefects}</td>
                    <td>{project.blockedTasks}</td>
                    <td>{project.goLiveDate ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
