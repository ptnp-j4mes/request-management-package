"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { projectCommandCenterApi } from "../../lib/project-command-center-api";

type Props = {
  request: {
    id: number;
    status: string;
    projectId?: number | null;
  };
  canOpenProject?: boolean;
};

export function RequestProgressCard({ request, canOpenProject = false }: Props) {
  const [summary, setSummary] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!request.projectId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      projectCommandCenterApi.progressSummary(request.projectId),
      projectCommandCenterApi.health(request.projectId),
    ])
      .then(([summaryRes, healthRes]) => {
        if (cancelled) return;
        setSummary(summaryRes.data);
        setHealth(healthRes.data);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setHealth(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request.projectId]);

  if (!request.projectId) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">Progress</h2>
        <p className="mt-1 text-sm text-slate-600">This request is not linked to a project yet. It can be approved first, then linked to an existing project or used to create a new project.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Linked project progress</h2>
          <p className="text-sm text-slate-500">Read-only summary for requester visibility.</p>
        </div>
        {canOpenProject ? (
          <Link className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white" href={`/projects/${request.projectId}`}>
            Open project
          </Link>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading project progress...</p> : null}

      {summary ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Progress" value={`${summary.progressPercent ?? 0}%`} />
          <Metric label="MIT" value={`${summary.mit?.completed ?? 0}/${summary.mit?.total ?? 0}`} />
          <Metric label="Tasks" value={`${summary.tasks?.completed ?? 0}/${summary.tasks?.total ?? 0}`} />
          <Metric label="UAT pass rate" value={summary.uat?.passRate == null ? "N/A" : `${summary.uat.passRate}%`} />
        </div>
      ) : null}

      {health ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">Health score:</span>
            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">{health.score}/100</span>
            <span className="rounded-full bg-white px-2 py-1 font-semibold uppercase text-slate-700">{health.status}</span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {(health.reasons ?? []).slice(0, 3).map((reason: string) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
