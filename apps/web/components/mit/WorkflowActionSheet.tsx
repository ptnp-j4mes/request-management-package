"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mitApi } from "../../lib/api";
import { GlassBadge } from "../ui/GlassBadge";
import { GlassButton } from "../ui/GlassButton";
import { GlassSelect } from "../ui/GlassInput";

interface Props {
  mitId: number;
  currentUserId?: number;
  steps?: { id: number; stepCode: string; stepName: string; stepOrder: number }[];
  onClose: () => void;
}

type Action = "assign" | "accept" | "submit" | "return";

type AssignableUser = {
  id: number;
  fullName: string;
  email: string | null;
  roleName: string | null;
  roles: string[];
  projectMemberRole: string | null;
  eligibleForStep: true;
  eligibilityReason: "PROJECT_MEMBER" | "ROLE" | "FULLSTACK";
};

export function WorkflowActionSheet({ mitId, currentUserId, steps = [], onClose }: Props) {
  const [action, setAction] = useState<Action>("accept");
  const [form, setForm] = useState({ userId: "", stepId: "", toUserId: "", toStepId: "", note: "" });
  const qc = useQueryClient();

  const selectedStepId = action === "assign"
    ? form.stepId
    : action === "submit" || action === "return"
      ? form.toStepId
      : "";

  const candidateQuery = useQuery({
    queryKey: ["mit-assignable-users", mitId, selectedStepId],
    queryFn: async () => {
      if (!selectedStepId) return null;
      return mitApi.assignableUsers(mitId, Number(selectedStepId));
    },
    enabled: Boolean(selectedStepId),
  });

  const candidates: AssignableUser[] = selectedStepId && !candidateQuery.isFetching
    ? candidateQuery.data?.data?.data ?? []
    : [];

  useEffect(() => {
    if (!selectedStepId || candidateQuery.isFetching) return;
    if (!candidateQuery.data?.data?.data?.some((u) => String(u.id) === form.userId)) {
      setForm((f) => ({ ...f, userId: "" }));
    }
  }, [candidateQuery.data, candidateQuery.isFetching, form.userId, selectedStepId]);

  useEffect(() => {
    if (!selectedStepId || candidateQuery.isFetching) return;
    if (!candidateQuery.data?.data?.data?.some((u) => String(u.id) === form.toUserId)) {
      setForm((f) => ({ ...f, toUserId: "" }));
    }
  }, [candidateQuery.data, candidateQuery.isFetching, form.toUserId, selectedStepId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === "assign") {
        return mitApi.assign(mitId, { userId: Number(form.userId), stepId: Number(form.stepId), assignedBy: currentUserId });
      }
      if (action === "accept") {
        return mitApi.accept(mitId, { userId: currentUserId, action: "accept" });
      }
      if (action === "submit") {
        return mitApi.submit(mitId, { fromUserId: currentUserId, toUserId: Number(form.toUserId), toStepId: Number(form.toStepId), note: form.note });
      }
      if (action === "return") {
        return mitApi.returnItem(mitId, { fromUserId: currentUserId, toStepId: Number(form.toStepId), toUserId: Number(form.toUserId), note: form.note });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mit-items"] });
      qc.invalidateQueries({ queryKey: ["workload-by-user"] });
      onClose();
    },
  });

  const canConfirm =
    !mutation.isPending &&
    !!currentUserId &&
    (
      action === "accept"
        ? true
        : action === "assign"
          ? !!form.stepId && !!form.userId
          : action === "submit"
            ? !!form.toStepId && !!form.toUserId
            : !!form.toStepId && !!form.toUserId && form.note.trim().length > 0
    );

  const resetAction = (nextAction: Action) => {
    setAction(nextAction);
    setForm({ userId: "", stepId: "", toUserId: "", toStepId: "", note: "" });
  };

  const selectedCandidates = candidates;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0f172a] text-white w-full max-w-2xl rounded-t-xl sm:rounded-xl shadow-xl p-6 border border-white/[.08]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Workflow Action – MIT #{mitId}</h2>

        {/* Action selector */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(["assign", "accept", "submit", "return"] as Action[]).map((a) => (
            <button
              key={a}
              onClick={() => resetAction(a)}
              className={`py-2 text-xs font-medium rounded-md border transition-colors capitalize ${
                action === a ? "bg-blue-600 text-white border-blue-500" : "border-white/[.10] text-white/55 hover:bg-white/[.05]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {action === "assign" && (
            <>
              <GlassSelect
                value={form.stepId}
                onChange={(e) => setForm((f) => ({ ...f, stepId: e.target.value, userId: "" }))}
                options={steps.map((s) => ({ value: String(s.id), label: `${s.stepCode} – ${s.stepName}` }))}
                placeholder="Select step…"
              />
              <GlassSelect
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                options={selectedCandidates.map((u) => ({
                  value: String(u.id),
                  label: `${u.fullName}${u.eligibilityReason === "FULLSTACK" ? " (Fullstack)" : ""}`,
                }))}
                placeholder={selectedStepId ? "Select user…" : "Pick a step first"}
                disabled={!selectedStepId || selectedCandidates.length === 0}
              />
            </>
          )}

          {action === "accept" && (
            <p className="text-sm text-white/70 bg-white/[.04] rounded-md p-3 border border-white/[.08]">
              Accept this MIT item as the current assignee (user ID: {currentUserId ?? "—"})
            </p>
          )}

          {(action === "submit" || action === "return") && (
            <>
              <GlassSelect
                value={form.toStepId}
                onChange={(e) => setForm((f) => ({ ...f, toStepId: e.target.value, toUserId: "" }))}
                options={steps.map((s) => ({ value: String(s.id), label: `${s.stepCode} – ${s.stepName}` }))}
                placeholder="To step…"
              />
              <GlassSelect
                value={form.toUserId}
                onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))}
                options={selectedCandidates.map((u) => ({
                  value: String(u.id),
                  label: `${u.fullName}${u.eligibilityReason === "FULLSTACK" ? " (Fullstack)" : ""}`,
                }))}
                placeholder={selectedStepId ? "To user…" : "Pick a step first"}
                disabled={!selectedStepId || selectedCandidates.length === 0}
              />
              <textarea
                className="glass-input w-full rounded-xs px-3 py-2 text-sm h-20 resize-none text-white/90 placeholder:text-white/30"
                placeholder={action === "return" ? "Return reason (required)…" : "Note (optional)…"}
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </>
          )}
        </div>

        <div className="mt-4 rounded-md border border-white/[.08] bg-white/[.03] p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs uppercase tracking-[.12em] text-white/45">
              Eligible users {selectedStepId ? `for ${steps.find((s) => String(s.id) === selectedStepId)?.stepCode ?? "selected step"}` : ""}
            </p>
            {candidateQuery.isFetching && <span className="text-xs text-white/35 animate-pulse">Loading…</span>}
          </div>
          {!selectedStepId && <p className="text-sm text-white/35">Pick a step to see eligible users.</p>}
          {selectedStepId && !candidateQuery.isFetching && selectedCandidates.length === 0 && (
            <p className="text-sm text-white/35">No eligible users for this position</p>
          )}
          {selectedCandidates.length > 0 && (
            <div className="space-y-2">
              {selectedCandidates.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border border-white/[.06] bg-black/20 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">{u.fullName}</p>
                      {u.eligibilityReason === "FULLSTACK" && (
                        <GlassBadge color="cyan" label="Fullstack: can assign to all positions" />
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate">
                      {u.email ?? "No email"} {u.projectMemberRole ? `· project: ${u.projectMemberRole}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <GlassBadge color={u.eligibilityReason === "FULLSTACK" ? "cyan" : u.eligibilityReason === "PROJECT_MEMBER" ? "blue" : "yellow"} label={u.eligibilityReason} />
                    {u.roles.slice(0, 2).map((role) => (
                      <GlassBadge key={role} color="slate" label={role} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {mutation.isError && <p className="text-red-400 text-sm mt-3">{String(mutation.error)}</p>}

        <div className="flex gap-3 mt-5">
          <GlassButton onClick={onClose} variant="ghost" className="flex-1">
            Cancel
          </GlassButton>
          <GlassButton
            onClick={() => mutation.mutate()}
            disabled={!canConfirm}
            loading={mutation.isPending}
            variant="primary"
            className="flex-1"
          >
            Confirm {action}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
