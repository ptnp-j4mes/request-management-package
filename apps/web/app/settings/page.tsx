"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { settingsApi, githubApi } from "../../lib/api";

// ── Reusable field row ────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 items-center py-3 border-b last:border-0">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="col-span-2 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: meData } = useQuery({
    queryKey: ["me-full"],
    queryFn: () => settingsApi.getMe(),
  });
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">แก้ไขข้อมูลส่วนตัวของคุณ</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {(me?.fullName ?? authUser?.name ?? "?")[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900">{me?.fullName ?? authUser?.name}</p>
            <p className="text-xs text-slate-400">{authUser?.roles?.join(", ")}</p>
          </div>
        </div>

        <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your full name" />
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@company.com" />
        <Field label="Company" value={companyName} onChange={setCompanyName} placeholder="Company name" />
        <Field
          label="GitHub Username"
          value={githubUsername}
          onChange={setGithubUsername}
          placeholder="e.g. alice-dev"
        />
        <p className="text-xs text-slate-400 mt-1 ml-[33.333%]">
          ใช้สำหรับ filter commits บน MIT items ให้ตรงกับ developer
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
          {saveMutation.isSuccess && <span className="text-sm text-green-600">✓ Saved</span>}
          {saveMutation.isError && (
            <span className="text-sm text-red-600">{(saveMutation.error as any)?.message}</span>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg border p-4 text-sm text-slate-500 space-y-1">
        <p><span className="font-medium text-slate-700">Username:</span> {me?.username ?? "—"}</p>
        <p><span className="font-medium text-slate-700">Department:</span> {me?.departmentId ?? "—"}</p>
        <p><span className="font-medium text-slate-700">Roles:</span> {authUser?.roles?.join(", ") ?? "—"}</p>
        <p className="text-xs text-slate-400">ข้อมูลเหล่านี้แก้ไขได้โดย Admin เท่านั้น</p>
      </div>
    </div>
  );
}

