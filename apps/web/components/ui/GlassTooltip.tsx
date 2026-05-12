"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "./cn";

interface GlassTooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function GlassTooltip({ content, children, side = "top", className }: GlassTooltipProps) {
  const [show, setShow] = useState(false);

  const posClass = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side];

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-xs bg-white/[.12] backdrop-blur-[16px] border border-white/[.18] px-2.5 py-1.5 text-[11px] text-white/85 shadow-glass animate-fade-in",
          posClass, className
        )}>
          {content}
        </span>
      )}
    </span>
  );
}
