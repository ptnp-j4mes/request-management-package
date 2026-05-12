import { cn } from "./cn";

type Size = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<Size, { outer: string; text: string; dot: string }> = {
  xs: { outer: "h-6 w-6 text-[9px]",  text: "",  dot: "h-1.5 w-1.5 border" },
  sm: { outer: "h-8 w-8 text-[11px]", text: "",  dot: "h-2 w-2 border" },
  md: { outer: "h-10 w-10 text-sm",   text: "",  dot: "h-2.5 w-2.5 border-2" },
  lg: { outer: "h-12 w-12 text-base", text: "",  dot: "h-3 w-3 border-2" },
};

interface GlassAvatarProps {
  name: string;
  size?: Size;
  online?: boolean;
  className?: string;
}

export function GlassAvatar({ name, size = "md", online, className }: GlassAvatarProps) {
  const s = sizeMap[size];
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={cn("relative inline-flex items-center justify-center rounded-full bg-white/10 border-2 border-[#4f9cf9]/60 font-bold text-white shrink-0", s.outer, className)}>
      {initials}
      {online !== undefined && (
        <span className={cn(
          "absolute bottom-0 right-0 rounded-full",
          s.dot,
          online ? "bg-[#36d399] border-slate-900" : "bg-white/30 border-slate-900"
        )} />
      )}
    </span>
  );
}
