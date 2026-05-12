"use client";
import { useQuery } from "@tanstack/react-query";
import { botApi } from "../../lib/api";
import Link from "next/link";
import { Bot } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { EmptyState } from "../../components/ui/EmptyState";

export default function BotSessionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["bot-sessions"], queryFn: botApi.sessions });
  const sessions = data?.data ?? [];

  const columns = [
    { key: "sessionKey", header: "Session Key", render: (v: any, row: any) => (
      <Link href={`/bot/${row.id}`} className="font-mono text-xs text-[#4f9cf9] hover:text-[#4f9cf9]/80 transition-colors">{v}</Link>
    )},
    { key: "projectId", header: "Project", render: (v: any) => <span className="font-mono text-xs text-white/45">{v ?? "—"}</span> },
    { key: "channelId", header: "Channel", render: (v: any) => <span className="font-mono text-xs text-white/45">{v ?? "—"}</span> },
    { key: "isOffline", header: "Mode", render: (v: any) => (
      <GlassBadge color={v ? "yellow" : "green"} label={v ? "offline" : "online"} dot />
    )},
    { key: "startedAt", header: "Started", render: (v: any) => <span className="text-xs text-white/45">{new Date(v).toLocaleString()}</span> },
    { key: "endedAt", header: "Ended", render: (v: any) => (
      v ? <span className="text-xs text-white/45">{new Date(v).toLocaleString()}</span>
        : <GlassBadge color="green" label="Active" dot />
    )},
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Bot Sessions" subtitle={`${sessions.length} sessions`} />
      <GlassCard className="p-0">
        <GlassTable
          columns={columns}
          rows={sessions}
          loading={isLoading}
          empty={<EmptyState icon={<Bot className="h-8 w-8" />} title="No bot sessions" description="Bot conversations will appear here" />}
        />
      </GlassCard>
    </div>
  );
}
