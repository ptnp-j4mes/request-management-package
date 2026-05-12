import type { ReactNode } from "react";
import { cn } from "./cn";

type Variant = "default" | "modal" | "strong" | "sidebar" | "amber" | "inset";

const variantClass: Record<Variant, string> = {
  default: "p-6 overflow-hidden bg-white/[.07] border border-white/[.12] shadow-glass backdrop-blur-glass",
  modal:   "overflow-hidden bg-white/[.10] border border-white/[.25] shadow-glass-modal backdrop-blur-glass-lg",
  strong:  "p-6 overflow-hidden bg-white/[.13] border border-white/[.20] shadow-glass backdrop-blur-glass",
  sidebar: "bg-white/[.05] border border-white/[.08] backdrop-blur-glass",
  amber:   "p-4 overflow-hidden bg-amber-400/[.08] border border-amber-300/[.25] shadow-glass backdrop-blur-glass",
  inset:   "p-4 overflow-hidden bg-white/[.04] border border-white/[.08]",
};

interface GlassCardProps {
  variant?: Variant;
  hover?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function GlassCard({ variant = "default", hover, className, children, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl",
        variantClass[variant],
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[.22] cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
