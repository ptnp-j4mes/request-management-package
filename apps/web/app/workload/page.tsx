"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { workloadApi } from "../../lib/api";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassTabs } from "../../components/ui/GlassTabs";
import { GlassStatCard } from "../../components/ui/GlassStatCard";
import { EmptyState } from "../../components/ui/EmptyState";

export default function WorkloadPage() {
  const [tab, setTab] = useState("user");

  const { data: byUser } = useQuery({ queryKey: ["workload-by-user"], queryFn: workloadApi.byUser });
  const { data: byProject } = useQuery({ queryKey: ["workload-by-project"], queryFn: workloadApi.byProject });
  const { data: overdue } = useQuery({ queryKey: ["workload-overdue"], queryFn: workloadApi.overdue });

  const users = byUser?.data ?? [];
  const projects = byProject?.data ?? [];
  const overdueItems = overdue?.data ?? [];

  const userColumns = [
    { key: "fullName", header: "Name", render: (v: any) => <span className="font-medium text-white/85">{v}</span> },
    { key: "roleName", header: "Role", render: (v: any) => v ? <GlassBadge color="blue" label={v} /> : <span className="text-white/30">—</span> },
    { key: "onHand", header: "On Hand", className: "text-right", render: (v: any) => <span className="text-white/70 font-medium">{v}</span> },
    { key: "waitingTest", header: "Waiting Test", className: "text-right", render: (v: any) => <span className="text-[#fbbd23]/80">{v}</span> },
    { key: "waitingUat", header: "Waiting UAT", className: "text-right", render: (v: any) => <span className="text-[#fb923c]/80">{v}</span> },
    { key: "deployed", header: "Deployed", className: "text-right", render: (v: any) => <span className="text-[#36d399]/80">{v}</span> },
  ];

  const projectColumns = [
    { key: "projectCode", header: "Project", render: (_: any, row: any) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-white/40">{row.projectCode}</span>
        <span className="text-white/75">{row.projectName}</span>
      </div>
    )},
    { key: "total", header: "Total", className: "text-right", render: (v: any) => <span className="text-white/70">{v}</span> },
    { key: "onHand", header: "On Hand", className: "text-right", render: (v: any) => <span className="font-medium text-white/80">{v}</span> },
    { key: "waitingTest", header: "Waiting Test", className: "text-right", render: (v: any) => <span className="text-[#fbbd23]/80">{v}</span> },
    { key: "waitingUat", header: "Waiting UAT", className: "text-right", render: (v: any) => <span className="text-[#fb923c]/80">{v}</span> },
    { key: "deployed", header: "Deployed", className: "text-right", render: (v: any) => <span className="text-[#36d399]/80">{v}</span> },
  ];

  const overdueColumns = [
    { key: "mitNo", header: "No.", render: (v: any) => <span className="font-mono text-xs text-[#f87272]">{v}</span> },
    { key: "title", header: "Title", render: (v: any, row: any) => (
      <Link href={`/mit/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors">{v}</Link>
    )},
    { key: "currentStepCode", header: "Step", render: (v: any) => v ? <span className="font-mono text-xs bg-white/[.08] px-1.5 py-0.5 rounded-xs">{v}</span> : <span className="text-white/30">—</span> },
    { key: "currentStatus", header: "Status", render: (v: any) => <GlassBadge color="slate" label={v?.replace(/_/g, " ")} /> },
    { key: "plannedEndDate", header: "Planned End", render: (v: any) => <span className="text-[#f87272] font-medium text-xs">{v}</span> },
  ];

  const tabs = [
    { id: "user",    label: "By User",    count: users.length },
    { id: "project", label: "By Project", count: projects.length },
    { id: "overdue", label: "Overdue",    count: overdueItems.length },
  ];

  const totalOnHand = users.reduce((s: number, u: any) => s + u.onHand, 0);
  const totalTest   = users.reduce((s: number, u: any) => s + u.waitingTest, 0);
  const totalUat    = users.reduce((s: number, u: any) => s + u.waitingUat, 0);
  const totalDeploy = users.reduce((s: number, u: any) => s + u.deployed, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="Workload Report" subtitle="Team workload across all projects" />

      <div className="grid grid-cols-4 gap-4">
        <GlassStatCard label="On Hand" value={totalOnHand} color="blue" description="Active items" />
        <GlassStatCard label="Waiting Test" value={totalTest} color="yellow" description="QA queue" />
        <GlassStatCard label="Waiting UAT" value={totalUat} color="orange" description="UAT queue" />
        <GlassStatCard label="Deployed" value={totalDeploy} color="green" description="Done" />
      </div>

      <GlassTabs tabs={tabs} active={tab} onChange={setTab} />

      <GlassCard className="p-0">
        {tab === "user" && (
          <GlassTable columns={userColumns} rows={users} empty={<EmptyState title="No workload data" />} />
        )}
        {tab === "project" && (
          <GlassTable columns={projectColumns} rows={projects} empty={<EmptyState title="No project data" />} />
        )}
        {tab === "overdue" && (
          <GlassTable
            columns={overdueColumns}
            rows={overdueItems}
            empty={
              <EmptyState
                icon={<AlertTriangle className="h-6 w-6 text-[#36d399]" />}
                title="No overdue items"
                description="All items are on track"
              />
            }
          />
        )}
      </GlassCard>
    </div>
  );
}
