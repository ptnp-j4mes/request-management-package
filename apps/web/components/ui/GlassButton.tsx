"use client";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:   "bg-gradient-to-r from-blue-400/70 to-violet-400/60 border border-white/25 shadow-glow-blue hover:from-blue-400/80 hover:to-violet-400/70 text-white",
  secondary: "bg-white/[.09] border border-white/[.18] hover:bg-white/[.14] hover:border-white/[.28] text-white/85",
  danger:    "bg-gradient-to-r from-red-400/60 to-red-600/50 border border-red-400/30 shadow-glow-red hover:from-red-400/70 hover:to-red-600/60 text-white",
  success:   "bg-gradient-to-r from-emerald-400/60 to-emerald-600/50 border border-emerald-400/30 shadow-glow-green hover:from-emerald-400/70 hover:to-emerald-600/60 text-white",
  ghost:     "bg-transparent border border-transparent hover:bg-white/[.08] hover:border-white/[.12] text-white/70 hover:text-white",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8  px-3   text-xs  rounded-xs gap-1.5",
  md: "h-10 px-4   text-sm  rounded-xs gap-2",
  lg: "h-11 px-5   text-sm  rounded-sm gap-2",
};

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

export function GlassButton({ variant = "secondary", size = "md", icon, loading, children, className, disabled, ...rest }: GlassButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold backdrop-blur-[10px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className
      )}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ) : icon}
      {children}
    </button>
  );
}
