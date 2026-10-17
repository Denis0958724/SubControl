import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton, tap } from '../components/Button';
import { Icon } from '../components/Icon';
import { Divider, Group, Screen, SectionTitle } from '../components/Layout';
import { MonthDial } from '../components/MonthDial';
import { SubRow } from '../components/SubRow';
import { T } from '../components/T';
import { todayISO } from '../lib/dates';
import { formatUAH, monthlyUAH, yearlyUAH } from '../lib/money';
import { ensurePermission, openNotificationSettings } from '../lib/notifications';
import { useReminderStatus } from '../lib/useReminderStatus';
import { activeSubs, canAddMore, useStore } from '../store';
import { fonts, space, usePalette } from '../theme';

export default function Home() {
  const p = usePalette();
  const subs = useStore((s) => s.subs);
  const rates = useStore((s) => s.rates);
  const isPro = useStore((s) => s.isPro);
  const [showCancelled, setShowCancelled] = useState(false);
  const reminders = useReminderStatus();
  const today = todayISO();

  const { active, cancelled, monthly, yearly, saved } = useMemo(() => {
    const a = activeSubs(subs).sort((x, y) => x.nextCharge.localeCompare(y.nextCharge));
    const c = subs.filter((s) => s.status === 'cancelled');
    return {
      active: a,
      cancelled: c,
      monthly: a.reduce((sum, s) => sum + monthlyUAH(s, rates), 0),
      yearly: a.reduce((sum, s) => sum + yearlyUAH(s, rates), 0),
      saved: c.reduce((sum, s) => sum + yearlyUAH(s, rates), 0),
    };
  }, [subs, rates]);

  const add = () => router.push(canAddMore({ isPro, subs }) ? '/add' : '/pro?reason=limit');
  const open = (id: string) => router.push(`/sub/${id}`);
  const empty = subs.length === 0;

  const header = (
    <View style={styles.top}>
      <T style={styles.wordmark}>SubControl</T>
      <IconButton icon="sliders" label="Налаштування" onPress={() => router.push('/settings')} />
    </View>
  );

  return (
    <Screen
      header={header}
      floating
      footer={
        empty ? undefined : (
          <Button title="Додати підписку" icon="plus" onPress={add} style={[styles.fab, { shadowColor: p.shadow }]} />
        )
      }
    >
      <MonthDial
        subs={active}
        rates={rates}
        today={today}
        monthlyTotal={monthly}
        yearlyTotal={yearly}
        onPressSub={open}
      />

      {!empty && reminders.permission !== 'granted' && active.some((x) => x.remind) && (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            tap();
            if (reminders.permission === 'denied') openNotificationSettings();
            else await ensurePermission();
            reminders.refresh();
          }}
          style={({ pressed }) => [styles.alert, { backgroundColor: p.amberSoft, opacity: pressed ? 0.8 : 1 }]}
        >
          <Icon name="bell" size={22} color={p.amber} />
          <View style={styles.flex}>
            <T variant="heading" style={{ fontSize: 16 }}>
              Нагадування не прийдуть
            </T>
            <T variant="caption" color={p.inkSoft}>
              Сповіщення для SubControl вимкнені. Натисніть, щоб увімкнути.
            </T>
          </View>
          <Icon name="chevronRight" size={18} color={p.muted} />
        </Pressable>
      )}

      {empty ? (
        <View style={styles.empty}>
          <T variant="title" center>
            Усі підписки в одному місці
          </T>
          <T variant="body" muted center style={styles.emptyText}>
            Додайте сервіси, за які платите. SubControl порахує, скільки це в гривнях, і нагадає за день до
            кожного списання.
          </T>
          <View style={styles.emptyActions}>
            <Button title="Додати підписку" icon="plus" onPress={add} />
            <Button
              title="Знайти у виписці банку"
              icon="bolt"
              kind="secondary"
              onPress={() => router.push('/import')}
            />
          </View>
        </View>
      ) : (
        <>
          <SectionTitle
            action={
              <T variant="caption" muted>
                за датою списання
              </T>
            }
          >
            {active.length ? `Підписки: ${active.length}` : 'Активних підписок немає'}
          </SectionTitle>
          {active.length > 0 && (
            <Group>
              {active.map((s, i) => (
                <View key={s.id}>
                  {i > 0 && <Divider inset={space(17)} />}
                  <SubRow sub={s} rates={rates} today={today} onPress={() => open(s.id)} />
                </View>
              ))}
            </Group>
          )}

          {cancelled.length > 0 && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showCancelled }}
                onPress={() => {
                  tap();
                  setShowCancelled((v) => !v);
                }}
                style={({ pressed }) => [styles.saved, { backgroundColor: p.greenSoft, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={styles.flex}>
                  <T variant="label" color={p.green} style={{ fontFamily: fonts.semibold }}>
                    Скасовано {cancelled.length}: −{formatUAH(saved)} на рік
                  </T>
                  <T variant="caption" color={p.green}>
                    {showCancelled ? 'Сховати' : 'Показати скасовані'}
                  </T>
                </View>
                <Icon name={showCancelled ? 'close' : 'chevronRight'} size={18} color={p.green} />
              </Pressable>
              {showCancelled && (
                <Group>
                  {cancelled.map((s, i) => (
                    <View key={s.id}>
                      {i > 0 && <Divider inset={space(17)} />}
                      <SubRow sub={s} rates={rates} today={today} onPress={() => open(s.id)} />
                    </View>
                  ))}
                </Group>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderRadius: 16,
    padding: space(4),
    marginTop: space(4),
  },
  flex: { flex: 1 },
  top: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space(5),
    paddingRight: space(3),
  },
  wordmark: { fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4 },
  fab: {
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  empty: { marginTop: space(4), gap: space(2), alignItems: 'center' },
  emptyText: { maxWidth: 340 },
  emptyActions: { alignSelf: 'stretch', gap: space(2), marginTop: space(4) },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    marginTop: space(2),
  },
});
