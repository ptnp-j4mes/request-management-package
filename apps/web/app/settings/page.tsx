"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Github,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Plus,
  Save,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { githubApi, settingsApi } from "../../lib/api";
import { GlassButton } from "../../components/ui/GlassButton";
import { GlassModal } from "../../components/ui/GlassModal";

type ActiveView = "user" | "system";
type ToastKind = "success" | "warning" | "error" | "info";

type ToastMessage = {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
};

type ProfilePayload = {
  id?: number;
  username?: string;
  fullName?: string;
  email?: string;
  departmentId?: string | number | null;
  companyName?: string;
  githubUsername?: string;
  roles?: string[];
};

type SystemGithubAccount = {
  label?: string;
  githubUsername?: string;
  isConnected?: boolean;
};

type BotAccount = {
  id: number;
  email?: string;
  displayName?: string;
  currentStatus?: string;
  isDefault?: boolean;
};

const btnBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";
const btnPrimary =
  "bg-gradient-to-br from-blue-400/95 to-violet-400/95 shadow-[0_0_24px_rgba(79,156,249,0.38)]";
const btnSecondary = "border border-white/20 bg-white/10 text-white hover:bg-white/20";
const btnGhost = "border border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function initials(name?: string | null, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function roleText(roles?: string[]) {
  if (!roles?.length) return "No role assigned";
  return roles.map((role) => role.replaceAll("_", " ")).join(", ");
}

function glassClasses(extra = "") {
  return cn(
    "rounded-[1.35rem] border border-white/10 bg-white/[0.075] shadow-[0_20px_60px_rgba(15,23,42,0.28)] backdrop-blur-2xl",
    extra,
  );
}

const badgeStyles: Record<ToastKind | "blue" | "green" | "red" | "yellow" | "purple" | "cyan" | "muted", string> = {
  success: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  warning: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  error: "border-rose-300/25 bg-rose-300/10 text-rose-200",
  info: "border-sky-300/25 bg-sky-300/10 text-sky-200",
  blue: "border-blue-300/25 bg-blue-300/10 text-blue-200",
  green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  red: "border-rose-300/25 bg-rose-300/10 text-rose-200",
  yellow: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  purple: "border-violet-300/25 bg-violet-300/10 text-violet-200",
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
  muted: "border-white/20 bg-white/5 text-white/50",
};

