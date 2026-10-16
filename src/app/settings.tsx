import { router } from 'expo-router';
import { useState } from 'react';
import Constants from 'expo-constants';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Divider, Group, Header, Line, ProBadge, Screen, SectionTitle } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import { T } from '../components/T';
import { Toggle } from '../components/Toggle';
import { CYCLE_LABEL } from '../lib/dates';
import { confirm, inform } from '../lib/confirm';
import { formatNumber, monthlyUAH } from '../lib/money';
import { openExternal } from '../lib/open';
import { BILLING, manageSubscriptionUrl } from '../lib/purchases';
import { fetchRates, RATE_SOURCE_LABEL } from '../lib/rates';
import { forgetToken } from '../lib/secure';
import type { Settings } from '../lib/types';
import { useStore } from '../store';
import { space, usePalette } from '../theme';

export default function SettingsScreen() {
  const p = usePalette();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const isPro = useStore((s) => s.isPro);
  const rates = useStore((s) => s.rates);
  const setRates = useStore((s) => s.setRates);
  const monoConnected = useStore((s) => s.monoConnected);
  const setMonoConnected = useStore((s) => s.setMonoConnected);
  const subs = useStore((s) => s.subs);
  const resetAll = useStore((s) => s.resetAll);
  const [refreshing, setRefreshing] = useState(false);

  const setLead = (leadDays: Settings['leadDays']) => {
    if (leadDays !== 1 && !isPro) {
      router.push('/pro');
      return;
    }
    setSettings({ leadDays });
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      setRates(await fetchRates());
    } catch {
      inform('Курс не оновився', 'Немає звʼязку з банком. Спробуйте пізніше. Поки рахуємо за останнім курсом.');
    } finally {
      setRefreshing(false);
    }
  };

  const exportCsv = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    const rows = [
      'Назва;Ціна;Валюта;Як часто;Наступне списання;На місяць, грн;Статус',
      ...subs.map((s) =>
        [
          s.name,
          String(s.amount).replace('.', ','),
          s.currency,
          CYCLE_LABEL[s.cycle],
          s.nextCharge,
          Math.round(monthlyUAH(s, rates)),
          s.status === 'active' ? 'активна' : 'скасована',
        ].join(';'),
      ),
    ];
    const csv = rows.join('\n');
    if (Platform.OS === 'web') {
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'subcontrol.csv';
      a.click();
      return;
    }
    await Share.share({ message: csv, title: 'SubControl.csv' });
  };

  const rateTime = new Date(rates.updatedAt);
  const rateHint =
    rates.source === 'fallback'
      ? 'Збережений курс. Оновіть, коли буде інтернет'
      : `${RATE_SOURCE_LABEL[rates.source]}, оновлено ${rateTime.getDate()}.${String(rateTime.getMonth() + 1).padStart(2, '0')} о ${rateTime.getHours()}:${String(rateTime.getMinutes()).padStart(2, '0')}`;

  return (
    <Screen header={<Header title="Налаштування" onBack={() => router.back()} />}>
      <Group>
        {isPro ? (
          <>
            <Line icon="star" tone="accent" title="SubControl Pro активний" hint="Дякуємо, що підтримуєте застосунок" />
            {BILLING === 'store' && (
              <>
                <Divider inset={space(12)} />
                <Line
                  icon="card"
                  title="Керувати підпискою Pro"
                  hint={Platform.OS === 'android' ? 'У Google Play' : 'В App Store'}
                  onPress={async () => openExternal(await manageSubscriptionUrl())}
                />
              </>
            )}
          </>
        ) : (
          <Line
            icon="star"
            tone="accent"
            title="SubControl Pro"
            hint="Автопошук у виписці банку, родинний розподіл, без обмежень"
            onPress={() => router.push('/pro')}
          />
        )}
      </Group>

      <SectionTitle>Нагадування</SectionTitle>
      <Group style={styles.pad}>
        <T variant="body">Коли нагадувати</T>
        <Segmented
          value={settings.leadDays}
          onChange={setLead}
          options={[
            { value: 1, label: 'За день' },
            { value: 3, label: 'За 3 дні', locked: !isPro },
            { value: 7, label: 'За тиждень', locked: !isPro },
          ]}
        />
        {!isPro && (
          <View style={styles.proHint}>
            <ProBadge />
            <T variant="caption" muted>
              нагадування за 3 дні й за тиждень
            </T>
          </View>
        )}
        <T variant="body" style={styles.gapTop}>
          О котрій
        </T>
        <Segmented
          value={settings.hour}
          onChange={(hour) => setSettings({ hour })}
          options={[
            { value: 9, label: '9:00' },
            { value: 12, label: '12:00' },
            { value: 19, label: '19:00' },
          ]}
        />
      </Group>

      <SectionTitle>Звуки</SectionTitle>
      <Group>
        <Line
          icon="sound"
          title="Звуки натискань"
          hint="Тихі, і мовчать, коли телефон на беззвучному"
          right={<Toggle value={settings.sounds} onChange={(sounds) => setSettings({ sounds })} label="Звуки натискань" />}
        />
      </Group>

      <SectionTitle>Курс валют</SectionTitle>
      <Group>
        <Line title="Долар" value={`${formatNumber(rates.USD, 2)} ₴`} />
        <Divider />
        <Line title="Євро" value={`${formatNumber(rates.EUR, 2)} ₴`} />
        <Divider />
        <Line
          icon="refresh"
          tone="accent"
          title={refreshing ? 'Оновлюю…' : 'Оновити курс'}
          hint={rateHint}
          onPress={refresh}
        />
      </Group>

      <SectionTitle>Банки</SectionTitle>
      <Group>
        <Line
          icon="bolt"
          title="Знайти підписки у виписці"
          hint="monobank, ПриватБанк та інші банки"
          right={!isPro ? <ProBadge /> : undefined}
          onPress={() => router.push('/import')}
        />
        {monoConnected && (
          <>
            <Divider inset={space(12)} />
            <Line
              icon="trash"
              tone="danger"
              title="Видалити токен monobank"
              onPress={async () => {
                if (!(await confirm('Видалити токен?', 'Щоб знову шукати підписки в monobank, знадобиться новий токен.', 'Видалити', true))) return;
                await forgetToken();
                setMonoConnected(false);
              }}
            />
          </>
        )}
      </Group>

      <SectionTitle>Дані</SectionTitle>
      <Group>
        <Line
          icon="download"
          title="Експорт у таблицю (CSV)"
          right={!isPro ? <ProBadge /> : undefined}
          onPress={exportCsv}
        />
        <Divider inset={space(12)} />
        <Line
          icon="trash"
          tone="danger"
          title="Видалити всі дані"
          onPress={async () => {
            if (!(await confirm('Видалити всі дані?', 'Список підписок і налаштування зникнуть з цього телефона.', 'Видалити', true))) return;
            await forgetToken();
            setMonoConnected(false);
            resetAll();
            router.back();
          }}
        />
      </Group>

      <View style={styles.about}>
        <T variant="caption" muted center>
          Підписки зберігаються тільки на цьому телефоні. SubControl не має доступу до ваших грошей і нічого не
          списує сам.
        </T>
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} hitSlop={8}>
          <T variant="caption" color={p.cobalt} center>
            Політика конфіденційності
          </T>
        </Pressable>
        <T variant="caption" muted center>
          SubControl {Constants.expoConfig?.version ?? ''}
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space(4), gap: space(3) },
  gapTop: { marginTop: space(2) },
  proHint: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  about: { gap: space(2), marginTop: space(6), paddingHorizontal: space(4) },
});
