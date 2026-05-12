import { Check } from "lucide-react";
import { cn } from "./cn";

type StepStatus = "done" | "active" | "pending";

interface Step {
  label: string;
  status: StepStatus;
}

interface GlassStepperProps {
  steps: Step[];
  compact?: boolean;
  className?: string;
}

export function GlassStepper({ steps, compact, className }: GlassStepperProps) {
  return (
    <div className={cn("flex items-center gap-0 w-full", compact ? "gap-0" : "gap-0", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="flex items-center" style={{ flex: isLast ? "0 0 auto" : "1 1 auto" }}>
            {/* Circle */}
            <div className="relative flex-shrink-0">
              <div className={cn(
                "flex items-center justify-center rounded-full border-2 text-white transition-all",
                compact ? "h-6 w-6 text-[9px]" : "h-8 w-8 text-xs",
                step.status === "done"   && "bg-[#4f9cf9] border-[#4f9cf9] shadow-glow-blue",
                step.status === "active" && "bg-transparent border-[#4f9cf9] shadow-glow-blue animate-pulse-ring",
                step.status === "pending"&& "bg-transparent border-white/20 text-white/20",
              )}>
                {step.status === "done"
                  ? <Check className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                  : step.status === "active"
                    ? <span className={cn("rounded-full bg-[#4f9cf9]", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
                    : <span className="text-[10px] text-white/30">{i + 1}</span>
                }
              </div>
              {!compact && (
                <p className={cn(
                  "absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium",
                  step.status === "done"    && "text-[#4f9cf9]",
                  step.status === "active"  && "text-white/80",
                  step.status === "pending" && "text-white/25",
                )}>
                  {step.label}
                </p>
              )}
            </div>
            {/* Connector */}
            {!isLast && (
              <div className="flex-1 mx-1">
                <div className={cn("h-0.5 w-full", step.status === "done" ? "bg-[#4f9cf9]/60" : "bg-white/10")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
