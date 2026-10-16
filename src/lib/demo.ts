import { findService } from './catalog';
import { addCycle, addDays, fromISO, rollForward } from './dates';
import type { StatementItem } from './detect';
import type { Cycle, Currency, ISODate, Subscription } from './types';

function demoSub(
  today: ISODate,
  serviceId: string,
  amount: number,
  currency: Currency,
  cycle: Cycle,
  offsetDays: number,
  extra: Partial<Subscription> = {},
): Subscription {
  const s = findService(serviceId)!;
  const first = addDays(today, offsetDays);
  const anchor = fromISO(first).getDate();
  const nextCharge = rollForward(first, cycle, anchor, today);
  return {
    id: `demo-${serviceId}`,
    serviceId,
    name: s.name,
    amount,
    currency,
    cycle,
    nextCharge,
    anchorDay: anchor,
    color: s.color,
    remind: true,
    status: 'active',
    sharedWith: 1,
    source: 'manual',
    createdAt: addDays(today, -90),
    ...extra,
  };
}

/** Sample data so people can see the app filled in before adding their own. */
export function demoSubscriptions(today: ISODate): Subscription[] {
  return [
    demoSub(today, 'netflix', 7.99, 'USD', 'month', 1),
    demoSub(today, 'spotify', 149, 'UAH', 'month', -3),
    demoSub(today, 'youtube', 249, 'UAH', 'month', 11, { sharedWith: 4 }),
    demoSub(today, 'megogo', 199, 'UAH', 'month', -6),
    demoSub(today, 'chatgpt', 20, 'USD', 'month', 9),
    demoSub(today, 'duolingo', 59.99, 'USD', 'year', 74),
    demoSub(today, 'adobe', 22.99, 'USD', 'month', 3, {
      status: 'cancelled',
      cancelledAt: addDays(today, -20),
      remind: false,
    }),
  ];
}

/** A made-up monobank statement for the import demo: three months of a typical card. */
export function demoStatement(today: ISODate, usd = 44.96): StatementItem[] {
  const items: StatementItem[] = [];
  let n = 0;
  const at = (iso: ISODate, hour = 12) => Math.floor(fromISO(iso).getTime() / 1000) + hour * 3600;
  const push = (iso: ISODate, description: string, mcc: number, uah: number, op?: { amount: number; code: number }) => {
    if (iso > today) return;
    items.push({
      id: `d${n++}`,
      time: at(iso),
      description,
      mcc,
      amount: -Math.round(uah * 100),
      operationAmount: -Math.round((op?.amount ?? uah) * 100),
      currencyCode: op?.code ?? 980,
    });
  };
  const monthly = (startOffset: number, fn: (iso: ISODate) => void) => {
    let d = addDays(today, startOffset);
    const anchor = fromISO(d).getDate();
    for (let i = 0; i < 4; i++) {
      fn(d);
      d = addCycle(d, 'month', anchor);
    }
  };

  monthly(-89, (d) => push(d, 'Netflix.com', 4899, 7.99 * usd, { amount: 7.99, code: 840 }));
  monthly(-86, (d) => push(d, 'Spotify', 5815, 149));
  monthly(-80, (d) => push(d, 'APPLE.COM/BILL', 5818, 0.99 * usd, { amount: 0.99, code: 840 }));
  monthly(-75, (d) => push(d, 'APPLE.COM/BILL', 5818, 4.99 * usd, { amount: 4.99, code: 840 }));
  monthly(-70, (d) => push(d, 'Sportlife', 7997, 1290));
  monthly(-84, (d) => push(d, 'Vodafone', 4814, 250));
  monthly(-66, (d) => push(d, 'Google One', 5818, 99));

  // everyday spending that must not be mistaken for subscriptions
  for (let i = 1; i < 90; i += 3) push(addDays(today, -i), 'Сільпо', 5411, 300 + ((i * 37) % 400));
  for (let i = 2; i < 90; i += 7) push(addDays(today, -i), 'Bolt', 4121, 120 + ((i * 13) % 90));
  for (let i = 5; i < 90; i += 10) push(addDays(today, -i), 'Aroma Kava', 5814, 85);

  return items;
}
