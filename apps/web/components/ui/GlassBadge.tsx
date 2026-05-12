import { cn } from "./cn";

type Color = "blue" | "purple" | "green" | "red" | "orange" | "yellow" | "slate" | "cyan";

const colorMap: Record<Color, { bg: string; text: string; dot: string }> = {
  blue:   { bg: "bg-blue-400/15",   text: "text-[#4f9cf9]",  dot: "bg-[#4f9cf9]" },
  purple: { bg: "bg-violet-400/15", text: "text-[#a78bfa]",  dot: "bg-[#a78bfa]" },
  green:  { bg: "bg-emerald-400/15",text: "text-[#36d399]",  dot: "bg-[#36d399]" },
  red:    { bg: "bg-red-400/15",    text: "text-[#f87272]",  dot: "bg-[#f87272]" },
  orange: { bg: "bg-orange-400/15", text: "text-[#fb923c]",  dot: "bg-[#fb923c]" },
  yellow: { bg: "bg-yellow-400/15", text: "text-[#fbbd23]",  dot: "bg-[#fbbd23]" },
  slate:  { bg: "bg-white/10",      text: "text-white/60",   dot: "bg-white/50" },
  cyan:   { bg: "bg-cyan-400/15",   text: "text-[#34d3ff]",  dot: "bg-[#34d3ff]" },
};

interface GlassBadgeProps {
  color: Color;
  label: string;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function GlassBadge({ color, label, dot, pulse, className }: GlassBadgeProps) {
  const c = colorMap[color];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/10 backdrop-blur-[10px]",
      c.bg, c.text, className
    )}>
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", c.dot, pulse && "animate-dot-pulse")} />
      )}
      {label}
    </span>
  );
}

export function statusColor(status: string): Color {
  const map: Record<string, Color> = {
    draft: "slate", submitted: "blue", manager_approved: "blue",
    ba_review: "purple", waiting_estimate: "purple",
    assigned_to_dev: "cyan", in_development: "cyan",
    ready_for_qa: "yellow", in_qa: "yellow",
    uat: "orange", completed: "green", closed: "slate",
    rejected: "red", cancelled: "red",
    new: "slate", in_progress: "blue", deployed: "green",
    active: "green", inactive: "slate", renewal: "yellow", review: "orange",
    pass: "green", fail: "red", pending: "yellow",
    scheduled: "blue", joining: "cyan", recording: "orange",
    left: "slate", error: "red",
    open: "blue", resolved: "green",
    critical: "red", high: "orange", medium: "yellow", low: "slate",
    available: "green", in_meeting: "orange", offline: "slate",
  };
  return map[status?.toLowerCase()] ?? "slate";
}

export function priorityColor(p: string): Color {
  const map: Record<string, Color> = { critical: "red", high: "orange", medium: "yellow", low: "slate", normal: "slate" };
  return map[p?.toLowerCase()] ?? "slate";
}
