"use client";
import { useQuery } from "@tanstack/react-query";
import { uatApi } from "../../lib/api";
import Link from "next/link";
import { TestTube } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { EmptyState } from "../../components/ui/EmptyState";

export default function UatPage() {
  const { data, isLoading } = useQuery({ queryKey: ["uat-cycles"], queryFn: uatApi.cycles });
  const cycles = data?.data ?? [];

  const columns = [
    { key: "cycleName", header: "Cycle Name", render: (v: any, row: any) => (
      <Link href={`/uat/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors font-medium">{v}</Link>
    )},
    { key: "projectId", header: "Project", render: (v: any) => <span className="font-mono text-xs text-white/45">{v}</span> },
    { key: "startDate", header: "Start", render: (v: any) => <span className="text-white/55 text-xs">{v ?? "—"}</span> },
    { key: "endDate", header: "End", render: (v: any) => <span className="text-white/55 text-xs">{v ?? "—"}</span> },
    { key: "status", header: "Status", render: (v: any) => (
      <GlassBadge
        color={v === "active" ? "green" : v === "completed" ? "blue" : "slate"}
        label={v}
      />
    )},
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="UAT Management" subtitle={`${cycles.length} cycles`} />
      <GlassCard className="p-0">
        <GlassTable
          columns={columns}
          rows={cycles}
          loading={isLoading}
          empty={<EmptyState icon={<TestTube className="h-8 w-8" />} title="No UAT cycles" description="UAT cycles will appear here" />}
        />
      </GlassCard>
    </div>
  );
}
