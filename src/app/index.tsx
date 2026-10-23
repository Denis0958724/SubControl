import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton, tap } from '../components/Button';
import { EmptyHome } from '../components/EmptyHome';
import { Icon } from '../components/Icon';
import { Divider, Group, IconTile, Screen, SectionTitle } from '../components/Layout';
import { LogoMark } from '../components/LogoMark';
import { MonthDial } from '../components/MonthDial';
import { FadeIn, PressableScale, stagger } from '../components/Motion';
import { SubRow } from '../components/SubRow';
import { T } from '../components/T';
import { diffDays, todayISO } from '../lib/dates';
import { chargeUAH, formatUAH, monthlyUAH, yearlyUAH } from '../lib/money';
import { ensurePermission, openNotificationSettings } from '../lib/notifications';
import { perspectives } from '../lib/perspective';
import type { Rates, Subscription } from '../lib/types';
import { useReminderStatus } from '../lib/useReminderStatus';
import { activeSubs, canAddMore, useStore } from '../store';
import { fonts, radius, space, usePalette } from '../theme';

/** Charges within this many days go to the "this week" block. */
const WEEK = 7;

export default function Home() {
  const p = usePalette();
  const subs = useStore((s) => s.subs);
  const rates = useStore((s) => s.rates);
  const isPro = useStore((s) => s.isPro);
  const [showCancelled, setShowCancelled] = useState(false);
  const reminders = useReminderStatus();
  const today = todayISO();

  const { active, cancelled, monthly, yearly, saved, week, later } = useMemo(() => {
    const a = activeSubs(subs).sort((x, y) => x.nextCharge.localeCompare(y.nextCharge));
    const c = subs.filter((s) => s.status === 'cancelled');
    return {
      active: a,
      cancelled: c,
      monthly: a.reduce((sum, s) => sum + monthlyUAH(s, rates), 0),
      yearly: a.reduce((sum, s) => sum + yearlyUAH(s, rates), 0),
      saved: c.reduce((sum, s) => sum + yearlyUAH(s, rates), 0),
      week: a.filter((s) => diffDays(today, s.nextCharge) <= WEEK),
      later: a.filter((s) => diffDays(today, s.nextCharge) > WEEK),
    };
  }, [subs, rates, today]);

  const add = () => router.push(canAddMore({ isPro, subs }) ? '/add' : '/pro?reason=limit');
  const open = (id: string) => router.push(`/sub/${id}`);
  const empty = subs.length === 0;
  const split = week.length > 0 && later.length > 0;

  const header = (
    <View style={styles.top}>
      <View style={styles.brand}>
        <LogoMark />
        <T style={styles.wordmark}>SubControl</T>
      </View>
      <IconButton icon="sliders" label="Налаштування" onPress={() => router.push('/settings')} />
    </View>
  );

  if (empty) {
    return (
      <Screen header={header}>
        <EmptyHome
          onAdd={add}
          onQuick={(service) => router.push({ pathname: '/edit', params: { service } })}
          onImport={() => router.push('/import')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      floating
      footer={<Button title="Додати підписку" icon="plus" onPress={add} />}
    >
      <MonthDial
        subs={active}
        rates={rates}
        today={today}
        monthlyTotal={monthly}
        yearlyTotal={yearly}
        onPressSub={open}
      />

      {yearly > 0 && <Perspective yearly={yearly} />}

      {reminders.permission !== 'granted' && active.some((x) => x.remind) && (
        <FadeIn delay={200}>
          <PressableScale
            accessibilityRole="button"
            onPress={async () => {
              tap();
              if (reminders.permission === 'denied') openNotificationSettings();
              else await ensurePermission();
              reminders.refresh();
            }}
            style={[styles.alert, { backgroundColor: p.amberSoft }]}
          >
            <IconTile icon="bell" tint="amber" size={38} />
            <View style={styles.flex}>
              <T variant="heading" style={styles.alertTitle}>
                Нагадування не прийдуть
              </T>
              <T variant="caption" color={p.inkSoft}>
                Сповіщення для SubControl вимкнені. Натисніть, щоб увімкнути.
              </T>
            </View>
            <Icon name="chevronRight" size={18} color={p.muted} />
          </PressableScale>
        </FadeIn>
      )}

      {active.length === 0 ? (
        <SectionTitle>Активних підписок немає</SectionTitle>
      ) : split ? (
        <>
          <SubSection title="Цього тижня" subs={week} rates={rates} today={today} onOpen={open} from={0} />
          <SubSection title="Пізніше" subs={later} rates={rates} today={today} onOpen={open} from={week.length} />
        </>
      ) : (
        <SubSection title={`Підписки: ${active.length}`} subs={active} rates={rates} today={today} onOpen={open} from={0} />
      )}

      {cancelled.length > 0 && (
        <FadeIn delay={stagger(active.length + 1)}>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ expanded: showCancelled }}
            to={0.98}
            onPress={() => {
              tap();
              setShowCancelled((v) => !v);
            }}
            style={[styles.saved, { backgroundColor: p.greenSoft }]}
          >
            <IconTile icon="wallet" tint="green" size={38} />
            <View style={styles.flex}>
              <T variant="heading" color={p.green} style={styles.savedTitle}>
                Зекономлено {formatUAH(saved)} на рік
              </T>
              <T variant="caption" color={p.green}>
                {showCancelled
                  ? 'Сховати скасовані'
                  : `Скасовано ${cancelled.length}. Показати`}
              </T>
            </View>
            <Icon name={showCancelled ? 'close' : 'chevronRight'} size={18} color={p.green} />
          </PressableScale>
        </FadeIn>
      )}
      {showCancelled && (
        <FadeIn>
          <Group>
            {cancelled.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <Divider inset={space(18)} />}
                <SubRow sub={s} rates={rates} today={today} onPress={() => open(s.id)} />
              </View>
            ))}
          </Group>
        </FadeIn>
      )}
    </Screen>
  );
}

