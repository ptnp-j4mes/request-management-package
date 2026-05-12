"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { requestsApi } from "../../lib/api";
import {
  canSubmit, canApprove, canReject,
  canAssignBA, canAssignDev, canAssignQA,
  canStartDev, canReadyForQA,
  canQAPass, canQAFail,
  canUATApprove, canClose,
  type PermRequest,
} from "../../lib/request-permissions";

// ── Types ─────────────────────────────────────────────────────────────────────
type ModalType = "reject" | "qa-fail" | "assign-ba" | "assign-dev" | "assign-qa" | null;

interface Props {
  request: PermRequest & { id: number };
}

// ── Button components ─────────────────────────────────────────────────────────
function Btn({
  label, onClick, color = "slate", disabled = false,
}: {
  label: string;
  onClick: () => void;
  color?: "blue" | "green" | "red" | "amber" | "slate";
  disabled?: boolean;
}) {
  const colors = {
    blue:  "bg-blue-600 hover:bg-blue-700 text-white",
    green: "bg-green-600 hover:bg-green-700 text-white",
    red:   "bg-red-600 hover:bg-red-700 text-white",
    amber: "bg-amber-500 hover:bg-amber-600 text-white",
    slate: "bg-slate-600 hover:bg-slate-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {label}
    </button>
  );
}

// ── Modal for actions that need input ─────────────────────────────────────────
function InputModal({
  title, label, type = "text", placeholder, confirmLabel = "Confirm", confirmColor = "blue",
  onConfirm, onClose,
}: {
  title: string;
  label: string;
  type?: string;
  placeholder?: string;
  confirmLabel?: string;
  confirmColor?: "blue" | "green" | "red" | "amber" | "slate";
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
        <div className="space-y-1">
          <label className="text-sm text-slate-600">{label}</label>
          <input
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border rounded transition-colors"
          >
            Cancel
          </button>
          <Btn
            label={confirmLabel}
            color={confirmColor}
            onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RequestActions({ request }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const u = { id: user.id, roles: user.roles };
  const id = request.id;

  const run = async (fn: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["request", String(id)] });
    } catch (e: any) {
      setError(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      setModal(null);
    }
  };

  // Build visible actions list
  const actions: React.ReactNode[] = [];

  if (canSubmit(u, request))
    actions.push(<Btn key="submit" label="Submit" color="blue" disabled={loading}
      onClick={() => run(() => requestsApi.submit(id))} />);

  if (canApprove(u, request))
    actions.push(<Btn key="approve" label="Approve" color="green" disabled={loading}
      onClick={() => run(() => requestsApi.approve(id))} />);

  if (canReject(u, request))
    actions.push(<Btn key="reject" label="Reject" color="red" disabled={loading}
      onClick={() => setModal("reject")} />);

  if (canAssignBA(u, request))
    actions.push(<Btn key="assign-ba" label="Assign BA" color="amber" disabled={loading}
      onClick={() => setModal("assign-ba")} />);

  if (canAssignDev(u, request))
    actions.push(<Btn key="assign-dev" label="Assign Dev" color="amber" disabled={loading}
      onClick={() => setModal("assign-dev")} />);

  if (canAssignQA(u, request))
    actions.push(<Btn key="assign-qa" label="Assign QA" color="amber" disabled={loading}
      onClick={() => setModal("assign-qa")} />);

  if (canStartDev(u, request))
    actions.push(<Btn key="start-dev" label="Start Development" color="slate" disabled={loading}
      onClick={() => run(() => requestsApi.startDevelopment(id))} />);

  if (canReadyForQA(u, request))
    actions.push(<Btn key="ready-qa" label="Ready for QA" color="slate" disabled={loading}
      onClick={() => run(() => requestsApi.readyForQA(id))} />);

  if (canQAPass(u, request))
    actions.push(<Btn key="qa-pass" label="QA Pass" color="green" disabled={loading}
      onClick={() => run(() => requestsApi.qaPass(id))} />);

  if (canQAFail(u, request))
    actions.push(<Btn key="qa-fail" label="QA Fail" color="red" disabled={loading}
      onClick={() => setModal("qa-fail")} />);

  if (canUATApprove(u, request))
    actions.push(<Btn key="uat" label="UAT Approve" color="green" disabled={loading}
      onClick={() => run(() => requestsApi.uatApprove(id))} />);

  if (canClose(u, request))
    actions.push(<Btn key="close" label="Close" color="red" disabled={loading}
      onClick={() => run(() => requestsApi.close(id))} />);

  if (actions.length === 0) return null;

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Workflow Actions</h2>
        <div className="flex flex-wrap gap-2">
          {actions}
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {loading && <p className="mt-2 text-xs text-slate-400">Processing…</p>}
      </div>

      {/* Reject modal */}
      {modal === "reject" && (
        <InputModal
          title="Reject Request"
          label="Reason (required)"
          placeholder="ระบุเหตุผลที่ reject…"
          confirmLabel="Reject"
          confirmColor="red"
          onClose={() => setModal(null)}
          onConfirm={(reason) => run(() => requestsApi.reject(id, reason))}
        />
      )}

      {/* QA Fail modal */}
      {modal === "qa-fail" && (
        <InputModal
          title="QA Fail"
          label="Reason (required)"
          placeholder="ระบุสิ่งที่ fail…"
          confirmLabel="Confirm Fail"
          confirmColor="red"
          onClose={() => setModal(null)}
          onConfirm={(reason) => run(() => requestsApi.qaFail(id, reason))}
        />
      )}

      {/* Assign BA modal */}
      {modal === "assign-ba" && (
        <InputModal
          title="Assign BA"
          label="BA User ID"
          type="number"
          placeholder="e.g. 5"
          confirmLabel="Assign"
          confirmColor="amber"
          onClose={() => setModal(null)}
          onConfirm={(val) => run(() => requestsApi.assignBA(id, Number(val)))}
        />
      )}

      {/* Assign Dev modal */}
      {modal === "assign-dev" && (
        <InputModal
          title="Assign Developer"
          label="Developer User ID"
          type="number"
          placeholder="e.g. 12"
          confirmLabel="Assign"
          confirmColor="amber"
          onClose={() => setModal(null)}
          onConfirm={(val) => run(() => requestsApi.assignDev(id, Number(val)))}
        />
      )}

      {/* Assign QA modal */}
      {modal === "assign-qa" && (
        <InputModal
          title="Assign QA"
          label="QA User ID"
          type="number"
          placeholder="e.g. 8"
          confirmLabel="Assign"
          confirmColor="amber"
          onClose={() => setModal(null)}
          onConfirm={(val) => run(() => requestsApi.assignQA(id, Number(val)))}
        />
      )}
    </>
  );
}
