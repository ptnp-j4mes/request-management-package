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
import { GlassCard } from "../ui/GlassCard";
import { GlassButton } from "../ui/GlassButton";
import { GlassModal } from "../ui/GlassModal";
import { GlassInput } from "../ui/GlassInput";
import { AlertCircle, Zap } from "lucide-react";

type ModalType = "reject" | "qa-fail" | "assign-ba" | "assign-dev" | "assign-qa" | null;

interface Props {
  request: PermRequest & { id: number };
}

interface ActionDef {
  key: string;
  label: string;
  variant: "primary" | "success" | "danger" | "secondary" | "ghost";
  modal?: ModalType;
  fn?: () => Promise<any>;
}

function InputModal({
  title, label, type = "text", placeholder, confirmLabel = "Confirm", danger = false,
  onConfirm, onClose,
}: {
  title: string; label: string; type?: string; placeholder?: string;
  confirmLabel?: string; danger?: boolean;
  onConfirm: (value: string) => void; onClose: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <GlassModal open onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <GlassInput
          label={label}
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          <GlassButton
            variant={danger ? "danger" : "primary"}
            onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

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

  const actions: ActionDef[] = [];

  if (canSubmit(u, request))
    actions.push({ key: "submit", label: "Submit", variant: "primary", fn: () => requestsApi.submit(id) });
  if (canApprove(u, request))
    actions.push({ key: "approve", label: "Approve", variant: "success", fn: () => requestsApi.approve(id) });
  if (canReject(u, request))
    actions.push({ key: "reject", label: "Reject", variant: "danger", modal: "reject" });
  if (canAssignBA(u, request))
    actions.push({ key: "assign-ba", label: "Assign BA", variant: "secondary", modal: "assign-ba" });
  if (canAssignDev(u, request))
    actions.push({ key: "assign-dev", label: "Assign Dev", variant: "secondary", modal: "assign-dev" });
  if (canAssignQA(u, request))
    actions.push({ key: "assign-qa", label: "Assign QA", variant: "secondary", modal: "assign-qa" });
  if (canStartDev(u, request))
    actions.push({ key: "start-dev", label: "Start Development", variant: "primary", fn: () => requestsApi.startDevelopment(id) });
  if (canReadyForQA(u, request))
    actions.push({ key: "ready-qa", label: "Ready for QA", variant: "primary", fn: () => requestsApi.readyForQA(id) });
  if (canQAPass(u, request))
    actions.push({ key: "qa-pass", label: "QA Pass", variant: "success", fn: () => requestsApi.qaPass(id) });
  if (canQAFail(u, request))
    actions.push({ key: "qa-fail", label: "QA Fail", variant: "danger", modal: "qa-fail" });
  if (canUATApprove(u, request))
    actions.push({ key: "uat", label: "UAT Approve", variant: "success", fn: () => requestsApi.uatApprove(id) });
  if (canClose(u, request))
    actions.push({ key: "close", label: "Close Request", variant: "danger", fn: () => requestsApi.close(id) });

  if (actions.length === 0) return null;

  return (
    <>
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-[#4f9cf9]" />
          <h2 className="text-sm font-semibold text-white/70">Workflow Actions</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <GlassButton
              key={a.key}
              variant={a.variant}
              size="sm"
              loading={loading && !a.modal}
              disabled={loading}
              onClick={() => a.modal ? setModal(a.modal) : a.fn && run(a.fn)}
            >
              {a.label}
            </GlassButton>
          ))}
        </div>
        {error && (
          <div className="flex items-center gap-2 mt-3 rounded-sm bg-red-400/10 border border-red-400/20 p-2.5">
            <AlertCircle className="h-4 w-4 text-[#f87272] shrink-0" />
            <p className="text-xs text-[#f87272]">{error}</p>
          </div>
        )}
      </GlassCard>

      {modal === "reject" && (
        <InputModal title="Reject Request" label="Reason (required)" placeholder="ระบุเหตุผลที่ reject…"
          confirmLabel="Reject" danger onClose={() => setModal(null)}
          onConfirm={(reason) => run(() => requestsApi.reject(id, reason))} />
      )}
      {modal === "qa-fail" && (
        <InputModal title="QA Fail" label="Reason (required)" placeholder="ระบุสิ่งที่ fail…"
          confirmLabel="Confirm Fail" danger onClose={() => setModal(null)}
          onConfirm={(reason) => run(() => requestsApi.qaFail(id, reason))} />
      )}
      {modal === "assign-ba" && (
        <InputModal title="Assign BA" label="BA User ID" type="number" placeholder="e.g. 5"
          confirmLabel="Assign" onClose={() => setModal(null)}
          onConfirm={(val) => run(() => requestsApi.assignBA(id, Number(val)))} />
      )}
      {modal === "assign-dev" && (
        <InputModal title="Assign Developer" label="Developer User ID" type="number" placeholder="e.g. 12"
          confirmLabel="Assign" onClose={() => setModal(null)}
          onConfirm={(val) => run(() => requestsApi.assignDev(id, Number(val)))} />
      )}
      {modal === "assign-qa" && (
        <InputModal title="Assign QA" label="QA User ID" type="number" placeholder="e.g. 8"
          confirmLabel="Assign" onClose={() => setModal(null)}
          onConfirm={(val) => run(() => requestsApi.assignQA(id, Number(val)))} />
      )}
    </>
  );
}
