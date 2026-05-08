export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function isOverdue(plannedEnd: string | null | undefined, currentStatus: string): boolean {
  if (!plannedEnd) return false;
  const done = ["done", "closed", "cancelled", "deployed"];
  if (done.includes(currentStatus)) return false;
  return new Date(plannedEnd) < new Date();
}
