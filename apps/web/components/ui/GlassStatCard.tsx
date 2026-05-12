import type { ReactNode } from "react";
import { cn } from "./cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Color = "blue" | "purple" | "green" | "red" | "orange" | "yellow" | "cyan" | "slate";

const colorMap: Record<Color, { value: string; glow: string; bg: string }> = {
  blue:   { value: "text-[#4f9cf9]", glow: "shadow-glow-blue",   bg: "bg-blue-400/10" },
  purple: { value: "text-[#a78bfa]", glow: "shadow-glow-blue",   bg: "bg-violet-400/10" },
  green:  { value: "text-[#36d399]", glow: "shadow-glow-green",  bg: "bg-emerald-400/10" },
  red:    { value: "text-[#f87272]", glow: "shadow-glow-red",    bg: "bg-red-400/10" },
  orange: { value: "text-[#fb923c]", glow: "shadow-glow-red",    bg: "bg-orange-400/10" },
  yellow: { value: "text-[#fbbd23]", glow: "",                   bg: "bg-yellow-400/10" },
  cyan:   { value: "text-[#34d3ff]", glow: "",                   bg: "bg-cyan-400/10" },
  slate:  { value: "text-white/70",  glow: "",                   bg: "bg-white/[.06]" },
};

interface GlassStatCardProps {
  label: string;
  value: number | string;
  color?: Color;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  description?: string;
  className?: string;
}

export function GlassStatCard({ label, value, color = "blue", icon, trend, trendLabel, description, className }: GlassStatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      "glass-base rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[.20]",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/45">{label}</p>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-sm text-white/70", c.bg)}>
            {icon}
          </span>
        )}
      </div>
      <p className={cn("text-4xl font-bold tracking-tight leading-none", c.value)}>{value}</p>
      {description && <p className="text-xs text-white/40">{description}</p>}
      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 text-[11px] font-medium", trend > 0 ? "text-[#36d399]" : trend < 0 ? "text-[#f87272]" : "text-white/40")}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {trendLabel ?? `${Math.abs(trend)}%`}
        </div>
      )}
    </div>
  );
}
