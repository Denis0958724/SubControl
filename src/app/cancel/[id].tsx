import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Divider, Group, Header, Line, Screen, SectionTitle } from '../../components/Layout';
import { T } from '../../components/T';
import {
  APPLE_SUBSCRIPTIONS_URL,
  GENERIC_CANCEL_STEPS,
  GOOGLE_SUBSCRIPTIONS_URL,
  findService,
} from '../../lib/catalog';
import { formatDate, relativeDay, todayISO } from '../../lib/dates';
import { chargeUAH, formatUAH } from '../../lib/money';
import { useStore } from '../../store';
import { fonts, space, usePalette } from '../../theme';

function openUrl(url: string) {
  if (Platform.OS === 'web') {
    globalThis.open?.(url, '_blank');
    return;
  }
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}

export default function CancelGuide() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useStore((s) => s.subs.find((x) => x.id === id));
  const rates = useStore((s) => s.rates);
  const cancel = useStore((s) => s.cancel);
  const today = todayISO();

  if (!sub) {
    return (
      <Screen header={<Header onBack={() => router.back()} />}>
        <T variant="body" muted center>
          Цієї підписки вже немає у списку.
        </T>
      </Screen>
    );
  }

  const service = findService(sub.serviceId);
  const steps = service?.cancel.steps ?? GENERIC_CANCEL_STEPS;
  const url = service?.cancel.url;
  const stores =
    Platform.OS === 'ios'
      ? [{ title: 'Підписки App Store', url: APPLE_SUBSCRIPTIONS_URL }]
      : Platform.OS === 'android'
        ? [{ title: 'Підписки Google Play', url: GOOGLE_SUBSCRIPTIONS_URL }]
        : [
            { title: 'Підписки App Store', url: APPLE_SUBSCRIPTIONS_URL },
            { title: 'Підписки Google Play', url: GOOGLE_SUBSCRIPTIONS_URL },
          ];

  const done = () => {
    cancel(sub.id);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.dismissTo('/');
  };

  return (
    <Screen
      header={<Header onBack={() => router.back()} />}
      footer={<Button title="Я скасував(ла) підписку" icon="check" onPress={done} />}
    >
      <T variant="title">Скасувати {sub.name}</T>
      <T variant="body" muted>
        Наступне списання {formatUAH(chargeUAH(sub, rates))} — {formatDate(sub.nextCharge)},{' '}
        {relativeDay(sub.nextCharge, today)}. Скасуйте до цієї дати, і гроші не спишуться.
      </T>

      <Group style={styles.steps}>
        {steps.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[styles.num, { backgroundColor: p.cobaltSoft }]}>
              <T variant="label" color={p.cobalt} style={{ fontFamily: fonts.semibold }}>
                {i + 1}
              </T>
            </View>
            <T variant="body" style={styles.flex}>
              {step}
            </T>
          </View>
        ))}
        {url && (
          <Button title="Відкрити сторінку скасування" icon="external" onPress={() => openUrl(url)} kind="secondary" />
        )}
      </Group>

      <SectionTitle>Платите через телефон?</SectionTitle>
      <Group>
        {stores.map((s, i) => (
          <View key={s.url}>
            {i > 0 && <Divider inset={space(12)} />}
            <Line icon="external" title={s.title} onPress={() => openUrl(s.url)} />
          </View>
        ))}
      </Group>

      <View style={[styles.tip, { backgroundColor: p.amberSoft }]}>
        <Icon name="shield" size={22} color={p.amber} />
        <View style={styles.flex}>
          <T variant="heading" style={styles.tipTitle}>
            Сервіс не дає скасувати?
          </T>
          <T variant="body" color={p.inkSoft}>
            Напишіть у підтримку свого банку: там можуть зупинити регулярні списання цього продавця або допомогти
            оскаржити платіж, якщо гроші списали вже після скасування.
          </T>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  steps: { padding: space(4), gap: space(4), marginTop: space(2) },
  step: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', gap: space(3), borderRadius: 20, padding: space(4), marginTop: space(4) },
  tipTitle: { marginBottom: space(1) },
});
