import type { ReactNode } from "react";
import { cn } from "./cn";
import { EmptyState } from "./EmptyState";
import { Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (value: any, row: T) => ReactNode;
}

interface GlassTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function GlassTable<T extends Record<string, any>>({ columns, rows, onRowClick, loading, empty, emptyTitle = "No data", emptyDescription, className }: GlassTableProps<T>) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[.08]">
              {columns.map((col) => (
                <th key={col.key} className={cn("px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[.14em] text-white/40 bg-white/[.04]", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.05]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10">
                  {empty ?? <EmptyState title={emptyTitle} description={emptyDescription} />}
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors duration-150 hover:bg-white/[.04]",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-5 py-3.5 text-sm text-white/75", col.className)}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
