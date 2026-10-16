import type { Cycle, ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Moves a charge date one billing cycle forward, keeping the anchor day when the month allows it. */
export function addCycle(iso: ISODate, cycle: Cycle, anchorDay?: number): ISODate {
  if (cycle === 'week') return addDays(iso, 7);
  const d = fromISO(iso);
  const anchor = anchorDay ?? d.getDate();
  let y = d.getFullYear();
  let m = d.getMonth();
  if (cycle === 'month') {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  } else {
    y += 1;
  }
  return toISO(new Date(y, m, Math.min(anchor, daysInMonth(y, m))));
}

/** Rolls a past charge date forward until it is today or later. */
export function rollForward(iso: ISODate, cycle: Cycle, anchorDay: number, today: ISODate): ISODate {
  let next = iso;
  let guard = 0;
  while (next < today && guard < 1000) {
    next = addCycle(next, cycle, anchorDay);
    guard += 1;
  }
  return next;
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000);
}

export const MONTHS = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

const MONTHS_GEN = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** "20 жовтня" */
export function formatDate(iso: ISODate): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** "сьогодні", "завтра", "через 3 дні", "вчора", "5 днів тому" */
export function relativeDay(iso: ISODate, today: ISODate): string {
  const n = diffDays(today, iso);
  if (n === 0) return 'сьогодні';
  if (n === 1) return 'завтра';
  if (n === -1) return 'вчора';
  if (n > 0) return `через ${n} ${plural(n, ['день', 'дні', 'днів'])}`;
  const m = -n;
  return `${m} ${plural(m, ['день', 'дні', 'днів'])} тому`;
}

export const CYCLE_LABEL: Record<Cycle, string> = {
  week: 'щотижня',
  month: 'щомісяця',
  year: 'щороку',
};

/** All charge dates of a subscription that fall into the given month. */
export function occurrencesInMonth(
  nextCharge: ISODate,
  cycle: Cycle,
  anchorDay: number,
  year: number,
  month0: number,
): ISODate[] {
  const dim = daysInMonth(year, month0);
  const monthStart = toISO(new Date(year, month0, 1));
  const monthEnd = toISO(new Date(year, month0, dim));

  if (cycle === 'month') {
    return [toISO(new Date(year, month0, Math.min(anchorDay, dim)))];
  }
  if (cycle === 'year') {
    const d = fromISO(nextCharge);
    if (d.getMonth() !== month0) return [];
    return [toISO(new Date(year, month0, Math.min(anchorDay, dim)))];
  }
  // weekly: walk back to the first occurrence on/after month start, then forward
  let cursor = nextCharge;
  while (cursor > monthStart) cursor = addDays(cursor, -7);
  while (cursor < monthStart) cursor = addDays(cursor, 7);
  const out: ISODate[] = [];
  while (cursor <= monthEnd) {
    out.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return out;
}