interface SubSectionProps {
  title: string;
  subs: Subscription[];
  rates: Rates;
  today: string;
  onOpen: (id: string) => void;
  /** index of the first row in the whole list, so the stagger flows across sections */
  from: number;
}

function SubSection({ title, subs, rates, today, onOpen, from }: SubSectionProps) {
  const total = subs.reduce((sum, s) => sum + chargeUAH(s, rates), 0);
  return (
    <>
      <SectionTitle
        action={
          <T variant="caption" muted style={styles.sum}>
            {formatUAH(total)}
          </T>
        }
      >
        {title}
      </SectionTitle>
      <Group>
        {subs.map((s, i) => (
          <FadeIn key={s.id} delay={stagger(from + i) + 150}>
            {i > 0 && <Divider inset={space(18)} />}
            <SubRow sub={s} rates={rates} today={today} onPress={() => onOpen(s.id)} />
          </FadeIn>
        ))}
      </Group>
    </>
  );
}

/** "27 763 ₴ a year" in units people feel. Tap for the next comparison. */
function Perspective({ yearly }: { yearly: number }) {
  const p = usePalette();
  const items = useMemo(() => perspectives(yearly), [yearly]);
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const text = items[i % items.length];
  return (
    <FadeIn delay={700} style={styles.perspectiveWrap}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`За рік це як ${text}. Натисніть, щоб порівняти з іншим`}
        to={0.95}
        onPress={() => {
          tap();
          setI((v) => v + 1);
        }}
        style={[styles.perspective, { backgroundColor: p.cobaltSoft }]}
      >
        <T variant="label" color={p.cobalt}>
          За рік це як{' '}
          <T variant="label" color={p.cobalt} style={styles.perspectiveStrong}>
            {text}
          </T>
        </T>
        {items.length > 1 && <Icon name="repeat" size={15} color={p.cobalt} strokeWidth={2.2} />}
      </PressableScale>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space(5),
    paddingRight: space(3),
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  wordmark: { fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderRadius: radius.card,
    padding: space(4),
  },
  alertTitle: { fontSize: 16 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderRadius: radius.card,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    marginTop: space(3),
  },
  savedTitle: { fontSize: 16 },
  sum: { fontVariant: ['tabular-nums'] },
  perspectiveWrap: { alignItems: 'center' },
  perspective: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  perspectiveStrong: { fontFamily: fonts.semibold },
});
