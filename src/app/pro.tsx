import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Button, CobaltFill, tap } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { Header, IconTile, Screen } from '../components/Layout';
import { FadeIn, PressableScale, stagger, useReducedMotion } from '../components/Motion';
import { T } from '../components/T';
import { inform } from '../lib/confirm';
import { feedback } from '../lib/feedback';
import { STORE_NAME, TERMS_URL } from '../lib/links';
import { openExternal } from '../lib/open';
import { plural } from '../lib/dates';
import {
  BILLING,
  PurchaseError,
  fallbackPlans,
  loadPlans,
  purchase,
  restorePurchases,
  type Plan,
  type PlanId,
} from '../lib/purchases';
import { FREE_LIMIT, useStore } from '../store';
import { fonts, radius, space, usePalette, type Tint } from '../theme';

const FEATURES: { icon: IconName; tint: Tint; title: string; text: string }[] = [
  { icon: 'bolt', tint: 'violet', title: 'Автопошук підписок', text: 'У виписці monobank, ПриватБанку та інших' },
  { icon: 'users', tint: 'amber', title: 'Платимо разом', text: 'Скільки з кожного' },
  { icon: 'bell', tint: 'cobalt', title: 'Нагадування за 3 дні або тиждень', text: '' },
  { icon: 'card', tint: 'green', title: 'Без ліміту підписок', text: `Безкоштовно до ${FREE_LIMIT}` },
  { icon: 'download', tint: 'ink', title: 'Таблиця для Excel', text: '' },
];

const months = (n: number) => `${n} ${plural(n, ['місяць', 'місяці', 'місяців'])}`;

export default function Pro() {
  const p = usePalette();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const setPro = useStore((s) => s.setPro);
  const isPro = useStore((s) => s.isPro);
  const [plans, setPlans] = useState<Plan[] | null>(BILLING === 'store' ? null : fallbackPlans());
  const [planId, setPlanId] = useState<PlanId>('monthly');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (BILLING === 'store') loadPlans().then(setPlans);
  }, []);

  const plan = plans?.find((x) => x.id === planId) ?? plans?.[0];

  const done = () => {
    feedback('success');
    setPro(true);
    router.back();
  };

  const buy = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const result = await purchase(plan);
      if (result === 'pro') done();
      else if (result === 'test') {
        done();
        inform('Тестова збірка', `Pro увімкнено безкоштовно. У версії з ${STORE_NAME} тут буде справжня оплата.`);
      } else if (result === 'off') {
        inform('Оплата ще не працює', 'Магазин поки не підключений. Спробуйте в наступній версії.');
      }
    } catch (e) {
      inform('Не вийшло', e instanceof PurchaseError ? e.message : 'Спробуйте ще раз трохи згодом.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      if (await restorePurchases()) done();
      else inform('Покупок не знайдено', `На цьому акаунті ${STORE_NAME} ще немає SubControl Pro.`);
    } catch {
      inform('Не вийшло', 'Немає звʼязку з магазином. Спробуйте ще раз.');
    } finally {
      setRestoring(false);
    }
  };

  const cta = !plan
    ? 'Оформити'
    : plan.id === 'yearly'
      ? `Оформити за ${plan.price} на рік`
      : `Оформити за ${plan.promoPrice ?? plan.price} на місяць`;

  const terms = !plan
    ? ''
    : plan.id === 'yearly'
      ? `${plan.price} раз на рік.`
      : plan.promoPrice && plan.promoMonths
        ? `${plan.promoPrice} на місяць перші ${months(plan.promoMonths)}, далі ${plan.price} на місяць.`
        : `${plan.price} на місяць.`;

  return (
    <Screen
      header={<Header onBack={() => router.back()} backIcon="close" />}
      footer={
        isPro ? (
          <Button title="Pro вже активний" onPress={() => router.back()} kind="secondary" />
        ) : (
          <View style={styles.footer}>
            <Button title={cta} onPress={buy} loading={busy} disabled={!plan} sound={false} />
            <Button title="Відновити покупки" kind="ghost" compact onPress={restore} loading={restoring} />
          </View>
        )
      }
    >
      {reason === 'limit' && (
        <View style={[styles.note, { backgroundColor: p.amberSoft }]}>
          <T variant="label" color={p.ink}>
            Безкоштовно можна вести до {FREE_LIMIT} підписок.
          </T>
        </View>
      )}

      <FadeIn>
        <View style={[styles.hero, { shadowColor: p.cobalt }]}>
          <CobaltFill radius={radius.sheet} />
          <Sparkle />
          <T variant="title" color="#FFFFFF">
            SubControl Pro
          </T>
        </View>
      </FadeIn>

      {plans === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={p.cobalt} />
        </View>
      ) : plans.length === 0 ? (
        <View style={[styles.note, { backgroundColor: p.redSoft }]}>
          <T variant="label" color={p.red}>
            Магазин зараз не відповідає. Перевірте інтернет і відкрийте цей екран ще раз.
          </T>
        </View>
      ) : (
        !isPro && (
          <View style={styles.plans}>
            {plans.map((x, i) => (
              <FadeIn key={x.id} delay={stagger(i + 1, 70)}>
                <PlanCard
                  plan={x}
                  selected={x.id === plan?.id}
                  onPress={() => {
                    tap();
                    setPlanId(x.id);
                  }}
                />
              </FadeIn>
            ))}
          </View>
        )
      )}

      <View style={styles.list}>
        {FEATURES.map((f, i) => (
          <FadeIn key={f.title} delay={stagger(i + 3, 50)} style={styles.feature}>
            <IconTile icon={f.icon} tint={f.tint} size={44} />
            <View style={styles.flex}>
              <T variant="heading" style={{ fontSize: 16 }}>
                {f.title}
              </T>
              {f.text !== '' && (
                <T variant="caption" muted>
                  {f.text}
                </T>
              )}
            </View>
          </FadeIn>
        ))}
      </View>

      <T variant="caption" muted style={styles.legal}>
        Безкоштовно назавжди: список, суми в гривнях, нагадування за день, інструкції скасування.
      </T>
      {!isPro && plan && (
        <T variant="caption" muted style={styles.legalTight}>
          {terms} Підписка продовжується сама, поки ви її не скасуєте. Скасувати можна будь-коли в налаштуваннях{' '}
          {STORE_NAME}, щонайменше за добу до кінця періоду.
        </T>
      )}
      <View style={styles.links}>
        <TextLink title="Умови використання" onPress={() => openExternal(TERMS_URL)} />
        <TextLink title="Конфіденційність" onPress={() => router.push('/privacy')} />
      </View>
    </Screen>
  );
}

