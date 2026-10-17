import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton } from '../../components/Button';
import { Divider, Group, Header, Line, Screen } from '../../components/Layout';
import { Monogram } from '../../components/Monogram';
import { T } from '../../components/T';
import { Toggle } from '../../components/Toggle';
import { feedback } from '../../lib/feedback';
import { CYCLE_LABEL, diffDays, formatDate, plural, relativeDay, todayISO } from '../../lib/dates';
import { confirm } from '../../lib/confirm';
import { chargeUAH, formatMoney, formatUAH, monthlyUAH, yearlyUAH } from '../../lib/money';
import { ensurePermission } from '../../lib/notifications';
import { RATE_SOURCE_LABEL } from '../../lib/rates';
import { useStore } from '../../store';
import { space, usePalette } from '../../theme';

export default function SubscriptionScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useStore((s) => s.subs.find((x) => x.id === id));
  const rates = useStore((s) => s.rates);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.update);
  const remove = useStore((s) => s.remove);
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
  const decideDays = diffDays(today, sub.nextCharge);
  const decide = !cancelled && decideDays >= 0 && decideDays <= 1;
  const answered = acknowledged[sub.id] === sub.nextCharge;
  const lead = settings.leadDays;
  const remindHint =
    `за ${lead === 1 ? 'день' : `${lead} ${plural(lead, ['день', 'дні', 'днів'])}`} о ${settings.hour}:00` +
    (settings.dayOf ? ' і в день списання' : '');

  const onDelete = async () => {
    const ok = await confirm('Видалити зі списку?', `${sub.name} зникне з SubControl. Сама підписка в сервісі не скасується.`, 'Видалити', true);
    if (ok) {
      feedback('cancel');
      router.back();
      remove(sub.id);
    }
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
        <Monogram name={sub.name} color={sub.color} size={64} faded={cancelled} />
        <T variant="title" center>
          {sub.name}
        </T>
        <T variant="hero" center color={cancelled ? p.muted : p.ink} style={styles.amount}>
          {formatUAH(chargeUAH(sub, rates))}
        </T>
        <T variant="label" muted center>
          {cancelled
            ? `Скасовано ${sub.cancelledAt ? formatDate(sub.cancelledAt) : ''}`
            : sub.currency !== 'UAH'
              ? `${CYCLE_LABEL[sub.cycle]}, ${formatMoney(sub.amount, sub.currency)} ${RATE_SOURCE_LABEL[rates.source]}`
              : CYCLE_LABEL[sub.cycle]}
        </T>
      </View>

      {decide && (
        <View style={[styles.decide, { backgroundColor: answered ? p.greenSoft : p.amberSoft }]}>
          <T variant="heading">
            {decideDays === 0 ? 'Сьогодні' : 'Завтра'} {sub.name} спише {formatUAH(chargeUAH(sub, rates))}
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
                  onPress={() => acknowledge(sub.id)}
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
      )}

      {!cancelled && (
        <Group>
          <Line
            icon="calendar"
            title="Наступне списання"
            hint={relativeDay(sub.nextCharge, today)}
            value={formatDate(sub.nextCharge)}
          />
          <Divider inset={space(12)} />
          <Line icon="card" title="На місяць" value={formatUAH(monthlyUAH(sub, rates))} />
          <Divider inset={space(12)} />
          <Line icon="card" title="На рік" value={formatUAH(yearlyUAH(sub, rates))} />
          {sub.sharedWith > 1 && (
            <>
              <Divider inset={space(12)} />
              <Line
                icon="users"
                title="Ваша частка"
                hint={`Ділите на ${sub.sharedWith} ${plural(sub.sharedWith, ['людину', 'людини', 'людей'])}`}
                value={formatUAH(chargeUAH(sub, rates) / sub.sharedWith)}
              />
            </>
          )}
          <Divider inset={space(12)} />
          <Line
            icon="bell"
            title="Нагадування"
            hint={remindHint}
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
      )}

      {cancelled && (
        <Group>
          <Line
            icon="check"
            tone="accent"
            title={`Економія ${formatUAH(yearlyUAH(sub, rates))} на рік`}
            hint="Більше не рахуємо в сумі й не нагадуємо"
          />
        </Group>
      )}

      <View style={styles.actions}>
        {cancelled ? (
          <Button
            title="Відновити підписку"
            kind="secondary"
            icon="refresh"
            sound="success"
            onPress={() => restore(sub.id)}
          />
        ) : (
          <Button title="Як скасувати" kind="secondary" onPress={() => router.push(`/cancel/${sub.id}`)} />
        )}
        <Button title="Видалити зі списку" kind="ghost" onPress={onDelete} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space(1), paddingVertical: space(4) },
  amount: { marginTop: space(3) },
  actions: { gap: space(2), marginTop: space(2) },
  flex: { flex: 1 },
  decide: { borderRadius: 16, padding: space(4), gap: space(2), marginBottom: space(3) },
  decideRow: { flexDirection: 'row', gap: space(2), marginTop: space(1) },
});
