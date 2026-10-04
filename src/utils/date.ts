// 本地日期工具。注意：不要用 toISOString().slice(0,10)，
// 那取的是 UTC 日期，非 UTC 时区在午夜前后会差一天。

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** 在 YYYY-MM-DD 上加减天数，返回同样的字符串格式 */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

/** 某个 YYYY-MM-DD 当天 00:00 的本地 Date */
export function startOfDayISO(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** 2026-10-04 → 10月4日 周日 */
export function formatDateCN(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dt.getDay()];
  const today = todayISO();
  if (dateISO === today) return `今天 · ${m}月${d}日 ${weekday}`;
  if (dateISO === addDaysISO(today, -1)) return `昨天 · ${m}月${d}日 ${weekday}`;
  return `${m}月${d}日 ${weekday}`;
}

/** 距今天几天（正数=过去） */
export function daysAgo(dateISO: string): number {
  const [y1, m1, d1] = todayISO().split('-').map(Number);
  const [y2, m2, d2] = dateISO.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((a - b) / 86400000);
}
