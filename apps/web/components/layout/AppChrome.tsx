"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = pathname?.startsWith("/workspace");

  if (pathname === "/login") {
    return (
      <div className="app-bg">
        <div className="pointer-events-none fixed -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[100px]" />
        <div className="pointer-events-none fixed -bottom-40 -right-32 h-[450px] w-[450px] rounded-full bg-cyan-400/15 blur-[100px]" />
        {children}
      </div>
    );
  }

  if (isFullscreen) {
    return <div className="h-screen overflow-hidden bg-slate-950">{children}</div>;
  }

  return (
    <div className="app-bg">
      {/* Background blobs */}
      <div className="pointer-events-none fixed -left-40 -top-36 h-[420px] w-[420px] rounded-full bg-violet-500/25 blur-[100px] animate-drift" />
      <div className="pointer-events-none fixed -bottom-40 -right-32 h-[380px] w-[380px] rounded-full bg-cyan-400/[.18] blur-[100px] animate-drift [animation-delay:-20s]" />
      <div className="pointer-events-none fixed left-[44%] top-[42%] h-[300px] w-[300px] rounded-full bg-blue-500/[.12] blur-[100px] animate-drift [animation-delay:-40s]" />

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <Sidebar />
        <main className="relative z-10 min-h-0 flex-1 overflow-auto">
          <div className="min-h-full p-5 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
