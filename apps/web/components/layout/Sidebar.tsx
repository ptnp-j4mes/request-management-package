"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../ui/cn";
import {
  LayoutDashboard, FolderKanban, Inbox, ClipboardList,
  TestTube, Shield, BarChart3, Bot, Settings, Zap
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/mit", label: "MIT Board", icon: ClipboardList },
  { href: "/uat", label: "UAT", icon: TestTube },
  { href: "/ma", label: "MA Coverage", icon: Shield },
  { href: "/workload", label: "Workload", icon: Zap },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/bot", label: "Bot Sessions", icon: Bot },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-base font-semibold text-white">Request Platform</h1>
        <p className="text-xs text-slate-400 mt-0.5">Workflow & Tracking</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
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
      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">v0.1.0</p>
      </div>
    </aside>
  );
}
