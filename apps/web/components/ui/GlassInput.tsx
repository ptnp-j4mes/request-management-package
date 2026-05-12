import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/* ── GlassInput ── */
interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function GlassInput({ label, error, icon, className, ...rest }: GlassInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/45">{label}</label>}
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35">{icon}</span>}
        <input
          {...rest}
          className={cn(
            "glass-input h-10 w-full rounded-xs px-3 text-sm text-white/90 placeholder:text-white/30 transition-all duration-200",
            icon && "pl-9",
            error && "border-red-400/50 focus:border-red-400/80",
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-[#f87272]">{error}</p>}
    </div>
  );
}

/* ── GlassTextarea ── */
interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function GlassTextarea({ label, error, className, ...rest }: GlassTextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/45">{label}</label>}
      <textarea
        {...rest}
        className={cn(
          "glass-input w-full rounded-xs px-3 py-2.5 text-sm text-white/90 placeholder:text-white/30 resize-none transition-all duration-200",
          error && "border-red-400/50 focus:border-red-400/80",
          className
        )}
      />
      {error && <p className="text-xs text-[#f87272]">{error}</p>}
    </div>
  );
}

/* ── GlassSelect ── */
interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function GlassSelect({ label, error, options, placeholder, className, ...rest }: GlassSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/45">{label}</label>}
      <select
        {...rest}
        className={cn(
          "glass-input h-10 w-full rounded-xs px-3 text-sm text-white/90 transition-all duration-200 appearance-none",
          error && "border-red-400/50",
          className
        )}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1e1b4b", color: "white" }}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#f87272]">{error}</p>}
    </div>
  );
}
