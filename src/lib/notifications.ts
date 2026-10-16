import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { addDays, fromISO, plural } from './dates';
import { chargeUAH, formatUAH } from './money';
import type { Rates, Settings, Subscription } from './types';

export const REMINDER_CATEGORY = 'charge_reminder';
export const ACTION_KEEP = 'keep';
export const ACTION_CANCEL = 'cancel';
const CHANNEL = 'reminders';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function setupNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Нагадування про списання',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  // Two buttons right in the notification: keep paying or go cancel.
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    { identifier: ACTION_KEEP, buttonTitle: 'Продовжую', options: { opensAppToForeground: false } },
    { identifier: ACTION_CANCEL, buttonTitle: 'Скасувати', options: { opensAppToForeground: true } },
  ]);
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function reminderTitle(sub: Subscription, leadDays: number, rates: Rates): string {
  const when =
    leadDays === 1 ? 'Завтра' : `Через ${leadDays} ${plural(leadDays, ['день', 'дні', 'днів'])}`;
  return `${when} ${sub.name} спише ${formatUAH(chargeUAH(sub, rates))}`;
}

/** Re-creates every reminder from scratch. Cheap enough to run after any change. */
export async function rescheduleAll(subs: Subscription[], settings: Settings, rates: Rates): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const due = subs
    .filter((s) => s.status === 'active' && s.remind)
    .map((s) => {
      const at = fromISO(addDays(s.nextCharge, -settings.leadDays));
      at.setHours(settings.hour, 0, 0, 0);
      return { s, at };
    })
    .filter(({ at }) => at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 60); // iOS keeps at most 64 pending local notifications

  for (const { s, at } of due) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminderTitle(s, settings.leadDays, rates),
        body: 'Продовжуєте чи скасувати?',
        categoryIdentifier: REMINDER_CATEGORY,
        data: { subId: s.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: CHANNEL,
      },
    });
  }
}
