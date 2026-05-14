"use client";

import { useState } from "react";
import { requestIntakeApi } from "../../lib/project-command-center-api";
import { useAuth } from "../../contexts/AuthContext";

type IntakeRequest = {
  id: number;
  status: string;
  projectId?: number | null;
  project?: {
    hasActiveUatCycle?: boolean;
  } | null;
};

type Props = {
  request: IntakeRequest;
  onChanged?: () => void;
  canApprove?: boolean;
  canManage?: boolean;
};

export function IntakeActions({ request, onChanged, canApprove, canManage }: Props) {
  const { user } = useAuth();
  const canApproveAction = canApprove ?? !!user?.roles?.some((r: string) => ["ADMIN", "IT_MANAGER", "APPROVER", "FULLSTACK"].includes(r));
  const canManageAction = canManage ?? !!user?.roles?.some((r: string) => ["ADMIN", "IT_MANAGER", "BA", "FULLSTACK"].includes(r));
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [projectId, setProjectId] = useState(request.projectId ? String(request.projectId) : "");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusyAction(label);
    setError(null);
    try {
      await action();
      onChanged?.();
    } catch (e: any) {
      setError(e?.message ?? "Action failed");
    } finally {
      setBusyAction(null);
    }
  }

  const disabled = busyAction !== null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Intake actions</h2>
          <p className="text-sm text-slate-500">Request page is limited to intake, approval, linking, comments, and UAT feedback.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-600">{request.status}</span>
      </div>

      {error ? <div className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {request.status === "draft" ? (
          <button
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabled}
            onClick={() => run("submit", () => requestIntakeApi.submit(request.id))}
          >
            Submit request
          </button>
        ) : null}

        {canApproveAction && request.status === "submitted" ? (
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabled}
            onClick={() => run("approve", () => requestIntakeApi.approve(request.id))}
          >
            Approve
          </button>
        ) : null}

        {canApproveAction && ["submitted", "approved"].includes(request.status) ? (
          <button
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabled}
            onClick={() => run("reject", () => requestIntakeApi.reject(request.id, reason || "Rejected from intake action"))}
          >
            Reject
          </button>
        ) : null}

        {canManageAction && ["approved", "linked_to_project"].includes(request.status) ? (
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabled || !projectId}
            onClick={() => run("link-project", () => requestIntakeApi.linkProject(request.id, Number(projectId)))}
          >
            Link project
          </button>
        ) : null}

        {canManageAction && request.status === "approved" ? (
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabled}
            onClick={() => run("create-project", () => requestIntakeApi.createProject(request.id, {}))}
          >
            Create project from request
          </button>
        ) : null}

      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {canManageAction ? (
          <label className="text-sm font-medium text-slate-700">
            Project ID to link
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Existing project id"
            />
          </label>
        ) : null}

        {canApprove ? (
          <label className="text-sm font-medium text-slate-700">
            Reject reason
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason"
            />
          </label>
        ) : null}
      </div>

      {request.projectId && request.project?.hasActiveUatCycle ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <label className="text-sm font-medium text-slate-700">
            UAT feedback / defect
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe issue, expected result, actual result, and impact"
            />
          </label>
          <button
            className="mt-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={disabled || !feedback.trim()}
            onClick={() => run("uat-feedback", () => requestIntakeApi.addUatFeedback(request.id, feedback.trim()))}
          >
            Submit UAT feedback
          </button>
        </div>
      ) : null}
    </section>
  );
}
