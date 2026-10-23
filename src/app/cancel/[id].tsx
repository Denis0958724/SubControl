import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/Button';
import { Divider, Group, Header, IconTile, Line, ROW_INSET, Screen, SectionTitle } from '../../components/Layout';
import { Monogram } from '../../components/Monogram';
import { FadeIn, stagger } from '../../components/Motion';
import { T } from '../../components/T';
import {
  APPLE_SUBSCRIPTIONS_URL,
  GENERIC_CANCEL_STEPS,
  GOOGLE_SUBSCRIPTIONS_URL,
  findService,
} from '../../lib/catalog';
import { formatDate, relativeDay, todayISO } from '../../lib/dates';
import { chargeUAH, formatUAH, yearlyUAH } from '../../lib/money';
import { feedback } from '../../lib/feedback';
import { STORE } from '../../lib/links';
import { openExternal } from '../../lib/open';
import { celebrate, toast } from '../../lib/toast';
import { useStore } from '../../store';
import { fonts, radius, space, usePalette } from '../../theme';

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
  const yearly = yearlyUAH(sub, rates);
  // each phone only talks about its own store
  const stores =
    STORE === 'ios'
      ? [{ title: 'Підписки App Store', url: APPLE_SUBSCRIPTIONS_URL }]
      : STORE === 'android'
        ? [{ title: 'Підписки Google Play', url: GOOGLE_SUBSCRIPTIONS_URL }]
        : [
            { title: 'Підписки App Store', url: APPLE_SUBSCRIPTIONS_URL },
            { title: 'Підписки Google Play', url: GOOGLE_SUBSCRIPTIONS_URL },
          ];

  const done = () => {
    cancel(sub.id);
    feedback('success');
    celebrate();
    toast({ title: `Мінус ${formatUAH(yearly)} на рік`, text: `${sub.name} більше не рахуємо. Так і треба.`, tone: 'saved' });
    router.dismissTo('/');
  };

  return (
    <Screen
      header={<Header onBack={() => router.back()} />}
      footer={<Button title="Готово, скасував(ла)" icon="check" onPress={done} sound={false} />}
    >
      <FadeIn style={styles.head}>
        <Monogram name={sub.name} color={sub.color} size={52} />
        <View style={styles.flex}>
          <T variant="title">Скасувати {sub.name}</T>
          <T variant="label" muted>
            {formatUAH(chargeUAH(sub, rates))} спишуть {formatDate(sub.nextCharge)}, {relativeDay(sub.nextCharge, today)}
          </T>
        </View>
      </FadeIn>

      <FadeIn delay={80}>
        <View style={[styles.win, { backgroundColor: p.greenSoft }]}>
          <IconTile icon="wallet" tint="green" size={40} />
          <View style={styles.flex}>
            <T variant="caption" color={p.green} style={styles.winLabel}>
              Встигнете до списання, і за рік залишиться
            </T>
            <T style={[styles.winValue, { color: p.green }]}>{formatUAH(yearly)}</T>
          </View>
        </View>
      </FadeIn>

      <SectionTitle>Як це зробити</SectionTitle>
      <Group style={styles.steps}>
        {steps.map((step, i) => (
          <FadeIn key={step} delay={stagger(i, 70) + 140} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.num, { backgroundColor: p.cobalt }]}>
                <T variant="label" color={p.onCobalt} style={styles.numText}>
                  {i + 1}
                </T>
              </View>
              {i < steps.length - 1 && <View style={[styles.line, { backgroundColor: p.cobaltSoft }]} />}
            </View>
            <T variant="body" style={[styles.flex, styles.stepText]}>
              {step}
            </T>
          </FadeIn>
        ))}
        {url && (
          <Button
            title="Відкрити сторінку скасування"
            icon="external"
            onPress={() => openExternal(url)}
            kind="secondary"
            style={styles.open}
          />
        )}
      </Group>

      <SectionTitle>Платите через телефон?</SectionTitle>
      <Group>
        {stores.map((s, i) => (
          <View key={s.url}>
            {i > 0 && <Divider inset={ROW_INSET} />}
            <Line icon="external" tint="ink" title={s.title} onPress={() => openExternal(s.url)} />
          </View>
        ))}
      </Group>

      <View style={[styles.tip, { backgroundColor: p.amberSoft }]}>
        <IconTile icon="shield" tint="amber" size={36} />
        <View style={styles.flex}>
          <T variant="heading" style={styles.tipTitle}>
            Сервіс не відпускає?
          </T>
          <T variant="body" color={p.inkSoft}>
            Напишіть у підтримку свого банку. Там можуть зупинити регулярні списання цього продавця або допомогти
            повернути гроші, якщо їх списали вже після скасування.
          </T>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingTop: space(2) },
  win: { flexDirection: 'row', alignItems: 'center', gap: space(3), borderRadius: radius.card, padding: space(4) },
  winLabel: { fontFamily: fonts.semibold },
  winValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  steps: { padding: space(4), gap: 0 },
  step: { flexDirection: 'row', gap: space(3), alignItems: 'stretch' },
  rail: { alignItems: 'center', width: 28 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.semibold },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 4, borderRadius: 1 },
  stepText: { paddingTop: 2, paddingBottom: space(4) },
  open: { marginTop: space(1) },
  tip: { flexDirection: 'row', gap: space(3), borderRadius: radius.card, padding: space(4), marginTop: space(4) },
  tipTitle: { marginBottom: space(1) },
});
