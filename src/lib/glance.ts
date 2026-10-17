import { Platform } from 'react-native';

import type { ChargeActivityProps } from '../widgets/ChargeActivity';
import type { NextChargeProps } from '../widgets/NextChargeWidget';
import { addDays, diffDays, formatDate, fromISO, plural, todayISO } from './dates';
import { chargeUAH, formatUAH, monthlyUAH } from './money';
import type { ISODate, Rates, Settings, Subscription } from './types';

/**
 * iPhone extras that keep a charge in sight without opening the app:
 * a Live Activity (lock screen and Dynamic Island) for a charge today or tomorrow,
 * and the "Наступне списання" widget for the home and lock screens.
 *
 * A Live Activity can only start while the app is open (starting one from the background needs
 * a server with push, which SubControl does not have). So it starts when the app opens, for
 * example from the reminder, and the system keeps it for up to 8 hours.
 */
type LiveActivityHandle = {
  update(props: ChargeActivityProps, staleDate?: Date): Promise<void>;
  end(dismissalPolicy?: 'default' | 'immediate'): Promise<void>;
};
type Modules = {
  activity: {
    start(props: ChargeActivityProps, url?: string, staleDate?: Date): LiveActivityHandle;
    getInstances(): LiveActivityHandle[];
  };
  widget: { updateTimeline(entries: { date: Date; props: NextChargeProps }[]): void };
};

let modules: Modules | null | undefined;

function load(): Modules | null {
  if (modules !== undefined) return modules;
  if (Platform.OS !== 'ios') return (modules = null);
  try {
    modules = {
      activity: require('../widgets/ChargeActivity').default,
      widget: require('../widgets/NextChargeWidget').default,
    };
  } catch {
    modules = null; // Expo Go or an older build without the widget extension
  }
  return modules;
}

function whenLabel(charge: ISODate, day: ISODate): string {
  const d = diffDays(day, charge);
  if (d <= 0) return 'сьогодні';
  if (d === 1) return 'завтра';
  if (d < 7) return `через ${d} ${plural(d, ['день', 'дні', 'днів'])}`;
  return formatDate(charge);
}

const active = (subs: Subscription[]) =>
  subs.filter((s) => s.status === 'active').sort((a, b) => a.nextCharge.localeCompare(b.nextCharge));

function widgetProps(subs: Subscription[], rates: Rates, day: ISODate): NextChargeProps {
  const list = active(subs);
  const monthly = list.reduce((sum, s) => sum + monthlyUAH(s, rates), 0);
  const next = list.find((s) => s.nextCharge >= day);
  return {
    name: next?.name ?? '',
    amount: next ? formatUAH(chargeUAH(next, rates)) : '',
    when: next ? whenLabel(next.nextCharge, day) : '',
    monthly: `${formatUAH(monthly)} на місяць`,
    color: next?.color ?? '#2F4BFF',
    subId: next?.id ?? '',
  };
}

/** The charge worth a Live Activity right now: today or tomorrow, reminders on, not answered yet. */
export function liveActivityTarget(
  subs: Subscription[],
  acknowledged: Record<string, ISODate>,
  today: ISODate = todayISO(),
): Subscription | undefined {
  return active(subs).find(
    (s) => s.remind && diffDays(today, s.nextCharge) <= 1 && diffDays(today, s.nextCharge) >= 0 && acknowledged[s.id] !== s.nextCharge,
  );
}

export function syncGlance(
  subs: Subscription[],
  rates: Rates,
  settings: Settings,
  acknowledged: Record<string, ISODate>,
): void {
  const m = load();
  if (!m) return;
  const today = todayISO();

  // Widget: one timeline entry per midnight for the next week, so "завтра" becomes "сьогодні" on time.
  try {
    const entries = Array.from({ length: 8 }, (_, i) => {
      const day = addDays(today, i);
      return { date: i === 0 ? new Date() : fromISO(day), props: widgetProps(subs, rates, day) };
    });
    m.widget.updateTimeline(entries);
  } catch {
    // widgets are a bonus, never a reason to fail
  }

  // Live Activity
  try {
    const target = settings.liveActivity ? liveActivityTarget(subs, acknowledged, today) : undefined;
    const running = m.activity.getInstances();
    if (!target) {
      running.forEach((a) => a.end('immediate').catch(() => {}));
      return;
    }
    const chargeDay = fromISO(target.nextCharge);
    const props: ChargeActivityProps = {
      subId: target.id,
      name: target.name,
      amount: formatUAH(chargeUAH(target, rates)),
      when: (target.nextCharge === today ? 'today' : 'tomorrow') as ChargeActivityProps['when'],
      chargeAt: chargeDay.getTime(),
      color: target.color,
    };
    const staleDate = fromISO(addDays(target.nextCharge, 1));
    if (running.length) {
      running[0].update(props, staleDate).catch(() => {});
      running.slice(1).forEach((a) => a.end('immediate').catch(() => {}));
    } else {
      m.activity.start(props, `subcontrol://sub/${target.id}`, staleDate);
    }
  } catch {
    // Live Activities switched off in iOS settings, or the app is not in the foreground
  }
}
