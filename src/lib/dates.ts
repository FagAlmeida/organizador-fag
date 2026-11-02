// Datas de entrega são "dias de calendário", sem hora. No banco ficam como
// meio-dia UTC, e na interface trafegam como "AAAA-MM-DD".

export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

export function dateToDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Hoje no fuso local do navegador, no formato "AAAA-MM-DD". */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, days: number): string {
  const date = dateKeyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToDateKey(date);
}

export function formatDateKey(key: string, options?: Intl.DateTimeFormatOptions): string {
  return dateKeyToDate(key).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    ...options,
  });
}

export type DueStatus = "overdue" | "today" | "soon" | "later";

export function dueStatus(key: string, today: string): DueStatus {
  if (key < today) return "overdue";
  if (key === today) return "today";
  if (key <= addDays(today, 2)) return "soon";
  return "later";
}