function Badge({
  children,
  variant = "muted",
  dot = true,
}: {
  children: ReactNode;
  variant?: keyof typeof badgeStyles;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold leading-none tracking-wide",
        badgeStyles[variant],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_0_3px_rgba(255,255,255,0.08)]" />}
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-blue-300/60 focus:bg-white/[0.13] focus:ring-4 focus:ring-blue-400/20"
      />
    </label>
  );
}

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-white/50">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  value,
  label,
  note,
  variant = "muted",
}: {
  value: string;
  label: string;
  note: string;
  variant?: keyof typeof badgeStyles;
}) {
  return (
    <div className={glassClasses("p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-[-0.04em] text-white">{value}</div>
          <div className="mt-1 text-sm font-medium text-white/80">{label}</div>
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-white/45">{note}</p>
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(100%-2rem,360px)] gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-2xl border p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl",
            toast.kind === "success" && "border-emerald-300/25 bg-emerald-300/12",
            toast.kind === "warning" && "border-amber-300/25 bg-amber-300/12",
            toast.kind === "error" && "border-rose-300/25 bg-rose-300/12",
            toast.kind === "info" && "border-sky-300/25 bg-sky-300/12",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                toast.kind === "success" && "border-emerald-200/30 bg-emerald-200/15 text-emerald-100",
                toast.kind === "warning" && "border-amber-200/30 bg-amber-200/15 text-amber-100",
                toast.kind === "error" && "border-rose-200/30 bg-rose-200/15 text-rose-100",
                toast.kind === "info" && "border-sky-200/30 bg-sky-200/15 text-sky-100",
              )}
            >
              {toast.kind === "error" ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-white">{toast.title}</strong>
                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="rounded-full p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-white/65">{toast.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OtpModal({
  open,
  mode,
  otpInput,
  setOtpInput,
  verifying,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: "enable" | "disable";
  otpInput: string;
  setOtpInput: (value: string) => void;
  verifying: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={mode === "enable" ? "Enable Two-Factor Authentication" : "Disable Two-Factor Authentication"}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/20 bg-amber-300/10 text-amber-100">
            <Shield className="h-5 w-5" />
          </div>
          <p className="text-sm leading-6 text-white/65">
            Enter the 6-digit code sent to your email address to confirm this security change.
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpInput}
          onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          autoFocus
          className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-center text-2xl font-mono tracking-[0.45em] text-white outline-none transition placeholder:text-white/25 focus:border-blue-300/60 focus:ring-4 focus:ring-blue-400/20"
        />

        <div className="flex flex-wrap justify-end gap-3">
          <GlassButton variant="ghost" onClick={onClose} disabled={verifying}>
            Cancel
          </GlassButton>
          <GlassButton variant="primary" loading={verifying} disabled={otpInput.length !== 6 || verifying} onClick={onConfirm}>
            {verifying ? "Verifying…" : "Verify"}
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
}

function Hero({
  activeView,
  canManageSystem,
  isAdmin,
  onSaveProfile,
  onOpen2fa,
  onSaveSystem,
}: {
  activeView: ActiveView;
  canManageSystem: boolean;
  isAdmin: boolean;
  onSaveProfile: () => void;
  onOpen2fa: () => void;
  onSaveSystem: () => void;
}) {
  const system = activeView === "system";

  return (
    <article className={glassClasses("relative overflow-hidden p-6 sm:p-7")}>
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.045] via-transparent to-white/[0.035]" />
      <div className="relative">
        <div className="mb-3 text-xs font-medium text-white/40">
          Settings / {system ? "System Settings" : "User Settings"}
        </div>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.05em] text-white sm:text-4xl">
              {system ? "System Settings" : "User Settings"}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/60">
              {system
                ? "Platform integrations, email delivery notes, and meeting bot identities live here. Role-gated for administrators and IT managers."
                : "Personal profile, security controls, and the identity data used throughout the request platform live here."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {system ? (
              <>
                <Badge variant={canManageSystem ? "green" : "red"}>{canManageSystem ? "Access allowed" : "Restricted"}</Badge>
                <Badge variant="blue">GitHub</Badge>
                <Badge variant="cyan">SMTP</Badge>
                <Badge variant="purple">Bots</Badge>
              </>
            ) : (
              <>
                <Badge variant="blue">Profile</Badge>
                <Badge variant="green">2FA</Badge>
                <Badge variant="muted">Identity</Badge>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {system ? (
            <>
              <button type="button" onClick={onSaveSystem} className={cn(btnBase, btnPrimary)} disabled={!canManageSystem}>
                <Save className="h-4 w-4" />
                Save system config
              </button>
              <button type="button" onClick={onSaveSystem} className={cn(btnBase, btnSecondary)} disabled={!canManageSystem}>
                <Mail className="h-4 w-4" />
                Test SMTP
              </button>
              <a
                href={githubApi.connectSystemUrl()}
                className={cn(btnBase, btnGhost, !isAdmin && "pointer-events-none opacity-50")}
              >
                <Github className="h-4 w-4" />
                OAuth connect
              </a>
            </>
          ) : (
            <>
              <button type="button" onClick={onSaveProfile} className={cn(btnBase, btnPrimary)}>
                <Save className="h-4 w-4" />
                Save profile
              </button>
              <button type="button" onClick={onOpen2fa} className={cn(btnBase, btnSecondary)}>
                <Shield className="h-4 w-4" />
                Manage 2FA
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function ModeSwitch({
  activeView,
  setActiveView,
  canManageSystem,
}: {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  canManageSystem: boolean;
}) {
  return (
    <div className={glassClasses("p-3")}>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setActiveView("user")}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
            activeView === "user" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
          )}
        >
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10">
            <User className="h-4 w-4" />
          </span>
          <span>
            <span className="block">User Settings</span>
            <span className="mt-0.5 block text-xs font-normal text-white/40">Profile and security</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView("system")}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
            activeView === "system" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
          )}
        >
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10">
            <Settings className="h-4 w-4" />
          </span>
          <span>
            <span className="block">System Settings</span>
            <span className="mt-0.5 block text-xs font-normal text-white/40">
              {canManageSystem ? "Integrations and bots" : "Restricted area"}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function ProfileSection({
  pushToast,
  requestSaveKey,
}: {
  pushToast: (kind: ToastKind, title: string, message: string) => void;
  requestSaveKey: number;
}) {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: meData, isLoading } = useQuery({
    queryKey: ["me-full"],
    queryFn: () => settingsApi.getMe(),
  });

  const me = meData?.data as ProfilePayload | undefined;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");

  useEffect(() => {
    if (!me) return;
    setFullName(me.fullName ?? "");
    setEmail(me.email ?? "");
    setCompanyName(me.companyName ?? "");
    setGithubUsername(me.githubUsername ?? "");
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.updateProfile({ fullName, email, companyName, githubUsername }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me-full"] });
      pushToast("success", "Profile saved", "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว");
    },
    onError: (error) => pushToast("error", "Save failed", errorMessage(error)),
  });

  useEffect(() => {
    if (requestSaveKey > 0) saveMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSaveKey]);

  const displayName = fullName || me?.fullName || authUser?.name || "Unknown User";
  const displayEmail = email || me?.email || authUser?.email || "No email";
  const roles = authUser?.roles ?? me?.roles ?? [];

  const copyIdentity = async () => {
    try {
      await navigator.clipboard?.writeText(`${displayName} | ${displayEmail}`);
      pushToast("success", "Copied", "คัดลอก identity ไปยัง clipboard แล้ว");
    } catch {
      pushToast("warning", "Clipboard unavailable", "เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ");
    }
  };

  const resetForm = () => {
    setFullName(me?.fullName ?? "");
    setEmail(me?.email ?? "");
    setCompanyName(me?.companyName ?? "");
    setGithubUsername(me?.githubUsername ?? "");
    pushToast("warning", "Reset complete", "คืนค่าฟอร์มกลับไปเป็นข้อมูลล่าสุดจากระบบแล้ว");
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard value="4" label="Editable fields" note="Full name, email, company, GitHub handle" variant="blue" />
        <StatCard value="2FA" label="Security" note="OTP modal for enable / disable flow" variant="green" />
        <StatCard value={String(roles.length || 0)} label="Role badges" note={roleText(roles)} variant="purple" />
        <StatCard value={isLoading ? "..." : "Live"} label="Profile source" note="/auth/me and /users/me from repo API" variant="yellow" />
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
        <article className={glassClasses("p-6")}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full border border-white/20 bg-gradient-to-br from-blue-300/60 to-violet-300/40 text-2xl font-black text-white shadow-[0_0_24px_rgba(79,156,249,0.38)]">
              {initials(displayName)}
              <span className="absolute inset-2 rounded-full border border-white/20" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.04em] text-white">{displayName}</h2>
              <p className="mt-2 text-sm text-white/60">{displayEmail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="green">Active</Badge>
                <Badge variant="blue">{roles[0] ?? "User"}</Badge>
                {me?.githubUsername && <Badge variant="cyan">@{me.githubUsername}</Badge>}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Username", me?.username ?? authUser?.email ?? "-"],
              ["Department", me?.departmentId ? String(me.departmentId) : "-"],
              ["Company", companyName || "-"],
              ["Roles", roleText(roles)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
                <strong className="mt-2 block break-words text-sm leading-5 text-white/90">{value}</strong>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <SectionTitle
              title="Identity snapshot"
              description="Read-only fields that support auditability and support requests."
            />
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                <span>User ID</span>
                <strong className="text-white/90">{me?.id ?? "-"}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                <span>Timezone</span>
                <strong className="text-white/90">Asia/Bangkok (UTC+7)</strong>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                <span>Account source</span>
                <strong className="text-white/90">Authenticated session</strong>
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <article className={glassClasses("p-6")}>
            <SectionTitle
              title="Edit profile"
              description="Update personal details, company affiliation, and the GitHub username used in workflow context."
              action={<Badge variant="blue">Editable</Badge>}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Your full name" />
              <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
              <Field label="Company" value={companyName} onChange={setCompanyName} placeholder="Company name" />
              <Field label="GitHub username" value={githubUsername} onChange={setGithubUsername} placeholder="e.g. alice-dev" />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/40">
              ใช้ GitHub username สำหรับ filter commits บน MIT items ให้ตรงกับ developer ตาม logic เดิมใน repo
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className={cn(btnBase, btnPrimary)}>
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </button>
              <button type="button" onClick={resetForm} className={cn(btnBase, btnSecondary)}>
                Reset
              </button>
              <button type="button" onClick={copyIdentity} className={cn(btnBase, btnGhost)}>
                <Copy className="h-4 w-4" />
                Copy identity
              </button>
            </div>
          </article>

          <SecurityCard pushToast={pushToast} />
        </div>
      </section>
    </div>
  );
}

function SecurityCard({ pushToast }: { pushToast: (kind: ToastKind, title: string, message: string) => void }) {
  const queryClient = useQueryClient();
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["2fa-status"],
    queryFn: () => settingsApi.get2faStatus(),
  });

  const enabled: boolean = (statusData as any)?.data?.enabled ?? false;
  const [phase, setPhase] = useState<"idle" | "verify-enable" | "verify-disable">("idle");
  const [otpInput, setOtpInput] = useState("");

  const enableMutation = useMutation({
    mutationFn: () => settingsApi.enable2fa(),
    onSuccess: () => {
      setPhase("verify-enable");
      setOtpInput("");
    },
    onError: (error) => pushToast("error", "Enable failed", errorMessage(error)),
  });

  const verifyEnableMutation = useMutation({
    mutationFn: (code: string) => settingsApi.verifyEnable(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setPhase("idle");
      setOtpInput("");
      pushToast("success", "2FA enabled", "Your account is now more secure.");
    },
    onError: (error) => pushToast("error", "Verify failed", errorMessage(error)),
  });

  const disableMutation = useMutation({
    mutationFn: () => settingsApi.disable2fa(),
    onSuccess: () => {
      setPhase("verify-disable");
      setOtpInput("");
    },
    onError: (error) => pushToast("error", "Disable failed", errorMessage(error)),
  });

  const verifyDisableMutation = useMutation({
    mutationFn: (code: string) => settingsApi.verifyDisable(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setPhase("idle");
      setOtpInput("");
      pushToast("success", "2FA disabled", "Two-factor authentication has been turned off.");
    },
    onError: (error) => pushToast("error", "Verify failed", errorMessage(error)),
  });

  const isVerifying = verifyEnableMutation.isPending || verifyDisableMutation.isPending;
  const modalOpen = phase !== "idle";

  const openHandler = () => {
    if (!enabled) enableMutation.mutate();
    else disableMutation.mutate();
  };

  const confirmHandler = () => {
    if (phase === "verify-enable") verifyEnableMutation.mutate(otpInput);
    if (phase === "verify-disable") verifyDisableMutation.mutate(otpInput);
  };

  return (
    <article className={glassClasses("p-6")}>
      <OtpModal
        open={modalOpen}
        mode={phase === "verify-enable" ? "enable" : "disable"}
        otpInput={otpInput}
        setOtpInput={setOtpInput}
        verifying={isVerifying}
        onClose={() => {
          setPhase("idle");
          setOtpInput("");
        }}
        onConfirm={confirmHandler}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Two-Factor Authentication</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
            Protect profile access with OTP verification. The confirmation flow uses the existing email-based backend endpoints.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              enabled ? "bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.55)]" : "bg-white/30",
            )}
          />
          <Badge variant={enabled ? "green" : "muted"}>{enabled ? "Enabled" : "Disabled"}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Method", "Email OTP"],
          ["Backup codes", "Not surfaced here"],
          ["Status", enabled ? "Protected" : "Unprotected"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
            <strong className="mt-2 block text-sm text-white/90">{value}</strong>
          </div>
        ))}
      </div>

      {statusLoading ? (
        <p className="mt-4 text-sm text-white/40">Loading 2FA status…</p>
      ) : (
        <div className="mt-5 flex gap-3 rounded-2xl border border-blue-300/20 bg-blue-300/10 p-4 text-sm leading-6 text-white/60">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rose-300/25 bg-rose-300/10 text-rose-100">
            <Shield className="h-5 w-5" />
          </span>
          <p>Verification is required before changing 2FA status. Esc closes the dialog and the modal locks background scroll.</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={openHandler} className={cn(btnBase, btnSecondary)} disabled={enableMutation.isPending || disableMutation.isPending}>
          <KeyRound className="h-4 w-4" />
          {enabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
        <button
          type="button"
          onClick={() => pushToast("info", "Security summary", "Two-factor controls are wired to the existing backend flow.")}
          className={cn(btnBase, btnGhost)}
        >
          Show security note
        </button>
      </div>
    </article>
  );
}

function AccessGuard({ onBack }: { onBack: () => void }) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl backdrop-blur-2xl">
      <div className="max-w-xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-rose-300/25 bg-rose-300/10 text-rose-100">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-[-0.04em] text-white">Admin access required</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          This system configuration area is restricted to ADMIN and IT_MANAGER roles. Your current account can still manage
          profile settings.
        </p>
        <button type="button" onClick={onBack} className={cn(btnBase, btnSecondary, "mt-6")}>
          Back to User Settings
        </button>
      </div>
    </div>
  );
}

