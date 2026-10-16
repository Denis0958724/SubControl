import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { Header, Screen } from '../components/Layout';
import { T } from '../components/T';
import { inform } from '../lib/confirm';
import { PRO_PRICE_LABEL, PURCHASES_CONNECTED, purchasePro, restorePurchases } from '../lib/purchases';
import { FREE_LIMIT, useStore } from '../store';
import { space, usePalette } from '../theme';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'bolt', title: 'Автопошук у monobank', text: 'Знайде підписки у виписці за 3 місяці' },
  { icon: 'users', title: 'Платимо разом', text: 'Скільки з кожного, якщо ділите підписку з родиною' },
  { icon: 'bell', title: 'Нагадування за 3 дні або тиждень', text: 'Більше часу, щоб передумати' },
  { icon: 'card', title: 'Скільки завгодно підписок', text: `Безкоштовно можна вести до ${FREE_LIMIT}` },
  { icon: 'download', title: 'Експорт у таблицю', text: 'Для сімейного бюджету чи Google Таблиць' },
];

export default function Pro() {
  const p = usePalette();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const setPro = useStore((s) => s.setPro);
  const isPro = useStore((s) => s.isPro);
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    const ok = await purchasePro().catch(() => false);
    setBusy(false);
    if (!ok) return;
    setPro(true);
    if (!PURCHASES_CONNECTED) {
      inform('Pro увімкнено для перевірки', 'Оплата через App Store і Google Play зʼявиться перед публікацією. Зараз Pro працює безкоштовно.');
    }
    router.back();
  };

  const restore = async () => {
    const ok = await restorePurchases().catch(() => false);
    if (ok) {
      setPro(true);
      router.back();
    } else {
      inform('Покупок не знайдено', 'На цьому акаунті App Store чи Google Play ще немає SubControl Pro.');
    }
  };

  return (
    <Screen
      header={<Header onBack={() => router.back()} backIcon="close" />}
      footer={
        isPro ? (
          <Button title="Pro вже активний" onPress={() => router.back()} kind="secondary" />
        ) : (
          <View style={styles.footer}>
            <Button title={`Оформити за ${PRO_PRICE_LABEL} на місяць`} onPress={buy} loading={busy} />
            <Button title="Відновити покупки" kind="ghost" compact onPress={restore} />
          </View>
        )
      }
    >
      {reason === 'limit' && (
        <View style={[styles.limit, { backgroundColor: p.amberSoft }]}>
          <T variant="label" color={p.ink}>
            У безкоштовній версії можна вести до {FREE_LIMIT} підписок. Pro знімає обмеження.
          </T>
        </View>
      )}
      <View style={styles.hero}>
        <T variant="title">SubControl Pro</T>
        <View style={styles.price}>
          <T variant="hero">{PRO_PRICE_LABEL}</T>
          <T variant="body" muted>
            на місяць
          </T>
        </View>
        <T variant="body" muted>
          Дешевше за одну забуту підписку.
        </T>
      </View>

      <View style={styles.list}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: p.cobaltSoft }]}>
              <Icon name={f.icon} size={20} color={p.cobalt} />
            </View>
            <View style={styles.flex}>
              <T variant="heading" style={{ fontSize: 16 }}>
                {f.title}
              </T>
              <T variant="caption" muted>
                {f.text}
              </T>
            </View>
          </View>
        ))}
      </View>

      <T variant="caption" muted style={styles.free}>
        Без Pro назавжди безкоштовно: список підписок, суми в гривнях за місяць і рік, нагадування за день і
        інструкції, як скасувати. Pro можна скасувати будь-коли в App Store чи Google Play.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: space(1) },
  limit: { borderRadius: 16, padding: space(4) },
  hero: { gap: space(2), paddingVertical: space(4) },
  price: { flexDirection: 'row', alignItems: 'baseline', gap: space(2) },
  list: { gap: space(5), marginTop: space(2) },
  feature: { flexDirection: 'row', gap: space(4), alignItems: 'center' },
  featureIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  free: { marginTop: space(6) },
});
