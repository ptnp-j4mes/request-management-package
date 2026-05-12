"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { meetingsApi } from "../../../../lib/api";
import Link from "next/link";
import { Plus, Bot, Calendar, FileText, AlertCircle } from "lucide-react";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { GlassCard } from "../../../../components/ui/GlassCard";
import { GlassBadge } from "../../../../components/ui/GlassBadge";
import { GlassButton } from "../../../../components/ui/GlassButton";
import { GlassModal } from "../../../../components/ui/GlassModal";
import { GlassInput } from "../../../../components/ui/GlassInput";
import { EmptyState } from "../../../../components/ui/EmptyState";

function botStatusColor(s: string): "green"|"blue"|"orange"|"slate"|"yellow" {
  if (s === "IN_MEETING") return "green";
  if (s === "JOINING") return "blue";
  if (s === "LEFT" || s === "COMPLETED") return "slate";
  if (s === "SCHEDULED") return "yellow";
  return "slate";
}

function summaryColor(s: string): "green"|"blue"|"orange"|"slate"|"yellow" {
  if (s === "COMPLETED") return "green";
  if (s === "SUMMARIZING") return "blue";
  if (s === "PENDING") return "yellow";
  return "slate";
}

export default function MeetingsPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const projectId = Number(params.id);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["meetings", projectId],
    queryFn: () => meetingsApi.list(projectId),
  });
  const meetings: any[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => meetingsApi.create(projectId, { title, startAt, endAt: endAt || undefined, meetingUrl: meetingUrl || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings", projectId] });
      setShowCreate(false);
      setTitle(""); setStartAt(""); setEndAt(""); setMeetingUrl("");
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Meetings"
        breadcrumb={["Projects", `Project ${params.id}`, "Meetings"]}
        actions={
          <GlassButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Meeting
          </GlassButton>
        }
      />

      {isLoading && <div className="py-10 text-center text-white/40 text-sm animate-pulse">Loading…</div>}

      {!isLoading && meetings.length === 0 && (
        <GlassCard>
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No meetings yet"
            description="Schedule a meeting and let the bot join automatically"
            action={
              <GlassButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> New Meeting
              </GlassButton>
            }
          />
        </GlassCard>
      )}

      <div className="space-y-3">
        {meetings.map((m: any) => (
          <GlassCard key={m.id} hover>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GlassBadge color={botStatusColor(m.botStatus)} label={m.botStatus ?? "SCHEDULED"} dot />
                  {m.summaryStatus && m.summaryStatus !== "PENDING" && (
                    <GlassBadge color={summaryColor(m.summaryStatus)} label={`Summary: ${m.summaryStatus}`} />
                  )}
                </div>
                <Link href={`/projects/${params.id}/meetings/${m.id}`}
                  className="text-base font-semibold text-white/85 hover:text-[#4f9cf9] transition-colors">
                  {m.title}
                </Link>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {m.startAt ? new Date(m.startAt).toLocaleString() : "—"}
                  </span>
                  {m.endAt && <span>– {new Date(m.endAt).toLocaleString()}</span>}
                  {m.meetingUrl && (
                    <a href={m.meetingUrl} target="_blank" rel="noreferrer" className="text-[#4f9cf9] hover:text-[#4f9cf9]/80">
                      <Bot className="h-3 w-3 inline mr-0.5" /> Join Link
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.transcriptText && <FileText className="h-4 w-4 text-white/40" aria-label="Has transcript" />}
                <Link href={`/projects/${params.id}/meetings/${m.id}`}>
                  <GlassButton variant="ghost" size="sm">Details →</GlassButton>
                </Link>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassModal open={showCreate} onClose={() => setShowCreate(false)} title="New Meeting" size="md">
        <div className="space-y-4">
          <GlassInput label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team standup" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <GlassInput label="Start At *" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            <GlassInput label="End At" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
          <GlassInput label="Meeting URL" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." />
          {createMutation.isError && (
            <div className="flex items-center gap-2 rounded-sm bg-red-400/10 border border-red-400/20 p-2.5">
              <AlertCircle className="h-4 w-4 text-[#f87272] shrink-0" />
              <p className="text-xs text-[#f87272]">{(createMutation.error as any)?.message}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <GlassButton variant="ghost" onClick={() => setShowCreate(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" loading={createMutation.isPending} disabled={!title || !startAt} onClick={() => createMutation.mutate()}>
              Create Meeting
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
