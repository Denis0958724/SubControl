import { router } from 'expo-router';
import { useState } from 'react';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, StyleSheet, View } from 'react-native';

import { CobaltFill } from '../components/Button';
import { Icon } from '../components/Icon';
import { Divider, Group, Header, Line, ProBadge, ROW_INSET, Screen, SectionTitle } from '../components/Layout';
import { LogoMark } from '../components/LogoMark';
import { FadeIn, PressableScale } from '../components/Motion';
import { Segmented } from '../components/Segmented';
import { T } from '../components/T';
import { Toggle } from '../components/Toggle';
import { todayISO } from '../lib/dates';
import { buildSubscriptionsXlsx, XLSX_MIME } from '../lib/exportTable';
import { confirm, inform } from '../lib/confirm';
import { formatNumber } from '../lib/money';
import { SUPPORT_URL } from '../lib/links';
import {
  askExactAlarms,
  ensurePermission,
  openNotificationSettings,
  sendTestReminder,
} from '../lib/notifications';
import { openExternal } from '../lib/open';
import { BILLING, manageSubscriptionUrl } from '../lib/purchases';
import { fetchRates, RATE_SOURCE_LABEL } from '../lib/rates';
import { forgetToken } from '../lib/secure';
import type { Settings } from '../lib/types';
import { useReminderStatus } from '../lib/useReminderStatus';
import { useStore } from '../store';
import { radius, space, usePalette } from '../theme';

