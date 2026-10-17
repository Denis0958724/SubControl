import { router } from 'expo-router';
import { useState } from 'react';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Divider, Group, Header, Line, ProBadge, Screen, SectionTitle } from '../components/Layout';
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
            <Divider inset={space(12)} />
          </>
        )}
        <Line
          icon="calendar"
          title="Ще раз у день списання"
          hint="Друге нагадування, якщо перше пропустили"
          right={<Toggle value={settings.dayOf} onChange={(dayOf) => setSettings({ dayOf })} label="Ще раз у день списання" />}
        />
        <Divider inset={space(12)} />
        {Platform.OS === 'android' ? (
          <Line
            icon="sound"
            title="Чути навіть на беззвучному"
            hint="Нагадування звучить як будильник. Вимкніть, якщо заважає"
            right={<Toggle value={settings.loud} onChange={(loud) => setSettings({ loud })} label="Чути навіть на беззвучному" />}
          />
        ) : (
          <>
            <Line
              icon="star"
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
            <Divider inset={space(12)} />
            <Line
              icon="sound"
              title="На беззвучному буде вібрація"
              hint="Звук з вимкненим перемикачем Apple дозволяє лише медичним застосункам. Зате нагадування пробʼється крізь режим фокусування"
            />
          </>
        )}
        {Platform.OS === 'android' && !status.exact && (
          <>
            <Divider inset={space(12)} />
            <Line
              icon="bell"
              tone="accent"
              title="Нагадувати хвилина в хвилину"
              hint="Дозвольте «Будильники й нагадування», інакше Android може зсунути час, щоб зберегти батарею"
              onPress={async () => {
                await askExactAlarms();
                status.refresh();
              }}
            />
          </>
        )}
        <Divider inset={space(12)} />
        <Line icon="bolt" tone="accent" title="Перевірити нагадування" hint="Прийде через 5 секунд" onPress={testReminder} />
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
          title="Таблиця для Excel"
          hint="Excel, Google Таблиці, Numbers"
          right={!isPro ? <ProBadge /> : undefined}
          onPress={exportTable}
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
        <Pressable accessibilityRole="link" onPress={() => openExternal(SUPPORT_URL)} hitSlop={8}>
          <T variant="caption" color={p.cobalt} center>
            Допомога й підтримка
          </T>
        </Pressable>
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
  gapGroup: { marginTop: space(3) },
  proHint: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  about: { gap: space(2), marginTop: space(6), paddingHorizontal: space(4) },
});
