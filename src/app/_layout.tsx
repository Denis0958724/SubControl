import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold } from '@expo-google-fonts/onest';
import { Unbounded_400Regular, Unbounded_600SemiBold, useFonts } from '@expo-google-fonts/unbounded';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';

import { preloadSounds } from '../lib/feedback';
import { ACTION_CANCEL, clearBadge, rescheduleAll, setupNotifications } from '../lib/notifications';
import { initPurchases } from '../lib/purchases';
import { fetchRates } from '../lib/rates';
import { useStore } from '../store';
import { usePalette } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** The browser preview ships fonts inside the page, so it skips loading them from files. */
const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1';
const RATES_MAX_AGE_MS = 6 * 3600 * 1000;

export default function RootLayout() {
  const p = usePalette();
  const scheme = useColorScheme();
  const hydrated = useStore((s) => s.hydrated);
  const [fontsLoaded, fontError] = useFonts(
    PREVIEW
      ? {}
      : { Unbounded_400Regular, Unbounded_600SemiBold, Onest_400Regular, Onest_500Medium, Onest_600SemiBold },
  );
  const ready = hydrated && (PREVIEW || fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Pro status comes from the store: renewals, refunds and cancellations land here.
  useEffect(() => {
    if (!hydrated) return;
    initPurchases((isPro) => useStore.getState().setPro(isPro));
    preloadSounds();
  }, [hydrated]);

  // Fresh exchange rates, at most every few hours.
  useEffect(() => {
    if (!hydrated) return;
    const { rates, setRates } = useStore.getState();
    if (Date.now() - new Date(rates.updatedAt).getTime() < RATES_MAX_AGE_MS) return;
    fetchRates().then(setRates).catch(() => {});
  }, [hydrated]);

  // Keep scheduled reminders in sync with the list.
  useEffect(() => {
    if (!hydrated || Platform.OS === 'web') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { subs, settings, rates } = useStore.getState();
        rescheduleAll(subs, settings, rates).catch(() => {});
      }, 400);
    };
    setupNotifications().then(sync).catch(() => {});
    const unsub = useStore.subscribe((state, prev) => {
      if (state.subs !== prev.subs || state.settings !== prev.settings || state.rates !== prev.rates) sync();
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  // The red badge on the app icon stays until SubControl is opened.
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    clearBadge();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && clearBadge());
    return () => sub.remove();
  }, [ready]);

  // "Скасувати" in a reminder opens the cancel guide; tapping the reminder opens the subscription.
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const subId = response?.notification.request.content.data?.subId;
      if (typeof subId !== 'string') return;
      if (!useStore.getState().subs.some((s) => s.id === subId)) return;
      if (response!.actionIdentifier === ACTION_CANCEL) router.push(`/cancel/${subId}`);
      else if (response!.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) router.push(`/sub/${subId}`);
    };
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        open(r);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: p.paper },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="pro" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
