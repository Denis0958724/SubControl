import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, tap } from '../components/Button';
import { Icon } from '../components/Icon';
import { Divider, Group, Header, IconTile, Screen, SectionTitle } from '../components/Layout';
import { Monogram } from '../components/Monogram';
import { FadeIn, PressableScale, stagger, useReducedMotion } from '../components/Motion';
import { T } from '../components/T';
import { BANKS, findBank, type BankId } from '../lib/banks';
import { colorForName, findService } from '../lib/catalog';
import { CYCLE_LABEL, MONTHS, formatDate, plural, todayISO } from '../lib/dates';
import { detectSubscriptions, type Candidate, type StatementItem } from '../lib/detect';
import { formatMoney, formatUAH, toUAH } from '../lib/money';
import { MonobankError, TOKEN_URL, scanStatement } from '../lib/monobank';
import { feedback } from '../lib/feedback';
import { ensurePermission } from '../lib/notifications';
import { openExternal } from '../lib/open';
import { pickStatements } from '../lib/pickStatement';
import { loadToken, saveToken } from '../lib/secure';
import type { Rates } from '../lib/types';
import { toast } from '../lib/toast';
import { useStore } from '../store';
import { fonts, noWebOutline, radius, space, usePalette } from '../theme';

const PERIODS = 3;

type Phase = 'choose' | 'mono' | 'file' | 'scanning' | 'results';

