"use client";
import { useQuery } from "@tanstack/react-query";
import { botApi } from "../../../lib/api";
import Link from "next/link";

export default function BotSessionDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useQuery({
    queryKey: ["bot-session", params.id],
    queryFn: () => botApi.session(Number(params.id)),
  });
  const session = data?.data;

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (!session) return <div className="p-6 text-red-500">Session not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/bot" className="hover:underline">Bot Sessions</Link>
        <span>/</span>
        <span className="font-mono text-slate-800 text-xs">{session.sessionKey}</span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5 text-sm space-y-2">
        <div className="flex gap-6">
          <span className="text-slate-500">Project: <b>{session.projectId ?? "—"}</b></span>
          <span className="text-slate-500">Channel: <b>{session.channelId ?? "—"}</b></span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${session.isOffline ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{session.isOffline ? "offline" : "online"}</span>
        </div>
        <div className="text-xs text-slate-400">
          Started: {new Date(session.startedAt).toLocaleString()} | Ended: {session.endedAt ? new Date(session.endedAt).toLocaleString() : "Active"}
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Messages ({session.messages?.length ?? 0})</h2>
        <div className="space-y-2">
          {(session.messages ?? []).map((m: any) => (
            <div key={m.id} className={`rounded-lg p-3 text-sm max-w-sm ${m.messageType === "user" ? "ml-auto bg-blue-50" : "bg-slate-50"}`}>
              <p className="text-xs text-slate-400 mb-1">{m.messageType} · {new Date(m.createdAt).toLocaleTimeString()}</p>
              <p className="text-slate-700">{m.messageText}</p>
            </div>
          ))}
          {(session.messages ?? []).length === 0 && <p className="text-slate-400 text-sm">No messages</p>}
        </div>
      </div>
    </div>
  );
}
