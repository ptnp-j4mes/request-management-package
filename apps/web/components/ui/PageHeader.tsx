import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 mb-2 text-[11px] text-white/40">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-white/90 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-white/50 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
