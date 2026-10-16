import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, tap } from '../components/Button';
import { CalendarPicker } from '../components/CalendarPicker';
import { Icon } from '../components/Icon';
import { Divider, Group, Header, Line, ProBadge, Screen } from '../components/Layout';
import { Monogram } from '../components/Monogram';
import { Segmented } from '../components/Segmented';
import { T } from '../components/T';
import { Toggle } from '../components/Toggle';
import { colorForName, findService } from '../lib/catalog';
import { formatDate, plural, relativeDay, todayISO } from '../lib/dates';
import { formatUAH, parseAmount, toUAH } from '../lib/money';
import { ensurePermission } from '../lib/notifications';
import { RATE_SOURCE_LABEL } from '../lib/rates';
import type { Currency, Cycle } from '../lib/types';
import { useStore } from '../store';
import { fonts, noWebOutline, radius, space, usePalette } from '../theme';

export default function Edit() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id?: string; service?: string; name?: string }>();
  const existing = useStore((s) => s.subs.find((x) => x.id === params.id));
  const rates = useStore((s) => s.rates);
  const isPro = useStore((s) => s.isPro);
  const leadDays = useStore((s) => s.settings.leadDays);
  const add = useStore((s) => s.add);
  const update = useStore((s) => s.update);

  const service = findService(existing?.serviceId ?? params.service);
  const today = todayISO();

  const [name, setName] = useState(existing?.name ?? service?.name ?? params.name ?? '');
  const [amountText, setAmountText] = useState(existing ? String(existing.amount).replace('.', ',') : '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? service?.currency ?? 'UAH');
  const [cycle, setCycle] = useState<Cycle>(existing?.cycle ?? 'month');
  const [nextCharge, setNextCharge] = useState(existing?.nextCharge ?? today);
  const [remind, setRemind] = useState(existing?.remind ?? true);
  const [sharedWith, setSharedWith] = useState(existing?.sharedWith ?? 1);
  const [calendarOpen, setCalendarOpen] = useState(!existing);

  const amount = parseAmount(amountText);
  const valid = name.trim().length > 0 && amount > 0;
  const color = existing?.color ?? service?.color ?? colorForName(name || '?');
  const uah = toUAH(amount, currency, rates);

  const save = async () => {
    const data = {
      name: name.trim(),
      amount,
      currency,
      cycle,
      nextCharge,
      remind,
      sharedWith,
    };
    if (existing) {
      update(existing.id, data);
      router.back();
    } else {
      add({ ...data, serviceId: service?.id, source: 'manual' });
      if (remind) await ensurePermission().catch(() => false);
      router.dismissTo('/');
    }
  };

  const changeShare = (delta: number) => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    setSharedWith((n) => Math.min(8, Math.max(1, n + delta)));
  };

  const remindLabel = leadDays === 1 ? 'Нагадати за день' : `Нагадати за ${leadDays} ${plural(leadDays, ['день', 'дні', 'днів'])}`;

  return (
    <Screen
      header={<Header title={existing ? 'Редагувати' : 'Нова підписка'} onBack={() => router.back()} />}
      footer={<Button title="Зберегти" onPress={save} disabled={!valid} />}
    >
      <View style={styles.identity}>
        <Monogram name={name || '?'} color={color} size={56} />
        {service ? (
          <T variant="title" style={styles.flex}>
            {name}
          </T>
        ) : (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Назва сервісу"
            placeholderTextColor={p.muted}
            autoFocus={!existing && !params.name}
            style={[styles.nameInput, noWebOutline, { color: p.ink, borderBottomColor: p.line }]}
            accessibilityLabel="Назва сервісу"
          />
        )}
      </View>

      <Group style={styles.pad}>
        <T variant="label" muted>
          Скільки коштує
        </T>
        <View style={styles.amountRow}>
          <TextInput
            value={amountText}
            onChangeText={(t) => setAmountText(t.replace(/[^0-9.,]/g, ''))}
            placeholder="0"
            placeholderTextColor={p.line}
            keyboardType="decimal-pad"
            autoFocus={Boolean(service) && !existing}
            style={[styles.amountInput, noWebOutline, { color: p.ink }]}
            accessibilityLabel="Ціна"
          />
          <T variant="title" muted>
            {currency === 'UAH' ? '₴' : currency === 'USD' ? '$' : '€'}
          </T>
        </View>
        <Segmented
          value={currency}
          onChange={setCurrency}
          options={[
            { value: 'UAH', label: 'Гривні' },
            { value: 'USD', label: 'Долари' },
            { value: 'EUR', label: 'Євро' },
          ]}
        />
        {currency !== 'UAH' && amount > 0 && (
          <T variant="caption" muted>
            Це приблизно {formatUAH(uah)} {RATE_SOURCE_LABEL[rates.source]}
          </T>
        )}
      </Group>

      <Group style={styles.pad}>
        <T variant="label" muted>
          Як часто списують
        </T>
        <Segmented
          value={cycle}
          onChange={setCycle}
          options={[
            { value: 'month', label: 'Щомісяця' },
            { value: 'year', label: 'Щороку' },
            { value: 'week', label: 'Щотижня' },
          ]}
        />
      </Group>

      <Group>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: calendarOpen }}
          onPress={() => {
            tap();
            setCalendarOpen((v) => !v);
          }}
        >
          <View style={styles.dateRow}>
            <Icon name="calendar" size={20} color={p.inkSoft} />
            <View style={styles.flex}>
              <T variant="body">Наступне списання</T>
              <T variant="caption" muted>
                {relativeDay(nextCharge, today)}
              </T>
            </View>
            <T variant="heading" color={p.cobalt}>
              {formatDate(nextCharge)}
            </T>
          </View>
        </Pressable>
        {calendarOpen && (
          <>
            <Divider />
            <CalendarPicker
              value={nextCharge}
              today={today}
              onChange={(d) => {
                setNextCharge(d);
                setCalendarOpen(false);
              }}
            />
          </>
        )}
      </Group>

      <Group>
        <Line
          icon="bell"
          title={remindLabel}
          hint="Спитаю: продовжуєте чи скасувати"
          right={
            <Toggle value={remind} onChange={setRemind} label={remindLabel} />
          }
        />
        <Divider inset={space(12)} />
        <Line
          icon="users"
          title="Платимо разом"
          hint={
            sharedWith > 1
              ? `З кожного ${formatUAH(uah / sharedWith)}`
              : 'Якщо ділите підписку з родиною чи друзями'
          }
          right={
            <View style={styles.stepper}>
              {!isPro && <ProBadge />}
              <StepButton icon="minus" onPress={() => changeShare(-1)} disabled={sharedWith <= 1 && isPro} />
              <T variant="heading" style={styles.stepValue}>
                {sharedWith}
              </T>
              <StepButton icon="plus" onPress={() => changeShare(1)} />
            </View>
          }
        />
      </Group>
    </Screen>
  );
}

function StepButton({ icon, onPress, disabled }: { icon: 'plus' | 'minus'; onPress: () => void; disabled?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'plus' ? 'Більше людей' : 'Менше людей'}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.step,
        { backgroundColor: p.track, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}
    >
      {icon === 'plus' ? (
        <Icon name="plus" size={18} color={p.ink} />
      ) : (
        <View style={[styles.minus, { backgroundColor: p.ink }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space(4), paddingVertical: space(2) },
  nameInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.display,
    fontSize: 22,
    paddingVertical: space(2),
    borderBottomWidth: 1.5,
  },
  pad: { padding: space(4), gap: space(3) },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  amountInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.display,
    fontSize: 36,
    paddingVertical: 0,
    minHeight: 48,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 60,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  stepValue: { minWidth: 18, textAlign: 'center', fontVariant: ['tabular-nums'] },
  step: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  minus: { width: 12, height: 2, borderRadius: 1 },
});
