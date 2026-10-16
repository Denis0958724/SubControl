import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Header, Screen } from '../components/Layout';
import { T } from '../components/T';
import { CONTACT_EMAIL } from '../lib/links';
import { space } from '../theme';

/** Same text as PRIVACY.md. The stores want the policy reachable from inside the app too. */
const SECTIONS: { title: string; text: string[] }[] = [
  {
    title: 'Коротко',
    text: [
      'Даних ми збираємо якомога менше. Точніше, майже не збираємо. Серверів, куди можна було б щось передати, у SubControl немає.',
    ],
  },
  {
    title: 'Що зберігається на телефоні',
    text: [
      'Список підписок і налаштування. Лише на вашому пристрої.',
      'Токен monobank, якщо ви ввімкнули автопошук. Лежить у захищеному сховищі системи: Keychain на iPhone, Keystore на Android. З ним можна лише переглядати виписку.',
      'Виписки monobank і файли виписок інших банків читаються на телефоні. Після пошуку зберігаються тільки підписки, які ви самі додали.',
    ],
  },
  {
    title: 'Куди застосунок ходить в інтернет',
    text: [
      'api.monobank.ua: курси валют і, за вашою згодою, виписка картки.',
      'bank.gov.ua: курс НБУ, якщо monobank недоступний.',
      'App Store або Google Play і сервіс RevenueCat: лише для оплати Pro і перевірки, чи вона активна. RevenueCat отримує випадковий ідентифікатор застосунку й історію покупок Pro. Імені, пошти чи номера картки там немає.',
      'Сторінки сервісів на кшталт Netflix відкриваються, тільки коли ви натискаєте кнопку скасування.',
    ],
  },
  {
    title: 'Чого ми не робимо',
    text: [
      'Не показуємо рекламу й не продаємо дані.',
      'Не ставимо аналітику чи трекери.',
      'Не маємо доступу до ваших грошей і нічого не списуємо самі.',
    ],
  },
  {
    title: 'Як усе видалити',
    text: [
      'Налаштування, «Видалити всі дані». Або просто видаліть застосунок. Підписку Pro це не скасує: її скасовують у налаштуваннях App Store чи Google Play.',
    ],
  },
];

export default function Privacy() {
  return (
    <Screen header={<Header title="Конфіденційність" onBack={() => router.back()} />}>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <T variant="heading">{s.title}</T>
          {s.text.map((t) => (
            <T key={t} variant="body" muted>
              {t}
            </T>
          ))}
        </View>
      ))}
      {CONTACT_EMAIL !== '' && (
        <View style={styles.section}>
          <T variant="heading">Звʼязок</T>
          <T variant="body" muted selectable>
            {CONTACT_EMAIL}
          </T>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space(2), marginBottom: space(5) },
});
