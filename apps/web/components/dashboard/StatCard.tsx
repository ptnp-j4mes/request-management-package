import { cn } from "../ui/cn";

interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
  color?: "blue" | "yellow" | "orange" | "green" | "red";
  icon?: React.ReactNode;
}

const colorMap = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  green: "bg-green-50 border-green-200 text-green-700",
  red: "bg-red-50 border-red-200 text-red-700",
};

export function StatCard({ label, value, description, color = "blue", icon }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border p-5", colorMap[color])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {description && <p className="mt-1 text-xs opacity-70">{description}</p>}
    </div>
  );
}
