"use client";
import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { settingsApi, githubApi } from "../../lib/api";
import { Check, Github, Bot, AlertCircle, Pencil, X } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { GlassInput } from "../../components/ui/GlassInput";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassModal } from "../../components/ui/GlassModal";
import { GlassBadge } from "../../components/ui/GlassBadge";
import { GlassTabs } from "../../components/ui/GlassTabs";
import { GlassAvatar } from "../../components/ui/GlassAvatar";
import { EmptyState } from "../../components/ui/EmptyState";

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: meData } = useQuery({ queryKey: ["me-full"], queryFn: () => settingsApi.getMe() });
  const me = meData?.data;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");

  useEffect(() => {
    if (me) {
      setFullName(me.fullName ?? "");
      setEmail(me.email ?? "");
      setCompanyName(me.companyName ?? "");
      setGithubUsername(me.githubUsername ?? "");
    }
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.updateProfile({ fullName, email, companyName, githubUsername }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me-full"] }),
  });

  return (
    <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
      {/* Left — editable profile form */}
      <GlassCard>
        {/* Profile header */}
        <div className="flex items-center gap-5 mb-6 pb-5 border-b border-white/[.07]">
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-black bg-gradient-to-br from-[#4f9cf9]/60 to-[#a78bfa]/50 border border-white/20 shadow-glow-blue">
              {(me?.fullName ?? authUser?.name ?? "?")[0]?.toUpperCase()}
            </div>
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-[#36d399] border-2 border-[#07111f]" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white/90 leading-tight">{me?.fullName ?? authUser?.name ?? "—"}</p>
            <p className="text-sm text-white/50 mt-0.5">{me?.email ?? "—"}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {authUser?.roles?.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-white/[.08] border border-white/[.12] text-[11px] text-white/60">{r}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Form — 2-column grid like prototype */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <GlassInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <GlassInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          <GlassInput label="Company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
          <div className="col-span-2">
            <GlassInput label="GitHub Username" value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="e.g. alice-dev" />
            <p className="text-xs text-white/30 mt-1.5">ใช้สำหรับ filter commits บน MIT items ให้ตรงกับ developer</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[.07]">
          <GlassButton variant="primary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save Changes
          </GlassButton>
          {saveMutation.isSuccess && <span className="text-xs text-[#36d399] flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span>}
          {saveMutation.isError && <span className="text-xs text-[#f87272]">{(saveMutation.error as any)?.message}</span>}
        </div>
      </GlassCard>

      {/* Right — readonly account info (meta-grid style from prototype) */}
      <div className="space-y-4">
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-[.12em] text-white/40 mb-3">Account Info</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["Username", me?.username ?? "—"],
              ["Department", me?.departmentId ?? "—"],
            ].map(([label, val]) => (
              <div key={label} className="rounded-xl bg-white/[.06] border border-white/[.10] p-3">
                <span className="block text-[10px] uppercase tracking-[.14em] text-white/40 mb-1.5">{label}</span>
                <strong className="block text-sm text-white/85 font-mono">{val}</strong>
              </div>
            ))}
            <div className="col-span-2 rounded-xl bg-white/[.06] border border-white/[.10] p-3">
              <span className="block text-[10px] uppercase tracking-[.14em] text-white/40 mb-1.5">Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {authUser?.roles?.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-full bg-white/[.08] border border-white/[.12] text-[11px] text-white/70">{r}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-white/25 mt-3">ข้อมูลเหล่านี้แก้ไขได้โดย Admin เท่านั้น</p>
        </GlassCard>
      </div>
    </div>
  );
}

// ── GitHub Tab ────────────────────────────────────────────────────────────────
function GithubTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { data: sysData } = useQuery({
    queryKey: ["system-github"],
    queryFn: () => githubApi.getSystemAccount(),
    enabled: isAdmin,
  });
  const sys = sysData?.data;

  const [label, setLabel] = useState("default");
  const [token, setToken] = useState("");

  useEffect(() => { if (sys) setLabel(sys.label ?? "default"); }, [sys]);

  const saveSysMutation = useMutation({
    mutationFn: () => githubApi.updateSystemAccount({ label, ...(token ? { accessToken: token } : {}) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["system-github"] }); setToken(""); },
  });

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Github className="h-4 w-4 text-white/60" />
          <h3 className="text-sm font-semibold text-white/80">GitHub ส่วนตัว</h3>
        </div>
        <p className="text-sm text-white/55 mb-4">
          ตั้ง GitHub Username ใน <span className="font-medium text-white/75">Profile tab</span> เพื่อให้ระบบ filter commits ของ MIT item ตาม developer
        </p>
        <div className="flex items-center gap-3">
          <a href={githubApi.connectUrl(0).replace("?projectId=0", "")}>
            <GlassButton variant="secondary" size="sm">
              <Github className="h-3.5 w-3.5 mr-1.5" /> Connect My GitHub Account
            </GlassButton>
          </a>
          <span className="text-xs text-white/30">(OAuth flow)</span>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold text-white/80 mb-2">Project Connections</h3>
        <p className="text-sm text-white/45">จัดการ GitHub repo ของแต่ละ Project ได้ที่หน้า Project → tab GitHub</p>
      </GlassCard>

      {isAdmin && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white/80">System GitHub Account</h3>
              <p className="text-xs text-white/40 mt-0.5">Fallback token เมื่อ project ยังไม่ได้ connect GitHub</p>
            </div>
            <GlassBadge color={sys?.isConnected ? "green" : "orange"} label={sys?.isConnected ? "Connected" : "Not connected"} />
          </div>
          {sys?.githubUsername && (
            <p className="text-sm text-white/60 mb-3">Connected as: <span className="font-mono text-white/80">@{sys.githubUsername}</span></p>
          )}
          <div className="space-y-3">
            <GlassInput label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
            <GlassInput label="Personal Access Token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={sys?.isConnected ? "••••••••• (leave blank to keep)" : "ghp_xxxxxxxxxxxx"} />
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[.07]">
            <GlassButton variant="primary" size="sm" loading={saveSysMutation.isPending} onClick={() => saveSysMutation.mutate()}>Save</GlassButton>
            <a href={githubApi.connectSystemUrl()}>
              <GlassButton variant="secondary" size="sm"><Github className="h-3.5 w-3.5 mr-1.5" /> Connect via OAuth</GlassButton>
            </a>
            {saveSysMutation.isSuccess && <span className="text-xs text-[#36d399]"><Check className="h-3 w-3 inline mr-1" />Saved</span>}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ── Bot Accounts Tab ──────────────────────────────────────────────────────────
function BotAccountsTab() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [botEmail, setBotEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { data: botsData, isLoading } = useQuery({ queryKey: ["bot-accounts"], queryFn: () => settingsApi.listBotAccounts() });
  const bots: any[] = botsData?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editId
        ? settingsApi.updateBotAccount(editId, { email: botEmail, displayName })
        : settingsApi.createBotAccount({ email: botEmail, displayName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bot-accounts"] }); setShowModal(false); setEditId(null); setBotEmail(""); setDisplayName(""); },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => settingsApi.setDefaultBotAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bot-accounts"] }),
  });
  const disableMutation = useMutation({
    mutationFn: (id: number) => settingsApi.disableBotAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bot-accounts"] }),
  });

  const openEdit = (bot: any) => { setEditId(bot.id); setBotEmail(bot.email ?? ""); setDisplayName(bot.displayName ?? ""); setShowModal(true); };
  const openNew  = () => { setEditId(null); setBotEmail(""); setDisplayName(""); setShowModal(true); };

  const statusColor = (s: string): "green"|"blue"|"yellow"|"red"|"slate" => {
    if (s === "AVAILABLE") return "green";
    if (s === "IN_MEETING") return "blue";
    if (s === "DISABLED") return "red";
    return "slate";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/80">Google Bot Accounts</h2>
          <p className="text-xs text-white/40 mt-0.5">บัญชี Google สำหรับ Meeting Bot เข้าร่วม Google Meet</p>
        </div>
        <GlassButton variant="primary" size="sm" onClick={openNew}>
          <Bot className="h-3.5 w-3.5 mr-1.5" /> Add Account
        </GlassButton>
      </div>

      <GlassCard>
        {isLoading && <div className="py-6 text-center text-white/40 text-sm animate-pulse">Loading…</div>}
        {!isLoading && bots.length === 0 && (
          <EmptyState icon={<Bot className="h-6 w-6" />} title="No bot accounts" description="Add a Google account to enable meeting bot" />
        )}
        <div className="divide-y divide-white/[.06]">
          {bots.map((bot) => (
            <div key={bot.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <GlassAvatar name={bot.email} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{bot.email}</p>
                <p className="text-xs text-white/35">{bot.displayName ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <GlassBadge color={statusColor(bot.currentStatus)} label={bot.currentStatus} />
                {bot.isDefault && <GlassBadge color="yellow" label="Default" />}
                <GlassButton variant="ghost" size="sm" onClick={() => openEdit(bot)}><Pencil className="h-3.5 w-3.5" /></GlassButton>
                {!bot.isDefault && (
                  <GlassButton variant="ghost" size="sm" onClick={() => setDefaultMutation.mutate(bot.id)}>Set Default</GlassButton>
                )}
                {bot.currentStatus !== "DISABLED" && (
                  <GlassButton variant="danger" size="sm" onClick={() => disableMutation.mutate(bot.id)}>Disable</GlassButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassModal open={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Bot Account" : "New Bot Account"} size="sm">
        <div className="space-y-4">
          <GlassInput label="Email" type="email" value={botEmail} onChange={(e) => setBotEmail(e.target.value)} placeholder="bot@company.com" autoFocus />
          <GlassInput label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Meeting Bot 1" />
          {saveMutation.isError && (
            <div className="flex items-center gap-2 rounded-sm bg-red-400/10 border border-red-400/20 p-2.5">
              <AlertCircle className="h-4 w-4 text-[#f87272] shrink-0" />
              <p className="text-xs text-[#f87272]">{(saveMutation.error as any)?.message}</p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <GlassButton variant="ghost" onClick={() => setShowModal(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" loading={saveMutation.isPending} disabled={!botEmail} onClick={() => saveMutation.mutate()}>
              {editId ? "Save Changes" : "Add Account"}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
function SettingsInner() {
  const { hasAnyRole } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "profile";
  const [activeTab, setActiveTab] = useState(
    ["profile", "github", "bots"].includes(initialTab) ? initialTab : "profile",
  );

  const isAdmin       = hasAnyRole(["ADMIN"]);
  const canManageBots = hasAnyRole(["ADMIN", "IT_MANAGER"]);

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "github",  label: "GitHub" },
    ...(canManageBots ? [{ id: "bots", label: "Bot Accounts" }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Account, integrations & system configuration" />

      {searchParams.get("connected") && (
        <GlassCard className="border border-[#36d399]/30 bg-[#36d399]/[.05] flex items-center gap-3">
          <Check className="h-4 w-4 text-[#36d399] shrink-0" />
          <span className="text-sm text-[#36d399]">GitHub account connected successfully</span>
        </GlassCard>
      )}

      <GlassTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "github"  && <GithubTab isAdmin={isAdmin} />}
      {activeTab === "bots" && canManageBots && <BotAccountsTab />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-white/40 animate-pulse">Loading…</div>}>
      <SettingsInner />
    </Suspense>
  );
}
