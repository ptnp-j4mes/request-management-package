import type { ReactNode } from "react";
import { cn } from "./cn";

type Color = "blue" | "purple" | "orange" | "green" | "slate" | "yellow";

const dotColor: Record<Color, string> = {
  blue:   "bg-[#4f9cf9]",
  purple: "bg-[#a78bfa]",
  orange: "bg-[#fb923c]",
  green:  "bg-[#36d399]",
  slate:  "bg-white/40",
  yellow: "bg-[#fbbd23]",
};

interface GlassKanbanColumnProps {
  title: string;
  count: number;
  color?: Color;
  children?: ReactNode;
  className?: string;
}

export function GlassKanbanColumn({ title, count, color = "slate", children, className }: GlassKanbanColumnProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-xl bg-white/[.04] border border-white/[.08] p-4 min-w-[280px] max-w-[320px] flex-shrink-0",
      className
    )}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dotColor[color])} />
          <h3 className="text-[13px] font-semibold text-white/75 uppercase tracking-[.08em]">{title}</h3>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/50">{count}</span>
      </div>
      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-260px)]">
        {children}
      </div>
    </div>
  );
}

/* ── Kanban Card ── */
interface GlassKanbanCardProps {
  id: string;
  title: string;
  meta?: string;
  badge?: ReactNode;
  avatar?: string;
  onClick?: () => void;
  onAction?: () => void;
  className?: string;
}

export function GlassKanbanCard({ id, title, meta, badge, avatar, onClick, onAction, className }: GlassKanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-base rounded-sm p-4 cursor-pointer transition-all duration-200 hover:bg-white/[.10] hover:border-white/[.22] hover:scale-[1.01]",
        className
      )}
    >
      <p className="font-mono text-[10px] text-white/35 mb-1">{id}</p>
      <h4 className="text-[13px] font-semibold text-white/85 leading-snug line-clamp-2">{title}</h4>
      {meta && <p className="text-[11px] text-white/40 mt-1.5">{meta}</p>}
      {(badge || avatar) && (
        <div className="flex items-center justify-between mt-3">
          {badge ?? <span />}
          {avatar && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 border border-white/15 text-[9px] font-bold text-white/70">
              {avatar.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
