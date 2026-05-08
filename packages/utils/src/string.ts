export function generateNo(prefix: string, id: number): string {
  return `${prefix}-${new Date().getFullYear()}${String(id).padStart(4, "0")}`;
}

export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}
