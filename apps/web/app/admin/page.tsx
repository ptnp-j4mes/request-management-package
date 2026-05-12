"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Users, Settings, Shield } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassTable } from "../../components/ui/GlassTable";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassTabs } from "../../components/ui/GlassTabs";
import { GlassAvatar } from "../../components/ui/GlassAvatar";
import { EmptyState } from "../../components/ui/EmptyState";

const TABS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
  { id: "config", label: "Workflow Config" },
];

const ROLES = [
  { code: "ADMIN", label: "Admin", desc: "Full access to everything" },
  { code: "IT_MANAGER", label: "IT Manager", desc: "Manage projects, assign, close, bot settings" },
  { code: "APPROVER", label: "Approver", desc: "Approve/reject requests in own department" },
  { code: "BA", label: "Business Analyst", desc: "Analyze, assign, scope requests" },
  { code: "DEVELOPER", label: "Developer", desc: "Update development status on assigned items" },
  { code: "FULLSTACK", label: "Fullstack", desc: "Developer + broader scope" },
  { code: "QA", label: "QA Engineer", desc: "Create QA results on assigned items" },
  { code: "REQUESTER", label: "Requester", desc: "Create requests, confirm UAT for own requests" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("users");

  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
    enabled: tab === "users",
  });
  const users = data?.data ?? [];

  const userColumns = [
    { key: "fullName", header: "Name", render: (v: any, row: any) => (
      <div className="flex items-center gap-2.5">
        <GlassAvatar name={v ?? row.username ?? "?"} size="sm" />
        <span className="font-medium text-white/85">{v}</span>
      </div>
    )},
    { key: "email", header: "Email", render: (v: any) => <span className="text-white/50 text-xs">{v ?? "—"}</span> },
    { key: "roleName", header: "Role", render: (v: any) => v ? <GlassBadge color="blue" label={v} /> : <span className="text-white/30">—</span> },
    { key: "isActive", header: "Status", render: (v: any) => (
      <GlassBadge color={v ? "green" : "slate"} label={v ? "Active" : "Inactive"} />
    )},
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Admin Panel" subtitle="Users, roles, and system configuration" />

      <GlassTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "users" && (
        <GlassCard className="p-0">
          <div className="px-6 pt-6 pb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">Users ({users.length})</h2>
          </div>
          <GlassTable
            columns={userColumns}
            rows={users}
            empty={<EmptyState icon={<Users className="h-8 w-8" />} title="No users found" />}
          />
        </GlassCard>
      )}

      {tab === "roles" && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">RBAC Roles</h2>
          </div>
          <div className="space-y-2">
            {ROLES.map((role) => (
              <div key={role.code} className="flex items-start gap-4 rounded-xs bg-white/[.04] border border-white/[.06] px-4 py-3">
                <GlassBadge color="blue" label={role.code} />
                <div>
                  <p className="text-sm font-medium text-white/80">{role.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{role.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {tab === "config" && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white/70">Workflow Configuration</h2>
          </div>
          <EmptyState title="Workflow Config" description="Workflow step definitions and configurations" />
        </GlassCard>
      )}
    </div>
  );
}
