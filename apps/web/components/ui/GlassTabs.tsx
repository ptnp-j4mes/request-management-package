"use client";
import type { ReactNode } from "react";
import { cn } from "./cn";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface GlassTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function GlassTabs({ tabs, active, onChange, className }: GlassTabsProps) {
  return (
    <div className={cn("flex w-fit gap-1.5 rounded-[22px] bg-white/[.05] p-1.5", className)}>
      {tabs.map((tab, index) => {
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold transition-all duration-200",
              isFirst && "rounded-l-[18px]",
              isLast && "rounded-r-[18px]",
              !isFirst && !isLast && "rounded-[12px]",
              active === tab.id
                ? "bg-[#4f9cf9] text-white shadow-[0_10px_24px_rgba(79,156,249,.26)]"
                : "text-white/55 hover:bg-white/[.08] hover:text-white/85"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active === tab.id ? "bg-white/25 text-white" : "bg-white/10 text-white/50"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
