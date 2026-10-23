import { plural } from './dates';
import { formatNumber } from './money';

/**
 * "27 763 ₴ a year" is just a number. "185 shawarmas" is a feeling.
 * Rough everyday prices in hryvnias; the point is the scale, not the receipt.
 */
const THINGS: { price: number; forms: [string, string, string] }[] = [
  { price: 150, forms: ['шаурма', 'шаурми', 'шаурм'] },
  { price: 220, forms: ['похід у кіно', 'походи в кіно', 'походів у кіно'] },
  { price: 400, forms: ['піца', 'піци', 'піц'] },
  { price: 180, forms: ['поїздка на таксі', 'поїздки на таксі', 'поїздок на таксі'] },
  { price: 1200, forms: ['місяць у спортзалі', 'місяці в спортзалі', 'місяців у спортзалі'] },
  { price: 2500, forms: ['повний бак', 'повні баки', 'повних баків'] },
];

/** Comparisons that make sense for this amount: at least two of a thing, and not absurdly many. */
export function perspectives(yearlyUAH: number): string[] {
  return THINGS.map((t) => ({ n: Math.floor(yearlyUAH / t.price), forms: t.forms }))
    .filter(({ n }) => n >= 2 && n <= 2000)
    .map(({ n, forms }) => `${formatNumber(n)} ${plural(n, forms)}`);
}
