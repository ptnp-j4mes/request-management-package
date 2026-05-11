"use client";

export type StepStatus = "done" | "active" | "pending";

export const WORKFLOW_STAGES = [
  { key: "draft",            label: "แบบร่าง",         en: "Draft",         percent: 5   },
  { key: "submitted",        label: "รอ IT อนุมัติ",    en: "Submitted",     percent: 15  },
  { key: "manager_approved", label: "IT อนุมัติแล้ว",   en: "Approved",      percent: 25  },
  { key: "ba_review",        label: "BA วิเคราะห์",     en: "BA Review",     percent: 40  },
  { key: "assigned_to_dev",  label: "มอบหมาย Dev",      en: "Assigned Dev",  percent: 50  },
  { key: "in_development",   label: "กำลังพัฒนา",       en: "In Dev",        percent: 65  },
  { key: "ready_for_qa",     label: "รอทดสอบ",          en: "Ready QA",      percent: 75  },
  { key: "in_qa",            label: "QA ทดสอบ",         en: "In QA",         percent: 80  },
  { key: "uat",              label: "รอ UAT",            en: "UAT",           percent: 90  },
  { key: "completed",        label: "เสร็จสิ้น",        en: "Completed",     percent: 100 },
];

function getPercent(status: string): number {
  const stage = WORKFLOW_STAGES.find((s) => s.key === status);
  return stage?.percent ?? 0;
}

function getStageIndex(status: string): number {
  return WORKFLOW_STAGES.findIndex((s) => s.key === status);
}

interface StatusStepperProps {
  status: string;
  showPercent?: boolean;
  compact?: boolean;
}

export function StatusStepper({ status, showPercent = false, compact = false }: StatusStepperProps) {
  const isRejected = status === "rejected";
  const isClosed   = status === "closed";
  const isTerminal = isRejected || isClosed;

  const percent = isTerminal ? 0 : getPercent(status);
  const activeIdx = getStageIndex(status);

  if (compact) {
    // Compact variant: thin progress bar + label
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className={
            isRejected ? "text-red-600 font-medium" :
            isClosed   ? "text-slate-400 font-medium" :
            "text-slate-600"
          }>
            {isRejected ? "ถูกปฏิเสธ" :
             isClosed   ? "ปิดแล้ว" :
             (WORKFLOW_STAGES.find((s) => s.key === status)?.label ?? status)}
          </span>
          {showPercent && !isTerminal && (
            <span className="text-slate-400">{percent}%</span>
          )}
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isRejected ? "bg-red-400" :
              isClosed   ? "bg-slate-300" :
              status === "completed" ? "bg-green-500" :
              "bg-blue-500"
            }`}
            style={{ width: isTerminal ? "100%" : `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  // Full stepper
  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">สถานะการดำเนินการ</h3>
        {!isTerminal && (
          <span className="text-sm font-semibold text-blue-600">{percent}%</span>
        )}
        {isRejected && <span className="text-sm font-semibold text-red-600">ถูกปฏิเสธ</span>}
        {isClosed && <span className="text-sm font-semibold text-slate-500">ปิดแล้ว</span>}
      </div>

      {/* Progress bar */}
      {!isTerminal && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              status === "completed" ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Steps row */}
      {!isTerminal && (
        <div className="flex items-start justify-between gap-1 overflow-x-auto pb-1">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const done   = idx < activeIdx;
            const active = idx === activeIdx;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1 min-w-[52px]">
                <div
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                    done   ? "bg-blue-500 border-blue-500 text-white" :
                    active ? "bg-white border-blue-500 text-blue-600" :
                             "bg-white border-slate-200 text-slate-300"
                  }`}
                >
                  {done ? "✓" : idx + 1}
                </div>
                <span className={`text-[9px] text-center leading-tight ${
                  active ? "text-blue-600 font-medium" :
                  done   ? "text-slate-500" :
                           "text-slate-300"
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {isRejected && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <span>✗</span>
          <span>คำขอนี้ถูกปฏิเสธ</span>
        </div>
      )}
      {isClosed && (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-600">
          <span>■</span>
          <span>คำขอนี้ถูกปิด</span>
        </div>
      )}
    </div>
  );
}
