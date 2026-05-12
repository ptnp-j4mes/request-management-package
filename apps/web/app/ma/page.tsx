"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Shield } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { EmptyState } from "../../components/ui/EmptyState";

export default function MaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-agreements"],
    queryFn: () => api.get<any>("/maintenance-agreements"),
  });
  const mas = data?.data ?? [];

  const columns = [
    { key: "id", header: "ID", render: (v: any) => <span className="font-mono text-xs text-white/40">#{v}</span> },
    { key: "projectId", header: "Project", render: (v: any) => <span className="font-mono text-xs text-white/55">{v}</span> },
    { key: "maType", header: "Type", render: (v: any) => <span className="capitalize text-white/70">{v}</span> },
    { key: "startDate", header: "Start", render: (v: any) => <span className="text-white/55 text-xs">{v ?? "—"}</span> },
    { key: "endDate", header: "End", render: (v: any) => <span className="text-white/55 text-xs">{v ?? "—"}</span> },
    { key: "status", header: "Status", render: (v: any) => (
      <GlassBadge color={v === "active" ? "green" : v === "expired" ? "red" : "slate"} label={v} />
    )},
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="MA Coverage" subtitle="Maintenance agreements" />
      <GlassCard className="p-0">
        <GlassTable
          columns={columns}
          rows={mas}
          loading={isLoading}
          empty={<EmptyState icon={<Shield className="h-8 w-8" />} title="No maintenance agreements" description="MA agreements will appear here" />}
        />
      </GlassCard>
    </div>
  );
}
