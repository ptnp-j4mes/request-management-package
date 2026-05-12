import { cn } from "./cn";

type Color = "blue" | "green" | "orange" | "red" | "purple";

const gradMap: Record<Color, string> = {
  blue:   "from-[#4f9cf9] to-[#a78bfa]",
  green:  "from-[#36d399] to-[#059669]",
  orange: "from-[#fb923c] to-[#f59e0b]",
  red:    "from-[#f87272] to-[#dc2626]",
  purple: "from-[#a78bfa] to-[#7c3aed]",
};

interface GlassProgressBarProps {
  value: number;
  color?: Color;
  height?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const heightMap = { xs: "h-1", sm: "h-1.5", md: "h-2" };

export function GlassProgressBar({ value, color = "blue", height = "sm", showLabel, className }: GlassProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 overflow-hidden rounded-full bg-white/10", heightMap[height])}>
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", gradMap[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && <span className="text-[11px] text-white/45 tabular-nums w-8 text-right">{clamped}%</span>}
    </div>
  );
}
