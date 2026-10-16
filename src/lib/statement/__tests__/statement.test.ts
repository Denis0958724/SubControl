/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { detectSubscriptions } from '../../detect';
import { readStatement } from '../index';
import { parseDate, parseNumber } from '../rows';

const TODAY = '2026-10-16';
const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, 'fixtures', name)));

function namesFrom(file: string) {
  const { items, format } = readStatement(fixture(file));
  const found = detectSubscriptions(items, TODAY);
  return { items, format, found, names: found.map((c) => c.name) };
}

describe('statement files from different banks', () => {
  for (const [file, format] of [
    ['privat.xlsx', 'xlsx'],
    ['privat-dates.xlsx', 'xlsx'],
    ['privat.xls', 'xls'],
    ['monobank.csv', 'csv'],
    ['other-cp1251.csv', 'csv'],
    ['html-table.xls', 'html'],
  ] as const) {
    it(`finds subscriptions in ${file}`, () => {
      const { format: f, items, names, found } = namesFrom(file);
      expect(f).toBe(format);
      expect(items.length).toBeGreaterThan(80);
      expect(names).toContain('Netflix');
      expect(names).toContain('Spotify');
      expect(names).toContain('MEGOGO');
      expect(names.some((n) => /sportlife/i.test(n))).toBe(true);
      // groceries, taxis, transfers to people and phone top-ups stay out
      expect(names.some((n) => /сільпо|bolt|переказ|поповнення|зарплат/i.test(n))).toBe(false);
      const megogo = found.find((c) => c.name === 'MEGOGO')!;
      expect(megogo.amount).toBe(199);
      expect(megogo.cycle).toBe('month');
    });
  }

  it('keeps the dollar price when the bank shows it', () => {
    for (const file of ['privat.xlsx', 'privat.xls', 'monobank.csv']) {
      const netflix = namesFrom(file).found.find((c) => c.serviceId === 'netflix')!;
      expect(netflix.currency).toBe('USD');
      expect(netflix.amount).toBe(7.99);
    }
  });

  it('explains what is wrong with a PDF', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7 something');
    expect(() => readStatement(pdf)).toThrow(/Excel або CSV/);
  });

  it('says so when the file is not a statement', () => {
    const csv = new TextEncoder().encode('Імʼя;Телефон\nОлена;0501234567\n');
    expect(() => readStatement(csv)).toThrow(/датою і сумою/);
  });
});

describe('cell parsing', () => {
  it('reads amounts written the Ukrainian way and the English way', () => {
    expect(parseNumber('-1 234,56 грн')).toBe(-1234.56);
    expect(parseNumber('1,234.56')).toBe(1234.56);
    expect(parseNumber('(199.00)')).toBe(-199);
    expect(parseNumber('−7,99')).toBe(-7.99);
    expect(parseNumber('')).toBeNull();
  });

  it('reads dates as text and as Excel numbers', () => {
    const local = (y: number, m: number, d: number, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime() / 1000;
    expect(parseDate('16.10.2026 14:30:00')).toBe(local(2026, 10, 16, 14, 30));
    expect(parseDate('2026-10-16')).toBe(local(2026, 10, 16));
    expect(parseDate(46311.5)).toBe(local(2026, 10, 16, 12, 0));
    expect(parseDate('Разом')).toBeNull();
  });
});
