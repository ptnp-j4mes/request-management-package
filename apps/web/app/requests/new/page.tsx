"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestsApi, projectsApi } from "../../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { GlassCard } from "../../../components/ui/GlassCard";
import { GlassInput, GlassTextarea, GlassSelect } from "../../../components/ui/GlassInput";
import { GlassButton } from "../../../components/ui/GlassButton";

const CHANNELS = ["portal","email","bot","manual","phone"];
const TYPES = ["bug","feedback","comment","support","user_question","change_request","uat_finding","bot_request"];
const PRIORITIES = ["critical","high","medium","low"];
const URGENCIES = ["immediate","high","medium","low"];

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

  const canSubmit = !!form.projectId && !!form.subject && !!form.description && !mutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="New Request"
        breadcrumb={["Requests", "New"]}
        actions={
          <Link href="/requests">
            <GlassButton variant="ghost" size="sm">Cancel</GlassButton>
          </Link>
        }
      />

      <GlassCard>
        <div className="space-y-4">
          <GlassSelect
            label="Project *"
            value={form.projectId}
            onChange={(e) => setField("projectId", e.target.value)}
            options={[
              { value: "", label: "Select project…" },
              ...projects.map((p: any) => ({ value: p.id, label: `${p.projectCode} – ${p.projectName}` })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <GlassSelect
              label="Channel *"
              value={form.channel}
              onChange={(e) => setField("channel", e.target.value)}
              options={CHANNELS.map((c) => ({ value: c, label: c }))}
            />
            <GlassSelect
              label="Type *"
              value={form.requestType}
              onChange={(e) => setField("requestType", e.target.value)}
              options={TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
            />
          </div>

          <GlassInput
            label="Subject *"
            value={form.subject}
            onChange={(e) => setField("subject", e.target.value)}
            placeholder="Brief subject…"
          />

          <GlassTextarea
            label="Description *"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Describe the issue or request in detail…"
            rows={5}
          />

          <div className="grid grid-cols-2 gap-4">
            <GlassSelect
              label="Priority"
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              options={PRIORITIES.map((p) => ({ value: p, label: p }))}
            />
            <GlassSelect
              label="Urgency"
              value={form.urgency}
              onChange={(e) => setField("urgency", e.target.value)}
              options={URGENCIES.map((u) => ({ value: u, label: u }))}
            />
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2 rounded-sm bg-red-400/10 border border-red-400/20 p-3">
              <AlertCircle className="h-4 w-4 text-[#f87272] shrink-0" />
              <p className="text-xs text-[#f87272]">{String(mutation.error)}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/requests" className="flex-1">
              <GlassButton variant="ghost" size="lg" className="w-full">Cancel</GlassButton>
            </Link>
            <GlassButton
              variant="primary"
              size="lg"
              className="flex-1"
              loading={mutation.isPending}
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
            >
              Submit Request
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