function GithubIntegrationCard({
  isAdmin,
  pushToast,
  requestSaveKey,
}: {
  isAdmin: boolean;
  pushToast: (kind: ToastKind, title: string, message: string) => void;
  requestSaveKey: number;
}) {
  const queryClient = useQueryClient();
  const { data: sysData } = useQuery({
    queryKey: ["system-github"],
    queryFn: () => githubApi.getSystemAccount(),
    enabled: isAdmin,
  });

  const sys = sysData?.data as SystemGithubAccount | undefined;
  const [label, setLabel] = useState("default");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (sys?.label) setLabel(sys.label);
  }, [sys?.label]);

  const saveSysMutation = useMutation({
    mutationFn: () => githubApi.updateSystemAccount({ label, ...(token ? { accessToken: token } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-github"] });
      setToken("");
      pushToast("success", "GitHub saved", "System GitHub account configuration was updated.");
    },
    onError: (error) => pushToast("error", "GitHub save failed", errorMessage(error)),
  });

  useEffect(() => {
    if (requestSaveKey > 0 && isAdmin) saveSysMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSaveKey]);

  return (
    <article className={glassClasses("p-6")}>
      <SectionTitle
        title="GitHub Integration"
        description="Connect the workflow platform to an organization GitHub account. The token is used as a fallback when a project has no repo token."
        action={<Badge variant={sys?.isConnected ? "green" : "yellow"}>{sys?.isConnected ? "Connected" : "Not connected"}</Badge>}
      />

      {!isAdmin && (
        <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100/80">
          Central GitHub account updates require ADMIN role. IT_MANAGER can still access the system surface for bot and operational
          settings.
        </div>
      )}

      {sys?.githubUsername && (
        <p className="mb-4 text-sm text-white/60">
          Connected as: <span className="font-mono font-semibold text-white">@{sys.githubUsername}</span>
        </p>
      )}

      <div className="grid gap-4">
        <Field label="Label" value={label} onChange={setLabel} placeholder="default" />
        <label className="grid gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">PAT / app token</span>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={sys?.isConnected ? "••••••••• (leave blank to keep)" : "ghp_xxxxxxxxxxxx"}
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/40 focus:border-blue-300/60 focus:bg-white/[0.13] focus:ring-4 focus:ring-blue-400/20"
            disabled={!isAdmin}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => saveSysMutation.mutate()}
          disabled={!isAdmin || saveSysMutation.isPending}
          className={cn(btnBase, btnPrimary)}
        >
          <Save className="h-4 w-4" />
          {saveSysMutation.isPending ? "Saving..." : "Save GitHub"}
        </button>
        <a href={githubApi.connectSystemUrl()} className={cn(btnBase, btnSecondary, !isAdmin && "pointer-events-none opacity-50")}>
          <Github className="h-4 w-4" />
          OAuth connect
        </a>
        <button
          type="button"
          onClick={() => pushToast("info", "Connection check", "GitHub connectivity check should be wired to backend test endpoint if needed.")}
          className={cn(btnBase, btnGhost)}
        >
          Test connection
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/40">
        <span>
          Branch prefix: <strong className="text-white/70">feat/</strong>
        </span>
        <span>
          Webhooks: <strong className="text-white/70">{sys?.isConnected ? "ready" : "pending"}</strong>
        </span>
      </div>
    </article>
  );
}

