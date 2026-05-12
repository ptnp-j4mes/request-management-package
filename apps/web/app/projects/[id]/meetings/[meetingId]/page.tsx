"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { meetingsApi } from "../../../../../lib/api";
import Link from "next/link";
import { Bot, Play, FileText, Sparkles, CheckCircle, Plus, Trash2, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../../../components/ui/PageHeader";
import { GlassCard } from "../../../../../components/ui/GlassCard";
import { GlassBadge } from "../../../../../components/ui/GlassBadge";
import { GlassButton } from "../../../../../components/ui/GlassButton";
import { GlassTabs } from "../../../../../components/ui/GlassTabs";
import { GlassTable } from "../../../../../components/ui/GlassTable";
import { GlassModal } from "../../../../../components/ui/GlassModal";
import { GlassInput } from "../../../../../components/ui/GlassInput";
import { GlassTextarea } from "../../../../../components/ui/GlassInput";
import { EmptyState } from "../../../../../components/ui/EmptyState";

function botStatusColor(s: string): "green"|"blue"|"orange"|"slate"|"yellow" {
  if (s === "IN_MEETING") return "green";
  if (s === "JOINING") return "blue";
  if (s === "LEFT" || s === "COMPLETED") return "slate";
  if (s === "SCHEDULED") return "yellow";
  return "slate";
}

const LOG_LEVEL_COLOR: Record<string, "red"|"orange"|"blue"|"slate"> = {
  ERROR: "red", WARN: "orange", INFO: "blue", DEBUG: "slate",
};

const TABS = [
  { id: "details",      label: "Details" },
  { id: "transcript",   label: "Transcript" },
  { id: "summary",      label: "Summary" },
  { id: "action-items", label: "Action Items" },
  { id: "logs",         label: "Bot Logs" },
];

export default function MeetingDetailPage({ params }: { params: { id: string; meetingId: string } }) {
  const qc = useQueryClient();
  const projectId = Number(params.id);
  const meetingId = Number(params.meetingId);
  const [tab, setTab] = useState("details");
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemOwner, setItemOwner] = useState("");
  const [itemDue, setItemDue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["meeting", projectId, meetingId],
    queryFn: () => meetingsApi.get(projectId, meetingId),
  });
  const { data: logsData } = useQuery({
    queryKey: ["meeting-logs", projectId, meetingId],
    queryFn: () => meetingsApi.getLogs(projectId, meetingId),
    enabled: tab === "logs",
  });
  const { data: actionData } = useQuery({
    queryKey: ["meeting-action-items", projectId, meetingId],
    queryFn: () => meetingsApi.actionItems(projectId, meetingId),
    enabled: tab === "action-items",
  });

  const botJoinMutation = useMutation({
    mutationFn: () => meetingsApi.botJoin(projectId, meetingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", projectId, meetingId] }),
  });
  const transcribeMutation = useMutation({
    mutationFn: () => meetingsApi.transcribe(projectId, meetingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", projectId, meetingId] }),
  });
  const summarizeMutation = useMutation({
    mutationFn: () => meetingsApi.summarize(projectId, meetingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", projectId, meetingId] }),
  });
  const addItemMutation = useMutation({
    mutationFn: () => meetingsApi.addActionItem(projectId, meetingId, { title: itemTitle, ownerName: itemOwner || undefined, dueDate: itemDue || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-action-items", projectId, meetingId] });
      setShowAddItem(false); setItemTitle(""); setItemOwner(""); setItemDue("");
    },
  });
  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: string }) =>
      meetingsApi.updateActionItem(projectId, meetingId, itemId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-action-items", projectId, meetingId] }),
  });
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => meetingsApi.deleteActionItem(projectId, meetingId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-action-items", projectId, meetingId] }),
  });

  const meeting = data?.data;
  const logs: any[] = logsData?.data ?? [];
  const actionItems: any[] = actionData?.data ?? [];

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px] text-white/40 animate-pulse">Loading…</div>;
  if (!meeting) return <div className="flex items-center justify-center min-h-[400px] text-[#f87272]">Meeting not found</div>;

  const logColumns = [
    { key: "level", header: "Level", render: (v: any) => <GlassBadge color={LOG_LEVEL_COLOR[v] ?? "slate"} label={v} /> },
    { key: "message", header: "Message", render: (v: any) => <span className="text-white/70 text-xs font-mono">{v}</span> },
    { key: "createdAt", header: "Time", render: (v: any) => <span className="text-white/35 text-xs">{new Date(v).toLocaleString()}</span> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={meeting.title}
        breadcrumb={["Projects", `Project ${params.id}`, "Meetings", "Detail"]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <GlassBadge color={botStatusColor(meeting.botStatus)} label={meeting.botStatus ?? "SCHEDULED"} dot />
            {meeting.summaryStatus && <GlassBadge color="blue" label={`Summary: ${meeting.summaryStatus}`} />}
          </div>
        }
      />

      <GlassTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "details" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <GlassCard>
              <h2 className="text-sm font-semibold text-white/70 mb-4">Meeting Info</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Start", meeting.startAt ? new Date(meeting.startAt).toLocaleString() : "—"],
                  ["End", meeting.endAt ? new Date(meeting.endAt).toLocaleString() : "—"],
                  ["Bot Status", meeting.botStatus ?? "—"],
                  ["Recording", meeting.recordingStatus ?? "—"],
                  ["Summary Status", meeting.summaryStatus ?? "—"],
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-white/40 w-28 shrink-0">{label}</span>
                    <span className="text-white/80">{val}</span>
                  </div>
                ))}
                {meeting.meetingUrl && (
                  <div className="flex gap-2 col-span-2">
                    <span className="text-white/40 w-28 shrink-0">Meeting URL</span>
                    <a href={meeting.meetingUrl} target="_blank" rel="noreferrer" className="text-[#4f9cf9] hover:text-[#4f9cf9]/80 text-xs font-mono truncate">
                      {meeting.meetingUrl}
                    </a>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="space-y-4">
            <GlassCard>
              <h2 className="text-sm font-semibold text-white/70 mb-4">Bot Controls</h2>
              <div className="space-y-2">
                <GlassButton variant="primary" size="sm" className="w-full" loading={botJoinMutation.isPending} onClick={() => botJoinMutation.mutate()}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Bot Join Now
                </GlassButton>
                <GlassButton variant="secondary" size="sm" className="w-full" loading={transcribeMutation.isPending} onClick={() => transcribeMutation.mutate()}>
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Transcribe
                </GlassButton>
                <GlassButton variant="secondary" size="sm" className="w-full" loading={summarizeMutation.isPending} onClick={() => summarizeMutation.mutate()}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Summarize (Gemini)
                </GlassButton>
              </div>
              {(botJoinMutation.isError || transcribeMutation.isError || summarizeMutation.isError) && (
                <div className="flex items-center gap-2 rounded-sm bg-red-400/10 border border-red-400/20 p-2 mt-3">
                  <AlertCircle className="h-3.5 w-3.5 text-[#f87272] shrink-0" />
                  <p className="text-xs text-[#f87272]">Action failed — stub endpoint</p>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {tab === "transcript" && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">Transcript</h2>
          </div>
          {meeting.transcriptText ? (
            <pre className="text-xs text-white/65 whitespace-pre-wrap leading-relaxed font-mono bg-white/[.03] rounded-xs p-4 max-h-[60vh] overflow-y-auto">
              {meeting.transcriptText}
            </pre>
          ) : (
            <EmptyState icon={<FileText className="h-8 w-8" />} title="No transcript yet" description="Use bot controls to transcribe the meeting" />
          )}
        </GlassCard>
      )}

      {tab === "summary" && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#a78bfa]" />
            <h2 className="text-sm font-semibold text-white/70">AI Summary</h2>
            {meeting.summaryStatus === "COMPLETED" && <GlassBadge color="green" label="Completed" />}
          </div>
          {meeting.summaryMarkdown ? (
            <div className="prose prose-invert prose-sm max-w-none text-white/70">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{meeting.summaryMarkdown}</pre>
            </div>
          ) : (
            <EmptyState icon={<Sparkles className="h-8 w-8" />} title="No summary yet" description="Click 'Summarize' in bot controls to generate with Gemini AI" />
          )}
        </GlassCard>
      )}

      {tab === "action-items" && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-white/50" />
              <h2 className="text-sm font-semibold text-white/70">Action Items ({actionItems.length})</h2>
            </div>
            <GlassButton variant="secondary" size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
            </GlassButton>
          </div>

          <div className="space-y-2">
            {actionItems.map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 rounded-xs bg-white/[.04] border border-white/[.06] px-3 py-2.5">
                <button
                  onClick={() => toggleItemMutation.mutate({ itemId: item.id, status: item.status === "done" ? "pending" : "done" })}
                  className={`mt-0.5 shrink-0 h-4 w-4 rounded border transition-colors ${item.status === "done" ? "bg-[#36d399]/20 border-[#36d399]/50" : "border-white/30 hover:border-white/60"}`}
                >
                  {item.status === "done" && <CheckCircle className="h-3 w-3 text-[#36d399] m-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === "done" ? "line-through text-white/35" : "text-white/80"}`}>{item.title}</p>
                  <div className="flex gap-3 text-xs text-white/35 mt-0.5">
                    {item.ownerName && <span>{item.ownerName}</span>}
                    {item.dueDate && <span>Due: {item.dueDate}</span>}
                  </div>
                </div>
                <GlassButton variant="ghost" size="sm" onClick={() => deleteItemMutation.mutate(item.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-white/35" />
                </GlassButton>
              </div>
            ))}
            {actionItems.length === 0 && (
              <EmptyState icon={<CheckCircle className="h-6 w-6" />} title="No action items" description="Add action items from this meeting" />
            )}
          </div>

          <GlassModal open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Action Item" size="sm">
            <div className="space-y-4">
              <GlassInput label="Title *" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Action item description" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <GlassInput label="Owner" value={itemOwner} onChange={(e) => setItemOwner(e.target.value)} placeholder="Name" />
                <GlassInput label="Due Date" type="date" value={itemDue} onChange={(e) => setItemDue(e.target.value)} />
              </div>
              <div className="flex gap-3 justify-end">
                <GlassButton variant="ghost" onClick={() => setShowAddItem(false)}>Cancel</GlassButton>
                <GlassButton variant="primary" loading={addItemMutation.isPending} disabled={!itemTitle} onClick={() => addItemMutation.mutate()}>
                  Add
                </GlassButton>
              </div>
            </div>
          </GlassModal>
        </GlassCard>
      )}

      {tab === "logs" && (
        <GlassCard className="p-0">
          <div className="px-6 pt-6 pb-4 flex items-center gap-2">
            <Bot className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">Bot Logs ({logs.length})</h2>
          </div>
          <GlassTable
            columns={logColumns}
            rows={logs}
            empty={<EmptyState icon={<Bot className="h-6 w-6" />} title="No bot logs" description="Bot activity will appear here" />}
          />
        </GlassCard>
      )}
    </div>
  );
}
