"use client";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function GlassModal({ open, onClose, title, size = "md", children, className }: GlassModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[8px] animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(
        "w-full glass-modal rounded-xl p-6 animate-fade-in-scale",
        sizeClass[size],
        className
      )}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white/90">{title}</h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-[8px] hover:bg-white/[.08]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