function SmtpCard({ pushToast }: { pushToast: (kind: ToastKind, title: string, message: string) => void }) {
  return (
    <article className={glassClasses("p-6")}>
      <SectionTitle
        title="Email / SMTP"
        description="Delivery configuration is read from environment variables and can be validated against the test mail flow."
        action={<Badge variant="cyan">Configured by env</Badge>}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["SMTP_HOST", "process.env"],
          ["SMTP_PORT", "587"],
          ["SMTP_USER", "workflow account"],
          ["Auth", "Secret manager"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</span>
            <strong className="mt-2 block text-sm text-white/90">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-sm leading-6 text-white/60">
        SMTP_HOST, SMTP_PORT, and SMTP_USER are intentionally read-only in this UI. Production secrets should stay in `.env` or a
        secret manager.
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => pushToast("success", "SMTP test queued", "A backend endpoint can be connected here for real delivery validation.")}
          className={cn(btnBase, btnSecondary)}
        >
          <Mail className="h-4 w-4" />
          Send test email
        </button>
        <button
          type="button"
          onClick={() => pushToast("warning", "Environment note", "SMTP config is read from environment variables in production.")}
          className={cn(btnBase, btnGhost)}
        >
          View config note
        </button>
      </div>
    </article>
  );
}

function BotAccountsCard({ pushToast }: { pushToast: (kind: ToastKind, title: string, message: string) => void }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { data: botsData, isLoading } = useQuery({
    queryKey: ["bot-accounts"],
    queryFn: () => settingsApi.listBotAccounts(),
  });

  const bots = (botsData?.data ?? []) as BotAccount[];

  const resetBotForm = () => {
    setShowForm(false);
    setEditId(null);
    setEmail("");
    setDisplayName("");
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editId
        ? settingsApi.updateBotAccount(editId, { email, displayName })
        : settingsApi.createBotAccount({ email, displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-accounts"] });
      resetBotForm();
      pushToast("success", "Bot saved", "อัปเดตบัญชี bot เรียบร้อยแล้ว");
    },
    onError: (error) => pushToast("error", "Bot save failed", errorMessage(error)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => settingsApi.setDefaultBotAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-accounts"] });
      pushToast("success", "Default bot updated", "ตั้งบัญชี bot เริ่มต้นเรียบร้อยแล้ว");
    },
    onError: (error) => pushToast("error", "Set default failed", errorMessage(error)),
  });

  const disableMutation = useMutation({
    mutationFn: (id: number) => settingsApi.disableBotAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-accounts"] });
      pushToast("warning", "Bot disabled", "ปิดใช้งานบัญชี bot แล้ว");
    },
    onError: (error) => pushToast("error", "Disable failed", errorMessage(error)),
  });

  const openNew = () => {
    setEditId(null);
    setEmail("");
    setDisplayName("");
    setShowForm(true);
  };

  const openEdit = (bot: BotAccount) => {
    setEditId(bot.id);
    setEmail(bot.email ?? "");
    setDisplayName(bot.displayName ?? "");
    setShowForm(true);
  };

  return (
    <article className={glassClasses("p-6")}>
      <SectionTitle
        title="Bot Accounts"
        description="Manage service identities used for meeting bots, notifications, and workflow triggers."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge variant="purple">Automation</Badge>
            <button type="button" onClick={openNew} className={cn(btnBase, btnPrimary, "min-h-9 rounded-xl px-3 text-xs")}>
              <Plus className="h-4 w-4" />
              Add account
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="mb-5 rounded-3xl border border-blue-300/20 bg-blue-300/10 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">{editId ? "Edit Bot Account" : "New Bot Account"}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bot email" value={email} onChange={setEmail} placeholder="bot@company.com" />
            <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Meeting Bot 1" />
            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={!email || saveMutation.isPending}
                  className={cn(btnBase, btnPrimary)}
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : "Save bot"}
                </button>
                <button type="button" onClick={resetBotForm} className={cn(btnBase, btnSecondary)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {isLoading && <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-sm text-white/50">Loading bot accounts...</p>}
        {!isLoading && bots.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 text-sm text-white/50">No bot accounts yet. Add one to get started.</p>
        )}
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:bg-white/[0.085] md:grid-cols-[52px_minmax(0,1fr)_auto]"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br from-blue-300/30 to-violet-300/25 font-black text-white">
              {initials(bot.displayName || bot.email, "B")}
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-sm text-white">{bot.displayName || bot.email || "Unnamed bot"}</strong>
              <span className="mt-1 block truncate text-xs leading-5 text-white/50">
                {bot.email ?? "-"} • {bot.currentStatus ?? "UNKNOWN"} • Managed by Google bot account API
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Badge variant={bot.currentStatus === "DISABLED" ? "red" : bot.isDefault ? "yellow" : "green"}>
                {bot.isDefault ? "Default" : bot.currentStatus ?? "Available"}
              </Badge>
              <button type="button" onClick={() => openEdit(bot)} className={cn(btnBase, btnSecondary, "min-h-9 rounded-xl px-3 text-xs")}>
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              {!bot.isDefault && (
                <button
                  type="button"
                  onClick={() => setDefaultMutation.mutate(bot.id)}
                  className={cn(btnBase, btnGhost, "min-h-9 rounded-xl px-3 text-xs")}
                >
                  Set default
                </button>
              )}
              {bot.currentStatus !== "DISABLED" && (
                <button
                  type="button"
                  onClick={() => disableMutation.mutate(bot.id)}
                  className={cn(btnBase, btnGhost, "min-h-9 rounded-xl px-3 text-xs text-rose-100")}
                >
                  Disable
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SettingsInner() {
  const { hasAnyRole } = useAuth();
  const searchParams = useSearchParams();

  const queryTab = searchParams.get("tab");
  const initialView: ActiveView = queryTab === "github" || queryTab === "bots" || queryTab === "system" ? "system" : "user";
  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [saveProfileKey, setSaveProfileKey] = useState(0);
  const [saveSystemKey, setSaveSystemKey] = useState(0);

  const isAdmin = hasAnyRole(["ADMIN"]);
  const canManageSystem = hasAnyRole(["ADMIN", "IT_MANAGER"]);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const pushToast = (kind: ToastKind, title: string, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [{ id, kind, title, message }, ...current].slice(0, 3));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const background = useMemo(
    () => (activeView === "system" ? "from-slate-950 via-blue-950 to-cyan-900" : "from-indigo-950 via-blue-950 to-purple-950"),
    [activeView],
  );

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-gradient-to-br p-4 text-white sm:p-6", background)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-9rem] top-[-9rem] h-96 w-96 rounded-full bg-violet-400/25 blur-3xl" />
        <div className="absolute bottom-[-11rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute left-[48%] top-[28%] h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.10),transparent_25%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.08),transparent_28%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-4">
        <ModeSwitch activeView={activeView} setActiveView={setActiveView} canManageSystem={canManageSystem} />

        <Hero
          activeView={activeView}
          canManageSystem={canManageSystem}
          isAdmin={isAdmin}
          onSaveProfile={() => setSaveProfileKey((key) => key + 1)}
          onOpen2fa={() => {
            if (activeView === "user") {
              pushToast("info", "2FA controls", "Use the security card to open OTP verification.");
            }
          }}
          onSaveSystem={() => {
            if (!canManageSystem) {
              pushToast("warning", "Access limited", "System Settings are restricted to ADMIN and IT_MANAGER roles.");
              return;
            }
            if (!isAdmin) {
              pushToast("info", "Admin only", "ADMIN is required for the central GitHub token update.");
              return;
            }
            setSaveSystemKey((key) => key + 1);
          }}
        />

        {searchParams.get("connected") && (
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            GitHub account connected successfully.
          </div>
        )}

        {activeView === "user" && <ProfileSection pushToast={pushToast} requestSaveKey={saveProfileKey} />}

        {activeView === "system" &&
          (canManageSystem ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard value="GitHub" label="Integration" note="System account, OAuth, and fallback token" variant="blue" />
                <StatCard value="SMTP" label="Email delivery" note="Read from environment / secret manager" variant="green" />
                <StatCard value="Bots" label="Google accounts" note="Meeting bot identities from API" variant="purple" />
                <StatCard value="24/7" label="Coverage" note="Operational config for workflow teams" variant="yellow" />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <GithubIntegrationCard isAdmin={isAdmin} pushToast={pushToast} requestSaveKey={saveSystemKey} />
                <SmtpCard pushToast={pushToast} />
              </div>

              <BotAccountsCard pushToast={pushToast} />
            </div>
          ) : (
            <AccessGuard onBack={() => setActiveView("user")} />
          ))}
      </div>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-white/40">
          Loading…
        </div>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}
