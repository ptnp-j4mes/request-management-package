"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../ui/cn";
import { GlassAvatar } from "../ui/GlassAvatar";
import { GlassTooltip } from "../ui/GlassTooltip";
import {
  LayoutDashboard, FolderKanban, Inbox, ClipboardList,
  TestTube, Shield, BarChart3, Bot, Settings, Zap,
  LogOut, UserCog, ClipboardCheck, ChevronLeft, ChevronRight, Gem, GitBranch,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
  group: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard",   label: "Dashboard",    icon: LayoutDashboard, group: "Workspace" },
  { href: "/my-requests", label: "My Requests",  icon: ClipboardCheck,  group: "Workspace", roles: ["REQUESTER"] },
  { href: "/projects",    label: "Projects",     icon: FolderKanban,    group: "Work", roles: ["ADMIN","IT_MANAGER","BA","APPROVER","DEVELOPER","QA","FULLSTACK"] },
  { href: "/requests",    label: "All Requests", icon: Inbox,           group: "Work", roles: ["ADMIN","IT_MANAGER","BA","APPROVER","DEVELOPER","QA","FULLSTACK"] },
  { href: "/mit",         label: "MIT Board",    icon: ClipboardList,   group: "Work", roles: ["ADMIN","IT_MANAGER","BA","DEVELOPER","QA","FULLSTACK"] },
  { href: "/uat",         label: "UAT",          icon: TestTube,        group: "Work" },
  { href: "/ma",          label: "MA Coverage",  icon: Shield,          group: "Work", roles: ["ADMIN","IT_MANAGER","BA","FULLSTACK","APPROVER"] },
  { href: "/workload",    label: "Workload",     icon: Zap,             group: "Analytics", roles: ["BA","FULLSTACK","IT_MANAGER","ADMIN"] },
  { href: "/performance", label: "Performance",  icon: BarChart3,       group: "Analytics", roles: ["IT_MANAGER","ADMIN"] },
  { href: "/reports/git/by-project", label: "Git Report", icon: GitBranch, group: "Analytics", roles: ["ADMIN","IT_MANAGER","BA","FULLSTACK"] },
  { href: "/bot",         label: "Bot Sessions", icon: Bot,             group: "Analytics", roles: ["IT_MANAGER","ADMIN","BA","FULLSTACK"] },
  { href: "/settings",    label: "Settings",     icon: UserCog,         group: "System" },
  { href: "/admin",       label: "Admin",        icon: Settings,        group: "System", roles: ["ADMIN"] },
];

const GROUP_ORDER = ["Workspace", "Work", "Analytics", "System"];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") return null;

  const visible = NAV.filter((item) => !item.roles || item.roles.some((r) => user?.roles.includes(r)));
  const groups = GROUP_ORDER.filter((group) => visible.some((item) => item.group === group));

  return (
    <aside className={cn(
      "glass-sidebar relative z-30 flex w-full shrink-0 flex-col transition-all duration-300",
      "lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden",
      collapsed ? "lg:w-[80px]" : "lg:w-[var(--sidebar-w)]"
    )}>
      <div className={cn(
        "border-b border-white/[.08] bg-white/[.02] px-4 py-4",
        "lg:px-4 lg:py-5",
        collapsed && "lg:px-2"
      )}>
        <div className={cn("flex items-center gap-3", collapsed && "lg:justify-center lg:gap-0")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/20 bg-gradient-to-br from-blue-400/70 to-violet-400/60 shadow-glow-blue">
          <Gem className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-white/92">Request Platform</h1>
              <p className="mt-0.5 truncate text-[11px] leading-relaxed text-white/48">Workflow &amp; Tracking</p>
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 min-h-0 overflow-y-auto px-3 py-4 lg:px-2">
        {groups.map((group) => {
          const items = visible.filter((i) => i.group === group);
          return (
            <section
              key={group}
              className={cn("pb-4 last:pb-0", group !== groups[0] && "pt-4 border-t border-white/[.06]")}
            >
              {!collapsed && (
                <p className="mx-2 mb-2 text-[10px] font-black uppercase tracking-[.16em] text-white/38">
                  {group}
                </p>
              )}
              <div className="space-y-1">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                  const navItem = (
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "group relative grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[16px] border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                        collapsed && "lg:grid-cols-1 lg:justify-items-center lg:px-0 lg:py-[0.6875rem] lg:border-transparent lg:bg-transparent lg:shadow-none",
                        collapsed
                          ? active
                            ? "text-white"
                            : "text-white/58 hover:bg-transparent hover:text-white/88"
                          : active
                            ? "border-[#4f9cf9]/18 bg-[#4f9cf9]/[.07] text-white shadow-[0_10px_30px_rgba(0,0,0,.18),inset_0_1px_0_rgba(79,156,249,.08)]"
                            : "border-transparent text-white/58 hover:border-[#4f9cf9]/12 hover:bg-[#4f9cf9]/[.04] hover:text-white/88"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-[14px] border text-[0] transition-all duration-200",
                          collapsed
                            ? active
                              ? "border-transparent bg-[#4f9cf9]/[.18] text-[#9ec7ff] shadow-[0_0_0_1px_rgba(79,156,249,.10),0_0_18px_rgba(79,156,249,.12)]"
                              : "border-transparent bg-white/[.035] text-white/68 group-hover:bg-[#4f9cf9]/[.10] group-hover:text-[#9ec7ff]"
                            : active
                              ? "border-[#4f9cf9]/28 bg-[#4f9cf9]/[.14] text-[#9ec7ff] shadow-[0_0_0_1px_rgba(79,156,249,.08)]"
                              : "border-white/[.08] bg-white/[.04] text-white/68 group-hover:border-[#4f9cf9]/18 group-hover:bg-[#4f9cf9]/[.07] group-hover:text-[#9ec7ff]"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                      </span>
                      <span className={cn("min-w-0 truncate", collapsed && "lg:hidden")}>{label}</span>
                      {active && !collapsed && (
                        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gradient-to-b from-[#4f9cf9] to-[#7c3aed]" />
                      )}
                    </Link>
                  );

                  return (
                    <div key={href}>
                      {collapsed ? (
                        <GlassTooltip content={label} side="right">
                          {navItem}
                        </GlassTooltip>
                      ) : (
                        navItem
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="border-t border-white/[.08] bg-white/[.015] p-3">
        {user && (
          <div className={cn(
            "flex items-center gap-3 rounded-[16px] border border-white/[.08] bg-white/[.04] p-2.5",
            collapsed && "lg:justify-center lg:px-2"
          )}>
            <GlassAvatar name={user.name} size="sm" online />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white/88">{user.name}</p>
                <p className="truncate text-[11px] text-white/40">{user.roles?.[0] ?? "User"}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className={cn(
            "mt-2 flex w-full items-center gap-3 rounded-[16px] border border-transparent px-3 py-2.5 text-sm text-white/48 transition-all hover:border-red-400/15 hover:bg-red-400/10 hover:text-[#f87272]",
            collapsed && "lg:justify-center lg:px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/60 shadow-glass backdrop-blur-[10px] transition-all hover:bg-white/20 hover:text-white lg:flex"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
