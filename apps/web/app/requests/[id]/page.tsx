"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestsApi } from "../../../lib/api";
import { RequestActions } from "../../../components/requests/RequestActions";
import Link from "next/link";
import { MessageSquare, Clock, ChevronRight, User, GitBranch, Bug, RefreshCw } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { GlassCard } from "../../../components/ui/GlassCard";
import { GlassBadge, statusColor, priorityColor } from "../../../components/ui/GlassBadge";
import { GlassButton } from "../../../components/ui/GlassButton";
import { GlassStepper } from "../../../components/ui/GlassStepper";
import { GlassInput, GlassTextarea } from "../../../components/ui/GlassInput";
import { GlassModal } from "../../../components/ui/GlassModal";
import { EmptyState } from "../../../components/ui/EmptyState";

const REQUEST_STEPS = [
  "draft","submitted","manager_approved","ba_review","waiting_estimate",
  "assigned_to_dev","in_development","ready_for_qa","in_qa","uat","completed",
];
const STEP_LABELS = ["Draft","Submitted","Approved","BA Review","Estimate","Assign Dev","In Dev","Ready QA","In QA","UAT","Done"];

function requestStepperSteps(status: string) {
  const idx = REQUEST_STEPS.indexOf(status);
  return STEP_LABELS.map((label, i) => ({
    label,
    status: i < idx ? "done" : i === idx ? "active" : "pending",
  })) as { label: string; status: "done" | "active" | "pending" }[];
}

