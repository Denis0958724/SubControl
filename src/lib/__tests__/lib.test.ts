import { describe, expect, it } from 'vitest';

import { initials, matchService } from '../catalog';
import { addCycle, occurrencesInMonth, plural, relativeDay, rollForward } from '../dates';
import { demoStatement } from './sampleStatement';
import { detectSubscriptions } from '../detect';
import { formatMoney, formatUAH, monthlyUAH, parseAmount, yearlyUAH } from '../money';
import type { Rates, Subscription } from '../types';

const rates: Rates = { USD: 40, EUR: 45, updatedAt: '', source: 'fallback' };

const sub = (patch: Partial<Subscription>): Subscription => ({
  id: 'x',
  name: 'X',
  amount: 100,
  currency: 'UAH',
  cycle: 'month',
  nextCharge: '2026-10-20',
  anchorDay: 20,
  color: '#000',
  remind: true,
  status: 'active',
  sharedWith: 1,
  source: 'manual',
  createdAt: '2026-01-01',
  ...patch,
});

describe('dates', () => {
  it('keeps the 31st when the month allows it', () => {
    expect(addCycle('2026-01-31', 'month', 31)).toBe('2026-02-28');
    expect(addCycle('2026-02-28', 'month', 31)).toBe('2026-03-31');
    expect(addCycle('2026-12-15', 'month')).toBe('2027-01-15');
    expect(addCycle('2028-02-29', 'year', 29)).toBe('2029-02-28');
  });

  it('rolls past charges forward', () => {
    expect(rollForward('2026-08-05', 'month', 5, '2026-10-16')).toBe('2026-11-05');
    expect(rollForward('2026-10-16', 'month', 16, '2026-10-16')).toBe('2026-10-16');
    expect(rollForward('2026-10-01', 'week', 1, '2026-10-16')).toBe('2026-10-22');
  });

  it('speaks Ukrainian', () => {
    expect(relativeDay('2026-10-17', '2026-10-16')).toBe('завтра');
    expect(relativeDay('2026-10-19', '2026-10-16')).toBe('через 3 дні');
    expect(relativeDay('2026-10-21', '2026-10-16')).toBe('через 5 днів');
    expect(plural(21, ['день', 'дні', 'днів'])).toBe('день');
    expect(plural(12, ['день', 'дні', 'днів'])).toBe('днів');
  });

  it('lists charges in a month', () => {
    expect(occurrencesInMonth('2026-11-05', 'month', 5, 2026, 9)).toEqual(['2026-10-05']);
    expect(occurrencesInMonth('2027-03-01', 'year', 1, 2026, 9)).toEqual([]);
    expect(occurrencesInMonth('2026-10-22', 'week', 22, 2026, 9)).toEqual([
      '2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29',
    ]);
  });
});

describe('money', () => {
  it('converts to hryvnias per month and year', () => {
    expect(monthlyUAH(sub({ amount: 10, currency: 'USD' }), rates)).toBe(400);
    expect(monthlyUAH(sub({ amount: 1200, cycle: 'year' }), rates)).toBe(100);
    expect(yearlyUAH(sub({ amount: 100, cycle: 'week' }), rates)).toBe(5200);
  });

  it('formats like Ukrainians write money', () => {
    expect(formatUAH(1247.4)).toBe('1 247 ₴');
    expect(formatMoney(4.99, 'USD')).toBe('4,99 $');
    expect(formatMoney(199, 'UAH')).toBe('199 ₴');
    expect(parseAmount('4,99')).toBe(4.99);
  });
});

describe('catalog', () => {
  it('recognises merchants from bank descriptions', () => {
    expect(matchService('NETFLIX.COM')?.id).toBe('netflix');
    expect(matchService('Google YouTube')?.id).toBe('youtube');
    expect(matchService('GOOGLE *Google One')?.id).toBe('googleone');
    expect(matchService('APPLE.COM/BILL')?.id).toBe('apple');
    expect(matchService('Сільпо')).toBeUndefined();
  });

  it('makes short badges', () => {
    expect(initials('Netflix')).toBe('N');
    expect(initials('YouTube Premium')).toBe('YP');
    expect(initials('SWEET.TV')).toBe('ST');
  });
});

describe('detectSubscriptions', () => {
  const today = '2026-10-16';
  const found = detectSubscriptions(demoStatement(today), today);
  const names = found.map((c) => c.name);

  it('finds known services and regular payments', () => {
    expect(names).toContain('Netflix');
    expect(names).toContain('Spotify');
    expect(names).toContain('Google One');
    expect(names).toContain('Sportlife');
    expect(names).toContain('Vodafone');
  });

  it('splits App Store charges by price', () => {
    expect(names.filter((n) => n.startsWith('Apple'))).toHaveLength(2);
  });

  it('ignores groceries, taxis and coffee', () => {
    expect(names.some((n) => /сільпо|bolt|aroma/i.test(n))).toBe(false);
  });

  it('keeps foreign prices in their currency and predicts the next charge', () => {
    const netflix = found.find((c) => c.serviceId === 'netflix')!;
    expect(netflix.currency).toBe('USD');
    expect(netflix.amount).toBe(7.99);
    expect(netflix.cycle).toBe('month');
    expect(netflix.nextCharge >= today).toBe(true);
    expect(netflix.confidence).toBe('high');
    expect(found.find((c) => c.name === 'Sportlife')!.confidence).toBe('medium');
  });
});

describe('badges for detected store charges', () => {
  it('ignores the price in brackets', () => {
    expect(initials('Apple (4,99 $)')).toBe('A');
  });
});

describe('billing period helpers', () => {
  it('steps one cycle back, keeping the anchor day', async () => {
    const { previousCharge } = await import('../dates');
    expect(previousCharge('2026-03-31', 'month', 31)).toBe('2026-02-28');
    expect(previousCharge('2026-01-15', 'month', 15)).toBe('2025-12-15');
    expect(previousCharge('2026-10-24', 'week')).toBe('2026-10-17');
    expect(previousCharge('2027-02-28', 'year', 29)).toBe('2026-02-28');
  });

  it('measures how far through the period today is', async () => {
    const { cycleProgress } = await import('../dates');
    expect(cycleProgress('2026-10-24', 'week', 24, '2026-10-17')).toBe(0);
    expect(cycleProgress('2026-10-24', 'week', 24, '2026-10-24')).toBe(1);
    expect(cycleProgress('2026-11-01', 'month', 1, '2026-10-16')).toBeCloseTo(15 / 31);
  });
});
