import type { Rates } from './types';

/**
 * Card rates from monobank are closest to what a Ukrainian card is actually charged.
 * If monobank is unavailable, falls back to the official NBU rate.
 */
export async function fetchRates(): Promise<Rates> {
  try {
    const res = await fetch('https://api.monobank.ua/bank/currency');
    if (res.ok) {
      const list = (await res.json()) as Array<{
        currencyCodeA: number;
        currencyCodeB: number;
        rateSell?: number;
        rateCross?: number;
      }>;
      const pick = (code: number) => {
        const r = list.find((x) => x.currencyCodeA === code && x.currencyCodeB === 980);
        return r?.rateSell ?? r?.rateCross;
      };
      const USD = pick(840);
      const EUR = pick(978);
      if (USD && EUR) return { USD, EUR, updatedAt: new Date().toISOString(), source: 'monobank' };
    }
  } catch {
    // try NBU below
  }

  const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
  if (!res.ok) throw new Error('rates unavailable');
  const list = (await res.json()) as Array<{ cc: string; rate: number }>;
  const USD = list.find((x) => x.cc === 'USD')?.rate;
  const EUR = list.find((x) => x.cc === 'EUR')?.rate;
  if (!USD || !EUR) throw new Error('rates unavailable');
  return { USD, EUR, updatedAt: new Date().toISOString(), source: 'nbu' };
}

export const RATE_SOURCE_LABEL: Record<Rates['source'], string> = {
  monobank: 'за курсом monobank',
  nbu: 'за курсом НБУ',
  fallback: 'за курсом НБУ',
};
