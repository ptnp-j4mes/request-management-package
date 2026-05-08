"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mitApi } from "../../lib/api";

interface Props {
  mitId: number;
  currentUserId?: number;
  steps?: { id: number; stepCode: string; stepName: string; stepOrder: number }[];
  users?: { id: number; fullName: string }[];
  onClose: () => void;
}

type Action = "assign" | "accept" | "submit" | "return";

export function WorkflowActionSheet({ mitId, currentUserId, steps = [], users = [], onClose }: Props) {
  const [action, setAction] = useState<Action>("accept");
  const [form, setForm] = useState({ userId: "", stepId: "", toUserId: "", toStepId: "", note: "" });
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === "assign") {
        return mitApi.assign(mitId, { userId: Number(form.userId), stepId: Number(form.stepId), role: "developer", assignedBy: currentUserId });
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Workflow Action – MIT #{mitId}</h2>

        {/* Action selector */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {(["assign", "accept", "submit", "return"] as Action[]).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`py-2 text-xs font-medium rounded-md border transition-colors capitalize ${
                action === a ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {action === "assign" && (
            <>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.userId} onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">Select user…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.stepId} onChange={(e) => setForm(f => ({ ...f, stepId: e.target.value }))}>
                <option value="">Select step…</option>
                {steps.map((s) => <option key={s.id} value={s.id}>{s.stepCode} – {s.stepName}</option>)}
              </select>
            </>
          )}

          {action === "accept" && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-md p-3">Accept this MIT item as the current assignee (user ID: {currentUserId ?? "—"})</p>
          )}

          {(action === "submit" || action === "return") && (
            <>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.toStepId} onChange={(e) => setForm(f => ({ ...f, toStepId: e.target.value }))}>
                <option value="">To step…</option>
                {steps.map((s) => <option key={s.id} value={s.id}>{s.stepCode} – {s.stepName}</option>)}
              </select>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.toUserId} onChange={(e) => setForm(f => ({ ...f, toUserId: e.target.value }))}>
                <option value="">To user…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm h-20 resize-none"
                placeholder={action === "return" ? "Return reason (required)…" : "Note (optional)…"}
                value={form.note}
                onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </>
          )}
        </div>

        {mutation.isError && <p className="text-red-600 text-sm mt-3">{String(mutation.error)}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border rounded-md py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Processing…" : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
}
