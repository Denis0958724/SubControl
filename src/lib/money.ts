import type { Currency, Rates, Subscription } from './types';

/** Approximate NBU rates on 13 Oct 2026, used only when the app is offline on first launch. */
export const FALLBACK_RATES: Rates = {
  USD: 44.96,
  EUR: 50.24,
  updatedAt: '2026-10-13T00:00:00.000Z',
  source: 'fallback',
};

export const CURRENCY_SIGN: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
};

export function toUAH(amount: number, currency: Currency, rates: Rates): number {
  if (currency === 'UAH') return amount;
  return amount * rates[currency];
}

/** Price per month in the subscription's own currency. */
export function perMonth(sub: Pick<Subscription, 'amount' | 'cycle'>): number {
  if (sub.cycle === 'week') return (sub.amount * 52) / 12;
  if (sub.cycle === 'year') return sub.amount / 12;
  return sub.amount;
}

export function perYear(sub: Pick<Subscription, 'amount' | 'cycle'>): number {
  if (sub.cycle === 'week') return sub.amount * 52;
  if (sub.cycle === 'year') return sub.amount;
  return sub.amount * 12;
}

export function monthlyUAH(sub: Subscription, rates: Rates): number {
  return toUAH(perMonth(sub), sub.currency, rates);
}

export function yearlyUAH(sub: Subscription, rates: Rates): number {
  return toUAH(perYear(sub), sub.currency, rates);
}

export function chargeUAH(sub: Subscription, rates: Rates): number {
  return toUAH(sub.amount, sub.currency, rates);
}

const NBSP = ' ';

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** "1 247" — rounded to whole hryvnias with thin grouping. */
export function formatNumber(n: number, decimals = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [i, f] = fixed.split('.');
  const sign = n < 0 ? '−' : '';
  return sign + groupThousands(i) + (f && Number(f) !== 0 ? ',' + f : '');
}

/** "1 247 ₴" */
export function formatUAH(n: number): string {
  return `${formatNumber(Math.round(n))}${NBSP}₴`;
}

/** "4,99 $", "199 ₴" */
export function formatMoney(amount: number, currency: Currency): string {
  const decimals = Number.isInteger(amount) ? 0 : 2;
  return `${formatNumber(amount, decimals)}${NBSP}${CURRENCY_SIGN[currency]}`;
}

/** Parses "4,99" or "4.99" from a text field. */
export function parseAmount(text: string): number {
  const n = Number(text.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
