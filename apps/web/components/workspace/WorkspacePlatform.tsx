"use client";

import * as React from "react";
import { Copy, ExternalLink, Gem, RefreshCw, Search } from "lucide-react";
import { cn } from "../ui/cn";

type ModuleKey = "workflow" | "request" | "settings" | "dialogs" | "mock";

type MenuItem = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  module: ModuleKey;
  route: string;
  livePath?: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const modules: Record<ModuleKey, { title: string; src?: string; desc: string }> = {
  workflow: {
    title: "Workflow Dashboard",
    src: "workflow-dashboard.html",
    desc: "Dashboard, request list, MIT board, UAT cycle และ project detail จากไฟล์ตัวอย่าง",
  },
  request: {
    title: "Request Management",
    src: "request-management.html",
    desc: "Request management glassmorphism prototype พร้อม dashboard, board และ UAT screens",
  },
  settings: {
    title: "Settings",
    src: "settings.html",
    desc: "User/System settings, role preview และ 2FA glass dialog",
  },
  dialogs: {
    title: "Dialog System",
    src: "dialog-system.html",
    desc: "Dialog, modal, drawer, toast และ component API",
  },
  mock: {
    title: "Mock Workspace",
    desc: "หน้าจอ mock สำหรับส่วนที่ยังไม่มีต้นแบบตรงใน zip แต่มีอยู่ใน repo จริง",
  },
};

const menuGroups: MenuGroup[] = [
  {
    label: "Workspace shell / zip examples",
    items: [
      { id: "workflow-dashboard", icon: "▦", title: "Dashboard", desc: "ภาพรวม KPI และ workload", module: "workflow", route: "#screen=dashboard", livePath: "/dashboard" },
      { id: "workflow-all", icon: "☷", title: "All Requests", desc: "รายการ request ทั้งหมด", module: "workflow", route: "#screen=all-requests", livePath: "/requests" },
      { id: "workflow-mit", icon: "▤", title: "MIT Board", desc: "บอร์ดงาน MIT", module: "workflow", route: "#screen=mit-board", livePath: "/mit" },
      { id: "workflow-uat", icon: "☑", title: "UAT Cycle", desc: "ผลทดสอบและ defects", module: "workflow", route: "#screen=uat-cycle", livePath: "/uat" },
      { id: "workflow-projects", icon: "▣", title: "Projects", desc: "รายละเอียด project", module: "workflow", route: "#screen=project-detail", livePath: "/projects" },
    ],
  },
  {
    label: "Request management prototype",
    items: [
      { id: "request-dashboard", icon: "▦", title: "Request Dashboard", desc: "Dashboard จาก request-management.html", module: "request", route: "#screen=dashboard", livePath: "/requests" },
      { id: "request-all", icon: "☷", title: "Request Table", desc: "ตาราง request ทั้งหมด", module: "request", route: "#screen=all-requests", livePath: "/requests" },
      { id: "request-mit", icon: "▤", title: "Development Board", desc: "สถานะงาน development", module: "request", route: "#screen=mit-board", livePath: "/mit" },
      { id: "request-uat", icon: "☑", title: "UAT + Defect", desc: "UAT flow พร้อม defect modal", module: "request", route: "#screen=uat-cycle", livePath: "/uat" },
    ],
  },
  {
    label: "Settings and dialogs",
    items: [
      { id: "settings-user", icon: "👤", title: "User Settings", desc: "Profile, identity, security", module: "settings", route: "#view=user&role=ADMIN", livePath: "/settings" },
      { id: "settings-system", icon: "⚙", title: "System Settings", desc: "GitHub, SMTP, Bot accounts", module: "settings", route: "#view=system&role=ADMIN", livePath: "/settings" },
      { id: "dialog-overview", icon: "◇", title: "Dialog Overview", desc: "ภาพรวม dialog system", module: "dialogs", route: "#target=overview" },
      { id: "dialog-create", icon: "+", title: "Create Request Dialog", desc: "Create request modal", module: "dialogs", route: "#target=dialogs&open=create-request", livePath: "/requests/new" },
      { id: "dialog-defect", icon: "🐛", title: "Report Defect", desc: "Report defect modal", module: "dialogs", route: "#target=dialogs&open=report-defect", livePath: "/uat" },
    ],
  },
  {
    label: "Mocked until zip design exists",
    items: [
      { id: "mock-ma", icon: "MA", title: "MA Coverage", desc: "mock view สำหรับ route /ma", module: "mock", route: "#mock=ma", livePath: "/ma" },
      { id: "mock-workload", icon: "◌", title: "Workload", desc: "mock report สำหรับ route /workload", module: "mock", route: "#mock=workload", livePath: "/workload" },
      { id: "mock-performance", icon: "↗", title: "Performance", desc: "mock dashboard สำหรับ route /performance", module: "mock", route: "#mock=performance", livePath: "/performance" },
      { id: "mock-bot", icon: "BOT", title: "Bot Sessions", desc: "mock intake/session monitor", module: "mock", route: "#mock=bot", livePath: "/bot" },
      { id: "mock-admin", icon: "A", title: "Admin", desc: "mock admin control panel", module: "mock", route: "#mock=admin", livePath: "/admin" },
    ],
  },
];

