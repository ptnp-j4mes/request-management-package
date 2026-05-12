"use client";
import { useQuery } from "@tanstack/react-query";
import { performanceApi } from "../../lib/api";
import { BarChart3, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassStatCard } from "../../components/ui/GlassStatCard";
import { EmptyState } from "../../components/ui/EmptyState";

export default function PerformancePage() {
  const { data, isLoading } = useQuery({ queryKey: ["performance-monthly"], queryFn: performanceApi.monthly });
  const rows = data?.data ?? [];

  const totalAssigned  = rows.reduce((s: number, r: any) => s + (r.assignedCount ?? 0), 0);
  const totalCompleted = rows.reduce((s: number, r: any) => s + (r.completedCount ?? 0), 0);
  const totalOverdue   = rows.reduce((s: number, r: any) => s + (r.overdueCount ?? 0), 0);
  const avgHours = rows.length > 0
    ? (rows.reduce((s: number, r: any) => s + (r.avgResolutionHours ?? 0), 0) / rows.length).toFixed(1)
    : "—";

  const columns = [
    { key: "fullName", header: "User", render: (v: any) => <span className="font-medium text-white/85">{v}</span> },
    { key: "projectCode", header: "Project", render: (v: any) => <span className="font-mono text-xs text-white/45">{v ?? "—"}</span> },
    { key: "yearNo", header: "Period", render: (_: any, row: any) => (
      <span className="text-white/55 text-xs">{row.yearNo}-{String(row.monthNo).padStart(2, "0")}</span>
    )},
    { key: "assignedCount", header: "Assigned", className: "text-right", render: (v: any) => <span className="text-white/70">{v}</span> },
    { key: "completedCount", header: "Completed", className: "text-right", render: (v: any) => <span className="text-[#36d399]/80 font-medium">{v}</span> },
    { key: "overdueCount", header: "Overdue", className: "text-right", render: (v: any) => <span className={v > 0 ? "text-[#f87272]" : "text-white/40"}>{v}</span> },
    { key: "avgResolutionHours", header: "Avg Hours", className: "text-right", render: (v: any) => <span className="text-white/55">{v ?? "—"}</span> },
    { key: "totalActualHours", header: "Total Hours", className: "text-right", render: (v: any) => <span className="text-white/55">{v ?? "—"}</span> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Performance Dashboard" subtitle="Monthly performance snapshot by user and project" />

      <div className="grid grid-cols-4 gap-4">
        <GlassStatCard label="Total Assigned" value={totalAssigned} color="blue" icon={<BarChart3 className="h-5 w-5" />} />
        <GlassStatCard label="Completed" value={totalCompleted} color="green" icon={<CheckCircle className="h-5 w-5" />} />
        <GlassStatCard label="Overdue" value={totalOverdue} color="red" icon={<AlertTriangle className="h-5 w-5" />} />
        <GlassStatCard label="Avg Resolution" value={avgHours} color="purple" description="hours" icon={<Clock className="h-5 w-5" />} />
      </div>

      <GlassCard className="p-0">
        <GlassTable
          columns={columns}
          rows={rows}
          loading={isLoading}
          empty={<EmptyState icon={<BarChart3 className="h-8 w-8" />} title="No performance data yet" description="Data appears after work is assigned and completed" />}
        />
      </GlassCard>
    </div>
  );
}
