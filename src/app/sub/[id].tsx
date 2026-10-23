import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Button, IconButton } from '../../components/Button';
import { Divider, Group, Header, Line, ROW_INSET, Screen } from '../../components/Layout';
import { Monogram } from '../../components/Monogram';
import { FadeIn, useReducedMotion } from '../../components/Motion';
import { T } from '../../components/T';
import { Toggle } from '../../components/Toggle';
import { feedback } from '../../lib/feedback';
import { CYCLE_LABEL, cycleProgress, diffDays, formatDate, plural, todayISO } from '../../lib/dates';
import { chargeUAH, formatMoney, formatUAH, monthlyUAH, yearlyUAH } from '../../lib/money';
import { ensurePermission } from '../../lib/notifications';
import { RATE_SOURCE_LABEL } from '../../lib/rates';
import { toast } from '../../lib/toast';
import { useStore } from '../../store';
import { fonts, radius, space, usePalette } from '../../theme';

export default function SubscriptionScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useStore((s) => s.subs.find((x) => x.id === id));
  const rates = useStore((s) => s.rates);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
  const putBack = useStore((s) => s.putBack);
  const restore = useStore((s) => s.restore);
  const acknowledge = useStore((s) => s.acknowledge);
  const acknowledged = useStore((s) => s.acknowledged);
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

  const cancelled = sub.status === 'cancelled';
  const days = diffDays(today, sub.nextCharge);
  const decide = !cancelled && days >= 0 && days <= 1;
  const answered = acknowledged[sub.id] === sub.nextCharge;
  const charge = chargeUAH(sub, rates);
  const lead = settings.leadDays;
  const remindHint =
    `за ${lead === 1 ? 'день' : `${lead} ${plural(lead, ['день', 'дні', 'днів'])}`} о ${settings.hour}:00` +
    (settings.dayOf ? ' і в день списання' : '');

  // no "are you sure?": it goes at once, and the toast offers it back
  const onDelete = () => {
    const index = useStore.getState().subs.findIndex((s) => s.id === sub.id);
    const copy = sub;
    feedback('cancel');
    router.back();
    remove(sub.id);
    toast({
      title: `${copy.name} прибрано зі списку`,
      text: 'У самому сервісі підписка не скасувалась.',
      icon: 'trash',
      action: { label: 'Повернути', run: () => putBack(copy, index) },
    });
  };

  return (
    <Screen
      header={
        <Header
          onBack={() => router.back()}
          right={
            <IconButton
              icon="edit"
              label="Редагувати"
              onPress={() => router.push({ pathname: '/edit', params: { id: sub.id } })}
            />
          }
        />
      }
    >
      <View style={styles.hero}>
        <Glow color={sub.color} faded={cancelled} />
        <FadeIn from={10}>
          <Monogram name={sub.name} color={sub.color} size={76} faded={cancelled} />
        </FadeIn>
        <FadeIn delay={60} style={styles.heroText}>
          <T variant="title" center>
            {sub.name}
          </T>
          <T variant="hero" center color={cancelled ? p.muted : p.ink} style={[styles.amount, cancelled && styles.strike]}>
            {formatUAH(charge)}
          </T>
          <T variant="label" muted center>
            {cancelled
              ? `Скасовано ${sub.cancelledAt ? formatDate(sub.cancelledAt) : ''}`
              : sub.currency !== 'UAH'
                ? `${CYCLE_LABEL[sub.cycle]}, ${formatMoney(sub.amount, sub.currency)} ${RATE_SOURCE_LABEL[rates.source]}`
                : CYCLE_LABEL[sub.cycle]}
          </T>
        </FadeIn>
      </View>

      {!cancelled && (
        <FadeIn delay={120}>
          <Countdown
            days={days}
            date={formatDate(sub.nextCharge)}
            progress={cycleProgress(sub.nextCharge, sub.cycle, sub.anchorDay, today)}
            color={sub.color}
          />
        </FadeIn>
      )}

      {decide && (
        <FadeIn delay={160}>
          <View style={[styles.decide, { backgroundColor: answered ? p.greenSoft : p.amberSoft }]}>
            <T variant="heading">
              {days === 0 ? 'Сьогодні' : 'Завтра'} {sub.name} спише {formatUAH(charge)}
            </T>
            {answered ? (
              <T variant="caption" color={p.inkSoft}>
                Ви вирішили продовжити. Наступне нагадування буде перед наступним списанням.
              </T>
            ) : (
              <>
                <T variant="caption" color={p.inkSoft}>
                  Ще користуєтесь? Якщо ні, скасуйте зараз, поки гроші на місці.
                </T>
                <View style={styles.decideRow}>
                  <Button
                    title="Продовжую"
                    kind="secondary"
                    compact
                    sound="success"
                    style={styles.flex}
                    onPress={() => {
                      acknowledge(sub.id);
                      toast({ title: 'Домовились', text: 'До наступного списання більше не нагадую.', tone: 'success' });
                    }}
                  />
                  <Button
                    title="Скасувати"
                    kind="danger"
                    compact
                    style={styles.flex}
                    onPress={() => router.push(`/cancel/${sub.id}`)}
                  />
                </View>
              </>
            )}
          </View>
        </FadeIn>
      )}

      {!cancelled && (
        <FadeIn delay={200}>
          <Group>
            <Line icon="wallet" tint="violet" title="На місяць" value={formatUAH(monthlyUAH(sub, rates))} />
            <Divider inset={ROW_INSET} />
            <Line icon="card" tint="green" title="На рік" value={formatUAH(yearlyUAH(sub, rates))} />
            {sub.sharedWith > 1 && (
              <>
                <Divider inset={ROW_INSET} />
                <Line
                  icon="users"
                  tint="amber"
                  title="Ваша частка"
                  hint={`Ділите на ${sub.sharedWith} ${plural(sub.sharedWith, ['людину', 'людини', 'людей'])}`}
                  value={formatUAH(charge / sub.sharedWith)}
                />
              </>
            )}
            <Divider inset={ROW_INSET} />
            <Line
              icon="bell"
              title="Нагадування"
              hint={sub.remind ? remindHint : 'Вимкнено. Списання буде сюрпризом'}
              right={
                <Toggle
                  value={sub.remind}
                  label="Нагадування"
                  onChange={async (v) => {
                    update(sub.id, { remind: v });
                    if (v) await ensurePermission().catch(() => false);
                  }}
                />
              }
            />
          </Group>
        </FadeIn>
      )}

      {cancelled && (
        <FadeIn delay={120}>
          <View style={[styles.savedCard, { backgroundColor: p.greenSoft }]}>
            <T variant="caption" color={p.green} style={styles.savedLabel}>
              Економія
            </T>
            <T style={[styles.savedValue, { color: p.green }]}>{formatUAH(yearlyUAH(sub, rates))} на рік</T>
            <T variant="caption" color={p.inkSoft}>
              Більше не рахуємо в сумі й не нагадуємо.
            </T>
          </View>
        </FadeIn>
      )}

      <FadeIn delay={260} style={styles.actions}>
        {cancelled ? (
          <Button
            title="Відновити підписку"
            kind="secondary"
            icon="refresh"
            sound="success"
            onPress={() => {
              restore(sub.id);
              toast({ title: `${sub.name} знову в списку`, text: 'Нагадування теж повернулися.', tone: 'success' });
            }}
          />
        ) : (
          <Button title="Як скасувати" icon="close" kind="secondary" onPress={() => router.push(`/cancel/${sub.id}`)} />
        )}
        <Button title="Прибрати зі списку" kind="ghost" onPress={onDelete} />
      </FadeIn>
    </Screen>
  );
}

