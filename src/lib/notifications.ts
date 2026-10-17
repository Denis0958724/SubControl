import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { addDays, fromISO, plural } from './dates';
import { chargeUAH, formatUAH } from './money';
import type { ISODate, Rates, Settings, Subscription } from './types';

/**
 * Reminders that are hard to miss.
 *
 * Android: a channel with the highest importance (pops up over other apps and on the lock screen),
 * its own sound, a long vibration, the light, and the colour app icon next to the text.
 * "Loud" mode plays the sound through the alarm stream, so it rings in silent mode too.
 *
 * iPhone: Time Sensitive (breaks through Focus and stays on top of the lock screen), its own sound,
 * a badge on the app icon. Nothing but Apple's critical alerts can ring with the silent switch on,
 * and those are only granted to medical and safety apps; the phone still vibrates.
 *
 * Both: one reminder ahead of time and one more on the day of the charge.
 */
export const REMINDER_CATEGORY = 'charge_reminder';
export const ACTION_KEEP = 'keep';
export const ACTION_CANCEL = 'cancel';

/** Android channels can't change once created, so new behaviour means new channel ids. */
const CHANNEL = 'charges';
const CHANNEL_LOUD = 'charges-loud';
const OLD_CHANNELS = ['reminders'];
const SOUND = 'reminder.wav';
const VIBRATION = [0, 500, 200, 500, 200, 900];
const COLOR = '#2F4BFF';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function setupNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    const common = {
      importance: Notifications.AndroidImportance.MAX,
      sound: SOUND,
      vibrationPattern: VIBRATION,
      enableVibrate: true,
      enableLights: true,
      lightColor: COLOR,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    };
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      ...common,
      name: 'Нагадування про списання',
      description: 'За день до списання і в день списання',
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_LOUD, {
      ...common,
      name: 'Гучні нагадування про списання',
      description: 'Звучать навіть на беззвучному, як будильник',
      bypassDnd: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
    for (const id of OLD_CHANNELS) await Notifications.deleteNotificationChannelAsync(id).catch(() => {});
  }
  // Two buttons right in the notification: keep paying or go cancel.
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    { identifier: ACTION_KEEP, buttonTitle: 'Продовжую', options: { opensAppToForeground: false } },
    { identifier: ACTION_CANCEL, buttonTitle: 'Скасувати', options: { opensAppToForeground: true } },
  ]);
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function permissionState(): Promise<PermissionState> {
  if (!supported) return 'denied';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (asked.granted) await askExactAlarms();
  return asked.granted;
}

/** Android 12+: without this, the system may shift a reminder by several minutes to save battery. */
export async function exactAlarmsAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

export async function askExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if (await exactAlarmsAllowed()) return true;
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Opens the system settings of SubControl, where notifications can be switched back on. */
export function openNotificationSettings() {
  Linking.openSettings().catch(() => {});
}

export async function clearBadge() {
  if (!supported) return;
  await Notifications.setBadgeCountAsync(0).catch(() => false);
}

function dayWord(days: number) {
  if (days === 0) return 'Сьогодні';
  if (days === 1) return 'Завтра';
  return `Через ${days} ${plural(days, ['день', 'дні', 'днів'])}`;
}

export function reminderText(sub: Subscription, daysBefore: number, rates: Rates) {
  const amount = formatUAH(chargeUAH(sub, rates));
  return daysBefore === 0
    ? {
        title: `Сьогодні ${sub.name} спише ${amount}`,
        body: 'Якщо підписка вже не потрібна, ще є шанс скасувати до списання.',
      }
    : {
        title: `${dayWord(daysBefore)} ${sub.name} спише ${amount}`,
        body: 'Ще користуєтесь? Якщо ні, скасуйте зараз, поки гроші на місці.',
      };
}

function content(sub: Subscription, daysBefore: number, rates: Rates, badge: number): Notifications.NotificationContentInput {
  return {
    ...reminderText(sub, daysBefore, rates),
    sound: SOUND,
    badge,
    color: COLOR,
    priority: Notifications.AndroidNotificationPriority.MAX,
    vibrate: VIBRATION,
    interruptionLevel: 'timeSensitive',
    categoryIdentifier: REMINDER_CATEGORY,
    data: { subId: sub.id, daysBefore },
  };
}

const channelFor = (settings: Settings) => (settings.loud ? CHANNEL_LOUD : CHANNEL);

/** Re-creates every reminder from scratch. Cheap enough to run after any change. */
export async function rescheduleAll(
  subs: Subscription[],
  settings: Settings,
  rates: Rates,
  acknowledged: Record<string, ISODate> = {},
): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const offsets = settings.dayOf ? [settings.leadDays, 0] : [settings.leadDays];
  const due = subs
    // "Продовжую" already answered this charge: no more reminders until the next one
    .filter((s) => s.status === 'active' && s.remind && acknowledged[s.id] !== s.nextCharge)
    .flatMap((s) =>
      offsets.map((daysBefore) => {
        const at = fromISO(addDays(s.nextCharge, -daysBefore));
        at.setHours(settings.hour, 0, 0, 0);
        return { s, at, daysBefore };
      }),
    )
    .filter(({ at }) => at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 60); // iOS keeps at most 64 pending local notifications

  for (const { s, at, daysBefore } of due) {
    await Notifications.scheduleNotificationAsync({
      identifier: `charge-${s.id}-${daysBefore}`,
      content: content(s, daysBefore, rates, 1),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: channelFor(settings),
      },
    });
  }
}

/** Shows a real reminder in a few seconds, so people can see and hear what it will look like. */
export async function sendTestReminder(sub: Subscription | undefined, settings: Settings, rates: Rates) {
  const sample: Subscription = sub ?? {
    id: 'test',
    name: 'Netflix',
    amount: 9.99,
    currency: 'USD',
    cycle: 'month',
    nextCharge: addDays(new Date().toISOString().slice(0, 10), 1),
    anchorDay: 1,
    color: '#E50914',
    remind: true,
    status: 'active',
    sharedWith: 1,
    source: 'manual',
    createdAt: new Date().toISOString().slice(0, 10),
  };
  await Notifications.scheduleNotificationAsync({
    identifier: 'test-reminder',
    content: { ...content(sample, settings.leadDays, rates, 1), data: { subId: sub?.id ?? '', test: true } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: channelFor(settings),
    },
  });
}
