import { ConquestEntry } from './conquests';

export interface CalendarDay {
  date: string;
  count: number;
  summits: string[];
  isToday: boolean;
  inMonth: boolean;
}

export function buildCalendarDays(
  entries: ConquestEntry[],
  year: number,
  month: number,
): CalendarDay[] {
  const todayStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  const byDate = new Map<string, { count: number; summits: string[] }>();
  for (const e of entries) {
    const d = new Date(e.planted_at);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const existing = byDate.get(key);
    if (existing) {
      existing.count++;
      existing.summits.push(e.summit_name_ko);
    } else {
      byDate.set(key, { count: 1, summits: [e.summit_name_ko] });
    }
  }

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: CalendarDay[] = [];

  for (let i = 0; i < firstDow; i++) {
    days.push({ date: '', count: 0, summits: [], isToday: false, inMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = byDate.get(dateStr);
    days.push({
      date: dateStr,
      count: data?.count ?? 0,
      summits: data?.summits ?? [],
      isToday: dateStr === todayStr,
      inMonth: true,
    });
  }

  return days;
}

export function monthFlagTotal(entries: ConquestEntry[], year: number, month: number): number {
  return entries.filter(e => {
    const d = new Date(e.planted_at);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
}