export default function Import() {
  const p = usePalette();
  const isPro = useStore((s) => s.isPro);
  const subs = useStore((s) => s.subs);
  const rates = useStore((s) => s.rates);
  const add = useStore((s) => s.add);
  const setMonoConnected = useStore((s) => s.setMonoConnected);

  const [phase, setPhase] = useState<Phase>('choose');
  const [bank, setBank] = useState<BankId>('privat');
  const [token, setToken] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [step, setStep] = useState(0);
  const [stepLabel, setStepLabel] = useState('');
  const [found, setFound] = useState<Candidate[]>([]);
  const [summary, setSummary] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<'monobank' | 'statement'>('statement');
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

  const finish = (all: StatementItem[], note: string) => {
    const list = detectSubscriptions(all, today);
    if (list.length) feedback('found');
    setFound(list);
    setSelected(new Set(list.filter((c) => c.confidence === 'high' && !already(c)).map((c) => c.key)));
    setSummary(note);
    setPhase('results');
  };

  const opsNote = (n: number) => `Переглянуто ${n} ${plural(n, ['операцію', 'операції', 'операцій'])}.`;

  const openBank = (id: BankId) => {
    setErrors([]);
    setBank(id);
    setPhase(id === 'monobank' ? 'mono' : 'file');
  };

  const runMonobank = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    setErrors([]);
    setSource('monobank');
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
          setStep(i + 1);
          setStepLabel(MONTHS[from.getMonth()].toLowerCase());
          setFound(detectSubscriptions([...collected], today));
        },
        abort.current.signal,
      );
      finish(collected, opsNote(collected.length));
    } catch (e) {
      if (abort.current?.signal.aborted) return;
      setErrors([e instanceof MonobankError ? e.message : 'Не вдалося отримати виписку. Спробуйте ще раз.']);
      if (collected.length) finish(collected, opsNote(collected.length));
      else setPhase('mono');
    }
  };

  const runFile = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    setErrors([]);
    setReading(true);
    try {
      const picked = await pickStatements();
      if (!picked) return;
      const problems = picked.failed.map((f) => `${f.name}: ${f.reason}`);
      setErrors(problems);
      if (!picked.items.length) return;
      setSource('statement');
      const files = picked.files.length === 1 ? 'файлу' : `${picked.files.length} файлів`;
      finish(picked.items, `${opsNote(picked.items.length).slice(0, -1)} з ${files}.`);
    } catch {
      setErrors(['Не вдалося відкрити файл. Спробуйте ще раз.']);
    } finally {
      setReading(false);
    }
  };

  const importSelected = () => {
    feedback('success');
    const n = selected.size;
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
        source,
        color: service?.color ?? colorForName(c.name),
      });
    }
    router.dismissTo('/');
    toast({
      title: `Додано ${n} ${plural(n, ['підписку', 'підписки', 'підписок'])}`,
      tone: 'success',
    });
    ensurePermission().catch(() => false);
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
      <Screen
        header={
          <Header
            backIcon="close"
            onBack={() => {
              abort.current?.abort();
              setPhase(source === 'monobank' ? 'mono' : 'choose');
            }}
          />
        }
      >
        <Searching />
        <T variant="title" center>
          Шукаю підписки
        </T>
        {source === 'monobank' && (
          <T variant="body" muted>
            Це займе близько {PERIODS - 1} хвилин: monobank віддає виписку по місяцю раз на хвилину.
          </T>
        )}
        <View style={styles.bars}>
          {Array.from({ length: PERIODS }, (_, i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i < step ? p.cobalt : p.track }]} />
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
        header={<Header title="Знайдено" onBack={() => setPhase('choose')} />}
        footer={
          found.length ? (
            <Button
              title={count ? `Додати вибрані: ${count}` : 'Оберіть, що додати'}
              onPress={importSelected}
              disabled={!count}
              sound={false}
            />
          ) : (
            <Button title="Додати вручну" icon="plus" onPress={() => router.replace('/add')} />
          )
        }
      >
        {errors.map((e) => (
          <ErrorNote key={e} text={e} />
        ))}
        <T variant="caption" muted>
          {summary}
        </T>
        {found.length === 0 ? (
          <T variant="body" muted>
            Регулярних списань не знайшлося. Спробуйте виписку від 2 місяців.
          </T>
        ) : (
          <>
            <T variant="body" muted>
              Позначене схоже на підписки. Перевірте й додайте.
            </T>
            <Group>
              {found.map((c, i) => (
                <FadeIn key={c.key} delay={stagger(i)}>
                  {i > 0 && <Divider inset={space(17)} />}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected.has(c.key) }}
                    onPress={() => {
                      tap();
                      toggle(c.key);
                    }}
                  >
                    <CandidateRow
                      c={c}
                      rates={rates}
                      checked={selected.has(c.key)}
                      note={already(c) ? 'вже у списку' : undefined}
                    />
                  </Pressable>
                </FadeIn>
              ))}
            </Group>
          </>
        )}
      </Screen>
    );
  }

  if (phase === 'mono') {
    return (
      <Screen
        header={<Header onBack={() => setPhase('choose')} />}
        footer={
          <Button
            title={isPro ? 'Почати пошук' : 'Почати пошук з Pro'}
            icon={isPro ? 'search' : 'lock'}
            onPress={runMonobank}
            disabled={isPro && token.trim().length < 20}
          />
        }
      >
        <T variant="title">monobank</T>
        <T variant="body" muted>
          Завантажимо виписку за 3 місяці. Потрібен токен monobank.
        </T>
        {errors.map((e) => (
          <ErrorNote key={e} text={e} />
        ))}
        <Group style={styles.steps}>
          <Step n={1} text="Відкрийте api.monobank.ua і відскануйте QR-код у застосунку monobank">
            <Button
              title="Відкрити api.monobank.ua"
              icon="external"
              kind="secondary"
              compact
              onPress={() => openExternal(TOKEN_URL)}
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
          <Step n={3} text={`Натисніть «Почати пошук». Це займе близько ${PERIODS - 1} хвилин`} />
        </Group>
        <Privacy text="Токен дає лише переглядати виписку. Зберігається тільки на телефоні." />
        <Button title="Краще файлом" kind="ghost" compact onPress={() => setPhase('file')} />
      </Screen>
    );
  }

  if (phase === 'file') {
    const b = findBank(bank);
    return (
      <Screen
        header={<Header onBack={() => setPhase('choose')} />}
        footer={
          <Button
            title={isPro ? 'Обрати файл' : 'Обрати файл з Pro'}
            icon={isPro ? 'file' : 'lock'}
            onPress={runFile}
            loading={reading}
          />
        }
      >
        <T variant="title">{bank === 'other' ? 'Виписка з банку' : `Виписка ${b.name}`}</T>
        <T variant="body" muted>
          Підійде Excel або CSV. Можна кілька файлів.
        </T>
        {errors.map((e) => (
          <ErrorNote key={e} text={e} />
        ))}
        <Group style={styles.steps}>
          {b.fileSteps.map((s, i) => (
            <Step key={s} n={i + 1} text={s} />
          ))}
        </Group>
        {b.desktopTip && (
          <T variant="caption" muted style={styles.tip}>
            {b.desktopTip}
          </T>
        )}
        <Privacy text="Файл читається тільки на телефоні." />
      </Screen>
    );
  }

  return (
    <Screen header={<Header onBack={() => router.back()} />}>
      <T variant="title">Знайти підписки автоматично</T>
      <T variant="body" muted>
        Оберіть банк. Перевіримо витрати за 3 місяці.
      </T>
      <Group>
        {BANKS.map((bk, i) => (
          <View key={bk.id}>
            {i > 0 && <Divider inset={space(17)} />}
            <PressableScale
              accessibilityRole="button"
              to={0.98}
              onPress={() => {
                tap();
                openBank(bk.id);
              }}
              style={styles.bankRow}
            >
              <Monogram name={bk.name} color={bk.color} size={44} />
              <View style={styles.flex}>
                <T variant="heading" style={{ fontSize: 16 }}>
                  {bk.name}
                </T>
                <T variant="caption" muted>
                  {bk.hint}
                </T>
              </View>
              <Icon name="chevronRight" size={18} color={p.muted} />
            </PressableScale>
          </View>
        ))}
      </Group>
      <T variant="caption" muted style={styles.tip}>
        Інші банки не дають прямого доступу, тому через файл виписки.
      </T>
    </Screen>
  );
}

