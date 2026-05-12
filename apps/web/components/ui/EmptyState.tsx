import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-10 text-center gap-3", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[.07] text-white/30">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-white/55">{title}</p>
        {description && <p className="mt-1 text-xs text-white/35">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