const TYPE_COLOR: Record<string, "red" | "blue" | "purple" | "orange" | "slate"> = {
  bug: "red", change_request: "blue", support: "purple", uat_finding: "orange",
};

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["request", params.id],
    queryFn: () => requestsApi.get(Number(params.id)),
    refetchOnWindowFocus: true,
  });
  const request = data?.data;

  async function submitComment() {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await requestsApi.addComment(Number(params.id), commentText.trim());
      qc.invalidateQueries({ queryKey: ["request", params.id] });
      setCommentText("");
      setCommentOpen(false);
    } finally {
      setCommentLoading(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px] text-white/40 text-sm animate-pulse">Loading…</div>
  );
  if (!request) return (
    <div className="flex items-center justify-center min-h-[400px] text-[#f87272] text-sm">Request not found</div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={request.subject}
        breadcrumb={["Requests", request.requestNo]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <GlassBadge color={TYPE_COLOR[request.requestType] ?? "slate"} label={request.requestType?.replace(/_/g, " ")} />
            <GlassBadge color={statusColor(request.status)} label={request.status?.replace(/_/g, " ")} dot />
            {request.priority && <GlassBadge color={priorityColor(request.priority)} label={request.priority} />}
          </div>
        }
      />

      {/* Stepper */}
      <GlassCard>
        <GlassStepper steps={requestStepperSteps(request.status)} />
      </GlassCard>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content — left 2/3 */}
        <div className="col-span-2 space-y-6">
          {/* Details */}
          <GlassCard>
            <h2 className="text-sm font-semibold text-white/70 mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
              <div className="flex gap-2">
                <span className="text-white/40 w-28 shrink-0">Channel</span>
                <span className="text-white/80 capitalize">{request.channel}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-white/40 w-28 shrink-0">Urgency</span>
                <span className="text-white/80 capitalize">{request.urgency ?? "—"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-white/40 w-28 shrink-0">Opened</span>
                <span className="text-white/80">{request.openedAt ? new Date(request.openedAt).toLocaleString() : "—"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-white/40 w-28 shrink-0">Request No.</span>
                <span className="font-mono text-white/70">{request.requestNo}</span>
              </div>
            </div>
            <div className="border-t border-white/[.06] pt-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{request.description}</p>
            </div>
          </GlassCard>

          {/* Bug details */}
          {request.bug && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Bug className="h-4 w-4 text-[#f87272]" />
                <h2 className="text-sm font-semibold text-white/70">Bug Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-white/40 w-28 shrink-0">Severity</span>
                  <GlassBadge color={request.bug.severity === "critical" ? "red" : request.bug.severity === "major" ? "orange" : "yellow"} label={request.bug.severity} />
                </div>
                <div className="flex gap-2">
                  <span className="text-white/40 w-28 shrink-0">Fix Version</span>
                  <span className="text-white/80">{request.bug.fixVersion ?? "—"}</span>
                </div>
                <div className="flex gap-2 col-span-2">
                  <span className="text-white/40 w-28 shrink-0">Root Cause</span>
                  <span className="text-white/70">{request.bug.rootCause ?? "—"}</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Change details */}
          {request.change && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="h-4 w-4 text-[#4f9cf9]" />
                <h2 className="text-sm font-semibold text-white/70">Change Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex gap-2">
                  <span className="text-white/40 w-32 shrink-0">Category</span>
                  <span className="text-white/80 capitalize">{request.change.changeCategory?.replace(/_/g, " ") ?? "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white/40 w-32 shrink-0">Approved Flag</span>
                  <span className="text-white/80">{request.change.approvedFlag ? "Yes" : "No"}</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Workflow Actions */}
          <RequestActions request={request} />

          {/* Comments */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-white/50" />
                <h2 className="text-sm font-semibold text-white/70">Comments ({request.comments?.length ?? 0})</h2>
              </div>
              <GlassButton variant="secondary" size="sm" onClick={() => setCommentOpen(true)}>
                Add Comment
              </GlassButton>
            </div>
            <div className="space-y-3">
              {(request.comments ?? []).map((c: any) => (
                <div key={c.id} className="rounded-xs bg-white/[.05] border border-white/[.07] p-3">
                  <p className="text-xs text-white/35 mb-1.5">{new Date(c.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-white/75 leading-relaxed">{c.commentText}</p>
                </div>
              ))}
              {(request.comments ?? []).length === 0 && (
                <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No comments yet" />
              )}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar — right 1/3 */}
        <div className="space-y-6">
          {/* Assignees */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-white/50" />
              <h2 className="text-sm font-semibold text-white/70">Assignees</h2>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                { label: "BA Owner", val: request.baOwner?.name ?? request.baOwnerId },
                { label: "Dev Owner", val: request.devOwner?.name ?? request.devOwnerId },
                { label: "QA Owner", val: request.qaOwner?.name ?? request.qaOwnerId },
                { label: "Approver", val: request.approver?.name ?? request.approverId },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-white/40">{label}</span>
                  <span className="text-white/75 font-medium">{val ?? <span className="text-white/25">—</span>}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Status History */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-white/50" />
              <h2 className="text-sm font-semibold text-white/70">Status History</h2>
            </div>
            <div className="space-y-2">
              {(request.history ?? []).map((h: any) => (
                <div key={h.id} className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-white/30">{h.oldStatus ?? "—"}</span>
                    <ChevronRight className="h-3 w-3 text-white/25" />
                    <span className="font-medium text-white/80">{h.newStatus}</span>
                  </div>
                  {h.remark && <p className="text-white/35 pl-1">{h.remark}</p>}
                  <p className="text-white/25">{new Date(h.changedAt).toLocaleString()}</p>
                </div>
              ))}
              {(request.history ?? []).length === 0 && (
                <p className="text-white/30 text-xs">No status changes</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Comment Modal */}
      <GlassModal open={commentOpen} onClose={() => setCommentOpen(false)} title="Add Comment" size="md">
        <div className="space-y-4">
          <GlassTextarea
            label="Comment"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add your comment…"
            rows={4}
          />
          <div className="flex gap-3 justify-end">
            <GlassButton variant="ghost" onClick={() => setCommentOpen(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" loading={commentLoading} onClick={submitComment} disabled={!commentText.trim()}>
              Post Comment
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