export default function SettingsScreen() {
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
  const status = useReminderStatus();

  const enableNotifications = async () => {
    if (status.permission === 'denied') openNotificationSettings();
    else await ensurePermission();
    status.refresh();
  };

  const testReminder = async () => {
    if (!(await ensurePermission())) {
      status.refresh();
      inform('Сповіщення вимкнені', 'Увімкніть їх для SubControl у налаштуваннях телефона, і нагадування почнуть приходити.');
      openNotificationSettings();
      return;
    }
    const next = subs.filter((x) => x.status === 'active').sort((a, b) => a.nextCharge.localeCompare(b.nextCharge))[0];
    await sendTestReminder(next, settings, rates);
    inform('Чекайте 5 секунд', 'Можна заблокувати екран: так видно, як нагадування виглядає насправді.');
  };

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

  const exportTable = async () => {
    if (!isPro) {
      router.push('/pro');
      return;
    }
    const name = `SubControl ${todayISO()}.xlsx`;
    const bytes = buildSubscriptionsXlsx(subs, rates, todayISO());
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_MIME }));
      a.download = name;
      a.click();
      return;
    }
    try {
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: 'Таблиця підписок' });
    } catch {
      inform('Не вийшло', 'Не вдалося створити таблицю. Спробуйте ще раз.');
    }
  };

  const rateTime = new Date(rates.updatedAt);
  const rateHint =
    rates.source === 'fallback'
      ? 'Збережений курс. Оновіть, коли буде інтернет'
      : `${RATE_SOURCE_LABEL[rates.source]}, оновлено ${rateTime.getDate()}.${String(rateTime.getMonth() + 1).padStart(2, '0')} о ${rateTime.getHours()}:${String(rateTime.getMinutes()).padStart(2, '0')}`;

  return (
    <Screen header={<Header title="Налаштування" onBack={() => router.back()} />}>
      <FadeIn>
        <ProCard isPro={isPro} />
        {isPro && BILLING === 'store' && (
          <Group style={styles.gapGroup}>
            <Line
              icon="card"
              tint="violet"
              title="Керувати підпискою Pro"
              hint={Platform.OS === 'android' ? 'У Google Play' : 'В App Store'}
              onPress={async () => openExternal(await manageSubscriptionUrl())}
            />
          </Group>
        )}
      </FadeIn>

      <SectionTitle>Нагадування</SectionTitle>
      <Group style={styles.pad}>
        <T variant="label" muted>
          Коли нагадувати
        </T>
        <Segmented
          value={settings.leadDays}
          onChange={setLead}
          options={[
            { value: 1, label: 'За день' },
            { value: 3, label: 'За 3 дні', locked: !isPro },
            { value: 7, label: 'За тиждень', locked: !isPro },
          ]}
        />
        <T variant="label" muted style={styles.gapTop}>
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
      <Group style={styles.gapGroup}>
        {status.permission !== 'granted' && (
          <>
            <Line
              icon="bell"
              tone="danger"
              title="Сповіщення вимкнені"
              hint="Без них нагадування не прийдуть. Натисніть, щоб увімкнути"
              onPress={enableNotifications}
            />
            <Divider inset={ROW_INSET} />
          </>
        )}
        <Line
          icon="calendar"
          tint="amber"
          title="Ще раз у день списання"
          hint="Для тих, хто пропускає перше"
          right={<Toggle value={settings.dayOf} onChange={(dayOf) => setSettings({ dayOf })} label="Ще раз у день списання" />}
        />
        <Divider inset={ROW_INSET} />
        {Platform.OS === 'android' ? (
          <Line
            icon="sound"
            tint="red"
            title="Чути навіть на беззвучному"
            hint="Звучить як будильник. Вимкніть, якщо заважає"
            right={<Toggle value={settings.loud} onChange={(loud) => setSettings({ loud })} label="Чути навіть на беззвучному" />}
          />
        ) : (
          <>
            <Line
              icon="island"
              tint="ink"
              title="Dynamic Island і екран блокування"
              hint="Списання сьогодні чи завтра висить там, поки не вирішите"
              right={
                <Toggle
                  value={settings.liveActivity}
                  onChange={(liveActivity) => setSettings({ liveActivity })}
                  label="Dynamic Island і екран блокування"
                />
              }
            />
            <Divider inset={ROW_INSET} />
            <Line
              icon="sound"
              tint="red"
              title="На беззвучному буде вібрація"
              hint="Звук при вимкненому перемикачі Apple дає лише медичним застосункам. Зате нагадування пробʼється крізь режим фокусування"
            />
          </>
        )}
        {Platform.OS === 'android' && !status.exact && (
          <>
            <Divider inset={ROW_INSET} />
            <Line
              icon="clock"
              tone="accent"
              title="Нагадувати хвилина в хвилину"
              hint="Дозвольте «Будильники й нагадування», інакше система може зсунути час заради батареї"
              onPress={async () => {
                await askExactAlarms();
                status.refresh();
              }}
            />
          </>
        )}
        <Divider inset={ROW_INSET} />
        <Line icon="bolt" tint="violet" tone="accent" title="Перевірити нагадування" hint="Прийде через 5 секунд" onPress={testReminder} />
      </Group>

      <SectionTitle>Звуки</SectionTitle>
      <Group>
        <Line
          icon="sound"
          tint="green"
          title="Звуки натискань"
          hint="Тихі. І мовчать, коли телефон на беззвучному"
          right={<Toggle value={settings.sounds} onChange={(sounds) => setSettings({ sounds })} label="Звуки натискань" />}
        />
      </Group>

      <SectionTitle>Курс валют</SectionTitle>
      <Group>
        <Line glyph="$" tint="green" title="Долар" value={`${formatNumber(rates.USD, 2)} ₴`} />
        <Divider inset={ROW_INSET} />
        <Line glyph="€" tint="cobalt" title="Євро" value={`${formatNumber(rates.EUR, 2)} ₴`} />
        <Divider inset={ROW_INSET} />
        <Line
          icon="refresh"
          tint="ink"
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
          tint="violet"
          title="Знайти підписки у виписці"
          hint="monobank, ПриватБанк та інші банки"
          right={!isPro ? <ProBadge /> : undefined}
          onPress={() => router.push('/import')}
        />
        {monoConnected && (
          <>
            <Divider inset={ROW_INSET} />
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
          tint="green"
          title="Таблиця для Excel"
          hint="Excel, Google Таблиці, Numbers"
          right={!isPro ? <ProBadge /> : undefined}
          onPress={exportTable}
        />
        <Divider inset={ROW_INSET} />
        <Line
          icon="trash"
          tone="danger"
          title="Видалити всі дані"
          hint="Список і налаштування на цьому телефоні"
          onPress={async () => {
            if (!(await confirm('Видалити всі дані?', 'Список підписок і налаштування зникнуть з цього телефона. Назад не повернути.', 'Видалити', true))) return;
            await forgetToken();
            setMonoConnected(false);
            resetAll();
            router.back();
          }}
        />
      </Group>

      <SectionTitle>Про застосунок</SectionTitle>
      <Group>
        <Line icon="help" tint="ink" title="Допомога й підтримка" onPress={() => openExternal(SUPPORT_URL)} />
        <Divider inset={ROW_INSET} />
        <Line icon="doc" tint="ink" title="Політика конфіденційності" onPress={() => router.push('/privacy')} />
      </Group>

      <View style={styles.about}>
        <LogoMark size={30} />
        <T variant="caption" muted center>
          SubControl {Constants.expoConfig?.version ?? ''}
        </T>
        <T variant="caption" muted center style={styles.aboutText}>
          Підписки живуть тільки на цьому телефоні. До ваших грошей SubControl доступу не має і нічого не списує сам.
        </T>
      </View>
    </Screen>
  );
}

/** The Pro card at the top of settings: an invitation, or a thank-you once bought. */
function ProCard({ isPro }: { isPro: boolean }) {
  const p = usePalette();
  const body = (
    <View style={styles.proCard}>
      <CobaltFill radius={radius.sheet} />
      <View style={[styles.proGlyph, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Icon name="sparkle" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.flex}>
        <T variant="heading" color="#FFFFFF">
          {isPro ? 'Pro активний' : 'SubControl Pro'}
        </T>
        <T variant="caption" color="#FFFFFF" style={styles.proText}>
          {isPro ? 'Дякуємо. Тепер можна все, і без обмежень.' : 'Автопошук у виписці, родинний розподіл, без обмежень'}
        </T>
      </View>
      {!isPro && <Icon name="chevronRight" size={20} color="#FFFFFF" />}
    </View>
  );
  if (isPro) return body;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="SubControl Pro" to={0.98} onPress={() => router.push('/pro')} style={{ shadowColor: p.cobalt, ...styles.proShadow }}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pad: { padding: space(4), gap: space(3) },
  gapTop: { marginTop: space(2) },
  gapGroup: { marginTop: space(3) },
  about: { gap: space(2), marginTop: space(8), paddingHorizontal: space(4), alignItems: 'center' },
  aboutText: { maxWidth: 320 },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderRadius: radius.sheet,
    padding: space(4),
    minHeight: 84,
    overflow: 'hidden',
  },
  proGlyph: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  proText: { opacity: 0.85 },
  proShadow: { shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6, borderRadius: radius.sheet },
});
