/// <reference types="node" />
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { buildSubscriptionsXlsx } from '../exportTable';
import type { Rates, Subscription } from '../types';

const rates: Rates = { USD: 44.96, EUR: 50.24, updatedAt: '2026-10-17T09:00:00Z', source: 'monobank' };
const base = { anchorDay: 1, remind: true, sharedWith: 1, source: 'manual' as const, createdAt: '2026-01-01', color: '#000000' };
const subs: Subscription[] = [
  { ...base, id: 'a', name: 'PlayStation Plus', amount: 66, currency: 'USD', cycle: 'year', nextCharge: '2027-10-16', status: 'active' },
  { ...base, id: 'b', name: 'Netflix', amount: 6, currency: 'USD', cycle: 'month', nextCharge: '2026-10-18', status: 'active' },
  { ...base, id: 'c', name: 'Canva Pro & <Team>', amount: 650, currency: 'UAH', cycle: 'month', nextCharge: '2026-11-15', status: 'active', sharedWith: 2 },
  { ...base, id: 'd', name: 'Adobe', amount: 22.99, currency: 'USD', cycle: 'month', nextCharge: '2026-11-03', status: 'cancelled' },
];

describe('xlsx export', () => {
  it('builds a workbook with a styled sheet, totals and escaped text', () => {
    const bytes = buildSubscriptionsXlsx(subs, rates, '2026-10-17');
    writeFileSync(join(tmpdir(), 'subcontrol-export-test.xlsx'), bytes);
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toContain('xl/worksheets/sheet1.xml');
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('Canva Pro &amp; &lt;Team&gt;');
    expect(sheet).toContain('SUM(G5:G7)');
    expect(sheet).toContain('скасована');
    // Netflix comes first: sorted by the next charge
    expect(sheet.indexOf('Netflix')).toBeLessThan(sheet.indexOf('PlayStation'));
  });
});