const defaultItem = menuGroups[0]?.items[0] ?? {
  id: "workflow-dashboard",
  icon: "▦",
  title: "Dashboard",
  desc: "Workspace dashboard",
  module: "workflow" as ModuleKey,
  route: "#screen=dashboard",
};
const allItems = menuGroups.flatMap((group) => group.items);

function getMenuIdFromHash() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("menu");
}

function findItemById(id: string | null) {
  return allItems.find((item) => item.id === id) ?? null;
}

function getModuleSrc(item: MenuItem) {
  const mod = modules[item.module];
  if (!mod.src) return "";
  return `/modules/${mod.src}?embedded=1${item.route}`;
}

function getMockRows(item: MenuItem) {
  const map: Record<string, Array<Record<string, string>>> = {
    "mock-ma": [
      { id: "MA-2026-001", owner: "Vendor PM", status: "Active", metric: "95% SLA", note: "Coverage window synced from MA route" },
      { id: "MA-2026-002", owner: "Fullstack Team", status: "Renewal", metric: "14 days", note: "Contract renewal reminder" },
      { id: "MA-2026-003", owner: "IT Manager", status: "Review", metric: "3 risks", note: "Needs support matrix approval" },
    ],
    "mock-workload": [
      { id: "WL-QA", owner: "QA Squad", status: "Waiting Test", metric: "12 items", note: "Mirrors workload queues" },
      { id: "WL-UAT", owner: "Business Users", status: "Waiting UAT", metric: "7 items", note: "Needs requester approval" },
      { id: "WL-DEV", owner: "MIT Team", status: "On Hand", metric: "22 items", note: "Active implementation work" },
    ],
    "mock-performance": [
      { id: "PERF-05", owner: "May 2026", status: "Healthy", metric: "83% done", note: "Monthly delivery snapshot" },
      { id: "PERF-SLA", owner: "Support", status: "Watch", metric: "4 overdue", note: "Escalate if aging > 5 days" },
      { id: "PERF-QA", owner: "QA", status: "Improving", metric: "+18%", note: "Cycle time trend" },
    ],
    "mock-bot": [
      { id: "BOT-LINE", owner: "Line intake", status: "Online", metric: "18 sessions", note: "Mock bot session queue" },
      { id: "BOT-EMAIL", owner: "Email parser", status: "Draft", metric: "6 parsed", note: "Incoming request classifier" },
      { id: "BOT-AI", owner: "Assistant", status: "Review", metric: "4 handoffs", note: "Needs human approval" },
    ],
    "mock-admin": [
      { id: "ADM-RBAC", owner: "Admin", status: "Configured", metric: "8 roles", note: "Role and access mock" },
      { id: "ADM-WF", owner: "IT Manager", status: "Draft", metric: "4 steps", note: "DEV → QA → UAT → MA" },
      { id: "ADM-AUDIT", owner: "Security", status: "Active", metric: "24h", note: "Audit trail retention preview" },
    ],
  };

  return map[item.id] ?? map["mock-workload"];
}

