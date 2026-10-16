import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, tap } from '../components/Button';
import { Icon } from '../components/Icon';
import { Divider, Group, Header, Screen, SectionTitle } from '../components/Layout';
import { Monogram } from '../components/Monogram';
import { T } from '../components/T';
import { colorForName, findService } from '../lib/catalog';
import { CYCLE_LABEL, MONTHS, formatDate, todayISO } from '../lib/dates';
import { demoStatement } from '../lib/demo';
import { detectSubscriptions, type Candidate, type StatementItem } from '../lib/detect';
import { formatMoney, formatUAH, toUAH } from '../lib/money';
import { MonobankError, TOKEN_URL, scanStatement } from '../lib/monobank';
import { loadToken, saveToken } from '../lib/secure';
import { useStore } from '../store';
import { fonts, noWebOutline, radius, space, usePalette } from '../theme';

const PERIODS = 3;

type Phase = 'intro' | 'scanning' | 'results';

export default function Import() {
  const p = usePalette();
  const isPro = useStore((s) => s.isPro);
  const subs = useStore((s) => s.subs);
  const rates = useStore((s) => s.rates);
  const add = useStore((s) => s.add);
  const setMonoConnected = useStore((s) => s.setMonoConnected);

  const [phase, setPhase] = useState<Phase>('intro');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [stepLabel, setStepLabel] = useState('');
  const [found, setFound] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    loadToken()
      .then((t) => t && setToken(t))
      .catch(() => {});
    return () => abort.current?.abort();
  }, []);

  const today = todayISO();
  const already = (c: Candidate) =>
    subs.some(
      (s) =>
        s.status === 'active' &&
        ((c.serviceId && s.serviceId === c.serviceId && !findService(c.serviceId)?.aggregator) ||
          s.name.toLowerCase() === c.name.toLowerCase()),
    );

  const finish = (all: StatementItem[]) => {
    const list = detectSubscriptions(all, today);
    setFound(list);
    setSelected(new Set(list.filter((c) => c.confidence === 'high' && !already(c)).map((c) => c.key)));
    setPhase('results');
  };

  const progress = (i: number, all: StatementItem[], from: Date) => {
    setStep(i + 1);
    setStepLabel(MONTHS[from.getMonth()].toLowerCase());
    setFound(detectSubscriptions(all, today));
  };

  const runDemo = async () => {
    setError(null);
    setPhase('scanning');
    const all = demoStatement(today, rates.USD);
    for (let i = 0; i < PERIODS; i++) {
      await new Promise((r) => setTimeout(r, 650));
      const from = new Date(Date.now() - (i + 1) * 31 * 86_400_000);
      progress(
        i,
        all.filter((it) => it.time * 1000 >= from.getTime()),
        from,
      );
    }
    finish(all);
  };

  const runReal = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    setError(null);
    setPhase('scanning');
    setStep(0);
    setFound([]);
    abort.current = new AbortController();
    const collected: StatementItem[] = [];
    try {
      await saveToken(token.trim());
      setMonoConnected(true);
      await scanStatement(
        token.trim(),
        PERIODS,
        (i, items, from) => {
          collected.push(...items);
          progress(i, [...collected], from);
        },
        abort.current.signal,
      );
      finish(collected);
    } catch (e) {
      if (abort.current?.signal.aborted) return;
      setError(e instanceof MonobankError ? e.message : 'Не вдалося отримати виписку. Спробуйте ще раз.');
      if (collected.length) finish(collected);
      else setPhase('intro');
    }
  };

  const importSelected = () => {
    for (const c of found) {
      if (!selected.has(c.key)) continue;
      const service = findService(c.serviceId);
      add({
        serviceId: service && !service.aggregator ? service.id : undefined,
        name: c.name,
        amount: c.amount,
        currency: c.currency,
        cycle: c.cycle,
        nextCharge: c.nextCharge,
        remind: true,
        sharedWith: 1,
        source: 'monobank',
        color: service?.color ?? colorForName(c.name),
      });
    }
    router.dismissTo('/');
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (phase === 'scanning') {
    return (
      <Screen header={<Header onBack={() => { abort.current?.abort(); setPhase('intro'); }} backIcon="close" />}>
        <T variant="title">Шукаю підписки</T>
        <T variant="body" muted>
          monobank видає виписку по місяцю за раз і не частіше за раз на хвилину, тому це займе близько{' '}
          {PERIODS - 1} хвилин. Можна не закривати екран.
        </T>
        <View style={styles.bars}>
          {Array.from({ length: PERIODS }, (_, i) => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i < step ? p.cobalt : p.track }]}
            />
          ))}
        </View>
        <T variant="label" muted>
          {step === 0 ? 'Завантажую останній місяць…' : `Переглянуто до: ${stepLabel}`}
        </T>
        {found.length > 0 && (
          <>
            <SectionTitle>{`Уже знайдено: ${found.length}`}</SectionTitle>
            <Group>
              {found.map((c, i) => (
                <View key={c.key}>
                  {i > 0 && <Divider inset={space(17)} />}
                  <CandidateRow c={c} rates={rates} />
                </View>
              ))}
            </Group>
          </>
        )}
      </Screen>
    );
  }

  if (phase === 'results') {
    const count = selected.size;
    return (
      <Screen
        header={<Header title="Знайдено" onBack={() => setPhase('intro')} />}
        footer={
          found.length ? (
            <Button
              title={count ? `Додати вибрані: ${count}` : 'Оберіть, що додати'}
              onPress={importSelected}
              disabled={!count}
            />
          ) : (
            <Button title="Додати вручну" icon="plus" onPress={() => router.replace('/add')} />
          )
        }
      >
        {error && <ErrorNote text={error} />}
        {found.length === 0 ? (
          <T variant="body" muted>
            Регулярних списань за 3 місяці не знайшлося. Додайте підписки вручну — це займе хвилину.
          </T>
        ) : (
          <>
            <T variant="body" muted>
              Позначені — точно підписки. Решта схожа на регулярні платежі: перевірте й оберіть самі.
            </T>
            <Group>
              {found.map((c, i) => {
                const dup = already(c);
                return (
                  <View key={c.key}>
                    {i > 0 && <Divider inset={space(17)} />}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected.has(c.key) }}
                      onPress={() => {
                        tap();
                        toggle(c.key);
                      }}
                    >
                      <CandidateRow c={c} rates={rates} checked={selected.has(c.key)} note={dup ? 'вже у списку' : undefined} />
                    </Pressable>
                  </View>
                );
              })}
            </Group>
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header onBack={() => router.back()} />}
      footer={
        <View style={styles.footer}>
          <Button
            title={isPro ? 'Почати пошук' : 'Почати пошук з Pro'}
            icon={isPro ? 'search' : 'lock'}
            onPress={runReal}
            disabled={isPro && token.trim().length < 20}
          />
          <Button title="Спробувати на прикладі" kind="ghost" onPress={runDemo} />
        </View>
      }
    >
      <T variant="title">Знайти підписки автоматично</T>
      <T variant="body" muted>
        SubControl перегляне виписку вашої картки monobank за 3 місяці й покаже регулярні списання. Що додати —
        вирішуєте ви.
      </T>
      {error && <ErrorNote text={error} />}

      <Group style={styles.steps}>
        <Step n={1} text="Відкрийте api.monobank.ua і відскануйте QR-код у застосунку monobank">
          <Button
            title="Відкрити api.monobank.ua"
            icon="external"
            kind="secondary"
            compact
            onPress={() =>
              Platform.OS === 'web'
                ? globalThis.open?.(TOKEN_URL, '_blank')
                : WebBrowser.openBrowserAsync(TOKEN_URL).catch(() => Linking.openURL(TOKEN_URL))
            }
            style={styles.stepButton}
          />
        </Step>
        <Step n={2} text="Скопіюйте токен і вставте сюди">
          <TextInput
            value={token}
            onChangeText={setToken}
            placeholder="Токен monobank"
            placeholderTextColor={p.muted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={[styles.tokenInput, noWebOutline, { backgroundColor: p.paper, color: p.ink }]}
            accessibilityLabel="Токен monobank"
          />
        </Step>
        <Step n={3} text={`Натисніть «Почати пошук» — це займе близько ${PERIODS - 1} хвилин`} />
      </Group>

      <View style={styles.privacy}>
        <Icon name="shield" size={20} color={p.green} />
        <T variant="caption" muted style={styles.flex}>
          З цим токеном можна лише переглядати виписку — переказати гроші неможливо. Він зберігається тільки в
          захищеному сховищі вашого телефона, і його можна видалити в налаштуваннях.
        </T>
      </View>
    </Screen>
  );
}