function PlanCard({ plan, selected, onPress }: { plan: Plan; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  const yearly = plan.id === 'yearly';
  const badge = yearly
    ? plan.savePercent && plan.savePercent > 0
      ? `−${plan.savePercent}%`
      : undefined
    : plan.promoPrice
      ? 'Акція'
      : undefined;
  const hint = yearly
    ? plan.perMonth
      ? `Виходить ${plan.perMonth} на місяць`
      : 'Один платіж на рік'
    : plan.promoPrice && plan.promoMonths
      ? `Перші ${months(plan.promoMonths)}, далі ${plan.price}`
      : 'Можна скасувати будь-коли';

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${yearly ? 'На рік' : 'На місяць'}, ${plan.promoPrice ?? plan.price}. ${hint}`}
      onPress={onPress}
      to={0.98}
      style={[
        styles.plan,
        {
          backgroundColor: selected ? p.cobaltSoft : p.sheet,
          borderColor: selected ? p.cobalt : p.line,
        },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? p.cobalt : p.line }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: p.cobalt }]} />}
      </View>
      <View style={styles.flex}>
        <View style={styles.planTitle}>
          <T variant="heading" style={{ fontSize: 16 }}>
            {yearly ? 'На рік' : 'На місяць'}
          </T>
          {badge && (
            <View style={[styles.badge, { backgroundColor: yearly ? p.greenSoft : p.amberSoft }]}>
              <T variant="caption" color={yearly ? p.green : p.ink} style={styles.badgeText}>
                {badge}
              </T>
            </View>
          )}
        </View>
        <T variant="caption" muted>
          {hint}
        </T>
      </View>
      <View style={styles.priceCol}>
        {!yearly && plan.promoPrice && (
          <T variant="caption" muted style={styles.strike}>
            {plan.price}
          </T>
        )}
        <T style={[styles.price, { color: p.ink }]}>{yearly ? plan.price : (plan.promoPrice ?? plan.price)}</T>
      </View>
    </PressableScale>
  );
}

function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <T variant="caption" color={p.cobalt}>
        {title}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  footer: { gap: space(1) },
  note: { borderRadius: 16, padding: space(4) },
  hero: {
    gap: space(1),
    borderRadius: radius.sheet,
    padding: space(5),
    paddingTop: space(6),
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  sparkle: { position: 'absolute', right: space(5), top: space(5) },
  loading: { height: 160, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: space(3) },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderWidth: 2,
    borderRadius: radius.row + 2,
    paddingHorizontal: space(4),
    paddingVertical: space(4),
    minHeight: 76,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planTitle: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  badge: { borderRadius: radius.pill, paddingHorizontal: space(2), paddingVertical: 1 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  priceCol: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
  price: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  list: { gap: space(5), marginTop: space(6) },
  feature: { flexDirection: 'row', gap: space(4), alignItems: 'center' },
  legal: { marginTop: space(6) },
  legalTight: { marginTop: space(2) },
  links: { flexDirection: 'row', gap: space(5), marginTop: space(3) },
});

/** The Pro star turns slowly in the corner of the hero card. */
function Sparkle() {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={[styles.sparkle, { transform: [{ rotate }] }]} pointerEvents="none">
      <Icon name="sparkle" size={56} color="rgba(255,255,255,0.35)" strokeWidth={1.6} />
    </Animated.View>
  );
}