function MockWorkspacePanel({ item }: { item: MenuItem }) {
  const rows = getMockRows(item);

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,.95),rgba(30,41,59,.92))] p-6 text-white">
      <div className="mx-auto grid max-w-6xl gap-5">
        <div className="rounded-[28px] border border-white/15 bg-white/[.08] p-6 shadow-[0_28px_90px_rgba(0,0,0,.32)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-cyan-100/60">Mocked module</p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                ส่วนนี้ยังไม่มีหน้าต้นแบบตรงจาก zip จึงทำเป็น mock glass panel ไว้ก่อน โดยยังผูกปุ่มไปยัง route จริงของ repo สำหรับ merge ต่อกับ API ภายหลัง
              </p>
            </div>
            <span className="rounded-full border border-amber-200/30 bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-100">
              Mock fallback
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-[24px] border border-white/15 bg-white/[.075] p-5 shadow-[0_18px_44px_rgba(0,0,0,.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-white/45">{row.id}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/70">{row.status}</span>
              </div>
              <h4 className="mt-4 text-lg font-semibold">{row.owner}</h4>
              <p className="mt-1 text-3xl font-bold tracking-tight text-cyan-100">{row.metric}</p>
              <p className="mt-3 text-sm leading-6 text-white/55">{row.note}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/15 bg-white/[.07] shadow-[0_18px_44px_rgba(0,0,0,.22)] backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[.08] text-xs uppercase tracking-[.16em] text-white/45">
              <tr>
                <th className="px-5 py-4">Key</th>
                <th className="px-5 py-4">Owner</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Metric</th>
                <th className="px-5 py-4">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[.05]">
                  <td className="px-5 py-4 font-mono text-xs text-cyan-100/80">{row.id}</td>
                  <td className="px-5 py-4 text-white/85">{row.owner}</td>
                  <td className="px-5 py-4 text-white/65">{row.status}</td>
                  <td className="px-5 py-4 font-semibold text-white">{row.metric}</td>
                  <td className="px-5 py-4 text-white/55">Replace mock with live API adapter</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePlatform() {
  const [search, setSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState(defaultItem.id);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [routeCopied, setRouteCopied] = React.useState(false);

  const activeItem = React.useMemo(() => findItemById(activeId) ?? defaultItem, [activeId]);
  const activeModule = modules[activeItem.module];
  const iframeSrc = getModuleSrc(activeItem);
  const isMock = activeItem.module === "mock";

  const filteredGroups = React.useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!normalized) return true;
          return `${group.label} ${item.title} ${item.desc} ${modules[item.module].title}`.toLowerCase().includes(normalized);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [search]);

  React.useEffect(() => {
    const applyHash = () => {
      const item = findItemById(getMenuIdFromHash());
      if (item) setActiveId(item.id);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  React.useEffect(() => {
    setIsLoading(true);
    setRouteCopied(false);
  }, [activeId, reloadKey]);

  function activate(item: MenuItem) {
    setActiveId(item.id);
    window.history.replaceState(null, "", `#menu=${encodeURIComponent(item.id)}`);
  }

  function reloadModule() {
    setReloadKey((key) => key + 1);
  }

  function openModule() {
    const target = activeItem.livePath ?? iframeSrc;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  async function copyRoute() {
    const route = `${window.location.href.split("#")[0]}#menu=${encodeURIComponent(activeItem.id)}`;

    try {
      await navigator.clipboard.writeText(route);
      setRouteCopied(true);
    } catch {
      setRouteCopied(false);
      window.prompt("Copy route", route);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_13%_18%,rgba(167,139,250,.36),transparent_28%),radial-gradient(circle_at_78%_14%,rgba(34,211,238,.22),transparent_26%),radial-gradient(circle_at_56%_83%,rgba(79,156,249,.24),transparent_28%),linear-gradient(135deg,#07111f_0%,#111827_34%,#1e1b4b_64%,#0e7490_115%)] text-white">
      <div className="pointer-events-none fixed -left-40 -top-36 h-[30rem] w-[30rem] rounded-full bg-violet-400/30 blur-[85px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-cyan-300/25 blur-[85px]" />
      <div className="pointer-events-none fixed left-[44%] top-[42%] h-96 w-96 rounded-full bg-blue-400/15 blur-[85px]" />

      <div className="relative grid min-h-screen lg:grid-cols-[352px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="border-b border-white/10 bg-white/[.08] p-5 shadow-[inset_-1px_0_0_rgba(255,255,255,.08)] backdrop-blur-3xl lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-[46vh] flex-col gap-4 overflow-auto pr-1 lg:h-[calc(100vh-2.5rem)]">
            <div className="grid grid-cols-[52px_1fr] items-center gap-3.5 rounded-3xl border border-white/20 bg-gradient-to-br from-white/15 to-white/[.06] p-4 shadow-[0_28px_90px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.12)]">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-[18px] border border-white/30 bg-gradient-to-br from-blue-400/60 to-violet-400/55 text-2xl shadow-[0_0_34px_rgba(79,156,249,.32)]">
                <Gem className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold tracking-tight">Request Platform</h1>
                <p className="mt-1 text-xs leading-relaxed text-white/60">Unified Glassmorphism Workspace</p>
              </div>
            </div>

            <div className="sticky top-0 z-10 bg-transparent pt-0.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search menu: UAT, Settings, Dialog..."
                  className="h-12 w-full rounded-[18px] border border-white/20 bg-white/[.09] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-blue-300/40"
                />
              </div>
            </div>

            <nav aria-label="Unified platform menu" className="pb-4">
              {filteredGroups.map((group) => (
                <section key={group.label} className="mt-5 first:mt-0">
                  <h2 className="mx-2.5 mb-2.5 text-[10px] font-black uppercase leading-relaxed tracking-[.12em] text-white/40">
                    {group.label}
                  </h2>
                  <div className="grid gap-2.5">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => activate(item)}
                        className={cn(
                          "grid w-full grid-cols-[38px_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-transparent p-3 text-left text-white/65 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[.08] hover:text-white/90",
                          activeItem.id === item.id &&
                            "border-white/30 bg-gradient-to-br from-blue-400/25 to-violet-400/20 text-white shadow-[0_16px_38px_rgba(0,0,0,.26),inset_0_1px_0_rgba(255,255,255,.15)]",
                        )}
                      >
                        <span className="grid h-[38px] w-[38px] place-items-center rounded-[14px] border border-white/15 bg-white/[.08] text-xs font-extrabold text-white">
                          {item.icon}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-[13px]">{item.title}</strong>
                          <small className="mt-0.5 block truncate text-[11px] leading-snug text-white/40">{item.desc}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </nav>

            {filteredGroups.length === 0 && (
              <p className="mx-2.5 mt-5 text-sm leading-relaxed text-white/40">No matching menu found.</p>
            )}

            <div className="rounded-[20px] border border-white/15 bg-white/[.07] p-4 text-xs leading-relaxed text-white/60">
              Static HTML จาก zip ถูกนำมาเปิดใน iframe ภายใต้ shell ของ Next.js ส่วนที่ zip ยังไม่มีแบบตรงจะเห็นเป็น mock panel เพื่อให้ merge แล้วต่อ API ได้ทันที
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col lg:h-screen lg:overflow-hidden">
          <header className="shrink-0 grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:px-6">
            <div className="min-w-0">
              <p className="mb-1.5 text-xs text-white/40">Platform / {activeModule.title} / {activeItem.title}</p>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{activeItem.title}</h2>
                <span className="rounded-full border border-white/15 bg-white/[.08] px-3 py-1 text-xs text-white/65">
                  {activeModule.title}
                </span>
                <span className="rounded-full border border-white/15 bg-white/[.08] px-3 py-1 text-xs text-white/65">
                  {isMock ? "Mock" : "Zip module"}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{activeModule.desc}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={reloadModule}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Reload
              </button>
              <button
                type="button"
                onClick={copyRoute}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15"
              >
                <Copy className="h-4 w-4" />
                {routeCopied ? "Copied" : "Copy route"}
              </button>
              <button
                type="button"
                onClick={openModule}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/30 bg-gradient-to-br from-blue-400/45 to-violet-400/35 px-4 text-sm font-medium text-white transition hover:from-blue-400/55 hover:to-violet-400/45"
              >
                <ExternalLink className="h-4 w-4" />
                {activeItem.livePath ? "Open live route" : "Open module"}
              </button>
            </div>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 lg:px-6 lg:pb-6">
            <div className="relative min-h-full min-h-[640px] overflow-hidden rounded-[28px] border border-white/20 bg-white/[.08] shadow-[0_28px_90px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-3xl lg:min-h-0">
              {isMock ? (
                <MockWorkspacePanel item={activeItem} />
              ) : (
                <iframe
                  key={`${activeItem.id}-${reloadKey}`}
                  src={iframeSrc}
                  title={`${activeItem.title} module`}
                  onLoad={() => window.setTimeout(() => setIsLoading(false), 220)}
                  className="h-full w-full border-0 bg-transparent"
                />
              )}

              {!isMock && (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(79,156,249,.16),rgba(15,23,42,.52))] opacity-0 transition-opacity",
                    isLoading && "opacity-100",
                  )}
                >
                  <div className="rounded-[22px] border border-white/20 bg-white/10 px-6 py-5 text-sm text-white/65 shadow-[0_28px_90px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-2xl">
                    Loading workspace...
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
