"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { mitApi, projectsApi, workflowApi } from "../../lib/api";
import Link from "next/link";
import { WorkflowActionSheet } from "../../components/mit/WorkflowActionSheet";
import { Plus, LayoutGrid, List, ClipboardList, Zap } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassSelect } from "../../components/ui/GlassInput";
import { GlassKanbanColumn, GlassKanbanCard } from "../../components/ui/GlassKanbanColumn";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../contexts/AuthContext";

const STEP_COLORS: Record<string, "blue"|"yellow"|"orange"|"green"|"slate"> = {
  DEV: "blue", QA: "yellow", UAT: "orange", MA: "green",
};

const STATUS_COLOR: Record<string, "blue"|"green"|"orange"|"slate"|"purple"> = {
  deployed: "green", in_qa: "blue", ready_for_qa: "blue",
  in_development: "orange", assigned_to_dev: "orange", new: "slate",
};

export default function MitBoardPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedMitId, setSelectedMitId] = useState<number | null>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["mit-items", { projectId: projectFilter }],
    queryFn: () => mitApi.list({ limit: "200", ...(projectFilter ? { projectId: projectFilter } : {}) }),
  });
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const { data: workflowStepsData, isLoading: workflowStepsLoading } = useQuery({
    queryKey: ["workflow-steps"],
    queryFn: workflowApi.steps,
  });

  const items: any[] = Array.isArray(data?.data?.items) ? data.data.items : [];
  const projects = Array.isArray(projectsData?.data) ? projectsData.data : [];
  const workflowSteps = Array.isArray(workflowStepsData) ? workflowStepsData : [];
  const stepCodes = workflowSteps.map((step) => step.stepCode);

  const byStep = stepCodes.reduce<Record<string, any[]>>((acc, s) => {
    acc[s] = items.filter((m) => m.currentStepCode === s);
    return acc;
  }, {});
  const noStep = items.filter((m) => !m.currentStepCode);

  const listColumns = [
    { key: "mitNo", header: "No.", render: (v: any) => <span className="font-mono text-xs text-white/40">{v}</span> },
    { key: "title", header: "Title", render: (v: any, row: any) => (
      <Link href={`/mit/${row.id}`} className="text-white/85 hover:text-[#4f9cf9] transition-colors truncate max-w-[280px] block">{v}</Link>
    )},
    { key: "currentStepCode", header: "Step", render: (v: any) => v ? (
      <GlassBadge color={STEP_COLORS[v] ?? "slate"} label={v} />
    ) : <span className="text-white/30">—</span> },
    { key: "currentStatus", header: "Status", render: (v: any) => (
      <GlassBadge color={STATUS_COLOR[v] ?? "slate"} label={v?.replace(/_/g, " ")} />
    )},
    { key: "priority", header: "Priority", render: (v: any) => v ? <GlassBadge color="slate" label={v} /> : <span className="text-white/30">—</span> },
    { key: "plannedEndDate", header: "Due", render: (v: any) => <span className="text-white/45 text-xs">{v ?? "—"}</span> },
    { key: "id", header: "", render: (_: any, row: any) => (
      <GlassButton variant="ghost" size="sm" onClick={() => setSelectedMitId(row.id)}>
        <Zap className="h-3.5 w-3.5" />
      </GlassButton>
    )},
  ];

  return (
    <div className="max-w-full space-y-5">
      <PageHeader
        title="MIT Work Board"
        subtitle={`${items.length} items`}
        actions={
          <div className="flex items-center gap-3">
            <GlassSelect
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              options={[
                { value: "", label: "All Projects" },
                ...projects.map((p: any) => ({ value: p.id, label: p.projectCode })),
              ]}
            />
            <div className="flex rounded-xs overflow-hidden border border-white/[.12]">
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-2 transition-colors ${view === "kanban" ? "bg-[#4f9cf9]/20 text-[#4f9cf9]" : "text-white/45 hover:bg-white/[.06]"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-2 transition-colors ${view === "list" ? "bg-[#4f9cf9]/20 text-[#4f9cf9]" : "text-white/45 hover:bg-white/[.06]"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <GlassButton variant="primary" size="sm" disabled>
              <Plus className="h-4 w-4 mr-1.5" /> New MIT
            </GlassButton>
          </div>
        }
      />

      {(isLoading || workflowStepsLoading) && (
        <div className="py-12 text-center text-white/40 text-sm animate-pulse">Loading…</div>
      )}

      {/* Kanban View */}
      {view === "kanban" && !isLoading && !workflowStepsLoading && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...stepCodes, "NEW"].map((step) => {
            const colItems = step === "NEW" ? noStep : byStep[step] ?? [];
            return (
              <GlassKanbanColumn key={step} title={step} count={colItems.length} color={STEP_COLORS[step]}>
                {colItems.length === 0 && (
                  <p className="text-center text-white/25 text-xs py-4">Empty</p>
                )}
                {colItems.map((m: any) => (
                  <GlassKanbanCard
                    key={m.id}
                    id={m.mitNo}
                    title={m.title}
                    badge={<GlassBadge color={STATUS_COLOR[m.currentStatus] ?? "slate"} label={m.currentStatus?.replace(/_/g, " ") ?? ""} />}
                    onClick={() => window.location.href = `/mit/${m.id}`}
                    onAction={() => setSelectedMitId(m.id)}
                  />
                ))}
              </GlassKanbanColumn>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && !isLoading && !workflowStepsLoading && (
        <GlassCard className="p-0">
          <GlassTable
            columns={listColumns}
            rows={items}
            empty={
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title="No MIT items"
                description="MIT items will appear here"
              />
            }
          />
        </GlassCard>
      )}

      {selectedMitId && (
        <WorkflowActionSheet mitId={selectedMitId} currentUserId={user?.id} steps={workflowSteps} onClose={() => setSelectedMitId(null)} />
      )}
    </div>
  );
}
