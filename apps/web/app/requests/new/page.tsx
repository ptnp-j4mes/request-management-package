"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestsApi, projectsApi } from "../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewRequestPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const projects = projectsData?.data ?? [];

  const [form, setForm] = useState({
    projectId: "", channel: "portal", requestType: "bug",
    subject: "", description: "", priority: "medium", urgency: "medium",
  });

  const mutation = useMutation({
    mutationFn: () => requestsApi.create({ ...form, projectId: Number(form.projectId) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      router.push(`/requests/${data?.data?.id}`);
    },
  });

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/requests" className="hover:underline">Requests</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">New Request</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">New Request</h1>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
          <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.projectId} onChange={(e) => setField("projectId", e.target.value)}>
            <option value="">Select project…</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.projectCode} – {p.projectName}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Channel *</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.channel} onChange={(e) => setField("channel", e.target.value)}>
              {["portal", "email", "bot", "manual", "phone"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.requestType} onChange={(e) => setField("requestType", e.target.value)}>
              {["bug", "feedback", "comment", "support", "user_question", "change_request", "uat_finding", "bot_request"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
          <input className="w-full border rounded-md px-3 py-2 text-sm" value={form.subject}
            onChange={(e) => setField("subject", e.target.value)} placeholder="Brief subject…" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
          <textarea className="w-full border rounded-md px-3 py-2 text-sm h-28 resize-none" value={form.description}
            onChange={(e) => setField("description", e.target.value)} placeholder="Describe the issue or request in detail…" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
              {["critical", "high", "medium", "low"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.urgency} onChange={(e) => setField("urgency", e.target.value)}>
              {["immediate", "high", "medium", "low"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {mutation.isError && <p className="text-red-600 text-sm">{String(mutation.error)}</p>}

        <div className="flex gap-3 pt-2">
          <Link href="/requests" className="flex-1 text-center border rounded-md py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancel</Link>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.projectId || !form.subject || !form.description}
            className="flex-1 bg-blue-600 text-white rounded-md py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
