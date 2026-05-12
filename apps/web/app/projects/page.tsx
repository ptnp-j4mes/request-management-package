"use client";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../../lib/api";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { EmptyState } from "../../components/ui/EmptyState";

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const projects = data?.data ?? [];

  const columns = [
    { key: "projectCode", header: "Code", render: (v: any) => <span className="font-mono text-xs font-medium text-[#4f9cf9]">{v}</span> },
    { key: "projectName", header: "Name", render: (v: any, row: any) => (
      <Link href={`/projects/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors font-medium">{v}</Link>
    )},
    { key: "customerName", header: "Customer", render: (v: any) => <span className="text-white/55">{v ?? "—"}</span> },
    { key: "goLiveDate", header: "Go Live", render: (v: any) => <span className="text-white/55 text-xs">{v ?? "—"}</span> },
    { key: "status", header: "Status", render: (v: any) => (
      <GlassBadge color={v === "active" ? "green" : v === "completed" ? "blue" : "slate"} label={v} />
    )},
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects`}
        actions={
          <Link href="/projects/new">
            <GlassButton variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> New Project
            </GlassButton>
          </Link>
        }
      />

      <GlassCard className="p-0">
        <GlassTable
          columns={columns}
          rows={projects}
          loading={isLoading}
          onRowClick={(row) => window.location.href = `/projects/${row.id}`}
          empty={
            <EmptyState
              icon={<FolderKanban className="h-8 w-8" />}
              title="No projects found"
              description="Create your first project to get started"
              action={
                <Link href="/projects/new">
                  <GlassButton variant="primary" size="sm">
                    <Plus className="h-4 w-4 mr-1.5" /> New Project
                  </GlassButton>
                </Link>
              }
            />
          }
        />
      </GlassCard>
    </div>
  );
}
