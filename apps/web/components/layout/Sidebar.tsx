"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../ui/cn";
import {
  LayoutDashboard, FolderKanban, Inbox, ClipboardList,
  TestTube, Shield, BarChart3, Bot, Settings, Zap, LogOut
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[]; // undefined = visible to all authenticated users
};

const navItems: NavItem[] = [
  { href: "/",            label: "Dashboard",    icon: LayoutDashboard },
  { href: "/projects",    label: "Projects",     icon: FolderKanban },
  { href: "/requests",    label: "Requests",     icon: Inbox },
  { href: "/mit",         label: "MIT Board",    icon: ClipboardList },
  { href: "/uat",         label: "UAT",          icon: TestTube },
  { href: "/ma",          label: "MA Coverage",  icon: Shield },
  { href: "/workload",    label: "Workload",     icon: Zap,      roles: ["BA", "FULLSTACK", "IT_MANAGER", "ADMIN"] },
  { href: "/performance", label: "Performance",  icon: BarChart3, roles: ["IT_MANAGER", "ADMIN"] },
  { href: "/bot",         label: "Bot Sessions", icon: Bot,      roles: ["IT_MANAGER", "ADMIN", "BA", "FULLSTACK"] },
  { href: "/admin",       label: "Admin",        icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  if (pathname === "/login") return null;

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-base font-semibold text-white">Request Platform</h1>
        <p className="text-xs text-slate-400 mt-0.5">Workflow & Tracking</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems
          .filter((item) => !item.roles || item.roles.some((r) => user?.roles.includes(r)))
          .map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
      </nav>
      <div className="px-4 py-4 border-t border-slate-700 space-y-3">
        {isAuthenticated && user && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {user.roles.map((r) => (
                <span key={r} className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full text-left text-xs text-slate-400 hover:text-slate-100 py-1 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
        <p className="text-xs text-slate-500">v0.1.0</p>
      </div>
    </aside>
  );
}