// ── GitHub Tab ────────────────────────────────────────────────────────────────
function GithubTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: sysData, refetch: refetchSys } = useQuery({
    queryKey: ["system-github"],
    queryFn: () => githubApi.getSystemAccount(),
    enabled: isAdmin,
  });
  const sys = sysData?.data;

  const [label, setLabel] = useState("default");
  const [token, setToken] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sys) setLabel(sys.label ?? "default");
  }, [sys]);

  const saveSysMutation = useMutation({
    mutationFn: () => githubApi.updateSystemAccount({ label, ...(token ? { accessToken: token } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-github"] });
      setToken("");
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">GitHub Integration</h2>
        <p className="text-sm text-slate-500 mt-0.5">จัดการการเชื่อมต่อ GitHub</p>
      </div>

      {/* Personal GitHub */}
      <div className="bg-white rounded-lg border shadow-sm p-5 space-y-3">
        <h3 className="font-medium text-slate-800">GitHub ส่วนตัว</h3>
        <p className="text-sm text-slate-500">
          ตั้ง GitHub Username ใน <span className="font-medium">Profile tab</span> เพื่อให้ระบบ filter
          commits ของ MIT item ตาม developer คนนั้น
        </p>
        <div className="flex items-center gap-2">
          <a
            href={githubApi.connectUrl(0).replace("?projectId=0", "")}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-700 transition-colors"
          >
            Connect My GitHub Account
          </a>
          <span className="text-xs text-slate-400">(สำหรับ OAuth flow ในอนาคต)</span>
        </div>
      </div>

      {/* Project connections (list) */}
      <div className="bg-white rounded-lg border shadow-sm p-5 space-y-3">
        <h3 className="font-medium text-slate-800">Project Connections</h3>
        <p className="text-sm text-slate-500">จัดการ GitHub repo ของแต่ละ Project ได้ที่หน้า Project → tab GitHub</p>
      </div>

      {/* Central / System GitHub Account — ADMIN only */}
      {isAdmin && (
        <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-800">บัญชีกลาง GitHub (System Account)</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                ใช้เป็น fallback token เมื่อ project ยังไม่ได้ connect GitHub เอง
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sys?.isConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {sys?.isConnected ? "✓ Connected" : "Not connected"}
            </span>
          </div>

          {sys?.githubUsername && (
            <p className="text-sm text-slate-600">
              Connected as: <span className="font-mono font-medium">@{sys.githubUsername}</span>
            </p>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm text-slate-600">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="col-span-2 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <label className="text-sm text-slate-600">Personal Access Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={sys?.isConnected ? "••••••••• (leave blank to keep)" : "ghp_xxxxxxxxxxxx"}
                className="col-span-2 border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t">
            <button
              onClick={() => saveSysMutation.mutate()}
              disabled={saveSysMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saveSysMutation.isPending ? "Saving…" : "Save"}
            </button>
            <a
              href={githubApi.connectSystemUrl()}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-700"
            >
              Connect via OAuth
            </a>
            {saveSysMutation.isSuccess && <span className="text-sm text-green-600">✓ Saved</span>}
            {saveSysMutation.isError && (
              <span className="text-sm text-red-600">{(saveSysMutation.error as any)?.message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Google Bot Accounts Tab ───────────────────────────────────────────────────
function BotAccountsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { data: botsData, isLoading } = useQuery({
    queryKey: ["bot-accounts"],
    queryFn: () => settingsApi.listBotAccounts(),
  });
  const bots: any[] = botsData?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editId
        ? settingsApi.updateBotAccount(editId, { email, displayName })
        : settingsApi.createBotAccount({ email, displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-accounts"] });
      setShowForm(false);
      setEditId(null);
      setEmail("");
      setDisplayName("");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => settingsApi.setDefaultBotAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bot-accounts"] }),
  });

  const disableMutation = useMutation({
    mutationFn: (id: number) => settingsApi.disableBotAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bot-accounts"] }),
  });

  const openEdit = (bot: any) => {
    setEditId(bot.id);
    setEmail(bot.email ?? "");
    setDisplayName(bot.displayName ?? "");
    setShowForm(true);
  };

  const statusColor: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700",
    IN_MEETING: "bg-blue-100 text-blue-700",
    OFFLINE: "bg-slate-100 text-slate-600",
    DISABLED: "bg-red-100 text-red-600",
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Google Bot Accounts</h2>
          <p className="text-sm text-slate-500 mt-0.5">บัญชี Google สำหรับ Meeting Bot เข้าร่วม Google Meet</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setEmail(""); setDisplayName(""); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-slate-800 text-sm">{editId ? "Edit Bot Account" : "New Bot Account"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bot@company.com"
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Meeting Bot 1"
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!email || saveMutation.isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-slate-600 border rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            {saveMutation.isError && (
              <span className="text-xs text-red-600 self-center">{(saveMutation.error as any)?.message}</span>
            )}
          </div>
        </div>
      )}

      {/* Accounts table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isLoading && <p className="p-5 text-slate-400 text-sm">Loading…</p>}
        {!isLoading && bots.length === 0 && (
          <p className="p-5 text-slate-400 text-sm">No bot accounts yet. Add one to get started.</p>
        )}
        {bots.map((bot) => (
          <div key={bot.id} className="flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-slate-50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{bot.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">{bot.displayName ?? "—"}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[bot.currentStatus] ?? "bg-slate-100 text-slate-600"}`}>
              {bot.currentStatus}
            </span>
            {bot.isDefault && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                Default
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEdit(bot)}
                className="text-xs text-blue-600 hover:underline"
              >
                Edit
              </button>
              {!bot.isDefault && (
                <button
                  onClick={() => setDefaultMutation.mutate(bot.id)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Set Default
                </button>
              )}
              {bot.currentStatus !== "DISABLED" && (
                <button
                  onClick={() => disableMutation.mutate(bot.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Disable
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, hasAnyRole } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "profile";

  const [activeTab, setActiveTab] = useState(
    ["profile", "github", "bots"].includes(initialTab) ? initialTab : "profile",
  );

  const isAdmin = hasAnyRole(["ADMIN"]);
  const canManageBots = hasAnyRole(["ADMIN", "IT_MANAGER"]);

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "github", label: "GitHub" },
    ...(canManageBots ? [{ key: "bots", label: "Google Bot Accounts" }] : []),
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Account, integrations & system configuration</p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Connected notification */}
      {searchParams.get("connected") && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          ✓ GitHub account connected successfully
        </div>
      )}

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "github" && <GithubTab isAdmin={isAdmin} />}
      {activeTab === "bots" && canManageBots && <BotAccountsTab />}
    </div>
  );
}