/** A magnifier with slow ripples while the statement is being read. */
function Searching() {
  const p = usePalette();
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  const ring = (offset: number) => {
    const t = Animated.modulo(Animated.add(v, offset), 1);
    return {
      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
    };
  };
  return (
    <View style={styles.searching} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!reduce && <Animated.View style={[styles.ripple, { backgroundColor: p.cobaltSoft }, ring(0)]} />}
      {!reduce && <Animated.View style={[styles.ripple, { backgroundColor: p.cobaltSoft }, ring(0.5)]} />}
      <View style={[styles.lens, { backgroundColor: p.cobalt }]}>
        <Icon name="search" size={30} color={p.onCobalt} strokeWidth={2.4} />
      </View>
    </View>
  );
}

function Step({ n, text, children }: { n: number; text: string; children?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.step}>
      <View style={[styles.num, { backgroundColor: p.cobalt }]}>
        <T variant="label" color={p.onCobalt} style={{ fontFamily: fonts.semibold }}>
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

function Privacy({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={[styles.privacy, { backgroundColor: p.greenSoft }]}>
      <IconTile icon="shield" tint="green" />
      <T variant="caption" color={p.inkSoft} style={styles.flex}>
        {text}
      </T>
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

function CandidateRow({ c, rates, checked, note }: { c: Candidate; rates: Rates; checked?: boolean; note?: string }) {
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
          style={[styles.check, checked ? { backgroundColor: p.cobalt, borderColor: p.cobalt } : { borderColor: p.muted }]}
        >
          {checked && <Icon name="check" size={16} color={p.onCobalt} strokeWidth={2.6} />}
        </View>
      )}
      <Monogram name={c.name} color={color} size={42} />
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
  flex: { flex: 1, minWidth: 0 },
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
    minWidth: 0,
  },
  tip: { paddingHorizontal: space(1) },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space(3), padding: space(3), borderRadius: radius.card, marginTop: space(2) },
  bars: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
  searching: { alignSelf: 'center', width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginTop: space(4) },
  ripple: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
  lens: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 8, borderRadius: 4 },
  error: { borderRadius: 16, padding: space(4) },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 68,
  },
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
