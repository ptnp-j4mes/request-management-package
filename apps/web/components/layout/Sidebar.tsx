"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../ui/cn";
import { GlassAvatar } from "../ui/GlassAvatar";
import {
  LayoutDashboard, FolderKanban, Inbox, ClipboardList,
  TestTube, Shield, BarChart3, Bot, Settings, Zap,
  LogOut, UserCog, ClipboardCheck, ChevronLeft, ChevronRight, Gem,
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
  { href: "/bot",         label: "Bot Sessions", icon: Bot,             group: "Analytics", roles: ["IT_MANAGER","ADMIN","BA","FULLSTACK"] },
  { href: "/settings",    label: "Settings",     icon: UserCog,         group: "System" },
  { href: "/admin",       label: "Admin",        icon: Settings,        group: "System", roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") return null;

  const visible = NAV.filter((item) => !item.roles || item.roles.some((r) => user?.roles.includes(r)));
  const groups = [...new Set(visible.map((i) => i.group))];

  return (
    <aside className={cn(
      "glass-sidebar flex flex-col transition-all duration-300 shrink-0 relative z-20",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center gap-3 border-b border-white/[.07] px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-blue-400/70 to-violet-400/60 shadow-glow-blue">
          <Gem className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-white/90">Request Platform</h1>
            <p className="text-[10px] text-white/35 mt-0.5">Workflow & Tracking</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {groups.map((group) => {
          const items = visible.filter((i) => i.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <p className="mx-2 mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-white/30">{group}</p>
              )}
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-xs px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-white/[.12] border border-white/[.18] text-white"
                          : "text-white/55 hover:bg-white/[.07] hover:text-white/85"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full bg-gradient-to-b from-[#4f9cf9] to-[#a78bfa]" />
                      )}
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[.07] p-3 space-y-2">
        {user && (
          <div className={cn("flex items-center gap-3 rounded-xs p-2", collapsed && "justify-center")}>
            <GlassAvatar name={user.name} size="sm" online />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white/85">{user.name}</p>
                <p className="truncate text-[11px] text-white/35">{user.roles?.[0] ?? "User"}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className={cn(
            "flex w-full items-center gap-3 rounded-xs px-3 py-2 text-sm text-white/45 hover:bg-red-400/10 hover:text-[#f87272] transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/50 hover:bg-white/20 hover:text-white transition-all backdrop-blur-[10px] shadow-glass"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