function Step({ n, text, children }: { n: number; text: string; children?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.step}>
      <View style={[styles.num, { backgroundColor: p.cobaltSoft }]}>
        <T variant="label" color={p.cobalt} style={{ fontFamily: fonts.semibold }}>
          {n}
        </T>
      </View>
      <View style={[styles.flex, { gap: space(3) }]}>
        <T variant="body">{text}</T>
        {children}
      </View>
    </View>
  );
}

function ErrorNote({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={[styles.error, { backgroundColor: p.redSoft }]}>
      <T variant="label" color={p.red}>
        {text}
      </T>
    </View>
  );
}

function CandidateRow({
  c,
  rates,
  checked,
  note,
}: {
  c: Candidate;
  rates: ReturnType<typeof useStore.getState>['rates'];
  checked?: boolean;
  note?: string;
}) {
  const p = usePalette();
  const color = findService(c.serviceId)?.color ?? colorForName(c.name);
  const uah = toUAH(c.amount, c.currency, rates);
  const detail =
    note ??
    (c.confidence === 'high'
      ? `${CYCLE_LABEL[c.cycle]}, наступне ${formatDate(c.nextCharge)}`
      : `${c.occurrences} однакові списання, наступне ${formatDate(c.nextCharge)}`);
  return (
    <View style={styles.cRow}>
      {checked !== undefined && (
        <View
          style={[
            styles.check,
            checked ? { backgroundColor: p.cobalt, borderColor: p.cobalt } : { borderColor: p.line },
          ]}
        >
          {checked && <Icon name="check" size={16} color={p.onCobalt} strokeWidth={2.6} />}
        </View>
      )}
      <Monogram name={c.name} color={color} />
      <View style={styles.flex}>
        <T variant="heading" numberOfLines={1} style={{ fontSize: 16 }}>
          {c.name}
        </T>
        <T variant="caption" muted numberOfLines={1}>
          {detail}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T variant="heading" style={{ fontSize: 16 }}>
          {formatUAH(uah)}
        </T>
        {c.currency !== 'UAH' && (
          <T variant="caption" muted>
            {formatMoney(c.amount, c.currency)}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { gap: space(1) },
  steps: { padding: space(4), gap: space(5), marginTop: space(2) },
  step: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepButton: { alignSelf: 'flex-start' },
  tokenInput: {
    height: 48,
    borderRadius: radius.row,
    paddingHorizontal: space(4),
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  privacy: { flexDirection: 'row', gap: space(3), paddingHorizontal: space(1), marginTop: space(2) },
  bars: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  bar: { flex: 1, height: 8, borderRadius: 4 },
  error: { borderRadius: 16, padding: space(4) },
  cRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 68,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
