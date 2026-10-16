import { matchService } from './catalog';
import { addCycle, diffDays, rollForward, toISO } from './dates';
import { formatMoney } from './money';
import type { Currency, Cycle, ISODate } from './types';

/** One operation from the monobank statement (only the fields we use). */
export interface StatementItem {
  id: string;
  /** unix seconds */
  time: number;
  description: string;
  mcc: number;
  /** in account currency, minor units, negative for debits */
  amount: number;
  /** in the operation currency, minor units */
  operationAmount: number;
  /** ISO 4217 numeric: 980 UAH, 840 USD, 978 EUR */
  currencyCode: number;
  hold?: boolean;
}

export interface Candidate {
  key: string;
  serviceId?: string;
  name: string;
  amount: number;
  currency: Currency;
  /** what the card was actually charged last time, in hryvnias */
  lastChargeUAH: number;
  cycle: Cycle;
  lastCharge: ISODate;
  nextCharge: ISODate;
  occurrences: number;
  confidence: 'high' | 'medium';
}

const CURRENCY_BY_CODE: Record<number, Currency> = { 980: 'UAH', 840: 'USD', 978: 'EUR' };

/** Merchant categories that are almost never subscriptions (groceries, taxis, cafés, transfers…). */
const NOT_SUBSCRIPTION_MCC = new Set([
  4111, 4121, 4131, 4784, 4829, 5310, 5311, 5331, 5411, 5412, 5422, 5441, 5451, 5462, 5499,
  5541, 5542, 5812, 5813, 5814, 5912, 5921, 5993, 6010, 6011, 6012, 6050, 6051, 6538, 6540, 7523,
]);

/** Transfers, cash and bank fees repeat too, but they are not subscriptions. */
const NOT_SUBSCRIPTION_TEXT =
  /переказ|перевод|поповнення|пополнение|зняття|снятие|банкомат|\batm\b|p2p|на картку|на карту|з картки|с карты|комісі|комисси|відсотк|процент|кешбек|cashback|депозит|кредит|погашення|погашение/i;

function normalize(description: string): string {
  return description
    .toLowerCase()
    .replace(/[0-9]+/g, ' ')
    .replace(/[^a-zа-яіїєґ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function titleCase(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function guessCycle(dates: ISODate[]): Cycle | undefined {
  if (dates.length < 2) return undefined;
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) gaps.push(diffDays(dates[i - 1], dates[i]));
  const m = median(gaps);
  if (m >= 6 && m <= 8) return 'week';
  if (m >= 25 && m <= 35) return 'month';
  if (m >= 350 && m <= 380) return 'year';
  return undefined;
}

function isRegular(dates: ISODate[], cycle: Cycle): boolean {
  const [lo, hi] = cycle === 'week' ? [5, 9] : cycle === 'month' ? [24, 36] : [340, 390];
  for (let i = 1; i < dates.length; i++) {
    const g = diffDays(dates[i - 1], dates[i]);
    if (g < lo || g > hi) return false;
  }
  return true;
}

const STALE_AFTER: Record<Cycle, number> = { week: 12, month: 42, year: 400 };

/**
 * Finds recurring charges in a bank statement.
 * Known services (Netflix, Spotify…) are recognised from one charge; anything else needs
 * at least two charges with a similar amount and a regular interval.
 */
export function detectSubscriptions(items: StatementItem[], today: ISODate): Candidate[] {
  const groups = new Map<string, { serviceId?: string; label: string; items: StatementItem[] }>();

  for (const it of items) {
    if (it.amount >= 0) continue;
    const service = matchService(it.description);
    let key: string;
    let label: string;
    if (service) {
      // App Store / Google Play bundle many subscriptions under one merchant: split them by price.
      key = service.aggregator
        ? `svc:${service.id}:${Math.abs(it.operationAmount)}:${it.currencyCode}`
        : `svc:${service.id}`;
      label = service.name;
    } else {
      if (NOT_SUBSCRIPTION_MCC.has(it.mcc) || NOT_SUBSCRIPTION_TEXT.test(it.description)) continue;
      key = `raw:${normalize(it.description)}`;
      if (key === 'raw:') continue;
      label = titleCase(it.description);
    }
    const g = groups.get(key) ?? { serviceId: service?.id, label, items: [] };
    g.items.push(it);
    groups.set(key, g);
  }

  const out: Candidate[] = [];
  for (const [key, g] of groups) {
    const sorted = [...g.items].sort((a, b) => a.time - b.time);
    const dates = sorted.map((i) => toISO(new Date(i.time * 1000)));
    const last = sorted[sorted.length - 1];
    const lastCharge = dates[dates.length - 1];
    const known = Boolean(g.serviceId);

    let cycle = guessCycle(dates);
    if (!known) {
      if (sorted.length < 2 || !cycle || !isRegular(dates, cycle)) continue;
      const amounts = sorted.map((i) => Math.abs(i.amount));
      const med = median(amounts);
      if (amounts.some((a) => Math.abs(a - med) / med > 0.1)) continue;
    }
    cycle = cycle ?? 'month';
    if (diffDays(lastCharge, today) > STALE_AFTER[cycle]) continue;

    const currency = CURRENCY_BY_CODE[last.currencyCode] ?? 'UAH';
    const amount =
      currency === 'UAH' ? Math.abs(last.amount) / 100 : Math.abs(last.operationAmount) / 100;
    const anchor = new Date(last.time * 1000).getDate();
    const nextCharge = rollForward(addCycle(lastCharge, cycle, anchor), cycle, anchor, today);
    const isAggregator = key.split(':').length > 2;

    out.push({
      key,
      serviceId: g.serviceId,
      name: isAggregator ? `${g.label} (${formatMoney(amount, currency)})` : g.label,
      amount,
      currency,
      lastChargeUAH: Math.abs(last.amount) / 100,
      cycle,
      lastCharge,
      nextCharge,
      occurrences: sorted.length,
      confidence: known ? 'high' : 'medium',
    });
  }

  return out.sort((a, b) =>
    a.confidence === b.confidence ? b.lastChargeUAH - a.lastChargeUAH : a.confidence === 'high' ? -1 : 1,
  );
}
