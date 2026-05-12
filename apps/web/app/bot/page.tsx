"use client";
import { useQuery } from "@tanstack/react-query";
import { botApi } from "../../lib/api";
import Link from "next/link";

export default function BotSessionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["bot-sessions"], queryFn: botApi.sessions });
  const sessions = data?.data ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Bot Sessions</h1>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Session Key</th>
              <th className="px-5 py-3 text-left">Project</th>
              <th className="px-5 py-3 text-left">Channel</th>
              <th className="px-5 py-3 text-left">Mode</th>
              <th className="px-5 py-3 text-left">Started</th>
              <th className="px-5 py-3 text-left">Ended</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {sessions.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/bot/${s.id}`} className="text-blue-600 hover:underline font-mono text-xs">{s.sessionKey}</Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{s.projectId ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-xs">{s.channelId ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isOffline ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {s.isOffline ? "offline" : "online"}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{s.endedAt ? new Date(s.endedAt).toLocaleString() : "Active"}</td>
              </tr>
            ))}
            {!isLoading && sessions.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No bot sessions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
