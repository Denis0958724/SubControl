import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, tap } from '../components/Button';
import { Icon } from '../components/Icon';
import { Divider, Group, Header, Screen, SectionTitle } from '../components/Layout';
import { Monogram } from '../components/Monogram';
import { T } from '../components/T';
import { BANKS, findBank, type BankId } from '../lib/banks';
import { colorForName, findService } from '../lib/catalog';
import { CYCLE_LABEL, MONTHS, formatDate, plural, todayISO } from '../lib/dates';
import { demoStatement } from '../lib/demo';
import { detectSubscriptions, type Candidate, type StatementItem } from '../lib/detect';
import { formatMoney, formatUAH, toUAH } from '../lib/money';
import { MonobankError, TOKEN_URL, scanStatement } from '../lib/monobank';
import { openExternal } from '../lib/open';
import { pickStatements } from '../lib/pickStatement';
import { loadToken, saveToken } from '../lib/secure';
import type { Rates } from '../lib/types';
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

  const runDemo = async () => {
    setErrors([]);
    setSource('statement');
    setPhase('scanning');
    const all = demoStatement(today, rates.USD);
    for (let i = 0; i < PERIODS; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const from = new Date(Date.now() - (i + 1) * 31 * 86_400_000);
      setStep(i + 1);
      setStepLabel(MONTHS[from.getMonth()].toLowerCase());
      setFound(detectSubscriptions(all.filter((it) => it.time * 1000 >= from.getTime()), today));
    }
    finish(all, `Це приклад. ${opsNote(all.length)}`);
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
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const demoButton = <Button title="Спробувати на прикладі" kind="ghost" compact onPress={runDemo} />;

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
        <T variant="title">Шукаю підписки</T>
        {source === 'monobank' && (
          <T variant="body" muted>
            monobank віддає виписку по місяцю і не частіше разу на хвилину. Тож це займе близько {PERIODS - 1}{' '}
            хвилин. Екран можна не закривати, але й дивитися на нього не обовʼязково.
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
            Регулярних списань не знайшлося. Або підписок справді немає, або виписка коротка. Візьміть період від 2
            місяців чи додайте підписки вручну.
          </T>
        ) : (
          <>
            <T variant="body" muted>
              Позначені точно підписки. Решта схожа на регулярні платежі: перевірте й оберіть самі.
            </T>
            <Group>
              {found.map((c, i) => (
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
                    <CandidateRow
                      c={c}
                      rates={rates}
                      checked={selected.has(c.key)}
                      note={already(c) ? 'вже у списку' : undefined}
                    />
                  </Pressable>
                </View>
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
          SubControl сам завантажить виписку картки за 3 місяці. Для цього потрібен токен від monobank.
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
        <Privacy text="Токен дає лише переглядати виписку. Переказати з ним гроші неможливо. Зберігається тільки в захищеному сховищі телефона." />
        <Button title="Не хочу токен, завантажу файл" kind="ghost" compact onPress={() => setPhase('file')} />
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
          Знайдемо регулярні списання у файлі виписки. Підійде Excel або CSV, можна кілька файлів одразу, якщо
          карток кілька.
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
        <Privacy text="Файл читається тільки на телефоні. Нікуди не відправляємо й не зберігаємо, лише знайдені підписки." />
        {demoButton}
      </Screen>
    );
  }

  return (
    <Screen header={<Header onBack={() => router.back()} />}>
      <T variant="title">Знайти підписки автоматично</T>
      <T variant="body" muted>
        Оберіть банк, з якого платите за підписки. SubControl перегляне витрати за 3 місяці й покаже, що
        повторюється.
      </T>
      <Group>
        {BANKS.map((bk, i) => (
          <View key={bk.id}>
            {i > 0 && <Divider inset={space(17)} />}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tap();
                openBank(bk.id);
              }}
              style={({ pressed }) => [styles.bankRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Monogram name={bk.name} color={bk.color} />
              <View style={styles.flex}>
                <T variant="heading" style={{ fontSize: 16 }}>
                  {bk.name}
                </T>
                <T variant="caption" muted>
                  {bk.hint}
                </T>
              </View>
              <Icon name="chevronRight" size={18} color={p.muted} />
            </Pressable>
          </View>
        ))}
      </Group>
      <T variant="caption" muted style={styles.tip}>
        Чому не напряму з Приват24 чи іншого банку? Банки відкривають доступ до виписки тільки застосункам з
        дозволом НБУ. Поки такого дозволу немає, файл виписки працює з будь-яким банком.
      </T>
      {demoButton}
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

function Privacy({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={styles.privacy}>
      <Icon name="shield" size={20} color={p.green} />
      <T variant="caption" muted style={styles.flex}>
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
          style={[styles.check, checked ? { backgroundColor: p.cobalt, borderColor: p.cobalt } : { borderColor: p.line }]}
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
  privacy: { flexDirection: 'row', gap: space(3), paddingHorizontal: space(1), marginTop: space(2) },
  bars: { flexDirection: 'row', gap: space(2), marginTop: space(3) },
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