/** A soft wash of the service's colour behind the hero. */
function Glow({ color, faded }: { color: string; faded?: boolean }) {
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={faded ? 0.06 : 0.16} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" rx={radius.sheet} fill={`url(#${id})`} />
    </Svg>
  );
}

/** "Next charge in 5 days" with a bar of the billing period already used up. */
function Countdown({ days, date, progress, color }: { days: number; date: string; progress: number; color: string }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const fill = useRef(new Animated.Value(reduce ? progress : 0)).current;
  useEffect(() => {
    if (reduce) {
      fill.setValue(progress);
      return;
    }
    const a = Animated.timing(fill, {
      toValue: progress,
      duration: 800,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [fill, progress, reduce]);
  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const big = days === 0 ? 'Сьогодні' : days === 1 ? 'Завтра' : `${days} ${plural(days, ['день', 'дні', 'днів'])}`;
  const soon = days <= 3;
  return (
    <View style={[styles.countdown, { backgroundColor: p.sheet }]} accessible accessibilityLabel={`Наступне списання ${date}, ${big.toLowerCase()}`}>
      <View style={styles.countHead}>
        <View>
          <T variant="caption" muted>
            {days <= 1 ? 'Списання' : 'До списання'}
          </T>
          <T style={[styles.countBig, { color: soon ? p.amber : p.ink }]}>{big}</T>
        </View>
        <View style={styles.countDate}>
          <T variant="caption" muted>
            Дата
          </T>
          <T variant="heading">{date}</T>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: p.track }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: soon ? p.amber : color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space(3), paddingTop: space(5), paddingBottom: space(4), borderRadius: radius.sheet },
  heroText: { alignItems: 'center', gap: space(1) },
  amount: { marginTop: space(2), fontVariant: ['tabular-nums'] },
  strike: { textDecorationLine: 'line-through' },
  actions: { gap: space(2), marginTop: space(2) },
  flex: { flex: 1 },
  decide: { borderRadius: radius.card, padding: space(4), gap: space(2) },
  decideRow: { flexDirection: 'row', gap: space(2), marginTop: space(1) },
  countdown: { borderRadius: radius.sheet, padding: space(4), gap: space(3) },
  countHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  countBig: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  countDate: { alignItems: 'flex-end' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  savedCard: { borderRadius: radius.sheet, padding: space(5), gap: space(1), alignItems: 'center' },
  savedLabel: { fontFamily: fonts.semibold },
  savedValue: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
});
